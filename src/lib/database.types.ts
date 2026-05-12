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
      articles: {
        Row: {
          author_id: string
          body_md: string | null
          category_id: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean
          published_at: string | null
          reading_minutes: number | null
          seo_description: string | null
          seo_keyword: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["article_status"]
          subcategory: string | null
          subtitle: string | null
          tags: string[]
          title: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          author_id: string
          body_md?: string | null
          category_id: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          reading_minutes?: number | null
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["article_status"]
          subcategory?: string | null
          subtitle?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          author_id?: string
          body_md?: string | null
          category_id?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          reading_minutes?: number | null
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["article_status"]
          subcategory?: string | null
          subtitle?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      authors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          email: string
          handle: string | null
          id: string
          job_title: string | null
          joined_at: string
          location: string | null
          role: Database["public"]["Enums"]["author_role"]
          slug: string
          social_links: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          email: string
          handle?: string | null
          id?: string
          job_title?: string | null
          joined_at?: string
          location?: string | null
          role?: Database["public"]["Enums"]["author_role"]
          slug: string
          social_links?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          email?: string
          handle?: string | null
          id?: string
          job_title?: string | null
          joined_at?: string
          location?: string | null
          role?: Database["public"]["Enums"]["author_role"]
          slug?: string
          social_links?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          name_de: string
          name_en: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name_de: string
          name_en?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name_de?: string
          name_en?: string | null
          slug?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_author_id: string | null
          display_name: string | null
          email: string
          expires_at: string
          id: string
          intended_role: Database["public"]["Enums"]["author_role"]
          invited_at: string
          invited_by_id: string | null
          revoked_at: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_author_id?: string | null
          display_name?: string | null
          email: string
          expires_at?: string
          id?: string
          intended_role?: Database["public"]["Enums"]["author_role"]
          invited_at?: string
          invited_by_id?: string | null
          revoked_at?: string | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_author_id?: string | null
          display_name?: string | null
          email?: string
          expires_at?: string
          id?: string
          intended_role?: Database["public"]["Enums"]["author_role"]
          invited_at?: string
          invited_by_id?: string | null
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_created_author_id_fkey"
            columns: ["created_author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_by_id_fkey"
            columns: ["invited_by_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      podcasts: {
        Row: {
          apple_podcasts_url: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          language: string
          podcast_category: string
          recommended_at: string
          recommended_by_id: string | null
          recommended_by_note: string | null
          related_article_slug: string | null
          spotify_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          apple_podcasts_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          language: string
          podcast_category: string
          recommended_at?: string
          recommended_by_id?: string | null
          recommended_by_note?: string | null
          related_article_slug?: string | null
          spotify_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          apple_podcasts_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          language?: string
          podcast_category?: string
          recommended_at?: string
          recommended_by_id?: string | null
          recommended_by_note?: string | null
          related_article_slug?: string | null
          spotify_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcasts_recommended_by_id_fkey"
            columns: ["recommended_by_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      revisions: {
        Row: {
          article_id: string
          body_md_snapshot: string | null
          created_at: string
          editor_id: string | null
          id: string
          new_status: Database["public"]["Enums"]["article_status"]
          notes: string | null
          previous_status: Database["public"]["Enums"]["article_status"] | null
          title_snapshot: string
        }
        Insert: {
          article_id: string
          body_md_snapshot?: string | null
          created_at?: string
          editor_id?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["article_status"]
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["article_status"] | null
          title_snapshot: string
        }
        Update: {
          article_id?: string
          body_md_snapshot?: string | null
          created_at?: string
          editor_id?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["article_status"]
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["article_status"] | null
          title_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "revisions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisions_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_author_id: { Args: never; Returns: string }
      get_invite_by_token: {
        Args: { p_token: string }
        Returns: {
          accepted_at: string
          display_name: string
          email: string
          expires_at: string
          id: string
          intended_role: Database["public"]["Enums"]["author_role"]
          invited_at: string
          invited_by_id: string
          invited_by_name: string
          revoked_at: string
        }[]
      }
      is_editor: { Args: never; Returns: boolean }
    }
    Enums: {
      article_status: "draft" | "in_review" | "published" | "archived"
      author_role: "external" | "author" | "editor"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      article_status: ["draft", "in_review", "published", "archived"],
      author_role: ["external", "author", "editor"],
    },
  },
} as const
<claude-code-hint v="1" type="plugin" value="supabase@claude-plugins-official" />
