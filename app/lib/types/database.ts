export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      hunts: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          status: 'draft' | 'active' | 'paused' | 'completed'
          num_queries: number | null
          results_per_query: number | null
          max_results: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description: string
          status?: 'draft' | 'active' | 'paused' | 'completed'
          num_queries?: number | null
          results_per_query?: number | null
          max_results?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          status?: 'draft' | 'active' | 'paused' | 'completed'
          num_queries?: number | null
          results_per_query?: number | null
          max_results?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      queries: {
        Row: {
          id: string
          hunt_id: string
          xray_query: string
          job_title: string | null
          company: string | null
          location: string | null
          priority: number | null
          status: 'pending' | 'running' | 'completed' | 'failed'
          results_count: number | null
          executed_at: string | null
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          hunt_id: string
          xray_query: string
          job_title?: string | null
          company?: string | null
          location?: string | null
          priority?: number | null
          status?: 'pending' | 'running' | 'completed' | 'failed'
          results_count?: number | null
          executed_at?: string | null
          error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          hunt_id?: string
          xray_query?: string
          job_title?: string | null
          company?: string | null
          location?: string | null
          priority?: number | null
          status?: 'pending' | 'running' | 'completed' | 'failed'
          results_count?: number | null
          executed_at?: string | null
          error?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          hunt_id: string
          query_id: string | null
          linkedin_url: string
          name: string | null
          headline: string | null
          rank: number | null
          source_query: string | null
          tags: string[] | null
          notes: string | null
          status: 'new' | 'contacted' | 'interested' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          hunt_id: string
          query_id?: string | null
          linkedin_url: string
          name?: string | null
          headline?: string | null
          rank?: number | null
          source_query?: string | null
          tags?: string[] | null
          notes?: string | null
          status?: 'new' | 'contacted' | 'interested' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          hunt_id?: string
          query_id?: string | null
          linkedin_url?: string
          name?: string | null
          headline?: string | null
          rank?: number | null
          source_query?: string | null
          tags?: string[] | null
          notes?: string | null
          status?: 'new' | 'contacted' | 'interested' | 'rejected'
          created_at?: string
        }
      }
    }
    Views: {
      hunt_stats: {
        Row: {
          id: string | null
          name: string | null
          status: string | null
          total_queries: number | null
          completed_queries: number | null
          total_profiles: number | null
          contacted_profiles: number | null
          interested_profiles: number | null
        }
      }
    }
  }
}
