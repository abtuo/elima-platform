-- Elima Supabase structural baseline
-- Project ref: nnsgvnjzfrcmbxfwlyow
-- Generated: 2026-10-20T15:27:00.228Z
-- Structure only: no application rows, Auth users, Storage objects or secrets.
-- Reference snapshot; do not apply blindly to a managed Supabase project.

-- Supabase CLI migration history table: absent

-- Extensions
create extension if not exists "pg_stat_statements" with schema "extensions";
create extension if not exists "pgcrypto" with schema "extensions";
create extension if not exists "supabase_vault" with schema "vault";
create extension if not exists "uuid-ossp" with schema "extensions";

-- Application types
create type "public"."app_role" as enum ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT', 'COMPTABLE');
create type "public"."attendance_status" as enum ('PRESENT', 'ABSENT', 'LATE');
create type "public"."conversation_participant_type" as enum ('USER', 'CLASS');
create type "public"."notification_status" as enum ('PENDING', 'SENT', 'FAILED');
create type "public"."risk_level" as enum ('LOW', 'MEDIUM', 'HIGH');
create type "public"."school_status" as enum ('public', 'private');
create type "public"."todo_status" as enum ('OPEN', 'DONE');

-- Application tables
create table "public"."academic_metrics" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "student_id" uuid not null,
  "average_score" numeric(6,2) not null,
  "attendance_rate" numeric(6,2) not null,
  "performance_trend" text not null,
  "risk_level" risk_level not null,
  "alert_flag" boolean default false not null,
  "computed_at" timestamp with time zone default now() not null
);
create table "public"."academic_years" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "label" text not null,
  "start_date" date,
  "end_date" date,
  "is_current" boolean default false not null,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."ai_insights" (
  "id" uuid default gen_random_uuid() not null,
  "student_id" uuid not null,
  "school_id" uuid not null,
  "type" text not null,
  "title" text not null,
  "description" text not null,
  "severity" text not null,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."attendance" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "class_id" uuid not null,
  "student_id" uuid not null,
  "recorded_by" uuid,
  "status" attendance_status not null,
  "date" date not null,
  "created_at" timestamp with time zone default now() not null,
  "justified" boolean default false not null,
  "reason" text
);
create table "public"."audit_logs" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid,
  "user_id" uuid,
  "action" text not null,
  "entity_type" text,
  "entity_id" uuid,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."auth_flow_attempts" (
  "id" uuid default gen_random_uuid() not null,
  "phone_hash" text not null,
  "ip_hash" text,
  "action" text not null,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."auth_flow_authorizations" (
  "id" uuid default gen_random_uuid() not null,
  "token_hash" text not null,
  "phone" text not null,
  "phone_hash" text not null,
  "purpose" text not null,
  "expires_at" timestamp with time zone not null,
  "claimed_at" timestamp with time zone,
  "claim_id" uuid,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."auth_verification_challenges" (
  "id" uuid not null,
  "purpose" text not null,
  "identifier_hash" text not null,
  "phone_hash" text not null,
  "code_hash" text not null,
  "attempts" integer default 0 not null,
  "max_attempts" integer default 5 not null,
  "expires_at" timestamp with time zone not null,
  "consumed_at" timestamp with time zone,
  "requested_ip_hash" text,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."cached_quiz_sets" (
  "id" uuid default gen_random_uuid() not null,
  "cache_key" text not null,
  "level" text not null,
  "subject" text not null,
  "topic" text not null,
  "subject_label" text,
  "level_label" text,
  "questions" jsonb not null,
  "question_count" integer default 0 not null,
  "play_count" integer default 0 not null,
  "created_at" timestamp with time zone default now()
);
create table "public"."class_teachers" (
  "class_id" uuid not null,
  "teacher_id" uuid not null,
  "subject_id" uuid not null
);
create table "public"."classes" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "name" text not null,
  "level" text not null,
  "academic_year" text not null,
  "created_at" timestamp with time zone default now() not null,
  "capacity" integer
);
create table "public"."conversation_participants" (
  "id" uuid default gen_random_uuid() not null,
  "conversation_id" uuid not null,
  "participant_type" conversation_participant_type default 'USER'::conversation_participant_type not null,
  "user_id" uuid,
  "class_id" uuid,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."conversations" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "title" text,
  "created_at" timestamp with time zone default now() not null,
  "type" text default 'parent_admin'::text not null,
  "student_id" uuid,
  "class_id" uuid,
  "is_demo" boolean default false not null,
  "updated_at" timestamp with time zone default now() not null,
  "last_message_at" timestamp with time zone
);
create table "public"."courses" (
  "id" uuid default gen_random_uuid() not null,
  "subject" text not null,
  "title" text not null,
  "content" text not null,
  "level" text not null,
  "created_at" timestamp with time zone default now()
);
create table "public"."demo_requests" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "school" text not null,
  "city" text,
  "email" text not null,
  "phone" text,
  "message" text,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."evaluations" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "class_id" uuid not null,
  "subject_id" uuid not null,
  "title" text not null,
  "max_score" numeric(6,2) default 20 not null,
  "evaluation_date" date not null,
  "coefficient" numeric(6,2) default 1 not null,
  "term_id" uuid,
  "teacher_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "evaluation_type" text
);
create table "public"."fee_installments" (
  "id" uuid default gen_random_uuid() not null,
  "fee_structure_id" uuid not null,
  "school_id" uuid not null,
  "label" text not null,
  "due_date" date not null,
  "amount" numeric(12,2) default 0 not null,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."fee_structures" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "label" text not null,
  "level" text,
  "class_id" uuid,
  "academic_year" text,
  "total_amount" numeric(12,2) default 0 not null,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."grades" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "evaluation_id" uuid not null,
  "student_id" uuid not null,
  "score" numeric(6,2) not null,
  "comment" text,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."homeworks" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "class_id" uuid not null,
  "subject_id" uuid not null,
  "teacher_id" uuid,
  "title" text not null,
  "description" text,
  "due_date" date not null,
  "created_at" timestamp with time zone default now() not null,
  "resource_url" text
);
create table "public"."lesson_logs" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "class_id" uuid not null,
  "subject_id" uuid not null,
  "teacher_id" uuid,
  "term_id" uuid,
  "lesson_date" date not null,
  "content" text not null,
  "resource_url" text,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."level_subjects" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "level" text not null,
  "subject_id" uuid not null,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."messages" (
  "id" uuid default gen_random_uuid() not null,
  "conversation_id" uuid not null,
  "sender_id" uuid,
  "content" text not null,
  "created_at" timestamp with time zone default now() not null,
  "sender_role" text,
  "type" text default 'text'::text not null,
  "metadata" jsonb,
  "is_demo" boolean default false not null,
  "read_by" jsonb default '[]'::jsonb not null
);
create table "public"."notifications" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "student_id" uuid,
  "parent_id" uuid,
  "type" text not null,
  "channel" text default 'WHATSAPP'::text not null,
  "message" text not null,
  "status" notification_status default 'PENDING'::notification_status not null,
  "provider_ref" text,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."parents" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "user_id" uuid not null,
  "created_at" timestamp with time zone default now() not null,
  "email" text,
  "full_name" text,
  "phone" text
);
create table "public"."payments" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "student_id" uuid not null,
  "student_fee_id" uuid,
  "installment_id" uuid,
  "amount" numeric(12,2) not null,
  "method" text default 'cash'::text not null,
  "status" text default 'paid'::text not null,
  "receipt_no" text,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "payment_provider" text
);
create table "public"."quiz_results" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "quiz_id" uuid,
  "score" integer not null,
  "completed_at" timestamp with time zone default now()
);
create table "public"."quizzes" (
  "id" uuid default gen_random_uuid() not null,
  "subject" text not null,
  "level" text not null,
  "question" text not null,
  "options" jsonb not null,
  "correct_answer" text not null,
  "explanation" text not null,
  "created_at" timestamp with time zone default now()
);
create table "public"."reports" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "student_id" uuid not null,
  "term" text not null,
  "average_score" numeric(6,2) not null,
  "attendance_rate" numeric(6,2) not null,
  "pdf_url" text,
  "published_by" uuid,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."scanned_exams" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "file_path" text not null,
  "analysis" text,
  "status" text default 'pending'::text,
  "created_at" timestamp with time zone default now()
);
create table "public"."schools" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "country" text not null,
  "city" text,
  "phone" text,
  "status" school_status default 'private'::school_status not null,
  "created_at" timestamp with time zone default now() not null,
  "motto" text,
  "plan" text,
  "logo_url" text,
  "currency" text,
  "stamp_url" text,
  "address" text,
  "is_demo" boolean default false not null,
  "demo_slug" text,
  "current_term_id" uuid
);
create table "public"."store_order_items" (
  "id" uuid default gen_random_uuid() not null,
  "order_id" uuid not null,
  "product_id" uuid,
  "name" text not null,
  "quantity" integer default 1 not null,
  "unit_price" numeric(12,2) default 0 not null,
  "total_price" numeric(12,2) default 0 not null
);
create table "public"."store_orders" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "parent_id" uuid not null,
  "student_id" uuid not null,
  "class_id" uuid not null,
  "pack_id" uuid not null,
  "total_amount" numeric(12,2) default 0 not null,
  "payment_status" text default 'pending'::text not null,
  "order_status" text default 'pending'::text not null,
  "pickup_location" text default 'Retrait à l''école'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "invoice_no" text,
  "payment_method" text,
  "payment_provider" text
);
create table "public"."store_pack_items" (
  "id" uuid default gen_random_uuid() not null,
  "pack_id" uuid not null,
  "product_id" uuid,
  "name" text not null,
  "quantity" integer default 1 not null,
  "unit_price" numeric(12,2) default 0 not null,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."store_packs" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "class_id" uuid not null,
  "supply_list_id" uuid,
  "title" text not null,
  "description" text,
  "price" numeric(12,2) default 0 not null,
  "type" text default 'essential'::text not null,
  "status" text default 'draft'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table "public"."store_products" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "name" text not null,
  "description" text,
  "category" text,
  "price" numeric(12,2) default 0 not null,
  "image_url" text,
  "is_active" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table "public"."student_activation_codes" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "student_id" uuid not null,
  "code_hash" text not null,
  "expires_at" timestamp with time zone default (now() + '30 days'::interval) not null,
  "used_at" timestamp with time zone,
  "used_by" uuid,
  "revoked_at" timestamp with time zone,
  "created_by" uuid,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."student_fees" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "student_id" uuid not null,
  "fee_structure_id" uuid,
  "amount_due" numeric(12,2) default 0 not null,
  "academic_year" text,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."student_learning_profiles" (
  "id" uuid default gen_random_uuid() not null,
  "student_id" uuid not null,
  "school_id" uuid not null,
  "weak_subjects" text[] default '{}'::text[] not null,
  "strong_subjects" text[] default '{}'::text[] not null,
  "risk_level" text not null,
  "attendance_risk_score" numeric(6,2) default 0 not null,
  "academic_risk_score" numeric(6,2) default 0 not null,
  "suggested_focus_areas" text[] default '{}'::text[] not null,
  "last_computed_at" timestamp with time zone default now() not null
);
create table "public"."student_parents" (
  "student_id" uuid not null,
  "parent_id" uuid not null,
  "relationship" text
);
create table "public"."student_payments" (
  "id" uuid default gen_random_uuid() not null,
  "student_id" uuid not null,
  "school_id" uuid not null,
  "parent_phone" text,
  "amount" numeric(12,2) not null,
  "type" text not null,
  "provider" text not null,
  "status" text not null,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."student_profiles" (
  "id" uuid not null,
  "first_name" text default ''::text not null,
  "last_name" text default ''::text not null,
  "age" smallint,
  "school_level_id" text default ''::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table "public"."student_prospects" (
  "user_id" uuid not null,
  "declared_school_name" text,
  "declared_school_city" text,
  "school_level" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table "public"."student_term_summaries" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "student_id" uuid not null,
  "class_id" uuid not null,
  "term_id" uuid not null,
  "average" numeric(6,2) not null,
  "rank" integer,
  "appreciation_auto" text not null,
  "appreciation_override" text,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."students" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "user_id" uuid,
  "class_id" uuid not null,
  "registration_number" text,
  "full_name" text not null,
  "birth_date" date,
  "created_at" timestamp with time zone default now() not null,
  "first_name" text,
  "last_name" text,
  "gender" text,
  "status" text default 'active'::text not null,
  "parent_name" text,
  "parent_phone" text,
  "parent_email" text,
  "photo_url" text
);
create table "public"."subjects" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "name" text not null,
  "coefficient" numeric(5,2) default 1 not null,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."supply_list_items" (
  "id" uuid default gen_random_uuid() not null,
  "supply_list_id" uuid not null,
  "name" text not null,
  "quantity" integer default 1 not null,
  "notes" text,
  "recommended_product_id" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table "public"."supply_lists" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "class_id" uuid not null,
  "title" text not null,
  "academic_year" text not null,
  "status" text default 'draft'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table "public"."teacher_memos" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "teacher_id" uuid not null,
  "content" text not null,
  "updated_at" timestamp with time zone default now() not null
);
create table "public"."teacher_subject_classes" (
  "id" uuid default gen_random_uuid() not null,
  "teacher_id" uuid not null,
  "class_id" uuid not null,
  "subject_id" uuid not null,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."teacher_todos" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "teacher_id" uuid not null,
  "text" text not null,
  "status" todo_status default 'OPEN'::todo_status not null,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."teachers" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "user_id" uuid not null,
  "created_at" timestamp with time zone default now() not null,
  "primary_subject" text
);
create table "public"."terms" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "name" text not null,
  "start_date" date not null,
  "end_date" date not null,
  "is_closed" boolean default false not null,
  "created_at" timestamp with time zone default now() not null
);
create table "public"."timetable_events" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "class_id" uuid not null,
  "teacher_id" uuid not null,
  "subject_id" uuid not null,
  "starts_at" timestamp with time zone not null,
  "ends_at" timestamp with time zone not null,
  "room" text,
  "created_at" timestamp with time zone default now() not null,
  "status" text default 'scheduled'::text not null,
  "original_starts_at" timestamp with time zone,
  "original_ends_at" timestamp with time zone,
  "change_reason" text,
  "change_message" text,
  "changed_at" timestamp with time zone,
  "changed_by" uuid,
  "cancelled_at" timestamp with time zone
);
create table "public"."users" (
  "id" uuid not null,
  "school_id" uuid,
  "role" app_role not null,
  "full_name" text not null,
  "phone" text,
  "created_at" timestamp with time zone default now() not null,
  "email" text
);
create table "public"."whatsapp_messages" (
  "id" uuid default gen_random_uuid() not null,
  "school_id" uuid not null,
  "student_id" uuid,
  "parent_phone" text,
  "message_type" text not null,
  "body" text not null,
  "status" text not null,
  "created_at" timestamp with time zone default now() not null
);

-- Constraints
alter table only "public"."academic_metrics" add constraint "academic_metrics_pkey" PRIMARY KEY (id);
alter table only "public"."academic_metrics" add constraint "academic_metrics_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."academic_metrics" add constraint "academic_metrics_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table only "public"."academic_years" add constraint "academic_years_pkey" PRIMARY KEY (id);
alter table only "public"."academic_years" add constraint "academic_years_school_id_label_key" UNIQUE (school_id, label);
alter table only "public"."academic_years" add constraint "academic_years_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."ai_insights" add constraint "ai_insights_pkey" PRIMARY KEY (id);
alter table only "public"."ai_insights" add constraint "ai_insights_severity_check" CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]));
alter table only "public"."ai_insights" add constraint "ai_insights_type_check" CHECK (type = ANY (ARRAY['academic_risk'::text, 'attendance_risk'::text, 'payment_risk'::text, 'progress_summary'::text]));
alter table only "public"."ai_insights" add constraint "ai_insights_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."ai_insights" add constraint "ai_insights_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table only "public"."attendance" add constraint "attendance_pkey" PRIMARY KEY (id);
alter table only "public"."attendance" add constraint "attendance_student_id_date_key" UNIQUE (student_id, date);
alter table only "public"."attendance" add constraint "attendance_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
alter table only "public"."attendance" add constraint "attendance_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL;
alter table only "public"."attendance" add constraint "attendance_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."attendance" add constraint "attendance_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table only "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY (id);
alter table only "public"."audit_logs" add constraint "audit_logs_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;
alter table only "public"."audit_logs" add constraint "audit_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
alter table only "public"."auth_flow_attempts" add constraint "auth_flow_attempts_pkey" PRIMARY KEY (id);
alter table only "public"."auth_flow_attempts" add constraint "auth_flow_attempts_action_check" CHECK (action = ANY (ARRAY['otp_request'::text, 'otp_check'::text, 'password_reset'::text]));
alter table only "public"."auth_flow_authorizations" add constraint "auth_flow_authorizations_pkey" PRIMARY KEY (id);
alter table only "public"."auth_flow_authorizations" add constraint "auth_flow_authorizations_token_hash_key" UNIQUE (token_hash);
alter table only "public"."auth_flow_authorizations" add constraint "auth_flow_authorizations_purpose_check" CHECK (purpose = ANY (ARRAY['otp_signup'::text, 'otp_password_reset'::text, 'phone_control'::text, 'signup'::text, 'password_reset'::text]));
alter table only "public"."auth_flow_authorizations" add constraint "auth_flow_claim_pair" CHECK ((claimed_at IS NULL) = (claim_id IS NULL));
alter table only "public"."auth_verification_challenges" add constraint "auth_verification_challenges_pkey" PRIMARY KEY (id);
alter table only "public"."auth_verification_challenges" add constraint "auth_verification_challenges_attempts_check" CHECK (attempts >= 0);
alter table only "public"."auth_verification_challenges" add constraint "auth_verification_challenges_max_attempts_check" CHECK (max_attempts >= 1 AND max_attempts <= 10);
alter table only "public"."auth_verification_challenges" add constraint "auth_verification_challenges_purpose_check" CHECK (purpose = ANY (ARRAY['signup'::text, 'password_reset'::text]));
alter table only "public"."cached_quiz_sets" add constraint "cached_quiz_sets_pkey" PRIMARY KEY (id);
alter table only "public"."cached_quiz_sets" add constraint "cached_quiz_sets_cache_key_key" UNIQUE (cache_key);
alter table only "public"."class_teachers" add constraint "class_teachers_pkey" PRIMARY KEY (class_id, teacher_id, subject_id);
alter table only "public"."class_teachers" add constraint "class_teachers_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
alter table only "public"."class_teachers" add constraint "class_teachers_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
alter table only "public"."class_teachers" add constraint "class_teachers_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
alter table only "public"."classes" add constraint "classes_pkey" PRIMARY KEY (id);
alter table only "public"."classes" add constraint "classes_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."conversation_participants" add constraint "conversation_participants_pkey" PRIMARY KEY (id);
alter table only "public"."conversation_participants" add constraint "conversation_participants_one_target_check" CHECK (participant_type = 'USER'::conversation_participant_type AND user_id IS NOT NULL AND class_id IS NULL OR participant_type = 'CLASS'::conversation_participant_type AND class_id IS NOT NULL AND user_id IS NULL);
alter table only "public"."conversation_participants" add constraint "conversation_participants_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
alter table only "public"."conversation_participants" add constraint "conversation_participants_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
alter table only "public"."conversation_participants" add constraint "conversation_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table only "public"."conversations" add constraint "conversations_pkey" PRIMARY KEY (id);
alter table only "public"."conversations" add constraint "conversations_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
alter table only "public"."conversations" add constraint "conversations_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."conversations" add constraint "conversations_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;
alter table only "public"."courses" add constraint "courses_pkey" PRIMARY KEY (id);
alter table only "public"."demo_requests" add constraint "demo_requests_pkey" PRIMARY KEY (id);
alter table only "public"."evaluations" add constraint "evaluations_pkey" PRIMARY KEY (id);
alter table only "public"."evaluations" add constraint "evaluations_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
alter table only "public"."evaluations" add constraint "evaluations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
alter table only "public"."evaluations" add constraint "evaluations_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."evaluations" add constraint "evaluations_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
alter table only "public"."evaluations" add constraint "evaluations_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
alter table only "public"."evaluations" add constraint "evaluations_term_id_fkey" FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE SET NULL;
alter table only "public"."fee_installments" add constraint "fee_installments_pkey" PRIMARY KEY (id);
alter table only "public"."fee_installments" add constraint "fee_installments_fee_structure_id_fkey" FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id) ON DELETE CASCADE;
alter table only "public"."fee_installments" add constraint "fee_installments_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."fee_structures" add constraint "fee_structures_pkey" PRIMARY KEY (id);
alter table only "public"."fee_structures" add constraint "fee_structures_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
alter table only "public"."fee_structures" add constraint "fee_structures_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."grades" add constraint "grades_pkey" PRIMARY KEY (id);
alter table only "public"."grades" add constraint "grades_evaluation_id_student_id_key" UNIQUE (evaluation_id, student_id);
alter table only "public"."grades" add constraint "grades_evaluation_id_fkey" FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE;
alter table only "public"."grades" add constraint "grades_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."grades" add constraint "grades_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table only "public"."homeworks" add constraint "homeworks_pkey" PRIMARY KEY (id);
alter table only "public"."homeworks" add constraint "homeworks_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
alter table only "public"."homeworks" add constraint "homeworks_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."homeworks" add constraint "homeworks_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
alter table only "public"."homeworks" add constraint "homeworks_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
alter table only "public"."lesson_logs" add constraint "lesson_logs_pkey" PRIMARY KEY (id);
alter table only "public"."lesson_logs" add constraint "lesson_logs_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
alter table only "public"."lesson_logs" add constraint "lesson_logs_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."lesson_logs" add constraint "lesson_logs_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
alter table only "public"."lesson_logs" add constraint "lesson_logs_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
alter table only "public"."lesson_logs" add constraint "lesson_logs_term_id_fkey" FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE SET NULL;
alter table only "public"."level_subjects" add constraint "level_subjects_pkey" PRIMARY KEY (id);
alter table only "public"."level_subjects" add constraint "level_subjects_school_id_level_subject_id_key" UNIQUE (school_id, level, subject_id);
alter table only "public"."level_subjects" add constraint "level_subjects_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."level_subjects" add constraint "level_subjects_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
alter table only "public"."messages" add constraint "messages_pkey" PRIMARY KEY (id);
alter table only "public"."messages" add constraint "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
alter table only "public"."messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL;
alter table only "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY (id);
alter table only "public"."notifications" add constraint "notifications_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE SET NULL;
alter table only "public"."notifications" add constraint "notifications_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."notifications" add constraint "notifications_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;
alter table only "public"."parents" add constraint "parents_pkey" PRIMARY KEY (id);
alter table only "public"."parents" add constraint "parents_user_id_key" UNIQUE (user_id);
alter table only "public"."parents" add constraint "parents_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."parents" add constraint "parents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table only "public"."payments" add constraint "payments_pkey" PRIMARY KEY (id);
alter table only "public"."payments" add constraint "payments_method_check" CHECK (method = ANY (ARRAY['mobile_money'::text, 'card'::text, 'transfer'::text, 'cash'::text]));
alter table only "public"."payments" add constraint "payments_status_check" CHECK (status = ANY (ARRAY['paid'::text, 'partial'::text, 'pending'::text, 'late'::text]));
alter table only "public"."payments" add constraint "payments_installment_id_fkey" FOREIGN KEY (installment_id) REFERENCES fee_installments(id) ON DELETE SET NULL;
alter table only "public"."payments" add constraint "payments_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."payments" add constraint "payments_student_fee_id_fkey" FOREIGN KEY (student_fee_id) REFERENCES student_fees(id) ON DELETE SET NULL;
alter table only "public"."payments" add constraint "payments_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table only "public"."quiz_results" add constraint "quiz_results_pkey" PRIMARY KEY (id);
alter table only "public"."quiz_results" add constraint "quiz_results_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE SET NULL;
alter table only "public"."quiz_results" add constraint "quiz_results_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table only "public"."quizzes" add constraint "quizzes_pkey" PRIMARY KEY (id);
alter table only "public"."reports" add constraint "reports_pkey" PRIMARY KEY (id);
alter table only "public"."reports" add constraint "reports_published_by_fkey" FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL;
alter table only "public"."reports" add constraint "reports_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."reports" add constraint "reports_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table only "public"."scanned_exams" add constraint "scanned_exams_pkey" PRIMARY KEY (id);
alter table only "public"."scanned_exams" add constraint "scanned_exams_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table only "public"."schools" add constraint "schools_pkey" PRIMARY KEY (id);
alter table only "public"."schools" add constraint "schools_current_term_id_fkey" FOREIGN KEY (current_term_id) REFERENCES terms(id);
alter table only "public"."store_order_items" add constraint "store_order_items_pkey" PRIMARY KEY (id);
alter table only "public"."store_order_items" add constraint "store_order_items_quantity_check" CHECK (quantity > 0);
alter table only "public"."store_order_items" add constraint "store_order_items_total_price_check" CHECK (total_price >= 0::numeric);
alter table only "public"."store_order_items" add constraint "store_order_items_unit_price_check" CHECK (unit_price >= 0::numeric);
alter table only "public"."store_order_items" add constraint "store_order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES store_orders(id) ON DELETE CASCADE;
alter table only "public"."store_order_items" add constraint "store_order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE SET NULL;
alter table only "public"."store_orders" add constraint "store_orders_pkey" PRIMARY KEY (id);
alter table only "public"."store_orders" add constraint "store_orders_order_status_check" CHECK (order_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'preparing'::text, 'available_for_pickup'::text, 'picked_up'::text, 'cancelled'::text]));
alter table only "public"."store_orders" add constraint "store_orders_payment_status_check" CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text]));
alter table only "public"."store_orders" add constraint "store_orders_total_amount_check" CHECK (total_amount >= 0::numeric);
alter table only "public"."store_orders" add constraint "store_orders_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT;
alter table only "public"."store_orders" add constraint "store_orders_pack_id_fkey" FOREIGN KEY (pack_id) REFERENCES store_packs(id) ON DELETE RESTRICT;
alter table only "public"."store_orders" add constraint "store_orders_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE RESTRICT;
alter table only "public"."store_orders" add constraint "store_orders_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."store_orders" add constraint "store_orders_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;
alter table only "public"."store_pack_items" add constraint "store_pack_items_pkey" PRIMARY KEY (id);
alter table only "public"."store_pack_items" add constraint "store_pack_items_quantity_check" CHECK (quantity > 0);
alter table only "public"."store_pack_items" add constraint "store_pack_items_unit_price_check" CHECK (unit_price >= 0::numeric);
alter table only "public"."store_pack_items" add constraint "store_pack_items_pack_id_fkey" FOREIGN KEY (pack_id) REFERENCES store_packs(id) ON DELETE CASCADE;
alter table only "public"."store_pack_items" add constraint "store_pack_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE SET NULL;
alter table only "public"."store_packs" add constraint "store_packs_pkey" PRIMARY KEY (id);
alter table only "public"."store_packs" add constraint "store_packs_price_check" CHECK (price >= 0::numeric);
alter table only "public"."store_packs" add constraint "store_packs_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'published'::text]));
alter table only "public"."store_packs" add constraint "store_packs_type_check" CHECK (type = ANY (ARRAY['essential'::text, 'recommended'::text, 'premium'::text]));
alter table only "public"."store_packs" add constraint "store_packs_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
alter table only "public"."store_packs" add constraint "store_packs_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."store_packs" add constraint "store_packs_supply_list_id_fkey" FOREIGN KEY (supply_list_id) REFERENCES supply_lists(id) ON DELETE SET NULL;
alter table only "public"."store_products" add constraint "store_products_pkey" PRIMARY KEY (id);
alter table only "public"."store_products" add constraint "store_products_price_check" CHECK (price >= 0::numeric);
alter table only "public"."store_products" add constraint "store_products_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."student_activation_codes" add constraint "student_activation_codes_pkey" PRIMARY KEY (id);
alter table only "public"."student_activation_codes" add constraint "student_activation_codes_code_hash_key" UNIQUE (code_hash);
alter table only "public"."student_activation_codes" add constraint "student_activation_code_use_check" CHECK (used_at IS NULL OR used_by IS NOT NULL);
alter table only "public"."student_activation_codes" add constraint "student_activation_codes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table only "public"."student_activation_codes" add constraint "student_activation_codes_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."student_activation_codes" add constraint "student_activation_codes_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table only "public"."student_activation_codes" add constraint "student_activation_codes_used_by_fkey" FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table only "public"."student_fees" add constraint "student_fees_pkey" PRIMARY KEY (id);
alter table only "public"."student_fees" add constraint "student_fees_fee_structure_id_fkey" FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id) ON DELETE SET NULL;
alter table only "public"."student_fees" add constraint "student_fees_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."student_fees" add constraint "student_fees_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table only "public"."student_learning_profiles" add constraint "student_learning_profiles_pkey" PRIMARY KEY (id);
alter table only "public"."student_learning_profiles" add constraint "student_learning_profiles_student_id_key" UNIQUE (student_id);
alter table only "public"."student_learning_profiles" add constraint "student_learning_profiles_risk_level_check" CHECK (risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]));
alter table only "public"."student_learning_profiles" add constraint "student_learning_profiles_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."student_learning_profiles" add constraint "student_learning_profiles_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table only "public"."student_parents" add constraint "student_parents_pkey" PRIMARY KEY (student_id, parent_id);
alter table only "public"."student_parents" add constraint "student_parents_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE;
alter table only "public"."student_parents" add constraint "student_parents_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table only "public"."student_payments" add constraint "student_payments_pkey" PRIMARY KEY (id);
alter table only "public"."student_payments" add constraint "student_payments_provider_check" CHECK (provider = ANY (ARRAY['Wave'::text, 'Orange Money'::text, 'MTN Money'::text]));
alter table only "public"."student_payments" add constraint "student_payments_status_check" CHECK (status = ANY (ARRAY['paid'::text, 'pending'::text, 'failed'::text]));
alter table only "public"."student_payments" add constraint "student_payments_type_check" CHECK (type = ANY (ARRAY['inscription'::text, 'scolarite'::text]));
alter table only "public"."student_payments" add constraint "student_payments_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."student_payments" add constraint "student_payments_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table only "public"."student_profiles" add constraint "student_profiles_pkey" PRIMARY KEY (id);
alter table only "public"."student_profiles" add constraint "student_profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only "public"."student_prospects" add constraint "student_prospects_pkey" PRIMARY KEY (user_id);
alter table only "public"."student_prospects" add constraint "student_prospects_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only "public"."student_term_summaries" add constraint "student_term_summaries_pkey" PRIMARY KEY (id);
alter table only "public"."student_term_summaries" add constraint "student_term_summaries_student_id_term_id_key" UNIQUE (student_id, term_id);
alter table only "public"."student_term_summaries" add constraint "student_term_summaries_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
alter table only "public"."student_term_summaries" add constraint "student_term_summaries_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."student_term_summaries" add constraint "student_term_summaries_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table only "public"."student_term_summaries" add constraint "student_term_summaries_term_id_fkey" FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE;
alter table only "public"."students" add constraint "students_pkey" PRIMARY KEY (id);
alter table only "public"."students" add constraint "students_user_id_key" UNIQUE (user_id);
alter table only "public"."students" add constraint "students_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT;
alter table only "public"."students" add constraint "students_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."students" add constraint "students_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
alter table only "public"."subjects" add constraint "subjects_pkey" PRIMARY KEY (id);
alter table only "public"."subjects" add constraint "subjects_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."supply_list_items" add constraint "supply_list_items_pkey" PRIMARY KEY (id);
alter table only "public"."supply_list_items" add constraint "supply_list_items_quantity_check" CHECK (quantity > 0);
alter table only "public"."supply_list_items" add constraint "supply_list_items_recommended_product_id_fkey" FOREIGN KEY (recommended_product_id) REFERENCES store_products(id) ON DELETE SET NULL;
alter table only "public"."supply_list_items" add constraint "supply_list_items_supply_list_id_fkey" FOREIGN KEY (supply_list_id) REFERENCES supply_lists(id) ON DELETE CASCADE;
alter table only "public"."supply_lists" add constraint "supply_lists_pkey" PRIMARY KEY (id);
alter table only "public"."supply_lists" add constraint "supply_lists_school_id_class_id_academic_year_title_key" UNIQUE (school_id, class_id, academic_year, title);
alter table only "public"."supply_lists" add constraint "supply_lists_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'pending_validation'::text, 'published'::text]));
alter table only "public"."supply_lists" add constraint "supply_lists_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
alter table only "public"."supply_lists" add constraint "supply_lists_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."teacher_memos" add constraint "teacher_memos_pkey" PRIMARY KEY (id);
alter table only "public"."teacher_memos" add constraint "teacher_memos_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."teacher_memos" add constraint "teacher_memos_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
alter table only "public"."teacher_subject_classes" add constraint "teacher_subject_classes_pkey" PRIMARY KEY (id);
alter table only "public"."teacher_subject_classes" add constraint "teacher_subject_classes_teacher_id_class_id_subject_id_key" UNIQUE (teacher_id, class_id, subject_id);
alter table only "public"."teacher_subject_classes" add constraint "teacher_subject_classes_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
alter table only "public"."teacher_subject_classes" add constraint "teacher_subject_classes_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
alter table only "public"."teacher_subject_classes" add constraint "teacher_subject_classes_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
alter table only "public"."teacher_todos" add constraint "teacher_todos_pkey" PRIMARY KEY (id);
alter table only "public"."teacher_todos" add constraint "teacher_todos_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."teacher_todos" add constraint "teacher_todos_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
alter table only "public"."teachers" add constraint "teachers_pkey" PRIMARY KEY (id);
alter table only "public"."teachers" add constraint "teachers_user_id_key" UNIQUE (user_id);
alter table only "public"."teachers" add constraint "teachers_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."teachers" add constraint "teachers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table only "public"."terms" add constraint "terms_pkey" PRIMARY KEY (id);
alter table only "public"."terms" add constraint "terms_date_range_check" CHECK (start_date <= end_date);
alter table only "public"."terms" add constraint "terms_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."timetable_events" add constraint "timetable_events_pkey" PRIMARY KEY (id);
alter table only "public"."timetable_events" add constraint "timetable_events_status_check" CHECK (status = ANY (ARRAY['scheduled'::text, 'moved'::text, 'cancelled'::text]));
alter table only "public"."timetable_events" add constraint "timetable_events_time_check" CHECK (starts_at < ends_at);
alter table only "public"."timetable_events" add constraint "timetable_events_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL;
alter table only "public"."timetable_events" add constraint "timetable_events_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
alter table only "public"."timetable_events" add constraint "timetable_events_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."timetable_events" add constraint "timetable_events_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
alter table only "public"."timetable_events" add constraint "timetable_events_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
alter table only "public"."users" add constraint "users_pkey" PRIMARY KEY (id);
alter table only "public"."users" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only "public"."users" add constraint "users_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;
alter table only "public"."whatsapp_messages" add constraint "whatsapp_messages_pkey" PRIMARY KEY (id);
alter table only "public"."whatsapp_messages" add constraint "whatsapp_messages_message_type_check" CHECK (message_type = ANY (ARRAY['grade_notification'::text, 'absence_alert'::text, 'payment_reminder'::text, 'admin_info'::text, 'ai_summary'::text]));
alter table only "public"."whatsapp_messages" add constraint "whatsapp_messages_status_check" CHECK (status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text]));
alter table only "public"."whatsapp_messages" add constraint "whatsapp_messages_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
alter table only "public"."whatsapp_messages" add constraint "whatsapp_messages_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_academic_metrics_student ON public.academic_metrics USING btree (student_id, computed_at DESC);
CREATE INDEX idx_academic_years_school ON public.academic_years USING btree (school_id);
CREATE INDEX idx_ai_insights_school ON public.ai_insights USING btree (school_id);
CREATE INDEX idx_ai_insights_student ON public.ai_insights USING btree (student_id);
CREATE INDEX idx_attendance_records_student ON public.attendance USING btree (student_id);
CREATE INDEX idx_attendance_student_date ON public.attendance USING btree (student_id, date);
CREATE INDEX idx_auth_flow_attempts_ip ON public.auth_flow_attempts USING btree (ip_hash, action, created_at DESC) WHERE (ip_hash IS NOT NULL);
CREATE INDEX idx_auth_flow_attempts_phone ON public.auth_flow_attempts USING btree (phone_hash, action, created_at DESC);
CREATE INDEX idx_auth_flow_authorizations_expiry ON public.auth_flow_authorizations USING btree (expires_at);
CREATE INDEX idx_auth_flow_authorizations_phone ON public.auth_flow_authorizations USING btree (phone_hash, purpose, created_at DESC);
CREATE INDEX idx_auth_verification_expiry ON public.auth_verification_challenges USING btree (expires_at);
CREATE INDEX idx_auth_verification_identifier_created ON public.auth_verification_challenges USING btree (identifier_hash, created_at DESC);
CREATE INDEX idx_auth_verification_ip_created ON public.auth_verification_challenges USING btree (requested_ip_hash, created_at DESC) WHERE (requested_ip_hash IS NOT NULL);
CREATE INDEX idx_auth_verification_phone_created ON public.auth_verification_challenges USING btree (phone_hash, created_at DESC);
CREATE INDEX idx_conversation_participants_conversation ON public.conversation_participants USING btree (conversation_id);
CREATE UNIQUE INDEX uq_conversation_participants_class ON public.conversation_participants USING btree (conversation_id, class_id) WHERE (class_id IS NOT NULL);
CREATE UNIQUE INDEX uq_conversation_participants_user ON public.conversation_participants USING btree (conversation_id, user_id) WHERE (user_id IS NOT NULL);
CREATE INDEX idx_conversations_class ON public.conversations USING btree (class_id);
CREATE INDEX idx_conversations_last_message ON public.conversations USING btree (last_message_at DESC);
CREATE INDEX idx_conversations_school_demo ON public.conversations USING btree (school_id, is_demo);
CREATE INDEX idx_conversations_student ON public.conversations USING btree (student_id);
CREATE INDEX idx_evaluations_class ON public.evaluations USING btree (class_id);
CREATE INDEX idx_fee_installments_school ON public.fee_installments USING btree (school_id);
CREATE INDEX idx_fee_installments_structure ON public.fee_installments USING btree (fee_structure_id);
CREATE INDEX idx_fee_structures_school ON public.fee_structures USING btree (school_id);
CREATE INDEX idx_grades_evaluation ON public.grades USING btree (evaluation_id);
CREATE INDEX idx_grades_student ON public.grades USING btree (student_id);
CREATE INDEX idx_lesson_logs_class ON public.lesson_logs USING btree (class_id);
CREATE INDEX idx_lesson_logs_date ON public.lesson_logs USING btree (lesson_date);
CREATE INDEX idx_lesson_logs_school ON public.lesson_logs USING btree (school_id);
CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id);
CREATE INDEX idx_messages_conversation_created ON public.messages USING btree (conversation_id, created_at);
CREATE INDEX idx_notifications_status ON public.notifications USING btree (status);
CREATE INDEX idx_parents_email ON public.parents USING btree (email);
CREATE INDEX idx_parents_user_id ON public.parents USING btree (user_id);
CREATE INDEX idx_payments_school ON public.payments USING btree (school_id);
CREATE INDEX idx_payments_student ON public.payments USING btree (student_id);
CREATE UNIQUE INDEX uq_payments_receipt_no ON public.payments USING btree (receipt_no) WHERE (receipt_no IS NOT NULL);
CREATE INDEX idx_schools_current_term_id ON public.schools USING btree (current_term_id);
CREATE INDEX idx_schools_is_demo ON public.schools USING btree (is_demo);
CREATE UNIQUE INDEX uq_schools_demo_slug ON public.schools USING btree (demo_slug) WHERE (demo_slug IS NOT NULL);
CREATE INDEX idx_store_order_items_order ON public.store_order_items USING btree (order_id);
CREATE UNIQUE INDEX idx_store_orders_invoice_no ON public.store_orders USING btree (invoice_no) WHERE (invoice_no IS NOT NULL);
CREATE INDEX idx_store_orders_parent ON public.store_orders USING btree (parent_id);
CREATE INDEX idx_store_orders_school_status ON public.store_orders USING btree (school_id, order_status);
CREATE INDEX idx_store_orders_student ON public.store_orders USING btree (student_id);
CREATE INDEX idx_store_pack_items_pack ON public.store_pack_items USING btree (pack_id);
CREATE INDEX idx_store_packs_school_class_status ON public.store_packs USING btree (school_id, class_id, status);
CREATE INDEX idx_store_products_school_active ON public.store_products USING btree (school_id, is_active);
CREATE INDEX idx_student_activation_codes_school ON public.student_activation_codes USING btree (school_id, created_at DESC);
CREATE UNIQUE INDEX uq_student_activation_code_available ON public.student_activation_codes USING btree (student_id) WHERE ((used_at IS NULL) AND (revoked_at IS NULL));
CREATE INDEX idx_student_fees_school ON public.student_fees USING btree (school_id);
CREATE INDEX idx_student_fees_student ON public.student_fees USING btree (student_id);
CREATE INDEX idx_student_learning_profiles_school ON public.student_learning_profiles USING btree (school_id);
CREATE INDEX idx_student_payments_school ON public.student_payments USING btree (school_id);
CREATE INDEX idx_student_payments_student ON public.student_payments USING btree (student_id);
CREATE INDEX idx_students_school_class ON public.students USING btree (school_id, class_id);
CREATE INDEX idx_supply_list_items_list ON public.supply_list_items USING btree (supply_list_id);
CREATE INDEX idx_supply_lists_school_class ON public.supply_lists USING btree (school_id, class_id);
CREATE INDEX idx_timetable_events_class_starts ON public.timetable_events USING btree (school_id, class_id, starts_at);
CREATE INDEX idx_timetable_events_starts_at ON public.timetable_events USING btree (starts_at);
CREATE INDEX idx_timetable_events_teacher_starts ON public.timetable_events USING btree (school_id, teacher_id, starts_at);
CREATE INDEX idx_users_school_role ON public.users USING btree (school_id, role);
CREATE UNIQUE INDEX uq_users_email ON public.users USING btree (email) WHERE (email IS NOT NULL);
CREATE INDEX idx_whatsapp_messages_school ON public.whatsapp_messages USING btree (school_id);

