import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set in environment variables')
}

const resend = new Resend(process.env.RESEND_API_KEY)

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
    // Use testing domain until howard-financial.com is verified
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

    const { data, error } = await resend.emails.send({
      from: `HowardOS <${fromEmail}>`,
      to,
      subject: 'Sign in to HowardOS',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sign in to HowardOS</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fb;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fb; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                        <h1 style="margin: 0; color: #0A2540; font-size: 28px; font-weight: 600;">HowardOS</h1>
                        <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">Howard Financial</p>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 16px 0; color: #0A2540; font-size: 24px; font-weight: 600;">
                          ${fullName ? `Welcome back, ${fullName}!` : 'Sign in to your account'}
                        </h2>
                        <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.5;">
                          Click the button below to securely sign in to HowardOS. This link will expire in 1 hour.
                        </p>

                        <!-- CTA Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 20px 0;">
                              <a href="${magicLink}"
                                 style="display: inline-block; padding: 16px 32px; background-color: #0A2540; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                Sign In to HowardOS
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                          Or copy and paste this link into your browser:
                        </p>
                        <p style="margin: 8px 0 0 0; padding: 12px; background-color: #f8f9fb; border-radius: 6px; word-break: break-all; font-size: 12px; color: #475569;">
                          ${magicLink}
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f8f9fb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                          If you didn't request this email, you can safely ignore it.
                        </p>
                        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                          © ${new Date().getFullYear()} Howard Financial. All rights reserved.
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
    })

    if (error) {
      console.error('Resend error:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    return { success: true, data }
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
    // Use testing domain until howard-financial.com is verified
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

    const { data, error } = await resend.emails.send({
      from: `HowardOS <${fromEmail}>`,
      to,
      subject: `You've been invited to HowardOS`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to HowardOS</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fb;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fb; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                        <h1 style="margin: 0; color: #0A2540; font-size: 28px; font-weight: 600;">HowardOS</h1>
                        <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">Howard Financial</p>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 16px 0; color: #0A2540; font-size: 24px; font-weight: 600;">
                          Welcome to HowardOS!
                        </h2>
                        <p style="margin: 0 0 16px 0; color: #475569; font-size: 16px; line-height: 1.5;">
                          Hi ${fullName},
                        </p>
                        <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.5;">
                          ${inviterName} has invited you to join HowardOS as ${role === 'admin' ? 'an administrator' : 'a client'}.
                          Click the button below to accept your invitation and set up your account.
                        </p>

                        <!-- Role Badge -->
                        <div style="margin: 0 0 24px 0; padding: 12px; background-color: ${role === 'admin' ? '#0A2540' : '#64748b'}15; border-radius: 8px; border-left: 4px solid ${role === 'admin' ? '#0A2540' : '#64748b'};">
                          <p style="margin: 0; color: #475569; font-size: 14px;">
                            <strong style="color: ${role === 'admin' ? '#0A2540' : '#64748b'};">Your Role:</strong> ${role === 'admin' ? 'Administrator' : 'Client'}
                          </p>
                          <p style="margin: 8px 0 0 0; color: #64748b; font-size: 13px;">
                            ${role === 'admin'
                              ? 'You have full access to manage users, files, tasks, and settings.'
                              : 'You can view and manage your files, tasks, and collaborate with your team.'}
                          </p>
                        </div>

                        <!-- CTA Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 20px 0;">
                              <a href="${inviteLink}"
                                 style="display: inline-block; padding: 16px 32px; background-color: #0A2540; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                Accept Invitation
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                          Or copy and paste this link into your browser:
                        </p>
                        <p style="margin: 8px 0 0 0; padding: 12px; background-color: #f8f9fb; border-radius: 6px; word-break: break-all; font-size: 12px; color: #475569;">
                          ${inviteLink}
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f8f9fb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                          If you didn't expect this invitation, you can safely ignore this email.
                        </p>
                        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                          © ${new Date().getFullYear()} Howard Financial. All rights reserved.
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
    })

    if (error) {
      console.error('Resend error:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    return { success: true, data }
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
    // Use testing domain until howard-financial.com is verified
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

    const filesList = files.map(f => `<li style="margin: 8px 0; color: #475569; font-size: 15px;">${f.name}</li>`).join('')

    const { data, error } = await resend.emails.send({
      from: `HowardOS <${fromEmail}>`,
      to,
      subject: `Howard Financial portal: New files were shared by ${uploaderName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New files were shared</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fb;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fb; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header with Logo -->
                    <tr>
                      <td style="padding: 40px 40px 30px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                        <div style="width: 64px; height: 64px; background-color: #B8926A; margin: 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
                          <span style="color: white; font-size: 32px; font-weight: 700; line-height: 1;">H</span>
                        </div>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 24px 0; color: #0A2540; font-size: 22px; font-weight: 600; text-align: center;">
                          New files were shared by ${uploaderName}.
                        </h2>

                        <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.5;">
                          Hi ${recipientName},
                        </p>

                        <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.5;">
                          New files have been shared with you by ${uploaderName} and are now available to view:
                        </p>

                        <!-- File List -->
                        <div style="margin: 0 0 32px 0; padding: 20px; background-color: #f8f9fb; border-radius: 8px; border-left: 4px solid #B8926A;">
                          <ul style="margin: 0; padding: 0 0 0 20px; list-style-type: disc;">
                            ${filesList}
                          </ul>
                        </div>

                        <!-- CTA Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 20px 0;">
                              <a href="${filesUrl}"
                                 style="display: inline-block; padding: 14px 28px; background-color: #0A2540; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                                See files
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f8f9fb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px; line-height: 1.5; text-align: center;">
                          You're receiving this because files were shared with you on Howard Financial portal.
                        </p>
                        <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                          © ${new Date().getFullYear()} Howard Financial. All rights reserved.
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
    })

    if (error) {
      console.error('Resend error:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error sending file notification email:', error)
    throw error
  }
}
