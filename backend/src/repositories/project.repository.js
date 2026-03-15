const env = require('../config/env');
const { supabase, isSupabaseConfigured } = require('../config/supabase');
const { createId } = require('../utils/id.util');
const AppError = require('../utils/app-error');

const memoryStore = {
  projects: new Map(),
  specs: new Map(),
  endpoints: new Map(),
  docs: new Map(),
  snippets: new Map()
};

function groupEndpoints(endpoints = []) {
  const groups = endpoints.reduce((acc, endpoint) => {
    const groupName = endpoint.group || 'default';
    if (!acc[groupName]) {
      acc[groupName] = {
        group: groupName,
        endpoints: []
      };
    }

    acc[groupName].endpoints.push(endpoint);
    return acc;
  }, {});

  return Object.values(groups);
}

function sortByDateDescending(items) {
  return [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function createProject(project, userId = null) {
  if (!userId) {
    throw new AppError('Authenticated user is required to create a project', 401);
  }

  if (!isSupabaseConfigured) {
    const now = new Date().toISOString();
    const row = {
      id: project.id || createId(),
      user_id: userId,
      name: project.name,
      description: project.description || '',
      source_type: project.sourceType || 'unknown',
      spec_filename: project.specFilename || null,
      storage_path: project.storagePath || null,
      endpoint_count: 0,
      summary: '',
      base_url: null,
      share_slug: project.shareSlug,
      created_at: now,
      updated_at: now
    };

    memoryStore.projects.set(row.id, row);
    return row;
  }

  const insertPayload = {
    id: project.id || createId(),
    user_id: userId,
    name: project.name,
    description: project.description || '',
    source_type: project.sourceType || 'unknown',
    spec_filename: project.specFilename || null,
    storage_path: project.storagePath || null,
    endpoint_count: 0,
    summary: '',
    base_url: null,
    share_slug: project.shareSlug
  };

  const { data, error } = await supabase.from('projects').insert(insertPayload).select('*').single();
  if (error) {
    throw new AppError('Failed to create project', 500, error.message);
  }

  return data;
}

async function getProjectById(projectId, userId = null) {
  if (!isSupabaseConfigured) {
    const project = memoryStore.projects.get(projectId) || null;
    if (!project) {
      return null;
    }

    if (userId && project.user_id !== userId) {
      return null;
    }

    return project;
  }

  let query = supabase.from('projects').select('*').eq('id', projectId);
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new AppError('Failed to load project', 500, error.message);
  }

  return data;
}

async function updateProject(projectId, updates, userId = null) {
  if (!isSupabaseConfigured) {
    const existing = memoryStore.projects.get(projectId);
    if (!existing) {
      return null;
    }

    if (userId && existing.user_id !== userId) {
      return null;
    }

    const next = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    memoryStore.projects.set(projectId, next);
    return next;
  }

  let query = supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.select('*').single();

  if (error) {
    throw new AppError('Failed to update project', 500, error.message);
  }

  return data;
}

async function createApiSpec(spec) {
  if (!isSupabaseConfigured) {
    const row = {
      id: spec.id || createId(),
      project_id: spec.projectId,
      format: spec.format,
      filename: spec.filename,
      storage_path: spec.storagePath,
      raw_content: spec.rawContent,
      created_at: new Date().toISOString()
    };

    memoryStore.specs.set(spec.projectId, row);
    return row;
  }

  const insertPayload = {
    id: spec.id || createId(),
    project_id: spec.projectId,
    format: spec.format,
    filename: spec.filename,
    storage_path: spec.storagePath,
    raw_content: spec.rawContent
  };

  const { data, error } = await supabase.from('api_specs').insert(insertPayload).select('*').single();
  if (error) {
    throw new AppError('Failed to store specification metadata', 500, error.message);
  }

  return data;
}

async function getApiSpecByProjectId(projectId) {
  if (!isSupabaseConfigured) {
    return memoryStore.specs.get(projectId) || null;
  }

  const { data, error } = await supabase
    .from('api_specs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to read specification metadata', 500, error.message);
  }

  return data;
}

