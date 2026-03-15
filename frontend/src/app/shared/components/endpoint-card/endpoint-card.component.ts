import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';

import { ApiEndpoint } from '../../../core/models/api-doc.models';
import { SnippetTabsComponent } from '../snippet-tabs/snippet-tabs.component';

@Component({
  selector: 'app-endpoint-card',
  standalone: true,
  imports: [CommonModule, JsonPipe, SnippetTabsComponent],
  template: `
    <article class="endpoint-card" [attr.data-method]="endpoint.method">
      <header class="endpoint-card__header">
        <span class="method">{{ endpoint.method.toUpperCase() }}</span>
        <h3>{{ endpoint.path }}</h3>
      </header>

      <p class="endpoint-card__summary">{{ endpoint.summary || endpoint.description || 'No description yet' }}</p>
      <p class="endpoint-card__ai">{{ endpoint.ai?.explanation }}</p>

      <details>
        <summary>Request & response details</summary>

        <section class="section">
          <h4>Query Params</h4>
          <pre><code>{{ endpoint.parameters.query | json }}</code></pre>
        </section>

        <section class="section">
          <h4>Path Params</h4>
          <pre><code>{{ endpoint.parameters.path | json }}</code></pre>
        </section>

        <section class="section">
          <h4>Request Body</h4>
          <pre><code>{{ endpoint.requestBody | json }}</code></pre>
        </section>

        <section class="section">
          <h4>Responses</h4>
          <pre><code>{{ endpoint.responses | json }}</code></pre>
        </section>

        <section class="section">
          <h4>Authentication</h4>
          <pre><code>{{ endpoint.authentication | json }}</code></pre>
        </section>

        <section class="section">
          <h4>SDK Snippets</h4>
          <app-snippet-tabs [snippets]="endpoint.snippets"></app-snippet-tabs>
        </section>
      </details>
    </article>
  `,
  styles: [
    `
      .endpoint-card {
        background: var(--panel-bg);
        border: 1px solid var(--border-color);
        border-radius: 1rem;
        padding: 1rem;
      }

      .endpoint-card__header {
        align-items: center;
        display: flex;
        gap: 0.6rem;
      }

      .method {
        border-radius: 0.45rem;
        font-family: var(--font-mono);
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        padding: 0.25rem 0.45rem;
      }

      .endpoint-card[data-method='get'] .method {
        background: color-mix(in srgb, #1f9d6a 25%, transparent);
        color: #8deac2;
      }

      .endpoint-card[data-method='post'] .method {
        background: color-mix(in srgb, #2b72ff 25%, transparent);
        color: #9ec4ff;
      }

      .endpoint-card[data-method='put'] .method,
      .endpoint-card[data-method='patch'] .method {
        background: color-mix(in srgb, #f59e0b 24%, transparent);
        color: #ffd187;
      }

      .endpoint-card[data-method='delete'] .method {
        background: color-mix(in srgb, #ef4444 24%, transparent);
        color: #ff9d9d;
      }

      h3 {
        font-size: 0.98rem;
        margin: 0;
      }

      .endpoint-card__summary {
        color: var(--text-secondary);
        margin: 0.55rem 0 0.3rem;
      }

      .endpoint-card__ai {
        color: var(--brand-accent);
        font-size: 0.85rem;
        margin: 0 0 0.85rem;
      }

      details {
        border-top: 1px solid var(--border-color);
        margin-top: 0.7rem;
        padding-top: 0.7rem;
      }

      summary {
        cursor: pointer;
        font-weight: 600;
      }

      .section {
        margin-top: 0.75rem;
      }

      h4 {
        font-size: 0.83rem;
        margin: 0 0 0.35rem;
      }

      pre {
        background: var(--code-bg);
        border: 1px solid var(--border-color);
        border-radius: 0.65rem;
        margin: 0;
        overflow: auto;
        padding: 0.6rem;
      }

      code {
        color: var(--code-text);
        font-family: var(--font-mono);
        font-size: 0.75rem;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EndpointCardComponent {
  @Input({ required: true }) endpoint!: ApiEndpoint;
}
