# Netlify Development Setup

## What Changed

Your project is now configured to use **Netlify Dev** for local development, which means:

✅ Next.js app runs alongside Netlify Functions
✅ Functions available at `/.netlify/functions/[name]`
✅ Environment matches production deployment
✅ Test full Netlify features locally

## Quick Start

```bash
# Install dependencies
npm install

# Start Netlify Dev (runs Next.js + Functions)
# Uses npx - no need to install netlify-cli separately
npm run dev

# First run will download Netlify CLI (~10 seconds)
# Subsequent runs are instant

# Access the app
http://localhost:8888

# Test sample function
http://localhost:8888/.netlify/functions/hello
```

## Project Structure

```
HowardOS/
├── src/app/api/              # Next.js API Routes
│   └── (use for standard CRUD, auth-dependent logic)
│
├── netlify/functions/        # Netlify Functions
│   ├── hello.ts             # Sample function
│   └── README.md            # When to use guide
│
├── netlify.toml             # Netlify configuration
└── package.json             # Updated with netlify-cli
```

## Key Files Added/Updated

### 1. `package.json`
- Uses `npx netlify dev` (no local install needed)
- Added `@netlify/functions` for TypeScript types
- `dev` script uses npx for latest version
- Added `dev:next` for Next.js only mode
- Removed deprecated Supabase packages

### 2. `netlify.toml`
- Build configuration
- Dev server settings
- Functions directory config
- Security headers

### 3. `netlify/functions/hello.ts`
- Sample function showing the pattern
- Demonstrates GET/POST handling
- Shows error handling

### 4. `.env.example`
- Updated default port to 8888 (Netlify Dev default)

## npm Scripts

```bash
# Main development (Netlify + Next.js + Functions)
npm run dev

# Next.js only (if you need to bypass Netlify)
npm run dev:next

# Build for production
npm run build

# Type checking
npm run type-check

# Generate Supabase types
npm run supabase:gen-types
```

## When to Use What

### Next.js API Routes (`src/app/api/`)
✅ CRUD operations
✅ Database queries
✅ Authentication-dependent logic
✅ Server actions
✅ Middleware integration

**Example**: `src/app/api/files/upload/route.ts`

### Netlify Functions (`netlify/functions/`)
✅ Webhooks (Stripe, GitHub, etc.)
✅ Background jobs
✅ Scheduled tasks (cron)
✅ Long-running processes
✅ Third-party API integrations

**Example**: `netlify/functions/process-upload.ts`

## Environment Variables

Both Next.js and Netlify Functions use the same `.env.local` file in development:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key

# App URL (Netlify Dev default)
NEXT_PUBLIC_APP_URL=http://localhost:8888

# Add any function-specific keys
WEBHOOK_SECRET=your_secret
```

For production, set these in **Netlify Dashboard** > Site Settings > Environment Variables.

## Testing the Setup

After running `npm install` and `npm run dev`:

### 1. Test Next.js App
```bash
# Should show login page
open http://localhost:8888
```

### 2. Test Sample Function
```bash
# Should return JSON response
curl http://localhost:8888/.netlify/functions/hello

# Or in browser
open http://localhost:8888/.netlify/functions/hello
```

### 3. Verify Both Work Together
```bash
# Navigate the app and verify functions are accessible
# Both should run simultaneously
```

## Common Ports

- **8888** - Netlify Dev (proxies to Next.js)
- **3000** - Next.js (running behind Netlify Dev)
- **54321** - Supabase (if using local)
- **54324** - Inbucket (local email testing)

## Deployment

When you deploy to Netlify:

1. **Connect repo** to Netlify
2. Netlify auto-detects Next.js
3. Uses `netlify.toml` for configuration
4. Deploys both app AND functions
5. Functions available at `https://yoursite.netlify.app/.netlify/functions/[name]`

No extra configuration needed!

## Troubleshooting

### Port 8888 already in use
```bash
# Kill the process
lsof -ti:8888 | xargs kill -9

# Or specify different port
netlify dev --port 9999
```

### Functions not found
- Check `netlify.toml` has correct `functions.directory`
- Verify function files are in `netlify/functions/`
- Restart `npm run dev`

### Environment variables not loading
- File must be named `.env.local` (not `.env`)
- Restart dev server after changes
- Check for typos in variable names

### Need to bypass Netlify Dev
```bash
# Use Next.js directly
npm run dev:next

# App will run on port 3000
# Functions won't be available
```

## Next Steps

1. Run `npm install` to get Netlify CLI
2. Start dev server: `npm run dev`
3. Test the sample function
4. Start building your API endpoints!

## Resources

- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Netlify Dev Docs](https://docs.netlify.com/cli/local-development/)
- [Next.js on Netlify](https://docs.netlify.com/frameworks/next-js/)
- [Functions Examples](https://functions.netlify.com/examples/)

---

**Ready to install!** Run `npm install` to get started.
