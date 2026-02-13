import * as postmark from 'postmark'

if (!process.env.POSTMARK_API_KEY) {
  throw new Error('POSTMARK_API_KEY is not set in environment variables')
}

// Use sandbox mode for testing if needed
// Set POSTMARK_TEST_MODE=true in .env.local to enable
const useSandbox = process.env.POSTMARK_TEST_MODE === 'true'
const apiKey = useSandbox ? 'POSTMARK_API_TEST' : process.env.POSTMARK_API_KEY

const client = new postmark.ServerClient(apiKey)

export interface MagicLinkEmailParams {
  to: string
  magicLink: string
  fullName?: string
}

export interface InvitationEmailParams {
  to: string
  inviteLink: string
  fullName: string
  role: string
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
      From: `HowardOS <${fromEmail}>`,
      To: to,
      Subject: 'Sign in to HowardOS',
      HtmlBody: `
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
                        <table width="56" height="56" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 12px auto;">
                          <tr>
                            <td align="center" valign="middle" width="56" height="56" style="width: 56px; height: 56px; background-color: #4a5c56; border-radius: 8px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 28px; font-weight: 700; color: #ffffff; line-height: 56px;">H</td>
                          </tr>
                        </table>
                        <p style="margin: 0; color: #64748b; font-size: 14px;">Howard Financial</p>
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
      From: `HowardOS <${fromEmail}>`,
      To: to,
      Subject: `You've been invited to HowardOS`,
      HtmlBody: `
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
                        <table width="56" height="56" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 12px auto;">
                          <tr>
                            <td align="center" valign="middle" width="56" height="56" style="width: 56px; height: 56px; background-color: #4a5c56; border-radius: 8px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 28px; font-weight: 700; color: #ffffff; line-height: 56px;">H</td>
                          </tr>
                        </table>
                        <p style="margin: 0; color: #64748b; font-size: 14px;">Howard Financial</p>
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
                          ${inviterName} has invited you to join HowardOS as ${{admin: 'an administrator', manager: 'a manager', user: 'a team member', client: 'a client', client_no_access: 'a contact'}[role] || 'a member'}.
                          Click the button below to accept your invitation and set up your account.
                        </p>

                        <!-- Role Badge -->
                        <div style="margin: 0 0 24px 0; padding: 12px; background-color: ${['admin', 'manager'].includes(role) ? '#0A2540' : '#64748b'}15; border-radius: 8px; border-left: 4px solid ${['admin', 'manager'].includes(role) ? '#0A2540' : '#64748b'};">
                          <p style="margin: 0; color: #475569; font-size: 14px;">
                            <strong style="color: ${['admin', 'manager'].includes(role) ? '#0A2540' : '#64748b'};">Your Role:</strong> ${{admin: 'Administrator', manager: 'Manager', user: 'Team Member', client: 'Client', client_no_access: 'Contact'}[role] || role}
                          </p>
                          <p style="margin: 8px 0 0 0; color: #64748b; font-size: 13px;">
                            ${['admin', 'manager'].includes(role)
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

    const filesList = files.map(f => `<li style="margin: 8px 0; color: #475569; font-size: 15px;">${f.name}</li>`).join('')

    const result = await client.sendEmail({
      From: `HowardOS <${fromEmail}>`,
      To: to,
      Subject: `Howard Financial portal: New files were shared by ${uploaderName}`,
      HtmlBody: `
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
                        <table width="72" height="72" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                          <tr>
                            <td align="center" valign="middle" width="72" height="72" style="width: 72px; height: 72px; background-color: #4a5c56; border-radius: 12px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 40px; font-weight: 700; color: #ffffff; line-height: 72px;">H</td>
                          </tr>
                        </table>
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
                        <div style="margin: 0 0 32px 0; padding: 20px; background-color: #f8f9fb; border-radius: 8px; border-left: 4px solid #4a5c56;">
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
      MessageStream: 'outbound',
    })

    return { success: true, data: result }
  } catch (error) {
    console.error('Error sending file notification email:', error)
    throw error
  }
}

// =====================================================
// Task Notification Emails
// =====================================================

export interface TaskNotificationEmailParams {
  to: string
  recipientName: string
  actorName: string
  taskTitle: string
  taskUrl: string
  message: string
  type: 'assigned' | 'status_changed' | 'comment' | 'mention'
}

const taskNotificationSubjects: Record<string, string> = {
  assigned: 'Task assigned to you',
  status_changed: 'Task status updated',
  comment: 'New comment on task',
  mention: 'You were mentioned in a comment',
}

export async function sendTaskNotificationEmail({
  to,
  recipientName,
  actorName,
  taskTitle,
  taskUrl,
  message,
  type,
}: TaskNotificationEmailParams) {
  try {
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || 'no-reply@howard-finance.com'
    const subject = `${taskNotificationSubjects[type]} — ${taskTitle}`

    const result = await client.sendEmail({
      From: `HowardOS <${fromEmail}>`,
      To: to,
      Subject: subject,
      HtmlBody: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <div style="border-bottom: 2px solid #0A2540; padding-bottom: 16px; margin-bottom: 24px;">
            <h2 style="margin: 0; color: #0A2540; font-size: 18px;">HowardOS</h2>
          </div>
          <p style="margin: 0 0 8px 0; color: #475569; font-size: 15px;">Hi ${recipientName},</p>
          <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px;">
            <strong>${actorName}</strong> ${message}
          </p>
          <div style="background: #F8FAFC; border-left: 4px solid #0A2540; padding: 12px 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-weight: 600; color: #0F172A; font-size: 15px;">${taskTitle}</p>
          </div>
          <a href="${taskUrl}" style="display: inline-block; background: #0A2540; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
            View Task
          </a>
          <p style="margin: 24px 0 0 0; color: #94A3B8; font-size: 12px;">
            You can manage your notification preferences in Settings.
          </p>
        </div>
      `,
      MessageStream: 'outbound',
    })

    return { success: true, data: result }
  } catch (error) {
    console.error('Error sending task notification email:', error)
    throw error
  }
}
