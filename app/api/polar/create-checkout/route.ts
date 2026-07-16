import { NextRequest, NextResponse } from 'next/server';
import { Polar } from '@polar-sh/sdk';

export async function POST(req: NextRequest) {
    try {
        const { amount, userId, email } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const token = process.env.POLAR_ACCESS_TOKEN;
        if (!token) {
            return NextResponse.json({ error: 'Polar Access Token not configured on server' }, { status: 500 });
        }

        const isSandbox = token.includes('_sb_') || token.startsWith('polar_pat_sb_') || token.startsWith('polar_oat_sb_');
        const polar = new Polar({
            accessToken: token,
            server: isSandbox ? 'sandbox' : 'production',
        });

        // 1. List products to find the first one
        const productsResponse = await polar.products.list({});
        const products = productsResponse.result.items;
        if (!products || products.length === 0) {
            return NextResponse.json({ error: 'No products found in Polar organization' }, { status: 404 });
        }
        
        // Use the first product
        const product = products[0];

        // 2. Determine successUrl
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const successUrl = `${siteUrl}?success=true`;
        
        // 3. Create checkout session. Amount in cents (smallest currency unit, e.g., TWD * 100)
        const centsAmount = amount ? Math.round(Number(amount) * 100) : undefined;

        console.log('[create-checkout] Creating checkout session', {
            productId: product.id,
            centsAmount,
            userId,
            email,
        });

        const checkout = await polar.checkouts.create({
            products: [product.id],
            successUrl,
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
