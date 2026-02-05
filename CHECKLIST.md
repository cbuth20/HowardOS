# HowardOS Setup Checklist

Use this checklist to get HowardOS up and running.

## Initial Setup

### 1. Install Dependencies
- [ ] Run `npm install`
- [ ] Wait for installation to complete (may take a few minutes)
- [ ] Verify no error messages

### 2. Choose Your Supabase Setup

**Option A: Local Development** (Recommended for initial testing)
- [ ] Install Docker Desktop (required for local Supabase)
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Start Supabase: `supabase start`
- [ ] Copy the local credentials from the output
- [ ] Apply migrations: `supabase db reset`
- [ ] Generate types: `npm run supabase:gen-types`

**Option B: Supabase Cloud** (For production-like environment)
- [ ] Create account at https://supabase.com
- [ ] Create new project
- [ ] Wait for database to be ready (2-3 minutes)
- [ ] Go to SQL Editor
- [ ] Copy and run `supabase/migrations/001_initial_schema.sql`
- [ ] Go to Project Settings > API to get credentials

### 3. Configure Environment
- [ ] Copy `.env.example` to `.env.local`
- [ ] Fill in `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Fill in `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Fill in `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Verify `NEXT_PUBLIC_APP_URL` is `http://localhost:8888`

### 4. Run the Application
- [ ] Run `npm run dev`
- [ ] Open http://localhost:8888 in browser
- [ ] Should redirect to `/login` page
- [ ] Verify page loads without errors

## First User Setup

### 5. Create Your Account
- [ ] Enter your email on login page
- [ ] Click "Send Magic Link"
- [ ] Check email (or Inbucket at http://localhost:54324 for local)
- [ ] Click the magic link
- [ ] Should redirect to dashboard

### 6. Set Up Organization
- [ ] Note the "No organization found" or similar message
- [ ] Go to Supabase Dashboard > SQL Editor
- [ ] Run the following SQL (replace placeholders):

```sql
-- Create your organization
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'YOUR_COMPANY_NAME', 'your-company-slug');

-- Find your user ID in Authentication > Users, then run:
UPDATE profiles
SET org_id = '00000000-0000-0000-0000-000000000001',
    role = 'admin',
    full_name = 'Your Name'
WHERE email = 'your-email@example.com';
```

- [ ] Refresh the dashboard page
- [ ] Verify you can now see the dashboard
- [ ] Verify your organization name shows in sidebar

## Verify Everything Works

### 7. Test Navigation
- [ ] Click on "Dashboard" - should show stats and recent items
- [ ] Click on "Files" - should show placeholder page
- [ ] Click on "Tasks" - should show placeholder page
- [ ] Click on "Users" - should show placeholder page (admin only)
- [ ] Click on "Settings" - should show placeholder page
- [ ] Active route should be highlighted in sidebar

### 8. Test Authentication
- [ ] Click "Logout" button in sidebar
- [ ] Should redirect to login page
- [ ] Log back in using magic link or password
- [ ] Should return to dashboard

### 9. Test Multi-Tenancy (Optional but Recommended)
- [ ] Create a second organization in SQL Editor
- [ ] Sign up with a different email (use incognito/private window)
- [ ] Link second user to second organization
- [ ] Log in as first user - should only see first org data
- [ ] Log in as second user - should only see second org data
- [ ] Users should NOT see each other's data

## Optional: Set Up Google OAuth

### 10. Google OAuth Configuration
- [ ] Go to Google Cloud Console
- [ ] Create project
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 credentials
- [ ] Add authorized redirect URI
- [ ] Copy Client ID and Client Secret
- [ ] Add to Supabase Dashboard > Authentication > Providers
- [ ] Add Client ID to `.env.local`
- [ ] Restart dev server
- [ ] Test "Sign in with Google" button

## Troubleshooting

### Common Issues

**Can't start Supabase locally**
- [ ] Is Docker running?
- [ ] Run `docker ps` to verify
- [ ] Try `supabase stop` then `supabase start`

**"No organization found" after login**
- [ ] Did you run the SQL to create organization?
- [ ] Did you link your profile to the organization?
- [ ] Check the `profiles` table in Supabase

**Environment variables not working**
- [ ] Is the file named `.env.local` (not `.env`)?
- [ ] Did you restart the dev server after changing it?
- [ ] Are the values correct (no extra spaces)?

**TypeScript errors**
- [ ] Run `npm run supabase:gen-types`
- [ ] Restart your editor/IDE
- [ ] Check `src/types/database.types.ts` exists

**Pages showing errors**
- [ ] Check browser console for errors
- [ ] Check terminal where `npm run dev` is running
- [ ] Verify Supabase is running: `supabase status`

## Next Steps After Setup

### 11. Explore the Codebase
- [ ] Read `README.md` for architecture overview
- [ ] Read `SETUP.md` for detailed setup info
- [ ] Read `IMPLEMENTATION_SUMMARY.md` for what's built
- [ ] Explore `src/` directory structure

### 12. Plan Feature Development
- [ ] Review feature roadmap in README.md
- [ ] Decide which feature to build first
- [ ] Review existing placeholder pages
- [ ] Check Supabase schema for available tables

## Production Deployment Checklist

When ready to deploy:

- [ ] Create production Supabase project
- [ ] Apply migrations to production
- [ ] Configure authentication providers in production
- [ ] Set up custom domain
- [ ] Add production environment variables to Netlify/Vercel
- [ ] Test authentication flow in production
- [ ] Verify RLS policies work in production
- [ ] Set up monitoring and error tracking
- [ ] Create backups strategy
- [ ] Document deployment process

---

## Quick Reference

**Start local Supabase**: `supabase start`
**Stop local Supabase**: `supabase stop`
**Reset database**: `supabase db reset`
**Generate types**: `npm run supabase:gen-types`
**Start dev server**: `npm run dev`
**View local emails**: http://localhost:54324
**Supabase Studio**: http://localhost:54323

---

**Need help?** See SETUP.md for detailed instructions or check the documentation links in README.md.
