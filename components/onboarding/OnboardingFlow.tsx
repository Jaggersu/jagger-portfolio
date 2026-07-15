'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useUserFlow } from '@/lib/userFlow';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { ContractData } from '@/components/onboarding/ContractPdf';

const ContractDownloadButton = dynamic(
    () => import('@/components/onboarding/ContractPdf').then((m) => m.ContractDownloadButton),
    { ssr: false }
);

const CONTRACT_CLAUSES = [
    ['01', '服務範疇', '乙方依客戶所選方案，提供對應之平面設計、品牌識別、數位素材、網站開發及 AI 輔助工作流程等服務。具體交付項目、頁面數量與功能規格，以雙方簽認之開案確認書及報價單為準，確認書範圍外之額外需求須另行報價。'],
    ['02', '修改次數與範圍變更', '每一交付階段提案包含合理修改次數（訂閱制每月 2 輪、專案制每里程碑 3 輪）。超出次數之修改，或因客戶需求變更導致工作範圍擴大者，乙方得另行報價。客戶如於確認稿後要求重大方向調整，視同新增需求處理。'],
    ['03', '費用、付款與逾期', '本合約服務費用為 [[AMOUNT]]，執行時程為 [[TIMELINE]]。訂閱制方案按月預付，逾期視為自動暫停服務。專案制依開案 50%、交稿 30%、結案 20% 分三期支付。逾期付款超過 7 個工作天，乙方有權暫停所有進行中服務，並得就逾期金額按日加收萬分之三違約金，直至款項全數結清為止。'],
    ['04', '智慧財產權歸屬', '客戶完成全額付款後，乙方將本專案之最終定稿著作財產權完整移轉予客戶。乙方保留：(a) 作品集展示與參展權；(b) 工作流程中所使用之通用框架、元件庫及可重用程式碼之所有權。未獲客戶採用之提案稿，著作權仍歸乙方所有；客戶如需取得，應另行議價。'],
    ['05', '客戶素材與侵權責任', '客戶提供之文字、圖片、商標及其他素材，應保證合法取得且不侵害任何第三方之智慧財產權；因客戶提供素材引發之任何法律責任，由客戶自行承擔，乙方不負連帶責任。乙方所使用之正版圖庫及字型授權，僅限本專案用途，客戶不得自行將相關素材另作他用或轉授權予第三方。'],
    ['06', '合約終止', '訂閱制合約：任何一方得提前 30 個日曆天以書面通知終止，終止前已預付款項不予退還。專案制合約：客戶主動終止時，乙方得依已完成工作比例收取費用，已支付訂金不予退還；乙方主動終止時，應於 7 個工作天內退還未完成部分之預付款。'],
    ['07', '保密條款', '雙方同意對合作過程中取得之商業機密、未公開素材、客戶資料及本合約條款予以嚴格保密；未經對方書面同意，不得向第三方揭露。保密義務於合約終止後繼續存續 3 年。違反保密義務者，應賠償對方因此所受之一切損害。'],
    ['08', '不可抗力', '因天災、戰爭、政府法規變動、網路基礎設施故障、第三方服務中斷（如雲端平台、支付閘道）等不可抗力事件，導致乙方無法如期履約者，乙方得就受影響部分順延時程，雙方均不得以此為由要求違約賠償。'],
    ['09', '準據法與爭議解決', '本合約受中華民國法律管轄。雙方應先以協商方式解決爭議；協商不成時，同意以臺灣臺北地方法院為第一審管轄法院。'],
] as const;

import ArrowBigUpDashIcon from '../icons/ArrowBigUpDashIcon';
import type { AnimatedIconHandle } from '../icons/types';

interface Props {
    open: boolean;
    onClose?: () => void;
    newContract?: boolean;
}

