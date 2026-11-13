# Supabase + Google login setup (phase 2)

Ye steps aap khud karenge. Koi key ya secret chat mein paste na karein: Client secret sirf Supabase dashboard mein jata hai, aur app ki 2 keys `.env.local` mein.

Port: Trip Hisab ka dev server `http://localhost:5174` par chalta hai (ExpenseApp 5173 par hai).

## 1. Naya Supabase project

ExpenseApp wala project reuse na karein, naya banayen (free tier mein 2 projects allowed hain). Is tarah data, login users, storage quota aur 7 din ka inactivity pause dono apps ke alag rehte hain.

1. https://supabase.com/dashboard → **New project**
2. Name: `trip-hisab`, Region: **South Asia (Mumbai)**, DB password: strong rakhen aur password manager mein save karein.
3. Project ready hone ka intezar karein (1–2 minute).

## 2. Schema chalayen

1. Project → **SQL Editor** → **New query**
2. `supabase/migrations/001_init.sql` ka poora content paste karein → **Run**
3. "Success. No rows returned" aana chahiye. **Table Editor** mein ye tables nazar ayenge: `profiles`, `trips`, `trip_members`, `expenses`, `contributions`, `settlements`. **Storage** mein `receipts` bucket (Private).

## 3. Supabase ka callback URL copy karein

Project → **Authentication** → **Sign In / Providers** → **Google** kholen (abhi enable na karein).
Wahan **Callback URL (for OAuth)** likha hoga, aisa: `https://<project-ref>.supabase.co/auth/v1/callback`. Isko copy kar lein (ye secret nahi hai).

## 4. Google Cloud: OAuth client banayen

1. https://console.cloud.google.com → upar project dropdown → **New project** → name `Trip Hisab` → Create, phir usi project ko select karein.
2. Menu → **Google Auth Platform** (purana naam "OAuth consent screen") → **Get started**:
   - App name: `Trip Hisab`
   - User support email: apna Gmail
   - Audience: **External**
   - Contact email: apna Gmail → Agree → Create
3. **Audience** tab → Publishing status **Testing** hoga. **Publish app** dabayen taake har dost apni Google ID se login kar sake.
   App sirf name, email aur photo maangti hai (basic scopes), is liye Google verification ki zaroorat nahi.
   (Testing mode mein sirf woh log login kar sakte hain jinhein aap "Test users" mein add karein.)
4. **Clients** tab → **Create client**:
   - Application type: **Web application**
   - Name: `Trip Hisab web`
   - **Authorized JavaScript origins**: `http://localhost:5174`
     (Cloudflare deploy ke baad `https://<app>.pages.dev` bhi add karenge)
   - **Authorized redirect URIs**: step 3 wala Supabase callback URL
   - **Create**
5. Client ID aur Client secret wala dialog khulega. **Download JSON** kar lein (naye console mein secret baad mein dobara nazar nahi aata). Ye file kahin safe rakhen, project folder mein nahi.

## 5. Supabase mein Google enable karein

1. Supabase → **Authentication** → **Sign In / Providers** → **Google**
2. **Enable Sign in with Google** on
3. **Client IDs**: Google wala Client ID paste karein
4. **Client Secret (for OAuth)**: Google wala Client secret paste karein
5. **Save**

Isi page par **Email** provider band kar sakte hain (sirf Google login chahiye). "Allow new users to sign up" **ON** rehne dein: dost pehli dafa Google se login karte hain tab hi unka user banta hai.

## 6. Redirect URLs

Supabase → **Authentication** → **URL Configuration**:

- **Site URL**: `http://localhost:5174` (deploy ke baad pages.dev URL)
- **Redirect URLs** → Add: `http://localhost:5174/**`

## 7. App ki keys `.env.local` mein

1. Supabase → **Project Settings** → **API Keys** (ya upar **Connect** button)
2. Project folder mein `.env.example` ko copy karke `.env.local` banayen, aur ye do values bharein:
   - `VITE_SUPABASE_URL` = Project URL (`https://<project-ref>.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` = **publishable** key (`sb_publishable_...`) ya legacy **anon** key
3. **service_role / secret key kabhi nahi** daalni: `VITE_` wali har cheez browser mein chali jati hai.

`.env.local` gitignored hai, GitHub par nahi jayegi.

## Ho gaya?

Chat mein sirf "ho gaya" likh dein (keys nahi). Phir phase 3: Google login, asli data, offline outbox, invite link aur receipts.
