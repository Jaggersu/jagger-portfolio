'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useUserFlow } from '../lib/userFlow';
import OnboardingFlow from './onboarding/OnboardingFlow';

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
    const { flowState } = useUserFlow();
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (new URLSearchParams(window.location.search).get('onboarding') === '1') {
            setIsExpanded(true);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const openModal = useCallback(() => {
        setIsExpanded(true);
    }, []);

    const plan = {
        tag: '// ON-DEMAND',
        title: '散戶單件計價',
        desc: '沒有長期合約，按件估價、按件交付。適合臨時急件、社群素材、小型平面或數位需求。',
        features: [
            '單件平面 / 數位素材 / 社群圖文',
            '24-48 小時內極速交付',
            '註冊登入後線上估價與簽約',
            '無月費、無綁約，隨用隨付'
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
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-zinc-300">
                                {plan.features.map((feature, fIdx) => (
                                    <li key={fIdx} className="flex items-start gap-2 leading-tight">
                                        <span className="text-[#FF5500] shrink-0">✓</span>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 右側：價格與 CTA */}
                        <div className="md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-zinc-900 p-8 md:p-10 flex flex-col justify-center bg-[#080809]">
                            <span className="text-[9px] font-mono text-zinc-500 block uppercase tracking-widest mb-2">PRICING MODEL</span>
                            <div className="text-3xl font-bold text-white font-mono mb-1">論斤計價</div>
                            <p className="text-zinc-500 text-xs font-mono mb-6">依件報價 · 無隱藏費用</p>

                            <button
                                onClick={openModal}
                                className="w-full py-3 rounded-lg font-bold text-[12px] tracking-wider uppercase transition-all duration-300 bg-[#FF5500] text-black hover:bg-white hover:text-black cursor-pointer"
                            >
                                {flowState === 'ACTIVE' ? '新增合約 →' : '立即開始估價 →'}
                            </button>

                            <p className="text-[10px] font-mono text-zinc-600 mt-4 text-center tracking-wide">
                                使用 Google 帳號登入即可開始
                            </p>
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