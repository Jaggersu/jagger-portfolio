import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { name, email, message } = await req.json();
        if (!email || !message) {
            return NextResponse.json({ error: 'email and message required' }, { status: 400 });
        }

        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'jagger@jaggersu.com';

        if (!RESEND_API_KEY) {
            console.log('[contact] No RESEND_API_KEY, logging only:', { name, email, message });
            return NextResponse.json({ ok: true, note: 'logged (no email service)' });
        }

        const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'JAGGER OS <onboarding@resend.dev>',
                to: [ADMIN_EMAIL],
                subject: `[Contact] ${name || 'Anonymous'} — ${email}`,
                html: `
                    <h2>新聯繫表單</h2>
                    <p><strong>Name:</strong> ${name || 'N/A'}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Message:</strong></p>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                `,
            }),
        });

        const resendData = await resendRes.json();
        console.log('[contact] resend response:', resendRes.status, JSON.stringify(resendData));

        if (!resendRes.ok) {
            return NextResponse.json({ error: resendData }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error('[contact] error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
