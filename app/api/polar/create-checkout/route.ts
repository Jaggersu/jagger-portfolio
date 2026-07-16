import { NextRequest, NextResponse } from 'next/server';
import { Polar } from '@polar-sh/sdk';

export async function POST(req: NextRequest) {
    try {
        const { amount, userId, email } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const token = process.env.POLAR_ACCESS_TOKEN;
        console.log("API Triggered. Token exists:", !!token);
        console.log("Token prefix looks like:", token ? token.substring(0, 15) : "UNDEFINED");

        if (!token) {
            return NextResponse.json({ error: 'Polar Access Token not configured on server' }, { status: 500 });
        }

        const isSandbox = token.includes('_sb_') || token.startsWith('polar_pat_sb_') || token.startsWith('polar_oat_sb_');
        console.log("Detected isSandbox:", isSandbox);
        const polar = new Polar({
            accessToken: token,
            server: isSandbox ? 'sandbox' : 'production',
        });

        // 3. Create checkout session. Amount in cents (smallest currency unit, e.g., TWD * 100)
        const centsAmount = amount ? Math.round(Number(amount) * 100) : undefined;

        console.log('[create-checkout] Creating checkout session', {
            productPriceId: '0b73f32e-2e7c-4d15-8fe1-ad13a58abcc8',
            centsAmount,
            userId,
            email,
        });

        const checkout = await polar.checkouts.create({
            productPriceId: '0b73f32e-2e7c-4d15-8fe1-ad13a58abcc8',
            successUrl: 'https://jagger-portfolio.vercel.app/?success=true&checkout_id={CHECKOUT_ID}',
            customerEmail: email || undefined,
            amount: centsAmount,
            metadata: {
                user_id: userId,
            },
        } as any);

        return NextResponse.json({ url: checkout.url });
    } catch (err: any) {
        console.error('[create-checkout] Failed to create checkout session:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
