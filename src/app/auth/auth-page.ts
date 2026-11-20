
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';

import {
  alertCircleOutline,
  arrowBackOutline,
  arrowForwardOutline,
  checkmarkCircleOutline,
  eyeOffOutline,
  eyeOutline,
  keyOutline,
  lockClosedOutline,
  mailOutline,
  personOutline,
  scanOutline,
  schoolOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';

import { AuthService } from '../services/auth.service';
import {
  RegistrationDraftService
} from '../services/registration-draft.service';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';
type FeedbackType = 'success' | 'error';

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

    .recovery-link {
      display: block;
      margin: 0 0 15px auto;
      padding: 7px 2px;
      background: transparent;
      border: none;
      color: #1769d2;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .recovery-link:hover {
      text-decoration: underline;
    }

    .recovery-back {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 17px;
      padding: 8px 2px;
      background: transparent;
      border: none;
      color: #1769d2;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .recovery-back ion-icon {
      font-size: 18px;
    }

    .recovery-notice {
      padding: 15px;
      margin-bottom: 18px;
      border-radius: 13px;
      background: #edf6ff;
      border: 1px solid #d6e8f7;
      color: #456b85;
      font-size: 13px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .recovery-notice strong {
      display: block;
      color: #183e5b;
      margin: 5px 0;
    }

    .recovery-notice p {
      margin-bottom: 0;
    }

    .recovery-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 12px;
    }

    .recovery-actions .recovery-link {
      margin: 0;
      font-size: 12px;
    }

    .recovery-help {
      margin: 0 0 15px;
      color: #8193a6;
      font-size: 12px;
      line-height: 1.7;
    }

    .otp-verified-box {
      padding: 17px;
      margin-bottom: 22px;
      background: #e9f9f1;
      border: 1px solid #bde9d2;
      border-radius: 14px;
      text-align: center;
      color: #148f62;
      animation: recovery-appear .35s ease;
    }

    .otp-verified-box ion-icon {
      display: block;
      margin: 0 auto 8px;
      font-size: 36px;
    }

    .otp-verified-box strong {
      display: block;
      margin-bottom: 7px;
      font-size: 15px;
    }

    .otp-verified-box p {
      margin: 0;
      font-size: 12px;
      line-height: 1.6;
    }

    .recovery-link:disabled,
    .recovery-back:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    @keyframes auth-spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes recovery-appear {
      from {
        opacity: 0;
        transform: translateY(10px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
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

  recoveryCode = '';
  newPassword = '';
  confirmNewPassword = '';

  // OTP is 8 digits in this Supabase project.
  readonly recoveryCodeLength = 8;

  // Only true after successful Supabase OTP verification.
  recoveryVerified = false;

  showPassword = false;
  showNewPassword = false;
  loading = false;

  feedback = '';
  feedbackType: FeedbackType = 'error';

  readonly passwordRequirements = [
    {
      label: 'At least 8 characters',
      test: (p: string): boolean => p.length >= 8
    },
    {
      label: 'One uppercase letter (A-Z)',
      test: (p: string): boolean => /[A-Z]/.test(p)
    },
    {
      label: 'One lowercase letter (a-z)',
      test: (p: string): boolean => /[a-z]/.test(p)
    },
    {
      label: 'One number (0-9)',
      test: (p: string): boolean => /[0-9]/.test(p)
    },
    {
      label: 'One special character (!@#$%)',
      test: (p: string): boolean =>
        /[^A-Za-z0-9\s]/.test(p)
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
      arrowBackOutline,
      schoolOutline,
      scanOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      personOutline,
      keyOutline
    });
  }

  private refreshUI(): void {
    this.cdr.markForCheck();
  }

  get headingTitle(): string {
    switch (this.mode) {
      case 'register':
        return 'Create an account';
      case 'forgot':
        return 'Forgot Password?';
      case 'reset':
        return this.recoveryVerified
          ? 'Create New Password'
          : 'Verify Your Email';
      default:
        return 'Welcome back!';
    }
  }

  get headingDescription(): string {
    switch (this.mode) {
      case 'register':
        return 'Create your account with one-time School ID screening.';
      case 'forgot':
        return 'Enter your registered email address to receive a password reset code.';
      case 'reset':
        return this.recoveryVerified
          ? 'Email verified successfully. Create a new password for your account.'
          : 'Enter the 8-digit verification code sent to your email.';
      default:
        return 'Sign in to your FindBack account to continue.';
    }
  }

  get submitLabel(): string {
    if (this.loading) {
      return 'Please wait...';
    }

    switch (this.mode) {
      case 'register':
        return 'Create Account';
      case 'forgot':
        return 'Send Reset Code';
      case 'reset':
        return this.recoveryVerified
          ? 'Update Password'
          : 'Verify Code';
      default:
        return 'Login to FindBack';
    }
  }

  get firstNameError(): string {
    const name = this.firstName.trim();

    if (!name) {
      return 'First Name is required.';
    }

    if (name.length < 2) {
      return 'First Name must have at least 2 characters.';
    }

    if (name.length > 50) {
      return 'First Name must not exceed 50 characters.';
    }

    if (/\p{N}/u.test(name)) {
      return 'Numbers are not allowed in First Name.';
    }

    if (
      !/^[\p{L}\p{M}]+(?:[ .'\u2019-][\p{L}\p{M}]+)*\.?$/u.test(name)
    ) {
      return 'Use letters only, with spaces, hyphens or apostrophes when needed.';
    }

    return '';
  }

  get isFirstNameValid(): boolean {
    return this.firstNameError === '';
  }

  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      this.email.trim()
    );
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

  get isNewPasswordStrong(): boolean {
    return this.passwordRequirements.every(
      rule => rule.test(this.newPassword)
    );
  }

  get doNewPasswordsMatch(): boolean {
    return (
      this.confirmNewPassword.length > 0 &&
      this.newPassword === this.confirmNewPassword
    );
  }

  // Validate the entire 8-digit OTP.
  get isRecoveryCodeValid(): boolean {
    return new RegExp(
      `^\\d{${this.recoveryCodeLength}}$`
    ).test(this.recoveryCode.trim());
  }

  setMode(mode: 'login' | 'register'): void {
    if (this.loading) return;

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

  toggleNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
    this.refreshUI();
  }

  openForgotPassword(): void {
    if (this.loading) return;

    this.mode = 'forgot';

    this.password = '';
    this.confirmPassword = '';
    this.recoveryCode = '';
    this.newPassword = '';
    this.confirmNewPassword = '';

    this.recoveryVerified = false;
    this.showNewPassword = false;
    this.feedback = '';

    this.refreshUI();
  }

  async backToLogin(): Promise<void> {
    if (this.loading) return;

    if (this.recoveryVerified) {
      this.loading = true;
      this.refreshUI();

      try {
        const { error } = await this.withTimeout(
          this.authService.client.auth.signOut({
            scope: 'local'
          })
        );

        if (error) throw error;

      } catch (error: unknown) {
        this.setFeedback(this.errorText(error), 'error');
        return;
      } finally {
        this.loading = false;
        this.refreshUI();
      }
    }

    this.recoveryVerified = false;
    this.recoveryCode = '';
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.password = '';

    this.mode = 'login';
    this.feedback = '';

    this.refreshUI();
  }

  async changeRecoveryEmail(): Promise<void> {
    if (this.loading) return;

    await this.backToLogin();

    if (this.mode === 'login') {
      this.openForgotPassword();
    }
  }

  private setFeedback(
    message: string,
    type: FeedbackType
  ): void {
    this.feedback = message;
    this.feedbackType = type;
    this.refreshUI();
  }

  private errorText(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'Unable to continue. Please try again.';
  }

  private async withTimeout<T>(
    promise: PromiseLike<T>
  ): Promise<T> {
    let timeoutId:
      ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        Promise.resolve(promise),

        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(
              new Error(
                'The server is taking too long. Please check your internet connection.'
              )
            );
          }, 25000);
        })
      ]);

    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  private validateForm(): boolean {
    if (
      this.mode === 'register' &&
      !this.isFirstNameValid
    ) {
      this.setFeedback(this.firstNameError, 'error');
      return false;
    }

    if (!this.isEmailValid) {
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
    if (this.loading) return;

    this.feedback = '';

    if (this.mode === 'forgot') {
      await this.sendRecoveryCode();
      return;
    }

    if (this.mode === 'reset') {
      if (!this.recoveryVerified) {
        await this.verifyRecoveryCode();
      } else {
        await this.resetPassword();
      }
      return;
    }

    if (!this.validateForm()) return;

    this.loading = true;
    this.refreshUI();

    const email = this.email.trim().toLowerCase();

    try {
      if (this.mode === 'register') {
        this.drafts.clear();

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

      const { error } = await this.withTimeout(
        this.authService.login(email, this.password)
      );

      if (error) throw error;

      const user = await this.withTimeout(
        this.authService.getCurrentUser()
      );

      if (!user) {
        throw new Error(
          'Unable to retrieve your account.'
        );
      }

      const screened = await this.withTimeout(
        this.authService.hasRecognizedSchoolId(user.id)
      );

      if (!screened) {
        await this.authService.logout();

        throw new Error(
          'Your account does not have completed ID screening. Contact the FindBack administrator.'
        );
      }

      const navigated =
        await this.router.navigateByUrl(
          '/home',
          { replaceUrl: true }
        );

      if (!navigated) {
        throw new Error(
          'Unable to open the Dashboard.'
        );
      }

    } catch (error: unknown) {
      this.drafts.clear();

      this.setFeedback(
        this.errorText(error),
        'error'
      );

    } finally {
      this.loading = false;
      this.refreshUI();
    }
  }

  // =====================================
  // STEP 1: SEND RESET CODE
  // =====================================

  async sendRecoveryCode(): Promise<void> {
    if (this.loading) return;

    if (!this.isEmailValid) {
      this.setFeedback(
        'Please enter a valid email address.',
        'error'
      );
      return;
    }

    this.loading = true;
    this.feedback = '';
    this.refreshUI();

    try {
      const email = this.email.trim().toLowerCase();

      const { error } = await this.withTimeout(
        this.authService.client.auth
          .resetPasswordForEmail(email)
      );

      if (error) throw error;

      this.email = email;
      this.recoveryCode = '';
      this.recoveryVerified = false;

      this.newPassword = '';
      this.confirmNewPassword = '';

      this.mode = 'reset';

      this.setFeedback(
        'If this email is registered, a reset code has been requested. Check your inbox or spam folder.',
        'success'
      );

    } catch (error: unknown) {
      this.setFeedback(
        this.errorText(error),
        'error'
      );
    } finally {
      this.loading = false;
      this.refreshUI();
    }
  }

  // =====================================
  // RESEND RESET CODE
  // =====================================

  async resendRecoveryCode(): Promise<void> {
    if (this.loading || this.recoveryVerified) return;

    this.loading = true;
    this.feedback = '';
    this.refreshUI();

    try {
      const { error } = await this.withTimeout(
        this.authService.client.auth
          .resetPasswordForEmail(
            this.email.trim().toLowerCase()
          )
      );

      if (error) throw error;

      this.recoveryCode = '';

      this.setFeedback(
        'If the account exists, another reset code has been requested. Check your email.',
        'success'
      );

    } catch (error: unknown) {
      this.setFeedback(
        this.errorText(error),
        'error'
      );
    } finally {
      this.loading = false;
      this.refreshUI();
    }
  }

  // =====================================
  // STEP 2: VERIFY 8-DIGIT OTP
  // =====================================

  async verifyRecoveryCode(): Promise<void> {
    if (this.loading || this.recoveryVerified) return;

    if (!this.isRecoveryCodeValid) {
      this.setFeedback(
        'Please enter a valid 8-digit verification code.',
        'error'
      );
      return;
    }

    this.loading = true;
    this.feedback = '';
    this.refreshUI();

    try {
      const { data, error } = await this.withTimeout(
        this.authService.client.auth.verifyOtp({
          email: this.email.trim().toLowerCase(),
          token: this.recoveryCode.trim(),
          type: 'recovery'
        })
      );

      if (error) throw error;

      if (!data.session) {
        throw new Error(
          'Unable to verify your recovery code. Please request a new one.'
        );
      }

      // Unlock password fields only after
      // successful Supabase verification.

      this.recoveryVerified = true;
      this.recoveryCode = '';

      this.setFeedback(
        'Email verified successfully! You can now create a new password.',
        'success'
      );

    } catch (error: unknown) {
      this.recoveryVerified = false;

      this.setFeedback(
        this.errorText(error),
        'error'
      );

    } finally {
      this.loading = false;
      this.refreshUI();
    }
  }

  // =====================================
  // STEP 3: UPDATE PASSWORD
  // =====================================

  async resetPassword(): Promise<void> {
    if (this.loading) return;

    if (!this.recoveryVerified) {
      this.setFeedback(
        'Please verify your email code first.',
        'error'
      );
      return;
    }

    if (!this.isNewPasswordStrong) {
      this.setFeedback(
        'Your new password does not meet all the requirements.',
        'error'
      );
      return;
    }

    if (!this.doNewPasswordsMatch) {
      this.setFeedback(
        'New passwords do not match.',
        'error'
      );
      return;
    }

    this.loading = true;
    this.feedback = '';
    this.refreshUI();

    try {
      const {
        data: userData,
        error: userError
      } = await this.withTimeout(
        this.authService.client.auth.getUser()
      );

      if (userError || !userData.user) {
        this.recoveryVerified = false;

        throw new Error(
          'Your recovery session has expired. Please request a new reset code.'
        );
      }

      // Ensure the authenticated recovery
      // session belongs to the target email.

      if (
        userData.user.email?.toLowerCase() !==
        this.email.trim().toLowerCase()
      ) {
        this.recoveryVerified = false;

        throw new Error(
          'Recovery account mismatch. Please request a new reset code.'
        );
      }

      const { error } = await this.withTimeout(
        this.authService.client.auth.updateUser({
          password: this.newPassword
        })
      );

      if (error) throw error;

      const { error: logoutError } =
        await this.withTimeout(
          this.authService.client.auth.signOut({
            scope: 'local'
          })
        );

      if (logoutError) throw logoutError;

      this.recoveryVerified = false;
      this.recoveryCode = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
      this.password = '';
      this.confirmPassword = '';
      this.showNewPassword = false;

      this.mode = 'login';

      this.setFeedback(
        'Password updated successfully! Please log in using your new password.',
        'success'
      );

    } catch (error: unknown) {
      this.setFeedback(
        this.errorText(error),
        'error'
      );

    } finally {
      this.loading = false;
      this.refreshUI();
    }
  }
}
