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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blacklist: {
        Row: {
          added_by: string | null
          created_at: string
          full_name: string
          id: string
          participant_id: string | null
          reason: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          full_name: string
          id?: string
          participant_id?: string | null
          reason?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string
          full_name?: string
          id?: string
          participant_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blacklist_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blacklist_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_carriers: {
        Row: {
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      bus_configurations: {
        Row: {
          bus_type_id: string | null
          carrier_id: string | null
          created_at: string
          id: string
          rows: number
          seats_per_row: number
          total_seats: number
          trip_id: string
        }
        Insert: {
          bus_type_id?: string | null
          carrier_id?: string | null
          created_at?: string
          id?: string
          rows: number
          seats_per_row: number
          total_seats: number
          trip_id: string
        }
        Update: {
          bus_type_id?: string | null
          carrier_id?: string | null
          created_at?: string
          id?: string
          rows?: number
          seats_per_row?: number
          total_seats?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_configurations_bus_type_id_fkey"
            columns: ["bus_type_id"]
            isOneToOne: false
            referencedRelation: "bus_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_configurations_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "bus_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_configurations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_seat_assignments: {
        Row: {
          bus_config_id: string
          created_at: string
          id: string
          participant_id: string
          seat_number: number
        }
        Insert: {
          bus_config_id: string
          created_at?: string
          id?: string
          participant_id: string
          seat_number: number
        }
        Update: {
          bus_config_id?: string
          created_at?: string
          id?: string
          participant_id?: string
          seat_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "bus_seat_assignments_bus_config_id_fkey"
            columns: ["bus_config_id"]
            isOneToOne: false
            referencedRelation: "bus_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_seat_assignments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_seat_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          participant_id: string
          token: string
          trip_id: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          participant_id: string
          token: string
          trip_id: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          participant_id?: string
          token?: string
          trip_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bus_seat_tokens_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_seat_tokens_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          rows: number
          seats_per_row: number
          total_seats: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          rows: number
          seats_per_row: number
          total_seats: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          rows?: number
          seats_per_row?: number
          total_seats?: number
        }
        Relationships: []
      }
      guides: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          role: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "guides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string | null
          check_in_date: string
          check_out_date: string
          created_at: string
          id: string
          name: string
          phone: string | null
          trip_id: string
        }
        Insert: {
          address?: string | null
          check_in_date: string
          check_out_date: string
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          trip_id: string
        }
        Update: {
          address?: string | null
          check_in_date?: string
          check_out_date?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotels_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          discount_amount: number | null
          discount_type: string | null
          email: string | null
          full_name: string
          group_number: number | null
          id: string
          notes: string | null
          notes_companion: string | null
          notes_hotel: string | null
          phone: string | null
          place_of_birth: string | null
          trip_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          email?: string | null
          full_name: string
          group_number?: number | null
          id?: string
          notes?: string | null
          notes_companion?: string | null
          notes_hotel?: string | null
          phone?: string | null
          place_of_birth?: string | null
          trip_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          email?: string | null
          full_name?: string
          group_number?: number | null
          id?: string
          notes?: string | null
          notes_companion?: string | null
          notes_hotel?: string | null
          phone?: string | null
          place_of_birth?: string | null
          trip_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          participant_id: string
          payment_date: string
          payment_method: string | null
          payment_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          participant_id: string
          payment_date?: string
          payment_method?: string | null
          payment_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          participant_id?: string
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          phone: string | null
          place_of_birth: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          id: string
          phone?: string | null
          place_of_birth?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          place_of_birth?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string
          created_by: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          departure_date: string | null
          destination: string
          flights: Json | null
          hotel_address: string | null
          hotel_check_in: string | null
          hotel_check_out: string | null
          hotel_name: string | null
          hotel_nights: number | null
          hotel_price_per_night: number | null
          hotel_room_type: string | null
          hotel_total: number | null
          id: string
          markup_amount: number | null
          markup_percentage: number | null
          notes: string | null
          num_passengers: number | null
          other_items: Json | null
          return_date: string | null
          status: string | null
          subtotal: number | null
          total_price: number | null
          transfers: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          departure_date?: string | null
          destination: string
          flights?: Json | null
          hotel_address?: string | null
          hotel_check_in?: string | null
          hotel_check_out?: string | null
          hotel_name?: string | null
          hotel_nights?: number | null
          hotel_price_per_night?: number | null
          hotel_room_type?: string | null
          hotel_total?: number | null
          id?: string
          markup_amount?: number | null
          markup_percentage?: number | null
          notes?: string | null
          num_passengers?: number | null
          other_items?: Json | null
          return_date?: string | null
          status?: string | null
          subtotal?: number | null
          total_price?: number | null
          transfers?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          departure_date?: string | null
          destination?: string
          flights?: Json | null
          hotel_address?: string | null
          hotel_check_in?: string | null
          hotel_check_out?: string | null
          hotel_name?: string | null
          hotel_nights?: number | null
          hotel_price_per_night?: number | null
          hotel_room_type?: string | null
          hotel_total?: number | null
          id?: string
          markup_amount?: number | null
          markup_percentage?: number | null
          notes?: string | null
          num_passengers?: number | null
          other_items?: Json | null
          return_date?: string | null
          status?: string | null
          subtotal?: number | null
          total_price?: number | null
          transfers?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: Database["public"]["Enums"]["permission_type"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission: Database["public"]["Enums"]["permission_type"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["permission_type"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      room_assignments: {
        Row: {
          created_at: string
          id: string
          participant_id: string
          room_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_id: string
          room_id: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_assignments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string
          hotel_id: string
          id: string
          room_number: string
          room_type: string
        }
        Insert: {
          capacity: number
          created_at?: string
          hotel_id: string
          id?: string
          room_number: string
          room_type: string
        }
        Update: {
          capacity?: number
          created_at?: string
          hotel_id?: string
          id?: string
          room_number?: string
          room_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_companions: {
        Row: {
          created_at: string
          guide_id: string
          id: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          guide_id: string
          id?: string
          trip_id: string
        }
        Update: {
          created_at?: string
          guide_id?: string
          id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_companions_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_companions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_guides: {
        Row: {
          created_at: string
          guide_id: string
          id: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          guide_id: string
          id?: string
          trip_id: string
        }
        Update: {
          created_at?: string
          guide_id?: string
          id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_guides_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_guides_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          allotment_doppie: number | null
          allotment_matrimoniali: number | null
          allotment_quadruple: number | null
          allotment_singole: number | null
          allotment_triple: number | null
          carrier_id: string | null
          companion_name: string | null
          created_at: string
          created_by: string
          departure_date: string
          deposit_amount: number
          deposit_type: Database["public"]["Enums"]["deposit_type"]
          description: string | null
          destination: string
          guide_name: string | null
          id: string
          max_participants: number | null
          price: number
          return_date: string
          single_room_supplement: number | null
          status: Database["public"]["Enums"]["trip_status"]
          title: string
          trip_type: string
          updated_at: string
        }
        Insert: {
          allotment_doppie?: number | null
          allotment_matrimoniali?: number | null
          allotment_quadruple?: number | null
          allotment_singole?: number | null
          allotment_triple?: number | null
          carrier_id?: string | null
          companion_name?: string | null
          created_at?: string
          created_by: string
          departure_date: string
          deposit_amount: number
          deposit_type?: Database["public"]["Enums"]["deposit_type"]
          description?: string | null
          destination: string
          guide_name?: string | null
          id?: string
          max_participants?: number | null
          price: number
          return_date: string
          single_room_supplement?: number | null
          status?: Database["public"]["Enums"]["trip_status"]
          title: string
          trip_type?: string
          updated_at?: string
        }
        Update: {
          allotment_doppie?: number | null
          allotment_matrimoniali?: number | null
          allotment_quadruple?: number | null
          allotment_singole?: number | null
          allotment_triple?: number | null
          carrier_id?: string | null
          companion_name?: string | null
          created_at?: string
          created_by?: string
          departure_date?: string
          deposit_amount?: number
          deposit_type?: Database["public"]["Enums"]["deposit_type"]
          description?: string | null
          destination?: string
          guide_name?: string | null
          id?: string
          max_participants?: number | null
          price?: number
          return_date?: string
          single_room_supplement?: number | null
          status?: Database["public"]["Enums"]["trip_status"]
          title?: string
          trip_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "bus_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          participant_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          participant_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          participant_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upload_tokens_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["permission_type"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "agente"
        | "accompagnatore"
        | "cliente"
        | "super_admin"
      deposit_type: "fixed" | "percentage"
      payment_status: "pending" | "completed" | "partial"
      permission_type:
        | "manage_trips"
        | "delete_trips"
        | "manage_participants"
        | "manage_payments"
        | "manage_bus"
        | "manage_carriers"
        | "view_prices"
        | "manage_hotels"
        | "view_activity_logs"
      trip_status:
        | "planned"
        | "confirmed"
        | "ongoing"
        | "completed"
        | "cancelled"
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
      app_role: ["admin", "agente", "accompagnatore", "cliente", "super_admin"],
      deposit_type: ["fixed", "percentage"],
      payment_status: ["pending", "completed", "partial"],
      permission_type: [
        "manage_trips",
        "delete_trips",
        "manage_participants",
        "manage_payments",
        "manage_bus",
        "manage_carriers",
        "view_prices",
        "manage_hotels",
        "view_activity_logs",
      ],
      trip_status: [
        "planned",
        "confirmed",
        "ongoing",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
