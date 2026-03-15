import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/services/auth.service';
import { ThemeToggleComponent } from '../shared/components/theme-toggle/theme-toggle.component';
import { ProjectContextService } from '../core/services/project-context.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ThemeToggleComponent],
  template: `
    <div class="shell-bg"></div>

    <div class="shell">
      <aside class="sidebar">
        <a routerLink="/dashboard" class="brand">
          <span class="brand__chip">AI</span>
          <span>
            <strong>API Lens</strong>
            <small>Documentation Generator</small>
          </span>
        </a>

        <nav class="nav">
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a [routerLink]="docsLink()" routerLinkActive="active" [class.disabled]="!context.activeProjectId()">Docs Viewer</a>
          <a [routerLink]="explorerLink()" routerLinkActive="active" [class.disabled]="!context.activeProjectId()">Endpoint Explorer</a>
          <a [routerLink]="flowLink()" routerLinkActive="active" [class.disabled]="!context.activeProjectId()">Flow Visualization</a>
          <a [routerLink]="chatLink()" routerLinkActive="active" [class.disabled]="!context.activeProjectId()">Chat With API</a>
          <a routerLink="/history" routerLinkActive="active">History</a>
        </nav>

        <div class="sidebar__meta">
          <p class="meta-title">Active Project</p>
          <p class="meta-value">{{ context.activeProjectId() || 'No project selected yet' }}</p>
        </div>

        <div class="sidebar__account">
          <p class="meta-title">Signed In</p>
          <p class="meta-value">{{ auth.user()?.email || 'Unknown account' }}</p>

          <button type="button" (click)="signOut()">Sign Out</button>
          <p class="meta-error" *ngIf="logoutError()">{{ logoutError() }}</p>
        </div>
      </aside>

      <section class="workspace">
        <header class="workspace__header">
          <h1>AI API Documentation Generator</h1>
          <app-theme-toggle></app-theme-toggle>
        </header>

        <main class="workspace__content">
          <router-outlet></router-outlet>
        </main>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        position: relative;
      }

      .shell-bg {
        background: radial-gradient(circle at 20% 12%, color-mix(in srgb, var(--brand-primary) 28%, transparent), transparent 28%),
          radial-gradient(circle at 88% 18%, color-mix(in srgb, var(--brand-accent) 20%, transparent), transparent 25%),
          linear-gradient(180deg, color-mix(in srgb, var(--surface) 84%, transparent), var(--surface));
        inset: 0;
        pointer-events: none;
        position: fixed;
        z-index: -1;
      }

      .shell {
        display: grid;
        grid-template-columns: 270px minmax(0, 1fr);
        min-height: 100vh;
      }

      .sidebar {
        backdrop-filter: blur(14px);
        background: color-mix(in srgb, var(--surface-elevated) 88%, transparent);
        border-right: 1px solid var(--border-color);
        box-shadow: inset -1px 0 0 color-mix(in srgb, var(--brand-primary) 10%, transparent);
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding: 1.2rem;
      }

      .brand {
        align-items: center;
        color: var(--text-primary);
        display: flex;
        gap: 0.7rem;
        text-decoration: none;
        transition: transform 0.2s ease;
      }

      .brand:hover {
        transform: translateY(-1px);
      }

      .brand strong {
        display: block;
        font-size: 1.02rem;
        letter-spacing: 0.02em;
      }

      .brand small {
        color: var(--text-muted);
        display: block;
        font-size: 0.76rem;
      }

      .brand__chip {
        align-items: center;
        background: linear-gradient(145deg, var(--brand-primary), color-mix(in srgb, var(--brand-accent) 72%, black));
        border-radius: 0.6rem;
        color: #041016;
        box-shadow: 0 8px 16px rgb(0 0 0 / 22%);
        display: inline-flex;
        font-family: var(--font-mono);
        font-size: 0.76rem;
        font-weight: 800;
        height: 2rem;
        justify-content: center;
        min-width: 2rem;
      }

      .nav {
        display: grid;
        gap: 0.35rem;
      }

      .nav a {
        border: 1px solid transparent;
        border-radius: 0.7rem;
        color: var(--text-secondary);
        font-size: 0.9rem;
        font-weight: 600;
        padding: 0.6rem 0.7rem;
        text-decoration: none;
        transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
      }

      .nav a:not(.disabled):hover {
        background: color-mix(in srgb, var(--brand-primary) 16%, transparent);
        color: var(--text-primary);
        transform: translateX(2px);
      }

      .nav a.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }

      .nav a.active {
        background: linear-gradient(120deg, color-mix(in srgb, var(--brand-primary) 22%, transparent), transparent);
        border-color: color-mix(in srgb, var(--brand-primary) 46%, transparent);
        color: var(--text-primary);
      }

      .sidebar__meta {
        background: color-mix(in srgb, var(--panel-bg) 80%, transparent);
        border: 1px solid var(--border-color);
        border-radius: 0.8rem;
        padding: 0.75rem;
      }

      .sidebar__account {
        background: color-mix(in srgb, var(--panel-bg) 80%, transparent);
        border: 1px solid var(--border-color);
        border-radius: 0.8rem;
        display: grid;
        gap: 0.5rem;
        margin-top: auto;
        padding: 0.75rem;
      }

      .sidebar__account button {
        background: color-mix(in srgb, var(--brand-primary) 24%, transparent);
        border: 1px solid color-mix(in srgb, var(--brand-primary) 45%, transparent);
        border-radius: 0.55rem;
        color: var(--text-primary);
        cursor: pointer;
        font-family: inherit;
        font-size: 0.82rem;
        font-weight: 700;
        padding: 0.45rem 0.6rem;
      }

      .sidebar__account button:hover {
        background: color-mix(in srgb, var(--brand-primary) 30%, transparent);
      }

      .meta-error {
        color: #ff857d;
        font-size: 0.78rem;
        margin: 0;
      }

      .meta-title {
        color: var(--text-muted);
        font-family: var(--font-mono);
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        margin: 0 0 0.4rem;
        text-transform: uppercase;
      }

      .meta-value {
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-size: 0.77rem;
        margin: 0;
        overflow-wrap: anywhere;
      }

      .workspace {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .workspace__header {
        align-items: center;
        backdrop-filter: blur(10px);
        background: color-mix(in srgb, var(--surface) 88%, transparent);
        border-bottom: 1px solid var(--border-color);
        box-shadow: 0 4px 18px rgb(0 0 0 / 10%);
        display: flex;
        justify-content: space-between;
        padding: 1rem 1.3rem;
        position: sticky;
        top: 0;
        z-index: 20;
      }

      .workspace__header h1 {
        font-size: clamp(0.95rem, 1.2vw, 1.1rem);
        letter-spacing: 0.03em;
        margin: 0;
      }

      .workspace__content {
        min-height: 0;
        padding: 1.3rem;
      }

      @media (max-width: 980px) {
        .shell {
          grid-template-columns: 1fr;
        }

        .sidebar {
          border-bottom: 1px solid var(--border-color);
          border-right: 0;
        }

        .nav {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .nav a {
          text-align: center;
        }
      }

      @media (max-width: 680px) {
        .workspace__header {
          align-items: flex-start;
          flex-direction: column;
          gap: 0.7rem;
        }

        .nav {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  readonly auth = inject(AuthService);
  readonly context = inject(ProjectContextService);
  readonly logoutError = signal('');

  private readonly router = inject(Router);

  docsLink(): string[] | null {
    const projectId = this.context.activeProjectId();
    return projectId ? ['/docs', projectId] : null;
  }

  explorerLink(): string[] | null {
    const projectId = this.context.activeProjectId();
    return projectId ? ['/explorer', projectId] : null;
  }

  flowLink(): string[] | null {
    const projectId = this.context.activeProjectId();
    return projectId ? ['/flow', projectId] : null;
  }

  chatLink(): string[] | null {
    const projectId = this.context.activeProjectId();
    return projectId ? ['/chat', projectId] : null;
  }

  async signOut(): Promise<void> {
    this.logoutError.set('');

    try {
      this.context.setActiveProject(null);
      await this.auth.signOut();
      await this.router.navigateByUrl('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign out.';
      this.logoutError.set(message);
    }
  }
}