export default function OnboardingFlow({ open, onClose, newContract = false }: Props) {
    const { signInWithGoogle } = useUserFlow();
    const router = useRouter();

    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const [budget, setBudget] = useState('');
    const [timeline, setTimeline] = useState('');
    const [hasSignature, setHasSignature] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [contractScrolled, setContractScrolled] = useState(false);
    const [signing, setSigning] = useState(false);
    const [signError, setSignError] = useState<string | null>(null);
    const [paymentBypassing, setPaymentBypassing] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [newContractSigned, setNewContractSigned] = useState(false);
    const [newContractPaid, setNewContractPaid] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const contractScrollRef = useRef<HTMLDivElement>(null);
    const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
    const closeIconRef = useRef<AnimatedIconHandle>(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    const step = !user
        ? 'auth'
        : !profile
        ? 'auth'
        : newContract
        ? (newContractPaid ? 'success' : newContractSigned ? 'payment' : 'contract')
        : profile.payment_status === 'paid'
        ? 'success'
        : profile.contract_signed
        ? 'payment'
        : 'contract';

    const fetchProfile = useCallback(async (uid: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .maybeSingle();
        setProfile(data);
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
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
            if (!mounted) return;
            const u = session?.user ?? null;
            setUser(u);
            if (u) fetchProfile(u.id);
            else setProfile(null);
        });
        return () => { mounted = false; subscription.unsubscribe(); };
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
                    if (newContract) setNewContractPaid(true);
                    setVerifyingPayment(false);
                    // Clear URL params to clean up state
                    window.history.replaceState({}, '', window.location.pathname);
                } else if (attempts >= 5) {
                    clearInterval(interval);
                    setVerifyingPayment(false);
                }
            }, 2000);

            return () => clearInterval(interval);
        }
    }, [user, fetchProfile, newContract]);

    useEffect(() => {
        if (!open) return;
        setNewContractSigned(false);
        setNewContractPaid(false);
        const el = containerRef.current;
        if (!el) return;
        requestAnimationFrame(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, [open]);

    useEffect(() => {
        const canvas = signatureCanvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;
        context.strokeStyle = '#f4f4f5';
        context.lineWidth = 2;
        context.lineCap = 'round';
        context.lineJoin = 'round';
    }, [step]);

    const handleGoogleLogin = async () => {
        setAuthError(null);
        setAuthLoading(true);
        const { error } = await signInWithGoogle('ON-DEMAND');
        if (error) { setAuthError(error); setAuthLoading(false); }
    };

    const getSignaturePoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (canvas.width / rect.width),
            y: (event.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const startSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!contractScrolled) return;
        const point = getSignaturePoint(event);
        if (!point) return;
        drawingRef.current = true;
        lastPointRef.current = point;
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const drawSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current || !lastPointRef.current) return;
        const point = getSignaturePoint(event);
        const context = signatureCanvasRef.current?.getContext('2d');
        if (!point || !context) return;
        context.beginPath();
        context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        context.lineTo(point.x, point.y);
        context.stroke();
        lastPointRef.current = point;
        setHasSignature(true);
    };

    const stopSignature = () => {
        drawingRef.current = false;
        lastPointRef.current = null;
    };

    const clearSignature = () => {
        const canvas = signatureCanvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const handleSignContract = async () => {
        if (!hasSignature || !agreed || !user || !profile) return;
        setSignError(null);
        setSigning(true);
        const { error } = await supabase.from('profiles').update({
            contract_signed: true,
            signed_at: new Date().toISOString(),
            name: profile.name || user.user_metadata?.name || user.email || '',
        }).eq('id', user.id);
        if (error) { setSignError('簽署失敗，請稍後再試。'); setSigning(false); return; }
        await fetchProfile(user.id);
        if (newContract) setNewContractSigned(true);
        setSigning(false);
    };

    const handleBypassPayment = async () => {
        if (!user || !profile) return;
        setPaymentError(null);
        setPaymentBypassing(true);
        const { error } = await supabase.from('profiles').update({
            payment_status: 'paid',
            status: 'ACTIVE',
            onboarding_completed: true,
        }).eq('id', user.id);
        if (error) { setPaymentError('更新失敗，請稍後再試。'); setPaymentBypassing(false); return; }
        await fetchProfile(user.id);
        if (newContract) setNewContractPaid(true);
        setPaymentBypassing(false);
    };

    const partyName = profile?.name || user?.user_metadata?.name || user?.email || '';
    const partyEmail = profile?.email || user?.email || '';
    const budgetDisplay = budget ? `NT$ ${budget}` : '依件報價';
    const timelineDisplay = timeline || '依需求議定';
    const today = new Date().toLocaleDateString('zh-TW');
    const isDev = process.env.NODE_ENV === 'development';

    const contractData: ContractData = {
        partyName, partyEmail,
        signature: profile?.contract_signed ? profile?.name || partyName : undefined,
        signedAt: profile?.signed_at || undefined,
        budget, timeline,
    };



    return (
        <div ref={containerRef} className="w-full bg-[#0A0A0B] border-t border-zinc-900">
            <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 space-y-5">
                {/* 標題列 */}
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <span className="text-[10px] font-mono text-zinc-600 tracking-widest uppercase block mb-1">
                            {'// JAGGER OS · ONBOARDING'}
                        </span>
                        <h2 className="text-lg sm:text-xl font-bold text-white font-mono tracking-wider">
                            開始 ON-DEMAND 流程
                        </h2>
                        <p className="text-zinc-600 text-[11px] font-mono mt-1">登入 → 簽署合約 → 付款 → 解鎖 Dashboard</p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            onMouseEnter={() => closeIconRef.current?.startAnimation()}
                            onMouseLeave={() => closeIconRef.current?.stopAnimation()}
                            className="text-zinc-600 hover:text-white font-mono text-xs tracking-widest border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                            收合
                            <ArrowBigUpDashIcon ref={closeIconRef} size={15} strokeWidth={1.75} />
                        </button>
                    )}
                </div>

                {/* ─── Step 1: Auth ─── */}
                <section className={`border rounded-2xl p-6 sm:p-8 transition-all duration-500 ${step === 'auth' ? 'border-zinc-800 bg-black' : 'border-zinc-900/60 bg-[#0A0A0B]/80'}`}>
                    <div 
                        onClick={async () => {
                            if (step === 'auth' || step === 'success') return;
                            await supabase.auth.signOut();
                            setUser(null);
                            setProfile(null);
                        }}
                        className={`flex items-center gap-3 mb-4 select-none ${step !== 'auth' && step !== 'success' ? 'cursor-pointer group/step1' : ''}`}
                    >
                        <div className={`w-7 h-7 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] text-xs font-bold font-mono ${step !== 'auth' && step !== 'success' ? 'group-hover/step1:bg-[#FF5500] group-hover/step1:text-black transition-all' : ''}`}>1</div>
                        <h3 className={`text-sm font-mono font-bold text-white ${step !== 'auth' && step !== 'success' ? 'group-hover/step1:text-[#FF5500] transition-colors' : ''}`}>Google 登入</h3>
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
                             <p className="text-zinc-500 text-[11px] font-mono leading-relaxed">使用 Google 帳號登入，我們會自動為你建立專屬工作看板。</p>
                             {authError && (
                                 <p className="text-red-400 text-[11px] font-mono bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{authError}</p>
                             )}
                             <button
                                 onClick={handleGoogleLogin}
                                 disabled={authLoading}
                                 className="flex items-center gap-2 py-2.5 px-6 bg-white text-black font-bold text-[11px] tracking-widest rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                             >
                                 <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24">
                                     <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                     <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                     <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                     <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                 </svg>
                                 {authLoading ? '跳轉中…' : '使用 Google 登入 / 註冊'}
                             </button>
                         </div>
                     ) : (
                         <div className="flex items-center justify-between font-mono w-full">
                             <div className="flex items-center gap-3">
                                 {user?.user_metadata?.avatar_url
                                     ? <img src={user.user_metadata.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                                     : <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs font-bold">✓</div>
                                 }
                                 <div>
                                     <p className="text-white text-sm font-bold">{profile?.name || user?.user_metadata?.name || user?.email}</p>
                                     <p className="text-zinc-500 text-xs">{user?.email}</p>
                                 </div>
                             </div>
                         </div>
                     )}
                </section>

                {/* ─── Step 2: Contract ─── */}
                {(step === 'contract' || step === 'payment' || step === 'success') && (
                    <section className={`border rounded-2xl p-6 sm:p-8 transition-all duration-500 ${step === 'contract' ? 'border-zinc-800 bg-black' : 'border-zinc-900/60 bg-[#0A0A0B]/80'}`}>
                        <div 
                            onClick={async () => {
                                if (step !== 'payment' || !user) return;
                                const { error } = await supabase.from('profiles').update({
                                    contract_signed: false,
                                    signed_at: null,
                                }).eq('id', user.id);
                                if (!error) {
                                    await fetchProfile(user.id);
                                    if (newContract) setNewContractSigned(false);
                                }
                            }}
                            className={`flex items-center gap-3 mb-4 select-none ${step === 'payment' ? 'cursor-pointer group/step2' : ''}`}
                        >
                            <div className={`w-7 h-7 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] text-xs font-bold font-mono ${step === 'payment' ? 'group-hover/step2:bg-[#FF5500] group-hover/step2:text-black transition-all' : ''}`}>2</div>
                             <h3 className={`text-sm font-mono font-bold text-white ${step === 'payment' ? 'group-hover/step2:text-[#FF5500] transition-colors' : ''}`}>線上合約簽署</h3>
                             {step !== 'contract' ? (
                                 <div className="ml-auto flex items-center gap-3">
                                     {step === 'payment' && (
                                         <button
                                             type="button"
                                             onClick={async () => {
                                                 if (!user) return;
                                                 const { error } = await supabase.from('profiles').update({
                                                     contract_signed: false,
                                                     signed_at: null,
                                                 }).eq('id', user.id);
                                                 if (!error) {
                                                     await fetchProfile(user.id);
                                                     if (newContract) setNewContractSigned(false);
                                                 }
                                             }}
                                             className="text-[10px] font-mono text-zinc-400 hover:text-[#FF5500] border border-zinc-800 hover:border-[#FF5500]/40 rounded px-2.5 py-1 transition-all"
                                         >
                                             修改合約內容
                                         </button>
                                     )}
                                     <span className="text-[10px] font-mono text-[#FF5500] tracking-widest">SIGNED</span>
                                 </div>
                             ) : null}
                         </div>

                        {step === 'contract' ? (
                            <div className="space-y-5">
                                <p className="text-zinc-500 text-[11px] font-mono leading-relaxed">填入本次專案的預算與期限，完整閱讀合約後，滾動到底部解鎖電子簽名。</p>

                                {/* 輸入區：預算 & 期限 */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-mono text-zinc-500 tracking-widest block mb-1.5">專案預算（NT$）</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 font-mono text-xs">NT$</span>
                                            <input type="text" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="例如：1,800"
                                                className="w-full bg-[#0D0D0F] border border-zinc-800 rounded-lg pl-9 pr-3 py-2.5 text-sm font-mono text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[#FF5500]/50 transition-colors" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-mono text-zinc-500 tracking-widest block mb-1.5">預估交付期限</label>
                                        <input type="text" value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="例如：24–48 小時"
                                            className="w-full bg-[#0D0D0F] border border-zinc-800 rounded-lg px-3 py-2.5 text-sm font-mono text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[#FF5500]/50 transition-colors" />
                                    </div>
                                </div>

                                {/* 合約本文（暗黑主題） */}
                                <div
                                    ref={contractScrollRef}
                                    onScroll={(event) => {
                                        const target = event.currentTarget;
                                        if (target.scrollHeight - target.scrollTop <= target.clientHeight + 16) setContractScrolled(true);
                                    }}
                                    className="h-[440px] overflow-y-auto rounded-xl border border-zinc-800 bg-[#0D0D0F] p-5 sm:p-7 text-[12px] font-mono leading-relaxed"
                                >
                                    <div className="text-center mb-6">
                                        <span className="text-[9px] text-zinc-600 tracking-widest uppercase block mb-1">{'// CONTRACT'}</span>
                                        <h4 className="text-sm font-bold text-white tracking-widest">設計服務合約書</h4>
                                    </div>
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
                                    <div className="space-y-5 text-zinc-400">
                                        {CONTRACT_CLAUSES.map(([number, title, body]) => {
                                            const [beforeAmount, afterAmount] = body.split('[[AMOUNT]]');
                                            const [beforeTimeline, afterTimeline] = (afterAmount ?? beforeAmount).split('[[TIMELINE]]');
                                            const hasAmount = body.includes('[[AMOUNT]]');
                                            const hasTimeline = body.includes('[[TIMELINE]]');
                                            return (
                                                <div key={number}>
                                                    <h5 className="text-[#FF5500] text-[10px] tracking-widest mb-2">{number}、{title}</h5>
                                                    <p>
                                                        {hasAmount ? beforeAmount : body}
                                                        {hasAmount && <span className={budget ? 'text-white font-bold' : 'text-zinc-500'}>{budgetDisplay}</span>}
                                                        {hasAmount && beforeTimeline}
                                                        {hasTimeline && <span className={timeline ? 'text-white font-bold' : 'text-zinc-500'}>{timelineDisplay}</span>}
                                                        {hasTimeline && afterTimeline}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="h-6 mt-8 flex items-center justify-center">
                                        <span className="text-[9px] text-zinc-700 tracking-widest">{'// END OF CONTRACT'}</span>
                                    </div>
                                </div>

                                {!contractScrolled && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-zinc-600 animate-pulse" />
                                        <p className="text-[11px] font-mono text-zinc-600">請將合約滾動到底部以解鎖電子簽名</p>
                                    </div>
                                )}

                                <div className={`space-y-3 transition-all duration-500 ${contractScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none select-none'}`}>
                                    <div className="border-t border-zinc-800 pt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-[10px] font-mono text-[#FF5500] tracking-widest">{'// 電子簽名'}</label>
                                            <button type="button" onClick={clearSignature} className="text-[10px] font-mono text-zinc-500 hover:text-white border border-zinc-800 rounded px-2 py-1">清除</button>
                                        </div>
                                        <div className="relative h-36 rounded-lg border border-zinc-800 bg-black overflow-hidden">
                                            {!hasSignature && <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-[11px] font-mono text-zinc-700">在此以滑鼠或觸控簽名</span>}
                                            <canvas
                                                ref={signatureCanvasRef}
                                                width={960}
                                                height={288}
                                                className="w-full h-full touch-none cursor-crosshair"
                                                onPointerDown={startSignature}
                                                onPointerMove={drawSignature}
                                                onPointerUp={stopSignature}
                                                onPointerCancel={stopSignature}
                                                onPointerLeave={stopSignature}
                                            />
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setAgreed((value) => !value)} className="flex items-start gap-2.5 text-left">
                                        <span className={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center ${agreed ? 'bg-[#FF5500] border-[#FF5500] text-black' : 'border-zinc-700 text-transparent'}`}>✓</span>
                                        <span className="text-[11px] leading-relaxed font-mono text-zinc-400">我已詳閱合約全文，同意所有條款，並確認此電子簽名具有等同手簽之法律效力。</span>
                                    </button>
                                    {signError && <p className="text-red-400 text-[11px] font-mono bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{signError}</p>}
                                    <button onClick={handleSignContract} disabled={!hasSignature || !agreed || signing}
                                        className="py-2.5 px-6 rounded-lg font-bold text-[11px] tracking-widest uppercase transition-all duration-200 bg-[#FF5500] text-black hover:bg-white disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border disabled:border-zinc-800">
                                        {signing ? '處理中…' : '同意並確認簽署 →'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 font-mono">
                                <div className="w-7 h-7 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] text-xs">✓</div>
                                <div>
                                    <p className="text-white text-sm font-bold">合約已簽署</p>
                                    <p className="text-zinc-500 text-xs">{profile?.signed_at ? new Date(profile.signed_at).toLocaleDateString('zh-TW') : ''}</p>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* ─── Step 3: Payment ─── */}
                {(step === 'payment' || step === 'success') && (
                    <section className={`border rounded-2xl p-6 sm:p-8 transition-all duration-500 ${step === 'payment' ? 'border-zinc-800 bg-black' : 'border-zinc-900/60 bg-[#0A0A0B]/80'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-7 h-7 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] text-xs font-bold font-mono">3</div>
                            <h3 className="text-sm font-mono font-bold text-white">付款解鎖</h3>
                            {step === 'success' && <span className="ml-auto text-[10px] font-mono text-[#FF5500] tracking-widest">PAID</span>}
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
                                <div className="space-y-4">
                                    <p className="text-zinc-500 text-[11px] font-mono leading-relaxed">請完成付款後系統將自動解鎖 Dashboard。</p>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            onClick={() => {
                                                const u = process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL || 'https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_eAXDoDFEJieSUah4qc5Rw64SNEsWfjaqmevXz2dgqDw/redirect';
                                                window.open(u, '_blank', 'noopener,noreferrer');
                                            }}
                                            className="flex-1 py-2.5 px-6 bg-white text-black font-bold text-[11px] tracking-widest rounded-lg hover:bg-zinc-200 transition-colors"
                                        >
                                            前往 Polar 付款 →
                                        </button>
                                        {isDev && (
                                            <button onClick={handleBypassPayment} disabled={paymentBypassing}
                                                className="flex-1 py-2.5 px-6 border border-yellow-600/40 text-yellow-500 font-bold text-[11px] tracking-widest rounded-lg hover:bg-yellow-600/10 transition-colors disabled:opacity-50">
                                                {paymentBypassing ? '處理中…' : '[Dev Only] 繞過付款直接解鎖'}
                                            </button>
                                        )}
                                    </div>
                                    {paymentError && <p className="text-red-400 text-[11px] font-mono bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{paymentError}</p>}
                                </div>
                            )
                        ) : (
                            <div className="flex items-center gap-3 font-mono">
                                <div className="w-7 h-7 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] text-xs">✓</div>
                                <div>
                                    <p className="text-white text-sm font-bold">付款完成</p>
                                    <p className="text-zinc-500 text-xs">你已解鎖 Dashboard 權限</p>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* ─── Step 4: Success ─── */}
                {step === 'success' && (
                    <section className="border border-[#FF5500]/30 rounded-2xl p-8 sm:p-10 bg-gradient-to-b from-[#FF5500]/5 to-transparent text-center">
                        <div className="w-14 h-14 mx-auto rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center mb-5">
                            <span className="text-2xl">🎉</span>
                        </div>
                        <h3 className="text-lg font-bold text-white font-mono mb-2">付款成功！歡迎加入</h3>
                        <p className="text-zinc-500 text-[11px] font-mono mb-8">合約已簽署、付款已完成。你可以下載合約 PDF 存檔，或直接進入工作看板。</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <ContractDownloadButton data={contractData} />
                            <button onClick={() => router.push('/dashboard')}
                                className="inline-flex items-center gap-2 py-2.5 px-6 border border-zinc-700 text-white font-bold text-[11px] tracking-widest rounded-lg hover:border-[#FF5500] hover:text-[#FF5500] transition-colors">
                                進入工作看板 →
                            </button>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