-- Views

-- Functions and RPC
CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS app_role
 LANGUAGE sql
 STABLE
AS $function$
  select role from public.users where id = auth.uid();
$function$

CREATE OR REPLACE FUNCTION public.current_user_school_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select school_id from public.users where id = auth.uid();
$function$

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  meta jsonb;
  role_text text;
  role_enum public.app_role;
  school_uuid uuid;
  full_name_text text;
  phone_text text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  role_text := nullif(trim(meta->>'role'), '');
  begin
    role_enum := coalesce(role_text::public.app_role, 'PARENT'::public.app_role);
  exception when others then
    role_enum := 'PARENT'::public.app_role;
  end;

  begin
    school_uuid := nullif(meta->>'school_id','')::uuid;
  exception when others then
    school_uuid := null;
  end;

  full_name_text := nullif(trim(meta->>'full_name'), '');
  if full_name_text is null then
    full_name_text := coalesce(nullif(trim(new.email), ''), 'Utilisateur');
  end if;

  phone_text := nullif(trim(meta->>'phone'), '');

  insert into public.users (id, email, school_id, role, full_name, phone)
  values (new.id, new.email, school_uuid, role_enum, full_name_text, phone_text)
  on conflict (id) do update set
    email = excluded.email,
    school_id = excluded.school_id,
    role = excluded.role,
    full_name = excluded.full_name,
    phone = excluded.phone;

  -- Convenience: create the domain row when relevant.
  if role_enum = 'TEACHER'::public.app_role and school_uuid is not null then
    insert into public.teachers (school_id, user_id)
    values (school_uuid, new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$function$

CREATE OR REPLACE FUNCTION public.mobile_can_access_conversation(target_conversation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.conversations c
    where c.id = target_conversation_id
      and c.school_id = public.mobile_current_user_school_id()
      and (
        public.mobile_is_school_staff()
        or exists (
          select 1 from public.conversation_participants cp
          where cp.conversation_id = c.id
            and cp.participant_type = 'USER'
            and cp.user_id = auth.uid()
        )
        or exists (
          select 1
          from public.conversation_participants cp
          join public.students s on s.class_id = cp.class_id
          where cp.conversation_id = c.id
            and cp.participant_type = 'CLASS'
            and s.user_id = auth.uid()
        )
      )
  );
$function$

CREATE OR REPLACE FUNCTION public.mobile_current_user_role()
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select role from public.users where id = auth.uid();
$function$

CREATE OR REPLACE FUNCTION public.mobile_current_user_school_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select school_id from public.users where id = auth.uid();
$function$

CREATE OR REPLACE FUNCTION public.mobile_is_school_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(public.mobile_current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN'), false);
$function$

CREATE OR REPLACE FUNCTION public.mobile_is_school_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(public.mobile_current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'COMPTABLE', 'TEACHER'), false);
$function$

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$

CREATE OR REPLACE FUNCTION public.set_elima_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$

CREATE OR REPLACE FUNCTION public.set_store_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$

CREATE OR REPLACE FUNCTION public.touch_conversation_last_message()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  update public.conversations
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$function$

CREATE OR REPLACE FUNCTION public.user_can_access_class(target_class uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.students s
    where s.class_id = target_class
      and (
        s.user_id = auth.uid()
        or exists (
          select 1
          from public.student_parents sp
          join public.parents p on p.id = sp.parent_id
          where sp.student_id = s.id and p.user_id = auth.uid()
        )
      )
  );
$function$

CREATE OR REPLACE FUNCTION public.user_can_access_student(target_student uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.students s
    where s.id = target_student
      and (
        s.user_id = auth.uid()
        or exists (
          select 1
          from public.student_parents sp
          join public.parents p on p.id = sp.parent_id
          where sp.student_id = s.id and p.user_id = auth.uid()
        )
      )
  );
$function$


-- Triggers
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION set_elima_updated_at();
CREATE TRIGGER trg_messages_touch_conversation AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION touch_conversation_last_message();
CREATE TRIGGER trg_store_orders_updated_at BEFORE UPDATE ON store_orders FOR EACH ROW EXECUTE FUNCTION set_store_updated_at();
CREATE TRIGGER trg_store_packs_updated_at BEFORE UPDATE ON store_packs FOR EACH ROW EXECUTE FUNCTION set_store_updated_at();
CREATE TRIGGER trg_store_products_updated_at BEFORE UPDATE ON store_products FOR EACH ROW EXECUTE FUNCTION set_store_updated_at();
CREATE TRIGGER trg_supply_list_items_updated_at BEFORE UPDATE ON supply_list_items FOR EACH ROW EXECUTE FUNCTION set_store_updated_at();
CREATE TRIGGER trg_supply_lists_updated_at BEFORE UPDATE ON supply_lists FOR EACH ROW EXECUTE FUNCTION set_store_updated_at();

-- Row-level security
alter table "public"."academic_metrics" enable row level security;
alter table "public"."academic_years" enable row level security;
alter table "public"."ai_insights" enable row level security;
alter table "public"."attendance" enable row level security;
alter table "public"."audit_logs" enable row level security;
alter table "public"."auth_flow_attempts" enable row level security;
alter table "public"."auth_flow_authorizations" enable row level security;
alter table "public"."auth_verification_challenges" enable row level security;
alter table "public"."cached_quiz_sets" enable row level security;
alter table "public"."class_teachers" enable row level security;
alter table "public"."classes" enable row level security;
alter table "public"."conversation_participants" enable row level security;
alter table "public"."conversations" enable row level security;
alter table "public"."courses" enable row level security;
alter table "public"."demo_requests" enable row level security;
alter table "public"."evaluations" enable row level security;
alter table "public"."fee_installments" enable row level security;
alter table "public"."fee_structures" enable row level security;
alter table "public"."grades" enable row level security;
alter table "public"."homeworks" enable row level security;
alter table "public"."lesson_logs" enable row level security;
alter table "public"."level_subjects" enable row level security;
alter table "public"."messages" enable row level security;
alter table "public"."notifications" enable row level security;
alter table "public"."parents" enable row level security;
alter table "public"."payments" enable row level security;
alter table "public"."quiz_results" enable row level security;
alter table "public"."quizzes" enable row level security;
alter table "public"."reports" enable row level security;
alter table "public"."scanned_exams" enable row level security;
alter table "public"."schools" enable row level security;
alter table "public"."store_order_items" enable row level security;
alter table "public"."store_orders" enable row level security;
alter table "public"."store_pack_items" enable row level security;
alter table "public"."store_packs" enable row level security;
alter table "public"."store_products" enable row level security;
alter table "public"."student_activation_codes" enable row level security;
alter table "public"."student_fees" enable row level security;
alter table "public"."student_learning_profiles" enable row level security;
alter table "public"."student_parents" enable row level security;
alter table "public"."student_payments" enable row level security;
alter table "public"."student_profiles" enable row level security;
alter table "public"."student_prospects" enable row level security;
alter table "public"."student_term_summaries" enable row level security;
alter table "public"."students" enable row level security;
alter table "public"."subjects" enable row level security;
alter table "public"."supply_list_items" enable row level security;
alter table "public"."supply_lists" enable row level security;
alter table "public"."teacher_memos" enable row level security;
alter table "public"."teacher_subject_classes" enable row level security;
alter table "public"."teacher_todos" enable row level security;
alter table "public"."teachers" enable row level security;
alter table "public"."terms" enable row level security;
alter table "public"."timetable_events" enable row level security;
alter table "public"."users" enable row level security;
alter table "public"."whatsapp_messages" enable row level security;
create policy "Parents can read linked attendance" on "public"."attendance"
  as permissive
  for select
  to "authenticated"
  using (user_can_access_student(student_id));
create policy "Staff read school attendance" on "public"."attendance"
  as permissive
  for select
  to "authenticated"
  using ((mobile_is_school_staff() AND (school_id = mobile_current_user_school_id())));
create policy "Teachers record school attendance" on "public"."attendance"
  as permissive
  for insert
  to "authenticated"
  with check (((mobile_current_user_role() = 'TEACHER'::app_role) AND (school_id = mobile_current_user_school_id()) AND (recorded_by = auth.uid())));
create policy "cached_quiz_sets_insert" on "public"."cached_quiz_sets"
  as permissive
  for insert
  to "public"
  with check (true);
create policy "cached_quiz_sets_read" on "public"."cached_quiz_sets"
  as permissive
  for select
  to "public"
  using (true);
create policy "cached_quiz_sets_update_play" on "public"."cached_quiz_sets"
  as permissive
  for update
  to "public"
  using (true)
  with check (true);
create policy "Staff read class assignments" on "public"."class_teachers"
  as permissive
  for select
  to "authenticated"
  using ((mobile_is_school_staff() AND (EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = class_teachers.class_id) AND (c.school_id = mobile_current_user_school_id()))))));
