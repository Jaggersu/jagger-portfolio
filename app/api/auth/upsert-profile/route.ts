import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const { access_token, plan, type } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!access_token || typeof access_token !== 'string') {
        return NextResponse.json({ error: '缺少 access_token' }, { status: 400 });
    }

    try {
        // 用瀏覽器傳來的 token 驗證使用者身份
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
        const { data: { user }, error: userError } = await authClient.auth.getUser(access_token);
        if (userError || !user) {
            console.error('getUser failed:', userError);
            return NextResponse.json({ error: '無效的登入 token' }, { status: 401 });
        }

        const admin = createClient(supabaseUrl, supabaseServiceKey);
        const meta = user.user_metadata ?? {};
        const isAdmin = user.email === 'jaggersu@gmail.com';

        // 查既有 profile，避免把已 ACTIVE 的使用者覆蓋回 REGISTERED
        const { data: existing } = await admin
            .from('profiles')
            .select('status')
            .eq('id', user.id)
            .single();

        const newStatus: 'ACTIVE' | 'REGISTERED' = isAdmin
            ? 'ACTIVE'
            : (existing?.status === 'ACTIVE' ? 'ACTIVE' : 'REGISTERED');

        await admin.from('profiles').upsert({
            id: user.id,
            name: meta.name ?? meta.full_name ?? user.email ?? '',
            email: user.email ?? '',
            phone: meta.phone ?? '',
            company: meta.company ?? '',
            plan_type: plan ?? meta.plan ?? '',
            status: newStatus,
            role: isAdmin ? 'admin' : 'client',
        }, { onConflict: 'id' });

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
        const redirectUrl = newStatus === 'REGISTERED' && !isAdmin
            ? `${siteUrl}/?auth=success&panel=contract`
            : `${siteUrl}/?auth=success`;

        return NextResponse.json({ status: newStatus, redirectUrl });
    } catch (err: any) {
        console.error('Upsert profile error:', err);
        return NextResponse.json(
            { error: err?.message || '伺服器處理登入資料失敗' },
            { status: 500 }
        );
    }
}
