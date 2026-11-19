import { CommonModule } from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  AlertController,
  LoadingController,
  ToastController,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonSearchbar,
  IonToolbar
} from '@ionic/angular';

import { RealtimeChannel } from '@supabase/supabase-js';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';

import {
  sparklesOutline,
  notificationsOutline,
  searchOutline,
  addCircleOutline,
  locationOutline,
  arrowForwardOutline,
  chevronForwardOutline,
  shieldCheckmarkOutline,
  closeOutline,
  personOutline,
  personCircleOutline,
  calendarOutline,
  chatbubbleEllipsesOutline,
  chatbubblesOutline,
  informationCircleOutline,
  cubeOutline,
  checkmarkCircleOutline,
  alertCircleOutline
} from 'ionicons/icons';

import {
  MessageAlertService
} from '../services/message-alert.service';

import {
  ClaimService
} from '../services/claim.service';

import {
  SimilarMatchService,
  SimilarMatchAlert
} from '../services/similar-match.service';

import {
  FindBackDataService,
  FindBackItemType,
  FindBackReport
} from '../services/findback-data.service';

type Item = FindBackReport & {
  type: FindBackItemType;
  date: string;
  photo: string | null;
  emoji: string;
  fullName: string;
  pickupLocation: string;
};

@Component({
  selector: 'app-home',

  templateUrl: 'home.page.html',

  styleUrls: ['home.page.scss'],

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonIcon,
    IonSearchbar,
    IonModal
  ],

  styles: [`

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .profile-nav-btn,
    .messages-nav-btn {
      height: 43px;
      width: 43px;
      display: grid;
      place-items: center;
      border: 1px solid #c9ead9;
      border-radius: 14px;
      background: #e8f8ef;
      color: #148f62;
      cursor: pointer;
    }

    .messages-nav-btn {
      background: #edf6ff;
      color: #1769d2;
      border-color: #dce9fa;
    }

    .profile-nav-btn ion-icon,
    .messages-nav-btn ion-icon {
      font-size: 25px;
    }

    .live-status {
      font-size: 12px;
      color: #627d91;
      margin: 12px 2px;
    }

    .feed-error {
      color: #ae3740;
      background: #fff1f1;
      padding: 14px;
      border-radius: 12px;
      font-size: 12px;
    }

    .feed-error button {
      background: white;
      border: 1px solid #eed0d0;
      border-radius: 9px;
      padding: 9px 12px;
      color: #aa3640;
    }

    .contact-action {
      width: 100%;
      min-height: 48px;
      border: 0;
      border-radius: 12px;
      background: linear-gradient(
        125deg,
        #1769d2,
        #148f62
      );
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 9px;
      font-weight: 800;
      margin-top: 15px;
    }

    .contact-action:disabled {
      opacity: .55;
    }

    .safe-chat-note {
      color: #536980;
      font-size: 11px;
      line-height: 1.6;
    }

    /* CLAIMS BUTTON */

    .claims-nav-btn {
      position: relative;
      border: 1px solid #d9e6f3;
      border-radius: 13px;
      background: #edf6ff;
      color: #1769d2;
      padding: 8px 10px;
      font-size: 11px;
      font-weight: 800;
    }

    .claims-badge {
      position: absolute;
      top: -7px;
      right: -6px;
      border: 2px solid white;
      background: #e63e55;
      color: white;
      min-width: 20px;
      height: 20px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      font-size: 10px;
    }

    /* REQUEST CLAIM */

    .claim-request-button {
      width: 100%;
      min-height: 47px;
      border-radius: 12px;
      border: 1px solid #b9e0d2;
      color: #0c885c;
      background: #e9f8ef;
      font-size: 13px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 12px;
    }

    .claim-request-button ion-icon {
      font-size: 18px;
    }

    /* CLAIMED ITEMS PROMOTION */

    .claims-promo {
      margin: 16px 0;
      padding: 16px;
      border-radius: 16px;
      background: linear-gradient(
        120deg,
        #e7f3ff,
        #e8f8ee
      );
      border: 1px solid #d8ebf4;
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
    }

    .claims-promo h3 {
      margin: 0 0 5px;
      color: #163b53;
      font-size: 15px;
    }

    .claims-promo p {
      margin: 0;
      color: #637f8e;
      font-size: 11px;
      line-height: 1.5;
    }

    .claims-promo button {
      border: 0;
      border-radius: 11px;
      padding: 11px;
      color: white;
      background: #1678bc;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
    }

    /* SIMILAR ITEM NOTIFICATION BADGE */

    .notification-btn {
      position: relative;
      overflow: visible;
    }

    .match-badge {
      position: absolute;
      top: -7px;
      right: -7px;
      min-width: 20px;
      height: 20px;
      padding: 0 5px;
      background: #ed3f58;
      border: 2px solid #fff;
      border-radius: 12px;
      color: #fff;
      font-size: 10px;
      font-weight: 800;
      display: grid;
      place-items: center;
      line-height: 1;
      box-shadow: 0 3px 9px rgba(
        210,44,72,.3
      );
    }

    /* NOTIFICATION MODAL */

    .matches-shell {
      height: 100%;
      overflow-y: auto;
      background: #f5f9fe;
      color: #183249;
    }

    .matches-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 24px 20px 17px;
      background: white;
      border-bottom: 1px solid #e3edf7;
    }

    .matches-header-icon {
      width: 47px;
      height: 47px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      border-radius: 15px;
      background: #e6f4ff;
      color: #1769d2;
      font-size: 24px;
    }

    .matches-header-text {
      min-width: 0;
      flex: 1;
    }

    .matches-header-text h2 {
      margin: 0 0 3px;
      font-size: 19px;
      font-weight: 850;
    }

    .matches-header-text p {
      margin: 0;
      font-size: 11px;
      color: #748a9f;
    }

    .matches-close {
      width: 37px;
      height: 37px;
      border: 0;
      border-radius: 11px;
      background: #edf3fb;
      color: #41637c;
      font-size: 20px;
    }

    .matches-body {
      padding: 15px;
    }

    .matches-explain {
      background: #eaf5ff;
      color: #426680;
      border-radius: 13px;
      font-size: 11px;
      line-height: 1.6;
      padding: 12px 14px;
      margin: 0 0 14px;
    }

    .match-card {
      display: flex;
      width: 100%;
      text-align: left;
      gap: 11px;
      align-items: flex-start;
      border: 1px solid #dfeaf5;
      border-radius: 15px;
      background: white;
      padding: 14px;
      margin-bottom: 10px;
      cursor: pointer;
    }

    .match-card.unread {
      border-color: #91c1f5;
      background: #f7fbff;
      box-shadow: 0 4px 15px rgba(
        26,103,182,.06
      );
    }

    .match-symbol {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      border-radius: 13px;
      background: #e5f5ed;
      color: #11865c;
      font-size: 21px;
    }

    .match-content {
      flex: 1;
      min-width: 0;
    }

    .match-content strong {
      display: block;
      color: #193953;
      font-size: 13px;
      margin: 1px 0 5px;
    }

    .match-content p {
      margin: 0 0 7px;
      font-size: 11px;
      line-height: 1.55;
      color: #647e92;
      overflow-wrap: anywhere;
    }

    .match-content small {
      color: #94a6b8;
      font-size: 10px;
    }

    .match-unread-dot {
      display: block;
      width: 9px;
      height: 9px;
      background: #1769d2;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 10px;
    }

    .matches-empty {
      text-align: center;
      padding: 64px 15px;
    }

    .matches-empty ion-icon {
      color: #9eb5c8;
      font-size: 46px;
    }

    .matches-empty h3 {
      font-size: 16px;
      margin: 14px 0 6px;
    }

    .matches-empty p {
      font-size: 12px;
      color: #8195a8;
      line-height: 1.6;
    }

    .matches-error {
      color: #b43d48;
      font-size: 12px;
      padding: 12px;
    }

    .matches-loading {
      color: #647d92;
      font-size: 12px;
      padding: 18px;
      text-align: center;
    }

    @media (max-width: 390px) {
      .header-actions {
        gap: 5px;
      }

      .profile-nav-btn,
      .messages-nav-btn {
        width: 38px;
        height: 38px;
      }
    }

  `]
})
export class HomePage implements OnInit, OnDestroy {

