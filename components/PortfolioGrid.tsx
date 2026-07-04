import React from 'react';

const portfolioItems = [
    {
        id: 'saas',
        tag: 'SaaS SERVICE',
        title: 'SaaS 服務系統開發',
        desc: '行政自動化與系統架構規劃，精簡流程並提升營運效率。',
    },
    {
        id: 'brand',
        tag: 'BRANDING',
        title: '品牌轉型與重塑',
        desc: '14年設計策略導入，從視覺識別到市場定位的全面升級。',
    },
    {
        id: 'engineering',
        tag: 'PHYSICAL',
        title: '實體工程視覺整合',
        desc: '空間視覺與線下體驗落地，精準控管設計細節與工程品質。',
    },
];

export default function PortfolioGrid() {
    return (
        <section className="py-20 px-4 max-w-6xl mx-auto bg-[#121214]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {portfolioItems.map((item) => (
                    <div
                        key={item.id}
                        className="bg-[#0A0A0B] border border-zinc-800 rounded-xl p-8 hover:border-[#FF5500] transition-all duration-300 group cursor-pointer flex flex-col justify-between min-h-[240px]"
                    >
                        <div>
                            <span className="text-xs font-mono tracking-widest text-[#FF5500] block mb-4">
                // {item.tag}
                            </span>
                            <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-[#FF5500] transition-colors duration-300">
                                {item.title}
                            </h3>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                {item.desc}
                            </p>
                        </div>
                        <div className="mt-6 text-zinc-600 group-hover:text-white transition-colors duration-300 text-right text-lg font-mono">
                            →
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}