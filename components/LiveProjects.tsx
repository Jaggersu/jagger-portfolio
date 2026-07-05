import React from 'react';

const liveSites = [
    {
        name: 'FUMA CRASH',
        url: 'https://jaggersu888.wixstudio.com/fuma',
        tech: 'Interactive Web / Studio 99+',
        status: '200 OK',
        type: 'PROD',
        snapshot: '/projects/01_fuma.png', // 精準對應 public/projects/01_fuma.png
    },
    {
        name: 'SECURITY UNION WEBSITE',
        url: 'https://security-union-website.vercel.app/',
        tech: 'Next.js / Vercel Deploy',
        status: '200 OK',
        type: 'PROD',
        snapshot: '/projects/02_tysn.png', // 精準對應 public/projects/02_tysn.png
    },
    {
        name: 'STUDIO 99+ OFFICIAL',
        url: 'https://studio99-web.vercel.app/',
        tech: 'React / Tailwind CSS',
        status: '200 OK',
        type: 'PROD',
        snapshot: '/projects/03_studio99.png', // 精準對應 public/projects/03_studio99.png
    },
    {
        name: 'SCATTER STORM',
        url: 'https://scatterstorm.vercel.app/',
        tech: 'Next.js / Tech Stack Integration',
        status: '200 OK',
        type: 'PROD',
        snapshot: '/projects/04_scatterstorm.png', // 精準對應 public/projects/04_scatterstorm.png
    },
    {
        name: 'REBOX WORKFLOW SYSTEM',
        url: 'https://rebox-roan.vercel.app/',
        tech: 'Next.js / Supabase Database',
        status: '200 OK',
        type: 'PROD',
        snapshot: '/projects/05_rebox.png', // 精準對應 public/projects/05_rebox.png
    },
    {
        name: 'AIPT ONE ECOSYSTEM',
        url: 'https://aipt-one.vercel.app/',
        tech: 'Next.js / Generative AI Project',
        status: '403 PENDING',
        type: 'SECRET / IN PROGRESS',
        snapshot: '/projects/06_aipt.png', // 密鄰專案同樣允許淡淡的背景快照，但保持連結封鎖
    },
];

export default function LiveProjects() {
    return (
        <section id="live-sites" className="py-16 px-4 max-w-6xl mx-auto bg-[#0A0A0B] border border-zinc-900 rounded-2xl my-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-zinc-900 pb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-wider text-white font-mono">
                        LIVE PRODUCTION <span className="text-[#FF5500]">/</span> 線上專案
                    </h2>
                    <p className="text-zinc-500 text-xs font-mono mt-1 uppercase tracking-widest">
                        即時線上運行環境 · 正式生產環境驗證
                    </p>
                </div>
                <div className="text-zinc-600 text-[10px] font-mono mt-2 md:mt-0 uppercase tracking-wider">
                    Total Nodes: 06 // Live: 05 // Encrypted: 01
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveSites.map((site) => {
                    const isSecret = site.status.includes('403');
                    return (
                        <a
                            key={site.name}
                            href={isSecret ? undefined : site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block bg-[#121214] border p-5 rounded-xl font-mono transition-all duration-500 relative group overflow-hidden select-none ${isSecret
                                    ? 'border-zinc-900 opacity-60 cursor-not-allowed'
                                    : 'border-zinc-800 hover:border-[#FF5500] cursor-pointer'
                                }`}
                        >
                            {/* 滑鼠移入時淡淡浮現的網站快照背景 (控制在 opacity-15，微縮放動畫) */}
                            {site.snapshot && (
                                <div
                                    className="absolute inset-0 bg-cover bg-center opacity-0 group-hover:opacity-15 transition-all duration-700 ease-out z-0 scale-100 group-hover:scale-105 pointer-events-none"
                                    style={{ backgroundImage: `url(${site.snapshot})` }}
                                />
                            )}

                            {/* 卡片內容容器 (加上 z-10 確保文字階層壓在圖片上方) */}
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                    {/* 頂部節點狀態列 */}
                                    <div className="flex items-center justify-between text-[10px] mb-4 text-zinc-500">
                                        <span className="bg-zinc-950/80 backdrop-blur-sm px-2 py-0.5 rounded border border-zinc-900 tracking-wider">
                                            {site.type}
                                        </span>
                                        <span className={`flex items-center gap-1.5 font-bold ${isSecret ? 'text-zinc-600' : 'text-emerald-500'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isSecret ? 'bg-zinc-600' : 'bg-emerald-500 animate-pulse'}`} />
                                            {site.status}
                                        </span>
                                    </div>

                                    {/* 專案名稱 */}
                                    <h3 className={`text-base font-bold tracking-wide transition-colors duration-300 ${isSecret ? 'text-zinc-500' : 'text-zinc-100 group-hover:text-white'}`}>
                                        {site.name}
                                    </h3>

                                    {/* 技術底層 */}
                                    <p className="text-[11px] text-zinc-500 mt-1">
                                        {site.tech}
                                    </p>
                                </div>

                                {/* 底部署導引指標 */}
                                <div className="mt-6 flex items-center justify-between text-[10px] border-t border-zinc-900/50 pt-3">
                                    <span className="text-zinc-600 tracking-tight">
                                        {isSecret ? 'LOG_ACCESS_DENIED' : site.url.replace('https://', '')}
                                    </span>
                                    {!isSecret && (
                                        <span className="text-zinc-400 group-hover:text-[#FF5500] font-medium transition-colors duration-300">
                                            前往瀏覽 ➔
                                        </span>
                                    )}
                                </div>
                            </div>
                        </a>
                    );
                })}
            </div>
        </section>
    );
}