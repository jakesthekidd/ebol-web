import { Injectable, signal, computed } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase/client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _session = signal<Session | null>(null);

  readonly session = this._session.asReadonly();
  readonly user = computed<User | null>(() => this._session()?.user ?? null);
  readonly isLoggedIn = computed(() => this._session() !== null);

  /** Call once at app startup via APP_INITIALIZER */
  async initialize(): Promise<void> {
    const { data } = await supabase.auth.getSession();
    this._session.set(data.session);

    supabase.auth.onAuthStateChange((_event, session) => {
      this._session.set(session);
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  get uid(): string | null {
    return this._session()?.user?.id ?? null;
  }
}
