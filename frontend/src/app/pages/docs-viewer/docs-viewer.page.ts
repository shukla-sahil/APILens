import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ProjectContextService } from '../../core/services/project-context.service';
import { EndpointGroup, ProjectDetailsResponse } from '../../core/models/api-doc.models';
import { EndpointCardComponent } from '../../shared/components/endpoint-card/endpoint-card.component';

@Component({
  selector: 'app-docs-viewer-page',
  standalone: true,
  imports: [CommonModule, RouterLink, EndpointCardComponent],
  template: `
    <section class="docs-viewer">
      <header>
        <h2 class="page-title">Documentation Viewer</h2>
        <p class="page-lead">Interactive documentation generated from your uploaded API specification.</p>
      </header>

      <section class="card loading" *ngIf="isLoading()">Loading documentation...</section>
      <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>

      <ng-container *ngIf="projectData() as data">
        <section class="card metadata">
          <h3>{{ data.documentation.title || data.project.name }}</h3>
          <p>{{ data.documentation.description || data.project.summary || 'No description available.' }}</p>

          <div class="kv">
            <span class="badge">Base URL: {{ data.project.base_url || data.documentation.baseUrl || 'N/A' }}</span>
            <span class="badge">Endpoints: {{ data.project.endpoint_count }}</span>
            <span class="badge">Source: {{ data.project.source_type }}</span>
          </div>

          <p class="share-link" *ngIf="data.project.share_slug">
            Shareable docs link: {{ shareLink(data.project.share_slug) }}
          </p>

          <div class="metadata__actions">
            <a [routerLink]="['/explorer', data.project.id]">Endpoint Explorer</a>
            <a [routerLink]="['/flow', data.project.id]" class="ghost">Flow Visualization</a>
            <a [routerLink]="['/chat', data.project.id]" class="ghost">Chat With API</a>
          </div>
        </section>

        <section class="docs-layout">
          <aside class="card docs-nav">
            <h4>Endpoint Groups</h4>
            <button
              type="button"
              *ngFor="let group of groups()"
              (click)="scrollToGroup(group.group)"
            >
              {{ group.group }} ({{ group.endpoints.length }})
            </button>
          </aside>

          <div class="docs-content">
            <details
              class="card group"
              *ngFor="let group of groups(); trackBy: trackGroup"
              open
              [attr.id]="groupAnchorId(group.group)"
            >
              <summary>
                <h4>{{ group.group }}</h4>
                <span>{{ group.endpoints.length }} endpoints</span>
              </summary>

              <div class="group__items">
                <app-endpoint-card
                  *ngFor="let endpoint of group.endpoints; trackBy: trackEndpoint"
                  [endpoint]="endpoint"
                ></app-endpoint-card>
              </div>
            </details>
          </div>
        </section>
      </ng-container>
    </section>
  `,
  styles: [
    `
      .docs-viewer {
        display: grid;
        gap: 1rem;
      }

      .loading,
      .metadata,
      .docs-nav,
      .group {
        padding: 1rem;
      }

      .metadata h3 {
        margin: 0;
      }

      .metadata p {
        color: var(--text-secondary);
        margin: 0.45rem 0 0.75rem;
      }

      .metadata__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        margin-top: 0.9rem;
      }

      .share-link {
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-size: 0.8rem;
        margin: 0.7rem 0 0;
      }

      .metadata__actions a {
        background: var(--brand-primary);
        border-radius: 0.55rem;
        color: #05131d;
        font-weight: 700;
        padding: 0.45rem 0.72rem;
        text-decoration: none;
      }

      .metadata__actions a.ghost {
        background: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-primary);
      }

      .docs-layout {
        display: grid;
        gap: 1rem;
        grid-template-columns: 260px minmax(0, 1fr);
      }

      .docs-nav {
        align-self: start;
        display: grid;
        gap: 0.35rem;
        position: sticky;
        top: 5.3rem;
      }

      .docs-nav h4 {
        margin: 0 0 0.35rem;
      }

      .docs-nav button {
        background: transparent;
        border: 1px solid transparent;
        border-radius: 0.55rem;
        color: var(--text-secondary);
        cursor: pointer;
        font: inherit;
        text-align: left;
        padding: 0.45rem;
      }

      .docs-nav button:hover {
        background: color-mix(in srgb, var(--brand-primary) 14%, transparent);
        color: var(--text-primary);
      }

      .docs-content {
        display: grid;
        gap: 0.8rem;
      }

      .group summary {
        align-items: center;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
      }

      .group summary h4 {
        margin: 0;
      }

      .group summary span {
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-size: 0.8rem;
      }

      .group__items {
        display: grid;
        gap: 0.7rem;
        margin-top: 0.7rem;
      }

      .error {
        color: #ff857d;
        margin: 0;
      }

      @media (max-width: 1100px) {
        .docs-layout {
          grid-template-columns: 1fr;
        }

        .docs-nav {
          position: static;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocsViewerPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly projectContext = inject(ProjectContextService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly projectData = signal<ProjectDetailsResponse | null>(null);

  readonly groups = computed<EndpointGroup[]>(() => {
    const data = this.projectData();
    if (!data) {
      return [];
    }

    const fromDoc = data.documentation?.endpointGroups;
    if (Array.isArray(fromDoc) && fromDoc.length > 0) {
      return fromDoc;
    }

    const mapByGroup = (data.endpoints || []).reduce<Record<string, EndpointGroup>>((acc, endpoint) => {
      const name = endpoint.group || 'default';
      if (!acc[name]) {
        acc[name] = { group: name, endpoints: [] };
      }

      acc[name].endpoints.push(endpoint);
      return acc;
    }, {});

    return Object.values(mapByGroup);
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => ({
          projectId: params.get('projectId'),
          slug: params.get('slug')
        })),
        switchMap((params) => {
          this.errorMessage.set('');
          this.isLoading.set(true);

          if (params.projectId) {
            this.projectContext.setActiveProject(params.projectId);
            return this.api.getProject(params.projectId);
          }

          if (params.slug) {
            return this.api.getSharedDocumentation(params.slug);
          }

          throw new Error('Project identifier is missing');
        })
      )
      .subscribe({
        next: (result) => {
          this.projectData.set(result);
          this.isLoading.set(false);

          if (result?.project?.id) {
            this.projectContext.setActiveProject(result.project.id);
          }
        },
        error: (error: { error?: { message?: string }; message?: string }) => {
          this.errorMessage.set(error?.error?.message || error?.message || 'Failed to load documentation.');
          this.isLoading.set(false);
        }
      });
  }

  trackGroup(_: number, group: EndpointGroup): string {
    return group.group;
  }

  trackEndpoint(_: number, endpoint: { id: string }): string {
    return endpoint.id;
  }

  shareLink(slug: string): string {
    return `${window.location.origin}/share/${slug}`;
  }

  groupAnchorId(groupName: string): string {
    const safeGroup = groupName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `group-${safeGroup || 'default'}`;
  }

  scrollToGroup(groupName: string): void {
    const target = document.getElementById(this.groupAnchorId(groupName));
    if (!target) {
      return;
    }

    if (target instanceof HTMLDetailsElement) {
      target.open = true;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
