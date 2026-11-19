
import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from './auth.service';

export type FindBackItemType = 'lost' | 'found';

export interface FindBackReport {
  id: string;
  owner_id: string;
  item_type: FindBackItemType;
  name: string;
  category: string;
  location: string;
  item_date: string;
  description: string;
  pickup_location: string;
  photo_path: string | null;
  photo_url?: string;
  status: 'active' | 'returned';
  created_at: string;
}

export interface NewFindBackReport {
  item_type: FindBackItemType;
  name: string;
  category: string;
  location: string;
  item_date: string;
  description: string;
  pickup_location: string;
  photo?: File | null;
}

export interface FindBackConversation {
  id: string;
  report_id: string;
  owner_id: string;
  requester_id: string;
  created_at: string;
  last_message_at: string;
  report_name?: string;
  item_type?: FindBackItemType;
}

export interface FindBackMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class FindBackDataService {

  private readonly bucket =
    'findback-item-images';

  private readonly conversationCache =
    new Map<string, string>();

  constructor(
    private readonly auth: AuthService
  ) {}

  private get client() {
    return this.auth.client;
  }

  // =====================================
  // CURRENT USER ID
  // =====================================

  async currentUserId(): Promise<string> {

    const { data, error } =
      await this.client.auth.getSession();

    if (error || !data.session?.user) {

      throw new Error(
        'Please log in to continue.'
      );
    }

    return data.session.user.id;
  }

  // =====================================
  // GET ALL REPORTS
  // =====================================

  async getReports(): Promise<FindBackReport[]> {

    await this.currentUserId();

    const { data, error } =
      await this.client
        .from('findback_reports')
        .select(
          'id,owner_id,item_type,name,category,location,item_date,description,pickup_location,photo_path,status,created_at'
        )
        .order('created_at', {
          ascending: false
        })
        .limit(100);

    if (error) {
      throw error;
    }

    const reports =
      (data || []) as FindBackReport[];

    await Promise.all(
      reports.map(async item => {

        if (item.photo_path) {

          item.photo_url =
            await this.getSignedPhoto(
              item.photo_path
            );

        }
      })
    );

    return reports;
  }

  // =====================================
  // GET SIGNED PHOTO URL
  // =====================================

  private async getSignedPhoto(
    path: string
  ): Promise<string | undefined> {

    const { data, error } =
      await this.client.storage
        .from(this.bucket)
        .createSignedUrl(
          path,
          3600
        );

    return error
      ? undefined
      : data?.signedUrl;
  }

  // =====================================
  // CREATE LOST / FOUND REPORT
  // =====================================

  async createReport(
    form: NewFindBackReport
  ): Promise<void> {

    const ownerId =
      await this.currentUserId();

    const name =
      form.name.trim();

    const location =
      form.location.trim();

    const category =
      form.category.trim();

    const description =
      form.description.trim();

    const pickupLocation =
      form.pickup_location.trim();

    if (
      name.length < 2 ||
      !category ||
      !location ||
      !form.item_date
    ) {

      throw new Error(
        'Complete all required item information.'
      );
    }

    if (
      description.length > 1000 ||
      pickupLocation.length > 120
    ) {

      throw new Error(
        'Description or pickup information is too long.'
      );
    }

    if (
      form.item_date >
      new Date().toISOString().slice(0, 10)
    ) {

      throw new Error(
        'The item date cannot be in the future.'
      );
    }

    let photoPath: string | null = null;

    if (form.photo) {

      if (
        ![
          'image/jpeg',
          'image/png',
          'image/webp'
        ].includes(form.photo.type)
      ) {

        throw new Error(
          'Only JPG, PNG or WebP images are allowed.'
        );
      }

      if (
        form.photo.size >
        5 * 1024 * 1024
      ) {

        throw new Error(
          'Image must be 5 MB or smaller.'
        );
      }

      const ext =
        form.photo.type === 'image/png'
          ? 'png'
          : form.photo.type === 'image/webp'
            ? 'webp'
            : 'jpg';

      photoPath =
        `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 12)}.${ext}`;

      const { error: uploadError } =
        await this.client.storage
          .from(this.bucket)
          .upload(
            photoPath,
            form.photo,
            {
              contentType: form.photo.type,
              upsert: false
            }
          );

      if (uploadError) {
        throw uploadError;
      }
    }

    const { error } =
      await this.client
        .from('findback_reports')
        .insert({

          owner_id: ownerId,

          item_type: form.item_type,

          name,

          category,

          location,

          item_date: form.item_date,

          description,

          pickup_location: pickupLocation,

          photo_path: photoPath

        });

    if (error) {

      if (photoPath) {

        await this.client.storage
          .from(this.bucket)
          .remove([photoPath]);

      }

      throw error;
    }
  }

