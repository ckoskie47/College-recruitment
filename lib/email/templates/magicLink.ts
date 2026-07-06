export type MagicLinkEmailProps = {
  signInUrl: string
}

export function renderMagicLinkEmail({ signInUrl }: MagicLinkEmailProps): {
  subject: string
  html: string
  text: string
} {
  const subject = 'Your sign-in link — Elevate Advisor Group'

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

          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#B89653,#D4B879);"></td>
          </tr>

          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#B89653;">
                Elevate Advisor Group
              </p>
              <h1 style="margin:0;font-size:26px;font-weight:500;color:#0F2A47;letter-spacing:-0.01em;line-height:1.2;">
                Fiduciary Workspace
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:#D9D2C2;position:relative;">
                <div style="position:absolute;left:0;top:-1px;width:48px;height:3px;background:#B89653;"></div>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px 28px;">
              <p style="margin:0 0 24px;font-size:15px;color:#1A1F2E;line-height:1.6;">
                Click the button below to sign in. This link expires in 24 hours and can only be used once.
              </p>

              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:#0F2A47;">
                    <a href="${signInUrl}"
                      style="display:inline-block;padding:13px 28px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#F5F1E8;text-decoration:none;">
                      Sign in
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0;font-size:12px;color:#6B7F95;line-height:1.5;">
                Or copy this link into your browser:<br />
                <a href="${signInUrl}" style="color:#3D5A75;word-break:break-all;">${signInUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:#D9D2C2;"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px;">
              <p style="margin:0;font-size:11px;color:#6B7F95;line-height:1.6;">
                If you did not request this link, you can safely ignore this email.
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

  const text = `Sign in to Elevate Advisor Group — Fiduciary Workspace

Click the link below to sign in. This link expires in 24 hours and can only be used once.

${signInUrl}

If you did not request this link, you can safely ignore this email.

© 2026 Elevate Advisor Group`

  return { subject, html, text }
}