async function uploadSpecificationFile({ storagePath, buffer, contentType }) {
  if (!isSupabaseConfigured) {
    return { storagePath, size: buffer.length };
  }

  const { error } = await supabase.storage
    .from(env.supabaseStorageBucket)
    .upload(storagePath, buffer, { contentType, upsert: true });

  if (error) {
    throw new AppError('Failed to upload file to Supabase Storage', 500, error.message);
  }

  return { storagePath, size: buffer.length };
}

async function deleteStorageFolder(projectId) {
  if (!isSupabaseConfigured) {
    return;
  }

  const { data, error } = await supabase.storage.from(env.supabaseStorageBucket).list(projectId);
  if (error) {
    return;
  }

  if (!data || data.length === 0) {
    return;
  }

  const filePaths = data.map((entry) => `${projectId}/${entry.name}`);
  await supabase.storage.from(env.supabaseStorageBucket).remove(filePaths);
}

async function saveParsedArtifacts({
  projectId,
  userId,
  sourceType,
  baseUrl,
  summaryText,
  endpointCount,
  documentation,
  endpoints
}) {
  const snippets = endpoints.flatMap((endpoint) => {
    const entrySnippets = endpoint.snippets || {};
    return Object.entries(entrySnippets).map(([language, code]) => ({
      id: createId(),
      project_id: projectId,
      endpoint_id: endpoint.id,
      language,
      code
    }));
  });

  if (!isSupabaseConfigured) {
    memoryStore.endpoints.set(projectId, endpoints);
    memoryStore.docs.set(projectId, documentation);
    memoryStore.snippets.set(projectId, snippets);

    await updateProject(projectId, {
      source_type: sourceType,
      endpoint_count: endpointCount,
      base_url: baseUrl,
      summary: summaryText
    }, userId);

    return;
  }

  await supabase.from('parsed_endpoints').delete().eq('project_id', projectId);
  await supabase.from('generated_docs').delete().eq('project_id', projectId);
  await supabase.from('sdk_snippets').delete().eq('project_id', projectId);

  const endpointRows = endpoints.map((endpoint) => ({
    id: createId(),
    project_id: projectId,
    endpoint_id: endpoint.id,
    method: endpoint.method,
    path: endpoint.path,
    group_name: endpoint.group,
    data: endpoint
  }));

  if (endpointRows.length > 0) {
    const { error: endpointError } = await supabase.from('parsed_endpoints').insert(endpointRows);
    if (endpointError) {
      throw new AppError('Failed to store parsed endpoints', 500, endpointError.message);
    }
  }

  if (snippets.length > 0) {
    const { error: snippetError } = await supabase.from('sdk_snippets').insert(snippets);
    if (snippetError) {
      throw new AppError('Failed to store generated snippets', 500, snippetError.message);
    }
  }

  const { error: docError } = await supabase.from('generated_docs').insert({
    id: createId(),
    project_id: projectId,
    doc_json: documentation
  });

  if (docError) {
    throw new AppError('Failed to store generated docs', 500, docError.message);
  }

  await updateProject(projectId, {
    source_type: sourceType,
    endpoint_count: endpointCount,
    base_url: baseUrl,
    summary: summaryText
  }, userId);
}

async function listProjects(userId = null) {
  if (!isSupabaseConfigured) {
    const projects = Array.from(memoryStore.projects.values());
    if (!userId) {
      return sortByDateDescending(projects);
    }

    return sortByDateDescending(projects.filter((project) => project.user_id === userId));
  }

  let query = supabase
    .from('projects')
    .select('id, name, source_type, endpoint_count, summary, share_slug, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new AppError('Failed to list projects', 500, error.message);
  }

  return data || [];
}

