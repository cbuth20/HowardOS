import * as postmark from 'postmark'

if (!process.env.POSTMARK_API_KEY) {
  throw new Error('POSTMARK_API_KEY is not set in environment variables')
}

// Use sandbox mode for testing if needed
// Set POSTMARK_TEST_MODE=true in .env.local to enable
const useSandbox = process.env.POSTMARK_TEST_MODE === 'true'
const apiKey = useSandbox ? 'POSTMARK_API_TEST' : process.env.POSTMARK_API_KEY

const client = new postmark.ServerClient(apiKey)

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.howard-finance.com'
const logoUrl = `${appUrl}/Sage_Secondary.png`

export interface MagicLinkEmailParams {
  to: string
  magicLink: string
  fullName?: string
}

export interface InvitationEmailParams {
  to: string
  inviteLink: string
  fullName: string
  role: 'admin' | 'client'
  inviterName: string
}

export interface FileNotificationEmailParams {
  to: string
  recipientName: string
  uploaderName: string
  files: Array<{
    name: string
    size?: number
  }>
  filesUrl: string
}

/**
 * Send a magic link login email
 */
export async function sendMagicLinkEmail({ to, magicLink, fullName }: MagicLinkEmailParams) {
  try {
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || 'no-reply@howard-finance.com'

    const result = await client.sendEmail({
      From: `Howard Financial <${fromEmail}>`,
      To: to,
      Subject: 'Sign in to Howard Financial',
      HtmlBody: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sign in to Howard Financial</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f4;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f4; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 36px 40px 28px 40px; text-align: center; border-bottom: 1px solid #e7e5e4;">
                        <img src="${logoUrl}" alt="Howard Financial" width="56" height="56" style="display: block; margin: 0 auto 12px auto; border-radius: 8px;" />
                        <p style="margin: 0; color: #44403c; font-size: 13px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">Howard Financial</p>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 16px 0; color: #0A2540; font-size: 22px; font-weight: 600;">
                          ${fullName ? `Welcome back, ${fullName}` : 'Sign in to your account'}
                        </h2>
                        <p style="margin: 0 0 28px 0; color: #57534e; font-size: 15px; line-height: 1.6;">
                          Click the button below to securely sign in. This link will expire in 1 hour.
                        </p>

                        <!-- CTA Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 8px 0 24px 0;">
                              <a href="${magicLink}"
                                 style="display: inline-block; padding: 14px 32px; background-color: #0A2540; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                                Sign In
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 0 0 8px 0; color: #a8a29e; font-size: 13px; line-height: 1.5;">
                          Or copy and paste this link into your browser:
                        </p>
                        <p style="margin: 0; padding: 12px; background-color: #f5f5f4; border-radius: 6px; word-break: break-all; font-size: 12px; color: #57534e;">
                          ${magicLink}
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 24px 40px; background-color: #fafaf9; border-radius: 0 0 12px 12px; border-top: 1px solid #e7e5e4; text-align: center;">
                        <p style="margin: 0 0 6px 0; color: #a8a29e; font-size: 13px; line-height: 1.5;">
                          If you didn't request this email, you can safely ignore it.
                        </p>
                        <p style="margin: 0; color: #d6d3d1; font-size: 12px;">
                          &copy; ${new Date().getFullYear()} Howard Financial. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      MessageStream: 'outbound',
    })

    return { success: true, data: result }
  } catch (error) {
    console.error('Error sending magic link email:', error)
    throw error
  }
}

/**
 * Send an invitation email to a new user
 */