  // =====================================
  // FIX: GET OR CREATE CONVERSATION
  // =====================================

  async getOrCreateConversation(
    report: FindBackReport
  ): Promise<string> {

    const me =
      await this.currentUserId();

    // Prevent messaging your own report.

    if (me === report.owner_id) {

      throw new Error(
        'This is your own report. Check your inbox for replies.'
      );
    }

    if (report.status !== 'active') {

      throw new Error(
        'This report is already marked returned.'
      );
    }

    // =================================
    // STEP 1: CHECK LOCAL CACHE
    // =================================

    const cacheKey =
      `${me}:${report.id}`;

    const cached =
      this.conversationCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    // =================================
    // STEP 2: CHECK EXISTING CHAT
    // =================================

    // Important:
    // Before, the code immediately
    // inserted a conversation.
    //
    // If a chat already existed,
    // Supabase returned 409 Conflict.
    //
    // Now we check first.

    const existing =
      await this.client
        .from('findback_conversations')
        .select('id')
        .eq('report_id', report.id)
        .eq('requester_id', me)
        .maybeSingle();

    if (existing.error) {

      throw existing.error;
    }

    // If an existing conversation
    // was found, reuse that chat.

    if (existing.data?.id) {

      const id =
        existing.data.id as string;

      this.conversationCache.set(
        cacheKey,
        id
      );

      return id;
    }

    // =================================
    // STEP 3: CREATE NEW CHAT
    // =================================

    // Only insert when no existing
    // conversation was found.

    const inserted =
      await this.client
        .from('findback_conversations')
        .insert({

          report_id: report.id,

          requester_id: me,

          owner_id: report.owner_id

        })
        .select('id')
        .single();

    if (
      !inserted.error &&
      inserted.data?.id
    ) {

      const id =
        inserted.data.id as string;

      this.conversationCache.set(
        cacheKey,
        id
      );

      return id;
    }

    // =================================
    // STEP 4: HANDLE SIMULTANEOUS
    // REQUESTS SAFELY
    // =================================

    // Another request may have created
    // the same chat between our SELECT
    // and INSERT.
    //
    // Reuse the conversation in that
    // rare case rather than duplicating it.

    if (inserted.error?.code === '23505') {

      const winner =
        await this.client
          .from('findback_conversations')
          .select('id')
          .eq('report_id', report.id)
          .eq('requester_id', me)
          .single();

      if (winner.error) {
        throw winner.error;
      }

      const id =
        winner.data.id as string;

      this.conversationCache.set(
        cacheKey,
        id
      );

      return id;
    }

    throw inserted.error ||
      new Error(
        'Unable to open the conversation.'
      );
  }

  // =====================================
  // GET CONVERSATIONS
  // =====================================

  async getConversations(): Promise<
    FindBackConversation[]
  > {

    const me =
      await this.currentUserId();

    const { data, error } =
      await this.client
        .from('findback_conversations')
        .select(
          'id,report_id,owner_id,requester_id,created_at,last_message_at'
        )
        .or(
          `owner_id.eq.${me},requester_id.eq.${me}`
        )
        .order('last_message_at', {
          ascending: false
        })
        .limit(100);

    if (error) {
      throw error;
    }

    const result =
      (data || []) as FindBackConversation[];

    if (!result.length) {
      return result;
    }

    const reportIds = [
      ...new Set(
        result.map(c => c.report_id)
      )
    ];

    const reports =
      await this.client
        .from('findback_reports')
        .select('id,name,item_type')
        .in('id', reportIds);

    if (reports.error) {
      throw reports.error;
    }

    const byId = new Map(
      (reports.data || []).map(p => [
        p.id as string,
        p
      ])
    );

    result.forEach(c => {

      const post =
        byId.get(c.report_id);

      c.report_name =
        post?.name || 'Item report';

      c.item_type =
        post?.item_type as
          FindBackItemType | undefined;
    });

    return result;
  }

  // =====================================
  // GET SINGLE CONVERSATION
  // =====================================

