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
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email: string;
          timezone?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string;
          timezone?: string;
          created_at?: string;
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
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

interface RecurrenceRuleJson {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  days?: string[];
  day_of_month?: number;
}
