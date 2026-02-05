# HowardOS - Multi-Tenant Client Portal

A modern, secure client portal built with Next.js, Supabase, and Tailwind CSS. Features include file sharing, task management, and user management with role-based access control.

## Features

- **Multi-tenant architecture** with organization-level data segregation
- **Row Level Security (RLS)** for database-level access control
- **Authentication** via magic links, email/password, and Google OAuth
- **File sharing** with granular permissions
- **Task management** with assignments and status tracking
- **User management** with admin and client roles
- **Activity logging** for audit trails
- **Responsive design** with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Styling**: Tailwind CSS
- **Deployment**: Netlify (or Vercel)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

#### Option A: Local Development with Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase
supabase init

# Start local Supabase
supabase start

# Apply migrations
supabase db reset

# Generate TypeScript types
npm run supabase:gen-types
```

#### Option B: Use Supabase Cloud

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Go to SQL Editor and run the migration from `supabase/migrations/001_initial_schema.sql`
4. Enable authentication providers in Authentication > Providers:
   - Email (enable magic links)
   - Google OAuth (configure with Google Cloud Console)

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Update with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server

```bash
npm run dev
```

This runs `netlify dev` which starts both Next.js and Netlify Functions locally.

Open [http://localhost:8888](http://localhost:8888) in your browser (Netlify dev default port).

## Project Structure

```
howardos/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Auth pages (login, callback)
│   │   ├── (dashboard)/         # Protected dashboard routes
│   │   └── api/                 # API routes (coming soon)
│   ├── components/              # React components
│   │   ├── ui/                  # Reusable UI components
│   │   └── layout/              # Layout components
│   ├── lib/                     # Core utilities
│   │   ├── supabase/           # Supabase clients
│   │   └── auth/               # Auth helpers
│   ├── types/                   # TypeScript types
│   └── middleware.ts            # Next.js auth middleware
├── supabase/
│   ├── migrations/              # Database migrations
│   └── seed.sql                 # Development seed data
└── Configuration files
```

## Database Schema

### Core Tables

- **organizations** - Tenant entities (one per client company)
- **profiles** - User profiles with org_id and role
- **files** - File metadata with versioning support
- **file_permissions** - Granular file access control
- **tasks** - Task management with assignments
- **task_attachments** - Link files to tasks
- **activity_log** - Audit trail for compliance
- **notifications** - In-app notification system

All tables have Row Level Security (RLS) policies enforcing multi-tenant isolation.

## Authentication

### Supported Methods

1. **Magic Link** - Passwordless login via email
2. **Email/Password** - Traditional login
3. **Google OAuth** - Gmail accounts

### Setting Up OAuth

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
6. Copy Client ID and Client Secret
7. Add to Supabase Dashboard > Authentication > Providers > Google

## User Roles

### Admin
- Full access to all features
- Can manage users and organization settings
- Can upload, edit, and delete any file
- Can create and manage all tasks

### Client
- Limited access to features
- Can view and manage their own files
- Can view and update assigned tasks
- Cannot manage other users

## Development Workflow

### Creating a Test Organization

1. Sign up with an email (this creates the user)
2. Manually insert an organization in the database:

```sql
INSERT INTO organizations (id, name, slug)
VALUES ('your-org-id', 'Test Company', 'test-company');
```

3. Update the profile to link to the organization:

```sql
UPDATE profiles
SET org_id = 'your-org-id', role = 'admin'
WHERE email = 'your-email@example.com';
```

### Testing RLS Policies

1. Create two users with different org_ids
2. Log in as each user and verify they can only see their org's data
3. Test admin vs client permissions

## Deployment

### Netlify

1. Push code to GitHub
2. Connect repository to Netlify
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Add environment variables in Netlify dashboard
5. Deploy!

### Vercel

```bash
npm install -g vercel
vercel
```

## Next Steps

After scaffolding is complete, implement these features in order:

1. **File Upload/Download** - Complete file sharing functionality
2. **Task Management** - Full CRUD for tasks
3. **User Invitations** - Admin can invite new users
4. **Dashboard Analytics** - Charts and metrics
5. **Notifications** - Real-time notifications
6. **Iframe Embedding** - Embed dashboards in external sites

## Scripts

- `npm run dev` - Start development server with Netlify Dev (includes functions)
- `npm run dev:next` - Start Next.js dev server only (without Netlify)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run supabase:gen-types` - Generate TypeScript types from Supabase schema

## Environment Variables

See `.env.example` for required environment variables.

## License

Private and proprietary.

## Support

For issues and questions, contact the development team.
