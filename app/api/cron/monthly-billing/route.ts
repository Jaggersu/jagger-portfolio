import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PLAN_PRICES: Record<string, number> = {
    'LITE': 25000,
    'PRO': 45000,
    'SCALE': 85000,
};

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: activeProjects, error } = await supabase
        .from('projects')
        .select('id, name, status, profiles(email, name, plan_type)')
        .eq('status', 'ACTIVE');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaggersu.com';
    const resendKey = process.env.RESEND_API_KEY;
    const results: { projectId: string; sent: boolean }[] = [];

    for (const project of activeProjects ?? []) {
        const profile = Array.isArray(project.profiles) ? project.profiles[0] : project.profiles as any;
        if (!profile?.email || !profile?.plan_type) continue;

        const amount = PLAN_PRICES[profile.plan_type];
        if (!amount) continue;

        const paymentLinkRes = await fetch(`${siteUrl}/api/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: project.id,
                amount,
                title: `${profile.plan_type} 月費 — ${project.name}`,
                email: profile.email,
            }),
        });

        if (!paymentLinkRes.ok) continue;
        const { gatewayUrl, fields } = await paymentLinkRes.json();

        const formHtml = Object.entries(fields as Record<string, string>)
            .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}" />`)
            .join('');

        const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8" /><title>JAGGER OS · 月費繳款通知</title></head>
<body style="margin:0;padding:0;background:#000;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0A0A0B;border:1px solid #27272a;border-radius:8px;">
        <tr>
          <td style="padding:24px 28px;border-bottom:1px solid #1c1c1e;">
            <span style="display:inline-block;width:20px;height:20px;background:#FF5500;border-radius:4px;text-align:center;line-height:20px;font-size:10px;font-weight:900;color:#000;">J</span>
            <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:2px;margin-left:8px;vertical-align:middle;">JAGGER OS</span>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;border-bottom:1px solid #1c1c1e;">
            <div style="font-size:16px;color:#fff;font-weight:700;margin-bottom:8px;">月費繳款通知</div>
            <div style="font-size:13px;color:#a1a1aa;">專案：${project.name}</div>
            <div style="font-size:13px;color:#a1a1aa;">方案：${profile.plan_type} · NT$ ${amount.toLocaleString()} / mo</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;">
            <form method="POST" action="${gatewayUrl}">
              ${formHtml}
              <button type="submit" style="display:inline-block;background:#FF5500;color:#000;font-size:11px;font-weight:700;letter-spacing:2px;padding:12px 24px;border-radius:6px;border:none;cursor:pointer;">
                前往繳款 →
              </button>
            </form>
            <div style="margin-top:12px;font-size:10px;color:#52525b;">// 請於 7 個工作天內完成繳款，逾期將暫停服務</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        if (resendKey) {
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
                body: JSON.stringify({
                    from: 'JAGGER OS <onboarding@resend.dev>',
                    to: [profile.email],
                    subject: `[JAGGER OS] ${profile.plan_type} 月費繳款通知 — NT$ ${amount.toLocaleString()}`,
                    html,
                }),
            });
        }

        results.push({ projectId: project.id, sent: true });
    }

    return NextResponse.json({ processed: results.length, results });
}