  selectedFilter:
    'all' | FindBackItemType = 'all';

  searchTerm = '';

  selectedItem: Item | null = null;

  messageStatus = '';

  loadingReports = false;

  openingChat = false;

  feedError = '';

  myUserId = '';

  items: Item[] = [];

  private channel: RealtimeChannel | null = null;

  private requestCount = 0;

  // =====================================
  // CLAIM NOTIFICATION COUNT
  // =====================================

  claimsActionCount = 0;

  private claimChannel:
    RealtimeChannel | null = null;

  // =====================================
  // SIMILAR MATCH NOTIFICATIONS
  // =====================================

  matchNotifications: SimilarMatchAlert[] = [];

  unreadMatchCount = 0;

  matchNotificationsOpen = false;

  matchLoading = false;

  matchError = '';

  openingMatchedReport = false;

  private matchStateSub?: Subscription;

  private newMatchSub?: Subscription;

  @ViewChild('matchesModal', {
    read: IonModal
  })
  private matchesModal?: IonModal;

  // =====================================
  // ITEM DETAILS MODAL
  // =====================================

  @ViewChild('itemDetailsModal', {
    read: IonModal
  })
  private itemDetailsModal?: IonModal;

  private chatAttempt = 0;

  private dismissingForNavigation = false;

  private currentLoader:
    HTMLIonLoadingElement | null = null;

