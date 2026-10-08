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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          price: number
          used_at: string | null
          used_by: string | null
          video_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          price?: number
          used_at?: string | null
          used_by?: string | null
          video_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          price?: number
          used_at?: string | null
          used_by?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_codes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          answers: Json
          essay_score: number
          essay_scores: Json
          exam_id: string
          grading_status: string
          id: string
          objective_score: number
          score: number
          submitted_at: string
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json
          essay_score?: number
          essay_scores?: Json
          exam_id: string
          grading_status?: string
          id?: string
          objective_score?: number
          score?: number
          submitted_at?: string
          total?: number
          user_id: string
        }
        Update: {
          answers?: Json
          essay_score?: number
          essay_scores?: Json
          exam_id?: string
          grading_status?: string
          id?: string
          objective_score?: number
          score?: number
          submitted_at?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      center_grades: {
        Row: {
          created_at: string
          exam_date: string
          exam_title: string
          id: string
          score: number
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_date?: string
          exam_title: string
          id?: string
          score?: number
          total?: number
          user_id: string
        }
        Update: {
          created_at?: string
          exam_date?: string
          exam_title?: string
          id?: string
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "center_grades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          description: string
          folder_id: string | null
          id: string
          is_closed: boolean
          stage: Database["public"]["Enums"]["stage_level"]
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          folder_id?: string | null
          id?: string
          is_closed?: boolean
          stage: Database["public"]["Enums"]["stage_level"]
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          folder_id?: string | null
          id?: string
          is_closed?: boolean
          stage?: Database["public"]["Enums"]["stage_level"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          stage: Database["public"]["Enums"]["stage_level"]
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          stage: Database["public"]["Enums"]["stage_level"]
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          stage?: Database["public"]["Enums"]["stage_level"]
          title?: string
        }
        Relationships: []
      }
      lecture_progress: {
        Row: {
          completed: boolean
          duration_seconds: number
          first_watched_at: string
          id: string
          last_watched_at: string
          position_seconds: number
          user_id: string
          video_id: string
        }
        Insert: {
          completed?: boolean
          duration_seconds?: number
          first_watched_at?: string
          id?: string
          last_watched_at?: string
          position_seconds?: number
          user_id?: string
          video_id: string
        }
        Update: {
          completed?: boolean
          duration_seconds?: number
          first_watched_at?: string
          id?: string
          last_watched_at?: string
          position_seconds?: number
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: string
          body: string
          created_at: string
          id: string
          link_data: Json
          read_by: Json
          stage: Database["public"]["Enums"]["stage_level"] | null
          title: string
          user_id: string | null
        }
        Insert: {
          audience?: string
          body?: string
          created_at?: string
          id?: string
          link_data?: Json
          read_by?: Json
          stage?: Database["public"]["Enums"]["stage_level"] | null
          title: string
          user_id?: string | null
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          id?: string
          link_data?: Json
          read_by?: Json
          stage?: Database["public"]["Enums"]["stage_level"] | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          parent_phone: string
          stage: Database["public"]["Enums"]["stage_level"] | null
          status: Database["public"]["Enums"]["account_status"]
          whatsapp: string
        }
        Insert: {
          address?: string
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          parent_phone?: string
          stage?: Database["public"]["Enums"]["stage_level"] | null
          status?: Database["public"]["Enums"]["account_status"]
          whatsapp?: string
        }
        Update: {
          address?: string
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          parent_phone?: string
          stage?: Database["public"]["Enums"]["stage_level"] | null
          status?: Database["public"]["Enums"]["account_status"]
          whatsapp?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_index: number
          created_at: string
          exam_id: string
          id: string
          image_url: string | null
          options: Json
          points: number
          prompt: string
          q_order: number
          question_type: string
        }
        Insert: {
          correct_index?: number
          created_at?: string
          exam_id: string
          id?: string
          image_url?: string | null
          options?: Json
          points?: number
          prompt?: string
          q_order?: number
          question_type?: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          exam_id?: string
          id?: string
          image_url?: string | null
          options?: Json
          points?: number
          prompt?: string
          q_order?: number
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      student_absences: {
        Row: {
          absence_date: string
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          absence_date?: string
          created_at?: string
          id?: string
          reason?: string
          user_id: string
        }
        Update: {
          absence_date?: string
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_absences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_unlocks: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_unlocks_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string
          folder_id: string | null
          id: string
          is_locked: boolean
          price: number
          source: Database["public"]["Enums"]["video_source"]
          stage: Database["public"]["Enums"]["stage_level"]
          title: string
          url: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string
          folder_id?: string | null
          id?: string
          is_locked?: boolean
          price?: number
          source?: Database["public"]["Enums"]["video_source"]
          stage: Database["public"]["Enums"]["stage_level"]
          title: string
          url: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string
          folder_id?: string | null
          id?: string
          is_locked?: boolean
          price?: number
          source?: Database["public"]["Enums"]["video_source"]
          stage?: Database["public"]["Enums"]["stage_level"]
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_access_codes: {
        Args: { _count: number; _video_id: string }
        Returns: {
          code: string
          created_at: string
          id: string
          price: number
          used_at: string | null
          used_by: string | null
          video_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "access_codes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_exam_questions: {
        Args: { _exam_id: string }
        Returns: {
          id: string
          image_url: string
          options: Json
          points: number
          prompt: string
          q_order: number
          question_type: string
        }[]
      }
      get_exam_review: {
        Args: { _exam_id: string }
        Returns: {
          correct_index: number
          id: string
          image_url: string
          options: Json
          points: number
          prompt: string
          q_order: number
          question_type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_approved: { Args: never; Returns: boolean }
      grade_attempt_essays: {
        Args: { _attempt_id: string; _essay_scores: Json }
        Returns: Json
      }
      leaderboard: {
        Args: { _stage: Database["public"]["Enums"]["stage_level"] }
        Returns: {
          avatar_url: string
          full_name: string
          percent: number
          score: number
          total: number
          user_id: string
        }[]
      }
      mark_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: { Args: { _notification_id: string }; Returns: undefined }
      my_stage: {
        Args: never
        Returns: Database["public"]["Enums"]["stage_level"]
      }
      redeem_code: { Args: { _code: string; _video_id: string }; Returns: Json }
      submit_attempt: {
        Args: { _answers: Json; _exam_id: string }
        Returns: Json
      }
    }
    Enums: {
      account_status: "pending" | "approved" | "blocked"
      app_role: "admin" | "student"
      stage_level: "prep3" | "sec1" | "sec2" | "sec3"
      video_source: "upload" | "youtube" | "external"
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
    Enums: {
      account_status: ["pending", "approved", "blocked"],
      app_role: ["admin", "student"],
      stage_level: ["prep3", "sec1", "sec2", "sec3"],
      video_source: ["upload", "youtube", "external"],
    },
  },
} as const
