import { HandlerEvent, HandlerResponse } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'

/**
 * Generate signed URLs for private storage buckets
 * Supports avatars, logos, and files buckets
 */
export const handler = withMiddleware(
  async (
    event: HandlerEvent,
    { user, profile, supabase }: AuthContext
  ): Promise<HandlerResponse> => {
    const params = event.queryStringParameters || {}
    const bucket = params.bucket
    const path = params.path
    const expiresIn = parseInt(params.expiresIn || '3600', 10) // Default 1 hour

    if (!bucket || !path) {
      throw { statusCode: 400, message: 'Missing bucket or path parameter' }
    }

    // Validate bucket
    const allowedBuckets = ['avatars', 'logos', 'files']
    if (!allowedBuckets.includes(bucket)) {
      throw { statusCode: 400, message: 'Invalid bucket. Must be: avatars, logos, or files' }
    }

    // Validate expiration time (max 7 days)
    if (expiresIn < 60 || expiresIn > 604800) {
      throw { statusCode: 400, message: 'expiresIn must be between 60 and 604800 seconds' }
    }

    try {
      // For avatars: users can access any avatar (team member photos are generally visible)
      // For logos: users can access any logo (org branding is generally visible)
      // For files: check org ownership (already handled by files-download.ts, but we'll add check here too)

      if (bucket === 'files') {
        // Extract org_id from path (format: {org_id}/...)
        const pathParts = path.split('/')
        const orgIdInPath = pathParts[0]

        // Verify user has access to this org
        if (profile.org_id !== orgIdInPath) {
          // Check if user is in this org via user_organizations
          const { data: membership } = await (supabase as any)
            .from('user_organizations')
            .select('id')
            .eq('user_id', user.id)
            .eq('org_id', orgIdInPath)
            .single()

          if (!membership) {
            throw { statusCode: 403, message: 'Access denied to this file' }
          }
        }
      }

      // Generate signed URL
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)

      if (error) {
        console.error('Error creating signed URL:', error)
        throw { statusCode: 500, message: 'Failed to create signed URL' }
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: {
            signedUrl: data.signedUrl,
            expiresIn,
            expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
          },
        }),
      }
    } catch (error: any) {
      if (error.statusCode) throw error
      throw { statusCode: 500, message: error.message || 'Internal server error' }
    }
  },
  { requireAuth: true }
)
