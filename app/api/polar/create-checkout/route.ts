import { NextRequest, NextResponse } from 'next/server';
import { Polar } from '@polar-sh/sdk';

export async function POST(req: NextRequest) {
    try {
        const { amount, userId, email } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const token = process.env.POLAR_ACCESS_TOKEN;
        const server = process.env.POLAR_SERVER === 'sandbox' ? 'sandbox' : 'production';

        if (!token) {
            return NextResponse.json({ error: 'Polar Access Token not configured on server' }, { status: 500 });
        }

        console.log('[create-checkout] Polar server:', server);
        const polar = new Polar({
            accessToken: token,
            server,
        });

        // 3. Create checkout session. Amount in cents (smallest currency unit, e.g., TWD * 100)
        const centsAmount = amount ? Math.round(Number(amount) * 100) : undefined;

        const productId = '0b73f32e-2e7c-4d15-8fe1-ad13a58abcc8';

        console.log('[create-checkout] Creating checkout session', {
            productId,
            centsAmount,
            userId,
            email,
        });

        const checkout = await polar.checkouts.create({
            products: [productId],
            successUrl: 'https://jagger-portfolio.vercel.app/?success=true&checkout_id={CHECKOUT_ID}',
            customerEmail: email || undefined,
            amount: centsAmount,
            metadata: {
                user_id: userId,
            },
        });

        return NextResponse.json({ url: checkout.url });
    } catch (err: any) {
        console.error('[create-checkout] Failed to create checkout session:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