create policy "Parents can read linked classes" on "public"."classes"
  as permissive
  for select
  to "authenticated"
  using (user_can_access_class(id));
create policy "Staff read school classes" on "public"."classes"
  as permissive
  for select
  to "authenticated"
  using ((mobile_is_school_staff() AND (school_id = mobile_current_user_school_id())));
create policy "Members read own conversation memberships" on "public"."conversation_participants"
  as permissive
  for select
  to "authenticated"
  using (mobile_can_access_conversation(conversation_id));
create policy "Members read school conversations" on "public"."conversations"
  as permissive
  for select
  to "authenticated"
  using (mobile_can_access_conversation(id));
create policy "Parents can read linked evaluations" on "public"."evaluations"
  as permissive
  for select
  to "authenticated"
  using (user_can_access_class(class_id));
create policy "Staff read school evaluations" on "public"."evaluations"
  as permissive
  for select
  to "authenticated"
  using ((mobile_is_school_staff() AND (school_id = mobile_current_user_school_id())));
create policy "Finance roles read school installments" on "public"."fee_installments"
  as permissive
  for select
  to "authenticated"
  using (((mobile_current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role, 'COMPTABLE'::app_role])) AND (school_id = mobile_current_user_school_id())));
create policy "Parents can read linked grades" on "public"."grades"
  as permissive
  for select
  to "authenticated"
  using (user_can_access_student(student_id));
