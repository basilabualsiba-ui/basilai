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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          icon: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          icon?: string
          id?: string
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          icon?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_completions: {
        Row: {
          activity_id: string
          completed_at: string
          completion_date: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          completed_at?: string
          completion_date?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          completed_at?: string
          completion_date?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          month: number
          updated_at: string
          year: number
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          id?: string
          month: number
          updated_at?: string
          year: number
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          month?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      currency_ratios: {
        Row: {
          created_at: string
          from_currency: string
          id: string
          is_live: boolean
          rate: number
          to_currency: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_currency: string
          id?: string
          is_live?: boolean
          rate: number
          to_currency: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_currency?: string
          id?: string
          is_live?: boolean
          rate?: number
          to_currency?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_activities: {
        Row: {
          activity_type: string
          created_at: string
          created_date: string | null
          date: string
          days_of_week: number[] | null
          description: string | null
          end_time: string | null
          id: string
          is_completed: boolean | null
          is_recurring: boolean | null
          recurrence_type: string | null
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_date?: string | null
          date?: string
          days_of_week?: number[] | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          recurrence_type?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_date?: string | null
          date?: string
          days_of_week?: number[] | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          recurrence_type?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercise_alternatives: {
        Row: {
          alternative_exercise_id: string
          created_at: string
          exercise_id: string
          id: string
        }
        Insert: {
          alternative_exercise_id: string
          created_at?: string
          exercise_id: string
          id?: string
        }
        Update: {
          alternative_exercise_id?: string
          created_at?: string
          exercise_id?: string
          id?: string
        }
        Relationships: []
      }
      exercise_sets: {
        Row: {
          completed_at: string | null
          created_at: string
          exercise_id: string
          id: string
          reps: number | null
          rest_seconds: number | null
          session_id: string
          set_number: number
          updated_at: string
          weight: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          reps?: number | null
          rest_seconds?: number | null
          session_id: string
          set_number: number
          updated_at?: string
          weight?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          reps?: number | null
          rest_seconds?: number | null
          session_id?: string
          set_number?: number
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          difficulty_level: string | null
          equipment: string | null
          id: string
          instructions: string | null
          muscle_group: string
          name: string
          photo_url: string | null
          side_muscle_groups: string[] | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          difficulty_level?: string | null
          equipment?: string | null
          id?: string
          instructions?: string | null
          muscle_group: string
          name: string
          photo_url?: string | null
          side_muscle_groups?: string[] | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          difficulty_level?: string | null
          equipment?: string | null
          id?: string
          instructions?: string | null
          muscle_group?: string
          name?: string
          photo_url?: string | null
          side_muscle_groups?: string[] | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      food_items: {
        Row: {
          brand: string | null
          calories_per_serving: number | null
          carbs_per_serving: number | null
          created_at: string
          description: string | null
          fat_per_serving: number | null
          fiber_per_serving: number | null
          id: string
          name: string
          protein_per_serving: number | null
          serving_size: string | null
          serving_unit: string | null
          sodium_per_serving: number | null
          sugar_per_serving: number | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          calories_per_serving?: number | null
          carbs_per_serving?: number | null
          created_at?: string
          description?: string | null
          fat_per_serving?: number | null
          fiber_per_serving?: number | null
          id?: string
          name: string
          protein_per_serving?: number | null
          serving_size?: string | null
          serving_unit?: string | null
          sodium_per_serving?: number | null
          sugar_per_serving?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          calories_per_serving?: number | null
          carbs_per_serving?: number | null
          created_at?: string
          description?: string | null
          fat_per_serving?: number | null
          fiber_per_serving?: number | null
          id?: string
          name?: string
          protein_per_serving?: number | null
          serving_size?: string | null
          serving_unit?: string | null
          sodium_per_serving?: number | null
          sugar_per_serving?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      icons: {
        Row: {
          created_at: string
          id: string
          image_url: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          name?: string
        }
        Relationships: []
      }
      meal_consumptions: {
        Row: {
          consumed_at: string
          created_at: string
          id: string
          meal_plan_meal_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          consumed_at?: string
          created_at?: string
          id?: string
          meal_plan_meal_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          consumed_at?: string
          created_at?: string
          id?: string
          meal_plan_meal_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meal_foods: {
        Row: {
          created_at: string
          food_item_id: string
          id: string
          meal_id: string
          quantity: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          food_item_id: string
          id?: string
          meal_id: string
          quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          food_item_id?: string
          id?: string
          meal_id?: string
          quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_meal_foods_food_item_id"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_meal_foods_meal_id"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_meals: {
        Row: {
          created_at: string
          day_of_week: number | null
          id: string
          meal_id: string
          meal_order: number | null
          meal_plan_id: string
          meal_time: string | null
          scheduled_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          id?: string
          meal_id: string
          meal_order?: number | null
          meal_plan_id: string
          meal_time?: string | null
          scheduled_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          id?: string
          meal_id?: string
          meal_order?: number | null
          meal_plan_id?: string
          meal_time?: string | null
          scheduled_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_meal_plan_meals_meal_id"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_meal_plan_meals_meal_plan_id"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          day_of_week: number | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          plan_date: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          plan_date?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          plan_date?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          created_at: string
          default_time: string | null
          description: string | null
          id: string
          meal_type: string | null
          name: string
          total_calories: number | null
          total_carbs: number | null
          total_fat: number | null
          total_protein: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_time?: string | null
          description?: string | null
          id?: string
          meal_type?: string | null
          name: string
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_time?: string | null
          description?: string | null
          id?: string
          meal_type?: string | null
          name?: string
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      muscle_groups: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      plan_workouts: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          plan_id: string
          updated_at: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          plan_id: string
          updated_at?: string
          workout_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          plan_id?: string
          updated_at?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_workouts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_completions: {
        Row: {
          completed_at: string
          completion_date: string
          created_at: string
          id: string
          prayer_name: string
        }
        Insert: {
          completed_at?: string
          completion_date: string
          created_at?: string
          id?: string
          prayer_name: string
        }
        Update: {
          completed_at?: string
          completion_date?: string
          created_at?: string
          id?: string
          prayer_name?: string
        }
        Relationships: []
      }
      prayer_times: {
        Row: {
          asr: string
          city: string | null
          country: string | null
          created_at: string
          date: string
          dhuhr: string
          fajr: string
          id: string
          isha: string
          maghrib: string
          sunrise: string | null
          sunset: string | null
          updated_at: string
        }
        Insert: {
          asr: string
          city?: string | null
          country?: string | null
          created_at?: string
          date: string
          dhuhr: string
          fajr: string
          id?: string
          isha: string
          maghrib: string
          sunrise?: string | null
          sunset?: string | null
          updated_at?: string
        }
        Update: {
          asr?: string
          city?: string | null
          country?: string | null
          created_at?: string
          date?: string
          dhuhr?: string
          fajr?: string
          id?: string
          isha?: string
          maghrib?: string
          sunrise?: string | null
          sunset?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          subcategory_id: string | null
          time: string | null
          transfer_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          subcategory_id?: string | null
          time?: string | null
          transfer_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          subcategory_id?: string | null
          time?: string | null
          transfer_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_body_stats: {
        Row: {
          created_at: string
          height: number | null
          id: string
          notes: string | null
          recorded_at: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          notes?: string | null
          recorded_at?: string
          updated_at?: string
          weight: number
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          notes?: string | null
          recorded_at?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          order_index: number
          reps: number | null
          rest_seconds: number | null
          sets: number | null
          updated_at: string
          weight: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          order_index?: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          updated_at?: string
          weight?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          order_index?: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          updated_at?: string
          weight?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plan_days: {
        Row: {
          created_at: string
          day_of_week: number
          description: string | null
          end_time: string | null
          exercise_ids: string[] | null
          id: string
          muscle_groups: string[]
          name: string | null
          plan_id: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          description?: string | null
          end_time?: string | null
          exercise_ids?: string[] | null
          id?: string
          muscle_groups: string[]
          name?: string | null
          plan_id: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          description?: string | null
          end_time?: string | null
          exercise_ids?: string[] | null
          id?: string
          muscle_groups?: string[]
          name?: string | null
          plan_id?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_playlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          exercise_ids: string[] | null
          id: string
          muscle_groups: string[] | null
          notes: string | null
          plan_id: string | null
          scheduled_date: string
          started_at: string | null
          total_duration_minutes: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          exercise_ids?: string[] | null
          id?: string
          muscle_groups?: string[] | null
          notes?: string | null
          plan_id?: string | null
          scheduled_date: string
          started_at?: string | null
          total_duration_minutes?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          exercise_ids?: string[] | null
          id?: string
          muscle_groups?: string[] | null
          notes?: string | null
          plan_id?: string | null
          scheduled_date?: string
          started_at?: string | null
          total_duration_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          muscle_groups: string[]
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          muscle_groups?: string[]
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          muscle_groups?: string[]
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      youtube_tracks: {
        Row: {
          channel_name: string | null
          created_at: string
          duration: number | null
          id: string
          order_index: number
          playlist_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          youtube_id: string
        }
        Insert: {
          channel_name?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          order_index?: number
          playlist_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          youtube_id: string
        }
        Update: {
          channel_name?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          order_index?: number
          playlist_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          youtube_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "workout_playlists"
            referencedColumns: ["id"]
          },
        ]
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
    Enums: {},
  },
} as const
