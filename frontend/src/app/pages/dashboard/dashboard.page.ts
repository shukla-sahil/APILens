import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, map, switchMap } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ProjectContextService } from '../../core/services/project-context.service';
import { UploadDropzoneComponent } from '../../shared/components/upload-dropzone/upload-dropzone.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, UploadDropzoneComponent],
  template: `
    <section class="dashboard">
      <header>
        <h2 class="page-title">Project Dashboard</h2>
        <p class="page-lead">
          Upload a Postman collection or OpenAPI file, parse it, and generate interactive documentation with AI insights.
        </p>
      </header>

      <section class="card uploader">
        <app-upload-dropzone (fileSelected)="onFileSelected($event)"></app-upload-dropzone>

        <div class="uploader__form">
          <label>
            Project Name
            <input type="text" [(ngModel)]="projectName" placeholder="Payments API" />
          </label>

          <label>
            Description
            <textarea
              rows="3"
              [(ngModel)]="description"
              placeholder="Describe what this API is used for and who the docs are for"
            ></textarea>
          </label>
        </div>

        <div class="uploader__footer">
          <p>
            Selected File:
            <strong>{{ selectedFileName() || 'None' }}</strong>
          </p>

            <button type="button" 
                    [disabled]="!selectedFile() || isBusy()" 
                    [class.btn-loader]="isBusy()"
                    (click)="generateDocumentation()">
              {{ isBusy() ? 'Generating Docs' : 'Generate Documentation' }}
          </button>
        </div>
      </section>

      <section class="card result" *ngIf="lastResult() as result">
        <h3>Generation Completed</h3>
        <p>{{ result.summary || 'Documentation generated successfully.' }}</p>

        <div class="kv">
          <span class="badge">Project ID: {{ result.projectId }}</span>
          <span class="badge">Endpoints: {{ result.endpointCount }}</span>
          <span class="badge">Source: {{ result.sourceType }}</span>
        </div>

        <p *ngIf="result.shareUrl" class="share-link">Share link: {{ result.shareUrl }}</p>

        <div class="result__actions">
          <a [routerLink]="['/docs', result.projectId]">Open Docs Viewer</a>
          <a [routerLink]="['/explorer', result.projectId]" class="ghost">Open Endpoint Explorer</a>
          <a [routerLink]="['/chat', result.projectId]" class="ghost">Open Chat</a>
        </div>
      </section>

      <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>
    </section>
  `,
  styles: [
    `
      .dashboard {
        display: grid;
        gap: 1rem;
      }

      .uploader,
      .result {
        display: grid;
        gap: 1rem;
        padding: 1rem;
      }

      .uploader__form {
        display: grid;
        gap: 0.8rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      label {
        color: var(--text-secondary);
        display: grid;
        font-size: 0.85rem;
        gap: 0.35rem;
      }

      input,
      textarea {
        background: color-mix(in srgb, var(--panel-bg) 75%, var(--surface));
        border: 1px solid var(--border-color);
        border-radius: 0.65rem;
        color: var(--text-primary);
        font: inherit;
        padding: 0.58rem 0.65rem;
      }

      textarea {
        resize: vertical;
      }

      .uploader__footer {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 0.7rem;
        justify-content: space-between;
      }

      .uploader__footer p {
        color: var(--text-secondary);
        margin: 0;
      }

      button {
        background: linear-gradient(145deg, var(--brand-primary), color-mix(in srgb, var(--brand-accent) 20%, var(--brand-primary)));
        border: 0;
        border-radius: 0.65rem;
        color: #031421;
        cursor: pointer;
        font-weight: 700;
        padding: 0.58rem 0.9rem;
      }

      button[disabled] {
        cursor: not-allowed;
        filter: saturate(0.5);
        opacity: 0.7;
      }

      .share-link {
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-size: 0.82rem;
      }

      .result__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
      }

      .result__actions a {
        background: var(--brand-primary);
        border-radius: 0.55rem;
        color: #04141e;
        font-weight: 700;
        padding: 0.5rem 0.8rem;
        text-decoration: none;
      }

      .result__actions a.ghost {
        background: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-primary);
      }

      .error {
        color: #ff857d;
        margin: 0;
      }

      @media (max-width: 900px) {
        .uploader__form {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  private readonly api = inject(ApiService);
  private readonly projectContext = inject(ProjectContextService);

  readonly selectedFile = signal<File | null>(null);
  readonly isBusy = signal(false);
  readonly errorMessage = signal('');
  readonly lastResult = signal<{
    projectId: string;
    sourceType: string;
    endpointCount: number;
    summary: string;
    shareUrl?: string;
  } | null>(null);

  projectName = '';
  description = '';

  readonly selectedFileName = computed(() => this.selectedFile()?.name || '');

  onFileSelected(file: File): void {
    this.selectedFile.set(file);

    if (!this.projectName.trim()) {
      this.projectName = file.name.replace(/\.[^.]+$/, '');
    }
  }

  generateDocumentation(): void {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.errorMessage.set('');
    this.isBusy.set(true);

    this.api
      .uploadSpec(file, this.projectName.trim() || file.name.replace(/\.[^.]+$/, ''), this.description.trim())
      .pipe(
        switchMap((uploadResult) => {
          return this.api.parseSpec(uploadResult.projectId).pipe(
            map((parseResult) => ({
              ...parseResult,
              shareUrl: uploadResult.shareUrl,
              projectId: uploadResult.projectId
            }))
          );
        }),
        finalize(() => {
          this.isBusy.set(false);
        })
      )
      .subscribe({
        next: (result) => {
          this.projectContext.setActiveProject(result.projectId);
          this.lastResult.set(result);
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(error?.error?.message || 'Failed to upload and parse the specification file.');
        }
      });
  }
}