create policy "Staff read school grades" on "public"."grades"
  as permissive
  for select
  to "authenticated"
  using ((mobile_is_school_staff() AND (school_id = mobile_current_user_school_id())));
create policy "Family can read linked homeworks" on "public"."homeworks"
  as permissive
  for select
  to "authenticated"
  using (user_can_access_class(class_id));
create policy "Staff read school homework" on "public"."homeworks"
  as permissive
  for select
  to "authenticated"
  using ((mobile_is_school_staff() AND (school_id = mobile_current_user_school_id())));
create policy "Teachers create school homework" on "public"."homeworks"
  as permissive
  for insert
  to "authenticated"
  with check (((mobile_current_user_role() = 'TEACHER'::app_role) AND (school_id = mobile_current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM teachers t
  WHERE ((t.id = homeworks.teacher_id) AND (t.user_id = auth.uid()))))));
create policy "Family can read linked lesson_logs" on "public"."lesson_logs"
  as permissive
  for select
  to "authenticated"
  using (user_can_access_class(class_id));
create policy "Members read accessible messages" on "public"."messages"
  as permissive
  for select
  to "authenticated"
  using (mobile_can_access_conversation(conversation_id));
create policy "Parents can read own row" on "public"."parents"
  as permissive
  for select
  to "authenticated"
  using ((user_id = auth.uid()));
