import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const INIT_TASKS = [
    { title: '與 AI 助理 JAVIS 完成核心需求規格收斂',    status: 'QUEUED', priority: 'HIGH', type: 'GENERAL' },
    { title: '上傳既有品牌資產與參考範例至 Files 組件',    status: 'QUEUED', priority: 'MED',  type: 'GENERAL' },
    { title: '預約第一次線上啟動會議（透過 Telegram）',   status: 'QUEUED', priority: 'HIGH', type: 'GENERAL' },
];

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

async function ensurePaymentSuccess(merchantOrderNo: string | null) {
    if (!merchantOrderNo) return;
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    // 以 merchantOrderNo 找 contract，並確保只初始化一次
    const { data: contract } = await supabaseAdmin
        .from('contracts')
        .select('project_id, user_id, status')
        .eq('metadata->>merchantOrderNo', merchantOrderNo)
        .single();
    if (!contract?.project_id) return;
    if (contract.status === 'SIGNED') return; // callback 已處理過

    // 1. 啟用專案
    await supabaseAdmin.from('projects').update({ status: 'ACTIVE' }).eq('id', contract.project_id);
    
    // 2. 初始化 Google Drive 資料夾
    try {
        const { initializeProjectDriveFolders } = await import('../../../../lib/googleDrive');
        await initializeProjectDriveFolders(contract.project_id);
    } catch (driveErr) {
        console.error('[Google Drive Return Init Error]', driveErr);
    }

    // 3. 簽署合約
    await supabaseAdmin
        .from('contracts')
        .update({ status: 'SIGNED', signed_at: new Date().toISOString() })
        .eq('project_id', contract.project_id);

    // 4. 更新 profile 狀態為 ACTIVE、onboarding_completed=true 且綁定 plan_type
    const { data: fullContract } = await supabaseAdmin.from('contracts').select('metadata').eq('project_id', contract.project_id).single();
    const plan = (fullContract?.metadata as any)?.plan || 'LITE';
    await supabaseAdmin
        .from('profiles')
        .update({ plan_type: plan, status: 'ACTIVE', onboarding_completed: true })
        .eq('id', contract.user_id);

    // 5. 初始化任務
    const { data: existing } = await supabaseAdmin.from('tasks').select('id').eq('project_id', contract.project_id).limit(1);
    if (!existing || existing.length === 0) {
        await supabaseAdmin.from('tasks').insert(
            INIT_TASKS.map(t => ({ ...t, project_id: contract.project_id, user_id: contract.user_id }))
        );
    }
}

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const payment = searchParams.get('payment') ?? 'success';
    let merchantOrderNo = searchParams.get('MerchantOrderNo');
    
    try {
        const formData = await request.formData();
        const status = formData.get('Status') as string;
        const tradeInfo = formData.get('TradeInfo') as string;
        
        if (tradeInfo) {
            const HashKey = process.env.NEWEBPAY_HASH_KEY!;
            const HashIV = process.env.NEWEBPAY_HASH_IV!;
            const decryptedString = aesDecrypt(tradeInfo, HashKey, HashIV);
            const resultParams = new URLSearchParams(decryptedString);
            const tradeStatus = resultParams.get('Status');
            const decryptedMerchantOrderNo = resultParams.get('MerchantOrderNo');
            
            if (status === 'SUCCESS' && tradeStatus === 'SUCCESS' && decryptedMerchantOrderNo) {
                merchantOrderNo = decryptedMerchantOrderNo;
            }
        } else {
            merchantOrderNo = merchantOrderNo || (formData.get('MerchantOrderNo') as string | null);
        }
    } catch {
        // ignore
    }
    
    if (payment === 'success' && merchantOrderNo) {
        await ensurePaymentSuccess(merchantOrderNo);
    }
    const redirectUrl = new URL(
        payment === 'success' ? '/onboarding/payment?status=success' : '/onboarding/contract?status=cancel',
        request.url
    );
    return NextResponse.redirect(redirectUrl, 302);
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const payment = searchParams.get('payment') ?? 'success';
    const merchantOrderNo = searchParams.get('MerchantOrderNo');
    if (payment === 'success' && merchantOrderNo) {
        await ensurePaymentSuccess(merchantOrderNo);
    }
    const redirectUrl = new URL(
        payment === 'success' ? '/onboarding/payment?status=success' : '/onboarding/contract?status=cancel',
        request.url
    );
    return NextResponse.redirect(redirectUrl, 302);
}
