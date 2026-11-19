
import { CommonModule } from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  IonContent,
  IonIcon
} from '@ionic/angular';

import {
  RealtimeChannel
} from '@supabase/supabase-js';

import {
  Subscription
} from 'rxjs';

import {
  addIcons
} from 'ionicons';

import {
  arrowBackOutline,
  chatbubblesOutline,
  sendOutline,
  refreshOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';

import {
  FindBackConversation,
  FindBackDataService,
  FindBackMessage
} from '../services/findback-data.service';

import {
  MessageAlertService
} from '../services/message-alert.service';

@Component({
  selector: 'app-messages',

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

        <!-- HEADER -->

        <header class="top">

          <button
            type="button"
            aria-label="Go back"
            (click)="goBack()">

            <ion-icon
              name="arrow-back-outline">
            </ion-icon>

          </button>

          <div>

            <h1>
              {{
                conversationId
                  ? 'Private Chat'
                  : 'Messages'
              }}
            </h1>

            <p>
              {{
                conversationId
                  ? (
                      conversation?.report_name ||
                      'Loading conversation...'
                    )
                  : 'Your FindBack message box'
              }}
            </p>

          </div>

        </header>

        <!-- PRIVACY NOTICE -->

        <div class="notice">

          <ion-icon
            name="shield-checkmark-outline">
          </ion-icon>

          Only the two conversation participants
          can read these messages.

        </div>

        <!-- ERROR -->

        <div
          *ngIf="errorMessage"
          class="error"
          role="alert">

          {{ errorMessage }}

          <button
            type="button"
            (click)="reload()">

            Retry

          </button>

        </div>

        <!-- LOADING -->

        <p
          class="loading"
          *ngIf="loading">

          Loading messages...

        </p>

        <!-- ================================= -->
        <!-- CONVERSATION INBOX -->
        <!-- ================================= -->

        <section
          *ngIf="
            !conversationId &&
            !loading
          "
          class="inbox">

          <!-- EMPTY INBOX -->

          <p
            class="empty"
            *ngIf="
              conversations.length === 0 &&
              !errorMessage
            ">

            No conversations yet.

            Open an item report and tap
            Open Private Chat.

            If someone messages you about
            your report, it will appear here.

          </p>

          <!-- CONVERSATION CARDS -->

          <button
            type="button"
            class="conversation-card"
            *ngFor="let chat of conversations"
            (click)="openChat(chat.id)">

            <span class="avatar">

              <ion-icon
                name="chatbubbles-outline">
              </ion-icon>

            </span>

            <span class="conversation-content">

              <strong>
                {{ chat.report_name }}
              </strong>

              <small>
                {{
                  chat.owner_id === myUserId
                    ? 'Student interested in your item'
                    : 'Item reporter / finder'
                }}
              </small>

              <small>
                {{
                  chat.last_message_at |
                  date:'medium'
                }}
              </small>

            </span>

            <span class="chevron">
              ›
            </span>

          </button>

        </section>

        <!-- ================================= -->
        <!-- PRIVATE CHAT THREAD -->
        <!-- ================================= -->

        <section
          *ngIf="conversationId"
          class="thread">

          <!-- CHAT MESSAGES -->

          <div
            class="messages"
            aria-live="polite">

            <!-- NO MESSAGES -->

            <p
              class="empty"
              *ngIf="
                !loading &&
                !errorMessage &&
                messages.length === 0
              ">

              Start the conversation by asking
              about the item.

            </p>

            <!-- MESSAGE BUBBLES -->

            <div
              *ngFor="
                let message of messages;
                trackBy: trackMessage
              "
              class="bubble-row"
              [class.mine]="
                message.sender_id === myUserId
              "
              [class.pending]="
                message.id.startsWith('pending-')
              ">

              <div class="bubble">

                <span class="sender">
                  {{
                    message.sender_id === myUserId
                      ? 'You'
                      : 'Other student'
                  }}
                </span>

                <p>
                  {{ message.body }}
                </p>

                <time>
                  {{
                    message.created_at |
                    date:'short'
                  }}
                </time>

              </div>

            </div>

          </div>

          <!-- ================================= -->
          <!-- MESSAGE INPUT -->
          <!-- ================================= -->

          <form
            class="compose"
            (ngSubmit)="send()">

            <label for="messageText">
              Your message
            </label>

            <textarea
              id="messageText"
              name="messageText"
              rows="3"
              maxlength="500"
              [(ngModel)]="draft"
              placeholder="Hello! I have a question about this item..."
              [disabled]="sending"
              required>
            </textarea>

            <div class="compose-foot">

              <small>
                {{ draft.length }}/500
              </small>

              <button
                type="submit"
                [disabled]="
                  sending ||
                  !draft.trim()
                ">

                <ion-icon
                  name="send-outline">
                </ion-icon>

                {{
                  sending
                    ? 'Sending...'
                    : 'Send Message'
                }}

              </button>

            </div>

          </form>

          <!-- SAFETY NOTICE -->

          <p class="safety">

            Arrange item returns at a supervised
            campus location.

            Do not share passwords,
            home addresses, or student ID numbers.

          </p>

        </section>

      </main>

    </ion-content>
  `,

  styles: [`

    ion-content {
      --background: #f4f9ff;
      --color: #102a43;
    }

    * {
      box-sizing: border-box;
    }

    .page {
      max-width: 680px;
      min-height: 100%;
      margin: auto;

      padding:
        calc(
          20px + var(--ion-safe-area-top,0px)
        )
        16px
        35px;
    }

    button {
      font-family: inherit;
      cursor: pointer;
    }

    /* ================================= */
    /* HEADER */
    /* ================================= */

    .top {
      display: flex;
      align-items: center;
      gap: 13px;
      margin-bottom: 17px;
    }

    .top button {
      width: 44px;
      height: 44px;

      display: grid;
      place-items: center;

      border: 1px solid #dce8f6;
      border-radius: 13px;

      background: white;
      color: #1769d2;
    }

    .top button ion-icon {
      font-size: 24px;
    }

    .top h1 {
      margin: 0;
      font-size: 23px;
    }

    .top p {
      margin: 5px 0 0;

      font-size: 12px;
      color: #8193a6;
    }

    /* ================================= */
    /* PRIVACY NOTICE */
    /* ================================= */

    .notice {
      display: flex;
      align-items: center;
      gap: 9px;

      padding: 12px;
      border-radius: 13px;

      background: #e6f8ee;
      color: #14734e;

      font-size: 11px;
      line-height: 1.6;

      margin-bottom: 19px;
    }

    .notice ion-icon {
      flex-shrink: 0;
      font-size: 20px;
    }

    /* ================================= */
    /* ERROR */
    /* ================================= */

    .error {
      padding: 15px;
      background: #fff0f0;
      color: #ad3434;

      border-radius: 13px;
      font-size: 12px;
      margin: 12px 0;
    }

    .error button {
      margin-left: 10px;

      border: 0;
      border-radius: 8px;

      padding: 7px 12px;

      color: white;
      background: #bb4040;
    }

    /* ================================= */
    /* LOADING AND EMPTY */
    /* ================================= */

    .loading,
    .empty {
      background: white;
      border: 1px solid #e3edf5;

      border-radius: 15px;
      padding: 22px;

      color: #8193a6;

      text-align: center;

      font-size: 12px;
      line-height: 1.7;
    }

    /* ================================= */
    /* CONVERSATION INBOX */
    /* ================================= */

    .inbox {
      display: flex;
      flex-direction: column;
      gap: 11px;
    }

    .conversation-card {
      display: flex;
      align-items: center;

      gap: 12px;

      width: 100%;
      text-align: left;

      padding: 14px;

      background: white;

      border: 1px solid #e3edf5;
      border-radius: 17px;
    }

    .avatar {
      width: 49px;
      height: 49px;

      flex-shrink: 0;

      display: grid;
      place-items: center;

      border-radius: 15px;

      background: #eaf4ff;
      color: #1769d2;

      font-size: 25px;
    }

    .conversation-content {
      display: flex;
      flex-direction: column;

      gap: 5px;

      flex: 1;
      min-width: 0;
    }

    .conversation-content strong {
      color: #102a43;
      font-size: 14px;

      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .conversation-content small {
      color: #8193a6;
      font-size: 11px;
    }

    .chevron {
      font-size: 29px;
      color: #98a8ba;
    }

    /* ================================= */
    /* CHAT THREAD */
    /* ================================= */

    .thread {
      display: flex;
      flex-direction: column;
      gap: 13px;
    }

    .messages {
      display: flex;
      flex-direction: column;
      gap: 10px;

      min-height: 240px;
      max-height: 48vh;

      overflow-y: auto;
      padding: 14px 9px;

      background: white;

      border: 1px solid #e3edf5;
      border-radius: 18px;
    }

    /* ================================= */
    /* MESSAGE BUBBLES */
    /* ================================= */

    .bubble-row {
      display: flex;
      justify-content: flex-start;
    }

    .bubble-row.mine {
      justify-content: flex-end;
    }

    .bubble {
      max-width: 85%;

      padding: 12px 14px;

      border-radius:
        15px 15px 15px 4px;

      background: #eff5fc;
    }

    .mine .bubble {
      background: linear-gradient(
        125deg,
        #1769d2,
        #148f62
      );

      color: white;

      border-radius:
        15px 15px 4px 15px;
    }

    /* PENDING SEND */

    .bubble-row.pending .bubble {
      opacity: .65;
    }

    /* MESSAGE TEXT */

    .sender {
      font-size: 10px;
      font-weight: 800;
      opacity: .75;
    }

    .bubble p {
      margin: 7px 0;

      font-size: 13px;
      line-height: 1.65;

      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .bubble time {
      display: block;

      text-align: right;

      font-size: 9px;
      opacity: .65;
    }

    /* ================================= */
    /* MESSAGE COMPOSER */
    /* ================================= */

    .compose {
      padding: 15px;

      background: white;

      border: 1px solid #e3edf5;
      border-radius: 16px;
    }

    .compose label {
      display: block;

      font-weight: 800;
      font-size: 12px;

      margin-bottom: 9px;
    }

    .compose textarea {
      width: 100%;

      border: 1px solid #d9e7f5;
      border-radius: 11px;

      padding: 12px;

      background: #f8fbff;
      color: #102a43;

      font: inherit;
      font-size: 13px;

      resize: vertical;
    }

    .compose-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;

      margin-top: 10px;
    }

    .compose-foot small {
      color: #8193a6;
      font-size: 11px;
    }

    .compose-foot button {
      display: flex;
      align-items: center;
      gap: 8px;

      border: 0;
      border-radius: 11px;

      padding: 12px 17px;

      color: white;

      background: linear-gradient(
        125deg,
        #1769d2,
        #148f62
      );

      font-weight: 800;
    }

    .compose-foot button:disabled {
      opacity: .55;
    }

    /* ================================= */
    /* SAFETY MESSAGE */
    /* ================================= */

    .safety {
      color: #8193a6;

      font-size: 11px;
      text-align: center;

      line-height: 1.6;
    }

  `]
})
export class MessagesPage
  implements OnInit, OnDestroy {

  // =====================================
  // ROUTE
  // =====================================

  conversationId = '';

  // =====================================
  // CHAT DATA
  // =====================================

  conversation:
    FindBackConversation | null = null;

  conversations:
    FindBackConversation[] = [];

  messages:
    FindBackMessage[] = [];

  myUserId = '';

  draft = '';

  // =====================================
  // UI STATE
  // =====================================

  loading = false;
  sending = false;

  errorMessage = '';

  // =====================================
  // REALTIME LISTENERS
  // =====================================

  private routeSub:
    Subscription | null = null;

  private channel:
    RealtimeChannel | null = null;

  private refreshTimer:
    ReturnType<typeof setInterval> | null = null;

  private pageActive = false;

  private watchVersion = 0;
  private requestVersion = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly data: FindBackDataService,
    private readonly alerts: MessageAlertService,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {

    addIcons({
      arrowBackOutline,
      chatbubblesOutline,
      sendOutline,
      refreshOutline,
      shieldCheckmarkOutline
    });
  }

  // =====================================
  // INITIALIZE PAGE
  // =====================================

  ngOnInit(): void {

    this.routeSub =
      this.route.paramMap.subscribe(params => {

        const nextId =
          params.get('conversationId') || '';

        if (
          nextId === this.conversationId &&
          this.channel
        ) {
          return;
        }

        this.conversationId = nextId;

        this.conversation = null;
        this.messages = [];

        if (this.pageActive) {
          this.startWatching();
        }
      });
  }

  ionViewWillEnter(): void {

    this.pageActive = true;

    void this.alerts.start();

    this.startWatching();
  }

  ionViewWillLeave(): void {

    this.pageActive = false;

    this.stopWatching();
  }

  ngOnDestroy(): void {

    this.pageActive = false;

    this.stopWatching();

    this.routeSub?.unsubscribe();
  }

  private refreshView(): void {

    this.zone.run(() => {

      this.cdr.markForCheck();

    });
  }

  // =====================================
  // START REALTIME LISTENER
  // =====================================

  private startWatching(): void {

    this.stopWatching();

    this.pageActive = true;

    const version =
      ++this.watchVersion;

    const id = this.conversationId;

    // Listen only to the currently
    // opened conversation, or to the
    // inbox if there is no chat ID.

    this.channel = id

      ? this.data.subscribeMessages(
          id,
          incoming => {

            if (
              this.pageActive &&
              id === this.conversationId
            ) {

              this.zone.run(() => {

                this.receiveMessage(
                  incoming
                );

              });
            }
          }
        )

      : this.data.subscribeInbox(() => {

          if (
            this.pageActive &&
            !this.conversationId
          ) {

            void this.loadInbox(true);

          }
        });

    void this.reload();

    // Backup refresh every 7 seconds.

    this.refreshTimer = setInterval(() => {

      if (
        !this.pageActive ||
        version !== this.watchVersion
      ) {
        return;
      }

      if (
        typeof document !== 'undefined' &&
        document.hidden
      ) {
        return;
      }

      if (this.conversationId) {

        void this.loadMessagesOnly();

      } else {

        void this.loadInbox(true);

      }

    }, 7000);
  }

  // =====================================
  // STOP REALTIME LISTENER
  // =====================================

  private stopWatching(): void {

    ++this.watchVersion;
    ++this.requestVersion;

    if (this.refreshTimer) {

      clearInterval(this.refreshTimer);

      this.refreshTimer = null;
    }

    const previous = this.channel;

    this.channel = null;

    if (previous) {

      void this.data.unsubscribe(
        previous
      );
    }
  }

  // =====================================
  // RELOAD INBOX OR CHAT
  // =====================================

  async reload(): Promise<void> {

    if (this.conversationId) {

      await this.loadChat();

    } else {

      await this.loadInbox(false);

    }
  }

  // =====================================
  // LOAD MESSAGES INBOX
  // =====================================

  private async loadInbox(
    quiet = false
  ): Promise<void> {

    if (this.conversationId) {
      return;
    }

    const request =
      ++this.requestVersion;

    if (!quiet) {

      this.loading = true;

      this.errorMessage = '';

      this.refreshView();
    }

    try {

      const [
        me,
        list
      ] = await Promise.all([

        this.data.currentUserId(),

        this.data.getConversations()

      ]);

      if (
        !this.pageActive ||
        request !== this.requestVersion ||
        this.conversationId
      ) {
        return;
      }

      this.myUserId = me;

      this.conversations = list;

      this.errorMessage = '';

    } catch (err: unknown) {

      if (
        !quiet &&
        request === this.requestVersion
      ) {

        this.errorMessage =
          err instanceof Error
            ? err.message
            : 'Unable to load inbox.';
      }

    } finally {

      if (
        request === this.requestVersion
      ) {

        this.loading = false;

        this.refreshView();
      }
    }
  }

  // =====================================
  // LOAD PRIVATE CHAT
  // =====================================

  private async loadChat(): Promise<void> {

    const id = this.conversationId;

    if (!id) {
      return;
    }

    const request =
      ++this.requestVersion;

    this.loading = true;
    this.errorMessage = '';

    this.refreshView();

    try {

      const [
        me,
        conversation,
        list
      ] = await Promise.all([

        this.data.currentUserId(),

        this.data.getConversation(id),

        this.data.getMessages(id)

      ]);

      if (
        !this.pageActive ||
        request !== this.requestVersion ||
        id !== this.conversationId
      ) {
        return;
      }

      this.myUserId = me;

      this.conversation = conversation;

      this.mergeMessages(list);

    } catch (err: unknown) {

      if (
        request === this.requestVersion
      ) {

        this.errorMessage =
          err instanceof Error
            ? err.message
            : 'Unable to open chat.';
      }

    } finally {

      if (
        request === this.requestVersion
      ) {

        this.loading = false;

        this.refreshView();
      }
    }
  }

  // =====================================
  // MERGE MESSAGES WITHOUT DUPLICATES
  // =====================================

  private mergeMessages(
    list: FindBackMessage[]
  ): void {

    const byId =
      new Map<string, FindBackMessage>();

    // Preserve outgoing messages still
    // waiting for Supabase confirmation.

    for (const item of this.messages) {

      if (
        item.id.startsWith('pending-')
      ) {

        byId.set(
          item.id,
          item
        );
      }
    }

    // Add confirmed server messages.

    for (const item of list) {

      byId.set(
        item.id,
        item
      );
    }

    this.messages = [
      ...byId.values()
    ].sort(
      (a, b) =>
        a.created_at.localeCompare(
          b.created_at
        )
    );
  }

  // =====================================
  // RECEIVE REALTIME MESSAGE
  // =====================================

  private receiveMessage(
    message: FindBackMessage
  ): void {

    if (
      !message?.id ||
      message.conversation_id !==
        this.conversationId
    ) {
      return;
    }

    // Prevent duplicate bubbles.

    if (
      this.messages.some(
        m => m.id === message.id
      )
    ) {
      return;
    }

    // The outgoing pending bubble
    // is already visible.

    if (
      message.sender_id === this.myUserId &&
      this.sending
    ) {
      return;
    }

    this.messages = [
      ...this.messages,
      message
    ].sort(
      (a, b) =>
        a.created_at.localeCompare(
          b.created_at
        )
    );

    this.refreshView();
  }

  // =====================================
  // BACKUP LOAD FOR MISSED MESSAGES
  // =====================================

  private async loadMessagesOnly():
    Promise<void> {

    const id = this.conversationId;

    if (!id) {
      return;
    }

    try {

      const list =
        await this.data.getMessages(id);

      if (
        this.pageActive &&
        id === this.conversationId
      ) {

        this.zone.run(() => {

          this.mergeMessages(list);

          this.refreshView();

        });
      }

    } catch {

      // The next scheduled refresh
      // will try again.

    }
  }

  // =====================================
  // INSTANT OUTGOING MESSAGE
  // =====================================

  async send(): Promise<void> {

    const text =
      this.draft.trim();

    const id =
      this.conversationId;

    if (
      this.sending ||
      !text ||
      !id
    ) {
      return;
    }

    if (text.length > 500) {

      this.errorMessage =
        'Message must not exceed 500 characters.';

      return;
    }

    // Display a pending bubble immediately.

    this.sending = true;

    this.errorMessage = '';

    this.draft = '';

    const optimisticId =
      `pending-${Date.now()}-${Math.random()}`;

    const optimistic: FindBackMessage = {

      id: optimisticId,

      conversation_id: id,

      sender_id: this.myUserId,

      body: text,

      created_at:
        new Date().toISOString()
    };

    this.messages = [
      ...this.messages,
      optimistic
    ];

    this.refreshView();

    try {

      // Save the message to Supabase.

      const saved =
        await this.data.sendMessage(
          id,
          text
        );

      if (
        id !== this.conversationId
      ) {
        return;
      }

      // Replace the pending bubble
      // with the confirmed message.

      this.messages = this.messages

        .filter(
          m =>
            m.id !== optimisticId &&
            m.id !== saved.id
        )

        .concat(saved)

        .sort(
          (a, b) =>
            a.created_at.localeCompare(
              b.created_at
            )
        );

    } catch (err: unknown) {

      if (
        id === this.conversationId
      ) {

        // Remove the pending bubble
        // if Supabase rejects the message.

        this.messages =
          this.messages.filter(
            m => m.id !== optimisticId
          );

        // Restore text for retry.

        if (!this.draft) {
          this.draft = text;
        }

        this.errorMessage =
          err instanceof Error
            ? err.message
            : 'Message not sent. Please try again.';
      }

    } finally {

      this.sending = false;

      this.refreshView();
    }
  }

  // =====================================
  // OPTIMIZED MESSAGE TRACKING
  // =====================================

  trackMessage(
    _index: number,
    message: FindBackMessage
  ): string {

    return message.id;
  }

  // =====================================
  // OPEN CHAT
  // =====================================

  openChat(
    id: string
  ): void {

    void this.router.navigate(
      [
        '/messages',
        id
      ]
    );
  }

  // =====================================
  // BACK NAVIGATION
  // =====================================

  goBack(): void {

    void this.router.navigateByUrl(

      this.conversationId
        ? '/messages'
        : '/home'

    );
  }
}