  constructor(
    private readonly router: Router,
    private readonly alerts: AlertController,
    private readonly loadingController: LoadingController,
    private readonly toasts: ToastController,
    private readonly similarMatches: SimilarMatchService,
    private readonly claims: ClaimService,
    private readonly data: FindBackDataService,
    private readonly messageAlerts: MessageAlertService,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {

    this.installLoadingStyles();

    addIcons({
      sparklesOutline,
      notificationsOutline,
      searchOutline,
      addCircleOutline,
      locationOutline,
      arrowForwardOutline,
      chevronForwardOutline,
      shieldCheckmarkOutline,
      closeOutline,
      personOutline,
      personCircleOutline,
      calendarOutline,
      chatbubbleEllipsesOutline,
      chatbubblesOutline,
      informationCircleOutline,
      cubeOutline,
      checkmarkCircleOutline,
      alertCircleOutline
    });
  }

  // =====================================
  // INITIALIZE DASHBOARD
  // =====================================

  ngOnInit(): void {

    this.matchStateSub =
      this.similarMatches.state$.subscribe(state => {

        this.matchNotifications =
          state.notifications;

        this.unreadMatchCount =
          state.unreadCount;

        this.cdr.markForCheck();
      });

    this.newMatchSub =
      this.similarMatches.newMatch$.subscribe(match => {

        this.zone.run(() => {

          void this.showNewMatchToast(match);

        });
      });

    void this.similarMatches.start().catch(error => {

      this.matchError =
        error instanceof Error
          ? error.message
          : 'Cannot load alerts.';

      this.cdr.markForCheck();
    });

    void this.messageAlerts.start();

    void this.refreshClaimCount();

    this.claimChannel =
      this.claims.subscribe(() => {

        this.zone.run(() => {

          void this.refreshClaimCount();

        });

      });

    void this.loadItems();

    this.channel =
      this.data.subscribeReports(() => {

        this.zone.run(() => {

          void this.loadItems();

        });

      });
  }

  ionViewWillEnter(): void {

    void this.similarMatches.start()
      .then(() => this.similarMatches.refresh())
      .catch(() => {});

    void this.messageAlerts.start();

    void this.refreshClaimCount();

    void this.loadItems();
  }

  // =====================================
  // CLEANUP REALTIME
  // =====================================

  ngOnDestroy(): void {

    void this.data.unsubscribe(
      this.channel
    );

    void this.claims.unsubscribe(
      this.claimChannel
    );

    this.matchStateSub?.unsubscribe();

    this.newMatchSub?.unsubscribe();
  }

  // =====================================
  // LOAD SHARED REPORTS
  // =====================================

  async loadItems(): Promise<void> {

    const request = ++this.requestCount;

    this.loadingReports = true;

    this.feedError = '';

    try {

      this.myUserId =
        await this.data.currentUserId();

      const reports =
        await this.data.getReports();

      if (request !== this.requestCount) {
        return;
      }

      // Defensive filter: claimed/returned reports must never
      // reappear in the active dashboard even from stale data.
      this.items = reports
        .filter(item => item.status === 'active')
        .map(item => this.toDashboardItem(item));

    } catch (error: unknown) {

      if (request === this.requestCount) {

        this.feedError =
          error instanceof Error
            ? error.message
            : 'Unable to retrieve shared reports.';

      }

    } finally {

      if (request === this.requestCount) {

        this.loadingReports = false;

        this.zone.run(() => {

          this.cdr.markForCheck();

        });
      }
    }
  }

  // =====================================
  // DASHBOARD COUNTS
  // =====================================

  get lostCount(): number {

    return this.items.filter(
      i => i.item_type === 'lost'
    ).length;
  }

  get foundCount(): number {

    return this.items.filter(
      i => i.item_type === 'found'
    ).length;
  }

  // =====================================
  // SEARCH AND FILTER
  // =====================================

  get filteredItems(): Item[] {

    const term =
      this.searchTerm.trim().toLowerCase();

    return this.items.filter(item =>

      (
        this.selectedFilter === 'all' ||
        item.item_type === this.selectedFilter
      )

      &&

      [
        item.name,
        item.category,
        item.location,
        item.description
      ].some(
        value =>
          value.toLowerCase().includes(term)
      )
    );
  }

  setFilter(
    filter: 'all' | FindBackItemType
  ): void {

    this.selectedFilter = filter;
  }

  onSearch(event: any): void {

    this.searchTerm =
      event.detail.value || '';
  }

  // =====================================
  // NAVIGATION
  // =====================================

  openReport(
    type: FindBackItemType
  ): void {

    void this.router.navigate(
      ['/report'],
      {
        queryParams: {
          type
        }
      }
    );
  }

  openProfile(): void {

    void this.router.navigateByUrl(
      '/profile'
    );
  }

  openMessages(): void {

    void this.router.navigateByUrl(
      '/messages'
    );
  }

  openClaims(): void {

    void this.router.navigateByUrl(
      '/claims'
    );
  }

  // =====================================
  // REFRESH CLAIM COUNT
  // =====================================

  private async refreshClaimCount(): Promise<void> {

    try {

      this.claimsActionCount =
        await this.claims.getActionCount();

      this.cdr.markForCheck();

    } catch {
      // Detailed error available
      // in the Claims page.
    }
  }

  // =====================================
  // REQUEST CLAIM FROM FOUND REPORT
  // =====================================

  async requestClaimFromItem(): Promise<void> {

    const item = this.selectedItem;

    if (
      !item ||
      item.item_type !== 'found' ||
      item.status !== 'active' ||
      item.owner_id === this.myUserId ||
      this.openingChat
    ) {
      return;
    }

    this.dismissingForNavigation = true;

    try {

      if (this.itemDetailsModal) {

        await this.itemDetailsModal.dismiss(
          undefined,
          'open-claims'
        );
      }

      this.selectedItem = null;

      this.messageStatus = '';

      this.cdr.detectChanges();

    } finally {

      this.dismissingForNavigation = false;

    }

    await this.router.navigate(
      ['/claims'],
      {
        queryParams: {
          found: item.id
        }
      }
    );
  }

  // =====================================
  // ITEM DETAILS
  // =====================================

  openItem(item: Item): void {

    this.selectedItem = item;

    this.messageStatus = '';
  }

  closeItemModal(): void {

    if (this.dismissingForNavigation) {

      this.selectedItem = null;

      this.messageStatus = '';

      return;
    }

    this.chatAttempt++;

    this.openingChat = false;

    this.selectedItem = null;

    this.messageStatus = '';

    if (this.currentLoader) {

      void this.currentLoader.dismiss();

      this.currentLoader = null;
    }

    if (this.itemDetailsModal) {

      void this.itemDetailsModal.dismiss();

    }

    this.cdr.markForCheck();
  }

  // =====================================
  // OPEN PRIVATE CHAT WITH LOADING
  // =====================================

  async messageOwner(): Promise<void> {

    if (
      !this.selectedItem ||
      this.openingChat
    ) {
      return;
    }

    const report = this.selectedItem;

    const attempt =
      ++this.chatAttempt;

    this.openingChat = true;

    this.messageStatus = '';

    this.cdr.detectChanges();

    let loader:
      HTMLIonLoadingElement | null = null;

    let detailsClosed = false;

    try {

      loader =
        await this.loadingController.create({

          cssClass:
            'findback-chat-loading',

          spinner:
            'crescent',

          message:
            'Opening private chat...',

          backdropDismiss: false,

          keyboardClose: false,

          showBackdrop: true,

          htmlAttributes: {
            'aria-label':
              'Opening private chat'
          }
        });

      this.currentLoader = loader;

      if (attempt !== this.chatAttempt) {
        return;
      }

      await loader.present();

      if (attempt !== this.chatAttempt) {
        return;
      }

      const conversationId =
        await this.data.getOrCreateConversation(
          report
        );

      if (attempt !== this.chatAttempt) {
        return;
      }

      await loader.dismiss();

      this.currentLoader = null;

      loader = null;

      // Close Item Details before navigation.
      this.dismissingForNavigation = true;

      try {

        if (this.itemDetailsModal) {

          await this.itemDetailsModal.dismiss(
            undefined,
            'open-chat'
          );

        }

        this.selectedItem = null;

        this.messageStatus = '';

        this.cdr.detectChanges();

        detailsClosed = true;

      } finally {

        this.dismissingForNavigation = false;

      }

      if (attempt !== this.chatAttempt) {
        return;
      }

      const navigated =
        await this.router.navigate([
          '/messages',
          conversationId
        ]);

      if (!navigated) {

        throw new Error(
          'Unable to open the chat page. Please try again.'
        );

      }

    } catch (error: unknown) {

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to open private chat. Please try again.';

      if (attempt === this.chatAttempt) {

        if (detailsClosed) {

          const alert =
            await this.alerts.create({

              header:
                'Chat unavailable',

              message,

              buttons: ['OK']

            });

          await alert.present();

        } else {

          this.messageStatus = message;

        }
      }

    } finally {

      if (loader) {

        try {

          await loader.dismiss();

        } catch {
          // Already dismissed.
        }
      }

      if (attempt === this.chatAttempt) {

        this.currentLoader = null;

        this.openingChat = false;

        this.cdr.markForCheck();

      }
    }
  }

  // =====================================
  // CHAT LOADING OVERLAY STYLES
  // =====================================

  private installLoadingStyles(): void {

    if (
      typeof document === 'undefined' ||
      document.getElementById(
        'findback-chat-loading-styles'
      )
    ) {
      return;
    }

    const style =
      document.createElement('style');

    style.id =
      'findback-chat-loading-styles';

    style.textContent = `

      ion-loading.findback-chat-loading {
        --background: #ffffff;
        --color: #153753;
        --spinner-color: #138d70;
        --backdrop-opacity: .52;
      }

      ion-loading.findback-chat-loading .loading-wrapper {
        border-radius: 24px !important;
        padding: 27px 25px !important;
        min-width: min(82vw, 295px);
        box-shadow:
          0 24px 65px rgba(13,39,62,.24)
          !important;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      ion-loading.findback-chat-loading .loading-spinner {
        margin: 0 auto;
        transform: scale(1.3);
      }

      ion-loading.findback-chat-loading .loading-content {
        text-align: center;
        margin: 6px 0 0 !important;
        font-weight: 750;
        font-size: 14px;
        letter-spacing: -.2px;
      }

    `;

    document.head.appendChild(style);
  }

  // =====================================
  // DASHBOARD ITEM CONVERTER
  // =====================================

  private toDashboardItem(
    item: FindBackReport
  ): Item {

    return {

      ...item,

      type: item.item_type,

      date: new Date(
        item.item_date + 'T12:00:00'
      ).toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }
      ),

      photo:
        item.photo_url || null,

      emoji: item.item_type === 'lost'
        ? '🔎'
        : '📦',

      fullName:
        'Campus student',

      pickupLocation:
        item.pickup_location

    };
  }

  // =====================================
  // SIMILAR ITEM NOTIFICATIONS
  // =====================================

  async showNotifications(): Promise<void> {

    this.matchNotificationsOpen = true;

    this.matchLoading = true;

    this.matchError = '';

    try {

      await this.similarMatches.start();

      await this.similarMatches.refresh();

    } catch (error: unknown) {

      this.matchError =
        error instanceof Error
          ? error.message
          : 'Unable to load alerts.';

    } finally {

      this.matchLoading = false;

      this.cdr.markForCheck();

    }
  }

  closeMatchNotifications(): void {

    this.matchNotificationsOpen = false;

    void this.matchesModal?.dismiss();
  }

  // =====================================
  // VIEW MATCHED FOUND ITEM
  // =====================================

  async viewMatchedFound(
    match: SimilarMatchAlert
  ): Promise<void> {

    if (this.openingMatchedReport) {
      return;
    }

    this.openingMatchedReport = true;

    this.matchError = '';

    try {

      const existing =
        this.items.find(
          item =>
            item.id === match.found_report_id
        );

      const found = existing ||
        this.toDashboardItem(
          await this.similarMatches.getFoundReport(
            match.found_report_id
          )
        );

      await this.similarMatches.markRead(
        match.id
      );

      if (this.matchesModal) {

        await this.matchesModal.dismiss();

      }

      this.matchNotificationsOpen = false;

      this.cdr.detectChanges();

      this.openItem(found);

    } catch (error: unknown) {

      this.matchError =
        error instanceof Error
          ? error.message
          : 'Unable to open this found item.';

    } finally {

      this.openingMatchedReport = false;

      this.cdr.markForCheck();

    }
  }

  // =====================================
  // FORMAT NOTIFICATION DATE
  // =====================================

  formatMatchDate(
    value: string
  ): string {

    return new Date(value).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    );
  }

  // =====================================
  // NEW SIMILAR MATCH TOAST
  // =====================================

  private async showNewMatchToast(
    match: SimilarMatchAlert
  ): Promise<void> {

    const toast =
      await this.toasts.create({

        message:
          `Possible match found: ${match.found_item_name}`,

        position:
          'top',

        duration:
          5500,

        color:
          'success',

        buttons: [

          {
            text: 'View',

            handler: () => {

              void this.showNotifications();

            }
          },

          {
            text: 'Close',
            role: 'cancel'
          }

        ]
      });

    await toast.present();
  }
}