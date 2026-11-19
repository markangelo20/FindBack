
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cameraOutline,
  checkmarkCircleOutline,
  closeOutline,
  cloudUploadOutline,
  imagesOutline,
  informationCircleOutline,
  trashOutline
} from 'ionicons/icons';
import {
  FindBackDataService,
  FindBackItemType
} from '../services/findback-data.service';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
  template: `
    <ion-content [fullscreen]="true">
      <main class="page">
        <header class="top">
          <button type="button" class="back-button" (click)="back()"
                  aria-label="Back to Dashboard">
            <ion-icon name="arrow-back-outline"></ion-icon>
          </button>
          <div>
            <h1>Report an Item</h1>
            <p>Shared with the FindBack campus community</p>
          </div>
        </header>

        <section class="intro">
          <h2>{{ type === 'lost' ? 'Lost something?' : 'Found an item?' }}</h2>
          <p>Help the campus community find and return belongings.
             Other eligible students can see your report and message you privately.</p>
        </section>

        <div class="toggle" role="group" aria-label="Report type">
          <button type="button" [class.active]="type === 'lost'"
                  [disabled]="saving" (click)="type = 'lost'">🔍 Lost</button>
          <button type="button" [class.active]="type === 'found'"
                  [disabled]="saving" (click)="type = 'found'">📦 Found</button>
        </div>

        <form (ngSubmit)="submit()">
          <!-- PHOTO UPLOAD -->
          <section class="card photo-card">
            <div class="photo-heading">
              <div>
                <h3>Item Photo <span>(Optional)</span></h3>
                <p>Add a clear picture to help students recognize the item.</p>
              </div>
              <div class="photo-heading-icon">
                <ion-icon name="images-outline"></ion-icon>
              </div>
            </div>

            <div *ngIf="photoPreview; else photoPlaceholder" class="photo-preview">
              <img [src]="photoPreview" alt="Photo selected for this report">
              <div class="photo-selected">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
                Photo ready to upload
              </div>
              <button type="button" class="remove-photo"
                      (click)="clearPhoto()" [disabled]="saving || choosingPhoto">
                <ion-icon name="trash-outline"></ion-icon>
                Remove Photo
              </button>
            </div>

            <ng-template #photoPlaceholder>
              <div class="photo-placeholder">
                <div class="placeholder-icon">
                  <ion-icon name="camera-outline"></ion-icon>
                </div>
                <strong>No photo selected yet</strong>
                <span>Take a photo or pick one from your gallery</span>
              </div>
            </ng-template>

            <div class="photo-actions">
              <button type="button" class="photo-action take-photo"
                      [disabled]="saving || choosingPhoto"
                      (click)="takePhoto()">
                <ion-icon name="camera-outline"></ion-icon>
                <span>Take Photo</span>
              </button>
              <button type="button" class="photo-action gallery-photo"
                      [disabled]="saving || choosingPhoto"
                      (click)="chooseFromGallery()">
                <ion-icon name="images-outline"></ion-icon>
                <span>Choose from Gallery</span>
              </button>
            </div>

            <!-- Browser fallback input fields. Hidden from the UI. -->
            <input #cameraInput class="hidden-input" type="file"
                   accept="image/jpeg,image/png,image/webp"
                   capture="environment" aria-label="Take photo"
                   (change)="onFileSelected($event)">
            <input #galleryInput class="hidden-input" type="file"
                   accept="image/jpeg,image/png,image/webp"
                   aria-label="Choose image from gallery"
                   (change)="onFileSelected($event)">

            <p class="photo-help">
              JPG, PNG or WebP · Maximum 5 MB. Avoid uploading photos
              showing private ID numbers or personal information.
            </p>
          </section>

          <!-- BROWSER CAMERA PREVIEW -->
          <div class="camera-overlay" *ngIf="webCameraOpen" role="dialog"
               aria-modal="true" aria-label="Take item photo">
            <div class="camera-dialog">
              <div class="camera-dialog-header">
                <strong>Take a Photo</strong>
                <button type="button" (click)="closeWebCamera()"
                        aria-label="Close camera">
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>
              <video #liveVideo autoplay playsinline muted></video>
              <div class="camera-dialog-actions">
                <button type="button" class="cancel-camera"
                        (click)="closeWebCamera()">Cancel</button>
                <button type="button" class="capture-camera"
                        (click)="captureWebPhoto()">
                  <ion-icon name="camera-outline"></ion-icon>
                  Capture Photo
                </button>
              </div>
            </div>
          </div>

          <!-- ITEM INFORMATION -->
          <section class="card fields-card">
            <label for="itemName">Item Name <b>*</b></label>
            <input id="itemName" name="itemName" type="text" maxlength="80"
                   [(ngModel)]="form.name" required [disabled]="saving"
                   placeholder="e.g. Black wallet, keys, water bottle">

            <label for="category">Category <b>*</b></label>
            <select id="category" name="category" [(ngModel)]="form.category"
                    required [disabled]="saving">
              <option value="">Select a category</option>
              <option *ngFor="let category of categories" [value]="category">
                {{ category }}
              </option>
            </select>

            <label for="location">
              {{ type === 'lost' ? 'Last Seen Location' : 'Found Location' }} <b>*</b>
            </label>
            <input id="location" name="location" type="text" maxlength="120"
                   [(ngModel)]="form.location" required [disabled]="saving"
                   placeholder="e.g. Library, Building 1">

            <label for="itemDate">
              {{ type === 'lost' ? 'Date Lost' : 'Date Found' }} <b>*</b>
            </label>
            <input id="itemDate" name="itemDate" type="date" [max]="today"
                   [(ngModel)]="form.item_date" required [disabled]="saving">

            <label for="description">Description</label>
            <textarea id="description" name="description" rows="4"
                      maxlength="1000" [(ngModel)]="form.description"
                      [disabled]="saving"
                      placeholder="Describe the item without private ID numbers..."></textarea>

            <label for="pickup">Preferred Return / Pickup Location (optional)</label>
            <input id="pickup" name="pickup" type="text" maxlength="120"
                   [(ngModel)]="form.pickup_location" [disabled]="saving"
                   placeholder="e.g. Guard desk or school office">
          </section>

          <div class="notice">
            <ion-icon name="information-circle-outline"></ion-icon>
            <span>Your report is visible to eligible FindBack students.
              Private chats are limited to conversation participants.
              Arrange returns at a supervised campus location.</span>
          </div>

          <div *ngIf="errorMessage" class="error" role="alert">
            {{ errorMessage }}
          </div>

          <button class="submit" type="submit"
                  [disabled]="saving || choosingPhoto || webCameraOpen">
            <ion-icon name="cloud-upload-outline"></ion-icon>
            {{ saving ? 'Publishing report...' : 'Publish Report' }}
          </button>
        </form>
      </main>
    </ion-content>
  `,
  styles: [`
    ion-content { --background: #f4f8fe; --color: #102a43; }
    * { box-sizing: border-box; }
    button { font-family: inherit; cursor: pointer; }
    button:disabled { opacity: .55; cursor: not-allowed; }

    .page {
      max-width: 670px;
      margin: 0 auto;
      padding: calc(20px + var(--ion-safe-area-top, 0px)) 17px 45px;
    }

    .top {
      display: flex;
      gap: 13px;
      align-items: center;
      margin-bottom: 19px;
    }

    .back-button {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border: 1px solid #dce8f6;
      border-radius: 12px;
      color: #1769d2;
      background: white;
      font-size: 23px;
    }

    .top h1 { font-size: 23px; margin: 0 0 4px; }
    .top p { font-size: 11px; color: #8193a6; margin: 0; }

    .intro {
      padding: 20px;
      border-radius: 19px;
      color: white;
      background: linear-gradient(125deg, #1769d2, #148f62);
    }

    .intro h2 { margin: 0 0 8px; font-size: 22px; }
    .intro p {
      margin: 0;
      font-size: 12px;
      line-height: 1.65;
      color: #effff8;
    }

    .toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 18px 0;
    }

    .toggle button {
      min-height: 49px;
      border: 1px solid #e0eaf5;
      border-radius: 13px;
      background: white;
      color: #7190a8;
      font-weight: 800;
    }

    .toggle button.active {
      background: #1769d2;
      color: white;
      border-color: #1769d2;
    }

    .card {
      border: 1px solid #e0eaf5;
      border-radius: 19px;
      background: white;
      padding: 19px;
      margin-bottom: 15px;
    }

    /* PHOTO DESIGN */

    .photo-card { padding: 17px; }

    .photo-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 9px;
      margin-bottom: 14px;
    }

    .photo-heading h3 {
      margin: 0 0 5px;
      font-size: 14px;
      color: #122d48;
    }

    .photo-heading h3 span {
      font-weight: 500;
      color: #8094a8;
      font-size: 11px;
    }

    .photo-heading p {
      margin: 0;
      color: #8193a6;
      font-size: 11px;
      line-height: 1.5;
    }

    .photo-heading-icon {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      background: #e8f3ff;
      color: #1769d2;
      border-radius: 13px;
      flex-shrink: 0;
      font-size: 23px;
    }

    .photo-placeholder {
      min-height: 183px;
      border: 2px dashed #c9def1;
      background: #f6faff;
      border-radius: 17px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 7px;
      padding: 18px;
    }

    .placeholder-icon {
      width: 59px;
      height: 59px;
      background: white;
      box-shadow: 0 4px 16px #174b8c0a;
      border-radius: 18px;
      display: grid;
      place-items: center;
      color: #1769d2;
      font-size: 28px;
    }

    .photo-placeholder strong {
      font-size: 13px;
      color: #29465c;
    }

    .photo-placeholder span {
      color: #8296aa;
      font-size: 11px;
    }

    /* SELECTED IMAGE PREVIEW */

    .photo-preview {
      position: relative;
      border-radius: 17px;
      overflow: hidden;
      background: #edf4fb;
      border: 1px solid #dbe8f5;
    }

    .photo-preview img {
      display: block;
      width: 100%;
      max-height: 265px;
      min-height: 170px;
      object-fit: contain;
    }

    .photo-selected {
      position: absolute;
      top: 10px;
      left: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      background: #ecfff4;
      color: #0d8054;
      padding: 7px 10px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 750;
      box-shadow: 0 2px 8px #102a4310;
    }

    .remove-photo {
      position: absolute;
      right: 10px;
      bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      background: white;
      color: #a83f45;
      padding: 9px 11px;
      border: 0;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 750;
    }

    /* PHOTO ACTION BUTTONS */

    .photo-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 13px;
    }

    .photo-action {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 49px;
      padding: 9px;
      border-radius: 12px;
      border: 1px solid transparent;
      font-size: 12px;
      font-weight: 800;
    }

    .photo-action ion-icon {
      font-size: 19px;
      flex-shrink: 0;
    }

    .take-photo {
      background: #1769d2;
      color: white;
    }

    .gallery-photo {
      background: #e7f5ed;
      border-color: #d4eedd;
      color: #11794f;
    }

    .hidden-input {
      display: none !important;
    }

    .photo-help {
      display: block;
      margin: 12px 2px 0;
      color: #8a9aaa;
      font-size: 10px;
      line-height: 1.6;
    }

    /* FORM INPUTS */

    .fields-card label {
      display: block;
      margin: 15px 0 7px;
      color: #102a43;
      font-size: 12px;
      font-weight: 800;
    }

    .fields-card label:first-child { margin-top: 0; }
    .fields-card label b { color: #cf4e4e; }

    .fields-card input,
    .fields-card textarea,
    .fields-card select {
      display: block;
      width: 100%;
      border: 1px solid #d9e6f4;
      border-radius: 11px;
      padding: 12px;
      background: #f8fbff;
      color: #102a43;
      font: inherit;
      font-size: 13px;
    }

    .fields-card textarea { resize: vertical; }

    /* INFORMATION AND ERRORS */

    .notice {
      display: flex;
      gap: 9px;
      padding: 13px;
      margin: 17px 0;
      background: #e8f8ef;
      border-radius: 12px;
      color: #14734e;
      font-size: 11px;
      line-height: 1.65;
    }

    .notice ion-icon {
      font-size: 21px;
      flex-shrink: 0;
    }

    .error {
      background: #fff0f0;
      color: #aa3939;
      padding: 13px;
      border-radius: 11px;
      margin: 13px 0;
      font-size: 12px;
    }

    /* PUBLISH BUTTON */

    .submit {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      width: 100%;
      min-height: 54px;
      border: 0;
      border-radius: 13px;
      color: white;
      font-size: 14px;
      font-weight: 800;
      background: linear-gradient(125deg, #1769d2, #148f62);
    }

    /* BROWSER CAMERA MODAL */

    .camera-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: #061524d9;
    }

    .camera-dialog {
      width: 100%;
      max-width: 480px;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      padding: 14px;
      box-shadow: 0 18px 70px #0005;
    }

    .camera-dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      color: #18354e;
    }

    .camera-dialog-header button {
      border: 0;
      background: #edf3fb;
      border-radius: 10px;
      width: 37px;
      height: 37px;
      font-size: 20px;
    }

    .camera-dialog video {
      display: block;
      width: 100%;
      max-height: 57vh;
      border-radius: 12px;
      background: #182b3b;
      object-fit: contain;
    }

    .camera-dialog-actions {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      gap: 9px;
      margin-top: 12px;
    }

    .camera-dialog-actions button {
      min-height: 44px;
      border: 0;
      border-radius: 11px;
      font-weight: 800;
    }

    .cancel-camera {
      background: #eef4fb;
      color: #516779;
    }

    .capture-camera {
      background: #1769d2;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
    }

    @media(max-width: 360px) {
      .photo-actions { gap: 7px; }
      .photo-action { font-size: 11px; padding: 6px; }
      .photo-card { padding: 14px; }
    }
  `]
})
export class ReportPage implements OnInit, OnDestroy {