  async getConversation(
    id: string
  ): Promise<FindBackConversation> {

    await this.currentUserId();

    const { data, error } =
      await this.client
        .from('findback_conversations')
        .select(
          'id,report_id,owner_id,requester_id,created_at,last_message_at'
        )
        .eq('id', id)
        .single();

    if (error) {
      throw error;
    }

    const conversation =
      data as FindBackConversation;

    const report =
      await this.client
        .from('findback_reports')
        .select('name,item_type')
        .eq('id', conversation.report_id)
        .single();

    if (report.error) {
      throw report.error;
    }

    conversation.report_name =
      report.data.name as string;

    conversation.item_type =
      report.data.item_type as FindBackItemType;

    return conversation;
  }

  // =====================================
  // GET MESSAGES
  // =====================================

  async getMessages(
    id: string
  ): Promise<FindBackMessage[]> {

    await this.currentUserId();

    const { data, error } =
      await this.client
        .from('findback_messages')
        .select(
          'id,conversation_id,sender_id,body,created_at'
        )
        .eq('conversation_id', id)
        .order('created_at', {
          ascending: false
        })
        .limit(200);

    if (error) {
      throw error;
    }

    return (
      (data || []) as FindBackMessage[]
    ).reverse();
  }

  // =====================================
  // SEND MESSAGE
  // =====================================

  async sendMessage(
    id: string,
    body: string
  ): Promise<FindBackMessage> {

    const me =
      await this.currentUserId();

    const text =
      body.trim();

    if (
      text.length < 1 ||
      text.length > 500
    ) {

      throw new Error(
        'Message must contain 1–500 characters.'
      );
    }

    const { data, error } =
      await this.client
        .from('findback_messages')
        .insert({

          conversation_id: id,

          sender_id: me,

          body: text

        })
        .select(
          'id,conversation_id,sender_id,body,created_at'
        )
        .single();

    if (error) {
      throw error;
    }

    return data as FindBackMessage;
  }

  // =====================================
  // REALTIME REPORTS
  // =====================================

  subscribeReports(
    onChange: () => void
  ): RealtimeChannel {

    return this.client
      .channel(
        `findback-feed-${Date.now()}`
      )
      .on(
        'postgres_changes',
        {

          event: '*',

          schema: 'public',

          table: 'findback_reports'

        },
        () => onChange()
      )
      .subscribe();
  }

  // =====================================
  // REALTIME INBOX
  // =====================================

  subscribeInbox(
    onChange: () => void
  ): RealtimeChannel {

    return this.client
      .channel(
        `findback-inbox-${Date.now()}`
      )
      .on(
        'postgres_changes',
        {

          event: '*',

          schema: 'public',

          table: 'findback_conversations'

        },
        () => onChange()
      )
      .on(
        'postgres_changes',
        {

          event: 'INSERT',

          schema: 'public',

          table: 'findback_messages'

        },
        () => onChange()
      )
      .subscribe();
  }

  // =====================================
  // REALTIME CHAT
  // =====================================

  subscribeMessages(
    conversationId: string,

    onMessage: (
      message: FindBackMessage
    ) => void

  ): RealtimeChannel {

    return this.client
      .channel(
        `findback-chat-${conversationId}-${Date.now()}`
      )
      .on(
        'postgres_changes',
        {

          event: 'INSERT',

          schema: 'public',

          table: 'findback_messages',

          filter:
            `conversation_id=eq.${conversationId}`

        },
        payload => {

          onMessage(
            payload.new as FindBackMessage
          );

        }
      )
      .subscribe();
  }

  // =====================================
  // BACKUP MESSAGE CHECK
  // =====================================

  async recentIncomingMessages(
    sinceIso: string
  ): Promise<FindBackMessage[]> {

    const me =
      await this.currentUserId();

    const { data, error } =
      await this.client
        .from('findback_messages')
        .select(
          'id,conversation_id,sender_id,body,created_at'
        )
        .neq('sender_id', me)
        .gte('created_at', sinceIso)
        .order('created_at', {
          ascending: false
        })
        .limit(30);

    if (error) {
      throw error;
    }

    return (
      data || []
    ) as FindBackMessage[];
  }

  // =====================================
  // CLEAN UP REALTIME SUBSCRIPTIONS
  // =====================================

  async unsubscribe(
    channel: RealtimeChannel | null
  ): Promise<void> {

    if (channel) {

      await this.client.removeChannel(
        channel
      );

    }
  }
}
