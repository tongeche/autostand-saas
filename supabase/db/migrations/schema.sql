

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."activity_type" AS ENUM (
    'call',
    'sms',
    'email',
    'note',
    'status_change',
    'stage_change',
    'task_create',
    'task_done',
    'edit',
    'archive',
    'delete'
);


ALTER TYPE "public"."activity_type" OWNER TO "postgres";


CREATE TYPE "public"."task_priority" AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);


ALTER TYPE "public"."task_priority" OWNER TO "postgres";


CREATE TYPE "public"."task_status" AS ENUM (
    'todo',
    'in_progress',
    'done',
    'cancelled'
);


ALTER TYPE "public"."task_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_org_owner"("_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_org uuid;
begin
insert into public.orgs(name) values (_name)
returning id into v_org;

insert into public.org_members (org_id, user_id, role, joined_at)
values (v_org, auth.uid(), 'owner', now())
on conflict (org_id, user_id) do nothing;

return v_org;
end$$;


ALTER FUNCTION "public"."create_org_owner"("_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jwt_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'tenant_id','')::uuid
$$;


ALTER FUNCTION "public"."jwt_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."orgs_auto_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
insert into public.org_members (org_id, user_id, role, joined_at)
values (new.id, auth.uid(), 'owner', now())
on conflict (org_id, user_id) do nothing;
return new;
end$$;


ALTER FUNCTION "public"."orgs_auto_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
new.updated_at := now();
return new;
end$$;


ALTER FUNCTION "public"."tg_set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity" (
    "id" "uuid" NOT NULL,
    "lead_id" "uuid",
    "type" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "ts" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "lead_id" "uuid",
    "title" "text" NOT NULL,
    "start_at" timestamp with time zone NOT NULL,
    "kind" "text" DEFAULT 'task'::"text" NOT NULL,
    "reminder_minutes" integer DEFAULT 15 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "calendar_events_kind_chk" CHECK (("kind" = ANY (ARRAY['task'::"text", 'schedule'::"text", 'reminder'::"text"]))),
    CONSTRAINT "calendar_events_reminder_minutes_check" CHECK ((("reminder_minutes" >= 0) AND ("reminder_minutes" <= 1440)))
);


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cars" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "plate" "text",
    "make" "text",
    "model" "text",
    "version" "text",
    "year" integer,
    "mileage" integer,
    "fuel" "text",
    "transmission" "text",
    "color" "text",
    "price" numeric,
    "status" "text",
    "source" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cars_import_staging" (
    "Disponibilizado a" "text",
    "Matrícula" "text",
    "Marca" "text",
    "Modelo" "text",
    "Versão" "text",
    "Data da primeira matrícula" "text",
    "Data da primeira matrícula em Portugal (para importados)" "text",
    "Dias em Stock" "text",
    "Estado" "text",
    "Cilindrada" "text",
    "Potência" "text",
    "KM" "text",
    "Combustível" "text",
    "Despesas" "text",
    "Preço de Venda" "text",
    "Regime de IVA" "text",
    "Preço de Compra" "text",
    "Total com Despesas" "text",
    "source" "text" DEFAULT 'csv-import'::"text",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."cars_import_staging" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gallery_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "lead_id" "uuid",
    "title" "text",
    "image_url" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gallery_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "sku" "text",
    "quantity" integer DEFAULT 0,
    "price" numeric,
    "status" "text",
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "ts" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text" NOT NULL,
    "actor_user_id" "uuid",
    "channel" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "lead_activities_type_check" CHECK (("type" = ANY (ARRAY['contact'::"text", 'info_prepared'::"text", 'pdf_generated'::"text", 'task_created'::"text", 'status_change'::"text", 'note'::"text", 'message'::"text"])))
);


ALTER TABLE "public"."lead_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "type" "public"."activity_type" NOT NULL,
    "direction" "text",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lead_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "author_id" "uuid",
    "body" "text" NOT NULL,
    "pinned" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lead_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "status" "public"."task_status" DEFAULT 'todo'::"public"."task_status" NOT NULL,
    "priority" "public"."task_priority" DEFAULT 'normal'::"public"."task_priority" NOT NULL,
    "due_date" "date",
    "assignee_id" "uuid",
    "completed_at" timestamp with time zone,
    "archived" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lead_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "email" "text",
    "phone" "text",
    "plate" "text",
    "source" "text",
    "status" "text",
    "intent" "text",
    "owner_name" "text",
    "owner_role" "text",
    "sla_deadline" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid",
    "stage_id" "uuid",
    "order_index" integer DEFAULT 0,
    "owner_id" "uuid",
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "archived" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_members" (
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "org_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'sales'::"text", 'pre_sales'::"text", 'post_sales'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."org_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_settings" (
    "org_id" "uuid" NOT NULL,
    "theme_mode" "text" DEFAULT 'system'::"text" NOT NULL,
    "brand_name" "text",
    "brand_logo_url" "text",
    "timezone" "text" DEFAULT 'Europe/Lisbon'::"text",
    "date_format" "text" DEFAULT 'dd/MM/yyyy'::"text",
    "pipeline_locked" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "business_type" "text",
    CONSTRAINT "org_settings_theme_mode_check" CHECK (("theme_mode" = ANY (ARRAY['light'::"text", 'dark'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."org_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orgs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "locale" "text" DEFAULT 'pt-PT'::"text",
    "currency" "text" DEFAULT 'EUR'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."orgs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipeline_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "position" integer NOT NULL,
    "is_closed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pipeline_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."renders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "gallery_item_id" "uuid",
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "output_url" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."renders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" NOT NULL,
    "lead_id" "uuid",
    "title" "text" NOT NULL,
    "done" boolean DEFAULT false,
    "due" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "channel" "text",
    "subject" "text",
    "body" "text",
    "follow_up_hours" integer
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."themes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "name" "text" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."themes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trade_ins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "plate" "text",
    "make" "text",
    "model" "text",
    "year" integer,
    "mileage" integer,
    "estimated_value" numeric,
    "status" "text" DEFAULT 'assessing'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trade_ins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_device_prefs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid" NOT NULL,
    "nav_collapsed" boolean,
    "wall_zoom" numeric,
    "extra" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_device_prefs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "device_label" "text",
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "theme_mode" "text" DEFAULT 'system'::"text",
    "density" "text" DEFAULT 'comfortable'::"text",
    "locale" "text",
    "mobile_nav_pinned" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_preferences_density_check" CHECK (("density" = ANY (ARRAY['compact'::"text", 'comfortable'::"text"]))),
    CONSTRAINT "user_preferences_theme_mode_check" CHECK (("theme_mode" = ANY (ARRAY['light'::"text", 'dark'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wall_notes" (
    "id" "uuid" NOT NULL,
    "todo_id" "uuid",
    "x" integer,
    "y" integer,
    "color" "text",
    "z" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wall_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wall_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "zoom" numeric DEFAULT 1.0 NOT NULL,
    "pan_x" integer DEFAULT 0 NOT NULL,
    "pan_y" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."wall_views" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity"
    ADD CONSTRAINT "activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cars"
    ADD CONSTRAINT "cars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gallery_items"
    ADD CONSTRAINT "gallery_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_activities"
    ADD CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_activity"
    ADD CONSTRAINT "lead_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_notes"
    ADD CONSTRAINT "lead_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_tasks"
    ADD CONSTRAINT "lead_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_pkey" PRIMARY KEY ("org_id", "user_id");



ALTER TABLE ONLY "public"."org_settings"
    ADD CONSTRAINT "org_settings_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."orgs"
    ADD CONSTRAINT "orgs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orgs"
    ADD CONSTRAINT "orgs_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_org_id_name_key" UNIQUE ("org_id", "name");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."renders"
    ADD CONSTRAINT "renders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stages"
    ADD CONSTRAINT "stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stages"
    ADD CONSTRAINT "stages_tenant_id_name_key" UNIQUE ("tenant_id", "name");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."themes"
    ADD CONSTRAINT "themes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trade_ins"
    ADD CONSTRAINT "trade_ins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_device_prefs"
    ADD CONSTRAINT "user_device_prefs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_devices"
    ADD CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("org_id", "user_id");



ALTER TABLE ONLY "public"."wall_notes"
    ADD CONSTRAINT "wall_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wall_views"
    ADD CONSTRAINT "wall_views_org_id_user_id_key" UNIQUE ("org_id", "user_id");



ALTER TABLE ONLY "public"."wall_views"
    ADD CONSTRAINT "wall_views_pkey" PRIMARY KEY ("id");



CREATE INDEX "activity_lead_ts" ON "public"."activity" USING "btree" ("lead_id", "ts" DESC);



CREATE INDEX "idx_calendar_events_lead_id" ON "public"."calendar_events" USING "btree" ("lead_id");



CREATE INDEX "idx_calendar_events_tenant_start_at" ON "public"."calendar_events" USING "btree" ("tenant_id", "start_at");



CREATE INDEX "idx_cis_tenant" ON "public"."cars_import_staging" USING "btree" ("tenant_id");



CREATE INDEX "idx_leads_tenant_stage_order" ON "public"."leads" USING "btree" ("tenant_id", "stage_id", "order_index");



CREATE INDEX "ix_lead_activity_created" ON "public"."lead_activity" USING "btree" ("created_at" DESC);



CREATE INDEX "ix_lead_activity_lead" ON "public"."lead_activity" USING "btree" ("lead_id");



CREATE INDEX "ix_lead_activity_tenant" ON "public"."lead_activity" USING "btree" ("tenant_id");



CREATE INDEX "ix_lead_tasks_archived" ON "public"."lead_tasks" USING "btree" ("archived");



CREATE INDEX "ix_lead_tasks_lead" ON "public"."lead_tasks" USING "btree" ("lead_id");



CREATE INDEX "ix_lead_tasks_status" ON "public"."lead_tasks" USING "btree" ("status");



CREATE INDEX "ix_lead_tasks_tenant" ON "public"."lead_tasks" USING "btree" ("tenant_id");



CREATE INDEX "ix_leads_archived" ON "public"."leads" USING "btree" ("archived");



CREATE INDEX "ix_leads_created_at" ON "public"."leads" USING "btree" ("created_at" DESC);



CREATE INDEX "ix_leads_stage" ON "public"."leads" USING "btree" ("stage_id");



CREATE INDEX "ix_leads_tenant" ON "public"."leads" USING "btree" ("tenant_id");



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "t_orgs_auto_owner" AFTER INSERT ON "public"."orgs" FOR EACH ROW EXECUTE FUNCTION "public"."orgs_auto_owner"();



CREATE OR REPLACE TRIGGER "trg_lead_tasks_updated" BEFORE UPDATE ON "public"."lead_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_leads_updated" BEFORE UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."activity"
    ADD CONSTRAINT "activity_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cars"
    ADD CONSTRAINT "cars_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gallery_items"
    ADD CONSTRAINT "gallery_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_activities"
    ADD CONSTRAINT "lead_activities_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lead_activities"
    ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_activities"
    ADD CONSTRAINT "lead_activities_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_activity"
    ADD CONSTRAINT "lead_activity_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_notes"
    ADD CONSTRAINT "lead_notes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_tasks"
    ADD CONSTRAINT "lead_tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."app_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_settings"
    ADD CONSTRAINT "org_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."renders"
    ADD CONSTRAINT "renders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stages"
    ADD CONSTRAINT "stages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."themes"
    ADD CONSTRAINT "themes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trade_ins"
    ADD CONSTRAINT "trade_ins_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trade_ins"
    ADD CONSTRAINT "trade_ins_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_device_prefs"
    ADD CONSTRAINT "user_device_prefs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."user_devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_devices"
    ADD CONSTRAINT "user_devices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_devices"
    ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wall_views"
    ADD CONSTRAINT "wall_views_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wall_views"
    ADD CONSTRAINT "wall_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."app_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_users_insert" ON "public"."app_users" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "app_users"."tenant_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "app_users_select" ON "public"."app_users" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "app_users"."tenant_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cal_insert" ON "public"."calendar_events" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "calendar_events"."tenant_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "cal_select" ON "public"."calendar_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "calendar_events"."tenant_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "cal_update" ON "public"."calendar_events" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "calendar_events"."tenant_id") AND ("m"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "calendar_events"."tenant_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "calendar_events_delete" ON "public"."calendar_events" FOR DELETE TO "authenticated" USING (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ? 'tenant_id'::"text") AND ("tenant_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'tenant_id'::"text"))::"uuid")));



CREATE POLICY "calendar_events_insert" ON "public"."calendar_events" FOR INSERT TO "authenticated" WITH CHECK (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ? 'tenant_id'::"text") AND ("tenant_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'tenant_id'::"text"))::"uuid")));



CREATE POLICY "calendar_events_select" ON "public"."calendar_events" FOR SELECT TO "authenticated" USING (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ? 'tenant_id'::"text") AND ("tenant_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'tenant_id'::"text"))::"uuid")));



CREATE POLICY "calendar_events_update" ON "public"."calendar_events" FOR UPDATE TO "authenticated" USING (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ? 'tenant_id'::"text") AND ("tenant_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'tenant_id'::"text"))::"uuid"))) WITH CHECK (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ? 'tenant_id'::"text") AND ("tenant_id" = ((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'tenant_id'::"text"))::"uuid")));



ALTER TABLE "public"."cars" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cars_import_staging" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cis_select" ON "public"."cars_import_staging" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "cars_import_staging"."tenant_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "dev_all_app_users" ON "public"."app_users" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_audit_logs" ON "public"."audit_logs" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_gallery_items" ON "public"."gallery_items" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_jobs" ON "public"."jobs" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_lead_activity" ON "public"."lead_activity" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_lead_notes" ON "public"."lead_notes" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_lead_tasks" ON "public"."lead_tasks" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_leads" ON "public"."leads" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_renders" ON "public"."renders" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_settings" ON "public"."settings" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_stages" ON "public"."stages" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_tenants" ON "public"."tenants" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_themes" ON "public"."themes" USING (true) WITH CHECK (true);



CREATE POLICY "dev_read_app_users" ON "public"."app_users" FOR SELECT USING (true);



CREATE POLICY "dev_read_audit_logs" ON "public"."audit_logs" FOR SELECT USING (true);



CREATE POLICY "dev_read_gallery_items" ON "public"."gallery_items" FOR SELECT USING (true);



CREATE POLICY "dev_read_jobs" ON "public"."jobs" FOR SELECT USING (true);



CREATE POLICY "dev_read_leads" ON "public"."leads" FOR SELECT USING (true);



CREATE POLICY "dev_read_renders" ON "public"."renders" FOR SELECT USING (true);



CREATE POLICY "dev_read_settings" ON "public"."settings" FOR SELECT USING (true);



CREATE POLICY "dev_read_stages" ON "public"."stages" FOR SELECT USING (true);



CREATE POLICY "dev_read_tenants" ON "public"."tenants" FOR SELECT USING (true);



CREATE POLICY "dev_read_themes" ON "public"."themes" FOR SELECT USING (true);



ALTER TABLE "public"."gallery_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_insert" ON "public"."inventory_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "inventory_items"."tenant_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "inv_select" ON "public"."inventory_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "inventory_items"."tenant_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "inv_update" ON "public"."inventory_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "inventory_items"."tenant_id") AND ("m"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "inventory_items"."tenant_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "leads_insert" ON "public"."leads" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "leads"."tenant_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "leads_select" ON "public"."leads" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "leads"."tenant_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "leads_update" ON "public"."leads" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "leads"."tenant_id") AND ("m"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "leads"."tenant_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."org_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_members_insert" ON "public"."org_members" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "org_members_select" ON "public"."org_members" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."org_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_settings_update" ON "public"."org_settings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "org_settings"."org_id") AND ("m"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "org_settings"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "org_settings_upsert" ON "public"."org_settings" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "org_settings"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."orgs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orgs_insert" ON "public"."orgs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "orgs_select" ON "public"."orgs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."org_members" "m"
  WHERE (("m"."org_id" = "orgs"."id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."pipeline_stages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."renders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."themes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trade_ins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_device_prefs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wall_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wall_views" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."create_org_owner"("_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_org_owner"("_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_org_owner"("_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."jwt_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."jwt_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jwt_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."orgs_auto_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."orgs_auto_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."orgs_auto_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."activity" TO "anon";
GRANT ALL ON TABLE "public"."activity" TO "authenticated";
GRANT ALL ON TABLE "public"."activity" TO "service_role";



GRANT ALL ON TABLE "public"."app_users" TO "anon";
GRANT ALL ON TABLE "public"."app_users" TO "authenticated";
GRANT ALL ON TABLE "public"."app_users" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."cars" TO "anon";
GRANT ALL ON TABLE "public"."cars" TO "authenticated";
GRANT ALL ON TABLE "public"."cars" TO "service_role";



GRANT ALL ON TABLE "public"."cars_import_staging" TO "anon";
GRANT ALL ON TABLE "public"."cars_import_staging" TO "authenticated";
GRANT ALL ON TABLE "public"."cars_import_staging" TO "service_role";



GRANT ALL ON TABLE "public"."gallery_items" TO "anon";
GRANT ALL ON TABLE "public"."gallery_items" TO "authenticated";
GRANT ALL ON TABLE "public"."gallery_items" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."lead_activities" TO "anon";
GRANT ALL ON TABLE "public"."lead_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_activities" TO "service_role";



GRANT ALL ON TABLE "public"."lead_activity" TO "anon";
GRANT ALL ON TABLE "public"."lead_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_activity" TO "service_role";



GRANT ALL ON TABLE "public"."lead_notes" TO "anon";
GRANT ALL ON TABLE "public"."lead_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_notes" TO "service_role";



GRANT ALL ON TABLE "public"."lead_tasks" TO "anon";
GRANT ALL ON TABLE "public"."lead_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON TABLE "public"."org_members" TO "anon";
GRANT ALL ON TABLE "public"."org_members" TO "authenticated";
GRANT ALL ON TABLE "public"."org_members" TO "service_role";



GRANT ALL ON TABLE "public"."org_settings" TO "anon";
GRANT ALL ON TABLE "public"."org_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."org_settings" TO "service_role";



GRANT ALL ON TABLE "public"."orgs" TO "anon";
GRANT ALL ON TABLE "public"."orgs" TO "authenticated";
GRANT ALL ON TABLE "public"."orgs" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_stages" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."renders" TO "anon";
GRANT ALL ON TABLE "public"."renders" TO "authenticated";
GRANT ALL ON TABLE "public"."renders" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."stages" TO "anon";
GRANT ALL ON TABLE "public"."stages" TO "authenticated";
GRANT ALL ON TABLE "public"."stages" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."themes" TO "anon";
GRANT ALL ON TABLE "public"."themes" TO "authenticated";
GRANT ALL ON TABLE "public"."themes" TO "service_role";



GRANT ALL ON TABLE "public"."trade_ins" TO "anon";
GRANT ALL ON TABLE "public"."trade_ins" TO "authenticated";
GRANT ALL ON TABLE "public"."trade_ins" TO "service_role";



GRANT ALL ON TABLE "public"."user_device_prefs" TO "anon";
GRANT ALL ON TABLE "public"."user_device_prefs" TO "authenticated";
GRANT ALL ON TABLE "public"."user_device_prefs" TO "service_role";



GRANT ALL ON TABLE "public"."user_devices" TO "anon";
GRANT ALL ON TABLE "public"."user_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."user_devices" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."wall_notes" TO "anon";
GRANT ALL ON TABLE "public"."wall_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."wall_notes" TO "service_role";



GRANT ALL ON TABLE "public"."wall_views" TO "anon";
GRANT ALL ON TABLE "public"."wall_views" TO "authenticated";
GRANT ALL ON TABLE "public"."wall_views" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
