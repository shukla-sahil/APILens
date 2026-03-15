import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/services/api.service';
import { ProjectListItem } from '../../core/models/api-doc.models';
import { ProjectContextService } from '../../core/services/project-context.service';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  template: `
    <section class="history">
      <header class="history__header">
        <div>
          <h2 class="page-title">Project History</h2>
          <p class="page-lead">Revisit previously generated documentation projects and continue exploring.</p>
        </div>

        <button type="button" 
                (click)="loadProjects()" 
                [disabled]="isLoading()" 
                [class.btn-loader]="isLoading()">
          {{ isLoading() ? 'Loading' : 'Refresh' }}
        </button>
      </header>

      <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>

      <section class="card list" *ngIf="projects().length > 0; else emptyState">
        <article *ngFor="let project of projects(); trackBy: trackProject" class="project-row">
          <div class="project-row__meta">
            <h3>{{ project.name }}</h3>
            <p>{{ project.summary || 'No summary available yet.' }}</p>

            <div class="kv">
              <span class="badge">{{ project.source_type }}</span>
              <span class="badge">{{ project.endpoint_count }} endpoints</span>
              <span class="badge">Updated {{ project.updated_at | date: 'medium' }}</span>
            </div>
          </div>

          <div class="project-row__actions">
            <a [routerLink]="['/docs', project.id]" (click)="activateProject(project.id)">Docs</a>
            <a [routerLink]="['/explorer', project.id]" (click)="activateProject(project.id)">Explorer</a>
            <a [routerLink]="['/flow', project.id]" (click)="activateProject(project.id)">Flow</a>
            <a [routerLink]="['/chat', project.id]" (click)="activateProject(project.id)">Chat</a>
            <button type="button" class="danger" (click)="removeProject(project.id)">Delete</button>
          </div>
        </article>
      </section>

      <ng-template #emptyState>
        <section class="card empty">No projects yet. Upload a specification from the dashboard to get started.</section>
      </ng-template>
    </section>
  `,
  styles: [
    `
      .history {
        display: grid;
        gap: 1rem;
      }

      .history__header {
        align-items: center;
        display: flex;
        justify-content: space-between;
      }

      button {
        background: var(--panel-muted);
        border: 1px solid var(--border-color);
        border-radius: 0.6rem;
        color: var(--text-primary);
        cursor: pointer;
        padding: 0.5rem 0.8rem;
      }

      .list,
      .empty {
        padding: 1rem;
      }

      .project-row {
        border-bottom: 1px solid var(--border-color);
        display: grid;
        gap: 0.8rem;
        grid-template-columns: minmax(0, 1fr) auto;
        padding: 0.9rem 0;
      }

      .project-row:last-child {
        border-bottom: 0;
      }

      .project-row__meta h3 {
        margin: 0;
      }

      .project-row__meta p {
        color: var(--text-secondary);
        margin: 0.35rem 0 0.6rem;
      }

      .project-row__actions {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .project-row__actions a,
      .project-row__actions button {
        background: color-mix(in srgb, var(--brand-primary) 24%, transparent);
        border: 1px solid color-mix(in srgb, var(--brand-primary) 45%, transparent);
        border-radius: 0.5rem;
        color: var(--text-primary);
        font-size: 0.85rem;
        font-weight: 700;
        padding: 0.4rem 0.6rem;
        text-decoration: none;
      }

      .project-row__actions .danger {
        background: color-mix(in srgb, #ef4444 18%, transparent);
        border-color: color-mix(in srgb, #ef4444 38%, transparent);
      }

      .error {
        color: #ff857d;
        margin: 0;
      }

      @media (max-width: 860px) {
        .history__header {
          align-items: flex-start;
          flex-direction: column;
          gap: 0.7rem;
        }

        .project-row {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoryPageComponent {
  private readonly api = inject(ApiService);
  private readonly projectContext = inject(ProjectContextService);

  readonly projects = signal<ProjectListItem[]>([]);
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);

  constructor() {
    this.loadProjects();
  }

  activateProject(projectId: string): void {
    this.projectContext.setActiveProject(projectId);
  }

  loadProjects(): void {
    this.errorMessage.set('');
    this.isLoading.set(true);

    this.api.getProjects().subscribe({
      next: (result) => {
        this.projects.set(result.projects || []);
        this.isLoading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        this.errorMessage.set(error?.error?.message || 'Failed to load project history.');
        this.isLoading.set(false);
      }
    });
  }
  removeProject(projectId: string): void {
    this.api.deleteProject(projectId).subscribe({
      next: () => {
        const remaining = this.projects().filter((project) => project.id !== projectId);
        this.projects.set(remaining);

        if (this.projectContext.activeProjectId() === projectId) {
          this.projectContext.setActiveProject(remaining[0]?.id || null);
        }
      },
      error: (error: { error?: { message?: string } }) => {
        this.errorMessage.set(error?.error?.message || 'Failed to delete project.');
      }
    });
  }

  trackProject(_: number, project: ProjectListItem): string {
    return project.id;
  }
}
