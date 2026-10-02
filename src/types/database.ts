/**
 * Hand-written to match supabase/migrations/*.sql exactly.
 * Regenerate with `supabase gen types typescript` once the CLI is linked, if preferred.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string;
          timezone: string;
          avatar_url: string | null;
          username: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email: string;
          timezone?: string;
          avatar_url?: string | null;
          username?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string;
          timezone?: string;
          avatar_url?: string | null;
          username?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      connections: {
        Row: {
          id: string;
          requester_id: string;
          receiver_id: string;
          status: ConnectionStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          receiver_id: string;
          status?: ConnectionStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          receiver_id?: string;
          status?: ConnectionStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          date: string;
          time: string;
          timezone: string;
          repeat_rule: RecurrenceRuleJson | null;
          status: "pending" | "completed";
          completed_at: string | null;
          last_completed_date: string | null;
          notified_at: string | null;
          source: "ai" | "manual";
          ai_confidence: number | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          date: string;
          time: string;
          timezone: string;
          repeat_rule?: RecurrenceRuleJson | null;
          status?: "pending" | "completed";
          completed_at?: string | null;
          last_completed_date?: string | null;
          notified_at?: string | null;
          source?: "ai" | "manual";
          ai_confidence?: number | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          date?: string;
          time?: string;
          timezone?: string;
          repeat_rule?: RecurrenceRuleJson | null;
          status?: "pending" | "completed";
          completed_at?: string | null;
          last_completed_date?: string | null;
          notified_at?: string | null;
          source?: "ai" | "manual";
          ai_confidence?: number | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      profiles_public: {
        Row: {
          id: string;
          name: string | null;
          username: string | null;
          avatar_url: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      send_connection_request: {
        Args: { target_user_id: string };
        Returns: Database["public"]["Tables"]["connections"]["Row"];
      };
    };
  };
}

export type ConnectionStatus = "pending" | "accepted" | "rejected";

interface RecurrenceRuleJson {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  days?: string[];
  day_of_month?: number;
}
