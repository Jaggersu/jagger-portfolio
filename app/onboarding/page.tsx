'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useUserFlow } from '@/lib/userFlow';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { ContractData } from '@/components/onboarding/ContractPdf';

import TriangleAlertIcon from '@/components/icons/TriangleAlertIcon';
import type { AnimatedIconHandle } from '@/components/icons/types';

const ContractDownloadButton = dynamic(
    () => import('@/components/onboarding/ContractPdf').then((m) => m.ContractDownloadButton),
    { ssr: false }
);

export default function OnboardingPage() {
    const { signInWithGoogle } = useUserFlow();
    const router = useRouter();

    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const [budget, setBudget] = useState('');
    const [timeline, setTimeline] = useState('');
    const [signature, setSignature] = useState('');
    const [contractScrolled, setContractScrolled] = useState(false);
    const [signing, setSigning] = useState(false);
    const [signError, setSignError] = useState<string | null>(null);

    const [paymentBypassing, setPaymentBypassing] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);

    const contractScrollRef = useRef<HTMLDivElement>(null);
    const contractSentinelRef = useRef<HTMLDivElement>(null);
    const alertIconRef = useRef<AnimatedIconHandle>(null);

    const step = !user
        ? 'auth'
        : !profile
        ? 'auth'
        : profile.payment_status === 'paid'
        ? 'success'
        : profile.contract_signed
        ? 'payment'
        : 'contract';

    const fetchProfile = useCallback(async (uid: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .maybeSingle();
        if (error) {
            console.error('[onboarding] fetch profile error:', error);
        }
        setProfile(data);
        if (data) {
            if (data.contract_budget) setBudget(data.contract_budget);
            if (data.contract_timeline) setTimeline(data.contract_timeline);
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id).finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;
            const nextUser = session?.user ?? null;
            setUser(nextUser);
            if (nextUser) fetchProfile(nextUser.id);
            else setProfile(null);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    const [verifyingPayment, setVerifyingPayment] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === 'true' && user) {
            setVerifyingPayment(true);
            let attempts = 0;
            const interval = setInterval(async () => {
                attempts++;
                const { data } = await supabase
                    .from('profiles')
                    .select('payment_status')
                    .eq('id', user.id)
                    .maybeSingle();

                if (data?.payment_status === 'paid') {
                    clearInterval(interval);
                    await fetchProfile(user.id);
                    setVerifyingPayment(false);
                    window.history.replaceState({}, '', window.location.pathname);
                } else if (attempts >= 5) {
                    clearInterval(interval);
                    setVerifyingPayment(false);
                }
            }, 2000);

            return () => clearInterval(interval);
        }
    }, [user, fetchProfile]);

    useEffect(() => {
        if (step !== 'contract' || !contractScrollRef.current || !contractSentinelRef.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setContractScrolled(true);
            },
            { root: contractScrollRef.current, threshold: 0.1 }
        );
        observer.observe(contractSentinelRef.current);
        return () => observer.disconnect();
    }, [step]);

    const handleGoogleLogin = async () => {
        setAuthError(null);
        setAuthLoading(true);
        const { error } = await signInWithGoogle('ON-DEMAND');
        if (error) {
            setAuthError(error);
            setAuthLoading(false);
        }
    };

    const handleSignContract = async () => {
        if (!signature.trim() || !user || !profile) return;
        setSignError(null);
        setSigning(true);

        const signedAt = new Date().toISOString();
        const { error } = await supabase
            .from('profiles')
            .update({
                contract_signed: true,
                signed_at: signedAt,
                name: profile.name || user.user_metadata?.name || signature.trim(),
            })
            .eq('id', user.id);

        if (error) {
            console.error('[onboarding] sign contract error:', error);
            setSignError('簽署失敗，請稍後再試。');
            setSigning(false);
            return;
        }

        await fetchProfile(user.id);
        setSigning(false);
    };

    const handleBypassPayment = async () => {
        if (!user || !profile) return;
        setPaymentError(null);
        setPaymentBypassing(true);

        const { error } = await supabase
            .from('profiles')
            .update({
                payment_status: 'paid',
                status: 'ACTIVE',
                onboarding_completed: true,
            })
            .eq('id', user.id);

        if (error) {
            console.error('[onboarding] bypass payment error:', error);
            setPaymentError('繞過付款更新失敗，請稍後再試。');
            setPaymentBypassing(false);
            return;
        }

        await fetchProfile(user.id);
        setPaymentBypassing(false);
    };

    const partyName = profile?.name || user?.user_metadata?.name || user?.email || '';
    const partyEmail = profile?.email || user?.email || '';
    const budgetDisplay = budget ? `NT$ ${budget}` : '依件報價';
    const timelineDisplay = timeline || '依需求議定';
    const today = new Date().toLocaleDateString('zh-TW');

    const contractData: ContractData = {
        partyName,
        partyEmail,
        signature: profile?.contract_signed ? signature || profile?.name : undefined,
        signedAt: profile?.signed_at || undefined,
        budget,
        timeline,
    };

    const isDev = process.env.NODE_ENV === 'development';

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center font-mono text-zinc-500 text-sm">
                載入中…
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#0A0A0B] py-12 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto space-y-6">
                <header className="text-center mb-10">
                    <span className="text-[10px] font-mono text-zinc-600 tracking-widest uppercase block mb-3">
                        // JAGGER OS · ONBOARDING
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-wider">
                        開始 ON-DEMAND 流程
                    </h1>
                    <p className="text-zinc-500 text-xs font-mono mt-2">登入 → 簽署合約 → 付款 → 解鎖 Dashboard</p>
                </header>

                {/* Step 1: Auth */}
                <section
                    className={`relative border rounded-2xl p-6 sm:p-8 transition-all duration-500 ${
                        step === 'auth'
                            ? 'border-zinc-800 bg-[#000000]'
                            : 'border-zinc-900/60 bg-[#0A0A0B]/80 opacity-80'
                    }`}
                >
                    <div 
                        onClick={async () => {
                            if (step === 'auth' || step === 'success') return;
                            await supabase.auth.signOut();
                            setUser(null);
                            setProfile(null);
                        }}
                        className={`flex items-center gap-3 mb-4 select-none ${step !== 'auth' && step !== 'success' ? 'cursor-pointer group/step1' : ''}`}
                    >
                        <div className={`w-8 h-8 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] text-xs font-bold ${step !== 'auth' && step !== 'success' ? 'group-hover/step1:bg-[#FF5500] group-hover/step1:text-black transition-all' : ''}`}>1</div>
                        <h2 className={`text-sm font-mono font-bold text-white ${step !== 'auth' && step !== 'success' ? 'group-hover/step1:text-[#FF5500] transition-colors' : ''}`}>Google 登入</h2>
                        {step !== 'auth' && (
                            <div className="ml-auto flex items-center gap-3">
                                <span className="text-[10px] font-mono text-zinc-500 group-hover/step1:text-[#FF5500] border border-zinc-900 group-hover/step1:border-[#FF5500]/40 px-2.5 py-1 rounded transition-all">
                                    登出帳號
                                </span>
                                <span className="text-[10px] font-mono text-[#FF5500] tracking-widest">DONE</span>
                            </div>
                        )}
                    </div>

                    {step === 'auth' ? (
                        <div className="space-y-4">
                            <p className="text-zinc-400 text-xs font-mono leading-relaxed">
                                為確保流程單一與安全，請使用 Google 帳號登入，我們會自動為你建立專屬工作看板。
                            </p>
                            {authError && (
                                <p className="text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                                    {authError}
                                </p>
                            )}
                            <button
                                onClick={handleGoogleLogin}
                                disabled={authLoading}
                                className="w-full sm:w-auto flex items-center justify-center gap-3 py-3 px-8 bg-transparent text-white font-bold text-xs tracking-widest rounded-lg border border-[#FF5500] hover:bg-[#FF5500] hover:text-black transition-all duration-300 disabled:opacity-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                {authLoading ? '跳轉中…' : '使用 Google 登入 / 註冊'}
                            </button>
                        </div>
                     ) : (
                         <div className="flex items-center justify-between font-mono w-full text-sm text-zinc-300">
                             <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                                     {user?.user_metadata?.avatar_url ? (
                                         <img
                                             src={user.user_metadata.avatar_url}
                                             alt="avatar"
                                             className="w-full h-full rounded-full object-cover"
                                         />
                                     ) : (
                                         '✓'
                                     )}
                                 </div>
                                 <div>
                                     <p className="text-white font-bold">{profile?.name || user?.user_metadata?.name || user?.email}</p>
                                     <p className="text-zinc-500 text-xs">{user?.email}</p>
                                 </div>
                             </div>
                         </div>
                     )}
                </section>

                {/* Step 2: Contract */}
                {(step === 'contract' || step === 'payment' || step === 'success') && (
                    <section
                        className={`relative border rounded-2xl p-6 sm:p-8 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 ${
                            step === 'contract'
                                ? 'border-zinc-800 bg-[#000000]'
                                : 'border-zinc-900/60 bg-[#0A0A0B]/80 opacity-80'
                        }`}
                    >
                        <div 
                            onClick={async () => {
                                if (step !== 'payment' || !user) return;
                                const { error } = await supabase.from('profiles').update({
                                    contract_signed: false,
                                    signed_at: null,
                                }).eq('id', user.id);
                                if (!error) {
                                    await fetchProfile(user.id);
                                }
                            }}
                            className={`flex items-center gap-3 mb-4 select-none ${step === 'payment' ? 'cursor-pointer group/step2' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] text-xs font-bold ${step === 'payment' ? 'group-hover/step2:bg-[#FF5500] group-hover/step2:text-black transition-all' : ''}`}>
                                2
                            </div>
                             <h2 className={`text-sm font-mono font-bold text-white ${step === 'payment' ? 'group-hover/step2:text-[#FF5500] transition-colors' : ''}`}>線上合約簽署</h2>
                             {step !== 'contract' ? (
                                 <div className="ml-auto flex items-center gap-3">
                                     {step === 'payment' && (
                                         <span className="text-[10px] font-mono text-zinc-400 group-hover/step2:text-[#FF5500] border border-zinc-800 group-hover/step2:border-[#FF5500]/40 rounded px-2.5 py-1 transition-all">
                                             修改合約內容
                                         </span>
                                     )}
                                     <span className="text-[10px] font-mono text-[#FF5500] tracking-widest">SIGNED</span>
                                 </div>
                             ) : null}
                         </div>

                        {step === 'contract' ? (
                            <div className="space-y-5">
                                <p className="text-zinc-500 text-[11px] font-mono leading-relaxed">
                                    填入本次專案的預算與期限後，請完整閱讀合約。滾動到底部後即可解鎖電子簽名。
                                </p>

                                {/* 動態輸入：預算 & 期限 */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-mono text-zinc-500 tracking-widest block mb-1.5">
                                            專案預算（NT$）
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 font-mono text-xs">NT$</span>
                                            <input
                                                type="text"
                                                value={budget}
                                                onChange={(e) => setBudget(e.target.value)}
                                                placeholder="例如：1,800"
                                                className="w-full bg-[#0D0D0F] border border-zinc-800 rounded-lg pl-9 pr-3 py-2.5 text-sm font-mono text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[#FF5500]/50 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-mono text-zinc-500 tracking-widest block mb-1.5">
                                            預估交付期限
                                        </label>
                                        <input
                                            type="text"
                                            value={timeline}
                                            onChange={(e) => setTimeline(e.target.value)}
                                            placeholder="例如：24–48 小時"
                                            className="w-full bg-[#0D0D0F] border border-zinc-800 rounded-lg px-3 py-2.5 text-sm font-mono text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[#FF5500]/50 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* 合約本文（暗黑主題） */}
                                <div
                                    ref={contractScrollRef}
                                    className="h-[460px] overflow-y-auto rounded-xl border border-zinc-800 bg-[#0D0D0F] p-5 sm:p-7 text-[12px] font-mono leading-relaxed"
                                >
                                    {/* 標題 */}
                                    <div className="text-center mb-6">
                                        <span className="text-[9px] text-zinc-600 tracking-widest uppercase block mb-1">// CONTRACT</span>
                                        <h3 className="text-sm font-bold text-white tracking-widest">設計服務合約書</h3>
                                    </div>

                                    {/* 當事人資訊 */}
                                    <div className="space-y-2 mb-6 pb-5 border-b border-zinc-800/60">
                                        {[
                                            { label: '甲方', value: 'Jagger OS / Jagger Su（jaggersu@gmail.com）', accent: false },
                                            { label: '乙方', value: `${partyName}（${partyEmail}）`, accent: false },
                                            { label: '方案', value: '散戶單件計價（ON-DEMAND）', accent: true },
                                            { label: '報價', value: budgetDisplay, accent: !!budget },
                                            { label: '期限', value: timelineDisplay, accent: !!timeline },
                                            { label: '簽約日', value: today, accent: false },
                                        ].map(({ label, value, accent }) => (
                                            <div key={label} className="flex gap-3">
                                                <span className="text-zinc-600 w-12 shrink-0">{label}</span>
                                                <span className={accent ? 'text-[#FF5500]' : 'text-zinc-300'}>{value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 條款 */}
                                    <div className="space-y-5 text-zinc-400">
                                        <div>
                                            <h4 className="text-[#FF5500] text-[13px] font-bold tracking-widest mb-2">一、服務內容</h4>
                                            <p className="leading-relaxed">甲方依乙方需求提供單件式設計服務，範圍包含平面素材、數位圖文、社群素材等。每件服務採個別報價、個別交付，無長期綁約或月費。</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[#FF5500] text-[13px] font-bold tracking-widest mb-2">二、報價與付款</h4>
                                            <p className="leading-relaxed">
                                                本次專案報價為{' '}
                                                <span className={budget ? 'text-white font-bold' : 'text-zinc-500'}>{budgetDisplay}</span>
                                                ，經乙方確認後付款。甲方收到款項後始開始製作。若乙方於製作開始前取消，可全額退款；製作開始後恕不退款。
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className="text-[#FF5500] text-[13px] font-bold tracking-widest mb-2">三、交付與修改</h4>
                                            <p className="leading-relaxed">
                                                甲方於收到款項後{' '}
                                                <span className={timeline ? 'text-white font-bold' : 'text-zinc-500'}>{timelineDisplay}</span>
                                                {' '}內提供初稿。乙方享有 2 次小幅度修改機會；涉及新增範圍或大幅度調整，甲方得重新報價。
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className="text-[#FF5500] text-[13px] font-bold tracking-widest mb-2">四、智慧財產權</h4>
                                            <p className="leading-relaxed">乙方於付清款項後取得最終檔案之使用權。原始檔、設計源檔與相關源碼仍歸甲方所有，除非雙方另有書面約定。</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[#FF5500] text-[13px] font-bold tracking-widest mb-2">五、保密義務</h4>
                                            <p className="leading-relaxed">雙方對於專案相關資訊、檔案與溝通內容負有保密義務，未經對方同意不得揭露予第三人。</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[#FF5500] text-[13px] font-bold tracking-widest mb-2">六、爭議處理</h4>
                                            <p className="leading-relaxed">本合約以中華民國法律為準據法。雙方同意以誠信協商解決爭議；協商不成，雙方同意以台北地方法院為第一審管轄法院。</p>
                                        </div>
                                    </div>

                                    {/* Sentinel：滾動到底觸發解鎖 */}
                                    <div ref={contractSentinelRef} className="h-6 mt-8 flex items-center justify-center">
                                        <span className="text-[9px] text-zinc-700 tracking-widest">// END OF CONTRACT</span>
                                    </div>
                                </div>

                                {/* 滾動提示 */}
                                <div className={`flex items-center gap-2 transition-opacity duration-300 ${contractScrolled ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                                    <div className="w-1 h-1 rounded-full bg-zinc-600 animate-pulse" />
                                    <p className="text-[11px] font-mono text-zinc-600">請將合約滾動到底部以解鎖電子簽名</p>
                                </div>

                                {/* 簽名區塊 */}
                                <div className={`space-y-3 transition-all duration-500 ${contractScrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none select-none'}`}>
                                    <div className="border-t border-zinc-800 pt-4">
                                        <label className="text-[10px] font-mono text-[#FF5500] tracking-widest block mb-2">
                                            // 電子簽名（請輸入你的全名）
                                        </label>
                                        <input
                                            type="text"
                                            value={signature}
                                            onChange={(e) => setSignature(e.target.value)}
                                            placeholder="例如：王小明"
                                            className="w-full bg-[#0D0D0F] border border-zinc-800 rounded-lg px-3 py-2.5 text-sm font-mono text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[#FF5500]/50 transition-colors"
                                        />
                                    </div>

                                    {signError && (
                                        <p className="text-red-400 text-[11px] font-mono bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                                            {signError}
                                        </p>
                                    )}

                                    <button
                                        onClick={handleSignContract}
                                        disabled={!signature.trim() || signing}
                                        className="w-full sm:w-auto py-2.5 px-6 rounded-lg font-bold text-[11px] tracking-widest uppercase transition-all duration-200 bg-[#FF5500] text-black hover:bg-white disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border disabled:border-zinc-800"
                                    >
                                        {signing ? '處理中…' : '同意並確認簽署 →'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-sm text-zinc-300 font-mono">
                                <div className="w-8 h-8 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] text-xs font-bold">
                                    ✓
                                </div>
                                <div>
                                    <p className="text-white font-bold">合約已簽署</p>
                                    <p className="text-zinc-500 text-xs">
                                        {profile?.signed_at
                                            ? new Date(profile.signed_at).toLocaleDateString('zh-TW')
                                            : ''}
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Step 3: Payment */}
                {(step === 'payment' || step === 'success') && (
                    <section
                        className={`relative border rounded-2xl p-6 sm:p-8 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 ${
                            step === 'payment'
                                ? 'border-zinc-800 bg-[#000000]'
                                : 'border-zinc-900/60 bg-[#0A0A0B]/80 opacity-80'
                        }`}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] text-xs font-bold">
                                3
                            </div>
                            <h2 className="text-sm font-mono font-bold text-white">付款解鎖</h2>
                            {step === 'success' && (
                                <span className="ml-auto text-[10px] font-mono text-[#FF5500] tracking-widest">PAID</span>
                            )}
                        </div>

                        {step === 'payment' ? (
                            verifyingPayment ? (
                                <div className="flex items-center gap-3 font-mono text-zinc-400 py-2">
                                    <svg className="animate-spin h-4 w-4 text-[#FF5500]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="text-[11px]">正在確認付款狀態 (Verifying Payment Status)...</span>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <p className="text-zinc-400 text-xs font-mono leading-relaxed">
                                        請點擊下方 Polar 付款按鈕完成付款。完成後系統將自動解鎖 Dashboard。
                                    </p>

                                    <div 
                                        onMouseEnter={() => alertIconRef.current?.startAnimation()}
                                        onMouseLeave={() => alertIconRef.current?.stopAnimation()}
                                        className="flex items-start gap-3 border border-yellow-600/30 bg-yellow-600/5 rounded-lg p-3 text-yellow-500/80 font-mono text-[11px] leading-relaxed"
                                    >
                                        <span className="shrink-0 pt-0.5">
                                            <TriangleAlertIcon ref={alertIconRef} size={15} strokeWidth={2} color="#facc15" />
                                        </span>
                                        <div>
                                            <span className="font-bold text-[#facc15] block mb-0.5">// 注意事項</span>
                                            前往 Polar 付款頁面時，<span className="text-white font-bold underline">請務必自行輸入您的合約總額 ({budgetDisplay})</span>。
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            onClick={() => {
                                                const url = process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL || 'https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_eAXDoDFEJieSUah4qc5Rw64SNEsWfjaqmevXz2dgqDw/redirect';
                                                window.location.href = url;
                                            }}
                                            className="flex-1 py-2.5 px-6 bg-white text-black font-bold text-[11px] tracking-widest rounded-lg hover:bg-zinc-200 transition-colors"
                                        >
                                            前往 Polar 付款 →
                                        </button>

                                        {isDev && (
                                            <button
                                                onClick={handleBypassPayment}
                                                disabled={paymentBypassing}
                                                className="flex-1 py-2.5 px-6 border border-yellow-600/40 text-yellow-500 font-bold text-[11px] tracking-widest rounded-lg hover:bg-yellow-600/10 transition-colors disabled:opacity-50"
                                            >
                                                {paymentBypassing ? '處理中…' : '[Dev Only] 繞過付款直接解鎖'}
                                            </button>
                                        )}
                                    </div>

                                    {paymentError && (
                                        <p className="text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                                            {paymentError}
                                        </p>
                                    )}
                                </div>
                            )
                        ) : (
                            <div className="flex items-center gap-3 text-sm text-zinc-300 font-mono">
                                <div className="w-8 h-8 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] text-xs font-bold">
                                    ✓
                                </div>
                                <div>
                                    <p className="text-white font-bold">付款完成</p>
                                    <p className="text-zinc-500 text-xs">你已解鎖 Dashboard 權限</p>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Step 4: Success */}
                {step === 'success' && (
                    <section className="relative border border-[#FF5500]/40 rounded-2xl p-8 sm:p-10 bg-gradient-to-b from-[#FF5500]/5 to-transparent text-center animate-in fade-in zoom-in duration-500">
                        <div className="w-16 h-16 mx-auto rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center mb-5">
                            <span className="text-2xl">🎉</span>
                        </div>
                        <h2 className="text-xl font-bold text-white font-mono mb-2">付款成功！歡迎加入</h2>
                        <p className="text-zinc-400 text-xs font-mono mb-8">
                            合約已簽署、付款已完成。你可以下載合約 PDF 存檔，或直接進入工作看板。
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <ContractDownloadButton data={contractData} />
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="inline-flex items-center justify-center gap-2 py-2.5 px-6 border border-zinc-700 text-white font-bold text-[11px] tracking-widest rounded-lg hover:border-[#FF5500] hover:text-[#FF5500] transition-colors"
                            >
                                進入工作看板 →
                            </button>
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
