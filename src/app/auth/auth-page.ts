
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';

import {
  alertCircleOutline,
  arrowForwardOutline,
  checkmarkCircleOutline,
  eyeOffOutline,
  eyeOutline,
  lockClosedOutline,
  mailOutline,
  personOutline,
  scanOutline,
  schoolOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';

import { AuthService } from '../services/auth.service';
import { RegistrationDraftService } from '../services/registration-draft.service';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon
  ],
  templateUrl: './auth-page.html',
  styleUrls: ['./auth-page.scss'],
  styles: [`
    .registration-loading {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 15px;
      padding: 26px;
      background: rgba(9, 28, 49, .93);
      color: white;
      text-align: center;
    }

    .registration-loading .loader {
      width: 53px;
      height: 53px;
      border: 4px solid #d7eaff55;
      border-top-color: #43e4a3;
      border-radius: 50%;
      animation: auth-spin .85s linear infinite;
    }

    .registration-loading h3 {
      margin: 0;
      font-size: 20px;
    }

    .registration-loading p {
      margin: 0;
      color: #d0e1ef;
      font-size: 13px;
    }

    @keyframes auth-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class AuthPage {

  mode: AuthMode = 'login';

  firstName = '';
  email = '';
  password = '';
  confirmPassword = '';

  showPassword = false;
  loading = false;

  feedback = '';
  feedbackType: 'success' | 'error' = 'error';

  readonly passwordRequirements = [
    {
      label: 'At least 8 characters',
      test: (p: string) => p.length >= 8
    },
    {
      label: 'One uppercase letter (A-Z)',
      test: (p: string) => /[A-Z]/.test(p)
    },
    {
      label: 'One lowercase letter (a-z)',
      test: (p: string) => /[a-z]/.test(p)
    },
    {
      label: 'One number (0-9)',
      test: (p: string) => /[0-9]/.test(p)
    },
    {
      label: 'One special character (!@#$%)',
      test: (p: string) => /[^A-Za-z0-9\s]/.test(p)
    }
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly drafts: RegistrationDraftService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {
    addIcons({
      shieldCheckmarkOutline,
      mailOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline,
      arrowForwardOutline,
      schoolOutline,
      scanOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      personOutline
    });
  }

  private refreshUI(): void {
    this.cdr.markForCheck();
  }

  get firstNameError(): string {
    const n = this.firstName.trim();

    if (!n) {
      return 'First Name is required.';
    }

    if (n.length < 2) {
      return 'First Name must have at least 2 characters.';
    }

    if (n.length > 50) {
      return 'First Name must not exceed 50 characters.';
    }

    if (/\p{N}/u.test(n)) {
      return 'Numbers are not allowed in First Name.';
    }

    if (
      !/^[\p{L}\p{M}]+(?:[ .'\u2019-][\p{L}\p{M}]+)*\.?$/u.test(n)
    ) {
      return (
        'Use letters only, with spaces, ' +
        'hyphens or apostrophes when needed.'
      );
    }

    return '';
  }

  get isFirstNameValid(): boolean {
    return !this.firstNameError;
  }

  get isPasswordStrong(): boolean {
    return this.passwordRequirements.every(
      rule => rule.test(this.password)
    );
  }

  get doPasswordsMatch(): boolean {
    return (
      this.confirmPassword.length > 0 &&
      this.password === this.confirmPassword
    );
  }

  setMode(mode: AuthMode): void {
    if (this.loading) {
      return;
    }

    this.mode = mode;
    this.firstName = '';
    this.password = '';
    this.confirmPassword = '';
    this.showPassword = false;
    this.feedback = '';

    this.refreshUI();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
    this.refreshUI();
  }

  private setFeedback(
    message: string,
    type: 'success' | 'error'
  ): void {
    this.feedback = message;
    this.feedbackType = type;
    this.refreshUI();
  }

  private async withTimeout<T>(
    promise: Promise<T>
  ): Promise<T> {
    let id: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          id = setTimeout(() => {
            reject(
              new Error(
                'The server is taking too long. ' +
                'Please check your internet connection.'
              )
            );
          }, 25000);
        })
      ]);
    } finally {
      if (id !== undefined) {
        clearTimeout(id);
      }
    }
  }

  private validateForm(): boolean {

    if (
      this.mode === 'register' &&
      !this.isFirstNameValid
    ) {
      this.setFeedback(
        this.firstNameError,
        'error'
      );
      return false;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        this.email.trim()
      )
    ) {
      this.setFeedback(
        'Please enter a valid email address.',
        'error'
      );
      return false;
    }

    if (!this.password) {
      this.setFeedback(
        'Please enter your password.',
        'error'
      );
      return false;
    }

    if (this.mode === 'register') {

      if (!this.isPasswordStrong) {
        this.setFeedback(
          'Your password does not meet all the requirements.',
          'error'
        );
        return false;
      }

      if (!this.doPasswordsMatch) {
        this.setFeedback(
          'Passwords do not match.',
          'error'
        );
        return false;
      }
    }

    return true;
  }

  async submit(): Promise<void> {

    if (this.loading) {
      return;
    }

    this.feedback = '';

    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.refreshUI();

    const email =
      this.email.trim().toLowerCase();

    try {

      if (this.mode === 'register') {

        // The account is not created yet.
        // Scan and review the ID first.
        // Credentials remain in app memory,
        // not localStorage or URL parameters.

        this.drafts.set({
          firstName: this.firstName.trim(),
          email,
          password: this.password
        });

        this.password = '';
        this.confirmPassword = '';

        const navigated =
          await this.router.navigateByUrl(
            '/register-scan'
          );

        if (!navigated) {
          throw new Error(
            'Unable to open the registration scanner.'
          );
        }

        return;
      }

      // LOGIN:
      // The scanner does not open during login.

      const { error } =
        await this.withTimeout(
          this.authService.login(
            email,
            this.password
          )
        );

      if (error) {
        throw error;
      }

      const user =
        await this.withTimeout(
          this.authService.getCurrentUser()
        );

      if (!user) {
        throw new Error(
          'Unable to retrieve your account.'
        );
      }

      // Only accounts with completed
      // required screening may continue.

      const screened =
        await this.withTimeout(
          this.authService.hasRecognizedSchoolId(
            user.id
          )
        );

      if (!screened) {

        await this.authService.logout();

        throw new Error(
          'Your account does not have completed ID screening. ' +
          'Contact the FindBack administrator.'
        );
      }

      // Direct Dashboard navigation.

      const navigated =
        await this.router.navigateByUrl(
          '/home',
          {
            replaceUrl: true
          }
        );

      if (!navigated) {
        throw new Error(
          'Unable to open the Dashboard.'
        );
      }

    } catch (error: unknown) {

      // Do not log passwords or private ID data.
      this.drafts.clear();

      this.setFeedback(
        error instanceof Error
          ? error.message
          : 'Unable to continue. Please try again.',
        'error'
      );

    } finally {

      this.loading = false;
      this.refreshUI();
    }
  }
}
