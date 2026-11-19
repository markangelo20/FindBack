
import { Injectable } from '@angular/core';

export interface RegistrationDraft {
  firstName: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class RegistrationDraftService {

  // Temporary registration data in memory only.
  // Never place passwords in URL parameters
  // or localStorage.

  private draft: RegistrationDraft | null = null;

  set(data: RegistrationDraft): void {
    this.draft = {
      ...data
    };
  }

  get(): RegistrationDraft | null {
    return this.draft;
  }

  clear(): void {
    this.draft = null;
  }
}
