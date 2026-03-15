import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../core/services/api.service';
import { ProjectContextService } from '../../core/services/project-context.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  citations?: Array<{ method: string; path: string; score: number }>;
}

@Component({
  selector: 'app-chat-api-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="chat-page">
      <header>
        <h2 class="page-title">Chat With Your API</h2>
        <p class="page-lead">
          Ask questions about endpoints, authentication requirements, or usage patterns based on your parsed API docs.
        </p>
      </header>

      <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>

      <section class="card examples">
        <p>Quick prompts:</p>
        <button type="button" (click)="applyPrompt('How do I create a user?')">How do I create a user?</button>
        <button type="button" (click)="applyPrompt('Which endpoint returns orders?')">
          Which endpoint returns orders?
        </button>
        <button type="button" (click)="applyPrompt('What authentication does this API require?')">
          What authentication does this API require?
        </button>
      </section>

      <section class="card chat-window">
        <article *ngFor="let item of messages()" class="chat-row" [class.assistant]="item.role === 'assistant'">
          <h4>{{ item.role === 'user' ? 'You' : 'API Assistant' }}</h4>
          <p>{{ item.text }}</p>

          <div class="citations" *ngIf="item.citations && item.citations.length > 0">
            <span *ngFor="let cite of item.citations">
              {{ cite.method.toUpperCase() }} {{ cite.path }} (score: {{ cite.score }})
            </span>
          </div>
        </article>
      </section>

      <section class="card composer">
        <textarea
          rows="3"
          [(ngModel)]="question"
          placeholder="Ask about endpoint behavior, auth, resources, or data flow..."
        ></textarea>

        <button type="button" [disabled]="!question.trim() || isLoading()" (click)="sendQuestion()">
          {{ isLoading() ? 'Thinking...' : 'Ask API Assistant' }}
        </button>
      </section>
    </section>
  `,
  styles: [
    `
      .chat-page {
        display: grid;
        gap: 1rem;
      }

      .examples,
      .chat-window,
      .composer {
        padding: 1rem;
      }

      .examples {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .examples p {
        color: var(--text-secondary);
        margin: 0;
      }

      .examples button {
        background: color-mix(in srgb, var(--brand-primary) 24%, transparent);
        border: 1px solid color-mix(in srgb, var(--brand-primary) 42%, transparent);
        border-radius: 999px;
        color: var(--text-primary);
        cursor: pointer;
        font-size: 0.8rem;
        padding: 0.4rem 0.65rem;
      }

      .chat-window {
        display: grid;
        gap: 0.7rem;
        max-height: 460px;
        overflow: auto;
      }

      .chat-row {
        background: color-mix(in srgb, var(--panel-muted) 60%, transparent);
        border: 1px solid var(--border-color);
        border-radius: 0.8rem;
        padding: 0.75rem;
      }

      .chat-row.assistant {
        background: color-mix(in srgb, var(--brand-primary) 15%, transparent);
      }

      .chat-row h4 {
        font-size: 0.82rem;
        margin: 0 0 0.35rem;
      }

      .chat-row p {
        margin: 0;
      }

      .citations {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        margin-top: 0.5rem;
      }

      .citations span {
        background: color-mix(in srgb, var(--panel-bg) 80%, transparent);
        border: 1px solid var(--border-color);
        border-radius: 999px;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        padding: 0.2rem 0.45rem;
      }

      .composer {
        display: grid;
        gap: 0.6rem;
      }

      textarea {
        background: color-mix(in srgb, var(--panel-bg) 70%, var(--surface));
        border: 1px solid var(--border-color);
        border-radius: 0.7rem;
        color: var(--text-primary);
        font: inherit;
        padding: 0.6rem;
        resize: vertical;
      }

      .composer button {
        background: linear-gradient(130deg, var(--brand-primary), color-mix(in srgb, var(--brand-accent) 25%, var(--brand-primary)));
        border: 0;
        border-radius: 0.6rem;
        color: #03141f;
        cursor: pointer;
        font-weight: 700;
        justify-self: end;
        padding: 0.52rem 0.8rem;
      }

      .composer button[disabled] {
        cursor: not-allowed;
        opacity: 0.7;
      }

      .error {
        color: #ff857d;
        margin: 0;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatApiPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly projectContext = inject(ProjectContextService);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly messages = signal<ChatMessage[]>([]);

  projectId = '';
  question = '';

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const projectId = params.get('projectId');
      if (!projectId) {
        this.errorMessage.set('projectId is required');
        return;
      }

      this.projectId = projectId;
      this.projectContext.setActiveProject(projectId);
    });
  }

  applyPrompt(text: string): void {
    this.question = text;
  }

  sendQuestion(): void {
    const question = this.question.trim();
    if (!this.projectId || !question) {
      return;
    }

    this.errorMessage.set('');
    this.isLoading.set(true);
    this.messages.update((items) => [...items, { role: 'user', text: question }]);

    this.api.askApi(this.projectId, question).subscribe({
      next: (response) => {
        this.messages.update((items) => [
          ...items,
          {
            role: 'assistant',
            text: response.answer,
            citations: response.citations || []
          }
        ]);

        this.question = '';
        this.isLoading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        this.errorMessage.set(error?.error?.message || 'Failed to process your question.');
        this.isLoading.set(false);
      }
    });
  }
}
