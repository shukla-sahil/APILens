import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

type SnippetLanguage = 'javascript' | 'python' | 'curl';

@Component({
  selector: 'app-snippet-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="snippet-tabs">
      <div class="snippet-tabs__header">
        <button type="button" [class.active]="active() === 'javascript'" (click)="active.set('javascript')">
          JavaScript
        </button>
        <button type="button" [class.active]="active() === 'python'" (click)="active.set('python')">
          Python
        </button>
        <button type="button" [class.active]="active() === 'curl'" (click)="active.set('curl')">
          cURL
        </button>
      </div>

      <pre><code>{{ snippets?.[active()] || 'Snippet unavailable' }}</code></pre>
    </section>
  `,
  styles: [
    `
      .snippet-tabs {
        background: var(--code-bg);
        border: 1px solid var(--border-color);
        border-radius: 0.85rem;
        overflow: hidden;
      }

      .snippet-tabs__header {
        background: color-mix(in srgb, var(--code-bg) 60%, var(--panel-bg));
        border-bottom: 1px solid var(--border-color);
        display: flex;
        gap: 0.4rem;
        padding: 0.45rem;
      }

      .snippet-tabs__header button {
        background: transparent;
        border: 1px solid transparent;
        border-radius: 0.5rem;
        color: var(--text-secondary);
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: 0.78rem;
        padding: 0.3rem 0.5rem;
      }

      .snippet-tabs__header button.active {
        background: color-mix(in srgb, var(--brand-primary) 24%, transparent);
        border-color: color-mix(in srgb, var(--brand-primary) 45%, transparent);
        color: var(--text-primary);
      }

      pre {
        margin: 0;
        max-height: 320px;
        overflow: auto;
        padding: 0.8rem;
      }

      code {
        color: var(--code-text);
        font-family: var(--font-mono);
        font-size: 0.8rem;
        white-space: pre-wrap;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SnippetTabsComponent {
  @Input({ required: true }) snippets: Record<string, string> | undefined;

  readonly active = signal<SnippetLanguage>('javascript');
}