  @ViewChild('cameraInput')
  cameraInput?: ElementRef<HTMLInputElement>;

  @ViewChild('galleryInput')
  galleryInput?: ElementRef<HTMLInputElement>;

  @ViewChild('liveVideo')
  liveVideo?: ElementRef<HTMLVideoElement>;

  type: FindBackItemType = 'lost';

  readonly categories = [
    'Personal Belongings',
    'Identification Card',
    'Electronics',
    'Accessories',
    'Keys',
    'Documents',
    'Other'
  ];

  readonly today = new Date(
    Date.now() - new Date().getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10);

  form = {
    name: '',
    category: '',
    location: '',
    item_date: this.today,
    description: '',
    pickup_location: ''
  };

  photo: File | null = null;
  photoPreview = '';

  saving = false;
  choosingPhoto = false;
  webCameraOpen = false;
  errorMessage = '';

  private cameraStream: MediaStream | null = null;
  private destroyed = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly data: FindBackDataService,
    private readonly cdr: ChangeDetectorRef
  ) {
    addIcons({
      arrowBackOutline,
      cameraOutline,
      checkmarkCircleOutline,
      closeOutline,
      cloudUploadOutline,
      imagesOutline,
      informationCircleOutline,
      trashOutline
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.type = params.get('type') === 'found'
        ? 'found'
        : 'lost';
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.closeWebCamera();
    this.releasePhotoPreview();
  }

  // =====================================
  // TAKE PHOTO
  // =====================================

  async takePhoto(): Promise<void> {
    if (this.saving || this.choosingPhoto) return;

    this.errorMessage = '';

    // Android APK: use native camera.
    if (Capacitor.isNativePlatform()) {
      await this.getNativePhoto(CameraSource.Camera);
      return;
    }

    // Browser without webcam support.
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraInput?.nativeElement.click();
      return;
    }

    // Browser with webcam support.
    try {
      this.choosingPhoto = true;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        },
        audio: false
      });

      if (this.destroyed) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      this.cameraStream = stream;
      this.webCameraOpen = true;

      this.cdr.detectChanges();

      const video = this.liveVideo?.nativeElement;

      if (!video) {
        throw new Error('Unable to open camera preview.');
      }

      video.srcObject = stream;
      await video.play();

    } catch (error: unknown) {
      this.closeWebCamera();

      this.errorMessage = error instanceof Error
        ? `Camera unavailable: ${error.message}`
        : 'Unable to open the camera. Check camera permissions.';

    } finally {
      this.choosingPhoto = false;
    }
  }

  // =====================================
  // CHOOSE FROM GALLERY
  // =====================================

  async chooseFromGallery(): Promise<void> {
    if (this.saving || this.choosingPhoto) return;

    this.errorMessage = '';

    if (Capacitor.isNativePlatform()) {
      await this.getNativePhoto(CameraSource.Photos);
    } else {
      this.galleryInput?.nativeElement.click();
    }
  }

  // =====================================
  // NATIVE CAMERA / GALLERY
  // =====================================

  private async getNativePhoto(source: CameraSource): Promise<void> {
    this.choosingPhoto = true;
    this.errorMessage = '';

    try {
      const result = await Camera.getPhoto({
        source,
        resultType: CameraResultType.Base64,
        quality: 78,
        width: 1280,
        height: 1280,
        allowEditing: false,
        correctOrientation: true
      });

      if (!result.base64String) {
        throw new Error('No image was selected.');
      }

      const format = result.format.toLowerCase();

      const mime = format === 'png'
        ? 'image/png'
        : 'image/jpeg';

      if (!['png', 'jpeg', 'jpg'].includes(format)) {
        throw new Error('Please select a JPG or PNG image.');
      }

      const binary = atob(result.base64String);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const file = new File(
        [bytes],
        `findback-item-${Date.now()}.${format === 'png' ? 'png' : 'jpg'}`,
        { type: mime }
      );

      this.setSelectedPhoto(file);

    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : 'Unable to select photo.';

      if (!/cancel/i.test(message)) {
        this.errorMessage = message;
      }

    } finally {
      this.choosingPhoto = false;
    }
  }

  // =====================================
  // BROWSER GALLERY / CAMERA INPUT
  // =====================================

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.setSelectedPhoto(file);
    }

    input.value = '';
  }

  // =====================================
  // CAPTURE BROWSER CAMERA IMAGE
  // =====================================

  async captureWebPhoto(): Promise<void> {
    const video = this.liveVideo?.nativeElement;

    if (
      !video ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      this.errorMessage = 'Camera is not ready. Try again.';
      return;
    }

    const maxSize = 1280;

    const ratio = Math.min(
      1,
      maxSize / Math.max(video.videoWidth, video.videoHeight)
    );

    const canvas = document.createElement('canvas');

    canvas.width = Math.round(video.videoWidth * ratio);
    canvas.height = Math.round(video.videoHeight * ratio);

    const context = canvas.getContext('2d');

    if (!context) {
      this.errorMessage = 'Unable to capture image.';
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.78);
    });

    if (!blob) {
      this.errorMessage = 'Unable to save camera image.';
      return;
    }

    const file = new File(
      [blob],
      `findback-item-${Date.now()}.jpg`,
      { type: 'image/jpeg' }
    );

    this.closeWebCamera();
    this.setSelectedPhoto(file);
  }

  // =====================================
  // CLOSE WEB CAMERA
  // =====================================

  closeWebCamera(): void {
    this.cameraStream?.getTracks().forEach(track => track.stop());
    this.cameraStream = null;

    const video = this.liveVideo?.nativeElement;

    if (video) {
      video.srcObject = null;
    }

    this.webCameraOpen = false;
  }

  // =====================================
  // VALIDATE SELECTED PHOTO
  // =====================================

  private setSelectedPhoto(file: File): void {
    this.errorMessage = '';

    if (
      ![
        'image/jpeg',
        'image/png',
        'image/webp'
      ].includes(file.type)
    ) {
      this.errorMessage =
        'Please choose a JPG, PNG or WebP image.';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage =
        'The selected photo must be 5 MB or smaller.';
      return;
    }

    this.releasePhotoPreview();

    this.photo = file;
    this.photoPreview = URL.createObjectURL(file);
  }

  // =====================================
  // REMOVE PREVIEW URL
  // =====================================

  private releasePhotoPreview(): void {
    if (this.photoPreview) {
      URL.revokeObjectURL(this.photoPreview);
    }

    this.photoPreview = '';
  }

  // =====================================
  // REMOVE SELECTED PHOTO
  // =====================================

  clearPhoto(): void {
    if (this.saving) return;

    this.releasePhotoPreview();
    this.photo = null;
  }

  // =====================================
  // PUBLISH REPORT TO SUPABASE
  // =====================================

  async submit(): Promise<void> {
    if (
      this.saving ||
      this.choosingPhoto ||
      this.webCameraOpen
    ) {
      return;
    }

    this.errorMessage = '';

    if (
      !this.form.name.trim() ||
      !this.form.category ||
      !this.form.location.trim() ||
      !this.form.item_date
    ) {
      this.errorMessage =
        'Please complete all required fields.';
      return;
    }

    this.saving = true;

    try {
      await this.data.createReport({
        item_type: this.type,
        name: this.form.name,
        category: this.form.category,
        location: this.form.location,
        item_date: this.form.item_date,
        description: this.form.description,
        pickup_location: this.form.pickup_location,
        photo: this.photo
      });

      this.clearUploadedPhoto();

      await this.router.navigateByUrl('/home');

    } catch (error: unknown) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'Unable to publish report.';

    } finally {
      this.saving = false;
    }
  }

  // =====================================
  // CLEAR PHOTO AFTER SUCCESS
  // =====================================

  private clearUploadedPhoto(): void {
    this.releasePhotoPreview();
    this.photo = null;
  }

  // =====================================
  // BACK TO DASHBOARD
  // =====================================

  back(): void {
    this.closeWebCamera();
    void this.router.navigateByUrl('/home');
  }
}
