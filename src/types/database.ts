/**
 * Tipagens do banco no formato gerado pelo Supabase CLI.
 * Escritas a partir das migrations em supabase/migrations.
 *
 * Para regenerar a partir do projeto real (recomendado após alterar o banco):
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null } & Timestamps;
        Insert: { id: string; full_name?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; full_name?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          automatically_add_out_of_stock: boolean;
          automatically_add_low_stock: boolean;
          theme: "light" | "dark" | "system";
        } & Timestamps;
        Insert: {
          id?: string;
          user_id?: string;
          automatically_add_out_of_stock?: boolean;
          automatically_add_low_stock?: boolean;
          theme?: "light" | "dark" | "system";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          automatically_add_out_of_stock?: boolean;
          automatically_add_low_stock?: boolean;
          theme?: "light" | "dark" | "system";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: { id: string; user_id: string; name: string; icon: string | null; color: string | null } & Timestamps;
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          icon?: string | null;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string | null;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      storage_locations: {
        Row: { id: string; user_id: string; name: string } & Timestamps;
        Insert: { id?: string; user_id?: string; name: string; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; name?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          brand: string | null;
          description: string | null;
          barcode: string | null;
          image_url: string | null;
          category_id: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          brand?: string | null;
          description?: string | null;
          barcode?: string | null;
          image_url?: string | null;
          category_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          brand?: string | null;
          description?: string | null;
          barcode?: string | null;
          image_url?: string | null;
          category_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_user_id_fkey";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      inventory_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          storage_location_id: string | null;
          current_quantity: number;
          minimum_quantity: number;
          control_unit: "unidade" | "pacote" | "caixa" | "garrafa" | "lata" | "frasco";
          package_size: number | null;
          package_unit: "g" | "kg" | "ml" | "L" | "unidade" | null;
          units_per_package: number;
          expiration_date: string | null;
          status: "available" | "low_stock" | "out_of_stock";
          notes: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id?: string;
          product_id: string;
          storage_location_id?: string | null;
          current_quantity?: number;
          minimum_quantity?: number;
          control_unit?: "unidade" | "pacote" | "caixa" | "garrafa" | "lata" | "frasco";
          package_size?: number | null;
          package_unit?: "g" | "kg" | "ml" | "L" | "unidade" | null;
          units_per_package?: number;
          expiration_date?: string | null;
          status?: "available" | "low_stock" | "out_of_stock";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          storage_location_id?: string | null;
          current_quantity?: number;
          minimum_quantity?: number;
          control_unit?: "unidade" | "pacote" | "caixa" | "garrafa" | "lata" | "frasco";
          package_size?: number | null;
          package_unit?: "g" | "kg" | "ml" | "L" | "unidade" | null;
          units_per_package?: number;
          expiration_date?: string | null;
          status?: "available" | "low_stock" | "out_of_stock";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_items_product_id_user_id_fkey";
            columns: ["product_id", "user_id"];
            isOneToOne: true;
            referencedRelation: "products";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "inventory_items_storage_location_id_user_id_fkey";
            columns: ["storage_location_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "storage_locations";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      stores: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          address: string | null;
          neighborhood: string | null;
          city: string | null;
          notes: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          address?: string | null;
          neighborhood?: string | null;
          city?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          address?: string | null;
          neighborhood?: string | null;
          city?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shopping_list_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string | null;
          custom_name: string | null;
          preferred_brand: string | null;
          desired_quantity: number;
          unit: "unidade" | "pacote" | "caixa" | "garrafa" | "lata" | "frasco";
          priority: "low" | "normal" | "high" | "urgent";
          reason: "out_of_stock" | "low_stock" | "manual";
          notes: string | null;
          status: "pending" | "purchased";
          purchased_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id?: string;
          product_id?: string | null;
          custom_name?: string | null;
          preferred_brand?: string | null;
          desired_quantity?: number;
          unit?: "unidade" | "pacote" | "caixa" | "garrafa" | "lata" | "frasco";
          priority?: "low" | "normal" | "high" | "urgent";
          reason?: "out_of_stock" | "low_stock" | "manual";
          notes?: string | null;
          status?: "pending" | "purchased";
          purchased_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string | null;
          custom_name?: string | null;
          preferred_brand?: string | null;
          desired_quantity?: number;
          unit?: "unidade" | "pacote" | "caixa" | "garrafa" | "lata" | "frasco";
          priority?: "low" | "normal" | "high" | "urgent";
          reason?: "out_of_stock" | "low_stock" | "manual";
          notes?: string | null;
          status?: "pending" | "purchased";
          purchased_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_product_id_user_id_fkey";
            columns: ["product_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          store_id: string;
          purchase_date: string;
          total_amount: number;
          status: "completed";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          store_id: string;
          purchase_date: string;
          total_amount?: number;
          status?: "completed";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          store_id?: string;
          purchase_date?: string;
          total_amount?: number;
          status?: "completed";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchases_store_id_user_id_fkey";
            columns: ["store_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      purchase_items: {
        Row: {
          id: string;
          user_id: string;
          purchase_id: string;
          product_id: string;
          brand: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          package_size: number | null;
          package_unit: "g" | "kg" | "ml" | "L" | "unidade" | null;
          units_per_package: number;
          packages_count: number;
          normalized_quantity: number;
          normalized_unit: "kg" | "L" | "unidade";
          normalized_unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          purchase_id: string;
          product_id: string;
          brand?: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          package_size?: number | null;
          package_unit?: "g" | "kg" | "ml" | "L" | "unidade" | null;
          units_per_package?: number;
          packages_count: number;
          normalized_quantity: number;
          normalized_unit: "kg" | "L" | "unidade";
          normalized_unit_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          purchase_id?: string;
          product_id?: string;
          brand?: string | null;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          package_size?: number | null;
          package_unit?: "g" | "kg" | "ml" | "L" | "unidade" | null;
          units_per_package?: number;
          packages_count?: number;
          normalized_quantity?: number;
          normalized_unit?: "kg" | "L" | "unidade";
          normalized_unit_price?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_items_purchase_id_user_id_fkey";
            columns: ["purchase_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "purchases";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "purchase_items_product_id_user_id_fkey";
            columns: ["product_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: {
      product_last_purchase: {
        Row: {
          product_id: string;
          user_id: string;
          purchase_id: string;
          brand: string | null;
          unit_price: number;
          normalized_unit: "kg" | "L" | "unidade";
          normalized_unit_price: number;
          purchase_date: string;
          store_id: string;
          store_name: string;
        };
        Relationships: [];
      };
      product_price_stats: {
        Row: {
          product_id: string;
          user_id: string;
          normalized_unit: "kg" | "L" | "unidade";
          min_normalized_unit_price: number;
          min_unit_price: number;
          purchases_count: number;
        };
        Relationships: [];
      };
      store_stats: {
        Row: {
          store_id: string;
          user_id: string;
          purchases_count: number;
          total_spent: number;
          average_ticket: number;
          last_purchase_date: string | null;
        };
        Relationships: [];
      };
      store_product_prices: {
        Row: {
          store_id: string;
          user_id: string;
          product_id: string;
          product_name: string;
          product_brand: string | null;
          normalized_unit: "kg" | "L" | "unidade";
          average_unit_price: number;
          average_normalized_unit_price: number;
          purchases_count: number;
          last_purchase_date: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      set_inventory_quantity: {
        Args: { p_item_id: string; p_quantity: number };
        Returns: Json;
      };
      adjust_inventory_quantity: {
        Args: { p_item_id: string; p_delta: number };
        Returns: Json;
      };
      mark_inventory_low_stock: {
        Args: { p_item_id: string };
        Returns: Json;
      };
      add_product_to_shopping_list: {
        Args: { p_product_id: string; p_quantity?: number; p_priority?: string; p_reason?: string };
        Returns: Json;
      };
      mark_shopping_item_purchased: {
        Args: { p_item_id: string };
        Returns: Json;
      };
      repeat_purchase_to_list: {
        Args: { p_purchase_id: string };
        Returns: Json;
      };
      create_product_with_inventory: {
        Args: { p_payload: Json };
        Returns: Json;
      };
      finalize_purchase: {
        Args: { p_store_id: string; p_purchase_date: string; p_items: Json };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
