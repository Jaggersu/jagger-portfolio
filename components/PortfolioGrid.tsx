import React, { useState, useEffect, useRef } from 'react';

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    thumbnailLink: string;
    webViewLink: string;
    category: string;
    externalLink?: string | null;
}

const isPdf = (file: DriveFile) => file.mimeType === 'application/pdf';

export default function PortfolioGrid() {
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('ALL');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isError, setIsError] = useState<boolean>(false);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const lightboxRef = useRef<any>(null);
    const INITIAL_LIMIT = 6;

    useEffect(() => {
        async function fetchPortfolio() {
            try {
                setIsLoading(true);
                setIsError(false);
                const res = await fetch('/api/portfolio');
                if (!res.ok) {
                    console.error('[portfolio] API returned', res.status);
                    setIsError(true);
                    return;
                }
                const data = await res.json();
                if (data.files) setFiles(data.files);
                if (data.categories) setCategories(data.categories);
            } catch (err) {
                console.error('無法讀取作品集資料:', err);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        }
        fetchPortfolio();
    }, []);

    const filteredFiles = activeCategory === 'ALL'
        ? files
        : files.filter(file => file.category === activeCategory);

    const displayedFiles = isExpanded
        ? filteredFiles
        : filteredFiles.slice(0, INITIAL_LIMIT);

    // 每次 displayedFiles 變動後重新初始化 GLightbox（動態載入避免 SSR 錯誤）
    useEffect(() => {
        if (isLoading) return;
        let destroyed = false;

        import('glightbox').then(({ default: GLightbox }) => {
            import('glightbox/dist/css/glightbox.min.css');
            if (destroyed) return;
            if (lightboxRef.current) lightboxRef.current.destroy();
            lightboxRef.current = GLightbox({
                selector: '.glightbox-item',
                touchNavigation: true,
                loop: true,
                closeButton: true,
                skin: 'clean',
                openEffect: 'fade',
                closeEffect: 'fade',
            });
        });

        return () => {
            destroyed = true;
            lightboxRef.current?.destroy();
        };
    }, [displayedFiles, isLoading]);

    const getLightboxHref = (file: DriveFile) => {
        if (isPdf(file)) {
            // Google Drive 預覽 URL 可直接在 iframe 顯示 PDF
            return file.webViewLink;
        }
        // 圖片：用高解析縮圖
        return file.thumbnailLink?.replace(/=s\d+/, '=s1600') || file.webViewLink;
    };

    const getLightboxType = (file: DriveFile) => {
        if (isPdf(file)) return 'iframe';
        return 'image';
    };

    const isMobile = () => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

    return (
        <section className="py-12 px-4 max-w-6xl mx-auto relative">

            {/* 1. 分類切換按鈕 */}
            <div className="flex flex-wrap justify-center gap-3 mb-12 font-mono text-xs">
                <button
                    onClick={() => { setActiveCategory('ALL'); setIsExpanded(false); }}
                    className={`px-4 py-2 rounded transition-all duration-300 ${activeCategory === 'ALL' ? 'bg-[#FF5500] text-black font-bold' : 'bg-[#0A0A0B] text-zinc-400 border border-zinc-800 hover:border-zinc-600 cursor-pointer'}`}
                >
                    ALL / 全部作品
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setIsExpanded(false); }}
                        className={`px-4 py-2 rounded transition-all duration-300 ${activeCategory === cat ? 'bg-[#FF5500] text-black font-bold' : 'bg-[#0A0A0B] text-zinc-400 border border-zinc-800 hover:border-zinc-600 cursor-pointer'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* 2. 網格區塊 */}
            <div className="relative">
                {isLoading ? (
                    <div className="text-center py-20 font-mono text-xs text-zinc-500 animate-pulse tracking-widest">
                        LOADING PORTFOLIO FROM GOOGLE DRIVE...
                    </div>
                ) : isError ? (
                    <div className="text-center py-20 font-mono text-xs text-zinc-500 tracking-widest">
                        <div className="text-zinc-400 mb-2">系統維護中，請稍後再試</div>
                        <div className="text-zinc-700 text-[10px]">PORTFOLIO API UNAVAILABLE</div>
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div className="text-center py-20 font-mono text-xs text-zinc-500 tracking-widest">
                        NO WORKS FOUND IN THIS CATEGORY.
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 transition-all duration-500">
                            {displayedFiles.map((file) => {
                                const isExternal = !!file.externalLink;
                                return isExternal ? (
                                    // 外部連結：直接開新頁，不進燈箱
                                    <a
                                        key={file.id}
                                        href={file.externalLink!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-[#0A0A0B] border border-zinc-800 rounded-xl overflow-hidden group hover:border-[#FF5500] transition-all duration-300 flex flex-col cursor-pointer"
                                    >
                                        <div className="aspect-video w-full bg-zinc-900 relative overflow-hidden border-b border-zinc-950">
                                            {file.thumbnailLink ? (
                                                <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs font-mono">NO PREVIEW</div>
                                            )}
                                            <span className="absolute bottom-3 left-3 bg-zinc-950/80 backdrop-blur-sm text-[10px] text-zinc-400 font-mono px-2 py-0.5 rounded border border-zinc-800">{file.category}</span>
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col justify-between">
                                            <h3 className="text-sm font-medium text-zinc-200 line-clamp-1 group-hover:text-white transition-colors">{file.name}</h3>
                                            <span className="text-[10px] font-mono text-[#FF5500] mt-2 block tracking-widest uppercase">LAUNCH SITE // ➔</span>
                                        </div>
                                    </a>
                                ) : (
                                    // 圖片 / PDF：進 GLightbox 燈箱（PDF 在手機直接開新分頁）
                                    <a
                                        key={file.id}
                                        href={getLightboxHref(file)}
                                        data-type={getLightboxType(file)}
                                        data-title={file.name}
                                        data-description={`<span class="glightbox-cat">${file.category}</span>`}
                                        target={isPdf(file) && isMobile() ? '_blank' : undefined}
                                        rel={isPdf(file) && isMobile() ? 'noopener noreferrer' : undefined}
                                        className={isPdf(file) && isMobile() ? 'bg-[#0A0A0B] border border-zinc-800 rounded-xl overflow-hidden group hover:border-[#FF5500] transition-all duration-300 flex flex-col cursor-pointer' : 'glightbox-item bg-[#0A0A0B] border border-zinc-800 rounded-xl overflow-hidden group hover:border-[#FF5500] transition-all duration-300 flex flex-col cursor-pointer'}
                                    >
                                        <div className="aspect-video w-full bg-zinc-900 relative overflow-hidden border-b border-zinc-950">
                                            {file.thumbnailLink ? (
                                                <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs font-mono">
                                                    {isPdf(file) ? 'PDF' : 'NO PREVIEW'}
                                                </div>
                                            )}
                                            <span className="absolute bottom-3 left-3 bg-zinc-950/80 backdrop-blur-sm text-[10px] text-zinc-400 font-mono px-2 py-0.5 rounded border border-zinc-800">{file.category}</span>
                                            {isPdf(file) && (
                                                <span className="absolute top-3 right-3 bg-[#FF5500]/90 text-black text-[9px] font-mono font-bold px-2 py-0.5 rounded">PDF</span>
                                            )}
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col justify-between">
                                            <h3 className="text-sm font-medium text-zinc-200 line-clamp-1 group-hover:text-white transition-colors">{file.name}</h3>
                                            <span className="text-[10px] font-mono text-[#FF5500] mt-2 block tracking-widest uppercase">
                                                {isPdf(file) ? 'VIEW PDF // ➔' : 'VIEW PROJECT // ➔'}
                                            </span>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>

                        {/* 3. MORE 按鈕 */}
                        {!isExpanded && filteredFiles.length > INITIAL_LIMIT && (
                            <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#121214] via-[#121214]/85 to-transparent flex items-end justify-center pb-2 z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.8)] border-t border-zinc-900/30">
                                <button
                                    onClick={() => setIsExpanded(true)}
                                    className="bg-[#0A0A0B] border border-zinc-800 hover:border-[#FF5500] text-zinc-300 hover:text-white px-8 py-3 rounded font-mono text-xs tracking-widest uppercase transition-all duration-300 shadow-xl cursor-pointer mb-4"
                                >
                                    + MORE WORKS ({filteredFiles.length - INITIAL_LIMIT})
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}