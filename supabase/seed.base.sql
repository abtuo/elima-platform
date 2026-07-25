-- Référentiels communs à Demo et Production.
-- Les rôles et statuts sont créés par les migrations ; ce seed ne crée aucun
-- établissement ni compte.

insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', false),
  ('elima-files', 'elima-files', false),
  ('exam-sources', 'exam-sources', false)
on conflict (id) do update set public = excluded.public;
