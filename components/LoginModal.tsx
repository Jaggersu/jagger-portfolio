'use client';

import React, { useState, useRef } from 'react';
import { useUserFlow } from '../lib/userFlow';
import XIcon from './icons/XIcon';
import type { AnimatedIconHandle } from './icons/types';

interface LoginModalProps {
    onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
    const { signInWithGoogle } = useUserFlow();
    const [googleLoading, setGoogleLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const closeIconRef = useRef<AnimatedIconHandle>(null);

    const handleGoogleLogin = async () => {
        setErrorMsg('');
        setGoogleLoading(true);
        const { error } = await signInWithGoogle();
        if (error) {
            setErrorMsg(error);
            setGoogleLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#0A0A0B] border border-[#27272a] rounded-xl w-full max-w-sm p-8 font-mono relative"
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    onMouseEnter={() => closeIconRef.current?.startAnimation()}
                    onMouseLeave={() => closeIconRef.current?.stopAnimation()}
                    className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors"
                >
                    <span className="pointer-events-none">
                        <XIcon ref={closeIconRef} size={14} strokeWidth={2} color="currentColor" />
                    </span>
                </button>

                <div className="flex items-center gap-2 mb-6">
                    <div className="w-4 h-4 bg-[#FF5500] rounded flex items-center justify-center">
                        <span className="text-[7px] font-black text-black">J</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 tracking-widest">// CLIENT LOGIN</span>
                </div>

                <p className="text-zinc-500 text-xs font-mono mb-4 leading-relaxed">
                    為確保流程單一與安全，目前僅開放 Google 帳號登入。
                </p>

                {errorMsg && (
                    <p className="text-red-400 text-xs mb-4 font-mono bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                        {errorMsg}
                    </p>
                )}

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black font-bold text-[11px] tracking-widest rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {googleLoading ? '跳轉中…' : '使用 Google 登入'}
                </button>
            </div>
        </div>
    );
}
