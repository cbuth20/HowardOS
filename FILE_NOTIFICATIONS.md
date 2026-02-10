# File Notification Emails

## 🎯 How It Works

When an admin shares files with users, email notifications are automatically sent to:

1. **All admins** in the organization
2. **The users** who were shared the file (clients)
3. **Excludes** the person who shared the file (no self-notification)

## 📧 Email Content

**Subject**: `Howard Financial portal: New files were shared by [Uploader Name]`

**Content includes**:
- Howard Financial logo
- Heading: "New files were shared by [Name]."
- Personalized greeting: "Hi [Recipient Name],"
- List of files that were shared (bulleted)
- "See files" button linking to `/files` page

**Design**: Matches your screenshot with Howard Financial branding (#B8926A gold, #0A2540 navy)

---

## 🔄 The Flow

### When Admin Shares a File:

1. **Admin selects file** in Files page
2. **Shares with users** (selects which users)
3. **File permissions created** in database
4. **Emails sent** to:
   - All admins in the org (except the sharer)
   - All users who were shared the file
5. **Activity logged** in activity_log table

### Recipients See:
- Professional email from HowardOS
- List of files shared
- "See files" button to view them

---

## 📁 Files Modified

### New Function Added
- **`src/lib/email/resend.ts`**
  - `sendFileNotificationEmail()` function
  - Professional HTML email template
  - Howard Financial branding

### Updated Endpoint
- **`netlify/functions/files-share.ts`**
  - Imports `sendFileNotificationEmail`
  - Gets uploader name from profiles
  - Fetches all admins in org
  - Fetches users who were shared the file
  - Sends emails to all recipients (parallel)
  - Logs success/errors
  - Doesn't fail if email fails (graceful degradation)

---

## 🧪 Testing

### Test the Flow:

1. **Login as admin**
2. **Upload a file** (or use existing)
3. **Share the file** with yourself (for testing):
   - Click "Share" on a file
   - Select your user
   - Click "Save"
4. **Check your email** (cbuth20@gmail.com for Resend testing)
5. **Should receive**:
   - Email from HowardOS
   - Subject: "Howard Financial portal: New files were shared by [Your Name]"
   - Your name as uploader
   - File name in the list
   - "See files" button

---

## 🎨 Email Features

✅ **Howard Financial logo** (gold "H" box)
✅ **Professional layout** matching your screenshot
✅ **File list** (bulleted, styled)
✅ **"See files" CTA button** (navy, links to /files)
✅ **Personalized** with recipient name and uploader name
✅ **Responsive design** (mobile-friendly)
✅ **Footer** with company info

---

## 🚀 Production Ready

Once your domain is verified:

1. Set in `.env.local`:
   ```
   RESEND_FROM_EMAIL=no-reply@howard-financial.com
   ```

2. All emails will come from: `HowardOS <no-reply@howard-financial.com>`

3. Works with any email address (not just testing)

---

## 🔧 Configuration

### Current Behavior:
- ✅ Sends to all admins
- ✅ Sends to users who were shared the file
- ✅ Excludes the uploader (no self-notification)
- ✅ Parallel email sending (fast)
- ✅ Graceful failure (doesn't break file sharing if email fails)

### To Customize:

Want to change who receives notifications? Edit `netlify/functions/files-share.ts` around line 75-125.

Examples:
- **Only send to clients**: Remove admins from recipients list
- **Only send to admins**: Remove sharedUsers from recipients list
- **Add CC to specific email**: Add to recipients array

---

## 📊 Logging

Check Netlify function logs for:
```
Sent file notification emails to X recipient(s)
```

Or if errors:
```
Error sending file notification emails: [error details]
```

The file sharing will still succeed even if emails fail.

---

## 🐛 Troubleshooting

### Emails not sending?
1. Check Resend domain is verified
2. Verify `RESEND_FROM_EMAIL` is set
3. Check Netlify function logs for errors
4. Test with your own email (Resend testing)

### Wrong recipient list?
1. Check profiles table has correct `role` values
2. Verify `is_active: true` for users
3. Check `org_id` matches

### Email looks wrong?
1. Open email in different email client
2. Check HTML rendering
3. Test on mobile device