create policy "Staff read school parents" on "public"."parents"
  as permissive
  for select
  to "authenticated"
  using ((mobile_is_school_staff() AND (school_id = mobile_current_user_school_id())));
create policy "Family can read linked payments" on "public"."payments"
  as permissive
  for select
  to "authenticated"
  using (user_can_access_student(student_id));
create policy "Finance roles read school payments" on "public"."payments"
  as permissive
  for select
  to "authenticated"
  using (((mobile_current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role, 'COMPTABLE'::app_role])) AND (school_id = mobile_current_user_school_id())));
create policy "Parents can read linked reports" on "public"."reports"
  as permissive
  for select
  to "authenticated"
  using (user_can_access_student(student_id));
create policy "Members read own school" on "public"."schools"
  as permissive
  for select
  to "authenticated"
  using ((id = mobile_current_user_school_id()));
create policy "Parents read own store order items" on "public"."store_order_items"
  as permissive
  for select
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM store_orders so
  WHERE ((so.id = store_order_items.order_id) AND user_can_access_student(so.student_id) AND (EXISTS ( SELECT 1
           FROM parents p
          WHERE ((p.id = so.parent_id) AND (p.user_id = auth.uid()))))))));
create policy "Store admins manage order items" on "public"."store_order_items"
  as permissive
  for all
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM store_orders so
  WHERE ((so.id = store_order_items.order_id) AND (so.school_id = current_user_school_id()) AND (current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role]))))))
  with check ((EXISTS ( SELECT 1
   FROM store_orders so
  WHERE ((so.id = store_order_items.order_id) AND (so.school_id = current_user_school_id()) AND (current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role]))))));
