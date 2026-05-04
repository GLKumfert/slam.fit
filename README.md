# slam.fit

**slam.fit** is a fast, role-aware availability scheduling tool designed specifically for broadcast teams and event crews. It allows hosts to create schedules with required roles (e.g., PBP, Host, Analyst, Observer), define specific time blocks/shifts, and visually cross-reference who is available for what role at what time.

Unlike generic scheduling tools, slam.fit supports:
- **Role Tagging**: Participants tag themselves with custom roles.
- **Granular Heatmaps**: See exactly how many people are available per slot, and instantly filter to see *who* those people are.
- **Shift Highlighting**: Click entire predefined shifts (e.g. "Game 1") to filter the participant list to those who are available for all (or any) of that shift.
- **Dynamic Timezones**: Automatic timezone conversion for all participants and hosts.
- **Live Updates**: Built with Supabase Realtime so everyone sees updates instantly.

## Tech Stack
- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Database / Backend**: [Supabase](https://supabase.com/) (PostgreSQL + Realtime + Auth)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Forms & Validation**: React Hook Form + Zod
- **Date/Time Handling**: `date-fns` & `date-fns-tz`

## Getting Started Locally

### 1. Set up Supabase
1. Create a project at [Supabase.com](https://supabase.com/).
2. Navigate to the **SQL Editor** in your Supabase dashboard.
3. Run the migrations/schema script found in `supabase/schema.sql` (if available) or ensure your tables (`sessions`, `participants`) are created.

### 2. Environment Variables
Create a `.env.local` file in the root of the `slam-fit` directory:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 3. Install & Run
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploying to Vercel
1. Push this repository to GitHub.
2. Go to [Vercel](https://vercel.com/) and import the repository.
3. Make sure to set the **Root Directory** to `slam-fit` if this is part of a monorepo.
4. Add the three Environment Variables from step 2 into your Vercel project settings.
5. Deploy!

*(Make sure to update your Supabase Auth **Site URL** to match your deployed Vercel URL!)*
