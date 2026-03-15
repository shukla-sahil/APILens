import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../core/services/api.service';
import { ApiEndpoint, ProjectDetailsResponse } from '../../core/models/api-doc.models';
import { ProjectContextService } from '../../core/services/project-context.service';
import { SnippetTabsComponent } from '../../shared/components/snippet-tabs/snippet-tabs.component';

@Component({
  selector: 'app-endpoint-explorer-page',
  standalone: true,
  imports: [CommonModule, FormsModule, JsonPipe, SnippetTabsComponent],
  template: `
    <section class="endpoint-explorer">
      <header>
        <h2 class="page-title">Endpoint Explorer</h2>
        <p class="page-lead">
          Inspect every operation with parameters, body schemas, responses, AI notes, and generated SDK snippets.
        </p>
      </header>

      <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>

      <section class="center-content" *ngIf="isLoading()">
        <div class="spinner-loader"></div>
        <p>Loading endpoint explorer...</p>
      </section>

      <section class="card controls" *ngIf="!isLoading() && projectData()">
        <label>
          Search path or summary
          <input
            type="text"
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
            placeholder="/users, create order, auth"
          />
        </label>

        <label>
          HTTP Method
          <select [ngModel]="methodFilter()" (ngModelChange)="methodFilter.set($event)">
            <option value="all">All methods</option>
            <option value="get">GET</option>
            <option value="post">POST</option>
            <option value="put">PUT</option>
            <option value="patch">PATCH</option>
            <option value="delete">DELETE</option>
            <option value="head">HEAD</option>
            <option value="options">OPTIONS</option>
          </select>
        </label>

        <p class="controls__count">Showing {{ filteredEndpoints().length }} endpoints</p>
      </section>

      <section class="explorer-layout" *ngIf="!isLoading() && projectData() as data">
        <aside class="card endpoint-list">
          <h3>{{ data.project.name }}</h3>

          <details *ngFor="let group of groupedFilteredEndpoints(); trackBy: trackGroup" open>
            <summary>{{ group.group }} ({{ group.endpoints.length }})</summary>

            <button
              type="button"
              *ngFor="let endpoint of group.endpoints; trackBy: trackEndpoint"
              [class.active]="selectedEndpoint()?.id === endpoint.id"
              (click)="selectEndpoint(endpoint)"
            >
              <span class="method" [attr.data-method]="endpoint.method">{{ endpoint.method.toUpperCase() }}</span>
              <span class="path">{{ endpoint.path }}</span>
            </button>
          </details>
        </aside>

        <section class="card endpoint-detail" *ngIf="selectedEndpoint() as endpoint">
          <header class="endpoint-detail__header">
            <span class="method" [attr.data-method]="endpoint.method">{{ endpoint.method.toUpperCase() }}</span>
            <h3>{{ endpoint.path }}</h3>
          </header>

          <p class="summary">{{ endpoint.summary || endpoint.description || 'No endpoint description available.' }}</p>
          <p class="ai" *ngIf="endpoint.ai">{{ endpoint.ai.explanation }}</p>

          <div class="detail-grid">
            <section>
              <h4>Query Parameters</h4>
              <pre><code>{{ endpoint.parameters.query | json }}</code></pre>
            </section>

            <section>
              <h4>Path Parameters</h4>
              <pre><code>{{ endpoint.parameters.path | json }}</code></pre>
            </section>

            <section>
              <h4>Request Body</h4>
              <pre><code>{{ endpoint.requestBody | json }}</code></pre>
            </section>

            <section>
              <h4>Response Examples</h4>
              <pre><code>{{ endpoint.responses | json }}</code></pre>
            </section>
          </div>

          <section class="snippets">
            <h4>SDK Snippet Generator</h4>
            <app-snippet-tabs [snippets]="endpoint.snippets"></app-snippet-tabs>
          </section>

          <section class="mock-panel">
            <h4>Interactive Endpoint Testing (Mock Server)</h4>
            <p>
              Run this endpoint against the auto mock server to test integrations without a live backend.
            </p>

            <button type="button" 
                    (click)="runMock(endpoint)" 
                    [disabled]="isMockLoading()"
                    [class.btn-loader]="isMockLoading()">
              {{ isMockLoading() ? 'Running Mock Request' : 'Run Mock Request' }}
            </button>

            <p class="mock-status" *ngIf="mockStatus()">{{ mockStatus() }}</p>
            <pre *ngIf="mockResponse()"><code>{{ mockResponse() | json }}</code></pre>
          </section>
        </section>
      </section>

      <section class="card empty" *ngIf="!isLoading() && projectData() && filteredEndpoints().length === 0">
        No endpoints match your current search/filter.
      </section>
    </section>
  `,
  styles: [
    `
      .endpoint-explorer {
        display: grid;
        gap: 1rem;
      }

      .controls {
        align-items: end;
        display: grid;
        gap: 0.7rem;
        grid-template-columns: 1.2fr 0.7fr auto;
        padding: 1rem;
      }

      label {
        color: var(--text-secondary);
        display: grid;
        font-size: 0.82rem;
        gap: 0.3rem;
      }

      input,
      select {
        background: color-mix(in srgb, var(--panel-bg) 70%, var(--surface));
        border: 1px solid var(--border-color);
        border-radius: 0.55rem;
        color: var(--text-primary);
        font: inherit;
        padding: 0.48rem 0.58rem;
      }

      .controls__count {
        color: var(--text-secondary);
        margin: 0;
      }

      .explorer-layout {
        display: grid;
        gap: 1rem;
        grid-template-columns: 330px minmax(0, 1fr);
      }

      .endpoint-list,
      .endpoint-detail,
      .empty {
        padding: 1rem;
      }

      .endpoint-list {
        align-self: start;
        display: grid;
        gap: 0.7rem;
        max-height: calc(100vh - 13rem);
        overflow-x: hidden;
        overflow-y: auto;
        position: sticky;
        top: 5.3rem;
      }

      .endpoint-list h3 {
        margin: 0;
      }

      .endpoint-list details {
        background: color-mix(in srgb, var(--panel-muted) 50%, transparent);
        border: 1px solid var(--border-color);
        border-radius: 0.7rem;
        padding: 0.45rem;
      }

      .endpoint-list summary {
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: 0.8rem;
        margin-bottom: 0.45rem;
      }

      .endpoint-list button {
        align-items: center;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 0.55rem;
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        gap: 0.55rem;
        margin-bottom: 0.35rem;
        min-width: 0;
        padding: 0.45rem;
        text-align: left;
        width: 100%;
      }

      .endpoint-list button .method {
        flex-shrink: 0;
      }

      .endpoint-list button:hover,
      .endpoint-list button.active {
        background: color-mix(in srgb, var(--brand-primary) 16%, transparent);
        border-color: color-mix(in srgb, var(--brand-primary) 32%, transparent);
        color: var(--text-primary);
      }

      .method {
        border-radius: 0.4rem;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        font-weight: 700;
        padding: 0.2rem 0.4rem;
      }

      .method[data-method='get'] {
        background: color-mix(in srgb, #1f9d6a 25%, transparent);
        color: #88e4c0;
      }

      .method[data-method='post'] {
        background: color-mix(in srgb, #2b72ff 25%, transparent);
        color: #9fc5ff;
      }

      .method[data-method='put'],
      .method[data-method='patch'] {
        background: color-mix(in srgb, #f59e0b 24%, transparent);
        color: #ffd792;
      }

      .method[data-method='delete'] {
        background: color-mix(in srgb, #ef4444 24%, transparent);
        color: #ff9f9f;
      }

      .path {
        flex: 1;
        font-family: var(--font-mono);
        font-size: 0.77rem;
        line-height: 1.3;
        min-width: 0;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .endpoint-detail__header {
        align-items: flex-start;
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
      }

      .endpoint-detail__header h3 {
        font-family: var(--font-mono);
        margin: 0;
        min-width: 0;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .summary {
        color: var(--text-secondary);
        margin: 0.6rem 0 0.2rem;
      }

      .ai {
        color: var(--brand-accent);
        margin: 0;
      }

      .detail-grid {
        display: grid;
        gap: 0.8rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 0.8rem;
      }

      .detail-grid section {
        min-width: 0;
      }

      h4 {
        margin: 0 0 0.4rem;
      }

      pre {
        background: var(--code-bg);
        border: 1px solid var(--border-color);
        border-radius: 0.7rem;
        margin: 0;
        max-height: 220px;
        overflow: auto;
        padding: 0.65rem;
      }

      code {
        color: var(--code-text);
        font-family: var(--font-mono);
        font-size: 0.74rem;
      }

      .snippets,
      .mock-panel {
        margin-top: 0.9rem;
      }

      .mock-panel p {
        color: var(--text-secondary);
      }

      .mock-panel button {
        background: var(--brand-primary);
        border: 0;
        border-radius: 0.6rem;
        color: #041623;
        cursor: pointer;
        font-weight: 700;
        padding: 0.5rem 0.78rem;
      }

      .mock-panel button[disabled] {
        cursor: not-allowed;
        opacity: 0.7;
      }

      .mock-status {
        font-family: var(--font-mono);
        font-size: 0.8rem;
      }

      .error {
        color: #ff857d;
        margin: 0;
      }

      @media (max-width: 1200px) {
        .explorer-layout {
          grid-template-columns: 1fr;
        }

        .endpoint-list {
          max-height: none;
          position: static;
        }
      }

      @media (max-width: 800px) {
        .controls {
          grid-template-columns: 1fr;
        }

        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EndpointExplorerPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly projectContext = inject(ProjectContextService);

  readonly projectData = signal<ProjectDetailsResponse | null>(null);
  readonly selectedEndpoint = signal<ApiEndpoint | null>(null);
  readonly errorMessage = signal('');
  readonly isLoading = signal(true);

  readonly isMockLoading = signal(false);
  readonly mockStatus = signal('');
  readonly mockResponse = signal<unknown | null>(null);

  readonly search = signal('');
  readonly methodFilter = signal('all');

  readonly filteredEndpoints = computed(() => {
    const data = this.projectData();
    if (!data) {
      return [];
    }

    const keyword = this.search().trim().toLowerCase();
    const method = this.methodFilter();

    return (data.endpoints || []).filter((endpoint) => {
      const matchesMethod = method === 'all' || endpoint.method === method;
      const searchable = `${endpoint.path} ${endpoint.summary} ${endpoint.description}`.toLowerCase();
      const matchesKeyword = !keyword || searchable.includes(keyword);

      return matchesMethod && matchesKeyword;
    });
  });

  readonly groupedFilteredEndpoints = computed(() => {
    const grouped = this.filteredEndpoints().reduce<Record<string, { group: string; endpoints: ApiEndpoint[] }>>(
      (acc, endpoint) => {
        const groupName = endpoint.group || 'default';
        if (!acc[groupName]) {
          acc[groupName] = { group: groupName, endpoints: [] };
        }

        acc[groupName].endpoints.push(endpoint);
        return acc;
      },
      {}
    );

    return Object.values(grouped);
  });

  constructor() {
    effect(() => {
      const filtered = this.filteredEndpoints();
      const selected = this.selectedEndpoint();

      if (!selected || !filtered.some((endpoint) => endpoint.id === selected.id)) {
        this.selectedEndpoint.set(filtered[0] || null);
      }
    });

    this.route.paramMap.subscribe((params) => {
      const projectId = params.get('projectId');
      if (!projectId) {
        this.errorMessage.set('projectId is required');
        this.isLoading.set(false);
        return;
      }

      this.projectContext.setActiveProject(projectId);
      this.loadProject(projectId);
    });
  }

  selectEndpoint(endpoint: ApiEndpoint): void {
    this.selectedEndpoint.set(endpoint);
    this.mockResponse.set(null);
    this.mockStatus.set('');
  }

  runMock(endpoint: ApiEndpoint): void {
    const project = this.projectData()?.project;
    if (!project) {
      return;
    }

    this.isMockLoading.set(true);
    this.mockResponse.set(null);
    this.mockStatus.set('');

    this.api.mockRequest(project.id, endpoint.method, endpoint.path).subscribe({
      next: (response) => {
        this.mockStatus.set(`Mock response status: ${response.status}`);
        this.mockResponse.set(response.body);
        this.isMockLoading.set(false);
      },
      error: (error: { status?: number; error?: unknown }) => {
        this.mockStatus.set(`Mock request failed with status ${error.status || 'unknown'}`);
        this.mockResponse.set(error.error || null);
        this.isMockLoading.set(false);
      }
    });
  }

  private loadProject(projectId: string): void {
    this.errorMessage.set('');
    this.isLoading.set(true);
    this.projectData.set(null);
    this.selectedEndpoint.set(null);

    this.api.getProject(projectId).subscribe({
      next: (result) => {
        this.projectData.set(result);

        const available = result.endpoints || [];
        const selected = this.selectedEndpoint();
        const stillExists = selected && available.some((endpoint) => endpoint.id === selected.id);
        this.selectedEndpoint.set(stillExists ? selected : available[0] || null);
        this.isLoading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        this.errorMessage.set(error?.error?.message || 'Failed to load project endpoints.');
        this.isLoading.set(false);
      }
    });
  }

  trackGroup(_: number, group: { group: string }): string {
    return group.group;
  }

  trackEndpoint(_: number, endpoint: ApiEndpoint): string {
    return endpoint.id;
  }
}
