-- =============================================================
-- 04 · SCONTRINI
-- Un file per movimento, in Supabase Storage. Sul DB resta solo
-- il percorso: i binari non vanno in tabella.
--
-- Convenzione del percorso: <group_id|user_id>/<spesa_id>.<ext>
-- La prima cartella è ciò su cui si appoggiano le policy.
-- =============================================================

alter table public.spese
  add column if not exists receipt_path text;

alter table public.spese_personali
  add column if not exists receipt_path text;

comment on column public.spese.receipt_path is
  'Percorso nel bucket "receipts". Formato: <group_id>/<spesa_id>.<ext>';

-- ---------- Bucket privato ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- Policy sugli oggetti ----------
-- Prima cartella = group_id del gruppo dell'utente, oppure il suo uuid
-- per le spese personali.
drop policy if exists receipts_select on storage.objects;
create policy receipts_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (
      (storage.foldername(name))[1] = public.current_group_id()::text
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists receipts_insert on storage.objects;
create policy receipts_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (
      (storage.foldername(name))[1] = public.current_group_id()::text
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists receipts_delete on storage.objects;
create policy receipts_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (
      (storage.foldername(name))[1] = public.current_group_id()::text
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );
