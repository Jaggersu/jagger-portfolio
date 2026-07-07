'use client';

import React, { useState, useEffect } from 'react';

const COOKIE_KEY = 'jagger_cookie_consent';

export default function CookieBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        try {
            const consent = localStorage.getItem(COOKIE_KEY);
            if (!consent) setVisible(true);
        } catch {
            setVisible(true);
        }
    }, []);

    const accept = () => {
        try { localStorage.setItem(COOKIE_KEY, 'accepted'); } catch { /* noop */ }
        setVisible(false);
    };

    const decline = () => {
        try { localStorage.setItem(COOKIE_KEY, 'declined'); } catch { /* noop */ }
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[300] p-4 sm:p-6">
            <div className="max-w-3xl mx-auto bg-[#0A0A0B] border border-zinc-800 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-2xl font-mono">
                <div className="flex items-start gap-3 flex-1">
                    <span className="text-[#FF5500] text-base shrink-0 mt-0.5">🍪</span>
                    <div>
                        <p className="text-[12px] text-zinc-300 leading-relaxed">
                            本網站使用 Cookie 及類似技術以維持登入狀態、改善使用體驗。繼續瀏覽即表示你同意我們的
                            <span className="text-[#FF5500]"> Cookie 政策</span>。
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-1 tracking-widest">// Supabase Auth · Analytics · Session Storage</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                        onClick={decline}
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 border border-zinc-800 hover:border-zinc-700 rounded tracking-widest"
                    >
                        拒絕
                    </button>
                    <button
                        onClick={accept}
                        className="text-[11px] text-black font-bold bg-[#FF5500] hover:bg-white transition-colors px-4 py-1.5 rounded tracking-widest"
                    >
                        接受 →
                    </button>
                </div>
            </div>
        </div>
    );
}