create policy "Parents create own store orders" on "public"."store_orders"
  as permissive
  for insert
  to "authenticated"
  with check ((user_can_access_student(student_id) AND (EXISTS ( SELECT 1
   FROM parents p
  WHERE ((p.id = store_orders.parent_id) AND (p.user_id = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM store_packs sp
  WHERE ((sp.id = store_orders.pack_id) AND (sp.status = 'published'::text) AND (sp.school_id = store_orders.school_id) AND (sp.class_id = store_orders.class_id)))) AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = store_orders.student_id) AND (s.school_id = store_orders.school_id) AND (s.class_id = store_orders.class_id))))));
create policy "Parents read own store orders" on "public"."store_orders"
  as permissive
  for select
  to "authenticated"
  using ((user_can_access_student(student_id) AND (EXISTS ( SELECT 1
   FROM parents p
  WHERE ((p.id = store_orders.parent_id) AND (p.user_id = auth.uid()))))));
create policy "Store admins manage orders" on "public"."store_orders"
  as permissive
  for all
  to "authenticated"
  using (((school_id = current_user_school_id()) AND (current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role]))))
  with check (((school_id = current_user_school_id()) AND (current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role]))));
create policy "Parents read published pack items" on "public"."store_pack_items"
  as permissive
  for select
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM store_packs sp
  WHERE ((sp.id = store_pack_items.pack_id) AND (sp.status = 'published'::text) AND user_can_access_class(sp.class_id)))));
