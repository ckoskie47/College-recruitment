export type InviteEmailProps = {
  orgName: string
  inviteUrl: string
  invitedByEmail?: string
}

export function renderInviteEmail({ orgName, inviteUrl, invitedByEmail }: InviteEmailProps): {
  subject: string
  html: string
  text: string
} {
  const subject = `You've been invited to the ${orgName} workspace — Elevate Advisor Group`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F5F1E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F5F1E8;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:560px;background:#ffffff;border:1px solid #D9D2C2;">

          <!-- Top accent bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#B89653,#D4B879);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#B89653;">
                Elevate Advisor Group
              </p>
              <h1 style="margin:0;font-size:26px;font-weight:500;color:#0F2A47;letter-spacing:-0.01em;line-height:1.2;">
                RecruitPortal
              </h1>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:#D9D2C2;position:relative;">
                <div style="position:absolute;left:0;top:-1px;width:48px;height:3px;background:#B89653;"></div>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px 28px;">
              <p style="margin:0 0 16px;font-size:15px;color:#1A1F2E;line-height:1.6;">
                You have been invited to the <strong style="color:#0F2A47;">${orgName}</strong> workspace${invitedByEmail ? ` by ${invitedByEmail}` : ''}.
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#4A5468;line-height:1.6;">
                RecruitPortal helps families run an organized college search — tracking schools, visits, and decisions in one place through every step of the recruiting process.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:#0F2A47;">
                    <a href="${inviteUrl}"
                      style="display:inline-block;padding:13px 28px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#F5F1E8;text-decoration:none;">
                      Accept invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0;font-size:12px;color:#6B7F95;line-height:1.5;">
                This link expires in 24 hours.<br /><br />
                Or copy this link into your browser:<br />
                <a href="${inviteUrl}" style="color:#3D5A75;word-break:break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:#D9D2C2;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;">
              <p style="margin:0;font-size:11px;color:#6B7F95;line-height:1.6;">
                This invitation was sent by Elevate Advisor Group. If you were not expecting this email, you can safely ignore it — no account will be created until you accept.
              </p>
              <p style="margin:10px 0 0;font-size:11px;color:#6B7F95;">
                © 2026 Elevate Advisor Group. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`

  const text = `You've been invited to the ${orgName} workspace — Elevate Advisor Group

${invitedByEmail ? `Invited by: ${invitedByEmail}\n\n` : ''}Accept your invitation here:
${inviteUrl}

This link expires in 24 hours.

If you were not expecting this email, you can safely ignore it.

© 2026 Elevate Advisor Group`

  return { subject, html, text }
}
