import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function padKey(key: string, len: number): Buffer {
    return Buffer.from(key.padEnd(len, '\0').slice(0, len));
}

function aesDecrypt(encryptedHex: string, key: string, iv: string): string {
    const decipher = crypto.createDecipheriv('aes-256-cbc', padKey(key, 32), padKey(iv, 16));
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

            // A. 更新 project 狀態
            await supabaseAdmin
                .from('projects')
                .update({ status: 'ACTIVE' })
                .eq('id', projectId);

            // B. 更新 contract 狀態
            await supabaseAdmin
                .from('contracts')
                .update({ status: 'SIGNED', signed_at: new Date().toISOString() })
                .eq('project_id', projectId);

            // C. 取得 user_id 後初始化籌備期任務
            const { data: project } = await supabaseAdmin
                .from('projects')
                .select('user_id')
                .eq('id', projectId)
                .single();

            if (project?.user_id) {
                const INIT_TASKS = [
                    { title: '與 AI 助理 JAVIS 完成核心需求規格收斂',          status: 'QUEUED', priority: 'HIGH', type: 'GENERAL' },
                    { title: '上傳既有品牌資產與參考範例至 Files 組件',          status: 'QUEUED', priority: 'MED',  type: 'GENERAL' },
                    { title: '預約第一次線上啟動會議（透過 Telegram）',         status: 'QUEUED', priority: 'HIGH', type: 'GENERAL' },
                ];
                await supabaseAdmin.from('tasks').insert(
                    INIT_TASKS.map(t => ({ ...t, project_id: projectId, user_id: project.user_id }))
                );
            }

            return new Response('OK', { status: 200 });
        }

        return NextResponse.json({ message: '交易未成功或參數錯誤' }, { status: 400 });
    } catch (error) {
        console.error('[newebpay/callback] error:', error);
        return NextResponse.json({ message: 'Webhook 處理失敗' }, { status: 500 });
    }
}
