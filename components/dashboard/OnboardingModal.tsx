'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUserFlow, UserProfile } from '../../lib/userFlow';
import ContractPanel from './ContractPanel';
import DashboardPanel from './DashboardPanel';

interface OnboardingModalProps {
    plan: string;
    onClose: () => void;
}

const STAGE_LABELS = ['REGISTER', 'CONTRACT', 'DASHBOARD'];

export default function OnboardingModal({ plan, onClose }: OnboardingModalProps) {
    const { flowState, register, profile } = useUserFlow();

    const [form, setForm] = useState<UserProfile>({ id: '', name: '', email: '', phone: '', company: '', plan });

    const currentStage = flowState === 'GUEST' ? 0 : flowState === 'REGISTERED' ? 1 : 2;
    const isFullscreen = flowState === 'REGISTERED' || flowState === 'ACTIVE' || flowState === 'SIGNED';

    // Lock body scroll while modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && flowState !== 'ACTIVE') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [flowState, onClose]);

    const handleRegister = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.email) return;
        register(form, plan);
    }, [form, plan, register]);

    const stageTitle = ['填寫資料 · REGISTER', '線上簽約 · CONTRACT', '任務看板 · DASHBOARD'][currentStage];

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-6'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={flowState !== 'ACTIVE' ? onClose : undefined}
            />

            {/* Modal — small for register/contract, fullscreen for dashboard */}
            <div className={`relative bg-[#000000] border border-zinc-800/60 shadow-2xl flex flex-col transition-all duration-500 ${
                isFullscreen
                    ? 'w-full h-full rounded-none'
                    : 'w-full max-w-lg rounded-2xl max-h-[90vh]'
            }`}>

                {/* Header — hidden on fullscreen (each panel has its own topbar) */}
                {!isFullscreen && <div className="border-b border-zinc-800 px-5 py-3.5 flex items-center justify-between shrink-0">
                    <div>
                        <span className="text-[10px] font-mono text-zinc-600 tracking-widest block">// JAGGER OS · ONBOARDING</span>
                        <h2 className="text-sm font-mono font-bold text-white mt-0.5">{stageTitle}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Stage indicator */}
                        <div className="flex items-center gap-1.5">
                            {STAGE_LABELS.map((label, i) => (
                                <React.Fragment key={label}>
                                    <div className={`flex items-center gap-1 text-[9px] font-mono tracking-widest transition-colors ${i === currentStage ? 'text-[#FF5500]' : i < currentStage ? 'text-emerald-500' : 'text-zinc-700'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${i === currentStage ? 'bg-[#FF5500] animate-pulse' : i < currentStage ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                                        <span className="hidden sm:inline">{label}</span>
                                    </div>
                                    {i < STAGE_LABELS.length - 1 && (
                                        <span className="text-zinc-800 text-[9px]">›</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors ml-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>}


                {/* Body */}
                <div className={`flex-1 min-h-0 ${isFullscreen ? 'p-0 h-full' : 'px-5 py-4 overflow-y-auto'}`}>

                    {/* Stage 0: Register */}
                    {currentStage === 0 && (
                        <form onSubmit={handleRegister} className="flex flex-col gap-4">
                            <p className="text-[11px] font-mono text-zinc-500 leading-relaxed">
                                填妥資料後，系統將開通你的合約簽署頁面。所有資料僅用於服務合約與開案追蹤。
                            </p>
                            {[
                                { key: 'name', label: 'NAME *', placeholder: '姓名 / 代號', type: 'text', required: true },
                                { key: 'email', label: 'EMAIL *', placeholder: 'your@email.com', type: 'email', required: true },
                                { key: 'phone', label: 'PHONE', placeholder: '+886 9xx xxx xxx', type: 'tel', required: false },
                                { key: 'company', label: 'COMPANY', placeholder: '公司 / 品牌名稱（選填）', type: 'text', required: false },
                            ].map(({ key, label, placeholder, type, required }) => (
                                <div key={key}>
                                    <label className="text-[9px] font-mono text-zinc-600 tracking-widest block mb-1">{label}</label>
                                    <input
                                        type={type}
                                        required={required}
                                        placeholder={placeholder}
                                        value={(form as any)[key]}
                                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                        className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2.5 text-[12px] font-mono text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[#FF5500]/60 transition-colors"
                                    />
                                </div>
                            ))}
                            <button
                                type="submit"
                                disabled={!form.name || !form.email}
                                className={`w-full py-3 mt-1 rounded font-mono font-bold text-[11px] tracking-widest uppercase transition-all duration-200 ${form.name && form.email
                                    ? 'bg-[#FF5500] text-black hover:bg-white hover:text-black cursor-pointer'
                                    : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
                                    }`}
                            >
                                確認資料 · 前往簽約
                            </button>
                        </form>
                    )}

                    {/* Stage 1: Contract — fullscreen */}
                    {currentStage === 1 && <ContractPanel plan={plan} onClose={onClose} />}

                    {/* Stage 2: Dashboard — fullscreen */}
                    {currentStage === 2 && <DashboardPanel onClose={onClose} />}
                </div>

                {/* Footer — small modal only */}
                {!isFullscreen && (
                    <div className="border-t border-zinc-900 px-5 py-2.5 shrink-0">
                        <span className="text-[9px] font-mono text-zinc-700 tracking-widest">
                            // JAGGER OS · STUDIO 99+ · SECURE ONBOARDING FLOW
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
