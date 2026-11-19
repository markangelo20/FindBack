
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';
import { RealtimeChannel } from '@supabase/supabase-js';
import { BehaviorSubject, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import {
  FindBackDataService,
  FindBackReport
} from './findback-data.service';

export interface SimilarMatchAlert {
  id: string;
  recipient_id: string;
  lost_report_id: string;
  found_report_id: string;
  read_at: string | null;
  created_at: string;
  lost_item_name: string;
  found_item_name: string;
  found_status: string;
}

export interface SimilarMatchState {
  notifications: SimilarMatchAlert[];
  unreadCount: number;
}

/**
 * Supabase stores matches permanently and only exposes a user's own alerts.
 * This service listens while the app is open; phone-closed push requires FCM.
 */
@Injectable({ providedIn: 'root' })
export class SimilarMatchService {

  readonly state$ = new BehaviorSubject<SimilarMatchState>({
    notifications: [],
    unreadCount: 0
  });

  readonly newMatch$ = new Subject<SimilarMatchAlert>();

  private userId = '';

  private channel: RealtimeChannel | null = null;

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  private startup: Promise<void> | null = null;

  private refreshPromise: Promise<void> | null = null;

  private refreshAgain = false;

  private knownIds = new Set<string>();

  private initialized = false;

  constructor(
    private readonly auth: AuthService,
    private readonly data: FindBackDataService
  ) {

    this.auth.client.auth.onAuthStateChange(event => {

      if (event === 'SIGNED_OUT') {
        this.stop();
      }

    });
  }

  // =====================================
  // START NOTIFICATION SERVICE
  // =====================================

  start(): Promise<void> {

    if (this.startup) {
      return this.startup;
    }

    this.startup = this.startInternal().finally(() => {
      this.startup = null;
    });

    return this.startup;
  }

  private async startInternal(): Promise<void> {

    const me = await this.data.currentUserId();

    if (me === this.userId && this.channel) {
      return;
    }

    this.stop();

    this.userId = me;

    // First fetch establishes a baseline:
    // old notifications get a badge,
    // but do not trigger an unexpected vibration at login.

    await this.refresh();

    this.channel = this.auth.client
      .channel(`findback-similar-matches-${me}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'findback_match_notifications',
          filter: `recipient_id=eq.${me}`
        },
        () => {
          void this.refresh().catch(() => {});
        }
      )
      .subscribe();

    // Fallback when Realtime is interrupted.

    this.pollTimer = setInterval(() => {

      if (
        typeof document === 'undefined' ||
        !document.hidden
      ) {

        void this.refresh().catch(() => {});

      }

    }, 12000);
  }

  // =====================================
  // STOP AND RESET
  // =====================================

  stop(): void {

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }

    this.pollTimer = null;

    if (this.channel) {
      void this.auth.client.removeChannel(this.channel);
    }

    this.channel = null;

    this.userId = '';

    this.initialized = false;

    this.knownIds.clear();

    this.state$.next({
      notifications: [],
      unreadCount: 0
    });
  }

  // =====================================
  // REFRESH NOTIFICATIONS
  // =====================================

  refresh(): Promise<void> {

    if (this.refreshPromise) {

      // A second event arrived during a pending fetch.
      // Refresh again to avoid showing outdated counts.

      this.refreshAgain = true;

      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {

      do {

        this.refreshAgain = false;

        await this.loadNotifications();

      } while (this.refreshAgain);

    })().finally(() => {

      this.refreshPromise = null;

    });

    return this.refreshPromise;
  }

  // =====================================
  // GET NOTIFICATIONS FROM SUPABASE
  // =====================================

  private async loadNotifications(): Promise<void> {

    if (!this.userId) {
      return;
    }

    const owner = this.userId;

    const client = this.auth.client;

    const [recordsResult, countResult] = await Promise.all([

      client.from('findback_match_notifications')
        .select(
          'id,recipient_id,lost_report_id,found_report_id,read_at,created_at'
        )
        .eq('recipient_id', owner)
        .order('created_at', { ascending: false })
        .limit(100),

      client.from('findback_match_notifications')
        .select('id', {
          count: 'exact',
          head: true
        })
        .eq('recipient_id', owner)
        .is('read_at', null)

    ]);

    if (recordsResult.error) {
      throw recordsResult.error;
    }

    if (countResult.error) {
      throw countResult.error;
    }

    if (this.userId !== owner) {
      return;
    }

    const records = recordsResult.data || [];

    const reportIds = [
      ...new Set(
        records.flatMap(n => [
          n.lost_report_id as string,
          n.found_report_id as string
        ])
      )
    ];

    const reportsById = new Map<string, {
      name: string;
      status: string;
    }>();

    if (reportIds.length) {

      const reportsResult = await client
        .from('findback_reports')
        .select('id,name,status')
        .in('id', reportIds);

      if (reportsResult.error) {
        throw reportsResult.error;
      }

      (reportsResult.data || []).forEach(r => {

        reportsById.set(
          r.id as string,
          {
            name: r.name as string,
            status: r.status as string
          }
        );

      });
    }

    if (this.userId !== owner) {
      return;
    }

    const notifications: SimilarMatchAlert[] =
      records.map(n => ({

        id: n.id as string,

        recipient_id: n.recipient_id as string,

        lost_report_id: n.lost_report_id as string,

        found_report_id: n.found_report_id as string,

        read_at: n.read_at as string | null,

        created_at: n.created_at as string,

        lost_item_name:
          reportsById.get(
            n.lost_report_id as string
          )?.name || 'Your lost item',

        found_item_name:
          reportsById.get(
            n.found_report_id as string
          )?.name || 'Found item',

        found_status:
          reportsById.get(
            n.found_report_id as string
          )?.status || 'active'

      }));

    // Detect only alerts arriving after
    // the initial notification snapshot.

    const newlyArrived = this.initialized

      ? notifications.filter(
          n => !this.knownIds.has(n.id)
        )

      : [];

    notifications.forEach(n => {
      this.knownIds.add(n.id);
    });

    this.initialized = true;

    this.state$.next({
      notifications,
      unreadCount: countResult.count || 0
    });

    // Vibrate only when the app is active
    // and there is a newly arrived match.

    if (
      newlyArrived.length &&
      (
        typeof document === 'undefined' ||
        !document.hidden
      )
    ) {

      void this.vibrate();

      this.newMatch$.next(
        newlyArrived[0]
      );

    }
  }

  // =====================================
  // VIBRATE THE DEVICE
  // =====================================

  private async vibrate(): Promise<void> {

    try {

      if (Capacitor.isNativePlatform()) {

        await Haptics.vibrate({
          duration: 250
        });

      } else if (
        typeof navigator !== 'undefined' &&
        'vibrate' in navigator
      ) {

        navigator.vibrate([
          180,
          90,
          180
        ]);

      }

    } catch {
      // Even if vibration is unavailable,
      // the notification badge still updates.
    }
  }

  // =====================================
  // MARK ALERT AS READ
  // =====================================

  async markRead(alertId: string): Promise<void> {

    const me = await this.data.currentUserId();

    const { error } = await this.auth.client
      .from('findback_match_notifications')
      .update({
        read_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .eq('recipient_id', me)
      .is('read_at', null);

    if (error) {
      throw error;
    }

    await this.refresh();
  }

  // =====================================
  // LOAD FOUND ITEM DETAILS
  // =====================================

  async getFoundReport(id: string): Promise<FindBackReport> {

    const { data, error } = await this.auth.client
      .from('findback_reports')
      .select(
        'id,owner_id,item_type,name,category,location,item_date,description,pickup_location,photo_path,status,created_at'
      )
      .eq('id', id)
      .eq('item_type', 'found')
      .single();

    if (error) {
      throw error;
    }

    const report = data as FindBackReport;

    if (report.photo_path) {

      const image = await this.auth.client.storage
        .from('findback-item-images')
        .createSignedUrl(
          report.photo_path,
          3600
        );

      if (!image.error) {
        report.photo_url = image.data.signedUrl;
      }
    }

    return report;
  }
}
