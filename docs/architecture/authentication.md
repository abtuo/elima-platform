# Authentification commune

Par environnement, le web et le mobile utilisent le même projet Supabase :

```text
auth.users → public.users → school_memberships → schools
                         └→ students / parents / teachers
```

`users.school_id` reste disponible pendant la transition. La relation
`school_memberships` permet plusieurs établissements et rôles sans dupliquer
l'identité Auth.

Les clés publiques sont autorisées côté navigateur. Les clés secrètes et
`service_role` restent exclusivement dans les fonctions serveur, scripts et
variables Vercel chiffrées.

Redirections autorisées à configurer :

- Demo : `https://demo.elima.ci/**`,
  `https://demo.app.elima.ci/**` ;
- Production : `https://elima.ci/**`, `https://app.elima.ci/**` ;
- local : `http://localhost:3000/**`, `http://localhost:5173/**`.

Les listes Demo et Production doivent être séparées. Une callback Demo ne doit
jamais utiliser un domaine Production.

