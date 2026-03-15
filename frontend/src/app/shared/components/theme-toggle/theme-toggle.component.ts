import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="theme-toggle" type="button" (click)="toggle()">
      <span class="theme-toggle__icon">{{ theme.mode() === 'dark' ? '🌘' : '🌤' }}</span>
      <span>{{ theme.mode() === 'dark' ? 'Dark' : 'Light' }} mode</span>
    </button>
  `,
  styles: [
    `
      .theme-toggle {
        align-items: center;
        background: var(--panel-muted);
        border: 1px solid var(--border-color);
        border-radius: 999px;
        color: var(--text-primary);
        cursor: pointer;
        display: inline-flex;
        gap: 0.5rem;
        padding: 0.45rem 0.8rem;
        transition: transform 0.2s ease;
      }

      .theme-toggle:hover {
        transform: translateY(-1px);
      }

      .theme-toggle__icon {
        font-size: 0.95rem;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemeToggleComponent {
  readonly theme = inject(ThemeService);

  toggle(): void {
    this.theme.toggleTheme();
  }
}
