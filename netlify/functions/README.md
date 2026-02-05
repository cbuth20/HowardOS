# Netlify Functions API

This directory contains all serverless functions for HowardOS.

## Architecture

We use Netlify Functions instead of Next.js API routes for:
- ✅ Better control over serverless function behavior
- ✅ Clearer separation between frontend and API
- ✅ Easier debugging and monitoring
- ✅ Independent function deployment

## API Endpoints

All accessible at `/api/*` (redirects to `/.netlify/functions/*`):

**Files:**
- `GET /api/files` - List files
- `DELETE /api/files?id={id}` - Delete file
- `POST /api/files-upload` - Upload file
- `GET /api/files-download?id={id}` - Download file
- `POST /api/files-share` - Share file

**Users:**
- `GET /api/users-clients` - List clients
- `POST /api/users-invite` - Invite user

## Development

```bash
netlify dev  # Runs Next.js + Functions locally
```

## Adding Functions

Create `{name}.ts` in this directory, export a handler:

```typescript
import { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  }
}
```
