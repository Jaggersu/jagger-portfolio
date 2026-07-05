'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
    role: 'user' | 'ai';
    content: string;
}

const PRESET_TOPICS = [
    { label: '進度查詢', prompt: '目前我的專案進度如何？有哪些任務正在進行中？' },
    { label: '下一步', prompt: '我的專案下一個里程碑是什麼？需要我提供哪些素材？' },
    { label: '交付規格', prompt: '最終交付物的格式與規格是什麼？' },
    { label: '修改流程', prompt: '如果我想修改設計方向，流程是怎麼運作的？' },
    { label: '費用說明', prompt: '目前的方案費用包含哪些服務？有額外費用嗎？' },
    { label: '時程估算', prompt: '如果現在開一個新專案，大概需要多少時間完成？' },
];

interface AskAIDialogProps {
    onClose: () => void;
    context?: string;
}

export default function AskAIDialog({ onClose, context }: AskAIDialogProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', content: '你好！我是 JAGGER OS AI。有什麼關於你的專案或服務我可以幫你的嗎？' },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = async (text: string) => {
        if (!text.trim() || loading) return;
        const userMsg: Message = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, context }),
            });
            const data = await res.json();
            console.log('[JagAgent] response:', data);
            setMessages(prev => [...prev, { role: 'ai', content: data.reply ?? '抱歉，發生了錯誤。' }]);
        } catch {
            setMessages(prev => [...prev, { role: 'ai', content: '連線失敗，請稍後再試。' }]);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#0A0A0B] border border-[#27272a] rounded-xl w-full max-w-2xl h-[600px] flex font-mono overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Left — Preset Topics */}
                <div className="w-48 border-r border-zinc-900 flex flex-col shrink-0">
                    <div className="p-4 border-b border-zinc-900">
                        <div className="text-[9px] text-zinc-600 tracking-widest">// JAG AGENT</div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {PRESET_TOPICS.map(t => (
                            <button
                                key={t.label}
                                onClick={() => send(t.prompt)}
                                className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right — Chat */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="h-12 border-b border-zinc-900 flex items-center justify-between px-4 shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-[#FF5500] rounded-full animate-pulse" />
                            <span className="text-[11px] text-zinc-400 tracking-widest">JAGGER OS · JAG AGENT</span>
                        </div>
                        <button onClick={onClose} className="text-zinc-600 hover:text-white text-lg">×</button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] px-4 py-2.5 rounded-xl text-[12px] leading-relaxed ${
                                    m.role === 'user'
                                        ? 'bg-[#FF5500] text-black'
                                        : 'bg-zinc-900 text-zinc-300'
                                }`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-zinc-900 px-4 py-2.5 rounded-xl text-zinc-600 text-[12px]">
                                    <span className="animate-pulse">// JAG AGENT 思考中…</span>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <form
                        onSubmit={e => { e.preventDefault(); send(input); }}
                        className="border-t border-zinc-900 p-3 flex gap-2 shrink-0"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="輸入問題…"
                            disabled={loading}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#FF5500]/60"
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="px-4 py-2 bg-[#FF5500] text-black text-[11px] font-bold rounded-lg hover:bg-white transition-colors disabled:opacity-40"
                        >
                            →
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
