
import { CommonModule } from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { Router } from '@angular/router';

import {
  IonContent,
  IonIcon,
  IonModal
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  arrowBackOutline,
  cardOutline,
  checkmarkCircleOutline,
  logOutOutline,
  mailOutline,
  personCircleOutline,
  personOutline,
  refreshOutline,
  schoolOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';

import { AuthService } from '../services/auth.service';

interface StudentProfile {
  full_name: string | null;
  student_number: string | null;
  school_code: string | null;
  verification_status: string | null;
}

@Component({
  selector: 'app-profile',
  standalone: true,

  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    IonModal
  ],

  template: `
    <ion-content [fullscreen]="true">

      <main class="profile-page">

        <!-- PROFILE HEADER -->

        <header class="page-header">

          <button
            type="button"
            class="back-btn"
            aria-label="Back to Dashboard"
            (click)="goBack()">

            <ion-icon name="arrow-back-outline">
            </ion-icon>

          </button>

          <h1>My Profile</h1>

          <div class="header-spacer"></div>

        </header>

        <!-- STUDENT PROFILE CARD -->

        <section class="profile-banner">

          <div class="avatar">

            <ion-icon name="person-circle-outline">
            </ion-icon>

          </div>

          <h2>{{ studentName }}</h2>

          <p>FindBack Student Account</p>

          <span
            class="status-badge"
            [class.pending]="
              screeningStatus !== 'id_recognized'
            ">

            <ion-icon
              name="checkmark-circle-outline">
            </ion-icon>

            {{
              screeningStatus === 'id_recognized'
                ? 'ID Text Recognized'
                : 'Screening Pending'
            }}

          </span>

        </section>

        <!-- LOADING -->

        <section
          *ngIf="loading"
          class="notice"
          role="status">

          <div class="loading-spinner"></div>

          Loading student profile...

        </section>

        <!-- ERROR -->

        <section
          *ngIf="errorMessage"
          class="error-box"
          role="alert">

          <p>{{ errorMessage }}</p>

          <button
            type="button"
            (click)="loadProfile()">

            <ion-icon
              name="refresh-outline">
            </ion-icon>

            Retry

          </button>

        </section>

        <!-- STUDENT INFORMATION -->

        <section
          *ngIf="!loading"
          class="details-card">

          <h3>Student Information</h3>

          <p class="description">
            Information recorded from your
            School ID screening.
          </p>

          <!-- STUDENT NAME -->

          <div class="detail-row">

            <span class="detail-icon">

              <ion-icon name="person-outline">
              </ion-icon>

            </span>

            <div>

              <span>Student Name</span>

              <strong>{{ studentName }}</strong>

            </div>

          </div>

          <!-- STUDENT NUMBER -->

          <div class="detail-row">

            <span class="detail-icon">

              <ion-icon name="card-outline">
              </ion-icon>

            </span>

            <div>

              <span>Student Number</span>

              <strong>{{ studentNumber }}</strong>

            </div>

          </div>

          <!-- SCHOOL -->

          <div class="detail-row">

            <span class="detail-icon">

              <ion-icon name="school-outline">
              </ion-icon>

            </span>

            <div>

              <span>School</span>

              <strong>{{ schoolName }}</strong>

            </div>

          </div>

          <!-- EMAIL -->

          <div class="detail-row">

            <span class="detail-icon">

              <ion-icon name="mail-outline">
              </ion-icon>

            </span>

            <div>

              <span>Email Address</span>

              <strong>{{ email }}</strong>

            </div>

          </div>

        </section>

        <!-- LOG OUT BUTTON -->

        <button
          type="button"
          class="logout-button"
          [disabled]="loggingOut"
          (click)="confirmLogout()">

          <ion-icon name="log-out-outline">
          </ion-icon>

          Log Out

        </button>

        <p class="footer-note">
          FindBack — Campus Lost & Found
        </p>

      </main>

    </ion-content>

    <!-- ================================= -->
    <!-- CUSTOM LOG OUT CONFIRMATION MODAL -->
    <!-- ================================= -->

    <ion-modal
      class="logout-modal"
      [isOpen]="showLogoutModal"
      [backdropDismiss]="false"
      (didDismiss)="onLogoutModalDismissed()"
      style="
        --width: min(90vw, 410px);
        --height: min(405px, 80dvh);
        --border-radius: 26px;
        --box-shadow: 0 25px 65px rgba(15,42,67,.28);
      ">

      <ng-template>

        <div class="logout-dialog">

          <!-- GRADIENT ACCENT -->

          <div class="modal-accent"></div>

          <!-- LOGOUT ICON -->

          <div class="logout-icon-wrapper">

            <div class="logout-icon-inner">

              <ion-icon name="log-out-outline">
              </ion-icon>

            </div>

          </div>

          <!-- CONFIRMATION TEXT -->

          <h2>Log Out of FindBack?</h2>

          <p class="logout-description">

            Are you sure you want to log out
            of your FindBack account?

          </p>

          <p class="logout-subtext">

            You'll need to sign in again
            to access your Dashboard.

          </p>

          <!-- ACTION BUTTONS -->

          <div class="logout-actions">

            <button
              type="button"
              class="cancel-btn"
              [disabled]="loggingOut"
              (click)="cancelLogout()">

              Cancel

            </button>

            <button
              type="button"
              class="confirm-logout-btn"
              [disabled]="loggingOut"
              (click)="performLogout()">

              <ng-container *ngIf="!loggingOut">

                <ion-icon name="log-out-outline">
                </ion-icon>

                Log Out

              </ng-container>

              <ng-container *ngIf="loggingOut">

                <span class="button-spinner"></span>

                Logging out...

              </ng-container>

            </button>

          </div>

          <!-- SECURITY NOTE -->

          <div class="logout-note">

            <ion-icon
              name="shield-checkmark-outline">
            </ion-icon>

            Your account information
            will remain saved.

          </div>

        </div>

      </ng-template>

    </ion-modal>
  `,

  styles: [`

    :host {
      display: block;
    }

    ion-content {
      --background: #f4f9ff;
      --color: #102a43;
    }

    * {
      box-sizing: border-box;
    }

    button {
      font-family: inherit;
      cursor: pointer;
    }

    /* ================================= */
    /* PROFILE PAGE */
    /* ================================= */

    .profile-page {
      max-width: 550px;
      min-height: 100%;
      margin: auto;

      padding:
        calc(20px + var(--ion-safe-area-top, 0px))
        18px
        calc(32px + var(--ion-safe-area-bottom, 0px));

      background: linear-gradient(
        145deg,
        #eaf4ff,
        #ffffff 54%,
        #e8f8ef
      );
    }

    /* HEADER */

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 22px;
    }

    .page-header h1 {
      margin: 0;
      font-size: 21px;
      font-weight: 800;
      color: #102a43;
    }

    .back-btn {
      display: grid;
      place-items: center;
      width: 43px;
      height: 43px;

      border: 1px solid #d7e7f4;
      border-radius: 13px;

      background: white;
      color: #1769d2;
    }

    .back-btn ion-icon {
      font-size: 23px;
    }

    .header-spacer {
      width: 43px;
    }

    /* ================================= */
    /* PROFILE BANNER */
    /* ================================= */

    .profile-banner {
      display: flex;
      flex-direction: column;
      align-items: center;

      padding: 30px 18px;
      margin-bottom: 20px;

      border: 1px solid #dfeaf3;
      border-radius: 23px;

      background: white;

      box-shadow:
        0 12px 30px rgba(23,105,210,.07);

      text-align: center;
    }

    .avatar {
      width: 89px;
      height: 89px;

      margin-bottom: 15px;

      display: grid;
      place-items: center;

      border-radius: 50%;

      background: linear-gradient(
        130deg,
        #e3f0ff,
        #dff8e9
      );

      color: #148f62;
    }

    .avatar ion-icon {
      font-size: 66px;
    }

    .profile-banner h2 {
      margin: 0 0 7px;

      font-size: 22px;
      color: #102a43;

      overflow-wrap: anywhere;
    }

    .profile-banner p {
      margin: 0;
      font-size: 12px;
      color: #8193a6;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;

      padding: 10px 14px;
      margin-top: 18px;

      border-radius: 24px;

      background: #e7f8ee;
      color: #087b51;

      font-size: 11px;
      font-weight: 800;
    }

    .status-badge.pending {
      background: #fff4df;
      color: #946d20;
    }

    .status-badge ion-icon {
      font-size: 18px;
    }

    /* ================================= */
    /* STUDENT DETAILS */
    /* ================================= */

    .details-card {
      padding: 22px 18px;

      border: 1px solid #dfeaf3;
      border-radius: 20px;

      background: white;

      box-shadow:
        0 12px 30px rgba(23,105,210,.05);
    }

    .details-card h3 {
      margin: 0 0 6px;
      font-size: 17px;
      color: #102a43;
    }

    .description {
      margin: 0 0 13px;
      font-size: 11px;
      color: #8193a6;
      line-height: 1.6;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 13px;

      padding: 16px 0;

      border-bottom: 1px solid #e6edf3;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-icon {
      flex-shrink: 0;
      display: grid;
      place-items: center;

      width: 45px;
      height: 45px;

      border-radius: 13px;

      background: #eaf4ff;
      color: #1769d2;
    }

    .detail-icon ion-icon {
      font-size: 22px;
    }

    .detail-row > div {
      display: flex;
      flex-direction: column;

      min-width: 0;
      gap: 5px;
    }

    .detail-row > div span {
      font-size: 11px;
      color: #8193a6;
    }

    .detail-row strong {
      font-size: 13px;
      color: #102a43;
      overflow-wrap: anywhere;
    }

    /* ================================= */
    /* LOADING AND ERROR */
    /* ================================= */

    .notice,
    .error-box {
      padding: 18px;
      margin: 17px 0;

      border-radius: 15px;

      background: white;
      font-size: 12px;
    }

    .notice {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .loading-spinner {
      width: 21px;
      height: 21px;

      border: 2px solid #d7e8f8;
      border-top-color: #148f62;
      border-radius: 50%;

      animation: spin .8s linear infinite;
    }

    .error-box {
      background: #fff2ef;
      color: #a83232;
    }

    .error-box button {
      border: none;
      border-radius: 9px;

      padding: 9px 12px;

      color: white;
      background: #1769d2;
    }

    .error-box button ion-icon {
      vertical-align: middle;
    }

    /* ================================= */
    /* PROFILE LOGOUT BUTTON */
    /* ================================= */

    .logout-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;

      width: 100%;
      min-height: 54px;

      margin-top: 24px;

      border: 1px solid #f0d2ce;
      border-radius: 15px;

      color: #b83f39;
      background: #fff2ef;

      font-size: 14px;
      font-weight: 800;

      transition:
        transform .2s ease,
        background .2s ease;
    }

    .logout-button:active {
      transform: scale(.98);
      background: #ffe8e4;
    }

    .logout-button:disabled {
      opacity: .6;
    }

    .logout-button ion-icon {
      font-size: 21px;
    }

    .footer-note {
      margin: 20px 0;
      color: #8193a6;

      text-align: center;
      font-size: 10px;
      line-height: 1.6;
    }

    /* ================================= */
    /* CUSTOM LOGOUT MODAL */
    /* ================================= */

    ion-modal.logout-modal {
      --background: #ffffff;
      --border-radius: 26px;
      --backdrop-opacity: 0.62;
      --box-shadow:
        0 25px 65px rgba(15,42,67,.28);
    }

    .logout-dialog {
      position: relative;

      width: 100%;
      height: 100%;

      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      padding: 23px 22px 20px;

      background: #ffffff;
      color: #102a43;

      text-align: center;

      overflow-y: auto;
    }

    /* BLUE AND GREEN TOP BORDER */

    .modal-accent {
      position: absolute;

      top: 0;
      left: 0;
      right: 0;

      height: 5px;

      background: linear-gradient(
        90deg,
        #1769d2,
        #148f62
      );
    }

    /* RED LOGOUT ICON */

    .logout-icon-wrapper {
      width: 90px;
      height: 90px;

      display: grid;
      place-items: center;

      margin: 7px auto 16px;

      border-radius: 50%;

      background: #fff0ee;

      animation:
        iconAppear .5s ease both;
    }

    .logout-icon-inner {
      width: 68px;
      height: 68px;

      display: grid;
      place-items: center;

      border-radius: 50%;

      background: #ffe0dc;
      color: #c83e3e;
    }

    .logout-icon-inner ion-icon {
      font-size: 36px;
    }

    /* MODAL TYPOGRAPHY */

    .logout-dialog h2 {
      margin: 0 0 10px;

      font-size: 21px;
      font-weight: 850;

      color: #102a43;
    }

    .logout-description {
      max-width: 300px;

      margin: 0;

      font-size: 13px;
      line-height: 1.7;

      color: #52677d;
    }

    .logout-subtext {
      margin: 9px 0 19px;

      font-size: 11px;
      line-height: 1.6;

      color: #8798a9;
    }

    /* BUTTON CONTAINER */

    .logout-actions {
      display: grid;
      grid-template-columns:
        minmax(0,1fr) minmax(0,1fr);

      gap: 11px;

      width: 100%;
    }

    /* CANCEL BUTTON */

    .cancel-btn {
      min-height: 49px;

      border: 1px solid #dbe6f1;
      border-radius: 13px;

      background: #f8fbff;
      color: #536981;

      font-size: 13px;
      font-weight: 800;

      transition:
        background .2s ease,
        transform .2s ease;
    }

    .cancel-btn:active {
      background: #eaf4ff;
      transform: scale(.97);
    }

    /* CONFIRM LOGOUT BUTTON */

    .confirm-logout-btn {
      min-height: 49px;

      display: flex;
      align-items: center;
      justify-content: center;

      gap: 8px;

      border: none;
      border-radius: 13px;

      background: linear-gradient(
        125deg,
        #db5555,
        #b92e3b
      );

      color: #ffffff;

      box-shadow:
        0 7px 17px rgba(185,46,59,.20);

      font-size: 13px;
      font-weight: 800;

      transition:
        transform .2s ease,
        box-shadow .2s ease;
    }

    .confirm-logout-btn ion-icon {
      font-size: 18px;
    }

    .confirm-logout-btn:active {
      transform: scale(.97);
      box-shadow:
        0 3px 10px rgba(185,46,59,.15);
    }

    .cancel-btn:disabled,
    .confirm-logout-btn:disabled {
      opacity: .65;
      cursor: not-allowed;
    }

    /* LOGOUT SPINNER */

    .button-spinner {
      width: 17px;
      height: 17px;

      border: 2px solid
        rgba(255,255,255,.35);

      border-top-color: #ffffff;

      border-radius: 50%;

      animation: spin .8s linear infinite;
    }

    /* SECURITY NOTE */

    .logout-note {
      display: flex;
      align-items: center;
      justify-content: center;

      gap: 7px;

      margin-top: 17px;

      color: #8193a6;

      font-size: 10px;
      line-height: 1.5;
    }

    .logout-note ion-icon {
      font-size: 15px;
      color: #148f62;
      flex-shrink: 0;
    }

    /* ANIMATIONS */

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes iconAppear {
      from {
        opacity: 0;
        transform: scale(.82);
      }

      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @media (max-width: 360px) {
      .logout-dialog {
        padding-left: 15px;
        padding-right: 15px;
      }

      .logout-dialog h2 {
        font-size: 19px;
      }

      .logout-icon-wrapper {
        width: 76px;
        height: 76px;
      }

      .logout-icon-inner {
        width: 58px;
        height: 58px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .loading-spinner,
      .button-spinner,
      .logout-icon-wrapper {
        animation: none;
      }
    }

  `]
})
export class ProfilePage implements OnInit {

