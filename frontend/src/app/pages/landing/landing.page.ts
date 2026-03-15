import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="landing">
      <header class="hero card reveal">
        <div class="hero__content">
          <p class="badge">Smarter Than Swagger</p>
          <h2>Build API documentation that feels designed, intelligent, and instantly usable.</h2>
          <p>
            AI API Documentation Generator transforms OpenAPI and Postman files into interactive docs, endpoint
            explorers, generated SDK snippets, mock testing panels, and AI-guided onboarding for developers.
          </p>

          <div class="hero__actions">
            <a routerLink="/dashboard">Start New Project</a>
            <a routerLink="/history" class="ghost">Open Project History</a>
          </div>

          <ul class="hero__stats">
            <li>
              <strong>3</strong>
              <span>SDK outputs</span>
            </li>
            <li>
              <strong>1-click</strong>
              <span>spec parsing</span>
            </li>
            <li>
              <strong>Live</strong>
              <span>mock testing</span>
            </li>
          </ul>
        </div>

        <div class="hero__auth card">
          <p class="auth-card__eyebrow">Start Here</p>
          <h3>{{ isLoginMode() ? 'Welcome back' : 'Create your account' }}</h3>
          <p class="auth-card__lead">
            {{
              isLoginMode()
                ? 'Log in to open your personal API projects and continue exactly where you left off.'
                : 'Sign up in seconds to keep your generated docs, flow graphs, and endpoint history tied to your account.'
            }}
          </p>

          <div class="auth-card__switch">
            <button type="button" [class.active]="isLoginMode()" (click)="switchMode('login')">Log In</button>
            <button type="button" [class.active]="!isLoginMode()" (click)="switchMode('signup')">Sign Up</button>
          </div>

          <p class="config-warning" *ngIf="!auth.isConfigured()">
            Supabase auth keys are missing. Set NG_APP_SUPABASE_URL and NG_APP_SUPABASE_ANON_KEY to enable login.
          </p>

          <form class="auth-form" (ngSubmit)="submitAuth()">
            <label *ngIf="!isLoginMode()">
              Full Name
              <input
                type="text"
                name="fullName"
                [(ngModel)]="fullName"
                placeholder="Jane Patel"
                [disabled]="isBusy()"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                name="email"
                [(ngModel)]="email"
                placeholder="you@company.com"
                autocomplete="email"
                [disabled]="isBusy()"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                [(ngModel)]="password"
                placeholder="At least 8 characters"
                autocomplete="current-password"
                [disabled]="isBusy()"
                required
                minlength="8"
              />
            </label>

            <button type="submit" class="auth-primary" [disabled]="isBusy() || !auth.isConfigured()">
              {{ isBusy() ? 'Please wait...' : isLoginMode() ? 'Log In to API Lens' : 'Create Account' }}
            </button>
          </form>

          <div class="auth-divider"><span>or continue with</span></div>

          <button
            type="button"
            class="google-btn"
            (click)="signInWithGoogle()"
            [disabled]="isBusy() || !auth.isConfigured()"
          >
            <span aria-hidden="true">G</span>
            Sign in with Google
          </button>

          <p class="auth-message success" *ngIf="successMessage()">{{ successMessage() }}</p>
          <p class="auth-message error" *ngIf="errorMessage()">{{ errorMessage() }}</p>
        </div>
      </header>

      <section class="showcase">
        <article class="showcase__card card reveal reveal--delay-1">
          <div>
            <h3>Documentation with real structure</h3>
            <p>
              Grouped endpoints, request and response sections, inline authentication details, and clean code snippets
              in one flow.
            </p>
          </div>
          <img src="assets/landing/docs-ui-preview.svg" alt="Documentation viewer interface" />
        </article>

        <article class="showcase__card card reveal reveal--delay-2">
          <div>
            <h3>Visual API flow understanding</h3>
            <p>
              See endpoint groups, resource relationships, and security dependencies with a simple graph made for fast
              technical onboarding.
            </p>
          </div>
          <img src="assets/landing/flow-ui-preview.svg" alt="API flow visualization interface" />
        </article>
      </section>

      <section class="workflow card reveal reveal--delay-2">
        <h3>How Teams Use It</h3>
        <ol>
          <li>
            <span>01</span>
            <div>
              <strong>Upload Spec</strong>
              <p>Drop in a Postman collection or OpenAPI JSON/YAML file.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Generate Docs + AI Insights</strong>
              <p>Automatically parse endpoints, auth, examples, and missing fields.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Ship Better DX</strong>
              <p>Share docs, ask API questions, and test integrations against mock responses.</p>
            </div>
          </li>
        </ol>
      </section>

      <section class="grid">
        <article class="card reveal reveal--delay-1">
          <span class="card__label">AUTODOC</span>
          <h3>Automatic Documentation</h3>
          <p>Extract methods, parameters, request schemas, authentication, and responses with zero manual effort.</p>
        </article>

        <article class="card reveal reveal--delay-2">
          <span class="card__label">AI GUIDE</span>
          <h3>AI Assistance</h3>
          <p>Get endpoint explanations, missing field suggestions, generated payload examples, and API summaries.</p>
        </article>

        <article class="card reveal reveal--delay-3">
          <span class="card__label">DEV TOOLS</span>
          <h3>Chat, Flow, and Mocking</h3>
          <p>Ask questions about your API, visualize endpoint relationships, and test against auto-generated mocks.</p>
        </article>
      </section>
    </section>
  `,
  styles: [
    `
      .landing {
        display: grid;
        gap: 1rem;
      }

      .hero {
        background:
          radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--brand-accent) 25%, transparent), transparent 33%),
          radial-gradient(circle at 18% 12%, color-mix(in srgb, var(--brand-primary) 20%, transparent), transparent 33%),
          linear-gradient(145deg, color-mix(in srgb, var(--panel-bg) 94%, transparent), var(--panel-bg));
        display: grid;
        gap: 1.2rem;
        grid-template-columns: 1.05fr 0.95fr;
        overflow: hidden;
        padding: clamp(1.1rem, 2vw, 1.6rem);
        position: relative;
      }

      .hero h2 {
        font-size: clamp(1.7rem, 3.2vw, 2.8rem);
        line-height: 1.08;
        margin: 0.65rem 0;
        max-width: 14ch;
      }

      .hero p {
        color: var(--text-secondary);
        margin: 0;
        max-width: 62ch;
      }

      .hero__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.7rem;
        margin-top: 1.2rem;
      }

      .hero__actions a {
        background: linear-gradient(130deg, var(--brand-primary), color-mix(in srgb, var(--brand-accent) 26%, var(--brand-primary)));
        border-radius: 0.65rem;
        color: #051724;
        font-size: 0.9rem;
        font-weight: 700;
        padding: 0.66rem 0.95rem;
        text-decoration: none;
        transition: transform 0.2s ease;
      }

      .hero__actions a:hover {
        transform: translateY(-2px);
      }

      .hero__actions a.ghost {
        background: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-primary);
      }

      .hero__stats {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        list-style: none;
        margin: 1rem 0 0;
        padding: 0;
      }

      .hero__stats li {
        background: color-mix(in srgb, var(--panel-muted) 55%, transparent);
        border: 1px solid var(--border-color);
        border-radius: 0.75rem;
        min-width: 7.5rem;
        padding: 0.5rem 0.65rem;
      }

      .hero__stats strong {
        display: block;
        font-size: 1.02rem;
        line-height: 1;
      }

      .hero__stats span {
        color: var(--text-muted);
        font-size: 0.77rem;
        text-transform: uppercase;
      }

      .hero__auth {
        background:
          radial-gradient(circle at 14% 14%, color-mix(in srgb, var(--brand-primary) 26%, transparent), transparent 42%),
          linear-gradient(165deg, color-mix(in srgb, var(--panel-bg) 90%, transparent), color-mix(in srgb, var(--panel-muted) 78%, transparent));
        border-radius: 1rem;
        display: grid;
        gap: 0.75rem;
        padding: 1rem;
      }

      .auth-card__eyebrow {
        color: var(--text-muted);
        font-family: var(--font-mono);
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        margin: 0;
        text-transform: uppercase;
      }

      .hero__auth h3 {
        font-size: clamp(1.2rem, 2vw, 1.5rem);
        line-height: 1.15;
        margin: 0;
      }

      .auth-card__lead {
        color: var(--text-secondary);
        margin: 0;
      }

      .auth-card__switch {
        background: color-mix(in srgb, var(--panel-muted) 70%, transparent);
        border: 1px solid var(--border-color);
        border-radius: 0.65rem;
        display: grid;
        gap: 0.35rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        padding: 0.25rem;
      }

      .auth-card__switch button {
        background: transparent;
        border: 0;
        border-radius: 0.45rem;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 700;
        padding: 0.48rem 0.5rem;
      }

      .auth-card__switch button.active {
        background: linear-gradient(130deg, color-mix(in srgb, var(--brand-primary) 74%, transparent), color-mix(in srgb, var(--brand-accent) 40%, transparent));
        color: #04202f;
      }

      .config-warning {
        background: color-mix(in srgb, #f97316 15%, transparent);
        border: 1px solid color-mix(in srgb, #f97316 34%, transparent);
        border-radius: 0.65rem;
        color: color-mix(in srgb, var(--text-primary) 88%, #f97316);
        font-size: 0.8rem;
        margin: 0;
        padding: 0.55rem 0.6rem;
      }

      .auth-form {
        display: grid;
        gap: 0.58rem;
      }

      .auth-form label {
        color: var(--text-secondary);
        display: grid;
        font-size: 0.8rem;
        gap: 0.28rem;
      }

      .auth-form input {
        background: color-mix(in srgb, var(--panel-bg) 80%, var(--surface));
        border: 1px solid var(--border-color);
        border-radius: 0.58rem;
        color: var(--text-primary);
        font: inherit;
        font-size: 0.88rem;
        padding: 0.56rem 0.62rem;
      }

      .auth-primary,
      .google-btn {
        align-items: center;
        border: 0;
        border-radius: 0.62rem;
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        font-weight: 700;
        gap: 0.45rem;
        justify-content: center;
        padding: 0.6rem 0.78rem;
      }

      .auth-primary {
        background: linear-gradient(130deg, var(--brand-primary), color-mix(in srgb, var(--brand-accent) 40%, var(--brand-primary)));
        color: #041722;
      }

      .google-btn {
        background: color-mix(in srgb, var(--surface-elevated) 92%, transparent);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
      }

      .google-btn span {
        align-items: center;
        background: linear-gradient(145deg, #ffffff, #f6d6bb);
        border-radius: 999px;
        color: #1f2937;
        display: inline-flex;
        font-size: 0.8rem;
        font-weight: 800;
        height: 1.35rem;
        justify-content: center;
        width: 1.35rem;
      }

      .auth-primary[disabled],
      .google-btn[disabled] {
        cursor: not-allowed;
        opacity: 0.65;
      }

      .auth-divider {
        align-items: center;
        color: var(--text-muted);
        display: grid;
        font-family: var(--font-mono);
        font-size: 0.7rem;
        gap: 0.45rem;
        grid-template-columns: 1fr auto 1fr;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .auth-divider::before,
      .auth-divider::after {
        background: color-mix(in srgb, var(--border-color) 80%, transparent);
        content: '';
        height: 1px;
      }

      .auth-message {
        border-radius: 0.62rem;
        font-size: 0.8rem;
        margin: 0;
        padding: 0.52rem 0.58rem;
      }

      .auth-message.success {
        background: color-mix(in srgb, #10b981 16%, transparent);
        border: 1px solid color-mix(in srgb, #10b981 40%, transparent);
      }

      .auth-message.error {
        background: color-mix(in srgb, #ef4444 16%, transparent);
        border: 1px solid color-mix(in srgb, #ef4444 40%, transparent);
      }

      .showcase {
        display: grid;
        gap: 0.9rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .showcase__card {
        display: grid;
        gap: 0.7rem;
        padding: 0.95rem;
      }

      .showcase__card h3 {
        margin: 0;
      }

      .showcase__card p {
        color: var(--text-secondary);
        margin: 0.38rem 0 0;
      }

      .showcase__card img {
        border: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
        border-radius: 0.85rem;
        width: 100%;
      }

      .workflow {
        overflow: hidden;
        padding: 1rem;
        position: relative;
      }

      .workflow::before {
        background: linear-gradient(90deg, color-mix(in srgb, var(--brand-primary) 30%, transparent), transparent 72%);
        content: '';
        height: 1px;
        left: 1rem;
        position: absolute;
        right: 1rem;
        top: 3.05rem;
      }

      .workflow h3 {
        margin: 0 0 0.95rem;
      }

      .workflow ol {
        display: grid;
        gap: 0.8rem;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .workflow li {
        display: grid;
        gap: 0.45rem;
        grid-template-columns: auto 1fr;
      }

      .workflow li span {
        align-items: center;
        background: color-mix(in srgb, var(--brand-primary) 22%, transparent);
        border: 1px solid color-mix(in srgb, var(--brand-primary) 45%, transparent);
        border-radius: 0.58rem;
        display: inline-flex;
        font-family: var(--font-mono);
        font-size: 0.73rem;
        font-weight: 700;
        height: 1.7rem;
        justify-content: center;
        min-width: 1.9rem;
      }

      .workflow li strong {
        display: block;
        font-size: 0.95rem;
      }

      .workflow li p {
        color: var(--text-secondary);
        margin: 0.2rem 0 0;
      }

      .grid {
        display: grid;
        gap: 0.9rem;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .grid article {
        background:
          linear-gradient(160deg, color-mix(in srgb, var(--panel-bg) 95%, transparent), var(--panel-bg));
        overflow: hidden;
        padding: 1rem;
        position: relative;
      }

      .grid article::after {
        background: radial-gradient(circle at center, color-mix(in srgb, var(--brand-primary) 34%, transparent), transparent 72%);
        content: '';
        height: 10rem;
        opacity: 0.3;
        position: absolute;
        right: -3.3rem;
        top: -4.5rem;
        width: 10rem;
      }

      .card__label {
        color: var(--text-muted);
        display: inline-block;
        font-family: var(--font-mono);
        font-size: 0.66rem;
        letter-spacing: 0.08em;
      }

      .grid h3 {
        margin: 0.42rem 0 0.45rem;
      }

      .grid p {
        color: var(--text-secondary);
        margin: 0;
      }

      .reveal {
        animation: reveal-up 0.6s ease both;
      }

      .reveal--delay-1 {
        animation-delay: 0.07s;
      }

      .reveal--delay-2 {
        animation-delay: 0.14s;
      }

      .reveal--delay-3 {
        animation-delay: 0.22s;
      }

      @keyframes reveal-up {
        from {
          opacity: 0;
          transform: translateY(16px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 1080px) {
        .hero {
          grid-template-columns: 1fr;
        }

        .workflow ol {
          grid-template-columns: 1fr;
        }

        .workflow::before {
          display: none;
        }
      }

      @media (max-width: 900px) {
        .showcase {
          grid-template-columns: 1fr;
        }

        .grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 640px) {
        .hero__stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .hero__stats li {
          min-width: 0;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPageComponent {
  readonly auth = inject(AuthService);

  readonly isBusy = signal(false);
  readonly mode = signal<'login' | 'signup'>('signup');
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isLoginMode = computed(() => this.mode() === 'login');

  fullName = '';
  email = '';
  password = '';

  private redirectTo = '/dashboard';

  constructor() {
    const redirectTarget = this.route.snapshot.queryParamMap.get('redirect');
    if (redirectTarget && redirectTarget.startsWith('/')) {
      this.redirectTo = redirectTarget;
    }

    const authFailed = this.route.snapshot.queryParamMap.get('auth') === 'failed';
    if (authFailed) {
      this.errorMessage.set('Google sign-in did not complete. Please try again.');
    }
  }

  switchMode(mode: 'login' | 'signup'): void {
    this.mode.set(mode);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  async submitAuth(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.auth.isConfigured()) {
      this.errorMessage.set('Authentication is not configured yet. Add Supabase runtime keys and reload.');
      return;
    }

    const email = this.email.trim();
    const password = this.password.trim();
    const fullName = this.fullName.trim();

    if (!email || !password) {
      this.errorMessage.set('Email and password are required.');
      return;
    }

    if (!this.isLoginMode() && !fullName) {
      this.errorMessage.set('Full name is required for signup.');
      return;
    }

    this.isBusy.set(true);

    try {
      if (this.isLoginMode()) {
        await this.auth.signIn(email, password);
        await this.router.navigateByUrl(this.redirectTo);
        return;
      }

      const result = await this.auth.signUp(email, password, fullName);
      if (result.requiresEmailVerification) {
        this.successMessage.set('Account created. Please verify your email, then log in.');
        this.mode.set('login');
        return;
      }

      await this.router.navigateByUrl(this.redirectTo);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed. Please try again.';
      this.errorMessage.set(message);
    } finally {
      this.isBusy.set(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.auth.isConfigured()) {
      this.errorMessage.set('Authentication is not configured yet. Add Supabase runtime keys and reload.');
      return;
    }

    this.isBusy.set(true);

    try {
      await this.auth.signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed.';
      this.errorMessage.set(message);
      this.isBusy.set(false);
    }
  }
}
