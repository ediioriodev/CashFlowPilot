-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ambito_spese (
  code character varying NOT NULL,
  name character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  group_id bigint,
  CONSTRAINT ambito_spese_pkey PRIMARY KEY (code),
  CONSTRAINT ambito_spese_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups_account(id)
);
CREATE TABLE public.ambito_spese_personali (
  code character varying NOT NULL,
  name character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT ambito_spese_personali_pkey PRIMARY KEY (code, user_id),
  CONSTRAINT ambito_spese_personali_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.groups_account (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  group_name character varying,
  admin uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT groups_account_pkey PRIMARY KEY (id),
  CONSTRAINT groups_account_admin_fkey FOREIGN KEY (admin) REFERENCES auth.users(id)
);
CREATE TABLE public.invites (
  id bigint NOT NULL DEFAULT nextval('invites_id_seq'::regclass),
  group_id bigint NOT NULL,
  invited_by uuid NOT NULL,
  invite_code text NOT NULL UNIQUE,
  invited_email text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'cancelled'::text])),
  expires_at timestamp with time zone NOT NULL,
  accepted_by uuid,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invites_pkey PRIMARY KEY (id),
  CONSTRAINT invites_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups_account(id),
  CONSTRAINT invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id),
  CONSTRAINT invites_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES auth.users(id)
);
CREATE TABLE public.notification_logs (
  id bigint NOT NULL DEFAULT nextval('notification_logs_id_seq'::regclass),
  user_id uuid,
  notification_type text NOT NULL,
  group_id bigint,
  expense_id bigint,
  push_token text,
  status text,
  error_message text,
  sent_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_logs_pkey PRIMARY KEY (id),
  CONSTRAINT notification_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT notification_logs_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups_account(id)
);
CREATE TABLE public.spese (
  id bigint NOT NULL DEFAULT nextval('spese_id_seq'::regclass),
  user_id uuid NOT NULL,
  importo numeric NOT NULL,
  ambito text NOT NULL,
  negozio text NOT NULL,
  data_spesa date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  note_spese text,
  deleted_at timestamp with time zone,
  tipo_spesa character varying,
  ricorrente boolean DEFAULT false,
  confermata boolean DEFAULT true,
  group_id bigint,
  tipo_transazione text NOT NULL DEFAULT 'spesa'::text CHECK (tipo_transazione = ANY (ARRAY['spesa'::text, 'entrata'::text])),
  recurring_parent_id bigint,
  recurring_config jsonb,
  is_recurring_parent boolean DEFAULT false,
  CONSTRAINT spese_pkey PRIMARY KEY (id),
  CONSTRAINT spese_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT spese_tipo_spesa_fkey FOREIGN KEY (tipo_spesa) REFERENCES public.tipo_spesa(Code),
  CONSTRAINT spese_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups_account(id),
  CONSTRAINT spese_recurring_parent_fkey FOREIGN KEY (recurring_parent_id) REFERENCES public.spese(id)
);
CREATE TABLE public.spese_personali (
  id bigint NOT NULL DEFAULT nextval('spese_personali_id_seq'::regclass),
  user_id uuid NOT NULL,
  importo numeric NOT NULL,
  ambito text NOT NULL,
  negozio text NOT NULL,
  data_spesa date NOT NULL,
  note_spese text,
  tipo_spesa character varying,
  ricorrente boolean DEFAULT false,
  confermata boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  tipo_transazione text NOT NULL DEFAULT 'spesa'::text CHECK (tipo_transazione = ANY (ARRAY['spesa'::text, 'entrata'::text])),
  recurring_parent_id bigint,
  recurring_config jsonb,
  is_recurring_parent boolean DEFAULT false,
  CONSTRAINT spese_personali_pkey PRIMARY KEY (id),
  CONSTRAINT spese_personali_tipo_spesa_fkey FOREIGN KEY (tipo_spesa) REFERENCES public.tipo_spesa(Code),
  CONSTRAINT spese_personali_recurring_parent_fkey FOREIGN KEY (recurring_parent_id) REFERENCES public.spese_personali(id)
);
CREATE TABLE public.tipo_spesa (
  Code character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  Name character varying,
  CONSTRAINT tipo_spesa_pkey PRIMARY KEY (Code)
);
CREATE TABLE public.users_group (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  group_id bigint,
  first_name character varying,
  last_name character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  notification_time time with time zone,
  push_token text,
  notifications_enabled boolean DEFAULT true,
  recurring_notifications_enabled boolean DEFAULT false,
  dark_mode boolean DEFAULT false,
  del_confirm boolean DEFAULT true,
  show_shared_expenses boolean DEFAULT true,
  show_personal_expenses boolean DEFAULT true,
  custom_period_active boolean DEFAULT false,
  custom_period_start_day integer DEFAULT 1,
  CONSTRAINT users_group_pkey PRIMARY KEY (id),
  CONSTRAINT users_group_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT users_group_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups_account(id)
);