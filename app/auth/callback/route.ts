import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
    const { searchParams, origin } = new URL(req.url);
    const code = searchParams.get('code');
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') ?? 'magiclink';
    const plan = searchParams.get('plan') ?? undefined;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // ── PKCE flow（code）──────────────────────────────────────────
    if (code) {
        const sb = createClient(supabaseUrl, supabaseAnonKey);
        const { data, error } = await sb.auth.exchangeCodeForSession(code);
        if (error || !data?.user) {
            return NextResponse.redirect(`${siteUrl}/?auth=error`);
        }
        await upsertProfile(supabaseUrl, supabaseServiceKey, data.user, plan);
        // 把 access_token 帶回主頁，讓瀏覽器端的 supabase client 接管 session
        const res = NextResponse.redirect(`${siteUrl}/?auth=success`);
        res.cookies.set('sb-access-token', data.session?.access_token ?? '', { path: '/', maxAge: 3600, sameSite: 'lax' });
        res.cookies.set('sb-refresh-token', data.session?.refresh_token ?? '', { path: '/', maxAge: 7 * 24 * 3600, sameSite: 'lax', httpOnly: true });
        return res;
    }

    // ── OTP / Magic Link flow（token_hash）───────────────────────
    if (token_hash) {
        const sb = createClient(supabaseUrl, supabaseAnonKey);
        const { data, error } = await sb.auth.verifyOtp({ token_hash, type: type as any });
        if (error || !data?.user) {
            return NextResponse.redirect(`${siteUrl}/?auth=error`);
        }
        await upsertProfile(supabaseUrl, supabaseServiceKey, data.user, plan);
        const res = NextResponse.redirect(`${siteUrl}/?auth=success`);
        res.cookies.set('sb-access-token', data.session?.access_token ?? '', { path: '/', maxAge: 3600, sameSite: 'lax' });
        res.cookies.set('sb-refresh-token', data.session?.refresh_token ?? '', { path: '/', maxAge: 7 * 24 * 3600, sameSite: 'lax', httpOnly: true });
        return res;
    }

    return NextResponse.redirect(`${siteUrl}/?auth=error`);
}

async function upsertProfile(url: string, serviceKey: string, user: any, plan?: string) {
    const admin = createClient(url, serviceKey);
    const meta = user.user_metadata ?? {};
    await admin.from('profiles').upsert({
        id: user.id,
        name: meta.name ?? meta.full_name ?? user.email ?? '',
        email: user.email ?? '',
        phone: meta.phone ?? '',
        company: meta.company ?? '',
        plan_type: plan ?? meta.plan ?? '',
        status: 'REGISTERED',
    }, { onConflict: 'id' });
}
