
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
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowForwardOutline,
  checkmarkCircleOutline,
  refreshOutline,
  scanOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import {
  RegistrationDraftService
} from '../services/registration-draft.service';

type SchoolCode = 'NEUST' | 'CDSL';

type ScanStatus =
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

@Component({
  selector: 'app-registration-scan',
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
      [class.solid-background]="
        status !== 'starting' &&
        status !== 'scanning'
      ">

      <main class="scan-page">

        <header class="header">
          <button
            type="button"
            aria-label="Cancel registration"
            [disabled]="
              status === 'saving' ||
              status === 'success'
            "
            (click)="cancelRegistration()">

            <ion-icon name="arrow-back-outline"></ion-icon>
          </button>

          <div>
            <h1>FindBack Registration</h1>
            <p>One-time School ID screening</p>
          </div>
        </header>

        <!-- LIVE CAMERA SCANNER -->

        <section
          *ngIf="
            status === 'starting' ||
            status === 'scanning'
          "
          class="live-area">

          <div class="scan-frame">
            <span class="corner tl"></span>
            <span class="corner tr"></span>
            <span class="corner bl"></span>
            <span class="corner br"></span>

            <div
              *ngIf="status === 'scanning'"
              class="scan-line">
            </div>

            <div
              *ngIf="status === 'starting'"
              class="camera-loading">
              Opening rear camera...
            </div>

            <span class="frame-tip">
              Align your School ID in this frame
            </span>
          </div>

          <div class="scan-label">
            <ion-icon name="scan-outline"></ion-icon>
            {{
              status === 'starting'
                ? 'Starting camera...'
                : 'Scanning automatically...'
            }}
          </div>

          <p class="scan-help">
            Fill the frame with your School ID.
            Keep the name and student number in focus.
            The scanner checks the details twice
            for consistency.
          </p>
        </section>

        <!-- RECOGNIZED SCHOOL ID -->

        <section
          *ngIf="
            status === 'recognized' ||
            status === 'saving'
          "
          class="result-card">

          <ion-icon
            name="checkmark-circle-outline"
            class="good-icon">
          </ion-icon>

          <h2>Review Your ID Details</h2>

          <p>
            Compare the recognized information
            with your actual School ID
            before creating an account.
          </p>

          <div class="info">
            <span>School</span>
            <strong>{{ schoolName }}</strong>
          </div>

          <div class="info">
            <span>Student Name</span>
            <strong>
              {{ recognizedDetails?.fullName }}
            </strong>
          </div>

          <div class="info">
            <span>Student Number</span>
            <strong>
              {{ recognizedDetails?.studentNumber }}
            </strong>
          </div>

          <button
            type="button"
            class="primary"
            [disabled]="
              status === 'saving' ||
              !consentToSaveOcr
            "
            (click)="completeRegistration()">

            {{
              status === 'saving'
                ? 'Creating account...'
                : 'Confirm & Create Account'
            }}
          </button>

          <button
            type="button"
            class="secondary"
            [disabled]="status === 'saving'"
            (click)="restartScanner()">

            <ion-icon name="refresh-outline"></ion-icon>
            Rescan ID
          </button>
        </section>

        <!-- ERROR HANDLING -->

        <section
          *ngIf="
            status === 'error' ||
            status === 'unsupported'
          "
          class="result-card error">

          <h2>
            {{
              status === 'unsupported'
                ? 'Android App Required'
                : 'Something went wrong'
            }}
          </h2>

          <p>{{ errorMessage }}</p>

          <button
            *ngIf="status === 'error'"
            type="button"
            class="primary"
            (click)="retry()">
            Try Again
          </button>
        </section>

        <!-- CONSENT -->

        <section
          *ngIf="
            status === 'recognized' ||
            status === 'saving'
          "
          class="consent">

          <label>
            <input
              type="checkbox"
              [checked]="consentToSaveOcr"
              [disabled]="status === 'saving'"
              (change)="onConsentChange($event)">

            <span>
              I consent to save the recognized
              school, student name and student
              number in my FindBack account.
            </span>
          </label>

          <small>
            Only recognized text is submitted.
            Temporary camera images are removed
            after on-device OCR.
          </small>
        </section>
      </main>
    </ion-content>

    <!-- SUCCESS MODAL -->

    <ion-modal
      [isOpen]="showSuccessModal"
      [backdropDismiss]="false"
      class="registration-modal">

      <ng-template>
        <div class="success-dialog">

          <ion-icon
            name="checkmark-circle-outline"
            class="good-icon">
          </ion-icon>

          <h2>Registration Submitted!</h2>

          <p>
            School ID text recognized and
            account registration submitted.
          </p>

          <div class="info">
            <span>School</span>
            <strong>{{ schoolName }}</strong>
          </div>

          <div class="info">
            <span>Name</span>
            <strong>
              {{ recognizedDetails?.fullName }}
            </strong>
          </div>

          <div class="info">
            <span>Student Number</span>
            <strong>
              {{ recognizedDetails?.studentNumber }}
            </strong>
          </div>

          <p *ngIf="requiresEmailConfirmation">
            Check your email and confirm
            your address before logging in.
          </p>

          <p>
            School ID approval may be required.
            You can proceed to log in once your
            account is confirmed and approved.
          </p>

          <button
            type="button"
            class="primary"
            (click)="goToLogin()">

            Proceed to Login
            <ion-icon name="arrow-forward-outline"></ion-icon>
          </button>

          <small>
            OCR recognition alone does not
            verify ID authenticity.
          </small>
        </div>
      </ng-template>
    </ion-modal>
  `,

  styles: [`
    :host {
      display: block;
    }

    ion-content {
      --background: transparent;
      --color: white;
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

    button:disabled {
      opacity: .55;
    }

    .scan-page {
      min-height: 100%;
      padding:
        max(25px, env(safe-area-inset-top))
        18px
        max(30px, env(safe-area-inset-bottom));
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #102a43e8;
      border-radius: 17px;
      color: white;
    }

    .header button {
      width: 42px;
      height: 42px;
      border: 0;
      border-radius: 12px;
      background: #ffffff24;
      color: white;
      font-size: 24px;
    }

    .header h1 {
      margin: 0 0 4px;
      font-size: 19px;
    }

    .header p {
      margin: 0;
      font-size: 11px;
      color: #d5e9f2;
    }

    .live-area {
      margin-top: 26px;
      display: flex;
      align-items: center;
      flex-direction: column;
      gap: 16px;
    }

    .scan-frame {
      width: 100%;
      max-width: 480px;
      height: min(49vh, 400px);
      min-height: 270px;
      border: 1px solid #ffffff70;
      border-radius: 20px;
      position: relative;
      overflow: hidden;
    }

    .corner {
      position: absolute;
      width: 46px;
      height: 46px;
      border: 5px solid #43e4a3;
      z-index: 3;
    }

    .tl {
      top: 0;
      left: 0;
      border-right: 0;
      border-bottom: 0;
    }

    .tr {
      top: 0;
      right: 0;
      border-left: 0;
      border-bottom: 0;
    }

    .bl {
      bottom: 0;
      left: 0;
      border-right: 0;
      border-top: 0;
    }

    .br {
      bottom: 0;
      right: 0;
      border-left: 0;
      border-top: 0;
    }

    .scan-line {
      position: absolute;
      left: 6%;
      right: 6%;
      height: 4px;
      background: #43e4a3;
      border-radius: 99px;
      z-index: 2;
      box-shadow: 0 0 15px #43e4a3;
      animation:
        scan 2.2s infinite
        alternate ease-in-out;
    }

    @keyframes scan {
      from {
        top: 8%;
      }

      to {
        top: 87%;
      }
    }

    .camera-loading {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      background: #102a43aa;
      color: white;
    }

    .frame-tip {
      position: absolute;
      bottom: 15px;
      left: 12px;
      right: 12px;
      text-align: center;
      padding: 11px;
      border-radius: 9px;
      z-index: 4;
      background: #102a43dd;
      font-size: 12px;
    }

    .scan-label {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 17px;
      border-radius: 30px;
      background: #102a43dd;
      font-size: 12px;
      font-weight: bold;
    }

    .scan-help {
      max-width: 330px;
      text-align: center;
      padding: 13px;
      background: #102a43bb;
      border-radius: 13px;
      font-size: 12px;
      line-height: 1.7;
    }

    .consent {
      max-width: 480px;
      margin: 22px auto;
      padding: 17px;
      background: #102a43e8;
      border-radius: 16px;
      color: white;
    }

    .consent label {
      display: flex;
      gap: 11px;
      align-items: flex-start;
      font-size: 12px;
      line-height: 1.6;
    }

    .consent input {
      width: 19px;
      height: 19px;
      flex-shrink: 0;
      accent-color: #43e4a3;
    }

    .consent small {
      display: block;
      margin-top: 12px;
      color: #cddfec;
      font-size: 10px;
      line-height: 1.6;
    }

    .result-card {
      max-width: 480px;
      margin: 24px auto 0;
      padding: 22px;
      border-radius: 22px;
      background: white;
      color: #102a43;
      box-shadow: 0 12px 30px #102a4315;
      text-align: center;
    }

    .result-card h2 {
      margin: 9px 0;
      font-size: 21px;
    }

    .result-card p {
      color: #708499;
      line-height: 1.6;
      font-size: 12px;
    }

    .result-card.error {
      color: #a83232;
    }

    .good-icon {
      color: #148f62;
      font-size: 58px;
    }

    .info {
      padding: 12px;
      border: 1px solid #e6edf5;
      background: #f7fbff;
      border-radius: 12px;
      text-align: left;
      margin: 9px 0;
    }

    .info span {
      display: block;
      font-size: 10px;
      color: #8193a6;
      margin-bottom: 4px;
    }

    .info strong {
      font-size: 13px;
      overflow-wrap: anywhere;
    }

    .primary,
    .secondary {
      width: 100%;
      min-height: 49px;
      margin-top: 13px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 9px;
      border: none;
      border-radius: 12px;
      font-size: 13px;
      font-weight: bold;
    }

    .primary {
      color: white;
      background: linear-gradient(
        120deg,
        #1769d2,
        #148f62
      );
    }

    .secondary {
      color: #1769d2;
      background: #eaf4ff;
    }

    ion-modal.registration-modal {
      --width: min(92vw, 430px);
      --height: auto;
      --border-radius: 24px;
      --background: white;
    }

    .success-dialog {
      padding: 26px 23px;
      max-height: 85dvh;
      overflow-y: auto;
      background: white;
      color: #102a43;
      text-align: center;
    }

    .success-dialog h2 {
      margin: 10px 0;
      font-size: 21px;
    }

    .success-dialog p {
      font-size: 12px;
      line-height: 1.7;
      color: #536980;
    }

    .success-dialog small {
      display: block;
      color: #8193a6;
      margin-top: 13px;
      font-size: 10px;
    }

    @media (prefers-reduced-motion: reduce) {
      .scan-line {
        animation: none;
      }
    }
  `]
})

export class RegistrationScanPage
  implements AfterViewInit, OnDestroy {

  status: ScanStatus = 'starting';
  errorMessage = '';

  consentToSaveOcr = false;
  recognizedDetails: IdDetails | null = null;
  schoolName = '';

  showSuccessModal = false;
  requiresEmailConfirmation = false;

  private active = false;
  private cameraReady = false;
  private starting = false;
  private destroyed = false;

  private generation = 0;
  private attempts = 0;

  private previousReading: IdDetails | null = null;
  private matchingReadings = 0;
  private lastRecognizedAt = 0;
  private consecutiveFrameErrors = 0;

  private scanTimer:
    ReturnType<typeof setTimeout> | null = null;

  private scanTimeoutTimer:
    ReturnType<typeof setTimeout> | null = null;

  private originalBackgrounds: {
    element: HTMLElement;
    value: string;
  }[] = [];

  // =====================================
  // FASTER SCANNING CONFIGURATION
  // =====================================

  private readonly initialScanDelayMs = 350;
  private readonly scanDelayMs = 300;
  private readonly matchWindowMs = 8_000;
  private readonly scanTimeoutMs = 25_000;
  private readonly fullCaptureEvery = 6;
  private readonly maxFrameErrors = 3;

  constructor(
    private readonly auth: AuthService,
    private readonly drafts: RegistrationDraftService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {
    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      checkmarkCircleOutline,
      refreshOutline,
      scanOutline,
      shieldCheckmarkOutline
    });
  }

  // =====================================
  // LIFECYCLE
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
    void this.stopScanner();
  }

  private refreshUI(): void {
    this.cdr.markForCheck();
  }

  // =====================================
  // TRANSPARENT CAMERA BACKGROUND
  // =====================================

  private transparentBackground(): void {
    if (this.originalBackgrounds.length) return;

    const elements =
      document.querySelectorAll<HTMLElement>(
        'html, body, ion-app, app-root, ion-router-outlet'
      );

    elements.forEach(element => {
      this.originalBackgrounds.push({
        element,
        value: element.style.backgroundColor
      });

      element.style.backgroundColor = 'transparent';
    });
  }

  private restoreBackground(): void {
    this.originalBackgrounds.forEach(item => {
      item.element.style.backgroundColor = item.value;
    });

    this.originalBackgrounds = [];
  }

  // =====================================
  // START CAMERA
  // =====================================

  private async startScanner(): Promise<void> {

    if (
      this.destroyed ||
      this.active ||
      this.starting ||
      this.recognizedDetails
    ) return;

    if (!this.drafts.get()) {
      await this.router.navigateByUrl(
        '/auth',
        { replaceUrl: true }
      );
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      this.status = 'unsupported';

      this.errorMessage =
        'Install the Android APK for registration ID scanning.';

      this.refreshUI();
      return;
    }

    this.starting = true;
    this.active = true;

    const current = ++this.generation;

    this.status = 'starting';
    this.errorMessage = '';

    this.transparentBackground();
    this.refreshUI();

    try {
      await CameraPreview.start({
        position: 'rear',
        toBack: true,
        disableAudio: true,
        storeToFile: false
      });

      this.cameraReady = true;

      if (
        this.destroyed ||
        !this.active ||
        current !== this.generation
      ) {
        await this.stopScanner();
        return;
      }

      this.attempts = 0;
      this.previousReading = null;
      this.matchingReadings = 0;
      this.lastRecognizedAt = 0;
      this.consecutiveFrameErrors = 0;

      this.status = 'scanning';

      // Stop scanning after repeated unreadable frames.

      this.scanTimeoutTimer = setTimeout(() => {

        if (
          this.destroyed ||
          !this.active ||
          current !== this.generation ||
          this.recognizedDetails
        ) return;

        this.status = 'error';

        this.errorMessage =
          'No readable School ID detected within 25 seconds. ' +
          'Move closer, improve lighting, and tap Try Again.';

        void this.stopScanner();

      }, this.scanTimeoutMs);

      this.refreshUI();

      // Start analyzing sooner after preview readiness.
      this.scheduleFrame(
        current,
        this.initialScanDelayMs
      );

    } catch {
      this.status = 'error';

      this.errorMessage =
        'Could not open camera. Check Android camera permissions.';

      await this.stopScanner();

    } finally {
      this.starting = false;
      this.refreshUI();
    }
  }

  // =====================================
  // SCHEDULE FRAMES
  // =====================================

  private scheduleFrame(
    current: number,
    wait: number
  ): void {

    if (
      !this.active ||
      current !== this.generation ||
      this.destroyed
    ) return;

    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
    }

    this.scanTimer = setTimeout(() => {
      this.scanTimer = null;

      void this.scanFrame(current);
    }, wait);
  }

  // =====================================
  // FAST CAMERA AND OCR
  // =====================================

  private async scanFrame(
    current: number
  ): Promise<void> {

    if (
      !this.active ||
      !this.cameraReady ||
      this.destroyed ||
      current !== this.generation
    ) return;

    let temporaryFile: string | null = null;

    try {
      this.attempts++;

      // Preview captures for speed.
      // Every sixth attempt uses a sharper image.

      const photo =
        this.attempts % this.fullCaptureEvery === 0
          ? await CameraPreview.capture({
              quality: 86,
              width: 1280,
              height: 960
            })
          : await CameraPreview.captureSample({
              quality: 85
            });

      if (
        !this.active ||
        current !== this.generation
      ) return;

      const rawBase64 =
        photo.value.replace(
          /^data:image\/[\w.+-]+;base64,/,
          ''
        );

      temporaryFile =
        `findback_register_${Date.now()}_${current}.jpg`;

      const saved =
        await Filesystem.writeFile({
          directory: Directory.Cache,
          path: temporaryFile,
          data: rawBase64
        });

      const result =
        await TextRecognition.processImage({
          path: saved.uri,
          script: Script.Latin
        });

      this.consecutiveFrameErrors = 0;

      if (
        !this.active ||
        current !== this.generation
      ) return;

      const recognized =
        this.parseSchoolId(result.text || '');

      if (recognized) {

        const now = Date.now();

        // Same school, student number and
        // reasonably consistent name.

        const sameId =
          this.previousReading !== null &&
          this.previousReading.schoolCode ===
            recognized.schoolCode &&
          this.previousReading.studentNumber ===
            recognized.studentNumber &&
          now - this.lastRecognizedAt <=
            this.matchWindowMs &&
          this.namesLookConsistent(
            this.previousReading.fullName,
            recognized.fullName
          );

        this.matchingReadings =
          sameId ? this.matchingReadings + 1 : 1;

        // Prefer the more complete OCR name.

        if (
          !sameId ||
          !this.previousReading ||
          recognized.fullName.length >
            this.previousReading.fullName.length
        ) {
          this.previousReading = recognized;
        }

        this.lastRecognizedAt = now;

        if (this.matchingReadings >= 2) {

          const finalDetails =
            this.previousReading ?? recognized;

          this.recognizedDetails = finalDetails;

          this.schoolName =
            finalDetails.schoolCode === 'NEUST'
              ? 'Nueva Ecija University of Science and Technology'
              : 'Colegio de San Leonardo';

          this.status = 'recognized';

          await this.stopScanner();
          this.refreshUI();

          return;
        }

      } else if (
        this.lastRecognizedAt &&
        Date.now() - this.lastRecognizedAt >
          this.matchWindowMs
      ) {

        this.previousReading = null;
        this.matchingReadings = 0;
        this.lastRecognizedAt = 0;
      }

    } catch {

      // Do not print private ID data to logs.

      if (
        this.active &&
        current === this.generation
      ) {

        this.consecutiveFrameErrors++;
        this.previousReading = null;
        this.matchingReadings = 0;
        this.lastRecognizedAt = 0;

        if (
          this.consecutiveFrameErrors >=
            this.maxFrameErrors
        ) {

          this.status = 'error';

          this.errorMessage =
            'Camera or OCR failed repeatedly. ' +
            'Check permission and tap Try Again.';

          await this.stopScanner();
        }
      }

    } finally {

      // Remove temporary captured photo.

      if (temporaryFile) {

        try {
          await Filesystem.deleteFile({
            directory: Directory.Cache,
            path: temporaryFile
          });

        } catch {
          // Android may clear its cache later.
        }
      }
    }

    // Next scan only after previous OCR has finished.
    this.scheduleFrame(
      current,
      this.scanDelayMs
    );
  }

  // =====================================
  // NAME CONSISTENCY
  // =====================================

  private namesLookConsistent(
    a: string,
    b: string
  ): boolean {

    const words = (text: string): string[] =>
      text
        .toUpperCase()
        .replace(/[^A-Z ]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length >= 2);

    const second = new Set(words(b));

    return words(a).filter(
      word => second.has(word)
    ).length >= 2;
  }

  // =====================================
  // SCHOOL ID PARSER
  // =====================================

  private parseSchoolId(
    raw: string
  ): IdDetails | null {

    if (!raw.trim()) return null;

    const lines = raw
      .split(/\r?\n/)
      .map(line =>
        line.trim().replace(/\s+/g, ' ')
      )
      .filter(Boolean);

    const normalized = lines
      .join(' ')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, ' ');

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

    if (isNEUST === isCDSL) {
      return null;
    }

    const schoolCode: SchoolCode =
      isNEUST ? 'NEUST' : 'CDSL';

    const fullText = lines
      .join(' ')
      .toUpperCase()
      .replace(/[‐‑‒–—−]/g, '-');

    let studentNumber = '';
    let numberLineIndex = -1;

    if (isNEUST) {

      const m =
        /(?:^|[^A-Z0-9])S\s*L\s*C[\s.:\-]*(20\d{2})\s*[-:\s]*(\d{4,6})(?!\d)/.exec(
          fullText
        );

      if (!m) return null;

      studentNumber =
        `SLC${m[1]}-${m[2]}`;

      numberLineIndex =
        lines.findIndex(line =>
          /S\s*L\s*C|20\d{2}\s*-/.test(
            line.toUpperCase()
          )
        );

    } else {

      const m =
        /\b(?:[A-Z]{2,6}\s*)?20\d{2}\s*-\s*\d{4,8}\b/.exec(
          fullText
        );

      if (!m) return null;

      studentNumber =
        m[0].replace(/\s+/g, '');

      numberLineIndex =
        lines.findIndex(line =>
          /20\d{2}\s*-/.test(
            line.toUpperCase()
          )
        );
    }

    // Exclude common school labels and website text
    // from the student-name field.

    const excluded =
      /\b(REPUBLIC|PHILIPPINES|NUEVA|ECIJA|UNIVERSITY|SCIENCE|TECHNOLOGY|CERTIFIED|COLEGIO|LEONARDO|CAMPUS|STUDENT|NUMBER|COLLEGE|DEPARTMENT|EXCELLENCE|COURSE|BSIT|IDENTIFICATION|CARD|SLC|NEUST|EDU|WWW|HTTP|GOV|WEBSITE|SCHOOL|ADDRESS|CONTACT)\b/i;

    const searchOrder = [
      ...lines.slice(
        Math.max(numberLineIndex + 1, 0)
      ),
      ...lines.slice(
        0,
        Math.max(numberLineIndex + 1, 0)
      )
    ];

    let fullName = '';

    for (const line of searchOrder) {

      const candidate = line
        .replace(
          /^(?:FULL NAME|NAME)\s*:\s*/i,
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
        fullName = candidate.toUpperCase();
        break;
      }
    }

    return fullName
      ? {
          schoolCode,
          fullName,
          studentNumber
        }
      : null;
  }

  // =====================================
  // CONSENT
  // =====================================

  onConsentChange(event: Event): void {

    this.consentToSaveOcr =
      (event.target as HTMLInputElement).checked;

    this.refreshUI();
  }

  // =====================================
  // CREATE ACCOUNT
  // =====================================

  async completeRegistration(): Promise<void> {

    const draft = this.drafts.get();

    if (
      !draft ||
      !this.recognizedDetails ||
      !this.consentToSaveOcr ||
      this.status === 'saving' ||
      this.status === 'success'
    ) return;

    this.status = 'saving';
    this.errorMessage = '';
    this.refreshUI();

    try {

      const details = this.recognizedDetails;

      const { data, error } =
        await this.auth.client.auth.signUp({

          email: draft.email,
          password: draft.password,

          options: {
            data: {
              first_name: draft.firstName,
              full_name: details.fullName,
              school_code: details.schoolCode,
              student_number: details.studentNumber,
              findback_ocr_screened: true
            }
          }
        });

      if (error) throw error;

      if (
        !data.user ||
        data.user.identities?.length === 0
      ) {

        throw new Error(
          'Account could not be created. ' +
          'This email may already be registered.'
        );
      }

      this.requiresEmailConfirmation =
        data.session === null;

      if (data.session) {

        const { error: logoutError } =
          await this.auth.client.auth.signOut();

        if (logoutError) {

          throw new Error(
            'Account created, but sign-out failed. ' +
            'Sign out before logging in.'
          );
        }
      }

      this.drafts.clear();

      this.status = 'success';
      this.showSuccessModal = true;

      this.refreshUI();

    } catch (error: unknown) {

      this.status = 'error';

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to create account. Please try again.';

      this.consentToSaveOcr = false;

      this.refreshUI();
    }
  }

  // =====================================
  // RETRY SCANNER
  // =====================================

  retry(): void {

    if (this.status === 'error') {
      this.restartScanner();
    }
  }

  restartScanner(): void {

    this.recognizedDetails = null;
    this.schoolName = '';
    this.consentToSaveOcr = false;

    this.previousReading = null;
    this.matchingReadings = 0;
    this.lastRecognizedAt = 0;

    this.errorMessage = '';
    this.status = 'starting';

    this.refreshUI();

    void this.startScanner();
  }

  // =====================================
  // CANCEL REGISTRATION
  // =====================================

  async cancelRegistration(): Promise<void> {

    if (
      this.status === 'saving' ||
      this.status === 'success'
    ) return;

    await this.stopScanner();

    this.drafts.clear();

    await this.router.navigateByUrl(
      '/auth',
      { replaceUrl: true }
    );
  }

  // =====================================
  // RETURN TO LOGIN
  // =====================================

  async goToLogin(): Promise<void> {

    if (this.status !== 'success') return;

    this.showSuccessModal = false;
    this.drafts.clear();

    await this.router.navigateByUrl(
      '/auth',
      { replaceUrl: true }
    );
  }

  // =====================================
  // STOP CAMERA
  // =====================================

  private async stopScanner(): Promise<void> {

    this.active = false;
    ++this.generation;

    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }

    if (this.scanTimeoutTimer) {
      clearTimeout(this.scanTimeoutTimer);
      this.scanTimeoutTimer = null;
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
}
