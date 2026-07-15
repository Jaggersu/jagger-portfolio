import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * Polar.sh webhook signature verification.
 * Header format: Polar-Signature: t=<unix_timestamp>,v1=<hex_signature>
 * Signed payload: "<timestamp>.<rawBody>" with HMAC-SHA256 of POLAR_WEBHOOK_SECRET.
 */
function verifyPolarSignature(secret: string, rawBody: string, signatureHeader: string): boolean {
    try {
        const parts: Record<string, string | undefined> = Object.fromEntries(
            signatureHeader.split(',').map((part) => {
                const [key, ...rest] = part.split('=');
                return [key.trim(), rest.join('=').trim()];
            })
        );
        const timestamp = parts.t;
        const expected = parts.v1 || parts.sig || parts.signature;
        if (!timestamp || !expected) return false;

        const signedPayload = `${timestamp}.${rawBody}`;
        const hmac = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
        return false;
    }
}

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const secret = process.env.POLAR_WEBHOOK_SECRET;
    const signature = req.headers.get('polar-signature') || req.headers.get('Polar-Signature') || '';

    if (secret && signature) {
        if (!verifyPolarSignature(secret, rawBody, signature)) {
            console.error('[polar/webhook] signature verification failed');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
    } else if (secret && !signature) {
        console.error('[polar/webhook] missing Polar-Signature header');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    let payload: unknown;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
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

    if (!email || !isSuccessEvent) {
        console.log('[polar/webhook] ignored event', { eventType, status, hasEmail: !!email });
        return NextResponse.json({ received: true, processed: false });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // 用 email 找 profile 並解鎖
    const { data: profile } = await admin
        .from('profiles')
        .select('id, onboarding_completed')
        .eq('email', email)
        .single();

    if (!profile) {
        console.error('[polar/webhook] profile not found for', email);
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.onboarding_completed) {
        const { error } = await admin
            .from('profiles')
            .update({ onboarding_completed: true, status: 'ACTIVE' })
            .eq('id', profile.id);
        if (error) {
            console.error('[polar/webhook] update failed:', error);
            return NextResponse.json({ error: 'Update failed' }, { status: 500 });
        }
        console.log('[polar/webhook] unlocked profile', profile.id);
    }

    return NextResponse.json({ received: true, processed: true });
}
