# Netlify Functions Migration Guide

## Why Migrate to Netlify Functions?

### Current Issue (Next.js API Routes)
The `src/app/api/*` approach works but has limitations:
- Less explicit control over serverless behavior
- Tightly coupled to Next.js runtime
- Harder to debug and monitor separately
- Mixed concerns between frontend and API

### New Approach (Netlify Functions)
Explicit functions in `netlify/functions/*`:
- ✅ Direct control over function configuration
- ✅ Clear separation of concerns
- ✅ Better debugging with Netlify's function logs
- ✅ Can deploy/update functions independently
- ✅ Standard Netlify Functions pattern
- ✅ Easier to add background jobs, webhooks, etc.

## What's Been Set Up

### 1. Configuration (`netlify.toml`)
- ✅ Configured functions directory
- ✅ Added API redirect: `/api/*` → `/.netlify/functions/*`
- ✅ Set up CORS headers
- ✅ Configured Next.js plugin

### 2. First Function Created
- ✅ `netlify/functions/files.ts` - File operations (GET list, DELETE)

### 3. Documentation
- ✅ README in functions directory
- ✅ Migration guide (this file)

## What Needs to Be Done

### Remaining Functions to Create

**Files:**
- [ ] `netlify/functions/files-upload.ts` - File upload
- [ ] `netlify/functions/files-download.ts` - File download
- [ ] `netlify/functions/files-share.ts` - Share operations

**Users:**
- [ ] `netlify/functions/users-clients.ts` - List clients
- [ ] `netlify/functions/users-invite.ts` - Invite users

### Dependencies

Add to `package.json`:
```json
{
  "devDependencies": {
    "@netlify/functions": "^2.0.0"
  }
}
```

### Update Client Code

No changes needed! The `/api/*` routes still work because of the redirect in `netlify.toml`.

## Testing

### Local Development
```bash
# Install Netlify CLI (if not already)
npm install

# Start dev server with functions
netlify dev

# Functions available at:
# http://localhost:8888/api/files
# http://localhost:8888/api/users/clients
# etc.
```

### Testing a Function
```bash
# Test GET request
curl http://localhost:8888/api/files \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"

# Test DELETE request
curl -X DELETE http://localhost:8888/api/files?id=FILE_ID \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

## Migration Steps

1. **Install dependencies**
   ```bash
   npm install --save-dev @netlify/functions
   ```

2. **Create remaining functions** (copy pattern from `files.ts`)

3. **Test locally**
   ```bash
   netlify dev
   ```

4. **Verify all endpoints work**
   - Test file upload
   - Test file download
   - Test file sharing
   - Test user operations

5. **Deploy**
   ```bash
   netlify deploy --prod
   ```

6. **Clean up** (optional)
   - Can remove `src/app/api/*` routes once functions are working
   - Keep them for now as fallback

## Key Differences from Next.js API Routes

### Authentication
**Old (Next.js):**
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```

**New (Netlify):**
```typescript
const authHeader = event.headers.authorization
const token = authHeader.replace('Bearer ', '')
const supabase = createClient(url, key, {
  global: { headers: { Authorization: `Bearer ${token}` } }
})
```

### Request/Response
**Old (Next.js):**
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  return NextResponse.json({ data })
}
```

**New (Netlify):**
```typescript
export const handler: Handler = async (event) => {
  const params = event.queryStringParameters
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  }
}
```

## Benefits in Production

1. **Better Monitoring** - Netlify dashboard shows:
   - Function invocations
   - Execution time
   - Error rates
   - Logs per function

2. **Independent Scaling** - Functions scale separately from Next.js

3. **Easier Debugging** - Clear logs per function endpoint

4. **Background Jobs** - Easy to add cron jobs, webhooks

## Next Steps

1. Run `npm install --save-dev @netlify/functions`
2. Create remaining 5 functions
3. Test with `netlify dev`
4. Deploy when ready

Need help? Check the README in `netlify/functions/` or Netlify docs:
https://docs.netlify.com/functions/overview/