function composeProjectResponse(project, endpoints, documentation) {
  const doc = documentation || {
    title: project.name,
    description: project.description,
    endpointGroups: groupEndpoints(endpoints),
    flow: { nodes: [], edges: [] }
  };

  return {
    project,
    endpoints,
    documentation: {
      ...doc,
      endpointGroups: doc.endpointGroups || groupEndpoints(endpoints)
    }
  };
}

async function getProjectWithDetails(projectId, userId = null) {
  const project = await getProjectById(projectId, userId);
  if (!project) {
    return null;
  }

  if (!isSupabaseConfigured) {
    const endpoints = memoryStore.endpoints.get(projectId) || [];
    const documentation = memoryStore.docs.get(projectId) || null;
    return composeProjectResponse(project, endpoints, documentation);
  }

  const [{ data: endpointsRows, error: endpointError }, { data: docsRows, error: docsError }] =
    await Promise.all([
      supabase.from('parsed_endpoints').select('endpoint_id, data').eq('project_id', projectId),
      supabase.from('generated_docs').select('doc_json').eq('project_id', projectId).limit(1)
    ]);

  if (endpointError) {
    throw new AppError('Failed to fetch endpoint details', 500, endpointError.message);
  }

  if (docsError) {
    throw new AppError('Failed to fetch generated docs', 500, docsError.message);
  }

  const [{ data: snippetRows, error: snippetError }] = await Promise.all([
    supabase.from('sdk_snippets').select('endpoint_id, language, code').eq('project_id', projectId)
  ]);

  if (snippetError) {
    throw new AppError('Failed to fetch snippet details', 500, snippetError.message);
  }

  const snippetsByEndpoint = (snippetRows || []).reduce((acc, row) => {
    if (!acc[row.endpoint_id]) {
      acc[row.endpoint_id] = {};
    }

    acc[row.endpoint_id][row.language] = row.code;
    return acc;
  }, {});

  const endpoints = (endpointsRows || []).map((row) => ({
    ...(row.data || {}),
    snippets: {
      ...(row.data?.snippets || {}),
      ...(snippetsByEndpoint[row.endpoint_id] || {})
    }
  }));

  const documentation = docsRows && docsRows[0] ? docsRows[0].doc_json : null;
  return composeProjectResponse(project, endpoints, documentation);
}

async function getProjectByShareSlug(shareSlug) {
  if (!isSupabaseConfigured) {
    const project = Array.from(memoryStore.projects.values()).find((row) => row.share_slug === shareSlug);
    if (!project) {
      return null;
    }

    return getProjectWithDetails(project.id, null);
  }

  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('share_slug', shareSlug)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to load shareable project', 500, error.message);
  }

  if (!data) {
    return null;
  }

  return getProjectWithDetails(data.id, null);
}

async function deleteProject(projectId, userId = null) {
  if (!isSupabaseConfigured) {
    const project = memoryStore.projects.get(projectId);
    if (userId && project && project.user_id !== userId) {
      return;
    }

    memoryStore.projects.delete(projectId);
    memoryStore.specs.delete(projectId);
    memoryStore.endpoints.delete(projectId);
    memoryStore.docs.delete(projectId);
    memoryStore.snippets.delete(projectId);
    return;
  }

  await supabase.from('sdk_snippets').delete().eq('project_id', projectId);
  await supabase.from('parsed_endpoints').delete().eq('project_id', projectId);
  await supabase.from('generated_docs').delete().eq('project_id', projectId);
  await supabase.from('api_specs').delete().eq('project_id', projectId);

  let deleteQuery = supabase.from('projects').delete().eq('id', projectId);
  if (userId) {
    deleteQuery = deleteQuery.eq('user_id', userId);
  }

  await deleteQuery;

  await deleteStorageFolder(projectId);
}

module.exports = {
  createProject,
  getProjectById,
  createApiSpec,
  getApiSpecByProjectId,
  uploadSpecificationFile,
  saveParsedArtifacts,
  listProjects,
  getProjectWithDetails,
  getProjectByShareSlug,
  deleteProject
};
