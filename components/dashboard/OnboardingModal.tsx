'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUserFlow, UserProfile } from '../../lib/userFlow';
import DashboardPanel from './DashboardPanel';
import AdminDashboard from './AdminDashboard';
import XIcon from '../icons/XIcon';
import type { AnimatedIconHandle } from '../icons/types';

interface OnboardingModalProps {
    plan: string;
    onClose: () => void;
}

export default function OnboardingModal({ plan, onClose }: OnboardingModalProps) {
    const { flowState, register, profile, closeDashboard } = useUserFlow();

    const [form, setForm] = useState<UserProfile>({ id: '', name: '', email: '', phone: '', company: '', plan, role: 'client' });
    const [registerError, setRegisterError] = useState<string | null>(null);
    const [registering, setRegistering] = useState(false);

    // GUEST → 填表, REGISTERED → Magic Link 已寄出等待頁, ACTIVE → Dashboard
    const isWaiting = flowState === 'REGISTERED';
    const isDashboard = flowState === 'ACTIVE';
    const closeIconRef = useRef<AnimatedIconHandle>(null);
    const isFullscreen = isDashboard;

    const handleClose = useCallback(() => {
        if (isDashboard) closeDashboard();
        else onClose();
    }, [isDashboard, onClose, closeDashboard]);

    useEffect(() => {
        // Always lock body scroll when the modal is open (prevents background page scrollbar)
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

    const handleRegister = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.email) return;
        setRegisterError(null);
        setRegistering(true);
        const { error } = await register(form, plan);
        setRegistering(false);
        if (error) setRegisterError(error);
    }, [form, plan, register]);

    if (isDashboard) {
        // Check if returning from payment with ?panel=contract
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

            <div className="relative bg-[#000000] border border-zinc-800/60 shadow-2xl flex flex-col w-full max-w-lg rounded-2xl max-h-[90vh]">

                {/* Header */}
                <div className="border-b border-zinc-800 px-5 py-3.5 flex items-center justify-between shrink-0">
                    <div>
                        <span className="text-[10px] font-mono text-zinc-600 tracking-widest block">// JAGGER OS · ONBOARDING</span>
                        <h2 className="text-sm font-mono font-bold text-white mt-0.5">
                            {isWaiting ? '驗證信箕 · CHECK EMAIL' : '填寫資料 · REGISTER'}
                        </h2>
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
                <div className="flex-1 min-h-0 px-5 py-5 overflow-y-auto">

                    {/* 填表 */}
                    {!isWaiting && (
                        <form onSubmit={handleRegister} className="flex flex-col gap-4">
                            <p className="text-[11px] font-mono text-zinc-500 leading-relaxed">
                                填妥後系統將寄送一封登入連結至你的信箱，點擊即可開通 Dashboard 並進入簽約流程。
                            </p>
                            {[
                                { key: 'name',    label: 'NAME *',    placeholder: '姓名 / 代號',         type: 'text',  required: true },
                                { key: 'email',   label: 'EMAIL *',   placeholder: 'your@email.com',      type: 'email', required: true },
                                { key: 'phone',   label: 'PHONE',     placeholder: '+886 9xx xxx xxx',    type: 'tel',   required: false },
                                { key: 'company', label: 'COMPANY',   placeholder: '公司 / 品牌名稱（選填）', type: 'text',  required: false },
                            ].map(({ key, label, placeholder, type, required }) => (
                                <div key={key}>
                                    <label className="text-[11px] font-mono text-[#FF5500] tracking-widest block mb-1.5">{label}</label>
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
                            {registerError && (
                                <p className="text-red-400 text-[11px] font-mono bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{registerError}</p>
                            )}
                            <button
                                type="submit"
                                disabled={!form.name || !form.email || registering}
                                className={`w-full py-3 mt-1 rounded font-mono font-bold text-[11px] tracking-widest uppercase transition-all duration-200 ${
                                    form.name && form.email && !registering
                                        ? 'bg-[#FF5500] text-black hover:bg-white hover:text-black cursor-pointer'
                                        : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
                                }`}
                            >
                                {registering ? '⟳ 寄送登入連結中…' : '送出資料 · 取得登入連結 →'}
                            </button>
                        </form>
                    )}

                    {/* Magic Link 已寄出 */}
                    {isWaiting && (
                        <div className="flex flex-col items-center text-center gap-5 py-6">
                            <div className="w-14 h-14 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF5500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                    <polyline points="22,6 12,13 2,6"/>
                                </svg>
                            </div>
                            <div>
                                <p className="text-white font-mono font-bold text-sm">登入連結已寄出</p>
                                <p className="text-zinc-400 text-[12px] font-mono mt-2 leading-relaxed">
                                    請檢查 <span className="text-[#FF5500]">{profile?.email}</span> 的收件匣<br/>
                                    點擊信中的連結即可自動登入並開通 Dashboard
                                </p>
                            </div>
                            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-left space-y-2">
                                <p className="text-[10px] font-mono text-zinc-600 tracking-widest">// 注意事項</p>
                                <p className="text-[11px] font-mono text-zinc-500 leading-relaxed">· 連結 60 分鐘內有效，點擊後自動失效</p>
                                <p className="text-[11px] font-mono text-zinc-500 leading-relaxed">· 沒收到？請檢查垃圾郵件資料夾</p>
                                <p className="text-[11px] font-mono text-zinc-500 leading-relaxed">· 下次登入同樣使用此信箱取得登入連結</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-[11px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors tracking-widest"
                            >
                                關閉此視窗
                            </button>
                        </div>
                    )}
                </div>

                <div className="border-t border-zinc-900 px-5 py-2.5 shrink-0">
                    <span className="text-[9px] font-mono text-zinc-700 tracking-widest">
                        // JAGGER OS · PASSWORDLESS AUTH · SECURE ONBOARDING
                    </span>
                </div>
            </div>
        </div>
    );
}
