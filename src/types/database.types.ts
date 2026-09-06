// ============================================================================
// database.types.ts — Auto-generated from Supabase schema
// SIH PS26034 — Legal Metrology Compliance System
//
// DO NOT EDIT MANUALLY.
// Regenerate with: supabase MCP > generate_typescript_types
// Last generated: 2026-09-06
// ============================================================================

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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"]
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: Database["public"]["Enums"]["user_role"]
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"]
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_measurements: {
        Row: {
          character_height_px: number
          contrast_ratio: number
          created_at: string
          id: string
          image_id: string | null
          inspection_id: string
          is_calibrated: boolean
          measurement_metadata: Json
          target_field: string
        }
        Insert: {
          character_height_px: number
          contrast_ratio: number
          created_at?: string
          id?: string
          image_id?: string | null
          inspection_id: string
          is_calibrated?: boolean
          measurement_metadata?: Json
          target_field: string
        }
        Update: {
          character_height_px?: number
          contrast_ratio?: number
          created_at?: string
          id?: string
          image_id?: string | null
          inspection_id?: string
          is_calibrated?: boolean
          measurement_metadata?: Json
          target_field?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_measurements_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "packaging_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_measurements_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      declarations: {
        Row: {
          bbox: Json
          confidence: number
          created_at: string
          edited_by: string | null
          field_name: string
          id: string
          image_id: string | null
          inspection_id: string
          is_manually_edited: boolean
          normalized_value: Json
          observed_value: string
          raw_ocr_text: string
          updated_at: string
        }
        Insert: {
          bbox?: Json
          confidence: number
          created_at?: string
          edited_by?: string | null
          field_name: string
          id?: string
          image_id?: string | null
          inspection_id: string
          is_manually_edited?: boolean
          normalized_value?: Json
          observed_value: string
          raw_ocr_text: string
          updated_at?: string
        }
        Update: {
          bbox?: Json
          confidence?: number
          created_at?: string
          edited_by?: string | null
          field_name?: string
          id?: string
          image_id?: string | null
          inspection_id?: string
          is_manually_edited?: boolean
          normalized_value?: Json
          observed_value?: string
          raw_ocr_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "declarations_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "declarations_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "packaging_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "declarations_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          created_at: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          inspection_number: string
          inspector_id: string
          location_name: string
          product_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          ruleset_version: string
          status: Database["public"]["Enums"]["inspection_status"]
          total_violations: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          inspection_number: string
          inspector_id: string
          location_name: string
          product_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          ruleset_version?: string
          status?: Database["public"]["Enums"]["inspection_status"]
          total_violations?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          inspection_number?: string
          inspector_id?: string
          location_name?: string
          product_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          ruleset_version?: string
          status?: Database["public"]["Enums"]["inspection_status"]
          total_violations?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_images: {
        Row: {
          blur_score: number | null
          created_at: string
          height_px: number
          id: string
          inspection_id: string
          is_acceptable_quality: boolean
          panel_type: Database["public"]["Enums"]["panel_type"]
          storage_path: string
          width_px: number
        }
        Insert: {
          blur_score?: number | null
          created_at?: string
          height_px: number
          id?: string
          inspection_id: string
          is_acceptable_quality?: boolean
          panel_type?: Database["public"]["Enums"]["panel_type"]
          storage_path: string
          width_px: number
        }
        Update: {
          blur_score?: number | null
          created_at?: string
          height_px?: number
          id?: string
          inspection_id?: string
          is_acceptable_quality?: boolean
          panel_type?: Database["public"]["Enums"]["panel_type"]
          storage_path?: string
          width_px?: number
        }
        Relationships: [
          {
            foreignKeyName: "packaging_images_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          brand_name: string
          category: string
          created_at: string
          declared_mrp: number | null
          declared_net_quantity: string | null
          declared_unit: string | null
          id: string
          manufacturer: string | null
          product_name: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand_name: string
          category: string
          created_at?: string
          declared_mrp?: number | null
          declared_net_quantity?: string | null
          declared_unit?: string | null
          id?: string
          manufacturer?: string | null
          product_name: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand_name?: string
          category?: string
          created_at?: string
          declared_mrp?: number | null
          declared_net_quantity?: string | null
          declared_unit?: string | null
          id?: string
          manufacturer?: string | null
          product_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          created_by: string
          id: string
          inspection_id: string
          pdf_storage_path: string
          report_number: string
          sha256_hash: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          inspection_id: string
          pdf_storage_path: string
          report_number: string
          sha256_hash: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          inspection_id?: string
          pdf_storage_path?: string
          report_number?: string
          sha256_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: true
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_versions: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          parameters_snapshot: Json
          rule_id: string
          version_code: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          parameters_snapshot: Json
          rule_id: string
          version_code: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          parameters_snapshot?: Json
          rule_id?: string
          version_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_versions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
      rules: {
        Row: {
          condition_operator: string
          condition_parameters: Json
          created_at: string
          current_version: string
          description: string
          enabled: boolean
          expected_constraint_text: string
          id: string
          rule_code: string
          severity: Database["public"]["Enums"]["severity_level"]
          target_field: string
          title: string
          updated_at: string
        }
        Insert: {
          condition_operator: string
          condition_parameters?: Json
          created_at?: string
          current_version?: string
          description: string
          enabled?: boolean
          expected_constraint_text: string
          id?: string
          rule_code: string
          severity?: Database["public"]["Enums"]["severity_level"]
          target_field: string
          title: string
          updated_at?: string
        }
        Update: {
          condition_operator?: string
          condition_parameters?: Json
          created_at?: string
          current_version?: string
          description?: string
          enabled?: boolean
          expected_constraint_text?: string
          id?: string
          rule_code?: string
          severity?: Database["public"]["Enums"]["severity_level"]
          target_field?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      users_profile: {
        Row: {
          badge_number: string | null
          created_at: string
          full_name: string
          id: string
          jurisdiction: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          badge_number?: string | null
          created_at?: string
          full_name: string
          id: string
          jurisdiction: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          badge_number?: string | null
          created_at?: string
          full_name?: string
          id?: string
          jurisdiction?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      violations: {
        Row: {
          confidence: number
          created_at: string
          evidence_bbox: Json
          evidence_crop_path: string | null
          expected_constraint: string
          id: string
          inspection_id: string
          observed_value: string
          rule_code: string
          rule_id: string | null
          rule_version: string
          severity: Database["public"]["Enums"]["severity_level"]
        }
        Insert: {
          confidence?: number
          created_at?: string
          evidence_bbox?: Json
          evidence_crop_path?: string | null
          expected_constraint: string
          id?: string
          inspection_id: string
          observed_value: string
          rule_code: string
          rule_id?: string | null
          rule_version?: string
          severity?: Database["public"]["Enums"]["severity_level"]
        }
        Update: {
          confidence?: number
          created_at?: string
          evidence_bbox?: Json
          evidence_crop_path?: string | null
          expected_constraint?: string
          id?: string
          inspection_id?: string
          observed_value?: string
          rule_code?: string
          rule_id?: string | null
          rule_version?: string
          severity?: Database["public"]["Enums"]["severity_level"]
        }
        Relationships: [
          {
            foreignKeyName: "violations_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_rule_code_fkey"
            columns: ["rule_code"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["rule_code"]
          },
          {
            foreignKeyName: "violations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_inspection: {
        Args: { target_inspection_id: string }
        Returns: boolean
      }
      get_auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      inspection_status: "PASS" | "FAIL" | "REVIEW"
      panel_type:
        | "primary_display"
        | "info_panel"
        | "side"
        | "back"
        | "top_bottom"
      severity_level: "CRITICAL" | "MAJOR" | "MINOR"
      user_role: "inspector" | "reviewer" | "admin"
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
      inspection_status: ["PASS", "FAIL", "REVIEW"],
      panel_type: [
        "primary_display",
        "info_panel",
        "side",
        "back",
        "top_bottom",
      ],
      severity_level: ["CRITICAL", "MAJOR", "MINOR"],
      user_role: ["inspector", "reviewer", "admin"],
    },
  },
} as const

// ============================================================================
// Convenience type aliases — used throughout the application
// ============================================================================

export type UserProfile = Tables<"users_profile">
export type UserRole = Database["public"]["Enums"]["user_role"]
export type Inspection = Tables<"inspections">
export type InspectionStatus = Database["public"]["Enums"]["inspection_status"]
export type Product = Tables<"products">
export type PackagingImage = Tables<"packaging_images">
export type PanelType = Database["public"]["Enums"]["panel_type"]
export type Declaration = Tables<"declarations">
export type CvMeasurement = Tables<"cv_measurements">
export type Rule = Tables<"rules">
export type RuleVersion = Tables<"rule_versions">
export type SeverityLevel = Database["public"]["Enums"]["severity_level"]
export type Violation = Tables<"violations">
export type Report = Tables<"reports">
export type AuditLog = Tables<"audit_logs">
