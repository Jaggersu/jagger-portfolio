import React, { useState, useEffect } from 'react';

// 這裡預留 Supabase 狀態結構，若您尚未安裝 @supabase/supabase-js，這段程式碼仍可安全運行（使用預設值）
export default function SubscriptionCards() {
    const [spotsAvailable, setSpotsAvailable] = useState<number>(2); // 預設剩餘 2 位
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        // 下一步驟將在此處串接 Supabase 實時抓取席位邏輯
        // async function fetchSpots() { ... }
    }, []);

    return (
        <section id="subscription" className="py-20 px-4 max-w-4xl mx-auto bg-[#121214]">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-wider text-white font-mono">
                    DESIGN SUBSCRIPTION <span className="text-[#FF5500]">/</span> 設計訂閱制
                </h2>
                <p className="text-zinc-500 text-xs font-mono mt-2 uppercase tracking-widest">
                    移植高效協作邏輯 · 專屬網頁與視覺開發方案
                </p>
            </div>

            <div className="bg-[#0A0A0B] border border-zinc-800 rounded-2xl p-8 md:p-12 relative overflow-hidden max-w-2xl mx-auto group hover:border-[#FF5500] transition-all duration-300">

                {/* 席位狀態動態標籤 */}
                <div className="absolute top-4 right-4 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${spotsAvailable > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-mono text-zinc-400">
                        {spotsAvailable > 0 ? `席位開放中 (剩餘 ${spotsAvailable} 位)` : '席位已額滿 (預約候補)'}
                    </span>
                </div>

                {/* 卡片內容 */}
                <div className="mb-8">
                    <span className="text-xs font-mono text-[#FF5500] tracking-widest">// MONTHLY PLAN</span>
                    <h3 className="text-3xl font-bold text-white mt-1">月費全包制</h3>
                    <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
                        適合需要持續產出高質量網頁開發、品牌識別、系統架構優化的長期合作夥伴。
                    </p>
                </div>

                {/* 核心特色（清單） */}
                <ul className="space-y-3 text-sm font-mono text-zinc-300 border-t border-zinc-900 pt-6 mb-8">
                    <li className="flex items-center gap-3">
                        <span className="text-[#FF5500]">✓</span> 一次交付一項核心任務，隨時可調整優先順序
                    </li>
                    <li className="flex items-center gap-3">
                        <span className="text-[#FF5500]">✓</span> 平均 3-5 專案工作天快速交付交付
                    </li>
                    <li className="flex items-center gap-3">
                        <span className="text-[#FF5500]">✓</span> Next.js + Tailwind CSS 頂級前台架構開發
                    </li>
                    <li className="flex items-center gap-3">
                        <span className="text-[#FF5500]">✓</span> 包含 Supabase / 資料庫基礎架構配置
                    </li>
                </ul>

                {/* 價格與行動按鈕 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-t border-zinc-900 pt-6">
                    <div>
                        <span className="text-[10px] font-mono text-zinc-500 block uppercase tracking-widest">Fixed Pricing</span>
                        <div className="text-2xl font-bold text-white font-mono mt-1">
                            NT$ <span className="text-3xl text-white">45,000</span> <span className="text-sm text-zinc-500 font-normal">/ mo</span>
                        </div>
                    </div>

                    <button
                        disabled={spotsAvailable === 0 || isLoading}
                        className={`px-8 py-3 rounded font-bold text-xs tracking-wider uppercase transition-all duration-300 ${spotsAvailable > 0
                                ? 'bg-[#FF5500] text-black hover:bg-white hover:text-black cursor-pointer'
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            }`}
                    >
                        {spotsAvailable > 0 ? '立即開啟訂閱' : '聯絡候補席位'}
                    </button>
                </div>
            </div>
        </section>
    );
}