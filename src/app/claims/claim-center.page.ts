
import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import {
  AlertController,
  IonContent,
  IonIcon,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  shieldCheckmarkOutline,
  checkmarkCircleOutline,
  refreshOutline,
  checkmarkDoneOutline
} from 'ionicons/icons';

import {
  ClaimService,
  ClaimReportChoice,
  FindBackClaim,
  ClaimedItemHistory
} from '../services/claim.service';

type ClaimTab =
  | 'mine'
  | 'review'
  | 'claimed';

@Component({
  selector: 'app-claim-center',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon
  ],

  template: `
    <ion-content [fullscreen]="true">
      <main class="page">

        <header class="heading">
          <button
            class="back"
            type="button"
            (click)="back()"
            aria-label="Back to Dashboard">
            <ion-icon name="arrow-back-outline"></ion-icon>
          </button>

          <div>
            <h1>Secure Item Claiming</h1>
            <p>Verify ownership and record safe returns</p>
          </div>
        </header>

        <section class="hero">
          <ion-icon name="shield-checkmark-outline"></ion-icon>

          <div>
            <strong>Secure handover</strong>
            <p>
              Finder reviews your explanation.
              Confirm after receiving the item.
            </p>
          </div>
        </section>

        <div class="tabs" role="group" aria-label="Claim sections">
          <button
            type="button"
            [class.active]="tab==='mine'"
            (click)="tab='mine'">
            My Claims
          </button>

          <button
            type="button"
            [class.active]="tab==='review'"
            (click)="tab='review'">
            To Review
            <span *ngIf="pendingReview">
              {{ pendingReview }}
            </span>
          </button>

          <button
            type="button"
            [class.active]="tab==='claimed'"
            (click)="tab='claimed'">
            Claimed Items
          </button>
        </div>

        <div class="error" *ngIf="error" role="alert">
          {{ error }}
        </div>

        <button
          type="button"
          class="refresh"
          (click)="reload()"
          [disabled]="busy">
          <ion-icon name="refresh-outline"></ion-icon>
          {{ busy ? 'Working...' : 'Refresh claims' }}
        </button>

        <!-- NEW CLAIM REQUEST -->

        <section
          class="card request"
          *ngIf="foundReport && tab==='mine'">

          <div class="eyebrow">
            REQUEST OWNERSHIP VERIFICATION
          </div>

          <h2>{{ foundReport.name }}</h2>

          <p class="muted">
            Describe details that the finder did not publish.
            Do not enter passwords, ID numbers, or home addresses.
          </p>

          <label for="proof">
            Private ownership details *
          </label>

          <textarea
            id="proof"
            name="proof"
            rows="4"
            minlength="20"
            maxlength="600"
            [(ngModel)]="proof"
            placeholder="Example: hidden mark, contents, model, where and when it went missing...">
          </textarea>

          <p class="hint">
            Only you and the finder can read these details.
            20–600 characters.
          </p>

          <label for="lostLink">
            Link your Lost report (optional)
          </label>

          <select
            id="lostLink"
            name="lostLink"
            [(ngModel)]="lostId">

            <option value="">None</option>

            <option
              *ngFor="let lost of myLost"
              [value]="lost.id">
              {{ lost.name }}
            </option>
          </select>

          <label class="check">
            <input
              type="checkbox"
              [(ngModel)]="shareName"
              name="shareName">

            Show my registered name in public
            Claimed Items history after the return
            is complete.
          </label>

          <button
            type="button"
            class="primary"
            [disabled]="busy || proof.trim().length < 20"
            (click)="submitClaim()">
            Submit Claim Request
          </button>
        </section>

        <!-- MY CLAIMS -->

        <ng-container *ngIf="tab==='mine'">
          <h2 class="section">My Claim Requests</h2>

          <p *ngIf="!myClaims.length" class="empty">
            No claims yet. Open a Found report
            and select Request to Claim.
          </p>

          <article class="card" *ngFor="let claim of myClaims">
            <div class="card-top">
              <strong>{{ claim.found_name }}</strong>

              <span
                class="status"
                [attr.data-status]="claim.status">
                {{ statusLabel(claim.status) }}
              </span>
            </div>

            <p class="muted" *ngIf="claim.lost_name">
              Your Lost report: {{ claim.lost_name }}
            </p>

            <p class="muted">
              Requested
              {{ claim.created_at | date:'mediumDate' }}
            </p>

            <p
              class="hint"
              *ngIf="claim.status==='pending'">
              Waiting for the finder to review your ownership details.
            </p>

            <!-- NO CLAIM CODE REQUIRED -->

            <div
              *ngIf="
                claim.status==='approved' ||
                claim.status==='handover_confirmed'
              "
              class="receipt-panel">

              <p class="hint">
                Your ownership explanation was approved.
                Arrange a safe campus meetup with the finder.
                Tap the button only after the item has
                actually been returned to you.
              </p>

              <button
                type="button"
                class="primary"
                [disabled]="busy"
                (click)="confirmReceived(claim)">

                <ion-icon name="checkmark-done-outline"></ion-icon>

                Confirm Item Received
              </button>
            </div>

            <button
              *ngIf="claim.status==='pending'"
              class="text-action"
              type="button"
              [disabled]="busy"
              (click)="cancelClaim(claim)">
              Cancel Request
            </button>

            <p
              class="success"
              *ngIf="claim.status==='claimed'">
              Return completed and saved in Claimed Items.
            </p>
          </article>
        </ng-container>

        <!-- FINDER REVIEW -->

        <ng-container *ngIf="tab==='review'">
          <h2 class="section">
            Requests on My Found Items
          </h2>

          <p class="empty" *ngIf="!toReview.length">
            No requests for your Found reports yet.
          </p>

          <article class="card" *ngFor="let claim of toReview">

            <div class="card-top">
              <strong>{{ claim.found_name }}</strong>

              <span
                class="status"
                [attr.data-status]="claim.status">
                {{ statusLabel(claim.status) }}
              </span>
            </div>

            <p class="muted">
              Request received
              {{ claim.created_at | date:'medium' }}
            </p>

            <div class="proof">
              <b>
                Claimant's private ownership details
              </b>
              <p>{{ claim.ownership_proof }}</p>
            </div>

            <label
              class="check"
              *ngIf="claim.status==='pending'">

              <input
                type="checkbox"
                [(ngModel)]="finderSharing[claim.id]"
                [name]="'share-'+claim.id">

              Show my name publicly in
              Claimed Items history.
            </label>

            <div
              class="actions"
              *ngIf="claim.status==='pending'">

              <button
                type="button"
                class="primary"
                [disabled]="busy"
                (click)="review(claim,true)">
                Approve Claim
              </button>

              <button
                type="button"
                class="secondary"
                [disabled]="busy"
                (click)="review(claim,false)">
                Reject
              </button>
            </div>

            <p
              class="hint"
              *ngIf="
                claim.status==='approved' ||
                claim.status==='handover_confirmed'
              ">
              Claim approved. Arrange the return with
              the claimant. The item will be marked
              Claimed once the claimant confirms
              they received it.
            </p>

            <p
              class="success"
              *ngIf="claim.status==='claimed'">
              Item successfully returned.
            </p>
          </article>
        </ng-container>

        <!-- CLAIMED HISTORY -->

        <ng-container *ngIf="tab==='claimed'">
          <h2 class="section">Claimed Items History</h2>

          <p class="muted">
            Campus-visible return records.
            Names appear only with each student's permission.
          </p>

          <p *ngIf="!history.length" class="empty">
            No successfully claimed items yet.
          </p>

          <article class="card" *ngFor="let item of history">
            <div class="card-top">
              <strong>{{ item.item_name }}</strong>

              <span class="status" data-status="claimed">
                Claimed
              </span>
            </div>

            <p class="muted">
              {{ item.item_category }}
              ·
              {{ item.claimed_at | date:'mediumDate' }}
            </p>

            <div class="history-names">
              <div>
                <small>Found by</small>
                <strong>{{ item.finder_display }}</strong>
              </div>

              <div>
                <small>Claimed by</small>
                <strong>{{ item.claimant_display }}</strong>
              </div>
            </div>

            <p class="success">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
              Approved by finder and received by claimant
            </p>
          </article>
        </ng-container>

      </main>
    </ion-content>
  `,

  styles: [`
    ion-content {
      --background:#f4f8fe;
      --color:#17334a;
    }

    * { box-sizing:border-box; }

    button {
      font:inherit;
      cursor:pointer;
    }

    button:disabled {
      opacity:.52;
      cursor:not-allowed;
    }

    .page {
      max-width:720px;
      margin:auto;
      padding:calc(18px + var(--ion-safe-area-top,0px)) 16px 45px;
    }

    .heading {
      display:flex;
      align-items:center;
      gap:12px;
      margin-bottom:18px;
    }

    .heading h1 {
      font-size:21px;
      margin:0 0 4px;
    }

    .heading p,.muted {
      color:#6f8498;
      font-size:12px;
      line-height:1.6;
      margin:5px 0;
    }

    .back {
      width:44px;
      height:44px;
      border-radius:12px;
      border:1px solid #dce9f7;
      background:white;
      color:#1769d2;
      font-size:22px;
    }

    .hero {
      background:linear-gradient(120deg,#146fcb,#128e67);
      color:white;
      border-radius:17px;
      padding:18px;
      display:flex;
      gap:13px;
      align-items:center;
    }

    .hero ion-icon {
      font-size:31px;
      flex-shrink:0;
    }

    .hero strong { font-size:17px; }

    .hero p {
      font-size:12px;
      line-height:1.5;
      margin:4px 0 0;
    }

    .tabs {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:5px;
      margin:18px 0 12px;
      padding:5px;
      background:#e8eff7;
      border-radius:13px;
    }

    .tabs button {
      background:transparent;
      border:0;
      border-radius:10px;
      min-height:43px;
      color:#647d91;
      font-size:11px;
      font-weight:750;
      padding:6px;
    }

    .tabs button.active {
      background:white;
      color:#1769d2;
      box-shadow:0 3px 8px #17375410;
    }

    .tabs span {
      background:#e23f57;
      color:white;
      border-radius:8px;
      padding:2px 6px;
    }

    .card {
      border:1px solid #dfeaf4;
      border-radius:18px;
      background:white;
      padding:18px;
      margin:12px 0;
      box-shadow:0 3px 15px #143e6305;
    }

    .request { border-color:#b8d9f5; }

    .eyebrow {
      font-size:10px;
      font-weight:850;
      letter-spacing:1.1px;
      color:#178563;
    }

    .card h2,.section {
      font-size:17px;
      margin:10px 0;
    }

    .section { margin:23px 0 12px; }

    label {
      display:block;
      font-size:12px;
      font-weight:750;
      margin:15px 0 7px;
    }

    textarea,select,input[type=text] {
      width:100%;
      background:#f7faff;
      border:1px solid #d8e6f4;
      border-radius:11px;
      padding:12px;
      font:inherit;
      font-size:13px;
      color:#15344e;
    }

    textarea { resize:vertical; }

    .hint {
      color:#627e93;
      font-size:11px;
      line-height:1.6;
    }

    .check {
      display:flex;
      align-items:flex-start;
      gap:9px;
      font-weight:450;
      line-height:1.55;
      color:#547084;
    }

    .check input {
      width:17px;
      height:17px;
      flex-shrink:0;
      accent-color:#168967;
    }

    .primary,.secondary {
      border:0;
      border-radius:11px;
      padding:12px 15px;
      min-height:45px;
      font-size:12px;
      font-weight:800;
    }

    .primary {
      background:linear-gradient(115deg,#1769d2,#148f62);
      color:white;
    }

    .secondary {
      background:#e7f1fb;
      color:#1767b0;
    }

    .request .primary { width:100%; }

    .refresh {
      border:0;
      background:transparent;
      color:#1769d2;
      display:flex;
      align-items:center;
      gap:6px;
      font-weight:700;
      font-size:12px;
      margin-left:auto;
    }

    .error {
      background:#fff0f0;
      color:#b14046;
      padding:12px;
      border-radius:12px;
      font-size:12px;
      margin:10px 0;
    }

    .empty {
      background:#eef5fc;
      border-radius:14px;
      color:#748c9c;
      padding:22px 12px;
      text-align:center;
      font-size:12px;
    }

    .card-top {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
    }

    .card-top strong { font-size:15px; }

    .status {
      border-radius:30px;
      padding:5px 9px;
      font-size:10px;
      background:#eef3f8;
      color:#45627e;
      white-space:nowrap;
    }

    .status[data-status=approved] {
      color:#1468b6;
      background:#e5f3ff;
    }

    .status[data-status=claimed] {
      color:#0b8a5a;
      background:#e4f9ee;
    }

    .status[data-status=pending] {
      color:#9c6a15;
      background:#fff4dc;
    }

    .proof {
      background:#f7faff;
      border:1px solid #e3edf6;
      border-radius:12px;
      padding:12px;
      margin:12px 0;
      font-size:12px;
    }

    .proof p {
      overflow-wrap:anywhere;
      line-height:1.65;
      margin:9px 0 0;
    }

    .actions {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:9px;
      margin-top:12px;
    }

    .receipt-panel {
      background:#f4f9fd;
      border:1px solid #d8e8f5;
      border-radius:13px;
      padding:12px;
      margin-top:12px;
    }

    .receipt-panel .primary,
    .receipt-panel .secondary {
      width:100%;
      margin-top:8px;
    }

    .text-action {
      background:none;
      border:0;
      color:#b34a52;
      font-size:12px;
      padding:9px 0;
    }

    .success {
      color:#13865b;
      font-size:12px;
      display:flex;
      gap:6px;
      align-items:center;
    }

    .history-names {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
      margin:15px 0;
    }

    .history-names div {
      border-radius:12px;
      background:#f5f9fd;
      padding:12px;
    }

    .history-names small {
      display:block;
      color:#8095a8;
      font-size:10px;
      margin-bottom:5px;
    }

    .history-names strong {
      font-size:12px;
      overflow-wrap:anywhere;
    }
  `]
})
export class ClaimCenterPage implements OnInit, OnDestroy {

