# Albassma Filme 2026 · Guide d'installation

Ce guide explique comment mettre en route la billetterie : base de données,
comptes staff, mise en ligne sur Vercel et envoi des billets par Gmail.

## Ordre à suivre

1. Vérifier le projet Supabase (étape 1)
2. Appliquer la sécurité (étape 2), **puis aussitôt** mettre en ligne le site (étape 3)
3. Créer les comptes staff (étape 4)
4. Configurer Gmail avec l'adresse Vercel (étape 5)
5. Remplir les textes de l'événement (étape 6)

---

## 1. Vérifier le projet Supabase

1. Ouvrez https://supabase.com/dashboard et connectez-vous.
2. Vérifiez que le projet existe et qu'il n'est pas en pause.
   - S'il est en pause : cliquez sur **Restore project**.
   - S'il a été supprimé : créez un nouveau projet, puis mettez à jour le fichier `.env`
     avec la nouvelle URL et la clé publique (**Project Settings > API**).
     Sur un nouveau projet, exécutez aussi les anciennes migrations de
     `supabase/migrations/` dans l'ordre, avant celle de l'étape 2.

## 2. Appliquer la sécurité (une seule fois)

1. Dans Supabase, ouvrez **SQL Editor > New query**.
2. Copiez tout le contenu de
   `supabase/migrations/20261122120000_security_lockdown.sql`, puis cliquez sur **Run**.

⚠️ Après cette étape, **l'ancien site ne peut plus enregistrer de billets** :
mettez en ligne le nouveau site juste après (étape 3).

## 3. Mettre le site en ligne sur Vercel

### 3.1 Importer le projet

Le code du site est sur GitHub : https://github.com/moadelharti57-afk/albassma-2026
(branche `main`). Si le dépôt est privé, demandez à son propriétaire de vous
ajouter dans **Settings > Collaborators**.

1. Allez sur https://vercel.com et connectez-vous avec le compte GitHub qui a accès
   au dépôt du site.
2. **Add New… > Project**, choisissez le dépôt `albassma-2026`, puis **Import**.
3. Vercel détecte la configuration grâce au fichier `vercel.json`. Ne changez rien :
   - Framework : **Vite**
   - Build Command : `npm run build`
   - Output Directory : `dist`

### 3.2 Ajouter les variables d'environnement

Avant de cliquer sur **Deploy**, ouvrez **Environment Variables** et ajoutez ces
trois valeurs (Supabase : **Project Settings > API**) :

| Nom | Où la trouver |
|---|---|
| `VITE_SUPABASE_URL` | **Project URL**, ex. `https://abcd1234.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | clé **anon / public** (jamais la clé `service_role`) |
| `VITE_SUPABASE_PROJECT_ID` | l'identifiant du projet, ex. `abcd1234` |

Cliquez sur **Deploy**. Après 1 à 2 minutes, Vercel donne une adresse d'essai,
par exemple `https://albassma-2026.vercel.app`.

> Si vous ajoutez ou modifiez une variable plus tard, il faut redéployer :
> **Deployments > ⋯ > Redeploy**.

### 3.3 Branche de production

Le site est sur la branche `main`, que Vercel met en ligne par défaut :
il n'y a rien à régler. Chaque nouveau `git push` sur `main` redéploie le site
automatiquement.

### 3.4 Vérifier

- La page d'accueil s'affiche avec le billet 3D.
- `https://votre-adresse.vercel.app/verify` s'ouvre (pas d'erreur 404).
- `https://votre-adresse.vercel.app/admin/dashboard` renvoie vers la page de connexion.

### 3.5 Domaine personnalisé (plus tard, optionnel)

**Settings > Domains > Add**, puis suivez les instructions DNS de Vercel.
Pensez ensuite à mettre à jour le secret `SITE_URL` (étape 5).

## 4. Créer les comptes staff

1. **Authentication > Users > Add user > Create new user** : email + mot de passe.
2. Donnez un rôle à chaque compte dans le **SQL Editor** :

```sql
-- Admin : tout faire, y compris supprimer des billets
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'admin@exemple.com';

-- Staff : scanner et valider les entrées, voir la liste
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'staff' FROM auth.users WHERE email = 'accueil@exemple.com';
```

Le staff se connecte ensuite sur `/admin/login`.

## 5. Envoyer les billets avec Gmail

### 5.1 Créer un mot de passe d'application Google

Utilisez de préférence **un compte Gmail dédié au club**, pas un compte personnel.

1. Activez la **validation en deux étapes** sur ce compte :
   https://myaccount.google.com/signinoptions/twosv
2. Créez un **mot de passe d'application** :
   https://myaccount.google.com/apppasswords
   - Nom : `Albassma billets`
   - Google affiche un code de 16 lettres (ex. `abcd efgh ijkl mnop`). Copiez-le.
   - Ce n'est **pas** le mot de passe du compte Gmail. Ne le partagez pas et ne le
     mettez jamais dans le code ou sur GitHub.

### 5.2 Enregistrer les secrets dans Supabase

Dans Supabase : **Edge Functions > Secrets** (ou **Project Settings > Edge Functions**),
ajoutez :

| Nom | Valeur |
|---|---|
| `GMAIL_USER` | l'adresse Gmail du club |
| `GMAIL_APP_PASSWORD` | le code de 16 lettres |
| `MAIL_FROM_NAME` | `Albassma Filme` (nom affiché comme expéditeur) |
| `SITE_URL` | l'adresse Vercel du site, ex. `https://albassma-2026.vercel.app` |

Ou en ligne de commande :

```powershell
npx supabase login
npx supabase link --project-ref VOTRE_PROJECT_ID
npx supabase secrets set GMAIL_USER=club@gmail.com GMAIL_APP_PASSWORD="abcd efgh ijkl mnop" MAIL_FROM_NAME="Albassma Filme" SITE_URL=https://votre-site
```

### 5.3 Déployer la fonction d'email

```powershell
npx supabase functions deploy send-ticket-email --no-verify-jwt
```

### 5.4 Tester

Inscrivez-vous sur le site avec votre propre adresse. Vous devez recevoir
« Votre billet Albassma Filme 2026 » avec le QR code dans le message.
Si rien n'arrive, regardez **Edge Functions > send-ticket-email > Logs**.

### Limites de Gmail

- Un compte Gmail gratuit envoie environ **500 emails par jour**.
  Au-delà, Gmail bloque l'envoi pendant 24 h. Les billets restent valides
  et le PDF est toujours téléchargé sur le site, seul l'email manque.
- Les premiers emails peuvent arriver dans les **Spams** : demandez aux
  participants de vérifier ce dossier.

## 6. Modifier les textes de l'événement

Tout est dans `src/config/event.ts` : date, lieu, programme, chiffres de l'an
dernier et FAQ.