create policy "Store admins manage pack items" on "public"."store_pack_items"
  as permissive
  for all
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM store_packs sp
  WHERE ((sp.id = store_pack_items.pack_id) AND (sp.school_id = current_user_school_id()) AND (current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role]))))))
  with check ((EXISTS ( SELECT 1
   FROM store_packs sp
  WHERE ((sp.id = store_pack_items.pack_id) AND (sp.school_id = current_user_school_id()) AND (current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role]))))));
create policy "Parents read published class packs" on "public"."store_packs"
  as permissive
  for select
  to "authenticated"
  using (((status = 'published'::text) AND user_can_access_class(class_id)));
create policy "Store admins manage packs" on "public"."store_packs"
  as permissive
  for all
  to "authenticated"
  using (((school_id = current_user_school_id()) AND (current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role]))))
  with check (((school_id = current_user_school_id()) AND (current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role]))));
create policy "Parents read active store products" on "public"."store_products"
  as permissive
  for select
  to "authenticated"
  using (((is_active = true) AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.school_id = store_products.school_id) AND user_can_access_student(s.id))))));
create policy "Store admins manage products" on "public"."store_products"
  as permissive
  for all
  to "authenticated"
  using (((school_id = current_user_school_id()) AND (current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role]))))
  with check (((school_id = current_user_school_id()) AND (current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role]))));
