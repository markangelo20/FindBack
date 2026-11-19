
import {
  Injectable,
  NgZone
} from '@angular/core';

import { Router } from '@angular/router';

import {
  AlertController
} from '@ionic/angular';

import {
  RealtimeChannel
} from '@supabase/supabase-js';

import {
  AuthService
} from './auth.service';

import {
  FindBackDataService,
  FindBackMessage
} from './findback-data.service';

@Injectable({
  providedIn: 'root'
})
export class MessageAlertService {

  private channel:
    RealtimeChannel | null = null;

  private currentUserId = '';
  private startedAt = '';

  private pollTimer:
    ReturnType<typeof setInterval> | null = null;

  private starting:
    Promise<void> | null = null;

  private seenIds =
    new Set<string>();

  private alertShowing = false;

  private soundContext:
    AudioContext | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly data: FindBackDataService,
    private readonly alerts: AlertController,
    private readonly router: Router,
    private readonly zone: NgZone
  ) {

    this.installNotificationStyles();

    // Enable audio after user interaction.

    if (typeof document !== 'undefined') {

      document.addEventListener(
        'pointerdown',
        () => this.unlockSound(),
        {
          passive: true
        }
      );
    }

    // Stop notifications after logout.

    this.auth.client.auth.onAuthStateChange(
      event => {

        if (event === 'SIGNED_OUT') {
          this.stop();
        }

      }
    );
  }

  // =====================================
  // START NOTIFICATION LISTENER
  // =====================================

  start(): Promise<void> {

    if (this.starting) {
      return this.starting;
    }

    this.starting =
      this.startInternal().finally(() => {
        this.starting = null;
      });

    return this.starting;
  }

  // =====================================
  // CONNECT TO SUPABASE REALTIME
  // =====================================

  private async startInternal(): Promise<void> {

    try {

      const id =
        await this.data.currentUserId();

      if (
        this.channel &&
        id === this.currentUserId
      ) {
        return;
      }

      this.stop();

      this.currentUserId = id;

      this.startedAt =
        new Date().toISOString();

      // Listen for new messages.

      this.channel =
        this.auth.client
          .channel(
            `findback-foreground-notify-${Date.now()}`
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'findback_messages'
            },
            payload => {

              this.handleIncoming(
                payload.new as FindBackMessage
              );

            }
          )
          .subscribe();

      // Backup polling when Realtime
      // is temporarily disconnected.

      this.pollTimer = setInterval(() => {

        void this.checkMissedMessages();

      }, 12000);

    } catch {
      // Keep app available during
      // temporary connection failures.
    }
  }

  // =====================================
  // STOP NOTIFICATIONS
  // =====================================

  stop(): void {

    if (this.pollTimer) {

      clearInterval(this.pollTimer);

      this.pollTimer = null;
    }

    if (this.channel) {

      void this.data.unsubscribe(
        this.channel
      );

      this.channel = null;
    }

    this.currentUserId = '';
    this.startedAt = '';

    this.seenIds.clear();
  }

  // =====================================
  // CHECK MISSED MESSAGES
  // =====================================

  private async checkMissedMessages():
    Promise<void> {

    if (
      !this.currentUserId ||
      !this.startedAt
    ) {
      return;
    }

    if (
      typeof document !== 'undefined' &&
      document.hidden
    ) {
      return;
    }

    try {

      const list =
        await this.data.recentIncomingMessages(
          this.startedAt
        );

      list.reverse().forEach(message => {

        this.handleIncoming(message);

      });

    } catch {
      // Try again on the next poll.
    }
  }

  // =====================================
  // HANDLE NEW INCOMING MESSAGE
  // =====================================

  private handleIncoming(
    message: FindBackMessage
  ): void {

    if (
      !message?.id ||
      !this.currentUserId
    ) {
      return;
    }

    // Do not notify for own messages.

    if (
      message.sender_id ===
      this.currentUserId
    ) {
      return;
    }

    // Prevent duplicate notifications.

    if (this.seenIds.has(message.id)) {
      return;
    }

    this.seenIds.add(message.id);

    if (this.seenIds.size > 150) {

      const oldest =
        this.seenIds.values().next().value;

      if (oldest) {
        this.seenIds.delete(oldest);
      }
    }

    // Foreground notifications only.

    if (
      typeof document !== 'undefined' &&
      document.hidden
    ) {
      return;
    }

    // Sound and vibration.

    this.playSound();

    // Do not interrupt a conversation
    // that the student is already viewing.

    if (
      this.router.url.split('?')[0] ===
      `/messages/${message.conversation_id}`
    ) {
      return;
    }

    // Display the popup.

    this.zone.run(() => {

      void this.showPopup(
        message.conversation_id
      );

    });
  }

  // =====================================
  // BEAUTIFUL ENGLISH NOTIFICATION POPUP
  // =====================================

  private async showPopup(
    conversationId: string
  ): Promise<void> {

    if (this.alertShowing) {
      return;
    }

    this.alertShowing = true;

    try {

      const popup =
        await this.alerts.create({

          cssClass:
            'findback-message-notification',

          header:
            'New Message',

          subHeader:
            'FINDBACK • PRIVATE CHAT',

          message:
            'You received a new message about a lost or found item. Open the chat to reply.',

          backdropDismiss: true,

          buttons: [

            {
              text: 'Not Now',
              role: 'cancel',
              cssClass: 'findback-not-now'
            },

            {
              text: 'View Message',
              cssClass: 'findback-view-message',

              handler: () => {

                void this.router.navigate([
                  '/messages',
                  conversationId
                ]);

              }
            }

          ]
        });

      await popup.present();

      await popup.onDidDismiss();

    } finally {

      this.alertShowing = false;
    }
  }

  // =====================================
  // POPUP DESIGN
  // =====================================

  private installNotificationStyles(): void {

    if (
      typeof document === 'undefined' ||
      document.getElementById(
        'findback-message-notification-styles'
      )
    ) {
      return;
    }

    const style =
      document.createElement('style');

    style.id =
      'findback-message-notification-styles';

    style.textContent = `

      ion-alert.findback-message-notification {
        --background: #ffffff;
        --color: #18354e;
        --backdrop-opacity: .58;
      }

      ion-alert.findback-message-notification .alert-wrapper {
        position: relative;
        overflow: hidden;
        width: min(90vw, 380px);
        max-width: 380px;
        border-radius: 25px !important;
        box-shadow: 0 22px 70px rgba(10, 37, 61, .25);
      }

      ion-alert.findback-message-notification .alert-wrapper::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 6px;
        background: linear-gradient(
          105deg,
          #1769d2,
          #11a476
        );
      }

      ion-alert.findback-message-notification .alert-head {
        padding: 28px 24px 7px;
        text-align: center;
      }

      ion-alert.findback-message-notification .alert-head::before {
        content: '✉';
        display: grid;
        place-items: center;
        width: 66px;
        height: 66px;
        margin: 0 auto 18px;
        border-radius: 20px;
        background: linear-gradient(
          145deg,
          #e8f2ff,
          #e5f8ef
        );
        color: #1778b3;
        font-size: 32px;
      }

      ion-alert.findback-message-notification .alert-title {
        color: #132f4a;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -.6px;
      }

      ion-alert.findback-message-notification .alert-sub-title {
        color: #138c69;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1.2px;
        margin: 7px 0 0;
      }

      ion-alert.findback-message-notification .alert-message {
        max-height: none;
        padding: 11px 23px 14px;
        text-align: center;
        color: #657c91;
        font-size: 13px;
        line-height: 1.65;
      }

      ion-alert.findback-message-notification .alert-button-group {
        display: grid;
        grid-template-columns: 1fr 1.3fr;
        gap: 9px;
        padding: 8px 18px 21px;
      }

      ion-alert.findback-message-notification .alert-button {
        margin: 0;
        min-width: 0;
        min-height: 47px;
        border-radius: 13px;
        font-size: 12px;
        font-weight: 800;
        text-transform: none;
      }

      ion-alert.findback-message-notification .alert-button-inner {
        justify-content: center;
        white-space: nowrap;
      }

      ion-alert.findback-message-notification .findback-not-now {
        color: #557088;
        background: #f0f5fa;
      }

      ion-alert.findback-message-notification .findback-view-message {
        color: white;
        background: linear-gradient(
          110deg,
          #1769d2,
          #118d70
        );
      }

    `;

    document.head.appendChild(style);
  }

  // =====================================
  // ENABLE NOTIFICATION SOUND
  // =====================================

  unlockSound(): void {

    try {

      if (!this.soundContext) {

        this.soundContext =
          new AudioContext();
      }

      if (
        this.soundContext.state ===
        'suspended'
      ) {
        void this.soundContext.resume();
      }

    } catch {
      // Popup still works if audio
      // is not supported.
    }
  }

  // =====================================
  // SOUND AND VIBRATION
  // =====================================

  private playSound(): void {

    try {

      if (
        typeof navigator !== 'undefined' &&
        'vibrate' in navigator
      ) {
        navigator.vibrate(120);
      }

      const audio =
        this.soundContext;

      if (
        !audio ||
        audio.state !== 'running'
      ) {
        return;
      }

      const start =
        audio.currentTime;

      // Two short notification tones.

      [880, 1175].forEach(
        (frequency, index) => {

          const osc =
            audio.createOscillator();

          const gain =
            audio.createGain();

          osc.type = 'sine';

          osc.frequency.value =
            frequency;

          osc.connect(gain);

          gain.connect(
            audio.destination
          );

          const at =
            start + index * 0.16;

          gain.gain.setValueAtTime(
            0.0001,
            at
          );

          gain.gain.exponentialRampToValueAtTime(
            0.11,
            at + 0.02
          );

          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            at + 0.14
          );

          osc.start(at);

          osc.stop(at + 0.15);
        }
      );

    } catch {
      // Messaging works even if the
      // notification sound is unavailable.
    }
  }
}
