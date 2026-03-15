import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'ai-api-doc-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>('dark');

  initialize(): void {
    const persisted = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const nextTheme = persisted || preferred;

    this.mode.set(nextTheme);
    this.applyTheme(nextTheme);
  }

  toggleTheme(): void {
    const nextTheme: ThemeMode = this.mode() === 'dark' ? 'light' : 'dark';
    this.mode.set(nextTheme);
    this.applyTheme(nextTheme);
    localStorage.setItem(STORAGE_KEY, nextTheme);
  }

  private applyTheme(theme: ThemeMode): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
