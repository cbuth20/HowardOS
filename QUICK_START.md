# Quick Start: Magic Link Setup

## 🚨 CRITICAL: Stop Supabase from Sending Emails

**Before testing**, you MUST disable Supabase's passwordless email feature:

### Disable Email (Passwordless) Provider
1. Go to: https://supabase.com/dashboard/project/psjesaadhiypxbkwundv/auth/providers
2. Find **Email** in the providers list
3. Click to expand it
4. Make sure:
   - ✅ **Enable Email provider** is ON (for password auth)
   - ❌ **Enable Email Signup** can be ON or OFF (your choice)
   - ❌ **Confirm email** should be OFF (we handle via magic links)

**Important**: The email templates page does NOT have a toggle - it's just the template content. The actual control is in the providers settings above.

---

## ✅ Setup Checklist

### 1. Supabase Configuration
- [ ] Disable "Confirm email" in Email provider settings (see above)
- [ ] Add redirect URLs:
  - `http://localhost:8888/auth/callback`
  - `https://howard-financial.com/auth/callback`
- [ ] (Optional) Neuter magic link template with "This method is disabled"

### 2. Resend/DNS Configuration
- [ ] Add DKIM TXT record in Squarespace: `resend._domainkey`
- [ ] Add/update SPF TXT record
- [ ] Add DMARC TXT record: `_dmarc`
- [ ] Verify domain in Resend dashboard

### 3. Environment Variables (Already Set ✅)
```env
RESEND_API_KEY=re_cUgZ5ytt_F8vmABCc77CancZkgzabXspC
NEXT_PUBLIC_APP_URL=http://localhost:8888
SUPABASE_SERVICE_ROLE_KEY=[already set]
```

---

## 🧪 Test It

### Test 1: Magic Link Login
```bash
npm run dev
# or
netlify dev
```

1. Go to http://localhost:8888/login
2. Enter your email
3. Click "Send Magic Link"
4. Check inbox - should receive email from **no-reply@howard-financial.com**
5. Click the link → should redirect to dashboard

### Test 2: Invite New User
1. Go to User Management page
2. Click "Invite User"
3. Fill in details and submit
4. New user receives invitation from **no-reply@howard-financial.com**

### Test 3: Send Magic Link to Existing User
1. Go to User Management
2. Click 📧 button next to any user
3. They receive magic link from **no-reply@howard-financial.com**

---

## 🐛 Troubleshooting

### Still receiving Supabase emails?
- Check that "Confirm email" is OFF in Email provider settings
- Search your code for `signInWithOtp` - we shouldn't be using it anywhere
- Verify you're using our custom `/api/auth-magic-link` endpoint
- Clear browser cache and restart dev server

### Email not arriving?
- Check Resend dashboard for delivery status
- Verify domain is verified in Resend
- Check spam folder
- Look at Netlify function logs: `netlify dev` output

### Magic link doesn't work?
- Check redirect URLs in Supabase match exactly
- Verify `NEXT_PUBLIC_APP_URL` is correct
- Check browser console for errors

---

## 📧 What You'll See

All emails will come from: **HowardOS <no-reply@howard-financial.com>**

They'll have:
- ✅ Howard Financial branding
- ✅ Navy color scheme (#0A2540)
- ✅ Professional design
- ✅ Clear call-to-action buttons
- ✅ Security messaging

---

## 🎯 Key Changes Made

1. **Login page**: Now sends emails via our custom `/api/auth-magic-link` endpoint
2. **User invitations**: Uses `createUser()` instead of `inviteUserByEmail()`
3. **Magic links**: Generated via Admin API, sent ONLY through Resend
4. **User management**: Added "Send Magic Link" button for existing users

All emails go through Resend API, bypassing Supabase completely! 🎉
