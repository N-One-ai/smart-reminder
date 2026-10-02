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
      conversations: {
        Row: {
          id: string;
          user_a_id: string;
          user_b_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_a_id: string;
          user_b_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_a_id?: string;
          user_b_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          user_id: string;
          last_read_at: string;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          last_read_at?: string;
          created_at?: string;
        };
        Update: {
          conversation_id?: string;
          user_id?: string;
          last_read_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string | null;
          attachment_type: AttachmentType | null;
          attachment_path: string | null;
          attachment_mime_type: string | null;
          attachment_size: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content?: string | null;
          attachment_type?: AttachmentType | null;
          attachment_path?: string | null;
          attachment_mime_type?: string | null;
          attachment_size?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string | null;
          attachment_type?: AttachmentType | null;
          attachment_path?: string | null;
          attachment_mime_type?: string | null;
          attachment_size?: number | null;
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
      unread_message_counts: {
        Row: {
          conversation_id: string;
          unread_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      send_connection_request: {
        Args: { target_user_id: string };
        Returns: Database["public"]["Tables"]["connections"]["Row"];
      };
      get_or_create_conversation: {
        Args: { other_user_id: string };
        Returns: string;
      };
    };
  };
}

export type ConnectionStatus = "pending" | "accepted" | "rejected";
export type AttachmentType = "image";

interface RecurrenceRuleJson {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  days?: string[];
  day_of_month?: number;
}
