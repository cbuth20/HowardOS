# Onboarding Flow - Set Password

## 🎯 How It Works

### For New Users (First Time Login)

1. **Admin invites user** via User Management page
   - User record created with `is_active: false`
   - Magic link sent via Resend

2. **User clicks magic link** in email
   - Authenticates via Supabase
   - Auth callback checks `is_active` status

3. **Redirected to Set Password page** (`/set-password`)
   - Shows "Activate your account" heading
   - Email field (pre-filled, read-only)
   - Password field (min 8 characters)
   - Confirm password field
   - Show/hide password toggles

4. **User sets password**
   - Password validated (min 8 chars, must match)
   - Updates Supabase auth password
   - Sets `is_active: true` in profile
   - Redirects to dashboard

### For Existing Users (Already Active)

1. **User clicks magic link**
   - Auth callback checks `is_active: true`
   - Redirects directly to dashboard (skips set-password page)

---

## 📁 Files Created/Modified

### New Files
- **`src/app/(auth)/set-password/page.tsx`**
  - Onboarding UI (similar to your screenshot)
  - Password validation
  - Account activation logic

### Modified Files
- **`src/app/auth/callback/route.ts`**
  - Added `is_active` check
  - Redirects first-time users to `/set-password`

---

## 🔐 Security Features

- **Password Requirements**: Minimum 8 characters
- **Confirmation**: Must match password
- **Show/Hide Toggle**: Eye icon to reveal password
- **Session Check**: Must be authenticated to access set-password page
- **Active Check**: Already active users redirect to dashboard

---

## 🎨 UI Features (Matching Your Screenshot)

✅ **Logo at top**
✅ **"Activate your account" heading**
✅ **Email field (read-only, pre-filled)**
✅ **"Set a password" field with show/hide**
✅ **"Confirm password" field**
✅ **"Activate account" button**
✅ **Terms of Service text**
✅ **"Already have an account?" link**

*(Skipped "Continue with Google" - not implementing OAuth)*

---

## 🧪 Testing the Flow

### Test with Your Own Email (Resend Testing)

1. **Invite yourself** from User Management
   - Email: `cbuth20@gmail.com` (your Resend account email)
   - Name: Test User
   - Role: Client

2. **Check your inbox**
   - Should receive invitation email from Resend

3. **Click the magic link**
   - Should redirect to `/set-password`
   - Email pre-filled
   - Set a password (min 8 chars)
   - Click "Activate account"

4. **Should redirect to dashboard**
   - User is now `is_active: true`
   - Can log in normally with password

5. **Try clicking magic link again**
   - Should redirect directly to dashboard (skip set-password)

---

## 🚀 Next Steps

Once your domain is verified in Resend:

1. Add to `.env.local`:
   ```
   RESEND_FROM_EMAIL=no-reply@howard-financial.com
   ```

2. Restart your dev server

3. Invite users with any email - they'll all receive the invitation!

---

## 🐛 Troubleshooting

### "User not found" error
- User might not have been created properly
- Check Supabase auth.users table

### Stuck on set-password page
- Check if `is_active` column exists in profiles table
- Verify Supabase client has permission to update profiles

### Password not saving
- Check browser console for errors
- Verify Supabase auth is working (`supabase.auth.updateUser`)

### Redirects to dashboard before setting password
- User might already be `is_active: true`
- Check profiles table in Supabase dashboard
