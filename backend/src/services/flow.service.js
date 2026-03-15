function splitPath(path) {
  return String(path || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/[{}:]/g, ''));
}

function buildFlowGraph(endpoints = []) {
  const nodes = [];
  const edges = [];

  const groupSet = new Set();
  const resourceSet = new Set();

  endpoints.forEach((endpoint) => {
    const groupId = `group:${endpoint.group || 'default'}`;
    const endpointId = `endpoint:${endpoint.id}`;

    if (!groupSet.has(groupId)) {
      groupSet.add(groupId);
      nodes.push({
        id: groupId,
        type: 'group',
        label: endpoint.group || 'default'
      });
    }

    nodes.push({
      id: endpointId,
      type: 'endpoint',
      label: `${endpoint.method.toUpperCase()} ${endpoint.path}`,
      auth: endpoint.authentication.type
    });

    edges.push({
      id: `edge:${groupId}:${endpointId}`,
      source: groupId,
      target: endpointId,
      label: 'contains'
    });

    const pathSegments = splitPath(endpoint.path);
    if (pathSegments.length > 0) {
      const resource = pathSegments[0];
      const resourceId = `resource:${resource}`;
      if (!resourceSet.has(resourceId)) {
        resourceSet.add(resourceId);
        nodes.push({ id: resourceId, type: 'resource', label: resource });
      }

      edges.push({
        id: `edge:${endpointId}:${resourceId}`,
        source: endpointId,
        target: resourceId,
        label: 'targets'
      });
    }

    if (endpoint.authentication.required) {
      const authNodeId = `auth:${endpoint.authentication.type}`;
      if (!nodes.some((node) => node.id === authNodeId)) {
        nodes.push({
          id: authNodeId,
          type: 'auth',
          label: endpoint.authentication.type
        });
      }

      edges.push({
        id: `edge:${endpointId}:${authNodeId}`,
        source: endpointId,
        target: authNodeId,
        label: 'requires'
      });
    }
  });

  return { nodes, edges };
}

module.exports = {
  buildFlowGraph
};
