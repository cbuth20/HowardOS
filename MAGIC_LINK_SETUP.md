# Magic Link Authentication Setup Guide

This guide walks you through the complete setup of magic link authentication for HowardOS using Resend.

## ✅ What's Been Implemented

### 1. Email Service (Resend Integration)
- **File**: `src/lib/email/resend.ts`
- Professional, branded email templates for:
  - Magic link login emails
  - User invitation emails
- Personalized with Howard Financial branding

### 2. Updated Login Page
- **File**: `src/app/(auth)/login/page.tsx`
- Toggle between **Magic Link** and **Password** login
- Magic link is the default method
- Email placeholder updated to `@howard-financial.com`
- Success/error message handling

### 3. Auth Callback Handler
- **File**: `src/app/auth/callback/route.ts`
- Processes magic link clicks from emails
- Exchanges auth codes for user sessions
- Redirects to dashboard on success

### 4. User Invitation with Magic Links
- **File**: `netlify/functions/users-invite.ts`
- Creates new users via Supabase Admin API
- Generates magic links for new users
- Sends branded invitation emails via Resend
- Includes role information and personalized message

### 5. Send Magic Link to Existing Users
- **File**: `netlify/functions/users-send-magic-link.ts`
- New API endpoint for admins to send magic links
- **Updated**: `src/app/(dashboard)/users/page.tsx`
- Added "Send" button (📧) next to each active user
- Useful for password resets or quick access

## 🔧 Required Supabase Configuration

### Step 1: Disable Supabase Email Templates

**IMPORTANT**: You must disable Supabase's email sending so ONLY Resend sends emails.

1. Go to your Supabase Dashboard → **Authentication** → **Email Templates**

2. For EACH email template (Confirm signup, Magic Link, etc.):
   - Click on the template
   - **Disable the "Enable" toggle** OR
   - Clear out the email subject/body to prevent sending

3. **Alternative**: Go to **Project Settings** → **Authentication** → **SMTP Settings**
   - Set **Enable Custom SMTP** to OFF
   - This will prevent Supabase from sending any emails

### Step 2: Configure Redirect URLs

Go to **Authentication** → **URL Configuration**, add to **Redirect URLs**:
```
http://localhost:8888/auth/callback
https://howard-financial.com/auth/callback
https://your-netlify-domain.netlify.app/auth/callback
```

### Step 3: Configure Auth Settings (Optional but Recommended)

Go to **Authentication** → **Providers** → **Email**:
- Set **Confirm email** to OFF (we handle this via magic links)
- Set **Secure email change** to your preference
- Set **Email OTP expiry** to 3600 seconds (1 hour)

### Step 4: Update Environment Variables

Make sure your `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=https://psjesaadhiypxbkwundv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=http://localhost:8888
RESEND_API_KEY=re_cUgZ5ytt_F8vmABCc77CancZkgzabXspC
```

## 🧪 Testing the Setup

### Test 1: Magic Link Login
1. Go to `http://localhost:8888/login`
2. Ensure **Magic Link** tab is selected (default)
3. Enter a test email
4. Click **Send Magic Link**
5. Check your email inbox
6. Click the magic link in the email
7. You should be redirected to `/dashboard`

### Test 2: User Invitation
1. Go to **User Management** page
2. Click **Invite User**
3. Fill in email, name, and role
4. Click **Send Invitation**
5. Check the user's email inbox
6. They should receive a branded invitation email
7. Click the link to accept invitation

### Test 3: Send Magic Link to Existing User
1. Go to **User Management** page
2. Find an active user
3. Click the **Send** button (📧) next to their name
4. They should receive a magic link email
5. Click the link to sign in

## 🎨 Email Branding

Both email templates feature:
- **Howard Financial branding**
- **Professional design** with the navy color scheme (#0A2540)
- **Responsive layout** that works on mobile and desktop
- **Clear CTAs** with prominent action buttons
- **Security messaging** (link expiration, ignore if unexpected)

## 🔐 Security Features

- Magic links expire after 1 hour (Supabase default)
- Links are single-use only
- Email verification required
- Admin-only endpoints for sending magic links
- Service role key never exposed to client

## 📝 API Endpoints

### `/api/users-invite` (POST)
Creates new user and sends invitation email.

**Request**:
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "client",
  "orgId": "org-id"
}
```

### `/api/users-send-magic-link` (POST)
Sends magic link to existing user.

**Request**:
```json
{
  "userId": "user-uuid"
}
```

## 🚀 Next Steps

1. **Verify DNS records in Squarespace** (as discussed in your ChatGPT conversation)
   - Add DKIM TXT record: `resend._domainkey`
   - Add/update SPF TXT record
   - Add DMARC TXT record: `_dmarc`

2. **Verify domain in Resend dashboard**
   - Go to Resend → Domains
   - Click "I've added the records"
   - Wait for verification (usually 1-5 minutes)

3. **Test in production**
   - Deploy to Netlify
   - Test magic link flow end-to-end
   - Monitor Resend dashboard for email delivery

4. **Optional: Customize email templates**
   - Edit `src/lib/email/resend.ts`
   - Update HTML/CSS to match your exact branding
   - Add logo images (host on CDN and link in email)

## 🐛 Troubleshooting

### Magic link doesn't work
- Check redirect URLs in Supabase are correct
- Verify `NEXT_PUBLIC_APP_URL` matches your domain
- Check browser console for errors

### Emails not sending
- Verify `RESEND_API_KEY` is set correctly
- Check domain is verified in Resend
- Look for errors in Netlify function logs

### User creation fails
- Check `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify user doesn't already exist
- Check Netlify function logs for detailed errors

## 📞 Support

If you encounter issues:
1. Check Netlify function logs
2. Check Supabase logs (Authentication → Logs)
3. Check Resend logs (Emails → Activity)
4. Review browser console for client-side errors
