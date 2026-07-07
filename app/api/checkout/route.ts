import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function padKey(key: string, len: number): Buffer {
    return Buffer.from(key.padEnd(len, '\0').slice(0, len));
}

function aesEncrypt(data: string, key: string, iv: string): string {
    const cipher = crypto.createCipheriv('aes-256-cbc', padKey(key, 32), padKey(iv, 16));
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function sha256Sign(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex').toLowerCase();
}

export async function POST(req: NextRequest) {
    try {
        const { projectId, amount, title, email, userId, plan } = await req.json();

        // ── Mock 模式：不跳藍新，直接寫入 DB ──
        if (process.env.PAYMENT_MOCK === 'true') {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // 建立 project
            const { data: project, error: projErr } = await supabase
                .from('projects')
                .insert({ user_id: userId, name: title, status: 'ACTIVE' })
                .select()
                .single();
            if (projErr) throw projErr;

            // 建立 contract
            const { error: contractErr } = await supabase
                .from('contracts')
                .insert({
                    project_id: project.id,
                    user_id: userId,
                    status: 'SIGNED',
                    metadata: { plan, amount, mock: true },
                    signed_at: new Date().toISOString(),
                });
            if (contractErr) throw contractErr;

            // 更新 profile plan_type + status
            await supabase
                .from('profiles')
                .update({ plan_type: plan, status: 'ACTIVE' })
                .eq('id', userId);

            // 自動初始化籌備期任務
            const INIT_TASKS = [
                { title: '與 AI 助理 JAVIS 完成核心需求規格收斂',    status: 'QUEUED', priority: 'HIGH', type: 'GENERAL' },
                { title: '上傳既有品牌資產與參考範例至 Files 組件',    status: 'QUEUED', priority: 'MED',  type: 'GENERAL' },
                { title: '預約第一次線上啟動會議（透過 Telegram）',   status: 'QUEUED', priority: 'HIGH', type: 'GENERAL' },
            ];
            await supabase.from('tasks').insert(
                INIT_TASKS.map(t => ({ ...t, project_id: project.id, user_id: userId }))
            );

            return NextResponse.json({
                mock: true,
                projectId: project.id,
                message: '測試模式：專案已建立',
            });
        }

        // ── 正式模式：藍新金流 ──
        const HashKey = process.env.NEWEBPAY_HASH_KEY!;
        const HashIV = process.env.NEWEBPAY_HASH_IV!;
        const MerchantID = process.env.NEWEBPAY_MERCHANT_ID!;
        const gatewayUrl = process.env.NEWEBPAY_URL!;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 先建立 pending project + contract，讓 callback 有東西可更新
        const { data: project, error: projErr } = await supabase
            .from('projects')
            .insert({ user_id: userId, name: title, status: 'PENDING' })
            .select()
            .single();
        if (projErr) throw projErr;

        const TimeStamp = Math.floor(Date.now() / 1000).toString();
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const MerchantOrderNo = `J${TimeStamp}${randomSuffix}`;

        await supabase.from('contracts').insert({
            project_id: project.id,
            user_id: userId,
            status: 'PENDING',
            metadata: { plan, amount, merchantOrderNo: MerchantOrderNo },
        });

        // 移除特殊符號，避免藍新簽章比對失敗
        const safeItemDesc = title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '').trim().slice(0, 50);

        const plainParams = {
            MerchantID,
            RespondType: 'JSON',
            TimeStamp,
            Version: '2.0',
            MerchantOrderNo,
            Amt: String(amount),
            ItemDesc: safeItemDesc || 'JAGGER OS Service',
            Email: email,
            NotifyURL: `${siteUrl}/api/checkout/callback`,
            ReturnURL: `${siteUrl}/?payment=success`,
            ClientBackURL: `${siteUrl}/?payment=cancel`,
            LoginType: '0',
        };
        const tradeData = new URLSearchParams(plainParams).toString();

        // 修正 URLSearchParams 空格編碼：Node 預設 +，藍新預期 %20
        const encodedTradeData = tradeData.replace(/\+/g, '%20');
        const TradeInfo = aesEncrypt(encodedTradeData, HashKey, HashIV).toLowerCase();
        const shaOriginString = `HashKey=${HashKey}&TradeInfo=${TradeInfo}&HashIV=${HashIV}`;
        const TradeSha = sha256Sign(shaOriginString);

        console.log('=== 藍新除錯斷言 ===');
        console.log('HashKey 是否存在:', !!HashKey, 'len:', HashKey?.length);
        console.log('HashIV 是否存在:', !!HashIV, 'len:', HashIV?.length);
        console.log('MerchantID 是否存在:', !!MerchantID, 'len:', MerchantID?.length);
        console.log('plainParams:', plainParams);
        console.log('tradeData (raw):', tradeData);
        console.log('encodedTradeData:', encodedTradeData);
        console.log('shaOriginString:', shaOriginString);
        console.log('TradeInfo:', TradeInfo);
        console.log('TradeSha:', TradeSha);

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
