'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useUserFlow } from '../lib/userFlow';
import OnboardingFlow from './onboarding/OnboardingFlow';
import ArrowDown10Icon from './icons/ArrowDown10Icon';
import DownloadIcon from './icons/DownloadIcon';
import CopyIcon from './icons/CopyIcon';
import type { AnimatedIconHandle } from './icons/types';
import dynamic from 'next/dynamic';
import { supabase } from '../lib/supabase';

const ContractDownloadButton = dynamic(
    () => import('./onboarding/ContractPdf').then((m) => m.ContractDownloadButton),
    { ssr: false }
);

interface PlanItem {
    tag: string;
    title: string;
    desc: string;
    price: string;
    period: string;
    features: string[];
    planKey: string;
    checkSpots: boolean;
    isPopular: boolean;
}

function SubscriptionContent() {
    const { flowState, profile } = useUserFlow();
    const [isExpanded, setIsExpanded] = useState(false);
    const arrowIconRef = useRef<AnimatedIconHandle>(null);
    const copyIconRef = useRef<AnimatedIconHandle>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const isOnboarding = params.get('onboarding') === '1';
        const isSuccess = params.get('success') === 'true';
        if (isOnboarding || isSuccess) {
            setIsExpanded(true);
            if (isOnboarding) {
                window.history.replaceState({}, '', window.location.pathname);
            }
            setTimeout(() => {
                const el = document.getElementById('subscription');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                }
            }, 150);
        }
    }, []);

    const openModal = useCallback(() => {
        setIsExpanded(true);
    }, []);

    const plan = {
        tag: '// ON-DEMAND',
        title: '散戶單件計價 (ON-DEMAND)',
        desc: '沒有長期合約，按件估價、按件交付。適合臨時急件、品牌視覺設計、客製化網站建置、或 SaaS 產品 UI/UX 與前端開發需求。',
        features: [
            '✓ 品牌平面與行銷視覺 / 高效 Next.js 網站 / SaaS 產品 UI-UX 整合'
        ],
        planKey: 'ON-DEMAND'
    };

    return (
        <section id="subscription" className="relative w-full bg-[#121214] border-t border-[#1F1F23] overflow-hidden">
            {/* 橘色光暈 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] bg-[#FF5500]/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="py-20 px-6 max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-10">
                    <span className="text-[10px] font-mono text-zinc-600 tracking-widest uppercase block mb-3">// pricing.model</span>
                    <h2 className="text-3xl font-bold tracking-wider text-white font-mono">
                        ON-DEMAND <span className="text-[#FF5500]">/</span> 散戶單件計價
                    </h2>
                    <p className="text-zinc-500 text-xs font-mono mt-2 uppercase tracking-widest">
                        極簡啟動 · 一件一價 · 登入後線上簽約
                    </p>
                </div>

                {/* 橫式引導 Banner */}
                <div className="relative bg-[#0A0A0B] border border-zinc-800 hover:border-[#FF5500]/50 rounded-2xl overflow-hidden transition-all duration-300 group">
                    {/* 角落控制點 */}
                    <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-zinc-700 pointer-events-none" />
                    <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-zinc-700 pointer-events-none" />
                    <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-zinc-700 pointer-events-none" />
                    <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-zinc-700 pointer-events-none" />

                    <div className="flex flex-col md:flex-row items-stretch">
                        {/* 左側：文案 */}
                        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
                            <span className="text-[10px] font-mono text-[#FF5500] tracking-widest block mb-3">{plan.tag}</span>
                            <h3 className="text-2xl md:text-3xl font-bold text-white font-mono mb-4">{plan.title}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed mb-6 max-w-2xl">
                                {plan.desc}
                            </p>
                            <ul className="grid grid-cols-1 gap-3 text-xs font-mono text-zinc-300">
                                {plan.features.map((feature, fIdx) => (
                                    <li key={fIdx} className="flex items-start gap-2 leading-tight">
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 右側：價格與 CTA */}
                        <div className="md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-zinc-900 p-8 md:p-10 flex flex-col justify-center bg-[#080809]">
                            {flowState === 'ACTIVE' ? (
                                <div className="space-y-5 text-center md:text-left">
                                    <span className="text-[9px] font-mono text-[#FF5500] block uppercase tracking-widest mb-1">// STATUS: ACTIVE</span>
                                    <h4 className="text-lg font-bold text-white font-mono">感謝您的支持！</h4>
                                    <p className="text-zinc-500 text-xs font-mono leading-relaxed">
                                        您的付款與簽約流程均已完成，以下為您的合約選項：
                                    </p>
                                    <div className="space-y-2.5 pt-2">
                                        {profile && (
                                            <div className="w-full">
                                                <ContractDownloadButton data={{
                                                    partyName: profile.name,
                                                    partyEmail: profile.email,
                                                    signature: profile.name,
                                                    signedAt: new Date().toISOString(),
                                                }} />
                                            </div>
                                        )}
                                        <button
                                            onClick={openModal}
                                            onMouseEnter={() => copyIconRef.current?.startAnimation()}
                                            onMouseLeave={() => copyIconRef.current?.stopAnimation()}
                                            className="w-full py-2.5 rounded-lg font-bold text-[11px] tracking-wider uppercase transition-all duration-300 border border-[#FF5500] text-white hover:bg-[#FF5500] hover:text-black cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            新增合約
                                            <CopyIcon ref={copyIconRef} size={14} strokeWidth={2} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <span className="text-[9px] font-mono text-zinc-500 block uppercase tracking-widest mb-2">PRICING MODEL</span>
                                    <div className="text-3xl font-bold text-white font-mono mb-1">依案報價</div>
                                    <p className="text-zinc-500 text-xs font-mono mb-6">依案報價 ． 無隱藏費用</p>

                                    <button
                                        onClick={openModal}
                                        onMouseEnter={() => arrowIconRef.current?.startAnimation()}
                                        onMouseLeave={() => arrowIconRef.current?.stopAnimation()}
                                        className="w-full py-3 rounded-lg font-bold text-[12px] tracking-wider uppercase transition-all duration-300 bg-[#FF5500] text-black hover:bg-white hover:text-black cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        立即開始估價
                                        <ArrowDown10Icon ref={arrowIconRef} size={16} strokeWidth={2} />
                                    </button>

                                    <p className="text-[10px] font-mono text-zinc-600 mt-4 text-center tracking-wide">
                                        使用 Google 帳號登入即可開始
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 border-t border-zinc-800' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="min-h-0 overflow-hidden">
                            <OnboardingFlow open={isExpanded} newContract={flowState === 'ACTIVE'} onClose={() => setIsExpanded(false)} />
                        </div>
                    </div>
                </div>

                {/* EOF 終止標記 */}
                <div className="mt-20 flex items-center gap-4 font-mono text-[10px] text-zinc-700">
                    <span className="flex-1 h-px bg-zinc-900" />
                    <span className="tracking-widest">// EOF · JAGGER OS v2.0 · ALL RIGHTS RESERVED</span>
                    <span className="flex-1 h-px bg-zinc-900" />
                </div>
            </div>

        </section>
    );
}

export default function SubscriptionCards() {
    return <SubscriptionContent />;
}