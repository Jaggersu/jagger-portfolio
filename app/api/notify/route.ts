import { NextRequest, NextResponse } from 'next/server';

function buildEmailHtml(taskId: string, title: string, status: string, summary: string, clientEmail: string): string {
    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JAGGER OS · Task Update</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0A0A0B;border:1px solid #27272a;border-radius:8px;">

        <!-- Header -->
        <tr>
          <td style="padding:24px 28px;border-bottom:1px solid #1c1c1e;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="display:inline-block;width:20px;height:20px;background:#FF5500;border-radius:4px;text-align:center;line-height:20px;font-size:10px;font-weight:900;color:#000;">J</span>
                  <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:2px;margin-left:8px;vertical-align:middle;">JAGGER OS</span>
                </td>
                <td align="right">
                  <span style="font-size:10px;color:#FF5500;border:1px solid #FF550040;padding:3px 8px;border-radius:4px;">TASK UPDATE</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Task info -->
        <tr>
          <td style="padding:24px 28px;border-bottom:1px solid #1c1c1e;">
            <div style="font-size:10px;color:#52525b;letter-spacing:2px;margin-bottom:6px;">${taskId}</div>
            <div style="font-size:16px;color:#ffffff;font-weight:700;margin-bottom:16px;">${title}</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 14px;background:#111113;border:1px solid #27272a;border-radius:6px;font-size:11px;color:#a1a1aa;">
                  STATUS: <span style="color:#FF5500;">${status}</span>
                </td>
                <td width="16"></td>
                <td style="padding:10px 14px;background:#111113;border:1px solid #27272a;border-radius:6px;font-size:11px;color:#a1a1aa;">
                  CLIENT: <span style="color:#e4e4e7;">${clientEmail}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- AI Summary -->
        <tr>
          <td style="padding:24px 28px;border-bottom:1px solid #1c1c1e;">
            <div style="font-size:10px;color:#52525b;letter-spacing:2px;margin-bottom:10px;">// AI EXECUTIVE SUMMARY</div>
            <div style="font-size:13px;color:#d4d4d8;line-height:1.8;background:#111113;border-left:2px solid #FF5500;padding:12px 16px;border-radius:0 6px 6px 0;">${summary}</div>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:24px 28px;border-bottom:1px solid #1c1c1e;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaggersu.com'}#subscription"
               style="display:inline-block;background:#FF5500;color:#000000;font-size:11px;font-weight:700;letter-spacing:2px;padding:12px 24px;border-radius:6px;text-decoration:none;">
              VIEW DASHBOARD →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 28px;">
            <div style="font-size:9px;color:#3f3f46;letter-spacing:1px;">// JAGGER OS · AUTOMATED NOTIFICATION · DO NOT REPLY</div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
    try {
        const { taskId, title, status, summary, clientEmail } = await req.json();

        const resendKey = process.env.RESEND_API_KEY;
        const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@jaggersu.com';

        if (!resendKey) {
            // Soft-fail: log and return ok so frontend isn't blocked
            console.warn('[notify] RESEND_API_KEY not set — skipping email');
            return NextResponse.json({ sent: false, reason: 'no_api_key' });
        }

        const html = buildEmailHtml(taskId, title, status, summary, clientEmail);

        // 未綁定自訂網域時：寄件者用 Resend 測試網域，收件人只能是自己的 email
        const fromAddr = process.env.VERIFIED_DOMAIN
            ? `JAGGER OS <noreply@${process.env.VERIFIED_DOMAIN}>`
            : 'JAGGER OS <onboarding@resend.dev>';
        const recipients = process.env.VERIFIED_DOMAIN
            ? [adminEmail, clientEmail].filter(Boolean)
            : [adminEmail];

        const sendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
                from: fromAddr,
                to: recipients,
                subject: `[JAGGER OS] Task Update · ${taskId} — ${title}`,
                html,
            }),
        });

        if (!sendRes.ok) {
            const err = await sendRes.text();
            console.error('[notify] Resend error:', err);
            return NextResponse.json({ sent: false, error: err });
        }

        return NextResponse.json({ sent: true });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
