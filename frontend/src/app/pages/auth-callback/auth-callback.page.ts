import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-callback-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="auth-callback card">
      <h2>Completing sign in...</h2>
      <p>Please wait while we finalize your authentication.</p>
    </section>
  `,
  styles: [
    `
      :host {
        align-items: center;
        display: grid;
        min-height: 100vh;
        padding: 1.2rem;
        place-items: center;
      }

      .auth-callback {
        max-width: 30rem;
        padding: 1.2rem;
        text-align: center;
        width: min(100%, 30rem);
      }

      .auth-callback h2 {
        margin: 0;
      }

      .auth-callback p {
        color: var(--text-secondary);
        margin: 0.55rem 0 0;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthCallbackPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    void this.completeSignIn();
  }

  private async completeSignIn(): Promise<void> {
    await this.auth.ensureInitialized();
    await this.auth.getAccessToken();

    if (this.auth.user()) {
      await this.router.navigateByUrl('/dashboard');
      return;
    }

    await this.router.navigateByUrl('/?auth=failed');
  }
}
