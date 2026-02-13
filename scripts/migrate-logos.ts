/**
 * One-time script: Copy existing logo files from `files` bucket to `logos` bucket.
 *
 * Run after applying migration 024_secure_storage.sql:
 *   npx tsx scripts/migrate-logos.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 * (reads from .env.local automatically).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Parse .env.local without requiring dotenv
const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIndex = trimmed.indexOf('=')
  if (eqIndex === -1) continue
  const key = trimmed.slice(0, eqIndex)
  const value = trimmed.slice(eqIndex + 1)
  if (!process.env[key]) {
    process.env[key] = value
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('Fetching organizations with logos...')

  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name, logo_url')
    .not('logo_url', 'is', null)

  if (orgsError) {
    console.error('Error fetching organizations:', orgsError.message)
    process.exit(1)
  }

  if (!orgs || orgs.length === 0) {
    console.log('No organizations with logos found. Nothing to migrate.')
    return
  }

  console.log(`Found ${orgs.length} organization(s) with logos.\n`)

  let success = 0
  let skipped = 0
  let failed = 0

  for (const org of orgs) {
    // Extract the storage path from the URL
    // URL format: https://<project>.supabase.co/storage/v1/object/public/files/organizations/<orgId>/logo.<ext>
    // or already migrated: .../public/logos/organizations/...
    const url: string = org.logo_url

    if (url.includes('/public/logos/')) {
      console.log(`  [skip] ${org.name} — already using logos bucket`)
      skipped++
      continue
    }

    const match = url.match(/\/storage\/v1\/object\/public\/files\/(.+)$/)
    if (!match) {
      console.log(`  [skip] ${org.name} — URL doesn't match expected pattern: ${url}`)
      skipped++
      continue
    }

    const storagePath = match[1] // e.g. organizations/<orgId>/logo.png

    console.log(`  Migrating ${org.name} — ${storagePath}`)

    // Download from files bucket
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('files')
      .download(storagePath)

    if (downloadError) {
      console.error(`    [FAIL] Download error: ${downloadError.message}`)
      failed++
      continue
    }

    // Upload to logos bucket
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(storagePath, fileData, {
        upsert: true,
        contentType: fileData.type || 'image/png',
      })

    if (uploadError) {
      console.error(`    [FAIL] Upload error: ${uploadError.message}`)
      failed++
      continue
    }

    console.log(`    [OK] Copied to logos bucket`)
    success++
  }

  console.log(`\nDone. ${success} migrated, ${skipped} skipped, ${failed} failed.`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
