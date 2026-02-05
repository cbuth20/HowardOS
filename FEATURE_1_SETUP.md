# Feature 1: File Upload/Download - Setup Instructions

## ✅ What's Been Built

### API Routes
- ✅ `/api/files/upload` - Upload files with multipart form data
- ✅ `/api/files` - List files (GET) and Delete files (DELETE)
- ✅ `/api/files/download` - Download files

### Components
- ✅ `FileUpload` - Drag & drop upload component
- ✅ `FileList` - Display files with download/delete actions

### Pages
- ✅ `/files` - Main files page with role-based views
  - **Admin view**: See all org files or just their files
  - **Client view**: See only their files

### Features
- ✅ Drag & drop file upload
- ✅ Multiple file upload
- ✅ File size validation (50MB max)
- ✅ Download files
- ✅ Delete files (admins + file owners)
- ✅ Activity logging
- ✅ Role-based access control

## 🔧 Setup Required

### Step 1: Run Storage Migration

Go to **Supabase Dashboard > SQL Editor** and run:

```sql
-- Copy contents of supabase/migrations/002_storage_setup.sql
```

This creates:
- Storage bucket named 'files'
- Storage policies for org-level access control

### Step 2: Test the Feature

1. Go to http://localhost:8888/files
2. Click "Upload Files"
3. Drag & drop or select files
4. Upload and verify they appear in the list
5. Try downloading a file
6. Try deleting a file (if admin)

### Step 3: Test Role-Based Views

**As Admin:**
- Should see "All Files" and "My Files" toggle
- Can delete any file
- Can see files uploaded by anyone in org

**As Client:**
- Only sees "My Files" (no toggle)
- Can only delete files they uploaded
- Cannot see other users' files

## File Storage Structure

Files are stored in Supabase Storage with this path pattern:
```
files/{org_id}/{folder_path}/{file_id}.{extension}
```

Example:
```
files/00000000-0000-0000-0000-000000000001/report.pdf
```

## Database Records

Each uploaded file creates:
1. **Storage object** - Actual file in Supabase Storage
2. **Database record** - Metadata in `files` table
3. **Activity log** - Audit trail in `activity_log` table

## API Usage

### Upload File
```javascript
const formData = new FormData()
formData.append('file', file)
formData.append('folderPath', '/')
formData.append('description', 'Optional description')

const response = await fetch('/api/files/upload', {
  method: 'POST',
  body: formData,
})
```

### List Files
```javascript
const response = await fetch('/api/files?folderPath=/&view=all')
const data = await response.json()
```

### Download File
```javascript
const response = await fetch(`/api/files/download?id=${fileId}`)
const blob = await response.blob()
```

### Delete File
```javascript
const response = await fetch(`/api/files?id=${fileId}`, {
  method: 'DELETE',
})
```

## Security Features

### Storage Policies
- ✅ Users can only access files from their org
- ✅ Users can upload to their org folder
- ✅ Users can delete files they uploaded
- ✅ Admins can delete any file in their org

### API Validation
- ✅ Authentication required for all endpoints
- ✅ Org membership verified
- ✅ File size limits enforced
- ✅ Permission checks before delete

### RLS Policies
- ✅ Database queries filtered by org_id
- ✅ Users can only see files in their org
- ✅ Role-based access in UI and API

## Next Steps

### Future Enhancements (Not in scope for now)
- 📁 Folder organization
- 🔍 Search and filters
- 👁️ File preview (PDF, images)
- 🔗 Share links (public/private)
- ⚡ Bulk operations
- 📊 Storage usage metrics
- 🗂️ File versioning

### Continue to Feature 2: Task Management
Once file upload is working, we'll move to tasks!

## Troubleshooting

### Upload fails with "Failed to upload file"
- Check storage bucket exists in Supabase
- Verify storage policies are applied
- Check file size is under 50MB

### Can't see uploaded files
- Verify user has profile with org_id set
- Check RLS policies on files table
- Ensure storage policies match org_id pattern

### Download doesn't work
- Check file still exists in storage
- Verify storage path in database matches actual file
- Check browser console for errors

---

**Status**: Feature 1 ready to test after running storage migration!