export async function sendInvitationEmail({
  to,
  inviteLink,
  fullName,
  role,
  inviterName,
}: InvitationEmailParams) {
  try {
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || 'no-reply@howard-finance.com'

    const result = await client.sendEmail({
      From: `Howard Financial <${fromEmail}>`,
      To: to,
      Subject: `You've been invited to Howard Financial`,
      HtmlBody: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Howard Financial</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f4;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f4; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 36px 40px 28px 40px; text-align: center; border-bottom: 1px solid #e7e5e4;">
                        <img src="${logoUrl}" alt="Howard Financial" width="56" height="56" style="display: block; margin: 0 auto 12px auto; border-radius: 8px;" />
                        <p style="margin: 0; color: #44403c; font-size: 13px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">Howard Financial</p>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <p style="margin: 0 0 16px 0; color: #57534e; font-size: 15px; line-height: 1.6;">
                          Hi ${fullName},
                        </p>
                        <p style="margin: 0 0 28px 0; color: #57534e; font-size: 15px; line-height: 1.6;">
                          ${inviterName} has invited you to join Howard Financial as ${role === 'admin' ? 'an administrator' : 'a client'}.
                          Click the button below to accept your invitation and set up your account.
                        </p>

                        <!-- Role Badge -->
                        <div style="margin: 0 0 28px 0; padding: 16px; background-color: #f5f5f4; border-radius: 8px; border-left: 4px solid #4a7c6f;">
                          <p style="margin: 0; color: #44403c; font-size: 14px;">
                            <strong>Your Role:</strong> ${role === 'admin' ? 'Administrator' : 'Client'}
                          </p>
                          <p style="margin: 8px 0 0 0; color: #78716c; font-size: 13px; line-height: 1.5;">
                            ${role === 'admin'
                              ? 'You will have full access to manage users, files, tasks, and settings.'
                              : 'You will be able to view and manage your files, tasks, and collaborate with your team.'}
                          </p>
                        </div>

                        <!-- CTA Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 8px 0 24px 0;">
                              <a href="${inviteLink}"
                                 style="display: inline-block; padding: 14px 32px; background-color: #0A2540; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                                Accept Invitation
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 0 0 8px 0; color: #a8a29e; font-size: 13px; line-height: 1.5;">
                          Or copy and paste this link into your browser:
                        </p>
                        <p style="margin: 0; padding: 12px; background-color: #f5f5f4; border-radius: 6px; word-break: break-all; font-size: 12px; color: #57534e;">
                          ${inviteLink}
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 24px 40px; background-color: #fafaf9; border-radius: 0 0 12px 12px; border-top: 1px solid #e7e5e4; text-align: center;">
                        <p style="margin: 0 0 6px 0; color: #a8a29e; font-size: 13px; line-height: 1.5;">
                          If you didn't expect this invitation, you can safely ignore this email.
                        </p>
                        <p style="margin: 0; color: #d6d3d1; font-size: 12px;">
                          &copy; ${new Date().getFullYear()} Howard Financial. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      MessageStream: 'outbound',
    })

    return { success: true, data: result }
  } catch (error) {
    console.error('Error sending invitation email:', error)
    throw error
  }
}

/**
 * Send file notification email when files are shared
 */
export async function sendFileNotificationEmail({
  to,
  recipientName,
  uploaderName,
  files,
  filesUrl,
}: FileNotificationEmailParams) {
  try {
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || 'no-reply@howard-finance.com'

    const filesList = files.map(f => `<li style="margin: 8px 0; color: #57534e; font-size: 14px;">${f.name}</li>`).join('')

    const result = await client.sendEmail({
      From: `Howard Financial <${fromEmail}>`,
      To: to,
      Subject: `New files shared by ${uploaderName}`,
      HtmlBody: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New files shared</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f4;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f4; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 36px 40px 28px 40px; text-align: center; border-bottom: 1px solid #e7e5e4;">
                        <img src="${logoUrl}" alt="Howard Financial" width="56" height="56" style="display: block; margin: 0 auto 12px auto; border-radius: 8px;" />
                        <p style="margin: 0; color: #44403c; font-size: 13px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">Howard Financial</p>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <p style="margin: 0 0 16px 0; color: #57534e; font-size: 15px; line-height: 1.6;">
                          Hi ${recipientName},
                        </p>

                        <p style="margin: 0 0 28px 0; color: #57534e; font-size: 15px; line-height: 1.6;">
                          ${uploaderName} shared new files with you that are now available to view:
                        </p>

                        <!-- File List -->
                        <div style="margin: 0 0 28px 0; padding: 16px 20px; background-color: #f5f5f4; border-radius: 8px; border-left: 4px solid #4a7c6f;">
                          <ul style="margin: 0; padding: 0 0 0 16px; list-style-type: disc;">
                            ${filesList}
                          </ul>
                        </div>

                        <!-- CTA Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 8px 0;">
                              <a href="${filesUrl}"
                                 style="display: inline-block; padding: 14px 32px; background-color: #0A2540; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                                View Files
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 24px 40px; background-color: #fafaf9; border-radius: 0 0 12px 12px; border-top: 1px solid #e7e5e4; text-align: center;">
                        <p style="margin: 0 0 6px 0; color: #a8a29e; font-size: 13px; line-height: 1.5;">
                          You received this because files were shared with you on Howard Financial.
                        </p>
                        <p style="margin: 0; color: #d6d3d1; font-size: 12px;">
                          &copy; ${new Date().getFullYear()} Howard Financial. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      MessageStream: 'outbound',
    })

    return { success: true, data: result }
  } catch (error) {
    console.error('Error sending file notification email:', error)
    throw error
  }
}
