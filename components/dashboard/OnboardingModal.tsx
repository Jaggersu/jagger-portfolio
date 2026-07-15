'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUserFlow } from '../../lib/userFlow';
import DashboardPanel from './DashboardPanel';
import AdminDashboard from './AdminDashboard';
import XIcon from '../icons/XIcon';
import type { AnimatedIconHandle } from '../icons/types';

interface OnboardingModalProps {
    plan: string;
    onClose: () => void;
}

export default function OnboardingModal({ plan, onClose }: OnboardingModalProps) {
    const { flowState, profile, closeDashboard, signInWithGoogle } = useUserFlow();

    const [googleLoading, setGoogleLoading] = useState(false);
    const [googleError, setGoogleError] = useState<string | null>(null);

    const isDashboard = flowState === 'ACTIVE';
    const closeIconRef = useRef<AnimatedIconHandle>(null);

    const handleClose = useCallback(() => {
        if (isDashboard) closeDashboard();
        else onClose();
    }, [isDashboard, onClose, closeDashboard]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isDashboard) onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isDashboard, onClose]);

    const handleGoogleRegister = useCallback(async () => {
        setGoogleError(null);
        setGoogleLoading(true);
        const { error } = await signInWithGoogle(plan);
        setGoogleLoading(false);
        if (error) setGoogleError(error);
    }, [plan, signInWithGoogle]);

    if (isDashboard) {
        const initialNav = typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('panel') === 'contract' ? 'contract' : undefined;
        return (
            <div className="fixed inset-0 z-[100] bg-[#000000]">
                {profile?.role === 'admin'
                    ? <AdminDashboard onClose={handleClose} />
                    : <DashboardPanel onClose={handleClose} initialNav={initialNav as any} />}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-[#000000] border border-zinc-800/60 shadow-2xl flex flex-col w-full max-w-md rounded-2xl max-h-[90vh]">

                {/* Header */}
                <div className="border-b border-zinc-800 px-5 py-3.5 flex items-center justify-between shrink-0">
                    <div>
                        <span className="text-[10px] font-mono text-zinc-600 tracking-widest block">// JAGGER OS · ONBOARDING</span>
                        <h2 className="text-sm font-mono font-bold text-white mt-0.5">登入以開始 · START</h2>
                    </div>
                    <button
                        onClick={onClose}
                        onMouseEnter={() => closeIconRef.current?.startAnimation()}
                        onMouseLeave={() => closeIconRef.current?.stopAnimation()}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                        <span className="pointer-events-none">
                            <XIcon ref={closeIconRef} size={14} strokeWidth={2} color="currentColor" />
                        </span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 min-h-0 px-5 py-8 overflow-y-auto">
                    <div className="flex flex-col items-center text-center gap-5">
                        <p className="text-zinc-500 text-xs font-mono leading-relaxed">
                            為確保流程單一，目前僅支援 Google 帳號登入。<br/>
                            登入後將進入合約簽署與報價流程。
                        </p>

                        {googleError && (
                            <p className="w-full text-red-400 text-[11px] font-mono bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                                {googleError}
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={handleGoogleRegister}
                            disabled={googleLoading}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black font-bold text-[11px] tracking-widest rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            {googleLoading ? '跳轉中…' : '使用 Google 登入 / 註冊'}
                        </button>
                    </div>
                </div>

                <div className="border-t border-zinc-900 px-5 py-2.5 shrink-0">
                    <span className="text-[9px] font-mono text-zinc-700 tracking-widest">
                        // JAGGER OS · GOOGLE-ONLY AUTH · SECURE ONBOARDING
                    </span>
                </div>
            </div>
        </div>
    );
}
