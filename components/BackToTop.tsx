import React, { useState, useEffect } from 'react';

export default function BackToTop() {
    const [isVisible, setIsVisible] = useState<boolean>(false);

    useEffect(() => {
        const toggleVisibility = () => {
            // 滾動超過 400px 才顯示
            if (window.scrollY > 400) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <button
            onClick={scrollToTop}
            className={`fixed bottom-8 right-8 z-40 bg-[#0A0A0B] border border-zinc-800 hover:border-[#FF5500] w-12 h-12 rounded flex flex-col items-center justify-center transition-all duration-300 shadow-2xl group cursor-pointer ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
            title="回到最上方"
        >
            {/* 科技感箭頭 */}
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-zinc-500 group-hover:text-[#FF5500] group-hover:-translate-y-0.5 transition-all duration-300"
            >
                <polyline points="18 15 12 9 6 15"></polyline>
            </svg>

            {/* Monospace 狀態文字 */}
            <span className="text-[8px] font-mono mt-0.5 tracking-widest text-zinc-600 group-hover:text-[#FF5500] transition-colors duration-300 scale-90">
                TOP
            </span>
        </button>
    );
}