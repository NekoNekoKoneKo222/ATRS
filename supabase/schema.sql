-- ASTRAL ARCHIVE (working title) - Supabase schema
-- Phase 8/9/10/11 で使用するテーブル定義とRLSポリシー

create extension if not exists "pgcrypto";

-- =========================================================
-- profiles: auth.users に紐づくプレイヤープロフィール
-- =========================================================
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own_or_public"
  on profiles for select
  using (true); -- 表示名等は公開情報として扱う

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on profiles for insert
  with check (auth.uid() = id);

-- =========================================================
-- mods: MODのメタデータ
-- =========================================================
create table if not exists mods (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  slug text not null unique,
  name text not null,
  description text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'unlisted', 'deleted')),
  downloads bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table mods enable row level security;

create policy "mods_select_published_or_own"
  on mods for select
  using (status = 'published' or status = 'unlisted' or author_id = auth.uid());

create policy "mods_insert_own"
  on mods for insert
  with check (author_id = auth.uid());

create policy "mods_update_own"
  on mods for update
  using (author_id = auth.uid());

create policy "mods_delete_own"
  on mods for delete
  using (author_id = auth.uid());

-- =========================================================
-- mod_versions: MODのバージョンごとのmanifestとStorageパス
-- =========================================================
create table if not exists mod_versions (
  id uuid primary key default gen_random_uuid(),
  mod_id uuid not null references mods (id) on delete cascade,
  version text not null,
  schema_version text not null default '1.0',
  manifest jsonb not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique (mod_id, version)
);

alter table mod_versions enable row level security;

create policy "mod_versions_select_if_mod_visible"
  on mod_versions for select
  using (
    exists (
      select 1 from mods m
      where m.id = mod_versions.mod_id
        and (m.status in ('published', 'unlisted') or m.author_id = auth.uid())
    )
  );

create policy "mod_versions_insert_own_mod"
  on mod_versions for insert
  with check (
    exists (select 1 from mods m where m.id = mod_id and m.author_id = auth.uid())
  );

-- =========================================================
-- mod_files: 個別ファイルのメタ情報（Storage実体は別バケット）
-- =========================================================
create table if not exists mod_files (
  id uuid primary key default gen_random_uuid(),
  mod_version_id uuid not null references mod_versions (id) on delete cascade,
  path text not null,
  content_type text not null,
  size_bytes bigint not null,
  checksum_sha256 text not null,
  created_at timestamptz not null default now(),
  unique (mod_version_id, path)
);

alter table mod_files enable row level security;

create policy "mod_files_select_if_version_visible"
  on mod_files for select
  using (
    exists (
      select 1 from mod_versions mv
      join mods m on m.id = mv.mod_id
      where mv.id = mod_files.mod_version_id
        and (m.status in ('published', 'unlisted') or m.author_id = auth.uid())
    )
  );

-- =========================================================
-- mod_dependencies: MODバージョン間の依存関係
-- =========================================================
create table if not exists mod_dependencies (
  id uuid primary key default gen_random_uuid(),
  mod_version_id uuid not null references mod_versions (id) on delete cascade,
  depends_on_mod_id uuid not null references mods (id),
  depends_on_version text not null,
  created_at timestamptz not null default now()
);

alter table mod_dependencies enable row level security;

create policy "mod_dependencies_select_if_version_visible"
  on mod_dependencies for select
  using (
    exists (
      select 1 from mod_versions mv
      join mods m on m.id = mv.mod_id
      where mv.id = mod_dependencies.mod_version_id
        and (m.status in ('published', 'unlisted') or m.author_id = auth.uid())
    )
  );

-- =========================================================
-- mod_downloads: ダウンロード履歴（集計・ランキング用）
-- =========================================================
create table if not exists mod_downloads (
  id uuid primary key default gen_random_uuid(),
  mod_id uuid not null references mods (id) on delete cascade,
  mod_version_id uuid not null references mod_versions (id) on delete cascade,
  user_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table mod_downloads enable row level security;

create policy "mod_downloads_insert_own"
  on mod_downloads for insert
  with check (user_id = auth.uid() or user_id is null);

create policy "mod_downloads_select_own"
  on mod_downloads for select
  using (user_id = auth.uid());

-- =========================================================
-- saves: クラウドセーブ本体
-- =========================================================
create table if not exists saves (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  slot_name text not null,
  game_version text not null,
  save_schema_version text not null default '1.0',
  save_data jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (owner_id, slot_name)
);

alter table saves enable row level security;

create policy "saves_select_own"
  on saves for select
  using (owner_id = auth.uid());

create policy "saves_insert_own"
  on saves for insert
  with check (owner_id = auth.uid());

create policy "saves_update_own"
  on saves for update
  using (owner_id = auth.uid());

create policy "saves_delete_own"
  on saves for delete
  using (owner_id = auth.uid());

-- =========================================================
-- save_mods: セーブが使用しているMODバージョン一覧
-- =========================================================
create table if not exists save_mods (
  save_id uuid not null references saves (id) on delete cascade,
  mod_id uuid not null references mods (id),
  mod_version text not null,
  primary key (save_id, mod_id)
);

alter table save_mods enable row level security;

create policy "save_mods_select_if_save_own"
  on save_mods for select
  using (
    exists (select 1 from saves s where s.id = save_mods.save_id and s.owner_id = auth.uid())
  );

create policy "save_mods_insert_if_save_own"
  on save_mods for insert
  with check (
    exists (select 1 from saves s where s.id = save_mods.save_id and s.owner_id = auth.uid())
  );

create policy "save_mods_delete_if_save_own"
  on save_mods for delete
  using (
    exists (select 1 from saves s where s.id = save_mods.save_id and s.owner_id = auth.uid())
  );

-- =========================================================
-- game_configs: サーバー配信のバランス設定（AP消費量など）
-- 読み取りは全員可、書き込みはservice_role経由のみ
-- =========================================================
create table if not exists game_configs (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table game_configs enable row level security;

create policy "game_configs_select_all"
  on game_configs for select
  using (true);

-- 更新はservice_roleのみ（クライアントからのinsert/update/deleteポリシーは意図的に定義しない）

-- =========================================================
-- Storage buckets（Supabase Dashboard もしくは管理APIで作成）
-- mods/{mod_id}/{version}/... : MOD本体ファイル
-- mod-thumbnails/{mod_id}/... : MODサムネイル
-- =========================================================
