import { NextRequest, NextResponse } from 'next/server';
import { createClient, User, Session } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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

    try {
        const cookieStore = await cookies();
        const getSupabaseWithCookies = () => {
            return createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                    flowType: 'pkce',
                    storage: {
                        getItem: (key) => {
                            const val = cookieStore.get(key)?.value;
                            if (!val) return null;
                            try {
                                return decodeURIComponent(val);
                            } catch {
                                return val;
                            }
                        },
                        setItem: (key, value) => {
                            cookieStore.set(key, value, { path: '/' });
                        },
                        removeItem: (key) => {
                            cookieStore.delete(key);
                        }
                    }
                }
            });
        };

        // ── PKCE flow（code）──────────────────────────────────────────
        if (code) {
            const sb = getSupabaseWithCookies();
            const { data, error } = await sb.auth.exchangeCodeForSession(code);
            if (error || !data?.user) {
                console.error("Auth exchange error:", error);
                const errMsg = error?.message || 'no_user';
                return NextResponse.redirect(`${siteUrl}/?auth=error&msg=${encodeURIComponent(errMsg)}`);
            }
            await upsertProfile(supabaseUrl, supabaseServiceKey, data.user, plan);
            // 把 access_token / refresh_token 帶回主頁 hash，讓瀏覽器端 supabase client detectSessionInUrl 接管 session
            return redirectWithSession(`${siteUrl}/?auth=success`, data.session, 'signup');
        }

        // ── OTP / Magic Link flow（token_hash）───────────────────────
        if (token_hash) {
            const sb = getSupabaseWithCookies();
            const { data, error } = await sb.auth.verifyOtp({ token_hash, type: type });
            if (error || !data?.user) {
                console.error("OTP verification error:", error);
                const errMsg = error?.message || 'no_user';
                return NextResponse.redirect(`${siteUrl}/?auth=error&msg=${encodeURIComponent(errMsg)}`);
            }
            await upsertProfile(supabaseUrl, supabaseServiceKey, data.user, plan);
            return redirectWithSession(`${siteUrl}/?auth=success`, data.session, type);
        }
    } catch (err: any) {
        console.error("Auth callback exception:", err);
        return NextResponse.redirect(`${siteUrl}/?auth=error&msg=${encodeURIComponent(err.message || 'unknown_exception')}`);
    }

    return NextResponse.redirect(`${siteUrl}/?auth=error&msg=missing_code_or_token`);
}

async function upsertProfile(url: string, serviceKey: string, user: User, plan?: string) {
    const admin = createClient(url, serviceKey);
    const meta = user.user_metadata ?? {};
    const isAdmin = user.email === 'jaggersu@gmail.com';
    await admin.from('profiles').upsert({
        id: user.id,
        name: meta.name ?? meta.full_name ?? user.email ?? '',
        email: user.email ?? '',
        phone: meta.phone ?? '',
        company: meta.company ?? '',
        plan_type: plan ?? meta.plan ?? '',
        status: 'REGISTERED',
        role: isAdmin ? 'admin' : 'client',
    }, { onConflict: 'id' });
}

function redirectWithSession(redirectUrl: string, session: Session | null, authType: string) {
    const url = new URL(redirectUrl);
    const hash = new URLSearchParams();
    if (session?.access_token) hash.set('access_token', session.access_token);
    if (session?.refresh_token) hash.set('refresh_token', session.refresh_token);
    if (session?.expires_in) hash.set('expires_in', String(session.expires_in));
    if (session?.token_type) hash.set('token_type', session.token_type);
    if (authType) hash.set('type', authType);
    url.hash = hash.toString();
    return NextResponse.redirect(url.toString());
}
