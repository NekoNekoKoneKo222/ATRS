/**
 * このファイルは /supabase/schema.sql のテーブル定義と1対1で対応する。
 * スキーマを変更した場合は必ずこちらも合わせて更新すること。
 *
 * @supabase/supabase-js の createClient<Database>() にそのまま渡せる形式にしている。
 */

export type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ModStatus = "draft" | "published" | "unlisted" | "deleted";

export type ModRow = {
  id: string;
  author_id: string;
  slug: string;
  name: string;
  description: string;
  status: ModStatus;
  downloads: number;
  created_at: string;
  updated_at: string;
}

export type ModVersionRow = {
  id: string;
  mod_id: string;
  version: string;
  schema_version: string;
  manifest: Record<string, unknown>;
  storage_path: string;
  created_at: string;
}

export type ModFileRow = {
  id: string;
  mod_version_id: string;
  path: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string;
  created_at: string;
}

export type ModDependencyRow = {
  id: string;
  mod_version_id: string;
  depends_on_mod_id: string;
  depends_on_version: string;
  created_at: string;
}

export type ModDownloadRow = {
  id: string;
  mod_id: string;
  mod_version_id: string;
  user_id: string | null;
  created_at: string;
}

export type SaveRow = {
  id: string;
  owner_id: string;
  slot_name: string;
  game_version: string;
  save_schema_version: string;
  save_data: Record<string, unknown>;
  updated_at: string;
  created_at: string;
}

export type SaveModRow = {
  save_id: string;
  mod_id: string;
  mod_version: string;
}

export type GameConfigRow = {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

/**
 * @supabase/supabase-js の型パラメータとして使うテーブル定義。
 * Insert/Update は「サーバー側で自動採番・自動更新されるカラム」を省略可能にしている。
 * Relationships は外部キーのメタ情報（select時のリレーション解決に使われる）。
 * このスキーマではテーブル間の外部キーをクエリ内embedで使わない設計のため空配列にしている。
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ProfileRow, "id">>;
        Relationships: [];
      };
      mods: {
        Row: ModRow;
        Insert: Omit<ModRow, "id" | "downloads" | "created_at" | "updated_at"> & {
          id?: string;
          downloads?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ModRow, "id">>;
        Relationships: [];
      };
      mod_versions: {
        Row: ModVersionRow;
        Insert: Omit<ModVersionRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<ModVersionRow, "id">>;
        Relationships: [];
      };
      mod_files: {
        Row: ModFileRow;
        Insert: Omit<ModFileRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<ModFileRow, "id">>;
        Relationships: [];
      };
      mod_dependencies: {
        Row: ModDependencyRow;
        Insert: Omit<ModDependencyRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<ModDependencyRow, "id">>;
        Relationships: [];
      };
      mod_downloads: {
        Row: ModDownloadRow;
        Insert: Omit<ModDownloadRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<ModDownloadRow, "id">>;
        Relationships: [];
      };
      saves: {
        Row: SaveRow;
        Insert: Omit<SaveRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SaveRow, "id">>;
        Relationships: [];
      };
      save_mods: {
        Row: SaveModRow;
        Insert: SaveModRow;
        Update: Partial<SaveModRow>;
        Relationships: [];
      };
      game_configs: {
        Row: GameConfigRow;
        Insert: Omit<GameConfigRow, "updated_at"> & { updated_at?: string };
        Update: Partial<GameConfigRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
