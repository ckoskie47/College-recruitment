export type AthleteInviteEmailProps = {
  athleteName: string
  engagementName: string
  profileUrl: string
  invitedByName?: string
}

export function renderAthleteInviteEmail({
  athleteName,
  engagementName,
  profileUrl,
  invitedByName,
}: AthleteInviteEmailProps): { subject: string; html: string; text: string } {
  const subject = `Your recruiting profile — ${engagementName}`

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
                Transfer Portal<br />Recruiting Profile
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
                Hi ${athleteName},
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#1A1F2E;line-height:1.6;">
                ${invitedByName ? `${invitedByName} has` : 'Your family has'} set up a recruiting evaluation for <strong style="color:#0F2A47;">${engagementName}</strong>. To get started, we need you to complete a short profile — it takes about 5 minutes.
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#4A5468;line-height:1.6;">
                Your answers tell us what matters most to you in this transfer. We use them to build a custom question guide for every campus visit — so you're asking the right things at each school.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:#0F2A47;">
                    <a href="${profileUrl}"
                      style="display:inline-block;padding:13px 28px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#F5F1E8;text-decoration:none;">
                      Complete my profile
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0;font-size:12px;color:#6B7F95;line-height:1.5;">
                This link expires in 24 hours.<br /><br />
                Or copy this link into your browser:<br />
                <a href="${profileUrl}" style="color:#3D5A75;word-break:break-all;">${profileUrl}</a>
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
                Sent by Elevate Advisor Group on behalf of your recruiting team. If you were not expecting this email, you can safely ignore it.
              </p>
              <p style="margin:10px 0 0;font-size:11px;color:#6B7F95;">
                © 2026 Elevate Advisor Group. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`

  const text = `Hi ${athleteName},

${invitedByName ? `${invitedByName} has` : 'Your family has'} set up a recruiting evaluation for ${engagementName}.

To get started, complete your recruiting profile — it takes about 5 minutes. Your answers help us build a custom question guide for every campus visit.

Complete your profile here:
${profileUrl}

This link expires in 24 hours.

© 2026 Elevate Advisor Group`

  return { subject, html, text }
}
