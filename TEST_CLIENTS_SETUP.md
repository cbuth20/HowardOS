# Test Clients Setup Guide

Complete guide to setting up Target, Best Buy, and Danielle Guizio as test clients.

## 📋 Overview

We're setting up 3 client organizations to test the file sharing workflow:

1. **Target** - Retail client
2. **Best Buy** - Retail client
3. **Danielle Guizio** - Fashion brand client

## 🚀 Quick Setup (5 minutes)

### Step 1: Run the Migration

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Copy entire contents of: supabase/migrations/004_test_clients_setup.sql
```

This creates:
- ✅ 3 organizations (Target, Best Buy, Danielle Guizio)
- ✅ Helper view for client-accessible files
- ✅ Dev test accounts view
- ✅ File assignment column

### Step 2: Create Test User Accounts

Sign up 3 times at http://localhost:8888/login with these emails:

**Test Accounts:**
1. `target-client@test.com`
2. `bestbuy-client@test.com`
3. `danielle-client@test.com`

Use **magic link** auth (easier for testing).

### Step 3: Link Users to Organizations

After signing up, go to **Supabase Dashboard → SQL Editor**:

```sql
-- Get the user IDs first
SELECT id, email FROM auth.users WHERE email LIKE '%@test.com';

-- Then link each user to their organization
-- Target
UPDATE profiles
SET
  org_id = '10000000-0000-0000-0000-000000000001',
  role = 'client',
  full_name = 'Target Team'
WHERE email = 'target-client@test.com';

-- Best Buy
UPDATE profiles
SET
  org_id = '10000000-0000-0000-0000-000000000002',
  role = 'client',
  full_name = 'Best Buy Team'
WHERE email = 'bestbuy-client@test.com';

-- Danielle Guizio
UPDATE profiles
SET
  org_id = '10000000-0000-0000-0000-000000000003',
  role = 'client',
  full_name = 'Danielle Guizio'
WHERE email = 'danielle-client@test.com';
```

### Step 4: Verify Setup

Check that everything is set up correctly:

```sql
-- View all test accounts
SELECT * FROM dev_test_accounts;
```

You should see 3 client users linked to their respective organizations.

## 🔐 Quick Login for Testing

Access the dev login helper at:
```
http://localhost:8888/dev-login
```

This page:
- Shows all test accounts
- Sends magic links with one click
- Only works in development mode

## 🗂️ File Sharing Workflow

### Workflow Overview

```
Admin (Howard) → Upload File → Assign to Client(s) → Client Views → Client Downloads
```

### Implementation Plan

**Phase 1: Basic Assignment** (Current)
- Admin uploads file
- File stored in admin's org
- Manually share via file_permissions table

**Phase 2: UI for Sharing** (Next)
- "Share File" button in admin view
- Modal to select client users
- Automatically creates file_permissions records
- Client sees files in their view

**Phase 3: Advanced** (Future)
- Bulk sharing
- Share with entire client org
- Expiring links
- Download notifications

### Current Manual Sharing

To share a file with a client user right now:

```sql
-- Get file ID and client user ID
SELECT id, name FROM files WHERE name = 'your-file.pdf';
SELECT id, email FROM profiles WHERE email = 'target-client@test.com';

-- Share file with client
INSERT INTO file_permissions (file_id, user_id, permission)
VALUES (
  'FILE_ID_HERE',
  'USER_ID_HERE',
  'view'
);
```

## 📊 Organization IDs Reference

```
Howard Consulting (Admin):
00000000-0000-0000-0000-000000000001

Target (Client):
10000000-0000-0000-0000-000000000001

Best Buy (Client):
10000000-0000-0000-0000-000000000002

Danielle Guizio (Client):
10000000-0000-0000-0000-000000000003
```

## 🧪 Testing Scenarios

### Scenario 1: Admin Uploads File
1. Log in as admin (your account)
2. Go to /files
3. Upload a file
4. Verify it appears in "All Files"

### Scenario 2: Share with Client
1. Get file ID from upload
2. Run SQL to share with Target client
3. Log out admin
4. Log in as target-client@test.com
5. Verify file appears in their view

### Scenario 3: Client Can't See Other Clients' Files
1. Share file with Target only
2. Log in as Best Buy client
3. Verify they DON'T see the Target file

### Scenario 4: Multiple Clients
1. Share same file with multiple clients
2. Each client can see and download
3. Activity log tracks each download

## 🔄 Quick User Switching

**Method 1: Dev Login Page**
- Go to http://localhost:8888/dev-login
- Click "Send Magic Link" for any test account
- Check email, click link

**Method 2: Manual Login**
- Log out current user
- Go to /login
- Enter test email
- Use magic link

**Method 3: Multiple Browsers**
- Chrome: Admin account
- Firefox: Target client
- Safari: Best Buy client
- Brave: Danielle Guizio client

## 📝 Test Data Recommendations

**File Types to Test:**
- PDF (proposals, contracts)
- Images (product photos)
- Excel (reports, data)
- ZIP (multiple files)

**File Names:**
- "Target_Q4_Marketing_Plan.pdf"
- "BestBuy_Product_Catalog.xlsx"
- "DanielleGuizio_Spring_Collection.zip"

## 🎯 Next Steps: File Sharing UI

After test clients are set up, we'll build:

1. **Share File Modal**
   - Search/select client users
   - Set permissions (view/download only)
   - Send notification

2. **Client File View**
   - Show "Shared with me" section
   - Filter by shared date
   - Show who shared it

3. **Share Management**
   - Revoke access
   - Change permissions
   - View sharing history

## 🐛 Troubleshooting

**Test account doesn't show up in dev-login:**
- Run Step 3 SQL to link profile to org
- Check that email ends with @test.com

**Can't log in as test account:**
- Make sure you signed up first
- Check spam folder for magic link
- Try password reset if using password auth

**File doesn't show for client:**
- Check file_permissions table has entry
- Verify user_id matches client
- Check RLS policies allow access

## 📚 Related Files

- Migration: `supabase/migrations/004_test_clients_setup.sql`
- Dev Login: `src/app/(auth)/dev-login/page.tsx`
- File Permissions: Already in schema from 001_initial_schema.sql

---

**Status**: Ready to set up test clients!
**Next**: Build file sharing UI after clients are created
