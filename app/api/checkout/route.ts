import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function aesEncrypt(data: string, key: string, iv: string): string {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function sha256Sign(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
}

export async function POST(req: NextRequest) {
    try {
        const { projectId, amount, title, email } = await req.json();

        const HashKey = process.env.NEWEBPAY_HASH_KEY!;
        const HashIV = process.env.NEWEBPAY_HASH_IV!;
        const MerchantID = process.env.NEWEBPAY_MERCHANT_ID!;
        const gatewayUrl = process.env.NEWEBPAY_URL!;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

        const TimeStamp = Math.floor(Date.now() / 1000).toString();
        const MerchantOrderNo = `${projectId}_${TimeStamp}`;

        const tradeData = new URLSearchParams({
            MerchantID,
            RespondType: 'JSON',
            TimeStamp,
            Version: '2.0',
            MerchantOrderNo,
            Amt: String(amount),
            ItemDesc: title.slice(0, 50),
            Email: email,
            NotifyURL: `${siteUrl}/api/checkout/callback`,
            ReturnURL: `${siteUrl}/?payment=success`,
            ClientBackURL: `${siteUrl}/?payment=cancel`,
            LoginType: '0',
        }).toString();

        const TradeInfo = aesEncrypt(tradeData, HashKey, HashIV);
        const TradeSha = sha256Sign(`HashKey=${HashKey}&TradeInfo=${TradeInfo}&HashIV=${HashIV}`);

        return NextResponse.json({
            gatewayUrl,
            fields: {
                MerchantID,
                TradeInfo,
                TradeSha,
                Version: '2.0',
            },
        });
    } catch (err: any) {
        console.error('[checkout] error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
