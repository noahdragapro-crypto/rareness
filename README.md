# Rareness

A dating web app built around daily rituals. Members answer three short exercises a day, Claude reads their answers to shape an **aura**, and the **Cloud** shows other members as glass bubbles: the more two people share, the closer and bigger the bubble, and the coloured ring shows why. Nobody knows who bumped them until both people bump each other, which opens a chat.

It runs as a website that members add to their phone's home screen, where it opens full screen like an app.

## How it fits together

| Part | What it does | Where |
| --- | --- | --- |
| App (browser) | Screens, gestures, sign-in, chats | `index.html`, `src/` (Vite, no framework) |
| Database, sign-in, photos, live chat | Supabase (Postgres with row-level security, email codes, storage, realtime) | `supabase/migrations/0001_init.sql` |
| AI aura and matching | Claude reads each member's answers and scores every pair across six dimensions | `api/_lib/ai.ts`, `api/_lib/matching.ts` |
| Membership | Stripe Checkout and the Stripe billing portal; a webhook keeps the status in sync | `api/stripe/*` |
| Hosting | Vercel serves the app and runs `api/` as serverless functions, plus a daily matching job | `vercel.json` |

### The six dimensions

Values, Lifestyle, Interests, Personality, Goals and Routine. Each has a colour (`#F5A6D8`, `#FFF3A6`, `#9FE5B5`, `#B89CFF`, `#8FE8E3`, `#6FB7FF`).

- **Aura**: how strongly each dimension shows in one member, plus a one-line portrait. Recomputed when they have new answers.
- **Match**: for each pair, an overall score from 0 to 100 and how much each dimension contributes. The contributions are the colours of the ring around a bubble, and the score sets its size and distance in the Cloud.
- Pairs are rescored only when either person has answered something new, after a member finishes their three daily exercises and once a day by the cron job.
- Without an Anthropic key (or if a call fails), a rule-based matcher compares sign-up answers, interests, this-or-that picks and routine instead.
- Members' text is passed to Claude as data inside tags. It can't change how scores are computed.

### Privacy and safety built in

- Row-level security on every table. Tested cases: members can't read each other's birth date or billing, can't see who bumped them, can't read or post in chats they're not part of, and can't edit their own aura or membership status.
- Blocking hides both people from each other's Cloud and stops messages. Reports are stored for review in the `reports` table.
- Members must be 18 or older at sign-up.
- Members can delete their account and photos from their profile.
- Photos are in a public storage bucket with unguessable paths. Anyone with a photo's exact link can open it, which is the usual setup for dating apps but worth knowing.

## Setting it up

You need free accounts on **Supabase**, **Vercel** and **GitHub**. You also need **Anthropic** for AI matching (pay as you go; about 20 members costs very little) and **Stripe** for memberships.

### 1. Supabase

1. Create a project at supabase.com.
2. **SQL editor** → paste all of `supabase/migrations/0001_init.sql` → Run.
3. **Authentication → Sign in / Providers → Email**: keep Email enabled and turn **Confirm email** on.
4. **Authentication → Email templates → Magic link**: include the code, so people who use the home-screen app can type it instead of opening the link in another browser. For example:
   ```html
   <h2>Your Rareness code</h2>
   <p>Enter this code in the app: <strong>{{ .Token }}</strong></p>
   <p>Or <a href="{{ .ConfirmationURL }}">tap here to sign in</a>.</p>
   ```
5. **Authentication → URL configuration**: set the Site URL to your Vercel address once you have it (step 3).
6. For more than a few sign-ups an hour, set up your own email sender under **Authentication → SMTP settings** (Resend, Postmark and others work). Supabase's built-in sender is rate limited.
7. Copy **Project URL**, **anon key** and **service_role key** from **Project settings → API**.

### 2. Stripe (only when you want paid memberships)

1. Create a Product, for example "Rareness membership", with a recurring Price. Copy the price id (`price_…`).
2. **Developers → Webhooks → Add endpoint**:
   - URL: `https://YOUR-APP/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the signing secret (`whsec_…`).
3. **Settings → Billing → Customer portal**: turn it on so members can cancel or change their card.
4. Leave `PAYWALL=off` while your first testers try it for free. Set it to `on` when you're ready to charge.

### 3. Vercel

1. Push this folder to a GitHub repository and import it in Vercel. Vercel detects Vite automatically.
2. Add every variable from `.env.example` under **Settings → Environment Variables**.
3. Deploy. Then set `APP_URL` to the deployed address, and Supabase's Site URL (step 1.5) to the same address.
4. The daily matching job in `vercel.json` runs at 04:17 UTC. Vercel sends `CRON_SECRET` with it automatically.

### 4. Invite your testers

Send them the link. On iPhone: open it in Safari → Share → **Add to Home Screen**. On Android: Chrome menu → **Add to Home screen**.

The Cloud fills in as more people sign up. Each new member is scored against everyone else right after sign-up.

## Running it locally

```bash
npm install
cp .env.example .env.local   # fill in at least the two VITE_SUPABASE_* values
npm run dev                  # the app, at http://localhost:5173
npx vercel dev               # app + api/ functions together (needs the Vercel CLI)
npm run typecheck            # type-check the server code
npm run build
```

## Costs at about 20 members

- **Supabase, Vercel**: free tiers.
- **Anthropic**: 20 members make 190 pairs; each pair costs two short Claude calls when it's rescored, and an aura costs one. Pairs are rescored only after new answers.
- **Stripe**: a percentage per payment, no monthly fee.
