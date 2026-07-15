import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const tokenHash = searchParams.get('token_hash');
    const type = (searchParams.get('type') ?? 'magiclink') as 'magiclink' | 'signup' | 'invite';
    const plan = searchParams.get('plan') ?? undefined;

    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                },
            },
        }
    );

    try {
        if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
        } else if (tokenHash) {
            const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
            if (error) throw error;
        } else {
            throw new Error('缺少授權碼或 token，請重新登入。');
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('無法取得登入使用者資訊');
        }

        // 同步建立/更新 profile（同 /api/auth/upsert-profile）
        const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const meta = user.user_metadata ?? {};
        const isAdmin = user.email === 'jaggersu@gmail.com';

        const { data: existing } = await admin
            .from('profiles')
            .select('status')
            .eq('id', user.id)
            .maybeSingle();

        const newStatus: 'ACTIVE' | 'REGISTERED' = isAdmin
            ? 'ACTIVE'
            : (existing?.status === 'ACTIVE' ? 'ACTIVE' : 'REGISTERED');
        const onboardingCompleted = isAdmin || newStatus === 'ACTIVE';

        await admin.from('profiles').upsert({
            id: user.id,
            name: meta.name ?? meta.full_name ?? user.email ?? '',
            email: user.email ?? '',
            phone: meta.phone ?? '',
            company: meta.company ?? '',
            plan_type: plan ?? meta.plan ?? '',
            status: newStatus,
            onboarding_completed: onboardingCompleted,
            role: isAdmin ? 'admin' : 'client',
        }, { onConflict: 'id' });

        const origin = request.nextUrl.origin;
        const redirectUrl = newStatus === 'REGISTERED' && !isAdmin
            ? new URL(`/onboarding/contract?plan=${encodeURIComponent(plan ?? meta.plan ?? 'LITE')}`, origin)
            : new URL('/dashboard', origin);

        return NextResponse.redirect(redirectUrl);
    } catch (err: any) {
        console.error('Auth callback error:', err);
        const msg = err?.message || '登入處理失敗';
        const errorUrl = new URL(`/?auth=error&msg=${encodeURIComponent(msg)}`, request.nextUrl.origin);
        return NextResponse.redirect(errorUrl);
    }
}