create policy "Family can read linked student_fees" on "public"."student_fees"
  as permissive
  for select
  to "authenticated"
  using (user_can_access_student(student_id));
create policy "Finance roles read school fees" on "public"."student_fees"
  as permissive
  for select
  to "authenticated"
  using (((mobile_current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role, 'COMPTABLE'::app_role])) AND (school_id = mobile_current_user_school_id())));
create policy "Parents can read their links" on "public"."student_parents"
  as permissive
  for select
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM parents p
  WHERE ((p.id = student_parents.parent_id) AND (p.user_id = auth.uid())))));
create policy "Staff read school family links" on "public"."student_parents"
  as permissive
  for select
  to "authenticated"
  using ((mobile_is_school_staff() AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = student_parents.student_id) AND (s.school_id = mobile_current_user_school_id()))))));
create policy "student_profiles_insert_own" on "public"."student_profiles"
  as permissive
  for insert
  to "public"
  with check ((auth.uid() = id));
create policy "student_profiles_select_own" on "public"."student_profiles"
  as permissive
  for select
  to "public"
  using ((auth.uid() = id));
create policy "student_profiles_update_own" on "public"."student_profiles"
  as permissive
  for update
  to "public"
  using ((auth.uid() = id))
  with check ((auth.uid() = id));
create policy "student_prospects_read_own" on "public"."student_prospects"
  as permissive
  for select
  to "authenticated"
  using ((user_id = auth.uid()));
create policy "student_prospects_update_own" on "public"."student_prospects"
  as permissive
  for update
  to "authenticated"
  using ((user_id = auth.uid()))
  with check ((user_id = auth.uid()));
create policy "Parents can read linked students" on "public"."students"
  as permissive
  for select
  to "authenticated"
  using (user_can_access_student(id));
create policy "Staff read school students" on "public"."students"
  as permissive
  for select
  to "authenticated"
  using ((mobile_is_school_staff() AND (school_id = mobile_current_user_school_id())));
create policy "Members can read school subjects" on "public"."subjects"
  as permissive
  for select
  to "authenticated"
  using ((school_id = current_user_school_id()));
create policy "Staff read school subjects" on "public"."subjects"
  as permissive
  for select
  to "authenticated"
  using ((mobile_is_school_staff() AND (school_id = mobile_current_user_school_id())));
create policy "Store admins manage supply list items" on "public"."supply_list_items"
  as permissive
  for all
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM supply_lists sl
  WHERE ((sl.id = supply_list_items.supply_list_id) AND (sl.school_id = current_user_school_id()) AND (current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role]))))))
  with check ((EXISTS ( SELECT 1
   FROM supply_lists sl
  WHERE ((sl.id = supply_list_items.supply_list_id) AND (sl.school_id = current_user_school_id()) AND (current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role]))))));
create policy "Store admins manage supply lists" on "public"."supply_lists"
  as permissive
  for all
  to "authenticated"
  using (((school_id = current_user_school_id()) AND (current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role]))))
  with check (((school_id = current_user_school_id()) AND (current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role]))));
create policy "Staff read teacher subject classes" on "public"."teacher_subject_classes"
  as permissive
  for select
  to "authenticated"
  using ((mobile_is_school_staff() AND (EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = teacher_subject_classes.class_id) AND (c.school_id = mobile_current_user_school_id()))))));
create policy "Staff read school teachers" on "public"."teachers"
  as permissive
  for select
  to "authenticated"
  using ((mobile_is_school_staff() AND (school_id = mobile_current_user_school_id())));
create policy "Members can read school terms" on "public"."terms"
  as permissive
  for select
  to "authenticated"
  using ((school_id = current_user_school_id()));
create policy "Family can read linked timetable" on "public"."timetable_events"
  as permissive
  for select
  to "authenticated"
  using (user_can_access_class(class_id));
create policy "Mobile members read relevant timetable" on "public"."timetable_events"
  as permissive
  for select
  to "authenticated"
  using (((school_id = mobile_current_user_school_id()) AND ((mobile_current_user_role() = ANY (ARRAY['SUPER_ADMIN'::app_role, 'SCHOOL_ADMIN'::app_role, 'COMPTABLE'::app_role])) OR ((mobile_current_user_role() = 'TEACHER'::app_role) AND (EXISTS ( SELECT 1
   FROM teachers t
  WHERE ((t.id = timetable_events.teacher_id) AND (t.user_id = auth.uid()))))) OR ((mobile_current_user_role() = 'STUDENT'::app_role) AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.class_id = timetable_events.class_id) AND (s.user_id = auth.uid()))))) OR ((mobile_current_user_role() = 'PARENT'::app_role) AND (EXISTS ( SELECT 1
   FROM ((parents p
     JOIN student_parents sp ON ((sp.parent_id = p.id)))
     JOIN students s ON ((s.id = sp.student_id)))
  WHERE ((p.user_id = auth.uid()) AND (s.class_id = timetable_events.class_id))))))));
create policy "Staff read school users" on "public"."users"
  as permissive
  for select
  to "authenticated"
  using ((mobile_is_school_staff() AND (school_id = mobile_current_user_school_id())));
create policy "Users can read own profile" on "public"."users"
  as permissive
  for select
  to "authenticated"
  using ((id = auth.uid()));

-- Storage buckets (configuration only; objects are intentionally excluded)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('documents', 'documents', true, null, null) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('elima-files', 'elima-files', true, null, null) on conflict (id) do nothing;

