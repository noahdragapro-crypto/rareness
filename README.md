# Ora

A dating web app built around daily rituals. New members register their profile, take a one-minute **aura quick test**, and pay a one-time **$5** to unlock the app. Then they do three things a day (meditate for 10 minutes, write what comes to mind when it's clear, take a first step), Claude reads their answers to shape an **aura**, and the **Cloud** shows other members as glass bubbles: the more two people share, the closer and bigger the bubble, and the coloured ring shows why. Nobody knows who bumped them until both people bump each other, which opens a chat.

It runs as a website that members add to their phone's home screen, where it opens full screen like an app.

## How it fits together

| Part | What it does | Where |
| --- | --- | --- |
| App (browser) | Screens, gestures, sign-in, chats | `index.html`, `src/` (Vite, no framework) |
| Database, sign-in, photos, live chat | Supabase (Postgres with row-level security, email codes, storage, realtime) | `supabase/migrations/0001_init.sql` |
| AI aura and matching | Claude reads each member's answers and scores every pair across six dimensions | `api/_lib/ai.ts`, `api/_lib/matching.ts` |
| Access fee | A one-time $5 payment in Stripe Checkout; a webhook marks the member as paid | `api/stripe/*` |
| Hosting | Vercel serves the app and runs `api/` as serverless functions, plus a daily matching job | `vercel.json` |

### The six dimensions

Values, Lifestyle, Interests, Personality, Goals and Routine. Each has a colour (`#F5A6D8`, `#FFF3A6`, `#9FE5B5`, `#B89CFF`, `#8FE8E3`, `#6FB7FF`).

- **Aura**: how strongly each dimension shows in one member, plus a one-line portrait. Recomputed when they have new answers.
- **Match**: for each pair, an overall score from 0 to 100 and how much each dimension contributes. The contributions are the colours of the ring around a bubble, and the score sets its size and distance in the Cloud.
- While the community is small, everyone with an account and a name shows in everyone's Cloud (`supabase/migrations/0004_show_everyone.sql`); `0003_friends_test.sql` brings back the "looking for" and finished-sign-up rules. To limit the Cloud to one country later, run `0002_cloud_everyone.sql` and set `SAME_COUNTRY=on` in Vercel.
- Pairs are rescored only when either person has answered something new, after a member finishes their three daily exercises and once a day by the cron job.
- Without an Anthropic key (or if a call fails), a rule-based matcher compares sign-up answers, interests, this-or-that picks and routine instead.
- Members' text is passed to Claude as data inside tags. It can't change how scores are computed.

### Privacy and safety built in

- Row-level security on every table. Tested cases: members can't read each other's birth date or billing, can't see who bumped them, can't read or post in chats they're not part of, and can't edit their own aura or mark themselves as paid.
- Blocking hides both people from each other's Cloud and stops messages. Reports are stored for review in the `reports` table.
- Members must be 18 or older at sign-up.
- Members can delete their account and photos from their profile.
- Photos are in a public storage bucket with unguessable paths. Anyone with a photo's exact link can open it, which is the usual setup for dating apps but worth knowing.

## Setting it up

You need free accounts on **Supabase**, **Vercel** and **GitHub**. You also need **Anthropic** for AI matching (pay as you go; about 20 members costs very little) and **Stripe** for the $5 access fee.

### 1. Supabase

1. Create a project at supabase.com.
2. **SQL editor** → paste all of `supabase/migrations/0001_init.sql` → Run.
3. **Authentication → Sign in / Providers → Email**: keep Email enabled and turn **Confirm email** on.
4. **Authentication → Email templates → Magic link**: include the code, so people who use the home-screen app can type it instead of opening the link in another browser. For example:
   ```html
   <h2>Your Ora code</h2>
   <p>Enter this code in the app: <strong>{{ .Token }}</strong></p>
   <p>Or <a href="{{ .ConfirmationURL }}">tap here to sign in</a>.</p>
   ```
5. **Authentication → URL configuration**: set the Site URL to your Vercel address once you have it (step 3).
6. For more than a few sign-ups an hour, set up your own email sender under **Authentication → SMTP settings** (Resend, Postmark and others work). Supabase's built-in sender is rate limited.
7. Copy **Project URL**, **anon key** and **service_role key** from **Project settings → API**.

### 2. Stripe (the $5 access fee)

1. Copy your **secret key** from **Developers → API keys**. Start with the test-mode key (`sk_test_…`) and pay with the card number `4242 4242 4242 4242` to try it.
2. **Developers → Webhooks → Add endpoint**:
   - URL: `https://YOUR-APP/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`
   - Copy the signing secret (`whsec_…`).
3. The fee is $5 by default (`ACCESS_PRICE_CENTS=500`, `ACCESS_CURRENCY=usd`). You don't need to create a product in Stripe for it.
4. When you're ready for real payments, switch both keys to live mode.

### 3. Vercel

1. Push this folder to a GitHub repository and import it in Vercel. Vercel detects Vite automatically.
2. Add every variable from `.env.example` under **Settings → Environment Variables**.
3. Deploy. Then set `APP_URL` to the deployed address, and Supabase's Site URL (step 1.5) to the same address.
4. The daily matching job in `vercel.json` runs at 04:17 UTC. Vercel sends `CRON_SECRET` with it automatically.

### 4. Invite your testers

Send them the link. On iPhone: open it in Safari → Share → **Add to Home Screen**. On Android: Chrome menu → **Add to Home screen**.

The Cloud fills in as more people sign up. Each new member is scored against everyone else right after sign-up.

## Meditation

**Meditation** is its own tab. Each day has one session of 7 to 15 minutes (depending on the day); finishing it in the temple checks off the day's meditation on the Agenda. The other two daily tasks, a reflection and an action, change every day. The tab explains how meditation, focus bubbles and the aura work, and opens **the temple**. The temple is a black screen with a crack of light that breathes; while it's open the phone gives a soft double pulse every four seconds (Vibration API on Android; on iPhone, iOS 18+ gives a light haptic tick instead, older iPhones stay silent). 

**Focus bubbles**: the first within 45 seconds of opening the app, then every 10 to 12 minutes (`FOCUS_FIRST`, `FOCUS_EVERY` in `src/main.js`), a bubble drifts over whatever page is open until it's popped.

Daily answers are private (`supabase/migrations/0006_private_answers.sql`); only the AI reads them on the server.

## Chats

Text, emoji, stickers and GIFs. GIFs need a free GIPHY key in `GIPHY_API_KEY` (developers.giphy.com → Create an app → API). Under your latest message the other person sees nothing new, and you see **Sent** or **Read**; "Read" needs `supabase/migrations/0005_read_receipts.sql`.

## Team dashboard

`/admin` (for example `https://rareness-kappa.vercel.app/admin`) shows how many members there are, today's activity, new members per day, and a searchable list of every member, with a CSV download. Only emails in the `ADMIN_EMAILS` variable in Vercel can open it: log in to the app with that email first, then open `/admin`.

## Running it locally

```bash
npm install
cp .env.example .env.local   # fill in at least the two VITE_SUPABASE_* values
npm run dev                  # the app, at http://localhost:5173
npx vercel dev               # app + api/ functions together (needs the Vercel CLI)
npm run typecheck            # type-check the server code
npm run build
```

## The flow for a new member

1. Page 1: first name, age (18+), email, gender, who they're looking for, and a city from a fixed list. A **Log in** link (shown first on a device that was signed in before) takes just the email. For now there is no email check: entering an email signs you straight in (`api/auth/email.ts`), and a returning member only needs their email. Their country is taken from Vercel's location header and can be changed in the profile. To limit who can get in, set `TESTER_EMAILS` to a comma-separated list. Bring back email verification before a public launch, since anyone who knows a member's email can sign in as them.
2. Page 2: photo (with reframing) and a status (optional, 20 characters).
3. Aura writing: two open questions, written or dictated (microphone button where the browser supports it), with ideas listed above each box: **Tell us about yourself** and **Who are you looking for?** Claude reads both to shape the aura and to match people: it weighs how well each person fits who the other is looking for, in both directions.
   From page 2 on, **Finish later, start today's practice** goes straight to the Agenda and meditation; the Cloud and chats stay locked until the photo and both answers are done.
4. Pay $5 once in Stripe Checkout.
5. The app: Agenda (today's three: meditate 10 minutes, a clear-mind reflection, take a first step; plus upcoming days and what's done), Cloud and Chats. Their profile opens from the bubble in the top-right corner.

## Costs at about 20 members

- **Supabase, Vercel**: free tiers.
- **Anthropic**: 20 members make 190 pairs; each pair costs two short Claude calls when it's rescored, and an aura costs one. Pairs are rescored only after new answers.
- **Stripe**: a percentage of each $5 payment, no monthly fee.
