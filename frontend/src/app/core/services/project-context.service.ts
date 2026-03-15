import { Injectable, effect, inject, signal } from '@angular/core';

import { AuthService } from './auth.service';

const ACTIVE_PROJECT_KEY_PREFIX = 'active-project-id';

@Injectable({ providedIn: 'root' })
export class ProjectContextService {
  private readonly auth = inject(AuthService);

  readonly activeProjectId = signal<string | null>(null);

  constructor() {
    effect(
      () => {
        const userId = this.auth.user()?.id || 'guest';
        this.activeProjectId.set(this.readStoredProject(userId));
      },
      {
        allowSignalWrites: true
      }
    );
  }

  setActiveProject(projectId: string | null): void {
    const userId = this.auth.user()?.id || 'guest';
    const storageKey = this.storageKey(userId);

    this.activeProjectId.set(projectId);

    if (projectId) {
      localStorage.setItem(storageKey, projectId);
      return;
    }

    localStorage.removeItem(storageKey);
  }

  private readStoredProject(userId: string): string | null {
    return localStorage.getItem(this.storageKey(userId));
  }

  private storageKey(userId: string): string {
    return `${ACTIVE_PROJECT_KEY_PREFIX}:${userId}`;
  }
}
