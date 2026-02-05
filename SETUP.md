# HowardOS Setup Guide

## Quick Start (5 minutes)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set Up Supabase

Choose one option:

#### Option A: Local Development (Recommended for testing)

```bash
# Install Supabase CLI globally
npm install -g supabase

# Start local Supabase (Docker required)
supabase start

# This will output your local credentials - copy them!
# API URL: http://localhost:54321
# Anon key: eyJ...
# Service role key: eyJ...
```

#### Option B: Supabase Cloud (Recommended for production)

1. Go to https://supabase.com/dashboard
2. Create a new project
3. Wait for the database to be ready (2-3 minutes)
4. Go to Project Settings > API to get your credentials

### Step 3: Apply Database Migration

#### For Local:
```bash
# Apply migrations
supabase db reset

# Generate TypeScript types
npm run supabase:gen-types
```

#### For Cloud:
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run the SQL
4. Generate types: `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts`

### Step 4: Configure Environment

```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
# Use values from Step 2
```

Your `.env.local` should look like:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321  # or your cloud URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
NEXT_PUBLIC_APP_URL=http://localhost:8888
```

### Step 5: Run the App

```bash
npm run dev
```

Open http://localhost:8888

## Initial Testing

### 1. Create Your First User

1. Go to http://localhost:3000
2. You'll be redirected to `/login`
3. Enter your email and click "Send Magic Link"
4. Check your email (or check Supabase logs for local dev)
5. Click the magic link to log in

### 2. Set Up Your First Organization

After signing up, you need to manually create an organization and link your user:

```sql
-- Run this in Supabase SQL Editor

-- 1. Create an organization
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'My Company', 'my-company');

-- 2. Link your user to the organization (replace YOUR_USER_ID with your actual ID)
-- Find your user ID in: Authentication > Users in Supabase Dashboard
UPDATE profiles
SET org_id = '00000000-0000-0000-0000-000000000001',
    role = 'admin'
WHERE email = 'your-email@example.com';
```

### 3. Verify Everything Works

1. Refresh the page - you should now see the dashboard
2. Check that your organization name appears in the sidebar
3. Navigate through Files, Tasks, Settings (placeholder pages)

## Authentication Setup

### Enable Magic Links (Default)

Magic links are enabled by default. No additional setup needed.

### Enable Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: Add your Supabase callback URL
     - For local: `http://localhost:54321/auth/v1/callback`
     - For cloud: `https://your-project.supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret
6. In Supabase Dashboard:
   - Go to Authentication > Providers
   - Enable Google
   - Paste Client ID and Client Secret
7. Update `.env.local`:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
   ```

## Testing Multi-Tenancy

To test that multi-tenancy works correctly:

### 1. Create a Second Organization

```sql
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000002', 'Client Company', 'client-company');
```

### 2. Create a Second User

1. Open a private/incognito browser window
2. Sign up with a different email
3. Link them to the second organization:

```sql
UPDATE profiles
SET org_id = '00000000-0000-0000-0000-000000000002',
    role = 'client'
WHERE email = 'second-user@example.com';
```

### 3. Verify Isolation

1. Log in as first user - should only see data from "My Company"
2. Log in as second user - should only see data from "Client Company"
3. Users should NOT be able to see each other's data

## Common Issues

### "No organization found"

**Problem**: User profile isn't linked to an organization.

**Solution**: Run the UPDATE query from Step 2 of Initial Testing above.

### "Invalid API key"

**Problem**: Environment variables not set correctly.

**Solution**:
- Check `.env.local` exists (not `.env`)
- Verify credentials match Supabase dashboard
- Restart dev server after changing env vars

### "Auth callback error"

**Problem**: Callback URL mismatch.

**Solution**:
- For local dev, Supabase handles this automatically
- For OAuth, verify redirect URLs in Google Console match exactly

### TypeScript errors about database types

**Problem**: Types not generated or outdated.

**Solution**:
```bash
npm run supabase:gen-types
```

### Can't log in with magic link

**Problem**: Email not being sent (local dev).

**Solution**:
- Check Supabase logs: `supabase status`
- View emails in Inbucket: http://localhost:54324
- For production, configure SMTP in Supabase dashboard

## Next Steps

Now that scaffolding is complete, you can:

1. **Add sample data** - Run queries from `supabase/seed.sql` (update with real user IDs first)
2. **Implement file upload** - Add upload functionality to Files page
3. **Build task management** - Complete CRUD operations for tasks
4. **Add user invitations** - Allow admins to invite new users
5. **Deploy to Netlify** - See README.md for deployment instructions

## Development Tips

### Useful Supabase Commands

```bash
# View local Supabase status
supabase status

# Reset database (WARNING: deletes all data)
supabase db reset

# Create a new migration
supabase migration new migration_name

# Generate TypeScript types
npm run supabase:gen-types

# View logs
supabase logs

# Stop Supabase
supabase stop
```

### Debugging

- View auth issues in Supabase Dashboard > Authentication
- Check RLS policies if users can't access data
- Use browser DevTools Network tab to see API calls
- Check server logs in terminal where `npm run dev` is running

### Code Organization

- **Client Components**: Use `'use client'` directive, can use hooks
- **Server Components**: Default, can directly query database
- **API Routes**: In `src/app/api/`, use for complex server logic
- **Middleware**: Runs on every request, handles auth redirects

## Production Deployment

Before deploying to production:

1. ✅ Set up production Supabase project
2. ✅ Apply migrations to production database
3. ✅ Configure authentication providers
4. ✅ Update environment variables with production URLs
5. ✅ Test authentication flow
6. ✅ Verify RLS policies work correctly
7. ✅ Set up monitoring and error tracking
8. ✅ Configure custom domain
9. ✅ Enable HTTPS

See README.md for detailed deployment instructions.

## Getting Help

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind Docs**: https://tailwindcss.com/docs

## Security Checklist

- ✅ RLS policies enabled on all tables
- ✅ Service role key never exposed to client
- ✅ Authentication required for all dashboard routes
- ✅ Input validation on all forms
- ✅ HTTPS in production
- ✅ Environment variables not committed to git
- ✅ CORS configured appropriately
- ✅ File upload size limits set

---

**Ready to build!** The scaffolding is complete and you have a solid foundation for your multi-tenant client portal.
