import { Injectable, signal } from '@angular/core';
import { AuthError, Session, SupabaseClient, User, createClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';

export interface SignUpResult {
  requiresEmailVerification: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isConfigured = signal(Boolean(environment.supabaseUrl && environment.supabaseAnonKey));
  readonly isLoading = signal(true);
  readonly session = signal<Session | null>(null);
  readonly user = signal<User | null>(null);

  private readonly supabase: SupabaseClient | null = this.isConfigured()
    ? createClient(environment.supabaseUrl, environment.supabaseAnonKey)
    : null;

  private readonly initialized = this.initialize();

  private async initialize(): Promise<void> {
    if (!this.supabase) {
      this.isLoading.set(false);
      return;
    }

    const { data, error } = await this.supabase.auth.getSession();
    if (error) {
      this.applySession(null);
    } else {
      this.applySession(data.session);
    }

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.applySession(session);
    });

    this.isLoading.set(false);
  }

  async ensureInitialized(): Promise<void> {
    await this.initialized;
  }

  async signUp(email: string, password: string, fullName: string): Promise<SignUpResult> {
    const client = this.getClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    this.assertNoAuthError(error);

    if (data.session) {
      this.applySession(data.session);
    }

    return {
      requiresEmailVerification: !data.session
    };
  }

  async signIn(email: string, password: string): Promise<void> {
    const client = this.getClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    this.assertNoAuthError(error);
    this.applySession(data.session);
  }

  async signInWithGoogle(): Promise<void> {
    const client = this.getClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo
      }
    });

    this.assertNoAuthError(error);
  }

  async signOut(): Promise<void> {
    if (!this.supabase) {
      this.applySession(null);
      return;
    }

    const { error } = await this.supabase.auth.signOut();
    this.assertNoAuthError(error);
    this.applySession(null);
  }

  async getAccessToken(): Promise<string | null> {
    await this.ensureInitialized();

    if (!this.supabase) {
      return null;
    }

    const currentSession = this.session();
    if (currentSession?.access_token) {
      return currentSession.access_token;
    }

    const { data, error } = await this.supabase.auth.getSession();
    if (error) {
      return null;
    }

    this.applySession(data.session);
    return data.session?.access_token || null;
  }

  private getClient(): SupabaseClient {
    if (!this.supabase) {
      throw new Error(
        'Supabase auth is not configured. Set NG_APP_SUPABASE_URL and NG_APP_SUPABASE_ANON_KEY.'
      );
    }

    return this.supabase;
  }

  private applySession(session: Session | null): void {
    this.session.set(session);
    this.user.set(session?.user || null);
  }

  private assertNoAuthError(error: AuthError | null): asserts error is null {
    if (error) {
      throw new Error(error.message);
    }
  }
}
