'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ResumeActionButtons() {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    // Short delay to ensure any state or render transitions are settled
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 150);
  };

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col sm:flex-row items-end sm:items-center gap-2.5 print:hidden">
      {/* Return to Portfolio Link */}
      <Link
        href="/"
        className="group flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#141416]/90 hover:bg-zinc-800/90 text-zinc-300 hover:text-white border border-zinc-800/80 backdrop-blur-md text-xs font-mono transition-all shadow-lg hover:border-zinc-700"
        title="返回作品集首頁"
      >
        <svg
          className="w-3.5 h-3.5 text-zinc-400 group-hover:-translate-x-0.5 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>PORTFOLIO</span>
      </Link>

      {/* PRINT Button */}
      <button
        onClick={handlePrint}
        disabled={isPrinting}
        className="group flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#141416]/90 hover:bg-zinc-800/90 active:scale-95 text-zinc-200 hover:text-white border border-zinc-800/80 hover:border-zinc-600 backdrop-blur-md text-xs font-mono font-semibold transition-all shadow-lg cursor-pointer"
        title="開啟瀏覽器列印視窗"
      >
        <svg
          className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#FF5500] transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
        <span>{isPrinting ? 'PREPARING...' : 'PRINT'}</span>
      </button>

      {/* PDF DOWNLOAD Button */}
      <a
        href="/Jagger_Su_Resume.pdf"
        download="Jagger_Su_Resume.pdf"
        className="group relative flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF5500] hover:bg-[#e04b00] active:scale-95 text-white font-mono text-xs font-bold shadow-[0_4px_20px_rgba(255,85,0,0.35)] hover:shadow-[0_6px_25px_rgba(255,85,0,0.5)] transition-all cursor-pointer border border-[#ff6a1f]"
        title="直接下載 PDF 檔案"
      >
        <svg
          className="w-3.5 h-3.5 text-white group-hover:translate-y-0.5 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>PDF DOWNLOAD</span>
      </a>
    </div>
  );
}
