# Apply Database Migration

You need to add the `dashboard_iframe_url` column to your profiles table.

## Option 1: Supabase Dashboard (Recommended)

1. Go to https://psjesaadhiypxbkwundv.supabase.co
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Paste this SQL:

```sql
-- Add dashboard_iframe_url to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS dashboard_iframe_url TEXT;

-- Add comment
COMMENT ON COLUMN profiles.dashboard_iframe_url IS 'Custom iframe URL for client dashboard analytics';
```

5. Click **Run** or press Cmd+Enter

## Option 2: Command Line (if you have psql)

```bash
# Copy the connection string from Supabase dashboard, then:
psql "postgresql://postgres:[YOUR-PASSWORD]@db.psjesaadhiypxbkwundv.supabase.co:5432/postgres" \
  -f supabase/migrations/002_add_dashboard_urls.sql
```

## Verify Migration

Run this query to verify:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'dashboard_iframe_url';
```

You should see one row returned with the column info.
