// AUTOMATISCH GEGENEREERD uit supabase/migrations — niet met de hand aanpassen.
// Opnieuw genereren:  npm run db:types:local
// Zodra het Supabase-project gelinkt is, gebruik je de echte generator:
//                     npm run db:types

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: number;
          timezone: string;
          monthly_coins: number;
          coin_cap: number;
          auction_scope: string;
          min_notice_minutes: number;
          max_photos_per_user_per_appt: number;
        };
        Insert: {
          id?: number;
          timezone?: string;
          monthly_coins?: number;
          coin_cap?: number;
          auction_scope?: string;
          min_notice_minutes?: number;
          max_photos_per_user_per_appt?: number;
        };
        Update: {
          id?: number;
          timezone?: string;
          monthly_coins?: number;
          coin_cap?: number;
          auction_scope?: string;
          min_notice_minutes?: number;
          max_photos_per_user_per_appt?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          emoji: string;
          color: string;
          avatar_url: string | null;
          role: Database["public"]["Enums"]["app_role"];
          notif_prefs: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          emoji?: string;
          color?: string;
          avatar_url?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          notif_prefs?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          emoji?: string;
          color?: string;
          avatar_url?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          notif_prefs?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          emoji: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          emoji?: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          emoji?: string;
          color?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ideas: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: Database["public"]["Enums"]["appt_category"];
          created_by: string;
          done: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          category?: Database["public"]["Enums"]["appt_category"];
          created_by: string;
          done?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          category?: Database["public"]["Enums"]["appt_category"];
          created_by?: string;
          done?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      idea_votes: {
        Row: {
          idea_id: string;
          user_id: string;
        };
        Insert: {
          idea_id: string;
          user_id: string;
        };
        Update: {
          idea_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      saved_places: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          lat: number;
          lng: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          lat: number;
          lng: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          lat?: number;
          lng?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      recurring_series: {
        Row: {
          id: string;
          created_by: string;
          title: string;
          category: Database["public"]["Enums"]["appt_category"];
          freq: Database["public"]["Enums"]["series_freq"];
          first_starts_at: string;
          duration_minutes: number;
          until_date: string;
          location_name: string | null;
          location_address: string | null;
          lat: number | null;
          lng: number | null;
          status: Database["public"]["Enums"]["series_status"];
          generated_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          title: string;
          category?: Database["public"]["Enums"]["appt_category"];
          freq?: Database["public"]["Enums"]["series_freq"];
          first_starts_at: string;
          duration_minutes: number;
          until_date: string;
          location_name?: string | null;
          location_address?: string | null;
          lat?: number | null;
          lng?: number | null;
          status?: Database["public"]["Enums"]["series_status"];
          generated_until?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string;
          title?: string;
          category?: Database["public"]["Enums"]["appt_category"];
          freq?: Database["public"]["Enums"]["series_freq"];
          first_starts_at?: string;
          duration_minutes?: number;
          until_date?: string;
          location_name?: string | null;
          location_address?: string | null;
          lat?: number | null;
          lng?: number | null;
          status?: Database["public"]["Enums"]["series_status"];
          generated_until?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      auctions: {
        Row: {
          id: string;
          day: string;
          status: string;
          closes_at: string;
          winner_appointment_id: string | null;
          owner_reminded: boolean;
          created_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          day: string;
          status?: string;
          closes_at: string;
          winner_appointment_id?: string | null;
          owner_reminded?: boolean;
          created_at?: string;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          day?: string;
          status?: string;
          closes_at?: string;
          winner_appointment_id?: string | null;
          owner_reminded?: boolean;
          created_at?: string;
          closed_at?: string | null;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          type: Database["public"]["Enums"]["appt_type"];
          title: string;
          category: Database["public"]["Enums"]["appt_category"];
          description: string | null;
          created_by: string;
          starts_at: string | null;
          ends_at: string | null;
          location_name: string | null;
          location_address: string | null;
          lat: number | null;
          lng: number | null;
          is_priority: boolean;
          status: Database["public"]["Enums"]["appt_status"];
          auction_id: string | null;
          series_id: string | null;
          idea_id: string | null;
          has_poll: boolean;
          poll_closes_at: string | null;
          decline_reason: string | null;
          decided_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type?: Database["public"]["Enums"]["appt_type"];
          title: string;
          category?: Database["public"]["Enums"]["appt_category"];
          description?: string | null;
          created_by: string;
          starts_at?: string | null;
          ends_at?: string | null;
          location_name?: string | null;
          location_address?: string | null;
          lat?: number | null;
          lng?: number | null;
          is_priority?: boolean;
          status?: Database["public"]["Enums"]["appt_status"];
          auction_id?: string | null;
          series_id?: string | null;
          idea_id?: string | null;
          has_poll?: boolean;
          poll_closes_at?: string | null;
          decline_reason?: string | null;
          decided_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: Database["public"]["Enums"]["appt_type"];
          title?: string;
          category?: Database["public"]["Enums"]["appt_category"];
          description?: string | null;
          created_by?: string;
          starts_at?: string | null;
          ends_at?: string | null;
          location_name?: string | null;
          location_address?: string | null;
          lat?: number | null;
          lng?: number | null;
          is_priority?: boolean;
          status?: Database["public"]["Enums"]["appt_status"];
          auction_id?: string | null;
          series_id?: string | null;
          idea_id?: string | null;
          has_poll?: boolean;
          poll_closes_at?: string | null;
          decline_reason?: string | null;
          decided_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      appointment_participants: {
        Row: {
          appointment_id: string;
          user_id: string;
          rsvp: Database["public"]["Enums"]["rsvp_status"];
          checked_in_at: string | null;
          reminded_24h: boolean;
          reminded_1h: boolean;
        };
        Insert: {
          appointment_id: string;
          user_id: string;
          rsvp?: Database["public"]["Enums"]["rsvp_status"];
          checked_in_at?: string | null;
          reminded_24h?: boolean;
          reminded_1h?: boolean;
        };
        Update: {
          appointment_id?: string;
          user_id?: string;
          rsvp?: Database["public"]["Enums"]["rsvp_status"];
          checked_in_at?: string | null;
          reminded_24h?: boolean;
          reminded_1h?: boolean;
        };
        Relationships: [];
      };
      counter_proposals: {
        Row: {
          id: string;
          appointment_id: string;
          proposed_by: string;
          starts_at: string;
          ends_at: string;
          message: string | null;
          status: Database["public"]["Enums"]["counter_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          proposed_by: string;
          starts_at: string;
          ends_at: string;
          message?: string | null;
          status?: Database["public"]["Enums"]["counter_status"];
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          proposed_by?: string;
          starts_at?: string;
          ends_at?: string;
          message?: string | null;
          status?: Database["public"]["Enums"]["counter_status"];
          created_at?: string;
        };
        Relationships: [];
      };
      appointment_groups: {
        Row: {
          appointment_id: string;
          group_id: string;
        };
        Insert: {
          appointment_id: string;
          group_id: string;
        };
        Update: {
          appointment_id?: string;
          group_id?: string;
        };
        Relationships: [];
      };
      poll_options: {
        Row: {
          id: string;
          appointment_id: string;
          starts_at: string;
          ends_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          starts_at: string;
          ends_at: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          starts_at?: string;
          ends_at?: string;
        };
        Relationships: [];
      };
      poll_votes: {
        Row: {
          option_id: string;
          user_id: string;
          vote: Database["public"]["Enums"]["poll_vote_value"];
        };
        Insert: {
          option_id: string;
          user_id: string;
          vote: Database["public"]["Enums"]["poll_vote_value"];
        };
        Update: {
          option_id?: string;
          user_id?: string;
          vote?: Database["public"]["Enums"]["poll_vote_value"];
        };
        Relationships: [];
      };
      bids: {
        Row: {
          id: string;
          auction_id: string;
          appointment_id: string;
          user_id: string;
          amount: number;
          sweetener: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auction_id: string;
          appointment_id: string;
          user_id: string;
          amount?: number;
          sweetener?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auction_id?: string;
          appointment_id?: string;
          user_id?: string;
          amount?: number;
          sweetener?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      coin_ledger: {
        Row: {
          id: number;
          user_id: string;
          amount: number;
          reason: Database["public"]["Enums"]["coin_reason"];
          appointment_id: string | null;
          auction_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          amount: number;
          reason: Database["public"]["Enums"]["coin_reason"];
          appointment_id?: string | null;
          auction_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          amount?: number;
          reason?: Database["public"]["Enums"]["coin_reason"];
          appointment_id?: string | null;
          auction_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      availability_rules: {
        Row: {
          id: string;
          weekday: number;
          start_time: string;
          end_time: string;
        };
        Insert: {
          id?: string;
          weekday: number;
          start_time: string;
          end_time: string;
        };
        Update: {
          id?: string;
          weekday?: number;
          start_time?: string;
          end_time?: string;
        };
        Relationships: [];
      };
      owner_items: {
        Row: {
          id: string;
          kind: Database["public"]["Enums"]["owner_item_kind"];
          title: string;
          notes: string | null;
          starts_at: string | null;
          ends_at: string | null;
          due_date: string | null;
          done: boolean;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          kind: Database["public"]["Enums"]["owner_item_kind"];
          title: string;
          notes?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          due_date?: string | null;
          done?: boolean;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          kind?: Database["public"]["Enums"]["owner_item_kind"];
          title?: string;
          notes?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          due_date?: string | null;
          done?: boolean;
          color?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      free_today: {
        Row: {
          id: string;
          created_by: string;
          day: string;
          from_time: string;
          to_time: string;
          message: string | null;
          group_id: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          day: string;
          from_time: string;
          to_time: string;
          message?: string | null;
          group_id?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string;
          day?: string;
          from_time?: string;
          to_time?: string;
          message?: string | null;
          group_id?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      memories: {
        Row: {
          id: string;
          appointment_id: string;
          user_id: string;
          storage_path: string;
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          user_id: string;
          storage_path: string;
          caption?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          user_id?: string;
          storage_path?: string;
          caption?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      badges: {
        Row: {
          code: string;
          name: string;
          emoji: string;
          description: string;
          is_role_badge: boolean;
        };
        Insert: {
          code: string;
          name: string;
          emoji: string;
          description: string;
          is_role_badge?: boolean;
        };
        Update: {
          code?: string;
          name?: string;
          emoji?: string;
          description?: string;
          is_role_badge?: boolean;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          id: number;
          user_id: string;
          badge_code: string;
          period: string | null;
          awarded_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          badge_code: string;
          period?: string | null;
          awarded_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          badge_code?: string;
          period?: string | null;
          awarded_at?: string;
        };
        Relationships: [];
      };
      wrapped: {
        Row: {
          id: string;
          user_id: string;
          period: string;
          data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          period: string;
          data: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          period?: string;
          data?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          url: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          url?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string;
          url?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      calendar_tokens: {
        Row: {
          user_id: string;
          token: string;
        };
        Insert: {
          user_id: string;
          token?: string;
        };
        Update: {
          user_id?: string;
          token?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      coin_balances: {
        Row: { user_id: string | null; balance: number | null };
        Relationships: [];
      };
    };
    Functions: {
      admin_adjust_coins: { Args: { p_user: string; p_amount: number; p_note?: string }; Returns: undefined };
      admin_set_role: { Args: { p_user: string; p_role: Database["public"]["Enums"]["app_role"] }; Returns: undefined };
      broadcast_free_today: { Args: { p_from: string; p_to: string; p_message?: string; p_group?: string }; Returns: string };
      can_see_appointment: { Args: { a_id: string }; Returns: boolean };
      cancel_appointment: { Args: { p_id: string; p_reason?: string }; Returns: undefined };
      check_in: { Args: { p_id: string }; Returns: string };
      check_invite_code: { Args: { p_code: string }; Returns: boolean };
      close_auction: { Args: { p_auction: string; p_winner: string; p_also_accept?: string[] }; Returns: undefined };
      counter_propose: { Args: { p_id: string; p_starts: string; p_ends: string; p_message?: string }; Returns: string };
      create_group_activity: { Args: { p_title: string; p_category: Database["public"]["Enums"]["appt_category"]; p_description: string; p_starts_at?: string; p_ends_at?: string; p_location_name?: string; p_location_address?: string; p_lat?: number; p_lng?: number; p_user_ids?: string[]; p_group_ids?: string[]; p_poll_options?: Json; p_poll_closes_at?: string }; Returns: string };
      end_series: { Args: { p_series: string }; Returns: undefined };
      finalize_poll: { Args: { p_id: string; p_option: string }; Returns: undefined };
      get_busy_slots: { Args: { p_from: string; p_to: string }; Returns: { starts_at: string; ends_at: string }[] };
      get_day_demand: { Args: { p_day: string }; Returns: number };
      is_owner: { Args: Record<string, never>; Returns: boolean };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      my_role: { Args: Record<string, never>; Returns: Database["public"]["Enums"]["app_role"] };
      place_bid: { Args: { p_auction: string; p_amount: number; p_sweetener?: string }; Returns: undefined };
      request_appointment: { Args: { p_title: string; p_category: Database["public"]["Enums"]["appt_category"]; p_description: string; p_starts_at: string; p_ends_at: string; p_location_name?: string; p_location_address?: string; p_lat?: number; p_lng?: number; p_is_priority?: boolean; p_idea_id?: string }; Returns: string };
      request_series: { Args: { p_title: string; p_category: Database["public"]["Enums"]["appt_category"]; p_freq: Database["public"]["Enums"]["series_freq"]; p_first_starts_at: string; p_duration_minutes: number; p_until_date: string; p_location_name?: string; p_location_address?: string; p_lat?: number; p_lng?: number }; Returns: string };
      respond_appointment: { Args: { p_id: string; p_action: string; p_reason?: string }; Returns: undefined };
      respond_counter: { Args: { p_counter: string; p_action: string; p_starts?: string; p_ends?: string }; Returns: undefined };
      respond_series: { Args: { p_series: string; p_accept: boolean }; Returns: undefined };
      role_weight: { Args: { r: Database["public"]["Enums"]["app_role"] }; Returns: number };
      rsvp: { Args: { p_id: string; p_status: Database["public"]["Enums"]["rsvp_status"] }; Returns: undefined };
      set_invite_code: { Args: { p_code: string }; Returns: undefined };
      username_to_email: { Args: { p_username: string }; Returns: string };
      vote_poll: { Args: { p_option: string; p_vote: Database["public"]["Enums"]["poll_vote_value"] }; Returns: undefined };
    };
    Enums: {
      app_role: "owner" | "admin" | "vip" | "member";
      appt_type: "solo" | "group";
      appt_status: "pending" | "countered" | "auction" | "accepted" | "declined" | "cancelled" | "expired";
      rsvp_status: "invited" | "going" | "maybe" | "not_going";
      appt_category: "koffie" | "eten" | "brunch" | "shoppen" | "film" | "sport" | "studeren" | "uitgaan" | "wandelen" | "gaming" | "selfcare" | "anders";
      coin_reason: "welcome" | "monthly_grant" | "priority_request" | "priority_refund" | "bid_hold" | "bid_refund" | "admin_adjust";
      counter_status: "open" | "accepted" | "rejected" | "superseded";
      owner_item_kind: "block" | "task";
      poll_vote_value: "yes" | "maybe" | "no";
      series_status: "pending" | "accepted" | "declined" | "ended";
      series_freq: "weekly" | "biweekly" | "monthly";
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
