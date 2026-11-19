
import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from './auth.service';

export type ClaimStatus =
  | 'pending'
  | 'approved'
  | 'handover_confirmed'
  | 'claimed'
  | 'rejected'
  | 'cancelled';

export interface FindBackClaim {
  id: string;
  found_report_id: string;
  lost_report_id: string | null;
  finder_id: string;
  claimant_id: string;
  ownership_proof: string;
  status: ClaimStatus;
  claimant_share_name: boolean;
  finder_share_name: boolean;
  created_at: string;
  reviewed_at: string | null;
  handover_at: string | null;
  claimed_at: string | null;
  found_name?: string;
  lost_name?: string;
}

export interface ClaimedItemHistory {
  claim_id: string;
  item_name: string;
  item_category: string;
  claimant_display: string;
  finder_display: string;
  claimed_at: string;
}

export interface ClaimReportChoice {
  id: string;
  name: string;
  item_type: 'lost' | 'found';
  status: string;
  owner_id: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClaimService {

  constructor(
    private readonly auth: AuthService
  ) {}

  private get db() {
    return this.auth.client;
  }

  // =====================================
  // CURRENT USER
  // =====================================

  async currentUserId(): Promise<string> {

    const { data, error } =
      await this.db.auth.getSession();

    if (error || !data.session?.user) {

      throw new Error(
        'Please log in first.'
      );
    }

    return data.session.user.id;
  }

  // =====================================
  // CALL SUPABASE DATABASE FUNCTION
  // =====================================

  private async rpc<T>(
    fn: string,
    args: Record<string, unknown>
  ): Promise<T> {

    const { data, error } =
      await this.db.rpc(fn, args);

    if (error) {
      throw error;
    }

    return data as T;
  }

  // =====================================
  // GET FOUND REPORT
  // =====================================

  async getFoundReport(
    id: string
  ): Promise<ClaimReportChoice> {

    const { data, error } =
      await this.db
        .from('findback_reports')
        .select(
          'id,name,item_type,status,owner_id'
        )
        .eq('id', id)
        .eq('item_type', 'found')
        .single();

    if (error) {
      throw error;
    }

    return data as ClaimReportChoice;
  }

  // =====================================
  // GET OWN LOST REPORTS
  // =====================================

  async getMyLostReports(): Promise<ClaimReportChoice[]> {

    const me =
      await this.currentUserId();

    const { data, error } =
      await this.db
        .from('findback_reports')
        .select(
          'id,name,item_type,status,owner_id'
        )
        .eq('owner_id', me)
        .eq('item_type', 'lost')
        .eq('status', 'active')
        .order(
          'created_at',
          { ascending: false }
        )
        .limit(50);

    if (error) {
      throw error;
    }

    return (data || []) as ClaimReportChoice[];
  }

  // =====================================
  // GET ALL MY CLAIMS
  // =====================================

  async getClaims(): Promise<FindBackClaim[]> {

    const me =
      await this.currentUserId();

    const { data, error } =
      await this.db
        .from('findback_claims')
        .select(
          'id,found_report_id,lost_report_id,finder_id,claimant_id,ownership_proof,status,claimant_share_name,finder_share_name,created_at,reviewed_at,handover_at,claimed_at'
        )
        .or(
          `finder_id.eq.${me},claimant_id.eq.${me}`
        )
        .order(
          'created_at',
          { ascending: false }
        )
        .limit(100);

    if (error) {
      throw error;
    }

    const claims =
      (data || []) as FindBackClaim[];

    const ids = Array.from(
      new Set(
        claims.flatMap(c =>
          c.lost_report_id
            ? [c.found_report_id, c.lost_report_id]
            : [c.found_report_id]
        )
      )
    );

    if (ids.length) {

      const reports =
        await this.db
          .from('findback_reports')
          .select('id,name')
          .in('id', ids);

      if (reports.error) {
        throw reports.error;
      }

      const names = new Map(
        (reports.data || []).map(r => [
          r.id as string,
          r.name as string
        ])
      );

      claims.forEach(c => {

        c.found_name =
          names.get(c.found_report_id) ||
          'Found item';

        c.lost_name = c.lost_report_id
          ? names.get(c.lost_report_id) ||
            'Lost item'
          : undefined;

      });
    }

    return claims;
  }

  // =====================================
  // CLAIMS ACTION COUNT
  // =====================================

  async getActionCount(): Promise<number> {

    const me =
      await this.currentUserId();

    const { data, error } =
      await this.db
        .from('findback_claims')
        .select(
          'finder_id,claimant_id,status'
        )
        .or(
          `finder_id.eq.${me},claimant_id.eq.${me}`
        )
        .in(
          'status',
          [
            'pending',
            'approved',
            'handover_confirmed'
          ]
        );

    if (error) {
      throw error;
    }

    return (data || []).filter(c =>
      (
        c.finder_id === me &&
        (
          c.status === 'pending' ||
          c.status === 'approved'
        )
      )
      ||
      (
        c.claimant_id === me &&
        (
          c.status === 'approved' ||
          c.status === 'handover_confirmed'
        )
      )
    ).length;
  }

  // =====================================
  // REALTIME CLAIM CHANGES
  // =====================================

  subscribe(
    onChange: () => void
  ): RealtimeChannel {

    return this.db
      .channel(
        `findback-claims-${Date.now()}`
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'findback_claims'
        },
        () => onChange()
      )
      .subscribe();
  }

