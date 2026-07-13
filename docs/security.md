# Sécurité — Elima Mobile

## Principes

1. **Anon key uniquement** côté client — jamais de service role
2. **RLS Supabase** — isolation par `school_id`, rôle, relations parent-enfant
3. **Bearer JWT** — pour appels API `elima.tech` (à adapter côté serveur)
4. **IA/OCR** — uniquement via proxy serveur, jamais de clé Azure dans le bundle

## Auth

- Session Supabase avec refresh token
- Pas de cookies SSR Next.js
- Phone → email `@phone.elima` aligné `elima.tech`

## Fichiers

- Documents sensibles : URLs signées (backlog)
- Bucket `documents` actuellement public côté `elima.tech` — à durcir

## Vérification

```bash
# Aucun secret dans le code source
grep -r "service_role\|AZURE_OPENAI_API_KEY\|TWILIO" src/
```