  // =====================================
  // STATES
  // =====================================

  loading = true;
  loggingOut = false;

  showLogoutModal = false;

  errorMessage = '';

  // =====================================
  // PROFILE DATA
  // =====================================

  studentName = 'Student';
  studentNumber = 'Not available';
  schoolName = 'Not available';
  email = 'Not available';

  screeningStatus = 'unverified';

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      arrowBackOutline,
      cardOutline,
      checkmarkCircleOutline,
      logOutOutline,
      mailOutline,
      personCircleOutline,
      personOutline,
      refreshOutline,
      schoolOutline,
      shieldCheckmarkOutline
    });
  }

  // =====================================
  // LOAD PROFILE
  // =====================================

  ngOnInit(): void {
    void this.loadProfile();
  }

  ionViewWillEnter(): void {
    void this.loadProfile();
  }

  private refreshUI(): void {
    this.cdr.markForCheck();
  }

  // =====================================
  // FETCH FROM SUPABASE
  // =====================================

  async loadProfile(): Promise<void> {

    this.loading = true;
    this.errorMessage = '';

    this.refreshUI();

    try {

      const user =
        await this.authService.getCurrentUser();

      if (!user) {

        await this.router.navigateByUrl(
          '/auth',
          { replaceUrl: true }
        );

        return;
      }

      this.email =
        user.email || 'Not available';

      const { data, error } =
        await this.authService.client
          .from('student_profiles')
          .select(
            'full_name, student_number, school_code, verification_status'
          )
          .eq('user_id', user.id)
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          'Student profile not found.'
        );
      }

      const profile =
        data as StudentProfile;

      this.studentName =
        profile.full_name || 'Not available';

      // EXACT SAVED STUDENT NUMBER

      this.studentNumber =
        profile.student_number ||
        'Not available';

      // SCHOOL

      this.schoolName =
        profile.school_code === 'NEUST'
          ? 'Nueva Ecija University of Science and Technology'
          : profile.school_code === 'CDSL'
            ? 'Colegio de San Leonardo'
            : 'Not available';

      // OCR SCREENING STATUS

      this.screeningStatus =
        profile.verification_status ||
        'unverified';

    } catch (error: unknown) {

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to load student profile.';

    } finally {

      this.loading = false;
      this.refreshUI();
    }
  }

  // =====================================
  // RETURN TO DASHBOARD
  // =====================================

  goBack(): void {

    void this.router.navigateByUrl(
      '/home'
    );
  }

  // =====================================
  // OPEN CUSTOM LOGOUT MODAL
  // =====================================

  confirmLogout(): void {

    if (this.loggingOut) {
      return;
    }

    this.showLogoutModal = true;

    this.refreshUI();
  }

  // =====================================
  // CANCEL LOGOUT
  // =====================================

  cancelLogout(): void {

    if (this.loggingOut) {
      return;
    }

    this.showLogoutModal = false;

    this.refreshUI();
  }

  // =====================================
  // MODAL DISMISSED
  // =====================================

  onLogoutModalDismissed(): void {

    this.showLogoutModal = false;

    this.refreshUI();
  }

  // =====================================
  // CONFIRMED LOGOUT
  // =====================================

  async performLogout(): Promise<void> {

    if (
      this.loggingOut ||
      !this.showLogoutModal
    ) {
      return;
    }

    this.loggingOut = true;
    this.errorMessage = '';

    this.refreshUI();

    try {

      // SIGN OUT FROM SUPABASE

      const { error } =
        await this.authService.logout();

      if (error) {
        throw error;
      }

      // CLOSE THE MODAL

      this.showLogoutModal = false;

      this.refreshUI();

      // REDIRECT TO LOGIN

      await this.router.navigateByUrl(
        '/auth',
        { replaceUrl: true }
      );

    } catch {

      this.showLogoutModal = false;

      this.errorMessage =
        'Unable to log out. Please try again.';

    } finally {

      this.loggingOut = false;

      this.refreshUI();
    }
  }
}
