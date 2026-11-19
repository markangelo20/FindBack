
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnDestroy
} from '@angular/core';
import { Router } from '@angular/router';
import { CameraPreview } from '@capacitor-community/camera-preview';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import {
  Script,
  TextRecognition
} from '@capacitor-mlkit/text-recognition';
import {
  IonContent,
  IonIcon,
  IonModal
} from '@ionic/angular';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  arrowForwardOutline,
  checkmarkCircleOutline,
  logOutOutline,
  refreshOutline,
  scanOutline,
  schoolOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
import { AuthService } from '../services/auth.service';

type SchoolCode = 'NEUST' | 'CDSL';

type ScannerStatus =
  | 'starting'
  | 'scanning'
  | 'recognized'
  | 'saving'
  | 'success'
  | 'error'
  | 'unsupported';

interface IdDetails {
  schoolCode: SchoolCode;
  fullName: string;
  studentNumber: string;
}

interface ScreeningResponse {
  success?: boolean;
  status?: string;
  message?: string;
  dashboard_access?: boolean;
  masked_student_number?: string;
  error_code?: string;
}

@Component({
  selector: 'app-scan-id',
  standalone: true,

  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    IonModal
  ],

  template: `
    <ion-content
      [fullscreen]="true"
      class="scanner-content"
      [class.solid-background]="
        status !== 'starting' &&
        status !== 'scanning'
      "
    >
      <main class="scanner-page">

        <!-- HEADER -->

        <header class="scanner-header">

          <div class="brand-logo">
            <ion-icon name="scan-outline"></ion-icon>
          </div>

          <h1>FindBack ID Scanner</h1>

          <p>
            NEUST & Colegio de San Leonardo
          </p>

        </header>

        <!-- LIVE CAMERA -->

        <section
          *ngIf="
            status === 'starting' ||
            status === 'scanning'
          "
          class="live-scanner"
        >

          <div class="scanner-frame">

            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <div class="corner bottom-left"></div>
            <div class="corner bottom-right"></div>

            <div
              *ngIf="status === 'scanning'"
              class="scan-line"
            ></div>

            <div
              *ngIf="status === 'starting'"
              class="camera-loading"
            >

              <div class="spinner"></div>

              Opening camera...

            </div>

            <div class="frame-instruction">
              Position School ID inside the frame
            </div>

          </div>

          <div class="scanning-label">

            <span class="scanning-dot"></span>

            {{
              status === 'starting'
                ? 'Starting scanner...'
                : 'Automatically scanning ID...'
            }}

          </div>

          <p class="scanner-help">

            Hold your School ID steady.

            Make sure the school name,
            full name and complete student
            number are readable.

          </p>

        </section>

        <!-- RECOGNITION RESULT -->

        <section
          *ngIf="
            status === 'recognized' ||
            status === 'saving' ||
            status === 'success'
          "
          class="recognized-card"
        >

          <ion-icon
            name="checkmark-circle-outline"
            class="recognized-icon"
          ></ion-icon>

          <h2>
            School ID Text Recognized!
          </h2>

          <p>
            The scanner recognized
            the required ID details.
          </p>

          <div class="recognized-details">

            <div>

              <span>School</span>

              <strong>
                {{ schoolName }}
              </strong>

            </div>

            <div>

              <span>Full Name</span>

              <strong>
                {{ recognizedName }}
              </strong>

            </div>

            <div>

              <span>Student Number</span>

              <strong>
                {{ maskedStudentNumber }}
              </strong>

            </div>

          </div>

          <div
            *ngIf="status === 'saving'"
            class="saving-status"
          >

            <div class="spinner small"></div>

            Saving OCR screening details
            to Supabase...

          </div>

          <p class="recognition-note">

            OCR screening does not prove
            official enrollment or
            ID authenticity.

          </p>

        </section>

        <!-- SCANNER ERROR -->

        <section
          *ngIf="
            status === 'error' ||
            status === 'unsupported'
          "
          class="error-card"
        >

          <ion-icon
            name="alert-circle-outline"
          ></ion-icon>

          <h2>

            {{
              status === 'unsupported'
                ? 'Android Scanner Required'
                : 'Scanner Needs Attention'
            }}

          </h2>

          <p>
            {{ errorMessage }}
          </p>

          <button
            *ngIf="status === 'error'"
            type="button"
            class="retry-button"
            (click)="retry()"
          >

            <ion-icon
              name="refresh-outline"
            ></ion-icon>

            {{
              recognizedDetails
                ? 'Retry Saving ID Details'
                : 'Restart Scanner'
            }}

          </button>

        </section>

        <!-- CONSENT -->

        <section
          *ngIf="
            status !== 'success' &&
            status !== 'unsupported'
          "
          class="consent-panel"
        >

          <label>

            <input
              type="checkbox"
              [checked]="consentToSaveOcr"
              [disabled]="status === 'saving'"
              (change)="onConsentChanged($event)"
            >

            <span>

              I agree to save the recognized
              school, name and student number
              to FindBack for account screening.

            </span>

          </label>

          <p>

            The ID photo stays on the device
            and is not sent to Supabase.

            Only extracted text details
            are submitted.

          </p>

        </section>

        <!-- LOGOUT -->

        <button
          class="logout-button"
          type="button"
          (click)="logout()"
        >

          <ion-icon
            name="log-out-outline"
          ></ion-icon>

          Log Out

        </button>

      </main>

    </ion-content>

    <!-- SUCCESS MODAL -->

    <ion-modal
      [isOpen]="showSuccessModal"
      [backdropDismiss]="false"
    >

      <ng-template>

        <div class="success-modal">

          <div class="success-circle">

            <ion-icon
              name="checkmark-circle-outline"
            ></ion-icon>

          </div>

          <h2>
            ID Text Screening Successful!
          </h2>

          <p>

            Your recognized School ID details
            were saved to FindBack.

          </p>

          <div class="screening-badge">

            OCR Screening Complete

          </div>

          <p>

            Opening your FindBack Dashboard...

          </p>

          <button
            type="button"
            (click)="goToDashboard()"
          >

            Go to Dashboard

            <ion-icon
              name="arrow-forward-outline"
            ></ion-icon>

          </button>

          <small>

            This is OCR-based prototype
            screening, not official
            student verification.

          </small>

        </div>

      </ng-template>

    </ion-modal>
  `,

  styles: [`

    :host {
      display: block;
      background: transparent;
    }

    ion-content {
      --background: transparent;
      --color: #ffffff;
    }

    ion-content.solid-background {
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

    /* MAIN PAGE */

    .scanner-page {
      min-height: 100%;

      padding:
        calc(22px + var(--ion-safe-area-top, 0px))
        20px
        calc(25px + var(--ion-safe-area-bottom, 0px));

      display: flex;
      flex-direction: column;
      align-items: center;

      background: transparent;
    }

    /* HEADER */

    .scanner-header {
      width: 100%;
      text-align: center;

      margin-bottom: 22px;
      padding: 14px;

      border-radius: 18px;

      background: rgba(7, 31, 47, .75);
    }

    .brand-logo {
      width: 57px;
      height: 57px;

      margin: 0 auto 11px;

      display: grid;
      place-items: center;

      border-radius: 18px;

      background: linear-gradient(
        120deg,
        #1769d2,
        #148f62
      );
    }

    .brand-logo ion-icon {
      font-size: 30px;
    }

    .scanner-header h1 {
      margin: 5px 0;
      font-size: 23px;
      color: white;
    }

    .scanner-header p {
      margin: 0;
      font-size: 11px;
      color: #d4e5ef;
    }

    /* LIVE SCANNER */

    .live-scanner {
      width: 100%;
      max-width: 450px;

      display: flex;
      flex-direction: column;
      align-items: center;

      margin-top: 14px;
    }

    .scanner-frame {
      position: relative;

      width: 100%;
      height: min(47vh, 390px);
      min-height: 260px;

      background: transparent;

      border: 1px solid rgba(
        255, 255, 255, .45
      );

      border-radius: 20px;
      overflow: hidden;
    }

    /* SCANNER CORNERS */

    .corner {
      position: absolute;

      width: 46px;
      height: 46px;

      border: 5px solid #43e4a3;

      z-index: 5;
    }

    .top-left {
      top: 0;
      left: 0;

      border-right: none;
      border-bottom: none;

      border-top-left-radius: 18px;
    }

    .top-right {
      top: 0;
      right: 0;

      border-left: none;
      border-bottom: none;

      border-top-right-radius: 18px;
    }

    .bottom-left {
      bottom: 0;
      left: 0;

      border-right: none;
      border-top: none;

      border-bottom-left-radius: 18px;
    }

    .bottom-right {
      bottom: 0;
      right: 0;

      border-left: none;
      border-top: none;

      border-bottom-right-radius: 18px;
    }

    /* MOVING SCAN LINE */

    .scan-line {
      position: absolute;

      left: 7%;
      right: 7%;

      height: 4px;

      z-index: 4;

      border-radius: 50%;

      background: #36ffaa;

      box-shadow:
        0 0 10px #36ffaa,
        0 0 24px rgba(54,255,170,.9);

      animation:
        scanMove 2.3s ease-in-out
        infinite alternate;
    }

    @keyframes scanMove {
      0% {
        top: 9%;
      }

      100% {
        top: 88%;
      }
    }

    /* FRAME INSTRUCTION */

    .frame-instruction {
      position: absolute;

      left: 12px;
      right: 12px;
      bottom: 16px;

      z-index: 5;

      padding: 11px;

      border-radius: 9px;

      text-align: center;

      background: rgba(8, 29, 45, .75);
      color: #ffffff;

      font-size: 12px;
      font-weight: 700;
    }

    .camera-loading {
      position: absolute;
      inset: 0;

      z-index: 6;

      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;

      gap: 16px;

      background: rgba(8,29,45,.76);

      color: white;
      font-size: 13px;
    }

    /* SCANNING STATUS */

    .scanning-label {
      display: flex;
      align-items: center;
      gap: 9px;

      margin-top: 18px;
      padding: 12px 18px;

      border-radius: 22px;

      background: rgba(8,29,45,.78);
      color: white;

      font-size: 13px;
      font-weight: 800;
    }

    .scanning-dot {
      width: 9px;
      height: 9px;

      border-radius: 50%;

      background: #43e4a3;

      box-shadow: 0 0 8px #43e4a3;

      animation:
        pulse 1s infinite alternate;
    }

    @keyframes pulse {
      from {
        opacity: .35;
      }

      to {
        opacity: 1;
      }
    }

    .scanner-help {
      max-width: 330px;

      padding: 10px 15px;

      border-radius: 12px;

      background: rgba(8,29,45,.72);
      color: #e7f2fa;

      text-align: center;

      font-size: 11px;
      line-height: 1.7;
    }

    /* CONSENT */

    .consent-panel {
      width: 100%;
      max-width: 450px;

      margin-top: 18px;
      padding: 15px;

      border-radius: 14px;

      background: rgba(8,29,45,.88);
      color: white;
    }

    .consent-panel label {
      display: flex;
      align-items: flex-start;
      gap: 10px;

      font-size: 12px;
      font-weight: 700;
      line-height: 1.6;
    }

    .consent-panel input {
      width: 19px;
      height: 19px;

      flex-shrink: 0;
      margin-top: 2px;

      accent-color: #148f62;
    }

    .consent-panel p {
      margin: 10px 0 0 29px;

      font-size: 10px;
      color: #d0e4ef;
      line-height: 1.7;
    }

    /* RECOGNITION RESULT */

    .recognized-card {
      width: 100%;
      max-width: 450px;

      padding: 23px 18px;

      border-radius: 20px;

      background: #e9f9ef;
      border: 1px solid #bfe8d0;

      text-align: center;
      color: #087b51;
    }

    .recognized-icon {
      font-size: 49px;
    }

    .recognized-card h2 {
      font-size: 21px;
      margin: 10px 0;
    }

    .recognized-card p {
      font-size: 12px;
      line-height: 1.6;
    }

    /* RECOGNIZED DETAILS */

    .recognized-details {
      padding: 14px;
      margin-top: 14px;

      border-radius: 13px;

      background: white;
      text-align: left;
    }

    .recognized-details > div {
      display: flex;
      flex-direction: column;
      gap: 5px;

      padding: 11px 0;

      border-bottom: 1px solid #e4eee8;
    }

    .recognized-details > div:last-child {
      border-bottom: none;
    }

    .recognized-details span {
      font-size: 10px;
      color: #8193a6;
    }

    .recognized-details strong {
      font-size: 12px;
      color: #102a43;

      overflow-wrap: anywhere;
    }

    .recognition-note {
      font-size: 10px !important;
    }

    /* SAVING STATUS */

    .saving-status {
      display: flex;
      align-items: center;
      justify-content: center;

      gap: 10px;
      padding: 13px;

      color: #1769d2;
      font-size: 11px;
    }

    .spinner {
      width: 31px;
      height: 31px;

      border: 3px solid #d4e9ff;
      border-top-color: #148f62;

      border-radius: 50%;

      animation:
        spin .8s linear infinite;
    }

    .spinner.small {
      width: 19px;
      height: 19px;
      border-width: 2px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* ERROR */

    .error-card {
      width: 100%;
      max-width: 450px;

      padding: 25px 18px;

      border-radius: 18px;

      background: #fff2ef;
      border: 1px solid #f1d5ce;

      color: #b83f39;
      text-align: center;
    }

    .error-card ion-icon {
      font-size: 42px;
    }

    .error-card h2 {
      font-size: 20px;
    }

    .error-card p {
      font-size: 12px;
      line-height: 1.7;
    }

    /* RETRY BUTTON */

    .retry-button {
      display: flex;
      align-items: center;
      justify-content: center;

      gap: 8px;

      width: 100%;
      margin-top: 16px;
      padding: 14px;

      border: none;
      border-radius: 12px;

      background: #1769d2;
      color: white;

      font-size: 13px;
      font-weight: 800;
    }

    .retry-button ion-icon {
      font-size: 19px;
    }

    /* LOGOUT */

    .logout-button {
      margin-top: 20px;
      padding: 12px;

      border: none;
      border-radius: 10px;

      background: rgba(8,29,45,.80);
      color: white;

      font-size: 12px;
      font-weight: 700;
    }

    .logout-button ion-icon {
      margin-right: 7px;
      vertical-align: middle;
    }

    /* SUCCESS MODAL */

    ion-modal {
      --width: 90%;
      --max-width: 410px;
      --height: auto;
      --border-radius: 25px;
    }

    .success-modal {
      padding: 30px 23px;

      background: white;
      text-align: center;
    }

    .success-circle {
      display: grid;
      place-items: center;

      width: 80px;
      height: 80px;

      margin: 0 auto 20px;

      border-radius: 50%;

      background: #e2f7eb;
      color: #148f62;
    }

    .success-circle ion-icon {
      font-size: 52px;
    }

    .success-modal h2 {
      color: #102a43;
      font-size: 22px;
    }

    .success-modal p {
      color: #71869c;
      font-size: 12px;
      line-height: 1.8;
    }

    .screening-badge {
      margin: 20px 0;
      padding: 13px;

      border-radius: 12px;

      background: #e9f9ef;
      color: #087b51;

      font-size: 12px;
      font-weight: 800;
    }

    .success-modal button {
      width: 100%;
      min-height: 52px;

      display: flex;
      align-items: center;
      justify-content: center;

      gap: 9px;

      border: none;
      border-radius: 13px;

      background: linear-gradient(
        110deg,
        #1769d2,
        #148f62
      );

      color: white;

      font-size: 13px;
      font-weight: 800;
    }

    .success-modal small {
      display: block;
      margin-top: 15px;

      color: #8193a6;
      font-size: 10px;
      line-height: 1.6;
    }

    /* REDUCED MOTION */

    @media (prefers-reduced-motion: reduce) {
      .scan-line,
      .scanning-dot,
      .spinner {
        animation: none;
      }
    }

  `]
})
export class ScanIdPage
  implements AfterViewInit, OnDestroy {

  // =====================================
  // SCANNER STATUS
  // =====================================

  status: ScannerStatus = 'starting';

  errorMessage = '';

  // =====================================
  // CONSENT
  // =====================================

  consentToSaveOcr = false;

  // =====================================
  // RECOGNIZED INFORMATION
  // =====================================

  schoolName = '';
  recognizedName = '';
  maskedStudentNumber = '';

  recognizedDetails: IdDetails | null = null;

  // =====================================
  // SUCCESS MODAL
  // =====================================

  showSuccessModal = false;

  // =====================================
  // CAMERA STATE
  // =====================================

  private scannerActive = false;
  private cameraReady = false;
  private startingCamera = false;
  private destroyed = false;

  private scanGeneration = 0;
  private scanCount = 0;

  // =====================================
  // DOUBLE OCR CONFIRMATION
  // =====================================

  private previousReading: IdDetails | null = null;

  private matchingReadings = 0;

  // Require two consecutive matching
  // OCR readings before saving.

  // =====================================
  // TIMERS
  // =====================================

  private scanTimer:
    ReturnType<typeof setTimeout> | null = null;

  private redirectTimer:
    ReturnType<typeof setTimeout> | null = null;

  private navigating = false;

  // =====================================
  // BACKGROUND STATE
  // =====================================

  private originalBackgrounds: {
    element: HTMLElement;
    value: string;
  }[] = [];

  // =====================================
  // CONSTRUCTOR
  // =====================================

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      scanOutline,
      schoolOutline,
      shieldCheckmarkOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      refreshOutline,
      logOutOutline,
      arrowForwardOutline
    });
  }

  // =====================================
  // REFRESH UI
  // =====================================

  private refreshUI(): void {
    this.cdr.markForCheck();
  }

  // =====================================
  // AUTO START SCANNER
  // =====================================

  ngAfterViewInit(): void {
    void this.startScanner();
  }

  ionViewDidEnter(): void {
    void this.startScanner();
  }

  ionViewWillLeave(): void {
    void this.stopScanner();
  }

  ngOnDestroy(): void {
    this.destroyed = true;

    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = null;
    }

    void this.stopScanner();
  }

  // =====================================
  // TRANSPARENT CAMERA BACKGROUND
  // =====================================

  private makeBackgroundTransparent(): void {

    if (this.originalBackgrounds.length) {
      return;
    }

    const elements =
      document.querySelectorAll<HTMLElement>(
        'html, body, ion-app, app-root, ion-router-outlet'
      );

    elements.forEach(element => {

      this.originalBackgrounds.push({
        element,
        value: element.style.backgroundColor
      });

      element.style.backgroundColor =
        'transparent';
    });
  }

  // =====================================
  // RESTORE ORIGINAL BACKGROUND
  // =====================================

  private restoreBackground(): void {

    for (const item of this.originalBackgrounds) {
      item.element.style.backgroundColor =
        item.value;
    }

    this.originalBackgrounds = [];
  }

  // =====================================
  // START LIVE CAMERA
  // =====================================

  private async startScanner(): Promise<void> {

    if (
      this.destroyed ||
      this.startingCamera ||
      this.scannerActive ||
      this.recognizedDetails ||
      this.showSuccessModal
    ) {
      return;
    }

    // Android APK only.

    if (!Capacitor.isNativePlatform()) {

      this.status = 'unsupported';

      this.errorMessage =
        'Install the Android APK to use the live School ID scanner.';

      this.refreshUI();
      return;
    }

    this.startingCamera = true;
    this.scannerActive = true;

    const generation =
      ++this.scanGeneration;

    this.status = 'starting';
    this.errorMessage = '';

    this.makeBackgroundTransparent();
    this.refreshUI();

    try {

      await CameraPreview.start({
        position: 'rear',
        toBack: true,
        disableAudio: true,
        storeToFile: false
      });

      this.cameraReady = true;

      // Avoid processing if scanner
      // was already closed.

      if (
        !this.scannerActive ||
        generation !== this.scanGeneration ||
        this.destroyed
      ) {

        await this.stopScanner();
        return;
      }

      // Reset OCR confirmation.

      this.scanCount = 0;
      this.previousReading = null;
      this.matchingReadings = 0;

      this.status = 'scanning';

      this.refreshUI();

      // Start capturing frames.

      this.scheduleScan(
        generation,
        1200
      );

    } catch {

      this.status = 'error';

      this.errorMessage =
        'Unable to open the live camera. Check the Camera permission in Android settings.';

      await this.stopScanner();

    } finally {

      this.startingCamera = false;
      this.refreshUI();
    }
  }

  // =====================================
  // SCHEDULE NEXT CAMERA FRAME
  // =====================================

  private scheduleScan(
    generation: number,
    delay: number
  ): void {

    if (
      !this.scannerActive ||
      this.destroyed ||
      generation !== this.scanGeneration
    ) {
      return;
    }

    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
    }

    this.scanTimer = setTimeout(() => {

      this.scanTimer = null;

      void this.scanFrame(generation);

    }, delay);
  }

  // =====================================
  // AUTOMATIC OCR FRAME CAPTURE
  // =====================================

  private async scanFrame(
    generation: number
  ): Promise<void> {

    if (
      !this.scannerActive ||
      !this.cameraReady ||
      generation !== this.scanGeneration ||
      this.destroyed
    ) {
      return;
    }

    let temporaryFile: string | null = null;

    try {

      this.scanCount++;

      // Every fourth attempt uses a
      // higher-resolution frame.
      // No manual photo button needed.

      const picture =
        this.scanCount % 4 === 0
          ? await CameraPreview.capture({
              quality: 88,
              width: 1600,
              height: 1200
            })
          : await CameraPreview.captureSample({
              quality: 90
            });

      if (
        !this.scannerActive ||
        generation !== this.scanGeneration
      ) {
        return;
      }

      // Prepare Base64 image.

      const base64 = picture.value.replace(
        /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
        ''
      );

      // Create temporary local file.

      temporaryFile =
        'findback_live_' +
        Date.now() +
        '_' +
        generation +
        '.jpg';

      const saved =
        await Filesystem.writeFile({
          directory: Directory.Cache,
          path: temporaryFile,
          data: base64
        });

      // Google ML Kit OCR.

      const result =
        await TextRecognition.processImage({
          path: saved.uri,
          script: Script.Latin
        });

      if (
        !this.scannerActive ||
        generation !== this.scanGeneration
      ) {
        return;
      }

      // Parse recognized School ID.

      const details =
        this.parseSchoolId(
          result.text || ''
        );

      // =================================
      // TWO MATCHING OCR READINGS
      // =================================

      if (details) {

        const sameAsPrevious =
          this.previousReading !== null &&
          this.previousReading.schoolCode ===
            details.schoolCode &&
          this.previousReading.studentNumber ===
            details.studentNumber &&
          this.previousReading.fullName ===
            details.fullName;

        if (sameAsPrevious) {

          this.matchingReadings++;

        } else {

          this.previousReading = details;
          this.matchingReadings = 1;
        }

        // Must match at least twice.

        if (this.matchingReadings >= 2) {

          this.recognizedDetails = details;

          this.schoolName =
            details.schoolCode === 'NEUST'
              ? 'Nueva Ecija University of Science and Technology'
              : 'Colegio de San Leonardo';

          this.recognizedName =
            details.fullName;

          // Keep full student number
          // only in memory.

          this.maskedStudentNumber =
            '••••' +
            details.studentNumber.slice(-4);

          this.status = 'recognized';

          // Stop camera when recognized.

          await this.stopScanner();

          this.refreshUI();

          // Automatically save when
          // consent is already checked.

          if (this.consentToSaveOcr) {

            await this.saveRecognition();

          }

          return;
        }

      } else {

        // An unreadable frame resets
        // consecutive matching count.

        this.previousReading = null;
        this.matchingReadings = 0;
      }

    } catch (error: unknown) {

      // Do not log student data,
      // image data or OCR raw text.

      console.error(
        'FindBack frame processing:',
        error instanceof Error
          ? error.name
          : 'UnknownError'
      );

      // Keep scanning.

      this.previousReading = null;
      this.matchingReadings = 0;

    } finally {

      // Delete temporary OCR image.

      if (temporaryFile) {

        try {

          await Filesystem.deleteFile({
            path: temporaryFile,
            directory: Directory.Cache
          });

        } catch {

          // Android may clear cache later.

        }
      }
    }

    // Continue with next frame.

    this.scheduleScan(
      generation,
      1400
    );
  }

  // =====================================
  // RECOGNIZE SCHOOL ID DETAILS
  // =====================================

  private parseSchoolId(
    rawText: string
  ): IdDetails | null {

    if (!rawText.trim()) {
      return null;
    }

    const lines = rawText
      .split(/\r?\n/)
      .map(line =>
        line.trim().replace(/\s+/g, ' ')
      )
      .filter(Boolean);

    const normalized = lines
      .join(' ')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ');

    // =================================
    // DETECT SUPPORTED SCHOOL
    // =================================

    const isNEUST =
      /\bNEUST\b/.test(normalized) ||
      (
        normalized.includes('NUEVA ECIJA') &&
        normalized.includes('SCIENCE') &&
        normalized.includes('TECHNOLOGY')
      );

    const isCDSL =
      normalized.includes(
        'COLEGIO DE SAN LEONARDO'
      ) ||
      (
        normalized.includes('COLEGIO') &&
        normalized.includes('SAN LEONARDO')
      );

    // Exactly one school must match.

    if (isNEUST === isCDSL) {
      return null;
    }

    const schoolCode: SchoolCode =
      isNEUST ? 'NEUST' : 'CDSL';

    // =================================
    // STUDENT NUMBER DETECTION
    // =================================

    const ocrText = rawText
      .toUpperCase()
      .replace(/[‐‑‒–—−]/g, '-');

    let studentNumber = '';
    let numberEndOffset = 0;

    if (schoolCode === 'NEUST') {

      // =================================
      // NEUST SAN LEONARDO ID
      //
      // Examples:
      //
      // SLC2023-0065
      // SLC2023-00065
      // SLC 2023 - 0065
      //
      // Do not remove leading zeros.
      // =================================

      const slcPattern =
        /(?:^|[^A-Z0-9])S\s*L\s*C[\s:.-]*(20\d{2})\s*[-:\s]*(\d{4,6})(?!\d)/i;

      const match =
        slcPattern.exec(ocrText);

      // If SLC prefix is missing,
      // do not save incomplete ID.

      if (!match) {
        return null;
      }

      // Preserve OCR-recognized digits.

      studentNumber =
        'SLC' +
        match[1] +
        '-' +
        match[2];

      numberEndOffset =
        match.index + match[0].length;

    } else {

      // =================================
      // COLEGIO DE SAN LEONARDO
      // Keep flexible number format.
      // =================================

      const cdslPattern =
        /\b(?:[A-Z]{2,5}[\s-]*)?\d{4}[\s-]*\d{4,8}\b/i;

      const match =
        cdslPattern.exec(ocrText);

      if (!match) {
        return null;
      }

      studentNumber = match[0]
        .replace(/\s+/g, '')
        .toUpperCase();

      numberEndOffset =
        match.index + match[0].length;
    }

    // =================================
    // FIND NUMBER'S OCR LINE
    // =================================

    const numberIndex = Math.max(
      0,
      ocrText
        .slice(0, numberEndOffset)
        .split(/\r?\n/)
        .filter(
          line => line.trim().length > 0
        )
        .length - 1
    );

    // =================================
    // FULL NAME EXTRACTION
    // =================================

    const excluded =
      /\b(REPUBLIC|PHILIPPINES|NUEVA|ECIJA|UNIVERSITY|SCIENCE|TECHNOLOGY|CERTIFIED|COLEGIO|LEONARDO|CAMPUS|STUDENT|NUMBER|COLLEGE|DEPARTMENT|EXCELLENCE|COURSE|BSIT|IDENTIFICATION|CARD)\b/i;

    // Prefer lines following
    // the student-number line.

    const searchOrder = [
      ...lines.slice(
        Math.max(numberIndex + 1, 0)
      ),
      ...lines.slice(
        0,
        Math.max(numberIndex + 1, 0)
      )
    ];

    let fullName = '';

    for (const line of searchOrder) {

      const candidate = line
        .replace(
          /^(FULL NAME|NAME)\s*:\s*/i,
          ''
        )
        .trim();

      const words = candidate
        .split(/\s+/)
        .filter(Boolean);

      const valid =
        words.length >= 2 &&
        words.length <= 6 &&
        candidate.length >= 7 &&
        candidate.length <= 65 &&
        /^[A-Za-z .'-]+$/.test(candidate) &&
        !excluded.test(candidate);

      if (valid) {

        fullName =
          candidate.toUpperCase();

        break;
      }
    }

    if (!fullName) {
      return null;
    }

    // =================================
    // RETURN RECOGNIZED DETAILS
    // =================================

    return {
      schoolCode,
      fullName,
      studentNumber
    };
  }

  // =====================================
  // CONSENT CHANGED
  // =====================================

  onConsentChanged(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    this.consentToSaveOcr =
      input.checked;

    this.refreshUI();

    // If recognition already succeeded,
    // save automatically after consent.

    if (
      this.consentToSaveOcr &&
      this.status === 'recognized'
    ) {

      void this.saveRecognition();

    }
  }

  // =====================================
  // SAVE RECOGNIZED ID TO SUPABASE
  // =====================================

  private async saveRecognition():
    Promise<void> {

    if (
      !this.recognizedDetails ||
      !this.consentToSaveOcr ||
      this.status === 'saving' ||
      this.status === 'success'
    ) {
      return;
    }

    this.status = 'saving';
    this.errorMessage = '';

    this.refreshUI();

    try {

      const user =
        await this.authService
          .getCurrentUser();

      if (!user) {

        throw new Error(
          'Login session expired. Please log in again.'
        );
      }

      const details =
        this.recognizedDetails;

      // =================================
      // SEND EXACT STUDENT NUMBER
      //
      // DO NOT REMOVE SLC PREFIX
      // DO NOT REMOVE LEADING ZEROS
      // =================================

      const { data, error } =
        await this.authService.client
          .functions.invoke(
            'recognize-school-id',
            {
              body: {
                schoolCode:
                  details.schoolCode,

                fullName:
                  details.fullName,

                studentNumber:
                  details.studentNumber,

                consentToSaveOcr: true
              }
            }
          );

      if (error) {

        throw new Error(
          await this.readFunctionError(
            error
          )
        );
      }

      const response =
        (data || {}) as ScreeningResponse;

      // =================================
      // CHECK BACKEND RESULT
      // =================================

      if (
        response.success !== true ||
        response.status !== 'id_recognized' ||
        response.dashboard_access !== true
      ) {

        throw new Error(
          response.message ||
          'ID screening was not completed.'
        );
      }

      // =================================
      // CONFIRM DATABASE STATUS
      // =================================

      const allowed =
        await this.authService
          .hasRecognizedSchoolId(
            user.id
          );

      if (!allowed) {

        throw new Error(
          'Screening was saved, but Dashboard access could not be confirmed. Check the student_profiles RLS SELECT policy.'
        );
      }

      // =================================
      // SUCCESS
      // =================================

      this.status = 'success';

      this.showSuccessModal = true;

      this.refreshUI();

      // Show success modal before
      // automatic Dashboard navigation.

      this.redirectTimer = setTimeout(() => {

        void this.goToDashboard();

      }, 2200);

    } catch (error: unknown) {

      this.status = 'error';

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to save ID screening details.';

      this.refreshUI();
    }
  }

  // =====================================
  // READ SUPABASE ERROR
  // =====================================

  private async readFunctionError(
    error: unknown
  ): Promise<string> {

    if (error instanceof FunctionsHttpError) {

      try {

        const result: unknown =
          await error.context.json();

        if (
          result &&
          typeof result === 'object'
        ) {

          const body = result as {
            message?: unknown;
            error_code?: unknown;
          };

          const message =
            typeof body.message === 'string'
              ? body.message
              : 'Server request failed.';

          const code =
            typeof body.error_code === 'string'
              ? ' (' + body.error_code + ')'
              : '';

          return message + code;
        }

      } catch {

        // Use generic error below.

      }
    }

    return (
      'Unable to contact the FindBack screening server.'
    );
  }

  // =====================================
  // STOP SCANNER
  // =====================================

  private async stopScanner(): Promise<void> {

    this.scannerActive = false;

    ++this.scanGeneration;

    if (this.scanTimer) {

      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }

    if (this.cameraReady) {

      this.cameraReady = false;

      try {

        await CameraPreview.stop();

      } catch {

        // Camera may already be stopped.

      }
    }

    this.restoreBackground();

    this.refreshUI();
  }

  // =====================================
  // ERROR RECOVERY
  // =====================================

  retry(): void {

    if (this.recognizedDetails) {

      void this.saveRecognition();
      return;
    }

    this.status = 'starting';
    this.errorMessage = '';

    void this.startScanner();
  }

  // =====================================
  // GO TO DASHBOARD
  // =====================================

  async goToDashboard(): Promise<void> {

    if (
      this.navigating ||
      this.status !== 'success'
    ) {
      return;
    }

    this.navigating = true;

    if (this.redirectTimer) {

      clearTimeout(this.redirectTimer);
      this.redirectTimer = null;
    }

    try {

      this.showSuccessModal = false;

      this.refreshUI();

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

    } catch {

      this.status = 'error';

      this.errorMessage =
        'Dashboard navigation failed. Please retry.';

    } finally {

      this.navigating = false;
      this.refreshUI();
    }
  }

  // =====================================
  // LOGOUT
  // =====================================

  async logout(): Promise<void> {

    await this.stopScanner();

    try {

      const { error } =
        await this.authService.logout();

      if (error) {
        throw error;
      }

      await this.router.navigateByUrl(
        '/auth',
        {
          replaceUrl: true
        }
      );

    } catch {

      this.status = 'error';

      this.errorMessage =
        'Logout failed. Please try again.';

      this.refreshUI();
    }
  }
}
