-- ═══════════════════════════════════════════════════════════════════════════
-- GAVIOM — Emails de confirmation Supabase Auth (Resend SMTP)
-- ═══════════════════════════════════════════════════════════════════════════
-- Supabase n'envoie PAS les emails de confirmation aux vrais utilisateurs
-- tant qu'un SMTP custom n'est pas configuré (le mailer par défaut est limité
-- et les messages finissent souvent en spam ou ne partent pas du tout).
--
-- Vous avez déjà RESEND_API_KEY sur Vercel pour le formulaire Business.
-- Utilisez la MÊME clé Resend ci-dessous dans Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

-- ÉTAPE 1 — Resend (resend.com)
--   • Domaine vérifié : getgaviom.com (ou gaviom.com)
--   • Créez une clé API si besoin : API Keys → Create
--   • Adresse d'envoi autorisée ex. : noreply@getgaviom.com

-- ÉTAPE 2b — Vercel (obligatoire pour envoi via API Resend)
--   Settings → Environment Variables → ajouter :
--   SUPABASE_SERVICE_ROLE_KEY = clé "service_role" (Supabase → Settings → API)
--   RESEND_API_KEY              = clé re_... (Resend)
--   AUTH_CONFIRM_FROM           = Gaviom <noreply@getgaviom.com>  (optionnel)
--   Puis Redeploy le site sur Vercel.
--
--   Le site envoie les emails de confirmation via /api/auth-confirmation-email
--   (Resend direct), même si le SMTP Supabase ne fonctionne pas.

-- ÉTAPE 3 — Supabase → Authentication → Emails → SMTP Settings (optionnel si API ci-dessus)
--   Enable custom SMTP : ON
--
--   Host:     smtp.resend.com
--   Port:     465          (SSL — recommandé)
--             ou 587       (TLS si 465 bloqué)
--   Username: resend
--   Password: <votre clé API Resend, commence par re_>
--
--   Sender email:   noreply@getgaviom.com
--   Sender name:    Gaviom

-- ÉTAPE 3 — Supabase → Authentication → URL Configuration
--   Site URL:       https://gaviom.com
--   Redirect URLs:  https://gaviom.com/auth-callback.html
--                   https://gaviom.com/signin.html
--                   https://gaviom.com/account.html
--                   https://gaviom.com/reset-password.html
--
-- ÉTAPE 3b — Supabase → Authentication → Emails → Confirm signup
--   Gardez {{ .ConfirmationURL }} dans le lien (ne pas le remplacer par une URL fixe).
--   Ce template sert seulement si Supabase envoie l'email (SMTP activé).
--   Gaviom envoie normalement ses propres emails via Resend (sujet "Confirm your Gaviom account").

-- ÉTAPE 4 — Supabase → Authentication → Providers → Email
--   Confirm email : ON

-- ÉTAPE 5 — Test
--   1. Créez un compte sur https://gaviom.com/signup.html (nouvel email)
--   2. Vérifiez Supabase → Authentication → Logs (événements signup / mail)
--   3. Vérifiez Resend → Emails (statut delivered / bounced)
--   4. Boîte spam / Promotions si rien dans la boîte principale

-- Dépannage
--   • "Email rate limit" → attendre 1 h ou augmenter limite Resend
--   • "Domain not verified" → finir la vérif DNS du domaine dans Resend
--   • Compte créé avant SMTP → Users → user → Send password recovery
--     ou bouton "Resend confirmation" sur gaviom.com/signin.html
