# Storage Security Migration - Private Buckets

## Overview
This migration makes all Supabase storage buckets private and implements authenticated proxy endpoints for secure access to avatars, logos, and files.

## Changes Made

### 1. Database Migration (`025_make_all_storage_private.sql`)
- **Made all buckets private:**
  - `avatars` bucket: PUBLIC → PRIVATE
  - `logos` bucket: PUBLIC → PRIVATE
  - `files` bucket: Already PRIVATE (from migration 024)

- **URL conversion in database:**
  - Converted `profiles.avatar_url` from public URLs to proxy URLs
  - Converted `organizations.logo_url` from public URLs to proxy URLs
  - Format: `/api/storage-avatar?path={path}` and `/api/storage-logo?path={path}`

### 2. New API Endpoints

#### `netlify/functions/storage-avatar.ts`
- Authenticated proxy for avatar images
- Supports both Bearer token and cookie-based authentication
- Returns images with caching headers (1 hour)
- Usage: `/api/storage-avatar?path={userId}/avatar.{ext}`

#### `netlify/functions/storage-logo.ts`
- Authenticated proxy for organization logos
- Supports both Bearer token and cookie-based authentication
- Returns images with caching headers (1 hour)
- Usage: `/api/storage-logo?path=organizations/{orgId}/logo.{ext}`

#### `netlify/functions/storage-signed-url.ts`
- General-purpose signed URL generator
- Supports avatars, logos, and files buckets
- Validates permissions for files bucket (org-based access)
- Returns temporary signed URLs (default 1 hour, max 7 days)

### 3. Updated Existing Endpoints

#### `netlify/functions/files-download.ts`
- Added cookie-based authentication support
- Now works with both Authorization headers and session cookies

### 4. Frontend Updates

#### `src/components/onboarding/WelcomeModal.tsx`
- Updated `uploadAvatar()` to return proxy URL instead of public URL

#### `src/components/users/EditUserModal.tsx`
- Updated `uploadAvatar()` to return proxy URL instead of public URL

#### `src/components/clients/OrganizationDetailModal.tsx`
- Updated `handleLogoUpload()` to use proxy URL instead of public URL

## Authentication Method

The proxy endpoints support **two authentication methods**:

1. **Authorization Header** (for API calls):
   ```
   Authorization: Bearer {access_token}
   ```

2. **Session Cookies** (for browser img tags):
   ```
   Cookie: sb-{project}-auth-token={token_data}
   ```

Since this app uses `@supabase/ssr` with cookies, regular `<img>` tags will automatically send auth cookies, making images work seamlessly without additional JavaScript.

## Security Benefits

1. **Private by default:** All storage buckets require authentication
2. **RLS enforcement:** File access controlled by Supabase RLS policies
3. **Audit trail:** All file access can be logged (already implemented for downloads)
4. **Token validation:** Every request validates the user's authentication
5. **Org isolation:** Files bucket validates org membership before serving files

## How It Works

### Upload Flow
1. User uploads avatar/logo through frontend
2. File uploaded to private Supabase storage bucket
3. Database stores proxy URL path (e.g., `/api/storage-avatar?path={userId}/avatar.jpg`)
4. No public URL is generated or stored

### Access Flow
1. Browser requests image: `<img src="/api/storage-avatar?path=..." />`
2. Request automatically includes auth cookies
3. Proxy endpoint validates authentication from cookies
4. If authorized, streams image from private storage
5. Browser displays image with 1-hour cache

## Migration Steps

1. **Push migration to Supabase:**
   ```bash
   npx supabase db push
   ```

2. **Deploy updated functions:**
   ```bash
   netlify deploy --prod
   ```

3. **Verify in production:**
   - Check that avatars display correctly
   - Check that org logos display correctly
   - Verify unauthorized users cannot access images

## Rollback Plan

If issues occur, you can rollback by:

1. Revert buckets to public:
   ```sql
   UPDATE storage.buckets SET public = true WHERE id IN ('avatars', 'logos');
   ```

2. Convert URLs back to public format:
   ```sql
   UPDATE profiles
   SET avatar_url = regexp_replace(
     avatar_url,
     '^/api/storage-avatar\\?path=',
     'https://{project}.supabase.co/storage/v1/object/public/avatars/'
   )
   WHERE avatar_url LIKE '/api/storage-avatar%';

   UPDATE organizations
   SET logo_url = regexp_replace(
     logo_url,
     '^/api/storage-logo\\?path=',
     'https://{project}.supabase.co/storage/v1/object/public/logos/'
   )
   WHERE logo_url LIKE '/api/storage-logo%';
   ```

3. Revert frontend code changes

## Testing Checklist

- [ ] Run migration on staging/local environment
- [ ] Test avatar upload in onboarding flow
- [ ] Test avatar upload in user edit modal
- [ ] Test logo upload in org settings
- [ ] Test avatar display in sidebar
- [ ] Test logo display in org switcher
- [ ] Test logo display in org list
- [ ] Test logo display in channel list
- [ ] Test file downloads still work
- [ ] Test as different user roles (admin, manager, user, client)
- [ ] Verify unauthorized access is blocked
- [ ] Check browser console for errors
- [ ] Verify images are cached properly

## Performance Considerations

- **Caching:** Images are cached for 1 hour in browser
- **CDN:** Consider adding Netlify CDN caching for proxy endpoints
- **Optimization:** Consider adding image resizing/optimization in proxy endpoints

## Future Enhancements

1. **Image optimization:** Add on-the-fly image resizing and format conversion
2. **CDN integration:** Add longer cache headers with cache invalidation
3. **Rate limiting:** Add rate limiting to prevent abuse
4. **Analytics:** Track image access patterns
5. **Thumbnails:** Generate and serve thumbnail versions for lists/avatars
