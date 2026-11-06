export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      events: {
        Row: {
          category: string
          created_at: string
          day: number
          id: string
          month: number
          title: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          day: number
          id?: string
          month: number
          title: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          day?: number
          id?: string
          month?: number
          title?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      goal_comments: {
        Row: {
          author_name: string
          body: string
          created_at: string
          goal_id: string
          id: string
          workspace_id: string
        }
        Insert: {
          author_name?: string
          body: string
          created_at?: string
          goal_id: string
          id?: string
          workspace_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          goal_id?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          assignee: string
          category: string
          created_at: string
          end_month: number
          habit: string
          habit_target: number
          id: string
          milestones: Json
          start_month: number
          status: string
          title: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          assignee?: string
          category: string
          created_at?: string
          end_month?: number
          habit?: string
          habit_target?: number
          id?: string
          milestones?: Json
          start_month?: number
          status?: string
          title: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          assignee?: string
          category?: string
          created_at?: string
          end_month?: number
          habit?: string
          habit_target?: number
          id?: string
          milestones?: Json
          start_month?: number
          status?: string
          title?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          day: string
          goal_id: string
          user_id: string
        }
        Insert: {
          day: string
          goal_id: string
          user_id?: string
        }
        Update: {
          day?: string
          goal_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_status: {
        Row: {
          blockers: string
          goal_id: string
          health: string
          progress: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          blockers?: string
          goal_id: string
          health?: string
          progress?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          blockers?: string
          goal_id?: string
          health?: string
          progress?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_status_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assignee: string
          col: string
          created_at: string
          due: string | null
          goal_id: string
          id: string
          position: number
          title: string
          workspace_id: string
        }
        Insert: {
          assignee?: string
          col?: string
          created_at?: string
          due?: string | null
          goal_id: string
          id?: string
          position?: number
          title?: string
          workspace_id: string
        }
        Update: {
          assignee?: string
          col?: string
          created_at?: string
          due?: string | null
          goal_id?: string
          id?: string
          position?: number
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      quarter_comments: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          quarter: number
          workspace_id: string
        }
        Insert: {
          author_name?: string
          body: string
          created_at?: string
          id?: string
          quarter: number
          workspace_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          quarter?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarter_comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      quarter_energy: {
        Row: {
          level: string
          quarter: number
          user_id: string
          year: number
        }
        Insert: {
          level?: string
          quarter: number
          user_id?: string
          year: number
        }
        Update: {
          level?: string
          quarter?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      reflections: {
        Row: {
          answers: Json
          period_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          period_key: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          answers?: Json
          period_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_focus: {
        Row: {
          items: Json
          updated_at: string
          user_id: string
          week_key: string
        }
        Insert: {
          items?: Json
          updated_at?: string
          user_id?: string
          week_key: string
        }
        Update: {
          items?: Json
          updated_at?: string
          user_id?: string
          week_key?: string
        }
        Relationships: []
      }
      whiteboard_notes: {
        Row: {
          color: string
          content: string
          created_at: string
          height: number
          id: string
          is_checklist: boolean
          items: Json
          pos_x: number
          pos_y: number
          rotation: number
          updated_at: string
          user_id: string
          width: number
          workspace_id: string | null
        }
        Insert: {
          color?: string
          content?: string
          created_at?: string
          height?: number
          id?: string
          is_checklist?: boolean
          items?: Json
          pos_x?: number
          pos_y?: number
          rotation?: number
          updated_at?: string
          user_id?: string
          width?: number
          workspace_id?: string | null
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          height?: number
          id?: string
          is_checklist?: boolean
          items?: Json
          pos_x?: number
          pos_y?: number
          rotation?: number
          updated_at?: string
          user_id?: string
          width?: number
          workspace_id?: string | null
        }
        Relationships: []
      }
      whiteboard_strokes: {
        Row: {
          color: string
          created_at: string
          id: string
          points: Json
          size: number
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          points?: Json
          size?: number
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          points?: Json
          size?: number
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string
          role?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_share_secrets: {
        Row: {
          pw_hash: string
          workspace_id: string
        }
        Insert: {
          pw_hash: string
          workspace_id: string
        }
        Update: {
          pw_hash?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_share_secrets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_email: string
          owner_id: string
          owner_name: string
          share_enabled: boolean
          share_has_password: boolean
          share_token: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_email?: string
          owner_id: string
          owner_name?: string
          share_enabled?: boolean
          share_has_password?: boolean
          share_token?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_email?: string
          owner_id?: string
          owner_name?: string
          share_enabled?: boolean
          share_has_password?: boolean
          share_token?: string | null
        }
        Relationships: []
      }
      year_reviews: {
        Row: {
          content: Json
          created_at: string
          user_id: string
          year: number
        }
        Insert: {
          content?: Json
          created_at?: string
          user_id?: string
          year: number
        }
        Update: {
          content?: Json
          created_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_shared_comment: {
        Args: { _body: string; _goal: string; _name: string; _token: string }
        Returns: undefined
      }
      add_shared_comment_v2: {
        Args: {
          _body: string
          _goal: string
          _name: string
          _pw: string
          _quarter: number
          _token: string
        }
        Returns: undefined
      }
      get_shared_plan: { Args: { _token: string }; Returns: Json }
      get_shared_plan_v2: {
        Args: { _pw: string; _token: string }
        Returns: Json
      }
      personal_workspace: { Args: { _uid: string }; Returns: string }
      set_display_name: { Args: { _name: string }; Returns: undefined }
      set_share_password: {
        Args: { _pw: string; _ws: string }
        Returns: undefined
      }
      shared_ws: { Args: { _pw: string; _token: string }; Returns: string }
      ws_role: { Args: { _ws: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
