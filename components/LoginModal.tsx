'use client';

import React, { useState } from 'react';
import { useUserFlow } from '../lib/userFlow';

interface LoginModalProps {
    onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
    const { sendMagicLink } = useUserFlow();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setStatus('sending');
        const { error } = await sendMagicLink(email);
        if (error) {
            setErrorMsg(error);
            setStatus('error');
        } else {
            setStatus('sent');
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#0A0A0B] border border-[#27272a] rounded-xl w-full max-w-sm p-8 font-mono relative"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-600 hover:text-white text-lg">×</button>

                <div className="flex items-center gap-2 mb-6">
                    <div className="w-4 h-4 bg-[#FF5500] rounded flex items-center justify-center">
                        <span className="text-[7px] font-black text-black">J</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 tracking-widest">// CLIENT LOGIN</span>
                </div>

                {status === 'sent' ? (
                    <div className="text-center space-y-3">
                        <div className="text-[#FF5500] text-2xl">✓</div>
                        <p className="text-zinc-300 text-sm">Magic link 已寄出</p>
                        <p className="text-zinc-600 text-xs">請檢查 <span className="text-zinc-400">{email}</span> 的收件匣，點擊連結即可登入 Dashboard。</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-[10px] text-zinc-600 block mb-1.5 tracking-widest">EMAIL</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none focus:border-[#FF5500]/60"
                            />
                        </div>

                        {status === 'error' && (
                            <p className="text-red-400 text-xs">{errorMsg}</p>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'sending'}
                            className="w-full py-2.5 bg-[#FF5500] text-black font-bold text-[11px] tracking-widest rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                        >
                            {status === 'sending' ? '寄送中…' : '寄送登入連結 →'}
                        </button>

                        <p className="text-[10px] text-zinc-700 text-center">// 無需密碼，點擊信件連結直接登入</p>
                    </form>
                )}
            </div>
        </div>
    );
}
