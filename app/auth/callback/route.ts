import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    if (!code) {
        return NextResponse.redirect(`${siteUrl}/?auth=error`);
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        console.error('[auth/callback] error:', error.message);
        return NextResponse.redirect(`${siteUrl}/?auth=error`);
    }

    return NextResponse.redirect(`${siteUrl}/?auth=success`);
}
