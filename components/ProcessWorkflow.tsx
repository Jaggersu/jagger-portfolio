import React from 'react';

const steps = [
    {
        num: '01',
        title: '提需求',
        desc: '不管你要做的是實體印刷輸出、社群敲碗的數位版 DM、還是整套 SaaS 系統與 PWA 開發。講清楚你要的，能做就接，不能做就交朋友。',
    },
    {
        num: '02',
        title: '定規格',
        desc: '把碎屑整理成規格。從 CMYK 印刷不翻色的檔案格式，到極速響應的網站架構，精準拆解成可以立即執行的項目。把所有邊界劃清楚，不讓進度卡在「感覺」。',
    },
    {
        num: '03',
        title: 'AI協作超速交付',
        desc: ' 無論是平面廣告、UI/UX 還是網頁前端，結合最新 AI 流程協作，產出速度快到你懷疑人生。採取高頻率一步一步對齊交付，不滿意當天直接改，不擠牙膏。',
    },
    {
        num: '04',
        title: '實體輸出或直接噴上線',
        desc: '最後一哩路，絕不拖泥帶水。平面宣傳稿直接送進印刷廠完美落地；網頁、SaaS 與 PWA 則是直接噴上 Vercel 生產環境並搞定權限。搞定收工。',
    },
];

export default function ProcessWorkflow() {
    return (
        <section id="process" className="relative w-full bg-[#0A0A0B] border-t border-[#1F1F23] overflow-hidden">

            {/* 呼應 Hero 的 SVG 向量裝飾線 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" preserveAspectRatio="none">
                <line x1="0" y1="100%" x2="100%" y2="0" stroke="rgba(255,85,0,0.04)" strokeWidth="1" />
                <path d="M -100 400 C 300 100, 700 600, 1600 200" fill="none" stroke="rgba(255,85,0,0.06)" strokeWidth="1" strokeDasharray="6,6" />
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
            </svg>

            {/* 頂部狀態列 — 呼應 Hero footer bar */}
            <div className="w-full border-b border-[#1F1F23] px-6 py-2 flex items-center justify-between font-mono text-[10px] text-zinc-600 bg-[#0A0A0B]/80 backdrop-blur-sm relative z-10">
                <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse" />
                    <span className="tracking-widest uppercase">WORKFLOW ENGINE // ACTIVE</span>
                </div>
                <span className="hidden sm:block tracking-wider">NODES: 04 // STATUS: SEQUENTIAL</span>
            </div>

            <div className="py-20 px-4 max-w-6xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <span className="text-[10px] font-mono text-zinc-600 tracking-widest uppercase block mb-3">// process.workflow</span>
                    <h2 className="text-3xl font-bold tracking-wider text-white font-mono">
                        WORKFLOW <span className="text-[#FF5500]">/</span> 合作流程
                    </h2>
                    <p className="text-zinc-500 text-xs font-mono mt-2 uppercase tracking-widest">
                        AI加速敏捷開發 · 合力精準控管品質
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                    {steps.map((step, idx) => (
                        <div key={step.num} className="relative group">
                            <div className="bg-[#121214] border border-zinc-800/80 rounded-xl p-6 h-full flex flex-col justify-between hover:border-[#FF5500]/60 transition-all duration-300 relative z-10 overflow-hidden">
                                {/* 大數字浮水印 */}
                                <div className="absolute -bottom-3 -right-2 text-8xl font-black font-mono text-zinc-900/60 group-hover:text-[#FF5500]/10 transition-colors duration-500 select-none pointer-events-none leading-none">
                                    {step.num}
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-[#FF5500] font-mono text-xs font-bold tracking-widest">{step.num}</span>
                                        <span className="flex-1 h-px bg-zinc-800 group-hover:bg-[#FF5500]/30 transition-colors duration-300" />
                                    </div>
                                    <h3 className="text-base font-bold text-white mb-3 font-mono leading-snug">
                                        {step.title}
                                    </h3>
                                    <p className="text-zinc-500 text-xs leading-relaxed">
                                        {step.desc}
                                    </p>
                                </div>
                            </div>

                            {idx < steps.length - 1 && (
                                <div className="hidden md:block absolute top-1/2 -right-5 -translate-y-1/2 z-20 text-[#FF5500]/60">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                        <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}