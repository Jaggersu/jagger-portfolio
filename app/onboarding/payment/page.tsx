'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUserFlow } from '../../../lib/userFlow';

function OnboardingPaymentContent() {
    const searchParams = useSearchParams();
    const { profile, isLoading } = useUserFlow();
    const [countdown, setCountdown] = useState(3);
    const status = searchParams.get('status') ?? 'processing';

    useEffect(() => {
        if (profile?.status === 'ACTIVE' || profile?.onboarding_completed) {
            const timer = setInterval(() => {
                setCountdown(c => {
                    if (c <= 1) {
                        clearInterval(timer);
                        window.location.href = '/dashboard';
                        return 0;
                    }
                    return c - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [profile]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <p className="font-mono text-zinc-400 text-sm tracking-widest">確認付款狀態…</p>
            </div>
        );
    }

    const success = status === 'success' || profile?.onboarding_completed || profile?.status === 'ACTIVE';

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white px-6">
            <div className="max-w-md w-full text-center space-y-6">
                {success ? (
                    <>
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                            <span className="text-emerald-400 text-2xl">✓</span>
                        </div>
                        <h1 className="text-lg font-mono font-bold text-white">付款完成，已解鎖 Dashboard</h1>
                        <p className="text-zinc-500 font-mono text-xs leading-relaxed">
                            系統已收到款項，將在 {countdown} 秒後自動進入控制台。
                        </p>
                        <Link
                            href="/dashboard"
                            className="inline-block px-5 py-2.5 bg-[#FF5500] hover:bg-white text-black font-mono font-bold text-xs tracking-widest rounded transition-colors"
                        >
                            立即進入 DASHBOARD →
                        </Link>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto">
                            <span className="text-yellow-400 text-2xl">!</span>
                        </div>
                        <h1 className="text-lg font-mono font-bold text-white">等待付款結果</h1>
                        <p className="text-zinc-500 font-mono text-xs leading-relaxed">
                            若已完成付款，Webhook 確認後會自動開通。請稍後再試或聯繫管理員。
                        </p>
                        <Link
                            href="/onboarding/contract"
                            className="inline-block px-5 py-2.5 border border-zinc-800 hover:border-[#FF5500] text-zinc-300 hover:text-white font-mono font-bold text-xs tracking-widest rounded transition-colors"
                        >
                            返回合約頁面
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}

export default function OnboardingPaymentPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-black text-white">
                    <p className="font-mono text-zinc-400 text-sm tracking-widest">確認付款狀態…</p>
                </div>
            }
        >
            <OnboardingPaymentContent />
        </Suspense>
    );
}
