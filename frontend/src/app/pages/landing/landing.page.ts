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
    <div class="landing-layout">
      <!-- Ambient background effects -->
      <div class="ambient-bg">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>

      <!-- Header Navigation -->
      <header class="navbar" [class.scrolled]="isScrolled()">
        <div class="navbar__brand" routerLink="/">
          <span class="brand__chip">AI</span>
          <span class="brand__name"><strong>API Lens</strong></span>
        </div>
        
        <nav class="navbar__links">
          <a href="#features">Features</a>
          <a href="#workflow">How It Works</a>
          <a routerLink="/history">History</a>
        </nav>
        
        <div class="navbar__actions">
          <button class="nav-btn-ghost" (click)="scrollToAuth('login')">Log In</button>
          <button class="nav-btn-primary" (click)="scrollToAuth('signup')">Sign Up</button>
        </div>
      </header>

      <main class="landing-content">
        <!-- Hero Section -->
        <section class="hero-section">
          <div class="hero__text reveal">
            <div class="badge-wrapper">
              <span class="badge glowing-badge">✨ Smarter Than Swagger</span>
            </div>
            <h1 class="hero__title">Build API docs that feel designed & intelligent.</h1>
            <p class="hero__subtitle">
              Transform OpenAPI and Postman files into interactive docs, visual flow graphs, and generated SDK snippets. Complete with AI-guided onboarding.
            </p>

            <div class="hero__stats">
              <div class="stat-item">
                <span class="stat-val">3</span>
                <span class="stat-label">SDK Outputs</span>
              </div>
              <div class="stat-item">
                <span class="stat-val">1-Click</span>
                <span class="stat-label">Spec Parsing</span>
              </div>
              <div class="stat-item">
                <span class="stat-val">Live</span>
                <span class="stat-label">Mock Testing</span>
              </div>
            </div>
          </div>

          <!-- Auth Card side -->
          <div class="hero__auth-wrapper reveal reveal--delay-1" id="auth-box">
            <div class="auth-card floating-card">
              <div class="auth-card__header">
                 <h2 class="auth-card__title">{{ isLoginMode() ? 'Welcome back' : 'Create an account' }}</h2>
                 <p class="auth-card__desc">
                   {{ isLoginMode() ? 'Log in to continue building your API documentation.' : 'Sign up to keep your generated docs securely in the cloud.' }}
                 </p>
              </div>

              <!-- Animated Toggle -->
              <div class="auth-toggle">
                <div class="auth-toggle__indicator" [class.is-signup]="!isLoginMode()"></div>
                <button type="button" [class.active]="isLoginMode()" (click)="switchMode('login')">Log In</button>
                <button type="button" [class.active]="!isLoginMode()" (click)="switchMode('signup')">Sign Up</button>
              </div>

              <div class="auth-body">
                <p class="config-warning" *ngIf="!auth.isConfigured()">
                  Supabase auth keys are missing. Set NG_APP_SUPABASE_URL and NG_APP_SUPABASE_ANON_KEY to enable login.
                </p>

                <form class="auth-form" (ngSubmit)="submitAuth()">
                  <div class="form-group signup-wrap" [class.show-signup]="!isLoginMode()">
                    <label>
                      Full Name
                      <input type="text" name="fullName" [(ngModel)]="fullName" placeholder="Jane Patel" [disabled]="isBusy()" />
                    </label>
                  </div>

                  <div class="form-group">
                    <label>
                      Email
                      <input type="email" name="email" [(ngModel)]="email" placeholder="you@company.com" autocomplete="email" [disabled]="isBusy()" required />
                    </label>
                  </div>

                  <div class="form-group">
                    <label>
                      Password
                      <input type="password" name="password" [(ngModel)]="password" placeholder="At least 8 characters" autocomplete="current-password" [disabled]="isBusy()" required minlength="8" />
                    </label>
                  </div>

                  <button type="submit" class="btn-submit" [disabled]="isBusy() || !auth.isConfigured()">
                    <span *ngIf="!isBusy()">{{ isLoginMode() ? 'Log In to API Lens' : 'Create Account' }}</span>
                    <span *ngIf="isBusy()" class="loader">Please wait...</span>
                  </button>
                </form>

                <div class="auth-divider"><span>or continue with</span></div>

                <button type="button" class="btn-google" (click)="signInWithGoogle()" [disabled]="isBusy() || !auth.isConfigured()">
                  <span aria-hidden="true" class="google-icon">G</span>
                  <span>Sign in with Google</span>
                </button>

                <div class="auth-feedback">
                  <p class="auth-message success" *ngIf="successMessage()">{{ successMessage() }}</p>
                  <p class="auth-message error" *ngIf="errorMessage()">{{ errorMessage() }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Features Showcase -->
        <section id="features" class="showcase-section">
          <div class="section-heading reveal">
            <h2>Visually structured, completely mapped.</h2>
            <p>Everything you need for a modern developer experience, generated instantly.</p>
          </div>
          
          <div class="showcase-grid">
            <article class="feature-card reveal reveal--delay-1">
              <div class="feature-card__content">
                <span class="feature-icon">📚</span>
                <h3>Real Structure</h3>
                <p>Auto-grouped endpoints with request schemas, auth details, and code snippets natively embedded.</p>
              </div>
              <div class="feature-card__visual">
                <img src="assets/landing/docs-ui-preview.svg" alt="Documentation viewer interface" />
              </div>
            </article>

            <article class="feature-card reveal reveal--delay-2">
              <div class="feature-card__content">
                <span class="feature-icon">🕸️</span>
                <h3>Visual Mapping</h3>
                <p>See endpoint connections, resource dependencies, and API hierarchies cleanly graphed.</p>
              </div>
              <div class="feature-card__visual">
                <img src="assets/landing/flow-ui-preview.svg" alt="API flow visualization interface" />
              </div>
            </article>
          </div>
        </section>

        <!-- Workflow Section -->
        <section id="workflow" class="workflow-section reveal">
          <div class="workflow-container floating-card">
            <h3>How Teams Operate</h3>
            <div class="workflow-steps">
              <div class="step-item">
                <div class="step-num">01</div>
                <h4>Upload Spec</h4>
                <p>Drop in a Postman collection or OpenAPI JSON/YAML file.</p>
              </div>
              <div class="step-divider"></div>
              <div class="step-item">
                <div class="step-num">02</div>
                <h4>Generate & AI Parse</h4>
                <p>Automatically extract endpoints, auth layers, and fix missing fields.</p>
              </div>
              <div class="step-divider"></div>
              <div class="step-item">
                <div class="step-num">03</div>
                <h4>Ship Better DX</h4>
                <p>Share interactive docs and test integrations against mock responses.</p>
              </div>
            </div>
          </div>
        </section>

        <footer class="app-footer">
           <p>&copy; {{ currentYear }} API Lens. Built for modern developer experience.</p>
        </footer>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        color: var(--text-primary);
        font-family: var(--font-sans);
      }
      
      .landing-layout {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow-x: hidden;
      }

      /* Glowing Ambient Background */
      .ambient-bg {
        position: fixed;
        inset: 0;
        z-index: -1;
        background: var(--surface);
        overflow: hidden;
        pointer-events: none;
      }
      .orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(140px);
        opacity: 0.6;
        animation: float 25s infinite ease-in-out alternate;
      }
      .orb-1 {
        top: -15%; left: -10%;
        width: 55vw; height: 55vw;
        background: color-mix(in srgb, var(--brand-primary) 35%, transparent);
      }
      .orb-2 {
        bottom: -20%; right: -10%;
        width: 65vw; height: 65vw;
        background: color-mix(in srgb, var(--brand-accent) 25%, transparent);
        animation-delay: -5s;
      }
      .orb-3 {
        top: 30%; left: 55%;
        width: 45vw; height: 45vw;
        background: color-mix(in srgb, #9d4edd 20%, transparent);
        animation-delay: -12s;
      }

      @keyframes float {
        0% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(8%, 12%) scale(1.05); }
        100% { transform: translate(-5%, -8%) scale(0.95); }
      }

      /* Glassy Header */
      .navbar {
        position: fixed;
        top: 0; left: 0; right: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.25rem 5%;
        z-index: 100;
        transition: all 0.3s ease;
        background: transparent;
      }
      .navbar.scrolled {
        background: color-mix(in srgb, var(--surface) 75%, transparent);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid var(--border-color);
        box-shadow: 0 4px 30px rgba(0,0,0,0.05);
        padding: 0.8rem 5%;
      }

      .navbar__brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;
        text-decoration: none;
      }
      .brand__chip {
        background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent));
        color: #051724;
        font-weight: 800;
        font-size: 0.8rem;
        padding: 0.25rem 0.65rem;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .brand__name {
        font-size: 1.25rem;
        letter-spacing: -0.02em;
        color: var(--text-primary);
      }

      .navbar__links {
        display: flex;
        gap: 2.5rem;
      }
      .navbar__links a {
        text-decoration: none;
        font-weight: 500;
        color: var(--text-secondary);
        transition: color 0.2s ease;
        font-size: 0.95rem;
      }
      .navbar__links a:hover {
        color: var(--text-primary);
      }

      .navbar__actions {
        display: flex;
        gap: 1rem;
        align-items: center;
      }
      .nav-btn-ghost {
        background: transparent;
        border: none;
        color: var(--text-primary);
        font-weight: 600;
        cursor: pointer;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        transition: background 0.2s ease;
        font-size: 0.95rem;
      }
      .nav-btn-ghost:hover {
        background: color-mix(in srgb, var(--text-primary) 8%, transparent);
      }
      .nav-btn-primary {
        background: var(--text-primary);
        color: var(--surface);
        border: none;
        padding: 0.55rem 1.25rem;
        font-weight: 600;
        font-size: 0.95rem;
        border-radius: 8px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .nav-btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.15);
      }

      /* Content Container */
      .landing-content {
        padding-top: 7rem;
        display: flex;
        flex-direction: column;
        gap: 7rem;
        width: 100%;
        max-width: 1280px;
        margin: 0 auto;
      }

      /* Hero Section */
      .hero-section {
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: 5rem;
        align-items: center;
        padding: 2rem 5%;
      }

      .badge-wrapper {
        margin-bottom: 1.5rem;
      }
      .glowing-badge {
        font-size: 0.85rem;
        padding: 0.45rem 1.1rem;
        background: color-mix(in srgb, var(--brand-accent) 15%, transparent);
        border: 1px solid color-mix(in srgb, var(--brand-accent) 30%, transparent);
        color: color-mix(in srgb, var(--brand-accent) 90%, #fff);
        border-radius: 99px;
        display: inline-flex;
        align-items: center;
        box-shadow: 0 0 20px color-mix(in srgb, var(--brand-accent) 20%, transparent);
        font-weight: 500;
      }

      .hero__title {
        font-size: clamp(2.5rem, 4.5vw, 4.2rem);
        line-height: 1.1;
        letter-spacing: -0.03em;
        margin: 0 0 1.5rem;
        font-weight: 700;
      }
      
      .hero__subtitle {
        font-size: 1.15rem;
        line-height: 1.6;
        color: var(--text-secondary);
        margin-bottom: 3rem;
        max-width: 90%;
      }

      .hero__stats {
        display: flex;
        gap: 3rem;
        padding-top: 1.5rem;
        border-top: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
      }
      .stat-item {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .stat-val {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--brand-primary);
        line-height: 1;
      }
      .stat-label {
        font-size: 0.85rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 500;
      }

      /* Floating Auth Card */
      .hero__auth-wrapper {
        position: relative;
      }
      .floating-card {
        background: color-mix(in srgb, var(--panel-bg) 65%, transparent);
        backdrop-filter: blur(24px);
        border: 1px solid color-mix(in srgb, var(--border-color) 80%, transparent);
        border-radius: 1.5rem;
        padding: 2.5rem;
        box-shadow: 
          0 24px 64px max(rgba(0,0,0,0.1), color-mix(in srgb, var(--brand-primary) 8%, transparent)),
          inset 0 1px 0 color-mix(in srgb, var(--surface-elevated) 40%, transparent);
      }

      .auth-card__header {
        margin-bottom: 2rem;
      }
      .auth-card__title {
        font-size: 1.75rem;
        margin: 0 0 0.5rem;
        font-weight: 600;
      }
      .auth-card__desc {
        color: var(--text-secondary);
        font-size: 1rem;
        margin: 0;
        line-height: 1.5;
      }

      /* Switch Toggle */
      .auth-toggle {
        display: flex;
        position: relative;
        background: color-mix(in srgb, var(--surface) 80%, transparent);
        border-radius: 10px;
        padding: 0.35rem;
        margin-bottom: 2rem;
        border: 1px solid var(--border-color);
      }
      .auth-toggle button {
        flex: 1;
        padding: 0.75rem;
        border: none;
        background: transparent;
        font-weight: 600;
        color: var(--text-secondary);
        cursor: pointer;
        position: relative;
        z-index: 2;
        transition: color 0.3s ease;
        font-size: 0.95rem;
      }
      .auth-toggle button.active {
        color: var(--text-primary);
      }
      .auth-toggle__indicator {
        position: absolute;
        top: 0.35rem; left: 0.35rem; bottom: 0.35rem;
        width: calc(50% - 0.35rem);
        background: var(--panel-bg);
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        z-index: 1;
        transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .auth-toggle__indicator.is-signup {
        transform: translateX(100%);
      }

      /* Fancy Forms */
      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      
      .signup-wrap {
        display: grid;
        grid-template-rows: 0fr;
        opacity: 0;
        transition: grid-template-rows 0.4s ease, opacity 0.4s ease;
        margin-bottom: -1.25rem; /* collapse gap */
      }
      .signup-wrap.show-signup {
        grid-template-rows: 1fr;
        opacity: 1;
        margin-bottom: 0;
      }
      .signup-wrap > label {
        overflow: hidden;
      }

      .form-group label {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--text-secondary);
      }
      .form-group input {
        background: color-mix(in srgb, var(--surface) 60%, var(--panel-bg));
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 0.85rem 1rem;
        font-size: 1rem;
        color: var(--text-primary);
        transition: all 0.2s ease;
      }
      .form-group input:focus {
        outline: none;
        border-color: var(--brand-primary);
        background: var(--panel-bg);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--brand-primary) 12%, transparent);
      }

      .btn-submit {
        margin-top: 0.5rem;
        background: linear-gradient(135deg, var(--brand-primary), color-mix(in srgb, var(--brand-accent) 40%, var(--brand-primary)));
        color: #041722;
        border: none;
        border-radius: 10px;
        padding: 0.95rem;
        font-weight: 700;
        font-size: 1.05rem;
        cursor: pointer;
        box-shadow: 0 6px 20px color-mix(in srgb, var(--brand-primary) 25%, transparent);
        transition: all 0.2s ease;
      }
      .btn-submit:hover:not([disabled]) {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px color-mix(in srgb, var(--brand-primary) 35%, transparent);
      }
      .btn-submit[disabled] {
        opacity: 0.65;
        cursor: not-allowed;
      }

      .auth-divider {
        display: flex;
        align-items: center;
        margin: 1.75rem 0;
        color: var(--text-muted);
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .auth-divider::before, .auth-divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: color-mix(in srgb, var(--border-color) 70%, transparent);
      }
      .auth-divider span {
        padding: 0 1rem;
      }

      .btn-google {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        width: 100%;
        background: var(--panel-bg);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 0.8rem;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: background 0.2s;
      }
      .btn-google:hover:not([disabled]) {
        background: color-mix(in srgb, var(--text-primary) 4%, var(--panel-bg));
      }
      .google-icon {
        background: linear-gradient(145deg, #ffffff, #f6d6bb);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        color: #1f2937;
        font-weight: 900;
        font-size: 0.9rem;
      }

      .auth-feedback { margin-top: 1rem; }
      .auth-message {
        padding: 0.75rem;
        border-radius: 8px;
        font-size: 0.9rem;
        margin: 0;
        text-align: center;
        font-weight: 500;
      }
      .auth-message.error {
        background: color-mix(in srgb, #ef4444 15%, transparent);
        color: color-mix(in srgb, #ef4444 95%, var(--text-primary));
        border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
      }
      .auth-message.success {
        background: color-mix(in srgb, #10b981 15%, transparent);
        color: color-mix(in srgb, #10b981 95%, var(--text-primary));
        border: 1px solid color-mix(in srgb, #10b981 30%, transparent);
      }

      .config-warning {
        background: color-mix(in srgb, #f59e0b 15%, transparent);
        color: color-mix(in srgb, #f59e0b 95%, var(--text-primary));
        padding: 0.85rem;
        border-radius: 8px;
        font-size: 0.9rem;
        margin-bottom: 1.5rem;
        border: 1px solid color-mix(in srgb, #f59e0b 35%, transparent);
      }

      /* Sections & Cards */
      .section-heading {
        text-align: center;
        max-width: 600px;
        margin: 0 auto 4rem;
      }
      .section-heading h2 {
        font-size: 2.5rem;
        margin: 0 0 1rem;
        font-weight: 700;
      }
      .section-heading p {
        color: var(--text-secondary);
        font-size: 1.15rem;
        margin: 0;
      }

      .showcase-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2.5rem;
        padding: 0 5%;
      }
      .feature-card {
        background: linear-gradient(160deg, color-mix(in srgb, var(--panel-bg) 95%, transparent), var(--panel-bg));
        border: 1px solid var(--border-color);
        border-radius: 1.5rem;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: var(--shadow-soft);
        transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
      }
      .feature-card:hover {
        transform: translateY(-5px);
        box-shadow: var(--shadow-medium);
        border-color: color-mix(in srgb, var(--brand-primary) 35%, var(--border-color));
      }
      .feature-card__content {
        padding: 2.5rem 2.5rem 1.5rem;
      }
      .feature-icon {
        font-size: 2.5rem;
        margin-bottom: 1.25rem;
        display: inline-block;
      }
      .feature-card h3 {
        font-size: 1.65rem;
        margin: 0 0 0.85rem;
      }
      .feature-card p {
        color: var(--text-secondary);
        line-height: 1.6;
        margin: 0;
        font-size: 1.05rem;
      }
      .feature-card__visual {
        background: color-mix(in srgb, var(--surface) 60%, var(--panel-bg));
        padding: 2rem;
        margin-top: auto;
        border-top: 1px solid color-mix(in srgb, var(--border-color) 60%, transparent);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .feature-card__visual img {
        width: 100%;
        border-radius: 10px;
        box-shadow: var(--shadow-soft);
        border: 1px solid var(--border-color);
      }

      /* Workflow Block */
      .workflow-section {
        padding: 2rem 5% 5rem;
      }
      .workflow-container {
        padding: 4rem 3rem;
        text-align: center;
        background: linear-gradient(145deg, color-mix(in srgb, var(--panel-bg) 80%, transparent), color-mix(in srgb, var(--surface) 40%, transparent));
      }
      .workflow-container h3 {
        font-size: 2.25rem;
        margin: 0 0 3.5rem;
      }
      .workflow-steps {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1.5rem;
      }
      .step-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.25rem;
      }
      .step-num {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
        color: var(--brand-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.35rem;
        font-weight: 800;
        border: 2px solid color-mix(in srgb, var(--brand-primary) 35%, transparent);
        position: relative;
        z-index: 2;
      }
      .step-divider {
        flex: 1;
        height: 2px;
        background: linear-gradient(90deg, color-mix(in srgb, var(--brand-primary) 35%, transparent), color-mix(in srgb, var(--brand-primary) 5%, transparent));
        margin-top: 28px;
        max-width: 80px;
      }
      .step-item h4 {
        font-size: 1.25rem;
        margin: 0;
      }
      .step-item p {
        color: var(--text-secondary);
        margin: 0;
        font-size: 1rem;
        max-width: 250px;
        line-height: 1.5;
      }

      .app-footer {
        text-align: center;
        padding: 3rem 5%;
        border-top: 1px solid var(--border-color);
        color: var(--text-muted);
        margin-top: auto;
      }

      .reveal { animation: reveal-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
      .reveal--delay-1 { animation-delay: 0.15s; }
      .reveal--delay-2 { animation-delay: 0.3s; }

      @keyframes reveal-up {
        from { opacity: 0; transform: translateY(40px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (max-width: 1024px) {
        .hero-section {
          grid-template-columns: 1fr;
          text-align: center;
        }
        .hero__title {
          margin: 0 auto 1.5rem;
        }
        .hero__subtitle { margin: 0 auto 3rem; }
        .hero__stats { justify-content: center; }
        .showcase-grid { grid-template-columns: 1fr; }
        .navbar__links { display: none; }
      }
      @media (max-width: 768px) {
        .workflow-steps {
          flex-direction: column;
          align-items: center;
          gap: 3rem;
        }
        .step-divider { display: none; }
      }
      @media (max-width: 600px) {
        .hero__title { font-size: 2.25rem; }
        .hero__stats {
          flex-direction: column;
          align-items: center;
          gap: 2rem;
        }
        .floating-card { padding: 1.5rem; }
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
  readonly isScrolled = signal(false);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isLoginMode = computed(() => this.mode() === 'login');
  
  currentYear = new Date().getFullYear();

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

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => {
        this.isScrolled.set(window.scrollY > 20);
      });
    }
  }

  scrollToAuth(mode: 'login' | 'signup') {
    this.switchMode(mode);
    const element = document.getElementById('auth-box');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
