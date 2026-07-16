import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const secret = process.env.POLAR_WEBHOOK_SECRET;

    if (!secret) {
        console.error('[polar/webhook] POLAR_WEBHOOK_SECRET is not configured');
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
        headers[key] = value;
    });

    let payload: any;
    try {
        payload = validateEvent(rawBody, headers, secret);
    } catch (err) {
        console.error('[polar/webhook] signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }


    function get<T>(obj: unknown, path: string): T | undefined {
        return path.split('.').reduce<unknown>((acc, key) => {
            if (acc && typeof acc === 'object' && !Array.isArray(acc)) {
                return (acc as Record<string, unknown>)[key];
            }
            return undefined;
        }, obj) as T | undefined;
    }

    const data = get<Record<string, unknown>>(payload, 'data') ?? {};
    const eventType = get<string>(payload, 'type') ?? '';
    const email =
        get<string>(data, 'customer.email') ??
        get<string>(data, 'customer_email') ??
        get<string>(data, 'user.email') ??
        null;
    const status = get<string>(data, 'status') ?? '';

    const isSuccessEvent =
        ['checkout.created', 'subscription.created', 'subscription.active', 'payment.success', 'order.created'].includes(eventType) ||
        ['succeeded', 'active', 'paid', 'confirmed'].includes(status);

    const userId = get<string>(data, 'metadata.user_id') || null;

    if ((!email && !userId) || !isSuccessEvent) {
        console.log('[polar/webhook] ignored event', { eventType, status, hasEmail: !!email, hasUserId: !!userId });
        return NextResponse.json({ received: true, processed: false });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    let profile = null;

    if (userId) {
        const { data: p } = await admin
            .from('profiles')
            .select('id, onboarding_completed')
            .eq('id', userId)
            .maybeSingle();
        profile = p;
    }

    if (!profile && email) {
        const { data: p } = await admin
            .from('profiles')
            .select('id, onboarding_completed')
            .eq('email', email)
            .maybeSingle();
        profile = p;
    }

    if (!profile) {
        console.error('[polar/webhook] profile not found for', { userId, email });
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { error } = await admin
        .from('profiles')
        .update({ onboarding_completed: true, status: 'ACTIVE', payment_status: 'paid' })
        .eq('id', profile.id);

    if (error) {
        console.error('[polar/webhook] update failed:', error);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
    console.log('[polar/webhook] unlocked profile', profile.id);

    return NextResponse.json({ received: true, processed: true });
}
