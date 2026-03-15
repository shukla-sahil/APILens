export interface ApiParameter {
  name: string;
  required: boolean;
  description: string;
  schema: unknown;
  example: unknown;
}

export interface ApiRequestBody {
  required: boolean;
  contentType: string | null;
  schema: unknown;
  example: unknown;
}

export interface ApiResponse {
  statusCode: string;
  description: string;
  contentType: string | null;
  schema: unknown;
  example: unknown;
}

export interface ApiAuthentication {
  type: string;
  required: boolean;
  details: string;
}

export interface EndpointAiInsight {
  explanation: string;
  missingFields: string[];
  generatedRequestExample: unknown;
  confidence: number;
}

export interface ApiEndpoint {
  id: string;
  group: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  parameters: {
    path: ApiParameter[];
    query: ApiParameter[];
    header: ApiParameter[];
  };
  requestBody: ApiRequestBody;
  responses: ApiResponse[];
  authentication: ApiAuthentication;
  snippets?: {
    javascript?: string;
    python?: string;
    curl?: string;
  };
  ai?: EndpointAiInsight;
}

export interface EndpointGroup {
  group: string;
  endpoints: ApiEndpoint[];
}

export interface FlowGraph {
  nodes: Array<{ id: string; type: string; label: string; auth?: string }>;
  edges: Array<{ id: string; source: string; target: string; label: string }>;
}

export interface DocumentationSummary {
  text: string;
  endpointCount: number;
  methodCounts: Record<string, number>;
  authTypes: string[];
}

export interface GeneratedDocumentation {
  projectId: string;
  title: string;
  description: string;
  version: string;
  sourceType: string;
  baseUrl: string;
  summary: DocumentationSummary;
  endpointGroups: EndpointGroup[];
  flow: FlowGraph;
  generatedAt: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  source_type: string;
  endpoint_count: number;
  summary: string;
  share_slug: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetailsResponse {
  project: {
    id: string;
    name: string;
    summary: string;
    share_slug: string;
    endpoint_count: number;
    source_type: string;
    base_url: string;
    created_at: string;
    updated_at: string;
  };
  endpoints: ApiEndpoint[];
  documentation: GeneratedDocumentation;
}

export interface UploadSpecResponse {
  projectId: string;
  sourceType: string;
  storagePath: string;
  shareUrl: string;
}

export interface ParseSpecResponse {
  projectId: string;
  sourceType: string;
  endpointCount: number;
  summary: string;
  documentation: GeneratedDocumentation;
}

export interface ChatCitation {
  method: string;
  path: string;
  score: number;
}

export interface ChatResponse {
  answer: string;
  citations: ChatCitation[];
}
