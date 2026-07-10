import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const INIT_TASKS = [
    { title: '與 AI 助理 JAVIS 完成核心需求規格收斂',    status: 'QUEUED', priority: 'HIGH', type: 'GENERAL' },
    { title: '上傳既有品牌資產與參考範例至 Files 組件',    status: 'QUEUED', priority: 'MED',  type: 'GENERAL' },
    { title: '預約第一次線上啟動會議（透過 Telegram）',   status: 'QUEUED', priority: 'HIGH', type: 'GENERAL' },
];

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

    await supabaseAdmin.from('projects').update({ status: 'ACTIVE' }).eq('id', contract.project_id);
    await supabaseAdmin
        .from('contracts')
        .update({ status: 'SIGNED', signed_at: new Date().toISOString() })
        .eq('project_id', contract.project_id);
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
        merchantOrderNo = merchantOrderNo || (formData.get('MerchantOrderNo') as string | null);
    } catch {
        // ignore
    }
    if (payment === 'success' && merchantOrderNo) {
        await ensurePaymentSuccess(merchantOrderNo);
    }
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('payment', payment);
    redirectUrl.searchParams.set('panel', 'contract');
    return NextResponse.redirect(redirectUrl, 302);
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const payment = searchParams.get('payment') ?? 'success';
    const merchantOrderNo = searchParams.get('MerchantOrderNo');
    if (payment === 'success' && merchantOrderNo) {
        await ensurePaymentSuccess(merchantOrderNo);
    }
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('payment', payment);
    redirectUrl.searchParams.set('panel', 'contract');
    return NextResponse.redirect(redirectUrl, 302);
}
