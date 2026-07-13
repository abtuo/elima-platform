# Variables d'environnement — Elima Mobile

## Variables publiques (client)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_APP_ENV` | Environnement | `development` |
| `VITE_WEB_BASE_URL` | Portail web Elima | `https://www.elima.ci` |
| `VITE_MAIN_SUPABASE_URL` | URL Supabase scolaire | |
| `VITE_MAIN_SUPABASE_ANON_KEY` | Anon key scolaire | |
| `VITE_REVISION_SUPABASE_URL` | URL Supabase révision | |
| `VITE_REVISION_SUPABASE_ANON_KEY` | Anon key révision | |
| `VITE_MAIN_API_BASE_URL` | Backend HTTPS principal : uploads et opérations sécurisées | À renseigner |
| `VITE_REVISION_API_BASE_URL` | Backend HTTPS Révision : IA et OCR | À renseigner |
| `VITE_ENABLE_DEMO_MODE` | Affiche les comptes seed ; sans base principale, active aussi les données locales de secours | `true` |
| `VITE_ENABLE_REVISION` | Module révision | `true` |
| `VITE_ENABLE_STUDENT_SCANNER` | Scanner élève | `true` |
| `VITE_ENABLE_TEACHER_OFFLINE` | Offline prof | `true` |
| `VITE_ENABLE_WHATSAPP_OPTION` | WhatsApp premium | `false` |

## Deux ensembles Supabase indépendants

La base scolaire utilise `VITE_MAIN_SUPABASE_URL`, `VITE_MAIN_SUPABASE_ANON_KEY` et, uniquement sur le backend, `SUPABASE_MAIN_SERVICE_ROLE_KEY`.

La base Révision utilise `VITE_REVISION_SUPABASE_URL`, `VITE_REVISION_SUPABASE_ANON_KEY` et, uniquement sur le backend, `SUPABASE_REVISION_SERVICE_ROLE_KEY`. Les deux ensembles peuvent pointer vers des projets Supabase différents.

## Variables serveur à renseigner

- `SUPABASE_MAIN_SERVICE_ROLE_KEY` : Project Settings → API dans le projet scolaire.
- `SUPABASE_REVISION_SERVICE_ROLE_KEY` : Project Settings → API dans le projet Révision.
- `AZURE_OPENAI_ENDPOINT` : URL de la ressource Azure OpenAI.
- `AZURE_OPENAI_DEPLOYMENT` : nom exact du modèle déployé, pas une URL.
- `AZURE_OPENAI_API_KEY` : clé serveur de la ressource.
- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` et `AZURE_DOCUMENT_INTELLIGENCE_API_KEY` : ressource OCR.
- Twilio, WhatsApp/ACS, Resend, paiement et Blob : uniquement si le backend active ces fournisseurs.

Ces variables ne doivent jamais recevoir le préfixe `VITE_`. Elles sont destinées à une API, une Edge Function ou un serveur sécurisé.
