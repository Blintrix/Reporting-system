export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      fault_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          event_type: string;
          fault_id: string;
          id: string;
          payload: Json | null;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          event_type: string;
          fault_id: string;
          id?: string;
          payload?: Json | null;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          event_type?: string;
          fault_id?: string;
          id?: string;
          payload?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "fault_events_fault_id_fkey";
            columns: ["fault_id"];
            isOneToOne: false;
            referencedRelation: "faults";
            referencedColumns: ["id"];
          },
        ];
      };
      faults: {
        Row: {
          assigned_technician_id: string | null;
          audio_url: string | null;
          category: string | null;
          client_uuid: string | null;
          created_at: string;
          detected_language: Database["public"]["Enums"]["fault_language"];
          id: string;
          lat: number | null;
          lng: number | null;
          location_accuracy: number | null;
          photo_url: string | null;
          raw_transcript: string;
          reporter_id: string;
          severity: Database["public"]["Enums"]["fault_severity"];
          status: Database["public"]["Enums"]["fault_status"];
          technical_summary: string;
          updated_at: string;
        };
        Insert: {
          assigned_technician_id?: string | null;
          audio_url?: string | null;
          category?: string | null;
          client_uuid?: string | null;
          created_at?: string;
          detected_language?: Database["public"]["Enums"]["fault_language"];
          id?: string;
          lat?: number | null;
          lng?: number | null;
          location_accuracy?: number | null;
          photo_url?: string | null;
          raw_transcript?: string;
          reporter_id: string;
          severity?: Database["public"]["Enums"]["fault_severity"];
          status?: Database["public"]["Enums"]["fault_status"];
          technical_summary?: string;
          updated_at?: string;
        };
        Update: {
          assigned_technician_id?: string | null;
          audio_url?: string | null;
          category?: string | null;
          client_uuid?: string | null;
          created_at?: string;
          detected_language?: Database["public"]["Enums"]["fault_language"];
          id?: string;
          lat?: number | null;
          lng?: number | null;
          location_accuracy?: number | null;
          photo_url?: string | null;
          raw_transcript?: string;
          reporter_id?: string;
          severity?: Database["public"]["Enums"]["fault_severity"];
          status?: Database["public"]["Enums"]["fault_status"];
          technical_summary?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          language_pref: Database["public"]["Enums"]["fault_language"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          language_pref?: Database["public"]["Enums"]["fault_language"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          language_pref?: Database["public"]["Enums"]["fault_language"];
          updated_at?: string;
        };
        Relationships: [];
      };
      technician_locations: {
        Row: {
          accuracy: number | null;
          heading: number | null;
          lat: number;
          lng: number;
          speed: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accuracy?: number | null;
          heading?: number | null;
          lat: number;
          lng: number;
          speed?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accuracy?: number | null;
          heading?: number | null;
          lat?: number;
          lng?: number;
          speed?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "reporter" | "admin" | "technician";
      fault_language: "en" | "sn" | "nd";
      fault_severity: "low" | "medium" | "high" | "critical";
      fault_status: "new" | "triaged" | "assigned" | "acknowledged" | "in_progress" | "resolved";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["reporter", "admin", "technician"],
      fault_language: ["en", "sn", "nd"],
      fault_severity: ["low", "medium", "high", "critical"],
      fault_status: ["new", "triaged", "assigned", "acknowledged", "in_progress", "resolved"],
    },
  },
} as const;
