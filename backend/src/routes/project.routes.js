const path = require('path');

const express = require('express');
const multer = require('multer');
const yaml = require('js-yaml');

const env = require('../config/env');
const asyncHandler = require('../middleware/async-handler');
const { requireAuth } = require('../middleware/auth-handler');
const AppError = require('../utils/app-error');
const { createId, createShareSlug } = require('../utils/id.util');
const {
  parseSpecification,
  detectSpecificationType
} = require('../services/spec-parser.service');
const { enrichEndpoint, summarizeApi } = require('../services/ai-assist.service');
const { generateSnippetsForEndpoint } = require('../services/snippet.service');
const { buildFlowGraph } = require('../services/flow.service');
const repository = require('../repositories/project.repository');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

function parseRawObject(rawContent) {
  try {
    return JSON.parse(rawContent);
  } catch (jsonError) {
    return yaml.load(rawContent);
  }
}

function inferFileFormat(fileName = '') {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.yaml' || ext === '.yml') {
    return 'yaml';
  }

  return 'json';
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function groupEndpoints(endpoints = []) {
  const map = endpoints.reduce((acc, endpoint) => {
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

  return Object.values(map);
}

router.get(
  '/share/:slug',
  asyncHandler(async (req, res) => {
    const result = await repository.getProjectByShareSlug(req.params.slug);
    if (!result) {
      throw new AppError('Share link not found', 404);
    }

    res.json(result);
  })
);

router.use(requireAuth);

router.post(
  '/upload-spec',
  upload.single('specFile'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('No specification file uploaded. Use form-data key specFile.', 400);
    }

    const projectId = createId();
    const rawContent = req.file.buffer.toString('utf8');
    const parsedObject = parseRawObject(rawContent);
    const sourceType = detectSpecificationType(parsedObject);

    const projectName =
      req.body.projectName || path.basename(req.file.originalname, path.extname(req.file.originalname));

    const shareSlug = createShareSlug(projectName);
    const safeFileName = sanitizeFileName(req.file.originalname);
    const storagePath = `${projectId}/${Date.now()}-${safeFileName}`;

    await repository.uploadSpecificationFile({
      storagePath,
      buffer: req.file.buffer,
      contentType: req.file.mimetype || 'application/octet-stream'
    });

    await repository.createProject({
      id: projectId,
      name: projectName,
      description: req.body.description || '',
      sourceType,
      specFilename: req.file.originalname,
      storagePath,
      shareSlug
    }, req.user.id);

    await repository.createApiSpec({
      projectId,
      format: inferFileFormat(req.file.originalname),
      filename: req.file.originalname,
      storagePath,
      rawContent
    });

    res.status(201).json({
      projectId,
      sourceType,
      storagePath,
      shareUrl: `${env.publicDocBaseUrl}/${shareSlug}`
    });
  })
);

router.post(
  '/parse-spec',
  asyncHandler(async (req, res) => {
    const { projectId } = req.body;
    if (!projectId) {
      throw new AppError('projectId is required', 400);
    }

    const project = await repository.getProjectById(projectId, req.user.id);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const specRecord = await repository.getApiSpecByProjectId(projectId);
    if (!specRecord) {
      throw new AppError('No uploaded specification found for project', 404);
    }

    const parsedOutput = await parseSpecification(specRecord.raw_content, specRecord.filename);

    const enrichedEndpoints = parsedOutput.endpoints.map((endpoint) => {
      const withAi = enrichEndpoint(endpoint);
      return {
        ...withAi,
        snippets: generateSnippetsForEndpoint(withAi, parsedOutput.baseUrl)
      };
    });

    const summary = summarizeApi(project.name, enrichedEndpoints);
    const flow = buildFlowGraph(enrichedEndpoints);
    const endpointGroups = groupEndpoints(enrichedEndpoints);

    const documentation = {
      projectId,
      title: parsedOutput.title,
      description: parsedOutput.description,
      version: parsedOutput.version,
      sourceType: parsedOutput.sourceType,
      baseUrl: parsedOutput.baseUrl,
      summary,
      endpointGroups,
      flow,
      generatedAt: new Date().toISOString()
    };

    await repository.saveParsedArtifacts({
      projectId,
      userId: req.user.id,
      sourceType: parsedOutput.sourceType,
      baseUrl: parsedOutput.baseUrl,
      summaryText: summary.text,
      endpointCount: enrichedEndpoints.length,
      documentation,
      endpoints: enrichedEndpoints
    });

    res.json({
      projectId,
      sourceType: parsedOutput.sourceType,
      endpointCount: enrichedEndpoints.length,
      summary: summary.text,
      documentation
    });
  })
);

router.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const projects = await repository.listProjects(req.user.id);
    res.json({ projects });
  })
);

router.get(
  '/project/:id',
  asyncHandler(async (req, res) => {
    const result = await repository.getProjectWithDetails(req.params.id, req.user.id);
    if (!result) {
      throw new AppError('Project not found', 404);
    }

    res.json(result);
  })
);

router.get(
  '/project/:id/flow',
  asyncHandler(async (req, res) => {
    const result = await repository.getProjectWithDetails(req.params.id, req.user.id);
    if (!result) {
      throw new AppError('Project not found', 404);
    }

    const flow = result.documentation?.flow || buildFlowGraph(result.endpoints || []);
    res.json({ flow });
  })
);

router.delete(
  '/project/:id',
  asyncHandler(async (req, res) => {
    const project = await repository.getProjectById(req.params.id, req.user.id);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    await repository.deleteProject(req.params.id, req.user.id);
    res.status(204).send();
  })
);

module.exports = router;
