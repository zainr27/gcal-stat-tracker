# GCAL Stat Tracker

See who you hang out with most — powered by your Google Calendar.

- **Connect** with Google OAuth (read-only calendar access).
- **Analyze** the last 12 months: people and places extracted from event titles and location fields.
- **View** ranked stats with last-seen dates and source (location field vs title parsing).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- NextAuth.js (Google OAuth)
- Google Calendar API
- OpenAI GPT-4o-mini (entity extraction)

## Setup

1. **Clone and install**
   ```bash
   cd "GCAL Stat Tracker"
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env.local` and fill in:
     - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (Google Cloud Console → OAuth 2.0)
     - `OPENAI_API_KEY` (OpenAI)
     - `NEXTAUTH_URL` (e.g. `http://localhost:3000`)
     - `NEXTAUTH_SECRET` (random string)

3. **Google Cloud**
   - Create an OAuth 2.0 Client ID (Web application).
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Enable Google Calendar API.
   - Add test users on the OAuth consent screen if in testing mode.

4. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Commands

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — run production build
