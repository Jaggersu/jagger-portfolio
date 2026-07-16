import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
    // Create a response we can attach cookies to (for auth refresh)
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value);
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        });
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const pathname = request.nextUrl.pathname;

    // ── Admin 路由 ─────────────────────────────────────────────
    if (pathname.startsWith('/admin')) {
        if (authError || !user) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
        if (!profile || profile?.role !== 'admin') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        return response;
    }

    // ── Dashboard 路由 ─────────────────────────────────────────
    if (pathname.startsWith('/dashboard')) {
        if (authError || !user) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, onboarding_completed')
            .eq('id', user.id)
            .maybeSingle();
        if (profile?.role === 'admin') {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
        if (!profile || !profile?.onboarding_completed) {
            return NextResponse.redirect(new URL('/onboarding', request.url));
        }
        return response;
    }

    return response;
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
    ],
};
