-- Generat din src/registry/entities.mjs de src/core/schema.mjs. Nu se editează de mână.

CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('site', 'endpoint', 'repo', 'document', 'manual')),
  url TEXT NOT NULL UNIQUE, title TEXT, fetched_at TEXT, method TEXT, snapshot_file TEXT, status INTEGER, note TEXT,
  lang TEXT,
  created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS provenance (
  id INTEGER PRIMARY KEY AUTOINCREMENT, entity TEXT NOT NULL, entity_id INTEGER NOT NULL, field TEXT NOT NULL DEFAULT '',
  lang TEXT NOT NULL DEFAULT '',
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE, excerpt TEXT, method TEXT,
  certainty TEXT NOT NULL DEFAULT 'confirmed' CHECK (certainty IN ('confirmed', 'inferred', 'unverified', 'unrecoverable')),
  confidence REAL, verified_at TEXT, verified_by TEXT, created_at TEXT NOT NULL,
  UNIQUE (entity, entity_id, field, lang, source_id));

CREATE INDEX IF NOT EXISTS ix_provenance_entity ON provenance(entity, entity_id);

CREATE TABLE IF NOT EXISTS link_dismissals (
  relation TEXT NOT NULL, src_id INTEGER NOT NULL, dst_id INTEGER NOT NULL, evidence TEXT,
  at TEXT NOT NULL, by TEXT, PRIMARY KEY (relation, src_id, dst_id));

CREATE TABLE IF NOT EXISTS aliases (
  entity TEXT NOT NULL, entity_id INTEGER NOT NULL, alias TEXT NOT NULL, learned_from TEXT, at TEXT NOT NULL,
  PRIMARY KEY (entity, alias));

CREATE TABLE IF NOT EXISTS import_keys (
  entity TEXT NOT NULL, natural_key TEXT NOT NULL, entity_id INTEGER NOT NULL, at TEXT NOT NULL,
  PRIMARY KEY (entity, natural_key));

CREATE TABLE IF NOT EXISTS page_index (
  path TEXT PRIMARY KEY, lang TEXT NOT NULL, owner_entity TEXT, owner_id INTEGER, title TEXT, status INTEGER, rendered_at TEXT,
  hash TEXT, deps INTEGER, error TEXT, stale INTEGER NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS page_deps (
  path TEXT NOT NULL, entity TEXT NOT NULL, entity_id INTEGER,
  kind TEXT NOT NULL CHECK (kind IN ('page', 'direct', 'list', 'query', 'link', 'media', 'layout', 'pending')),
  component TEXT NOT NULL DEFAULT '', scope TEXT NOT NULL DEFAULT '', fields TEXT, reason TEXT);

CREATE INDEX IF NOT EXISTS ix_page_deps_entity ON page_deps(entity, entity_id);

CREATE INDEX IF NOT EXISTS ix_page_deps_path ON page_deps(path);

CREATE TABLE IF NOT EXISTS change_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, user_name TEXT, action TEXT NOT NULL, entity TEXT, entity_id INTEGER,
  label TEXT, payload TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, processed_at TEXT, affected INTEGER);

CREATE INDEX IF NOT EXISTS ix_change_events_status ON change_events(status);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY, event_id INTEGER REFERENCES change_events(id) ON DELETE CASCADE, at TEXT NOT NULL,
  path TEXT, action TEXT NOT NULL, detail TEXT);

CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY, at TEXT NOT NULL, user_id INTEGER, user_name TEXT,
  action TEXT NOT NULL, entity TEXT, entity_id INTEGER, lang TEXT, label TEXT, changes TEXT, reverted_by INTEGER);

CREATE INDEX IF NOT EXISTS ix_audit_entity ON audit_log(entity, entity_id);

CREATE TABLE IF NOT EXISTS validations (entity TEXT NOT NULL, entity_id INTEGER NOT NULL, fp TEXT NOT NULL, user_name TEXT,
  at TEXT NOT NULL, comment TEXT, PRIMARY KEY (entity, entity_id));

CREATE TABLE IF NOT EXISTS validation_log (id INTEGER PRIMARY KEY, entity TEXT NOT NULL, entity_id INTEGER NOT NULL, fp TEXT,
  user_name TEXT, at TEXT NOT NULL, action TEXT NOT NULL, comment TEXT);

CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT, updated_by TEXT);

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrator', 'editor', 'vizualizare')),
  password_hash TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, last_login_at TEXT);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL, expires_at TEXT NOT NULL, ip TEXT, user_agent TEXT);

CREATE TABLE IF NOT EXISTS login_attempts (id INTEGER PRIMARY KEY, email TEXT, ip TEXT, at TEXT NOT NULL, ok INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS backups (id INTEGER PRIMARY KEY, at TEXT NOT NULL, file TEXT NOT NULL, bytes INTEGER,
  kind TEXT NOT NULL CHECK (kind IN ('automat', 'manual', 'inainte-de-restaurare')), created_by TEXT);

CREATE TABLE IF NOT EXISTS "company" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  "legal_name" TEXT,
  "brand" TEXT,
  "cui" TEXT,
  "reg_com" TEXT,
  "registered_office" TEXT,
  "street" TEXT,
  "city" TEXT,
  "postal_code" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "social" TEXT CHECK ("social" IS NULL OR json_valid("social")),
  "latitude" REAL,
  "longitude" REAL,
  "building_levels" INTEGER,
  "building_footprint" TEXT CHECK ("building_footprint" IS NULL OR json_valid("building_footprint")),
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS "facts" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  "token" TEXT,
  "value" REAL,
  "unit" TEXT CHECK ("unit" IS NULL OR "unit" IN ('m2', 'ron_m2', 'procent', 'ore', 'buc')),
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_facts_token" ON "facts"("token");

CREATE TABLE IF NOT EXISTS "media" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  "filename" TEXT,
  "sha1" TEXT,
  "mime" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "bytes" INTEGER,
  "duration" REAL,
  "poster" TEXT,
  "renditions" TEXT CHECK ("renditions" IS NULL OR json_valid("renditions")),
  "tags" TEXT CHECK ("tags" IS NULL OR json_valid("tags")),
  "legacy_url" TEXT,
  "legacy_id" INTEGER,
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_media_sha1" ON "media"("sha1");

CREATE TABLE IF NOT EXISTS "features" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  draft TEXT CHECK (draft IS NULL OR json_valid(draft)),
  published_at TEXT,
  "icon_id" INTEGER REFERENCES media(id) ON DELETE SET NULL,
  "group" TEXT CHECK ("group" IS NULL OR "group" IN ('avantaje', 'confort', 'prezentare')),
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS "ix_features_icon_id" ON "features"("icon_id");

CREATE INDEX IF NOT EXISTS "ix_features_status" ON "features"(status);

CREATE TABLE IF NOT EXISTS "technologies" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  draft TEXT CHECK (draft IS NULL OR json_valid(draft)),
  published_at TEXT,
  "image_id" INTEGER REFERENCES media(id) ON DELETE SET NULL,
  "group" TEXT CHECK ("group" IS NULL OR "group" IN ('structura', 'anvelopa', 'interior', 'intretinere')),
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS "ix_technologies_image_id" ON "technologies"("image_id");

CREATE INDEX IF NOT EXISTS "ix_technologies_status" ON "technologies"(status);

CREATE TABLE IF NOT EXISTS "places" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  draft TEXT CHECK (draft IS NULL OR json_valid(draft)),
  published_at TEXT,
  "icon" TEXT DEFAULT 'park' CHECK ("icon" IS NULL OR "icon" IN ('metro', 'mall', 'shop', 'park', 'gym', 'cafe')),
  "latitude" REAL,
  "longitude" REAL,
  "distance_m" INTEGER,
  "walk_min" INTEGER,
  "drive_min" INTEGER,
  "walk_route" TEXT CHECK ("walk_route" IS NULL OR json_valid("walk_route")),
  "osm" TEXT,
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS "ix_places_status" ON "places"(status);

CREATE TABLE IF NOT EXISTS "partners" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  draft TEXT CHECK (draft IS NULL OR json_valid(draft)),
  published_at TEXT,
  "name" TEXT,
  "aliases" TEXT CHECK ("aliases" IS NULL OR json_valid("aliases")),
  "roles" TEXT CHECK ("roles" IS NULL OR json_valid("roles")),
  "url" TEXT,
  "logo_id" INTEGER REFERENCES media(id) ON DELETE SET NULL,
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS "ix_partners_logo_id" ON "partners"("logo_id");

CREATE INDEX IF NOT EXISTS "ix_partners_status" ON "partners"(status);

CREATE TABLE IF NOT EXISTS "awards" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  draft TEXT CHECK (draft IS NULL OR json_valid(draft)),
  published_at TEXT,
  "competition" TEXT,
  "year" INTEGER,
  "result" TEXT CHECK ("result" IS NULL OR "result" IN ('castigator', 'distinctie', 'mentiune', 'lista-scurta')),
  "url" TEXT,
  "badge_id" INTEGER REFERENCES media(id) ON DELETE SET NULL,
  "logo_id" INTEGER REFERENCES media(id) ON DELETE SET NULL,
  "organizer_id" INTEGER REFERENCES "partners"(id) ON DELETE SET NULL,
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS "ix_awards_badge_id" ON "awards"("badge_id");

CREATE INDEX IF NOT EXISTS "ix_awards_logo_id" ON "awards"("logo_id");

CREATE INDEX IF NOT EXISTS "ix_awards_organizer_id" ON "awards"("organizer_id");

CREATE INDEX IF NOT EXISTS "ix_awards_status" ON "awards"(status);

CREATE TABLE IF NOT EXISTS "card_tiers" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT,
  "rank" INTEGER,
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS "unit_types" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  draft TEXT CHECK (draft IS NULL OR json_valid(draft)),
  published_at TEXT,
  "kind" TEXT CHECK ("kind" IS NULL OR "kind" IN ('apartament', 'duplex', 'comercial')),
  "rooms" INTEGER,
  "area_min" REAL,
  "area_max" REAL,
  "floor_min" INTEGER,
  "floor_max" INTEGER,
  "baths_min" INTEGER,
  "baths_max" INTEGER,
  "terrace_min" REAL,
  "terrace_max" REAL,
  "balcony" INTEGER NOT NULL DEFAULT 0 CHECK ("balcony" IN (0, 1)),
  "price_from" INTEGER,
  "vat_excluded" INTEGER NOT NULL DEFAULT 1 CHECK ("vat_excluded" IN (0, 1)),
  "hero_image_id" INTEGER REFERENCES media(id) ON DELETE SET NULL,
  "video_id" INTEGER REFERENCES media(id) ON DELETE SET NULL,
  "card_tier_id" INTEGER REFERENCES "card_tiers"(id) ON DELETE SET NULL,
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS "ix_unit_types_hero_image_id" ON "unit_types"("hero_image_id");

CREATE INDEX IF NOT EXISTS "ix_unit_types_video_id" ON "unit_types"("video_id");

CREATE INDEX IF NOT EXISTS "ix_unit_types_card_tier_id" ON "unit_types"("card_tier_id");

CREATE INDEX IF NOT EXISTS "ix_unit_types_status" ON "unit_types"(status);

CREATE TABLE IF NOT EXISTS "businesses" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  draft TEXT CHECK (draft IS NULL OR json_valid(draft)),
  published_at TEXT,
  "name" TEXT,
  "aliases" TEXT CHECK ("aliases" IS NULL OR json_valid("aliases")),
  "logo_id" INTEGER REFERENCES media(id) ON DELETE SET NULL,
  "image_id" INTEGER REFERENCES media(id) ON DELETE SET NULL,
  "website" TEXT,
  "state" TEXT DEFAULT 'deschis' CHECK ("state" IS NULL OR "state" IN ('deschis', 'in-curand', 'inchis')),
  "opened_on" TEXT,
  "card_member" INTEGER NOT NULL DEFAULT 0 CHECK ("card_member" IN (0, 1)),
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS "ix_businesses_logo_id" ON "businesses"("logo_id");

CREATE INDEX IF NOT EXISTS "ix_businesses_image_id" ON "businesses"("image_id");

CREATE INDEX IF NOT EXISTS "ix_businesses_status" ON "businesses"(status);

CREATE TABLE IF NOT EXISTS "testimonials" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  draft TEXT CHECK (draft IS NULL OR json_valid(draft)),
  published_at TEXT,
  "author" TEXT,
  "anonymous" INTEGER NOT NULL DEFAULT 0 CHECK ("anonymous" IN (0, 1)),
  "quote" TEXT,
  "quote_lang" TEXT DEFAULT 'ro' CHECK ("quote_lang" IS NULL OR "quote_lang" IN ('ro', 'en')),
  "source" TEXT CHECK ("source" IS NULL OR "source" IN ('google', 'site', 'interviu', 'altul')),
  "given_on" TEXT,
  "featured" INTEGER NOT NULL DEFAULT 0 CHECK ("featured" IN (0, 1)),
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS "ix_testimonials_status" ON "testimonials"(status);

CREATE TABLE IF NOT EXISTS "categories" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS "posts" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  draft TEXT CHECK (draft IS NULL OR json_valid(draft)),
  published_at TEXT,
  "category_id" INTEGER REFERENCES "categories"(id) ON DELETE RESTRICT,
  "author" TEXT DEFAULT 'YachtKID',
  "image_id" INTEGER REFERENCES media(id) ON DELETE SET NULL,
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS "ix_posts_category_id" ON "posts"("category_id");

CREATE INDEX IF NOT EXISTS "ix_posts_image_id" ON "posts"("image_id");

CREATE INDEX IF NOT EXISTS "ix_posts_status" ON "posts"(status);

CREATE TABLE IF NOT EXISTS "pages" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  draft TEXT CHECK (draft IS NULL OR json_valid(draft)),
  published_at TEXT,
  "template" TEXT DEFAULT 'standard' CHECK ("template" IS NULL OR "template" IN ('standard', 'legal', 'landing', 'multumim')),
  "noindex" INTEGER NOT NULL DEFAULT 0 CHECK ("noindex" IN (0, 1)),
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS "ix_pages_status" ON "pages"(status);

CREATE TABLE IF NOT EXISTS "forms" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT,
  "handle" TEXT,
  "fields" TEXT CHECK ("fields" IS NULL OR json_valid("fields")),
  "success_page_id" INTEGER REFERENCES "pages"(id) ON DELETE SET NULL,
  "notify" TEXT CHECK ("notify" IS NULL OR json_valid("notify")),
  "hubspot_form" TEXT,
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_forms_handle" ON "forms"("handle");

CREATE INDEX IF NOT EXISTS "ix_forms_success_page_id" ON "forms"("success_page_id");

CREATE TABLE IF NOT EXISTS "sections" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  "kind" TEXT CHECK ("kind" IS NULL OR "kind" IN ('hero', 'text', 'fisa-tehnica', 'alte-locuinte', 'avantaje', 'tehnologii', 'afaceri', 'premii', 'testimoniale', 'cifre', 'galerie', 'video', 'articole', 'formular', 'cta', 'card-niveluri')),
  "anchor" TEXT,
  "image_id" INTEGER REFERENCES media(id) ON DELETE SET NULL,
  "show_map" INTEGER NOT NULL DEFAULT 0 CHECK ("show_map" IN (0, 1)),
  "video_id" INTEGER REFERENCES media(id) ON DELETE SET NULL,
  "unit_type_id" INTEGER REFERENCES "unit_types"(id) ON DELETE SET NULL,
  "strip" INTEGER NOT NULL DEFAULT 0 CHECK ("strip" IN (0, 1)),
  "business_filter" TEXT CHECK ("business_filter" IS NULL OR "business_filter" IN ('toate', 'membri-card')),
  "post_category_id" INTEGER REFERENCES "categories"(id) ON DELETE SET NULL,
  "limit" INTEGER,
  "form_id" INTEGER REFERENCES "forms"(id) ON DELETE SET NULL,
  "video_start" INTEGER,
  "variant" TEXT CHECK ("variant" IS NULL OR "variant" IN ('ecran', 'card')),
  "brochure_id" INTEGER REFERENCES media(id) ON DELETE SET NULL,
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS "ix_sections_image_id" ON "sections"("image_id");

CREATE INDEX IF NOT EXISTS "ix_sections_video_id" ON "sections"("video_id");

CREATE INDEX IF NOT EXISTS "ix_sections_unit_type_id" ON "sections"("unit_type_id");

CREATE INDEX IF NOT EXISTS "ix_sections_post_category_id" ON "sections"("post_category_id");

CREATE INDEX IF NOT EXISTS "ix_sections_form_id" ON "sections"("form_id");

CREATE INDEX IF NOT EXISTS "ix_sections_brochure_id" ON "sections"("brochure_id");

CREATE TABLE IF NOT EXISTS "menus" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT,
  "location" TEXT CHECK ("location" IS NULL OR "location" IN ('antet', 'subsol', 'subsol-legal', 'mobil')),
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_menus_location" ON "menus"("location");

CREATE TABLE IF NOT EXISTS "leads" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  "form_id" INTEGER REFERENCES "forms"(id) ON DELETE RESTRICT,
  "lang" TEXT CHECK ("lang" IS NULL OR "lang" IN ('ro', 'en')),
  "page_path" TEXT,
  "name" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "unit_type_id" INTEGER REFERENCES "unit_types"(id) ON DELETE SET NULL,
  "answers" TEXT CHECK ("answers" IS NULL OR json_valid("answers")),
  "consent" INTEGER NOT NULL DEFAULT 0 CHECK ("consent" IN (0, 1)),
  "delivery" TEXT DEFAULT 'in-asteptare' CHECK ("delivery" IS NULL OR "delivery" IN ('in-asteptare', 'trimis', 'esuat')),
  "delivery_error" TEXT,
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS "ix_leads_form_id" ON "leads"("form_id");

CREATE INDEX IF NOT EXISTS "ix_leads_unit_type_id" ON "leads"("unit_type_id");

CREATE TABLE IF NOT EXISTS "redirects" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  "from_path" TEXT,
  "to_ref" TEXT,
  "to_path" TEXT,
  "code" TEXT DEFAULT '301' CHECK ("code" IS NULL OR "code" IN ('301', '302', '410')),
  "origin" TEXT CHECK ("origin" IS NULL OR "origin" IN ('automat', 'import', 'manual')),
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_redirects_from_path" ON "redirects"("from_path");

CREATE TABLE IF NOT EXISTS "labels" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  "key" TEXT,
  search TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_labels_key" ON "labels"("key");

CREATE TABLE IF NOT EXISTS "company_translations" (
  entity_id INTEGER NOT NULL REFERENCES "company"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "schedule" TEXT,
  "address_label" TEXT,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE TABLE IF NOT EXISTS "facts_translations" (
  entity_id INTEGER NOT NULL REFERENCES "facts"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "label" TEXT,
  "suffix" TEXT,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE TABLE IF NOT EXISTS "media_translations" (
  entity_id INTEGER NOT NULL REFERENCES "media"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "alt" TEXT,
  "caption" TEXT,
  "description" TEXT,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE TABLE IF NOT EXISTS "features_translations" (
  entity_id INTEGER NOT NULL REFERENCES "features"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "title" TEXT,
  "text" TEXT,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE TABLE IF NOT EXISTS "technologies_translations" (
  entity_id INTEGER NOT NULL REFERENCES "technologies"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "title" TEXT,
  "summary" TEXT,
  "description" TEXT,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE TABLE IF NOT EXISTS "places_translations" (
  entity_id INTEGER NOT NULL REFERENCES "places"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "name" TEXT,
  "category_name" TEXT,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE TABLE IF NOT EXISTS "partners_translations" (
  entity_id INTEGER NOT NULL REFERENCES "partners"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "description" TEXT,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE TABLE IF NOT EXISTS "awards_translations" (
  entity_id INTEGER NOT NULL REFERENCES "awards"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "distinction" TEXT,
  "category_name" TEXT,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE TABLE IF NOT EXISTS "card_tiers_translations" (
  entity_id INTEGER NOT NULL REFERENCES "card_tiers"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "benefits" TEXT CHECK ("benefits" IS NULL OR json_valid("benefits")),
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE TABLE IF NOT EXISTS "unit_types_translations" (
  entity_id INTEGER NOT NULL REFERENCES "unit_types"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "name" TEXT,
  "slug" TEXT,
  "intro" TEXT,
  "description" TEXT,
  "seo_title" TEXT,
  "seo_description" TEXT,
  "legacy_id" INTEGER,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_unit_types_translations_slug" ON "unit_types_translations"(lang, slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS "ix_unit_types_translations_legacy" ON "unit_types_translations"(legacy_id);

CREATE TABLE IF NOT EXISTS "businesses_translations" (
  entity_id INTEGER NOT NULL REFERENCES "businesses"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "tagline" TEXT,
  "service" TEXT,
  "description" TEXT,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE TABLE IF NOT EXISTS "testimonials_translations" (
  entity_id INTEGER NOT NULL REFERENCES "testimonials"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "role" TEXT,
  "quote_translated" TEXT,
  "legacy_id" INTEGER,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE INDEX IF NOT EXISTS "ix_testimonials_translations_legacy" ON "testimonials_translations"(legacy_id);

CREATE TABLE IF NOT EXISTS "categories_translations" (
  entity_id INTEGER NOT NULL REFERENCES "categories"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "name" TEXT,
  "slug" TEXT,
  "description" TEXT,
  "seo_title" TEXT,
  "seo_description" TEXT,
  "legacy_id" INTEGER,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_categories_translations_slug" ON "categories_translations"(lang, slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS "ix_categories_translations_legacy" ON "categories_translations"(legacy_id);

CREATE TABLE IF NOT EXISTS "posts_translations" (
  entity_id INTEGER NOT NULL REFERENCES "posts"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "title" TEXT,
  "slug" TEXT,
  "excerpt" TEXT,
  "content" TEXT,
  "seo_title" TEXT,
  "seo_description" TEXT,
  "legacy_id" INTEGER,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_posts_translations_slug" ON "posts_translations"(lang, slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS "ix_posts_translations_legacy" ON "posts_translations"(legacy_id);

CREATE TABLE IF NOT EXISTS "pages_translations" (
  entity_id INTEGER NOT NULL REFERENCES "pages"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "title" TEXT,
  "slug" TEXT,
  "body" TEXT,
  "seo_title" TEXT,
  "seo_description" TEXT,
  "legacy_id" INTEGER,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_pages_translations_slug" ON "pages_translations"(lang, slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS "ix_pages_translations_legacy" ON "pages_translations"(legacy_id);

CREATE TABLE IF NOT EXISTS "forms_translations" (
  entity_id INTEGER NOT NULL REFERENCES "forms"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "field_labels" TEXT CHECK ("field_labels" IS NULL OR json_valid("field_labels")),
  "intro" TEXT,
  "submit_label" TEXT,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE TABLE IF NOT EXISTS "sections_translations" (
  entity_id INTEGER NOT NULL REFERENCES "sections"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "eyebrow" TEXT,
  "heading" TEXT,
  "text" TEXT,
  "buttons" TEXT CHECK ("buttons" IS NULL OR json_valid("buttons")),
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE TABLE IF NOT EXISTS "menus_translations" (
  entity_id INTEGER NOT NULL REFERENCES "menus"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "items" TEXT CHECK ("items" IS NULL OR json_valid("items")),
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE TABLE IF NOT EXISTS "labels_translations" (
  entity_id INTEGER NOT NULL REFERENCES "labels"(id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('ro', 'en')),
  "text" TEXT,
  source_fp TEXT,
  translated_at TEXT,
  translated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, lang)
);

CREATE TABLE IF NOT EXISTS "rel_technologies_suppliers" (
  src_id INTEGER NOT NULL REFERENCES "technologies"(id) ON DELETE CASCADE,
  dst_id INTEGER NOT NULL REFERENCES "partners"(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'inferred', 'unverified')),
  confidence REAL,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  note TEXT,
  attrs TEXT CHECK (attrs IS NULL OR json_valid(attrs)),
  created_at TEXT, created_by TEXT,
  PRIMARY KEY (src_id, dst_id)
);

CREATE INDEX IF NOT EXISTS "ix_rel_technologies_suppliers_dst" ON "rel_technologies_suppliers"(dst_id);

CREATE TABLE IF NOT EXISTS "rel_unit_types_gallery" (
  src_id INTEGER NOT NULL REFERENCES "unit_types"(id) ON DELETE CASCADE,
  dst_id INTEGER NOT NULL REFERENCES "media"(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'inferred', 'unverified')),
  confidence REAL,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  note TEXT,
  attrs TEXT CHECK (attrs IS NULL OR json_valid(attrs)),
  created_at TEXT, created_by TEXT,
  PRIMARY KEY (src_id, dst_id)
);

CREATE INDEX IF NOT EXISTS "ix_rel_unit_types_gallery_dst" ON "rel_unit_types_gallery"(dst_id);

CREATE TABLE IF NOT EXISTS "rel_unit_types_sections" (
  src_id INTEGER NOT NULL REFERENCES "unit_types"(id) ON DELETE CASCADE,
  dst_id INTEGER NOT NULL REFERENCES "sections"(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'inferred', 'unverified')),
  confidence REAL,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  note TEXT,
  attrs TEXT CHECK (attrs IS NULL OR json_valid(attrs)),
  created_at TEXT, created_by TEXT,
  PRIMARY KEY (src_id, dst_id)
);

CREATE INDEX IF NOT EXISTS "ix_rel_unit_types_sections_dst" ON "rel_unit_types_sections"(dst_id);

CREATE TABLE IF NOT EXISTS "rel_card_tiers_partners" (
  src_id INTEGER NOT NULL REFERENCES "card_tiers"(id) ON DELETE CASCADE,
  dst_id INTEGER NOT NULL REFERENCES "businesses"(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'inferred', 'unverified')),
  confidence REAL,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  note TEXT,
  attrs TEXT CHECK (attrs IS NULL OR json_valid(attrs)),
  created_at TEXT, created_by TEXT,
  PRIMARY KEY (src_id, dst_id)
);

CREATE INDEX IF NOT EXISTS "ix_rel_card_tiers_partners_dst" ON "rel_card_tiers_partners"(dst_id);

CREATE TABLE IF NOT EXISTS "rel_posts_businesses" (
  src_id INTEGER NOT NULL REFERENCES "posts"(id) ON DELETE CASCADE,
  dst_id INTEGER NOT NULL REFERENCES "businesses"(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'inferred', 'unverified')),
  confidence REAL,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  note TEXT,
  attrs TEXT CHECK (attrs IS NULL OR json_valid(attrs)),
  created_at TEXT, created_by TEXT,
  PRIMARY KEY (src_id, dst_id)
);

CREATE INDEX IF NOT EXISTS "ix_rel_posts_businesses_dst" ON "rel_posts_businesses"(dst_id);

CREATE TABLE IF NOT EXISTS "rel_posts_awards" (
  src_id INTEGER NOT NULL REFERENCES "posts"(id) ON DELETE CASCADE,
  dst_id INTEGER NOT NULL REFERENCES "awards"(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'inferred', 'unverified')),
  confidence REAL,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  note TEXT,
  attrs TEXT CHECK (attrs IS NULL OR json_valid(attrs)),
  created_at TEXT, created_by TEXT,
  PRIMARY KEY (src_id, dst_id)
);

CREATE INDEX IF NOT EXISTS "ix_rel_posts_awards_dst" ON "rel_posts_awards"(dst_id);

CREATE TABLE IF NOT EXISTS "rel_posts_unit_types" (
  src_id INTEGER NOT NULL REFERENCES "posts"(id) ON DELETE CASCADE,
  dst_id INTEGER NOT NULL REFERENCES "unit_types"(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'inferred', 'unverified')),
  confidence REAL,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  note TEXT,
  attrs TEXT CHECK (attrs IS NULL OR json_valid(attrs)),
  created_at TEXT, created_by TEXT,
  PRIMARY KEY (src_id, dst_id)
);

CREATE INDEX IF NOT EXISTS "ix_rel_posts_unit_types_dst" ON "rel_posts_unit_types"(dst_id);

CREATE TABLE IF NOT EXISTS "rel_pages_sections" (
  src_id INTEGER NOT NULL REFERENCES "pages"(id) ON DELETE CASCADE,
  dst_id INTEGER NOT NULL REFERENCES "sections"(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'inferred', 'unverified')),
  confidence REAL,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  note TEXT,
  attrs TEXT CHECK (attrs IS NULL OR json_valid(attrs)),
  created_at TEXT, created_by TEXT,
  PRIMARY KEY (src_id, dst_id)
);

CREATE INDEX IF NOT EXISTS "ix_rel_pages_sections_dst" ON "rel_pages_sections"(dst_id);

CREATE TABLE IF NOT EXISTS "rel_sections_places" (
  src_id INTEGER NOT NULL REFERENCES "sections"(id) ON DELETE CASCADE,
  dst_id INTEGER NOT NULL REFERENCES "places"(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'inferred', 'unverified')),
  confidence REAL,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  note TEXT,
  attrs TEXT CHECK (attrs IS NULL OR json_valid(attrs)),
  created_at TEXT, created_by TEXT,
  PRIMARY KEY (src_id, dst_id)
);

CREATE INDEX IF NOT EXISTS "ix_rel_sections_places_dst" ON "rel_sections_places"(dst_id);

CREATE TABLE IF NOT EXISTS "rel_sections_features" (
  src_id INTEGER NOT NULL REFERENCES "sections"(id) ON DELETE CASCADE,
  dst_id INTEGER NOT NULL REFERENCES "features"(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'inferred', 'unverified')),
  confidence REAL,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  note TEXT,
  attrs TEXT CHECK (attrs IS NULL OR json_valid(attrs)),
  created_at TEXT, created_by TEXT,
  PRIMARY KEY (src_id, dst_id)
);

CREATE INDEX IF NOT EXISTS "ix_rel_sections_features_dst" ON "rel_sections_features"(dst_id);

CREATE TABLE IF NOT EXISTS "rel_sections_technologies" (
  src_id INTEGER NOT NULL REFERENCES "sections"(id) ON DELETE CASCADE,
  dst_id INTEGER NOT NULL REFERENCES "technologies"(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'inferred', 'unverified')),
  confidence REAL,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  note TEXT,
  attrs TEXT CHECK (attrs IS NULL OR json_valid(attrs)),
  created_at TEXT, created_by TEXT,
  PRIMARY KEY (src_id, dst_id)
);

CREATE INDEX IF NOT EXISTS "ix_rel_sections_technologies_dst" ON "rel_sections_technologies"(dst_id);

CREATE TABLE IF NOT EXISTS "rel_sections_facts" (
  src_id INTEGER NOT NULL REFERENCES "sections"(id) ON DELETE CASCADE,
  dst_id INTEGER NOT NULL REFERENCES "facts"(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'inferred', 'unverified')),
  confidence REAL,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  note TEXT,
  attrs TEXT CHECK (attrs IS NULL OR json_valid(attrs)),
  created_at TEXT, created_by TEXT,
  PRIMARY KEY (src_id, dst_id)
);

CREATE INDEX IF NOT EXISTS "ix_rel_sections_facts_dst" ON "rel_sections_facts"(dst_id);

CREATE TABLE IF NOT EXISTS "rel_sections_testimonials" (
  src_id INTEGER NOT NULL REFERENCES "sections"(id) ON DELETE CASCADE,
  dst_id INTEGER NOT NULL REFERENCES "testimonials"(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'inferred', 'unverified')),
  confidence REAL,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  note TEXT,
  attrs TEXT CHECK (attrs IS NULL OR json_valid(attrs)),
  created_at TEXT, created_by TEXT,
  PRIMARY KEY (src_id, dst_id)
);

CREATE INDEX IF NOT EXISTS "ix_rel_sections_testimonials_dst" ON "rel_sections_testimonials"(dst_id);

CREATE TABLE IF NOT EXISTS "rel_sections_gallery" (
  src_id INTEGER NOT NULL REFERENCES "sections"(id) ON DELETE CASCADE,
  dst_id INTEGER NOT NULL REFERENCES "media"(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'inferred', 'unverified')),
  confidence REAL,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  note TEXT,
  attrs TEXT CHECK (attrs IS NULL OR json_valid(attrs)),
  created_at TEXT, created_by TEXT,
  PRIMARY KEY (src_id, dst_id)
);

CREATE INDEX IF NOT EXISTS "ix_rel_sections_gallery_dst" ON "rel_sections_gallery"(dst_id);
