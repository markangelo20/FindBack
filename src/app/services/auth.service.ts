
import { Injectable } from '@angular/core';

import {
  createClient,
  SupabaseClient,
  User
} from '@supabase/supabase-js';

// FINDBACK SUPABASE CONFIGURATION
// Keep your actual project URL and publishable key.

const SUPABASE_URL =
  'https://gsbihmcktiiljtzfeanp.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_eaZmox1CqkzulTJc-WUaGg_mwuH14Dz';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  readonly client: SupabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  // REGISTER

  async register(email: string, password: string) {
    return await this.client.auth.signUp({
      email: email.trim().toLowerCase(),
      password
    });
  }

  // LOGIN

  async login(email: string, password: string) {
    return await this.client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });
  }

  // GET LOGGED-IN USER

  async getCurrentUser(): Promise<User | null> {
    const { data, error } =
      await this.client.auth.getUser();

    if (error) {
      return null;
    }

    return data.user;
  }

  // CHECK SCHOOL ID STATUS

  async hasRecognizedSchoolId(
    userId: string
  ): Promise<boolean> {

    const { data, error } = await this.client
      .from('student_profiles')
      .select('verification_status')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return data.verification_status ===
      'id_recognized';
  }

  // LOGOUT

  async logout() {
    return await this.client.auth.signOut();
  }
}