  async unsubscribe(
    channel: RealtimeChannel | null
  ): Promise<void> {

    if (channel) {
      await this.db.removeChannel(channel);
    }
  }

  // =====================================
  // PUBLIC CLAIM HISTORY
  // =====================================

  async getClaimedHistory(): Promise<ClaimedItemHistory[]> {

    return await this.rpc<ClaimedItemHistory[]>(
      'findback_claimed_history',
      {}
    );
  }

  // =====================================
  // REQUEST TO CLAIM
  // =====================================

  async requestClaim(
    foundId: string,
    proof: string,
    lostId: string | null,
    shareName: boolean
  ): Promise<string> {

    return this.rpc<string>(
      'findback_request_claim',
      {
        p_found: foundId,
        p_proof: proof.trim(),
        p_lost: lostId,
        p_share_name: shareName
      }
    );
  }

  // =====================================
  // APPROVE OR REJECT
  // =====================================

  async reviewClaim(
    claimId: string,
    approve: boolean,
    shareName: boolean
  ): Promise<void> {

    await this.rpc(
      'findback_review_claim',
      {
        p_claim: claimId,
        p_approve: approve,
        p_share_name: shareName
      }
    );
  }

  // =====================================
  // ISSUE HANDOVER CODE
  // =====================================

  async issueCode(
    claimId: string
  ): Promise<string> {

    return this.rpc<string>(
      'findback_issue_claim_code',
      {
        p_claim: claimId
      }
    );
  }

  // =====================================
  // VERIFY HANDOVER CODE
  // =====================================

  async verifyCode(
    claimId: string,
    code: string
  ): Promise<boolean> {

    return this.rpc<boolean>(
      'findback_verify_claim_code',
      {
        p_claim: claimId,
        p_code: code.trim()
      }
    );
  }

  // =====================================
  // CONFIRM RECEIPT
  // =====================================

  async confirmReceipt(
    claimId: string
  ): Promise<void> {

    await this.rpc(
      'findback_confirm_claim_receipt',
      {
        p_claim: claimId
      }
    );
  }

  // =====================================
  // CANCEL PENDING CLAIM
  // =====================================

  async cancel(
    claimId: string
  ): Promise<void> {

    await this.rpc(
      'findback_cancel_claim',
      {
        p_claim: claimId
      }
    );
  }
}
