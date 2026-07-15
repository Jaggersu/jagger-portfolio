'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function AuthCallbackClient() {
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash');
        const type = (searchParams.get('type') ?? 'magiclink') as 'magiclink' | 'signup' | 'invite';
        const plan = searchParams.get('plan') ?? undefined;

        const finish = async () => {
            let session = null;
            try {
                if (code) {
                    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) throw exchangeError;
                    session = data.session;
                } else if (tokenHash) {
                    const { data, error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
                    if (otpError) throw otpError;
                    session = data.session;
                } else {
                    throw new Error('缺少授權碼或 token，請重新登入。');
                }

                if (!session) throw new Error('無法取得登入 session，請重新登入。');

                const res = await fetch('/api/auth/upsert-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_token: session.access_token,
                        refresh_token: session.refresh_token,
                        expires_in: session.expires_in,
                        token_type: session.token_type,
                        plan,
                        type,
                    }),
                });

                const result = await res.json().catch(() => ({ error: '伺服器無回應' }));
                if (!res.ok || result.error) {
                    throw new Error(result.error || '建立使用者資料失敗');
                }

                window.location.href = result.redirectUrl ?? '/?auth=success';
            } catch (err: any) {
                console.error('Auth callback error:', err);
                const msg = err?.message || '登入處理失敗';
                setError(msg);
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
                window.location.href = `${siteUrl}/?auth=error&msg=${encodeURIComponent(msg)}`;
            }
        };

        finish();
    }, [searchParams]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white px-6">
                <div className="text-center max-w-md">
                    <p className="text-red-400 font-mono text-sm mb-3">登入處理失敗</p>
                    <p className="text-zinc-500 font-mono text-xs leading-relaxed">{error}</p>
                    <a href="/" className="mt-6 inline-block text-[#FF5500] font-mono text-xs tracking-widest">
                        返回首頁 →
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
            <div className="text-center">
                <p className="font-mono text-zinc-400 text-sm tracking-widest">正在處理登入…</p>
            </div>
        </div>
    );
}