  tab: ClaimTab = 'mine';
  me = '';
  busy = false;
  error = '';

  foundReport: ClaimReportChoice | null = null;
  myLost: ClaimReportChoice[] = [];

  claims: FindBackClaim[] = [];
  history: ClaimedItemHistory[] = [];

  proof = '';
  lostId = '';
  shareName = false;

  finderSharing: Record<string, boolean> = {};

  private pollTimer:
    ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly service: ClaimService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly alerts: AlertController,
    private readonly toasts: ToastController
  ) {
    addIcons({
      arrowBackOutline,
      shieldCheckmarkOutline,
      checkmarkCircleOutline,
      refreshOutline,
      checkmarkDoneOutline
    });
  }

  get myClaims(): FindBackClaim[] {
    return this.claims.filter(
      c => c.claimant_id === this.me
    );
  }

  get toReview(): FindBackClaim[] {
    return this.claims.filter(
      c => c.finder_id === this.me
    );
  }

  get pendingReview(): number {
    return this.toReview.filter(
      c => c.status === 'pending'
    ).length;
  }

  async ngOnInit(): Promise<void> {
    const id =
      this.route.snapshot.queryParamMap.get('found');

    await this.reload();

    if (id) {
      try {
        const found =
          await this.service.getFoundReport(id);

        if (
          found.status !== 'active' ||
          found.owner_id === this.me
        ) {
          throw new Error(
            'This report is not available for claiming.'
          );
        }

        this.foundReport = found;
        this.tab = 'mine';

      } catch (error) {
        this.error = this.errorText(error);
      }
    }

    this.pollTimer = setInterval(() => {
      if (!this.busy && !document.hidden) {
        void this.refreshData().catch(() => {});
      }
    }, 15000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }

  private errorText(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'Unable to complete the request.';
  }

  private async refreshData(): Promise<void> {
    const me =
      await this.service.currentUserId();

    const [claims, history, lost] =
      await Promise.all([
        this.service.getClaims(),
        this.service.getClaimedHistory(),
        this.service.getMyLostReports()
      ]);

    if (
      me !== await this.service.currentUserId()
    ) {
      return;
    }

    this.me = me;
    this.claims = claims;
    this.history = history;
    this.myLost = lost;
  }

  async reload(): Promise<void> {
    if (this.busy) {
      return;
    }

    this.busy = true;
    this.error = '';

    try {
      await this.refreshData();

    } catch (error) {
      this.error = this.errorText(error);

    } finally {
      this.busy = false;
    }
  }

  private async perform(
    action: () => Promise<void>,
    message: string
  ): Promise<void> {
    if (this.busy) {
      return;
    }

    this.busy = true;
    this.error = '';

    try {
      await action();
      await this.refreshData();

      const toast = await this.toasts.create({
        message,
        duration: 2700,
        color: 'success',
        position: 'bottom'
      });

      await toast.present();

    } catch (error) {
      this.error = this.errorText(error);

    } finally {
      this.busy = false;
    }
  }

  async submitClaim(): Promise<void> {
    if (!this.foundReport) {
      return;
    }

    const found = this.foundReport;

    await this.perform(async () => {
      await this.service.requestClaim(
        found.id,
        this.proof,
        this.lostId || null,
        this.shareName
      );

      this.foundReport = null;
      this.proof = '';
      this.lostId = '';
      this.shareName = false;

    }, 'Claim request submitted.');
  }

  async review(
    claim: FindBackClaim,
    approve: boolean
  ): Promise<void> {

    const prompt = await this.alerts.create({
      header: approve
        ? 'Approve Claim?'
        : 'Reject Claim?',

      message: approve
        ? 'Approve only if the private explanation matches the item. The claimant must still confirm physical receipt before the item is marked Claimed.'
        : 'Reject this claim request?',

      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: approve ? 'Approve' : 'Reject',
          handler: () => {
            void this.perform(
              () => this.service.reviewClaim(
                claim.id,
                approve,
                !!this.finderSharing[claim.id]
              ),
              approve
                ? 'Claim approved.'
                : 'Claim rejected.'
            );
          }
        }
      ]
    });

    await prompt.present();
  }

  async confirmReceived(
    claim: FindBackClaim
  ): Promise<void> {

    const alert = await this.alerts.create({
      header: 'Have you received the item?',

      message:
        'Only confirm after the item has actually been returned to you. It will be marked Claimed and added to the public history.',

      buttons: [
        {
          text: 'Not Yet',
          role: 'cancel'
        },
        {
          text: 'Yes, Received',
          handler: () => {
            void this.perform(
              () => this.service.confirmReceipt(
                claim.id
              ),
              'Item successfully claimed!'
            );
          }
        }
      ]
    });

    await alert.present();
  }

  async cancelClaim(
    claim: FindBackClaim
  ): Promise<void> {
    await this.perform(
      () => this.service.cancel(claim.id),
      'Claim request cancelled.'
    );
  }

  statusLabel(status: string): string {
    return (
      {
        pending: 'Pending',
        approved: 'Approved',
        handover_confirmed: 'Awaiting Receipt',
        claimed: 'Claimed',
        rejected: 'Rejected',
        cancelled: 'Cancelled'
      } as Record<string, string>
    )[status] || status;
  }

  back(): void {
    void this.router.navigateByUrl('/home');
  }
}
