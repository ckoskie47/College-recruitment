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
      audit_events: {
        Row: {
          action: string
          actor_display: string | null
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          created_at: string
          description: string | null
          engagement_id: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          organization_id: string
        }
        Insert: {
          action: string
          actor_display?: string | null
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          description?: string | null
          engagement_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
        }
        Update: {
          action?: string
          actor_display?: string | null
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          description?: string | null
          engagement_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commitments: {
        Row: {
          created_at: string
          cross_reference_status: Database["public"]["Enums"]["cross_ref_status"]
          flag: string | null
          flag_severity: Database["public"]["Enums"]["flag_severity"]
          id: string
          meeting_id: string
          pillar: string | null
          quote: string
          summary: string | null
          tags: string[] | null
          timestamp_display: string | null
          timestamp_seconds: number | null
          transcript_id: string | null
        }
        Insert: {
          created_at?: string
          cross_reference_status?: Database["public"]["Enums"]["cross_ref_status"]
          flag?: string | null
          flag_severity?: Database["public"]["Enums"]["flag_severity"]
          id?: string
          meeting_id: string
          pillar?: string | null
          quote: string
          summary?: string | null
          tags?: string[] | null
          timestamp_display?: string | null
          timestamp_seconds?: number | null
          transcript_id?: string | null
        }
        Update: {
          created_at?: string
          cross_reference_status?: Database["public"]["Enums"]["cross_ref_status"]
          flag?: string | null
          flag_severity?: Database["public"]["Enums"]["flag_severity"]
          id?: string
          meeting_id?: string
          pillar?: string | null
          quote?: string
          summary?: string | null
          tags?: string[] | null
          timestamp_display?: string | null
          timestamp_seconds?: number | null
          transcript_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commitments_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "meeting_transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      criteria: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          pillar: string
          scoring_framework_id: string
          sort_order: number
          weight_percent: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          pillar: string
          scoring_framework_id: string
          sort_order?: number
          weight_percent?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          pillar?: string
          scoring_framework_id?: string
          sort_order?: number
          weight_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "criteria_scoring_framework_id_fkey"
            columns: ["scoring_framework_id"]
            isOneToOne: false
            referencedRelation: "scoring_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          engagement_id: string
          evidence_url: string | null
          id: string
          pillar: string | null
          source_ref_id: string | null
          source_type: Database["public"]["Enums"]["deliverable_source"]
          status: Database["public"]["Enums"]["deliverable_status"]
          title: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          engagement_id: string
          evidence_url?: string | null
          id?: string
          pillar?: string | null
          source_ref_id?: string | null
          source_type: Database["public"]["Enums"]["deliverable_source"]
          status?: Database["public"]["Enums"]["deliverable_status"]
          title: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          engagement_id?: string
          evidence_url?: string | null
          id?: string
          pillar?: string | null
          source_ref_id?: string | null
          source_type?: Database["public"]["Enums"]["deliverable_source"]
          status?: Database["public"]["Enums"]["deliverable_status"]
          title?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_processed_at: string | null
          ai_summary: Json | null
          document_type: Database["public"]["Enums"]["document_type"]
          engagement_id: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
          vendor_id: string | null
        }
        Insert: {
          ai_processed_at?: string | null
          ai_summary?: Json | null
          document_type?: Database["public"]["Enums"]["document_type"]
          engagement_id: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
          vendor_id?: string | null
        }
        Update: {
          ai_processed_at?: string | null
          ai_summary?: Json | null
          document_type?: Database["public"]["Enums"]["document_type"]
          engagement_id?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          athlete_profile: Json | null
          client_name: string | null
          created_at: string
          created_by: string | null
          decision_due_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          scoring_framework_id: string | null
          status: Database["public"]["Enums"]["engagement_status"]
          updated_at: string
          vendor_type: Database["public"]["Enums"]["vendor_type"]
        }
        Insert: {
          athlete_profile?: Json | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          decision_due_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          scoring_framework_id?: string | null
          status?: Database["public"]["Enums"]["engagement_status"]
          updated_at?: string
          vendor_type?: Database["public"]["Enums"]["vendor_type"]
        }
        Update: {
          athlete_profile?: Json | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          decision_due_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          scoring_framework_id?: string | null
          status?: Database["public"]["Enums"]["engagement_status"]
          updated_at?: string
          vendor_type?: Database["public"]["Enums"]["vendor_type"]
        }
        Relationships: [
          {
            foreignKeyName: "engagements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_scoring_framework_fk"
            columns: ["scoring_framework_id"]
            isOneToOne: false
            referencedRelation: "scoring_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_transcripts: {
        Row: {
          id: string
          meeting_id: string
          processed_at: string | null
          raw_text: string | null
          source: Database["public"]["Enums"]["transcript_source"]
          storage_path: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          id?: string
          meeting_id: string
          processed_at?: string | null
          raw_text?: string | null
          source: Database["public"]["Enums"]["transcript_source"]
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          id?: string
          meeting_id?: string
          processed_at?: string | null
          raw_text?: string | null
          source?: Database["public"]["Enums"]["transcript_source"]
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_transcripts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_transcripts_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          attendees: Json | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          engagement_id: string
          id: string
          location: string | null
          notes: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["meeting_status"]
          title: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          attendees?: Json | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          engagement_id: string
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          attendees?: Json | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          engagement_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          drafted_at: string
          drafted_by: string | null
          engagement_id: string
          id: string
          memo_content: string | null
          rationale_summary: string | null
          recommended_vendor_id: string | null
          status: Database["public"]["Enums"]["recommendation_status"]
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          drafted_at?: string
          drafted_by?: string | null
          engagement_id: string
          id?: string
          memo_content?: string | null
          rationale_summary?: string | null
          recommended_vendor_id?: string | null
          status?: Database["public"]["Enums"]["recommendation_status"]
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          drafted_at?: string
          drafted_by?: string | null
          engagement_id?: string
          id?: string
          memo_content?: string | null
          rationale_summary?: string | null
          recommended_vendor_id?: string | null
          status?: Database["public"]["Enums"]["recommendation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_drafted_by_fkey"
            columns: ["drafted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_recommended_vendor_id_fkey"
            columns: ["recommended_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          created_at: string
          criterion_id: string
          engagement_id: string
          id: string
          note: string | null
          phase: Database["public"]["Enums"]["score_phase"]
          score: number
          stakeholder_id: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          criterion_id: string
          engagement_id: string
          id?: string
          note?: string | null
          phase?: Database["public"]["Enums"]["score_phase"]
          score: number
          stakeholder_id: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          criterion_id?: string
          engagement_id?: string
          id?: string
          note?: string | null
          phase?: Database["public"]["Enums"]["score_phase"]
          score?: number
          stakeholder_id?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_frameworks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          is_system: boolean
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scoring_frameworks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_frameworks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholders: {
        Row: {
          email: string
          engagement_id: string
          id: string
          invitation_expires_at: string | null
          invitation_token: string | null
          invited_at: string
          joined_at: string | null
          name: string | null
          priority_weights: Json | null
          role_category: Database["public"]["Enums"]["stakeholder_role"]
          role_title: string | null
          status: Database["public"]["Enums"]["stakeholder_status"]
          user_id: string | null
        }
        Insert: {
          email: string
          engagement_id: string
          id?: string
          invitation_expires_at?: string | null
          invitation_token?: string | null
          invited_at?: string
          joined_at?: string | null
          name?: string | null
          priority_weights?: Json | null
          role_category?: Database["public"]["Enums"]["stakeholder_role"]
          role_title?: string | null
          status?: Database["public"]["Enums"]["stakeholder_status"]
          user_id?: string | null
        }
        Update: {
          email?: string
          engagement_id?: string
          id?: string
          invitation_expires_at?: string | null
          invitation_token?: string | null
          invited_at?: string
          joined_at?: string | null
          name?: string | null
          priority_weights?: Json | null
          role_category?: Database["public"]["Enums"]["stakeholder_role"]
          role_title?: string | null
          status?: Database["public"]["Enums"]["stakeholder_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakeholders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          granted_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_admins_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          engagement_id: string
          id: string
          metadata: Json | null
          name: string
          ownership_type: Database["public"]["Enums"]["ownership_type"]
          parent_company: string | null
          proposal_status: Database["public"]["Enums"]["proposal_status"]
          proposed_fee_amount: number | null
          proposed_fee_structure: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          engagement_id: string
          id?: string
          metadata?: Json | null
          name: string
          ownership_type?: Database["public"]["Enums"]["ownership_type"]
          parent_company?: string | null
          proposal_status?: Database["public"]["Enums"]["proposal_status"]
          proposed_fee_amount?: number | null
          proposed_fee_structure?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          engagement_id?: string
          id?: string
          metadata?: Json | null
          name?: string
          ownership_type?: Database["public"]["Enums"]["ownership_type"]
          parent_company?: string | null
          proposal_status?: Database["public"]["Enums"]["proposal_status"]
          proposed_fee_amount?: number | null
          proposed_fee_structure?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_engagement_member: { Args: { eng_id: string }; Returns: boolean }
      is_org_admin: { Args: { org_id: string }; Returns: boolean }
      is_org_member: { Args: { org_id: string }; Returns: boolean }
    }
    Enums: {
      actor_type: "user" | "system" | "ai"
      cross_ref_status:
        | "aligned"
        | "contradicts_rfp"
        | "new_commitment"
        | "unverified"
      deliverable_source:
        | "rfp_promise"
        | "meeting_commitment"
        | "sow_clause"
        | "manual"
      deliverable_status:
        | "not_started"
        | "in_progress"
        | "complete"
        | "overdue"
        | "blocked"
        | "cancelled"
      document_type:
        | "rfp"
        | "proposal"
        | "attachment"
        | "contract"
        | "supporting"
        | "other"
      engagement_status: "draft" | "active" | "completed" | "archived"
      flag_severity: "none" | "info" | "warning" | "critical"
      meeting_status: "scheduled" | "in_progress" | "complete" | "cancelled"
      org_role: "owner" | "admin" | "member" | "viewer"
      ownership_type:
        | "public"
        | "private"
        | "pe_backed"
        | "employee_owned"
        | "nonprofit"
        | "unknown"
      proposal_status:
        | "invited"
        | "submitted"
        | "eliminated"
        | "finalist"
        | "selected"
        | "declined"
      recommendation_status:
        | "draft"
        | "under_review"
        | "approved"
        | "rejected"
        | "superseded"
      score_phase: "rfp_initial" | "post_meeting" | "final"
      stakeholder_role:
        | "finance"
        | "hr"
        | "compliance"
        | "operations"
        | "legal"
        | "executive"
        | "technical"
        | "procurement"
        | "consultant"
        | "other"
      stakeholder_status: "invited" | "active" | "declined"
      transcript_source:
        | "otter"
        | "manual_paste"
        | "file_upload"
        | "recording_transcription"
        | "email_followup"
      vendor_type:
        | "benefits_broker"
        | "college_recruitment"
        | "it"
        | "legal"
        | "agency"
        | "consulting"
        | "construction"
        | "saas"
        | "professional_services"
        | "other"
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
      actor_type: ["user", "system", "ai"],
      cross_ref_status: [
        "aligned",
        "contradicts_rfp",
        "new_commitment",
        "unverified",
      ],
      deliverable_source: [
        "rfp_promise",
        "meeting_commitment",
        "sow_clause",
        "manual",
      ],
      deliverable_status: [
        "not_started",
        "in_progress",
        "complete",
        "overdue",
        "blocked",
        "cancelled",
      ],
      document_type: [
        "rfp",
        "proposal",
        "attachment",
        "contract",
        "supporting",
        "other",
      ],
      engagement_status: ["draft", "active", "completed", "archived"],
      flag_severity: ["none", "info", "warning", "critical"],
      meeting_status: ["scheduled", "in_progress", "complete", "cancelled"],
      org_role: ["owner", "admin", "member", "viewer"],
      ownership_type: [
        "public",
        "private",
        "pe_backed",
        "employee_owned",
        "nonprofit",
        "unknown",
      ],
      proposal_status: [
        "invited",
        "submitted",
        "eliminated",
        "finalist",
        "selected",
        "declined",
      ],
      recommendation_status: [
        "draft",
        "under_review",
        "approved",
        "rejected",
        "superseded",
      ],
      score_phase: ["rfp_initial", "post_meeting", "final"],
      stakeholder_role: [
        "finance",
        "hr",
        "compliance",
        "operations",
        "legal",
        "executive",
        "technical",
        "procurement",
        "consultant",
        "other",
      ],
      stakeholder_status: ["invited", "active", "declined"],
      transcript_source: [
        "otter",
        "manual_paste",
        "file_upload",
        "recording_transcription",
        "email_followup",
      ],
      vendor_type: [
        "benefits_broker",
        "college_recruitment",
        "it",
        "legal",
        "agency",
        "consulting",
        "construction",
        "saas",
        "professional_services",
        "other",
      ],
    },
  },
} as const
