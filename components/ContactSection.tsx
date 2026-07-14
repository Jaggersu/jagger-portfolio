'use client';

import React, { useState, useRef } from 'react';
import BrandTelegramIcon from './icons/BrandTelegramIcon';
import CopyrightIcon from './icons/CopyrightIcon';
import MailFilledIcon from './icons/MailFilledIcon';
import type { AnimatedIconHandle } from './icons/types';

export default function ContactSection() {
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const telegramIconRef = useRef<AnimatedIconHandle>(null);
    const copyrightIconRef = useRef<AnimatedIconHandle>(null);
    const emailIconRef = useRef<AnimatedIconHandle>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.email || !form.message) return;
        setSending(true);
        try {
            await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            setSent(true);
        } catch {
            alert('發送失敗，請稍後再試');
        }
        setSending(false);
    };

    return (
        <section id="contact" className="relative bg-[#0A0A0B] border-t border-[#1F1F23] py-24 px-6">
            <div className="max-w-5xl mx-auto">
                {/* Section Header */}
                <div className="mb-16 text-center">
                    <div className="inline-block px-3 py-1 border border-[#FF5500]/30 rounded text-[10px] font-mono text-[#FF5500] tracking-widest mb-4">
                        // CONTACT
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                        Let&apos;s Build Something
                    </h2>
                    <p className="text-zinc-500 text-sm mt-3 font-mono">
                        選擇你偏好的聯繫方式
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Left — Telegram */}
                    <div
                        className="flex flex-col items-center justify-center p-8 border border-[#1F1F23] rounded-xl bg-[#0c0c0e] hover:border-[#FF5500]/30 transition-colors"
                        onMouseEnter={() => telegramIconRef.current?.startAnimation()}
                        onMouseLeave={() => telegramIconRef.current?.stopAnimation()}
                    >
                        <div className="w-14 h-14 rounded-full bg-[#FF5500]/10 flex items-center justify-center mb-5 pointer-events-none">
                            <BrandTelegramIcon ref={telegramIconRef} size={28} color="#FF5500" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2 font-mono">Telegram</h3>
                        <p className="text-zinc-500 text-xs text-center mb-6 font-mono leading-relaxed">
                            即時通訊，快速討論專案需求<br />回覆時間：通常 1 小時內
                        </p>
                        <a
                            href="https://t.me/jaggersu"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-2.5 bg-[#FF5500] hover:bg-white text-black text-[11px] font-bold font-mono tracking-wider rounded transition-colors"
                        >
                            OPEN TELEGRAM →
                        </a>
                    </div>

                    {/* Right — Email Form */}
                    <div className="p-8 border border-[#1F1F23] rounded-xl bg-[#0c0c0e]">
                        <div className="flex items-center gap-2 mb-6">
                            <div
                                className="w-10 h-10 rounded-full bg-[#FF5500]/10 flex items-center justify-center cursor-pointer"
                                onMouseEnter={() => emailIconRef.current?.startAnimation()}
                                onMouseLeave={() => emailIconRef.current?.stopAnimation()}
                            >
                                <MailFilledIcon ref={emailIconRef} size={20} color="#FF5500" strokeWidth={1.5} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white font-mono">Email</h3>
                                <p className="text-zinc-600 text-[10px] font-mono">回覆時間：24 小時內</p>
                            </div>
                        </div>

                        {sent ? (
                            <div className="text-center py-12">
                                <div className="text-3xl mb-3">✓</div>
                                <p className="text-[#FF5500] font-mono text-sm font-bold">已送出！</p>
                                <p className="text-zinc-500 font-mono text-xs mt-1">我會盡快回覆你</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-zinc-600 font-mono tracking-wider block mb-1">NAME</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        className="w-full bg-[#121214] border border-[#1F1F23] rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#FF5500]/50 transition-colors"
                                        placeholder="Your name"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-600 font-mono tracking-wider block mb-1">EMAIL *</label>
                                    <input
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                        className="w-full bg-[#121214] border border-[#1F1F23] rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#FF5500]/50 transition-colors"
                                        placeholder="your@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-600 font-mono tracking-wider block mb-1">MESSAGE *</label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={form.message}
                                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                        className="w-full bg-[#121214] border border-[#1F1F23] rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#FF5500]/50 transition-colors resize-none"
                                        placeholder="描述你的專案需求..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="w-full py-2.5 bg-[#FF5500] hover:bg-white text-black text-[11px] font-bold font-mono tracking-wider rounded transition-colors disabled:opacity-50"
                                >
                                    {sending ? 'SENDING...' : 'SEND MESSAGE →'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-16 text-center border-t border-[#1F1F23] pt-8">
                    <div
                        className="inline-flex items-center gap-2 text-zinc-600 text-sm font-mono tracking-wider cursor-default select-none"
                        onMouseEnter={() => copyrightIconRef.current?.startAnimation()}
                        onMouseLeave={() => copyrightIconRef.current?.stopAnimation()}
                    >
                        <CopyrightIcon ref={copyrightIconRef} size={20} strokeWidth={1.5} color="#FF5500" />
                        {new Date().getFullYear()} JAGGER OS · ALL RIGHTS RESERVED
                    </div>
                </div>
            </div>
        </section>
    );
}
