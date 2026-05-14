export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ItemStatus = 'display' | 'storage' | 'loan' | 'conservation' | 'lost'
export type ItemCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged'
export type AcquisitionMethod = 'purchase' | 'donation' | 'bequest' | 'transfer'
export type LocationType = 'display' | 'storage' | 'loan' | 'conservation'
export type UserRole = 'viewer' | 'editor' | 'admin'
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: UserRole
          mfa_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: UserRole
          mfa_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: UserRole
          mfa_enabled?: boolean
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          parent_id?: string | null
        }
      }
      locations: {
        Row: {
          id: string
          name: string
          type: LocationType
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: LocationType
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: LocationType
          description?: string | null
        }
      }
      items: {
        Row: {
          id: string
          accession_number: string
          title: string
          description: string | null
          category_id: string | null
          location_id: string | null
          status: ItemStatus
          acquisition_date: string | null
          acquisition_method: AcquisitionMethod | null
          donor_name: string | null
          estimated_value: number | null
          condition: ItemCondition | null
          provenance: string | null
          notes: string | null
          images: string[]
          tags: string[]
          search_vector: string | null
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accession_number: string
          title: string
          description?: string | null
          category_id?: string | null
          location_id?: string | null
          status?: ItemStatus
          acquisition_date?: string | null
          acquisition_method?: AcquisitionMethod | null
          donor_name?: string | null
          estimated_value?: number | null
          condition?: ItemCondition | null
          provenance?: string | null
          notes?: string | null
          images?: string[]
          tags?: string[]
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accession_number?: string
          title?: string
          description?: string | null
          category_id?: string | null
          location_id?: string | null
          status?: ItemStatus
          acquisition_date?: string | null
          acquisition_method?: AcquisitionMethod | null
          donor_name?: string | null
          estimated_value?: number | null
          condition?: ItemCondition | null
          provenance?: string | null
          notes?: string | null
          images?: string[]
          tags?: string[]
          updated_by?: string | null
          updated_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: AuditAction
          old_data: Json | null
          new_data: Json | null
          changed_by: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: AuditAction
          old_data?: Json | null
          new_data?: Json | null
          changed_by?: string | null
          changed_at?: string
        }
        Update: never
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Location = Database['public']['Tables']['locations']['Row']
export type Item = Database['public']['Tables']['items']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']
