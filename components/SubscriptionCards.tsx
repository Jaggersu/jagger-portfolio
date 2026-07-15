'use client';

import React, { useState, useCallback } from 'react';
import { useUserFlow } from '../lib/userFlow';
import OnboardingModal from './dashboard/OnboardingModal';
import { useRouter } from 'next/navigation';

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
    const router = useRouter();
    const [activeModal, setActiveModal] = useState<string | null>(null);

    const openModal = useCallback((planKey: string) => {
        if (flowState === 'ACTIVE') {
            router.push(profile?.role === 'admin' ? '/admin' : '/dashboard');
            return;
        }
        setActiveModal(planKey);
    }, [flowState, profile?.role, router]);
    const closeModal = useCallback(() => setActiveModal(null), []);

    const plans: PlanItem[] = [
        {
            tag: '// ON-DEMAND',
            title: '散戶單件計價',
            desc: '臨時急件素材製作。未註冊走傳統交付；註冊登入後解鎖 Dashboard 即可線上簽約。',
            price: '論斤計價',
            period: ' / 依件報價',
            features: [
                '單件平面 / 數位 DM 快速製作',
                '24-48 小時內極速交付',
                '⚠️ 註冊登入解鎖 Dashboard',
                '🔑 解鎖後支援線上簽約機制'
            ],
            planKey: 'ON-DEMAND',
            checkSpots: false,
            isPopular: false
        },
        {
            tag: '// LITE',
            title: '平面視覺訂閱',
            desc: '適合需要常態、大量平面與社群視覺素材。填表或掃名片開通後台權限。',
            price: 'NT$ 25,000',
            period: ' / mo',
            features: [
                '平面廣告 / 印刷輸出 / 社群 DM',
                '平均 2-3 專案工作天交付',
                '✅ 標配專屬 Dashboard 看板',
                '✍️ 支援線上簽約與進度追蹤'
            ],
            planKey: 'LITE',
            checkSpots: true,
            isPopular: false
        },
        {
            tag: '// PRO',
            title: '全包廣域核心',
            desc: '資深廣域設計 + AI 狂飆速度 + 頂級 Next.js 前端與 PWA 開發。',
            price: 'NT$ 45,000',
            period: ' / mo',
            features: [
                '平面+數位宣傳+網站設計+PWA',
                '平均 3-5 專案工作天快速交付',
                '✅ 標配專屬 Dashboard 看板',
                '✍️ 支援線上簽約與核心配置'
            ],
            planKey: 'PRO',
            checkSpots: true,
            isPopular: true
        },
        {
            tag: '// SCALE',
            title: '雙軌並行代理',
            desc: '多線專案並進，解鎖雙任務同時推進，由 AI 流程全力全開變現。',
            price: 'NT$ 85,000',
            period: ' / mo',
            features: [
                '服務範疇與 PRO 完全相同',
                '🔥 支援 2 個任務同時推進',
                '✅ 標配專屬 Dashboard 看板',
                '✍️ 支援線上簽約與雙軌追蹤'
            ],
            planKey: 'SCALE',
            checkSpots: true,
            isPopular: false
        },
        {
            tag: '// FIXED PROJECT',
            title: '一次性專案',
            desc: '傳統客一口價首選。完整品牌識別與高階 PWA 開發，標配完整合約與看板。',
            price: 'NT$ 88,000 起',
            period: ' / 一口價',
            features: [
                '完整品牌識別 + 客製網頁開發',
                '依合約進度與甘特圖時程交付',
                '✅ 標配專屬 Dashboard 看板',
                '✍️ 強制啟動線上簽約流程'
            ],
            planKey: 'FIXED',
            checkSpots: false,
            isPopular: false
        }
    ];

    return (
        <section id="subscription" className="relative w-full bg-[#121214] border-t border-[#1F1F23] overflow-hidden">
            {/* 橘色光暈 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#FF5500]/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="py-20 px-6 max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <span className="text-[10px] font-mono text-zinc-600 tracking-widest uppercase block mb-3">// subscription.plan</span>
                    <h2 className="text-3xl font-bold tracking-wider text-white font-mono">
                        DESIGN SUBSCRIPTION <span className="text-[#FF5500]">/</span> 設計訂閱制
                    </h2>
                    <p className="text-zinc-500 text-xs font-mono mt-2 uppercase tracking-widest">
                        移植高效協作邏輯 · 廣域設計與全棧開發多元方案
                    </p>
                </div>

                {/* 方案網格卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`bg-[#0A0A0B] border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group transition-all duration-300 ${plan.isPopular ? 'border-[#FF5500]/60 shadow-[0_0_20px_rgba(255,85,0,0.05)]' : 'border-zinc-800'
                                } hover:border-[#FF5500]/50`}
                        >
                            {/* artboard 角落控制點 */}
                            <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-zinc-700 pointer-events-none" />
                            <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-zinc-700 pointer-events-none" />
                            <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-zinc-700 pointer-events-none" />
                            <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-zinc-700 pointer-events-none" />


                            {/* 卡片內容 */}
                            <div>
                                <div className="mb-6 mt-2">
                                    <span className="text-[10px] font-mono text-[#FF5500] tracking-widest block">{plan.tag}</span>
                                    <h3 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                                        {plan.title}
                                        {plan.isPopular && <span className="text-[9px] bg-[#FF5500]/10 text-[#FF5500] border border-[#FF5500]/30 px-1.5 py-0.5 rounded uppercase tracking-wider">RECOMMENDED</span>}
                                    </h3>
                                    <p className="text-zinc-400 text-xs mt-3 leading-relaxed min-h-[40px]">
                                        {plan.desc}
                                    </p>
                                </div>

                                {/* 核心特色 */}
                                <ul className="space-y-2.5 text-xs font-mono text-zinc-300 border-t border-zinc-900 pt-5 mb-6">
                                    {plan.features.map((feature, fIdx) => (
                                        <li key={fIdx} className="flex items-start gap-2 leading-tight">
                                            <span className="text-[#FF5500] shrink-0">✓</span>
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* 價格與行動按鈕 */}
                            <div className="border-t border-zinc-900 pt-5 mt-auto">
                                <div className="mb-4">
                                    <span className="text-[9px] font-mono text-zinc-500 block uppercase tracking-widest">PRICING MODEL</span>
                                    <div className="text-lg font-bold text-white font-mono mt-0.5">
                                        {plan.price !== '論斤計價' && plan.price !== 'NT$ 88,000 起' ? 'NT$ ' : ''}
                                        <span className="text-2xl text-white font-bold">{plan.price.replace('NT$ ', '').replace(' 起', '')}</span>
                                        {plan.price.includes('起') && <span className="text-sm text-white"> 起</span>}
                                        <span className="text-xs text-zinc-500 font-normal">{plan.period}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => openModal(plan.planKey)}
                                    className="w-full py-2.5 rounded font-bold text-[11px] tracking-wider uppercase transition-all duration-300 bg-[#FF5500] text-black hover:bg-white hover:text-black cursor-pointer"
                                >
                                    {flowState === 'ACTIVE' ? '進入 DASHBOARD →' : '立即申請 →'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* EOF 終止標記 */}
                <div className="mt-20 flex items-center gap-4 font-mono text-[10px] text-zinc-700">
                    <span className="flex-1 h-px bg-zinc-900" />
                    <span className="tracking-widest">// EOF · JAGGER OS v2.0 · ALL RIGHTS RESERVED</span>
                    <span className="flex-1 h-px bg-zinc-900" />
                </div>
            </div>

            {/* Onboarding Modal（統一 Auth / Dashboard 入口） */}
            {activeModal && (
                <OnboardingModal
                    plan={activeModal}
                    onClose={closeModal}
                />
            )}
        </section>
    );
}

export default function SubscriptionCards() {
    return <SubscriptionContent />;
}