import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function aesDecrypt(encryptedHex: string, key: string, iv: string): string {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    decipher.setAutoPadding(false);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    const paddingLength = decrypted.charCodeAt(decrypted.length - 1);
    if (paddingLength >= 1 && paddingLength <= 32) {
        return decrypted.slice(0, -paddingLength);
    }
    return decrypted;
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const status = formData.get('Status') as string;
        const tradeInfo = formData.get('TradeInfo') as string;

        if (!tradeInfo) {
            return NextResponse.json({ message: '缺少 TradeInfo' }, { status: 400 });
        }

        const HashKey = process.env.NEWEBPAY_HASH_KEY!;
        const HashIV = process.env.NEWEBPAY_HASH_IV!;

        const decryptedString = aesDecrypt(tradeInfo, HashKey, HashIV);
        const resultParams = new URLSearchParams(decryptedString);

        const tradeStatus = resultParams.get('Status');
        const merchantOrderNo = resultParams.get('MerchantOrderNo');

        const projectId = merchantOrderNo ? merchantOrderNo.split('_')[0] : null;

        console.log('[newebpay/callback]', { status, tradeStatus, merchantOrderNo, projectId });

        if (status === 'SUCCESS' && tradeStatus === 'SUCCESS' && projectId) {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            await supabaseAdmin
                .from('projects')
                .update({ status: 'ACTIVE' })
                .eq('id', projectId);

            await supabaseAdmin
                .from('contracts')
                .update({ status: 'SIGNED', signed_at: new Date().toISOString() })
                .eq('project_id', projectId);

            return new Response('OK', { status: 200 });
        }

        return NextResponse.json({ message: '交易未成功或參數錯誤' }, { status: 400 });
    } catch (error) {
        console.error('[newebpay/callback] error:', error);
        return NextResponse.json({ message: 'Webhook 處理失敗' }, { status: 500 });
    }
}
