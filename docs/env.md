# Variables d'environnement — Elima Mobile

Dans le monorepo, les exemples applicatifs sont dans `apps/mobile/.env.example`
et `apps/web/.env.example`. Vite conserve la lecture de l'environnement racine
pour le développement local ; apps/mobile a priorité. Les variables `VITE_*`
sont publiques. Les secrets backend restent côté serveur. Voir [monorepo](monorepo.md).

## Variables publiques (client)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_APP_ENV` | Environnement | `development` |
| `VITE_WEB_BASE_URL` | Portail web Elima | `https://www.elima.ci` |
| `VITE_MAIN_SUPABASE_URL` | URL Supabase commune scolaire + révision | |
| `VITE_MAIN_SUPABASE_ANON_KEY` | Anon key de la base commune | |
| `VITE_MAIN_API_BASE_URL` | Backend HTTPS principal : uploads et opérations sécurisées | À renseigner |
| `VITE_REVISION_API_BASE_URL` | Origine HTTPS du backend Elima, sans `/api`. Vide = same-origin. Tous les endpoints Révision/auth passent par cette base | `https://backend.example.com` |
| `VITE_ENABLE_DEMO_MODE` | En développement sans base principale, autorise les données locales de secours ; les comptes seed en ligne sont affichés selon le domaine | `true` |
| `VITE_ENABLE_REVISION` | Module révision | `true` |
| `VITE_ENABLE_STUDENT_SCANNER` | Scanner élève | `true` |
| `VITE_ENABLE_TEACHER_OFFLINE` | Offline prof | `true` |
| `VITE_ENABLE_WHATSAPP_OPTION` | WhatsApp premium | `false` |

## Projet Supabase commun

Le scolaire et la révision utilisent `VITE_MAIN_SUPABASE_URL` et `VITE_MAIN_SUPABASE_ANON_KEY`. Le backend et les scripts de seed utilisent une seule `SUPABASE_SERVICE_ROLE_KEY`, jamais exposée au client ni versionnée.

## Variables serveur à renseigner

- `REVISION_ALLOWED_ORIGINS` : origines navigateur cross-origin exactes séparées par des virgules, par exemple `https://localhost,https://revision.example.com`. Aucun wildcard ni `Allow-Credentials`. Les appels same-origin restent compatibles. Voir [le contrat réseau Révision](revision-api-network.md).

- `SUPABASE_MAIN_SERVICE_ROLE_KEY` : Project Settings → API dans le projet scolaire.
- `SUPABASE_REVISION_SERVICE_ROLE_KEY` : Project Settings → API dans le projet Révision.
- `AZURE_OPENAI_ENDPOINT` : URL de la ressource Azure OpenAI.
- `AZURE_OPENAI_DEPLOYMENT` : nom exact du modèle déployé, pas une URL.
- `AZURE_OPENAI_API_KEY` : clé serveur de la ressource.
- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` et `AZURE_DOCUMENT_INTELLIGENCE_API_KEY` : ressource OCR.
- Twilio, WhatsApp/ACS, Resend, paiement et Blob : uniquement si le backend active ces fournisseurs.

Ces variables ne doivent jamais recevoir le préfixe `VITE_`. Elles sont destinées à une API, une Edge Function ou un serveur sécurisé.
