'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useUserFlow } from '../../lib/userFlow';

interface ContractPanelProps {
    plan: string;
    onClose: () => void;
}

const CONTRACT_CLAUSES = [
    {
        num: '01',
        title: '服務範疇',
        body: '乙方依客戶所選方案，提供對應之平面設計、品牌識別、數位素材、網站開發及 AI 輔助工作流程等服務。具體交付物以開案確認書為準。',
    },
    {
        num: '02',
        title: '費用與付款',
        body: '本合約服務費用為 [[AMOUNT]]，執行時程為 [[TIMELINE]]。訂閱制方案按月預付；專案制依合約里程碑分期支付。逾期付款超過 7 個工作天，乙方有權暫停服務直至款項結清。',
    },
    {
        num: '03',
        title: '智慧財產權',
        body: '所有交付物之著作權及相關智慧財產權，於客戶完成全額付款後，完整且不可撤銷地移轉予客戶。乙方保留作品集展示權。',
    },
    {
        num: '04',
        title: '合約終止',
        body: '任何一方可提前 30 個日曆天以書面方式通知終止訂閱制合約。專案制合約一經開案，恕不退還已支付之訂金。',
    },
    {
        num: '05',
        title: '保密條款',
        body: '雙方同意對合作過程中取得之商業機密、未公開素材及客戶資料予以保密，保密期限為合約終止後 3 年。',
    },
    {
        num: '06',
        title: '準據法',
        body: '本合約受中華民國法律管轄。因本合約引起之爭議，雙方同意以臺灣臺北地方法院為第一審管轄法院。',
    },
];

const PLAN_PRICES: Record<string, number> = {
    '平面視覺訂閱': 25000,
    '全包廣域核心': 45000,
    '雙軌並行代理': 85000,
};

export default function ContractPanel({ plan, onClose }: ContractPanelProps) {
    const { sign, profile, contractParams, setContractParams } = useUserFlow();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSig, setHasSig] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [paying, setPaying] = useState(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    const fixedAmount = PLAN_PRICES[plan];
    const isFixedProject = !fixedAmount;

    useEffect(() => {
        if (fixedAmount) {
            setContractParams(prev => ({ ...prev, amount: String(fixedAmount) }));
        }
    }, [fixedAmount, setContractParams]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#0A0A0B';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#e4e4e7';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if ('touches' in e) {
            return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
        }
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsDrawing(true);
        lastPos.current = getPos(e, canvas);
    }, []);

    const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx || !lastPos.current) return;
        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPos.current = pos;
        setHasSig(true);
    }, [isDrawing]);

    const stopDraw = useCallback(() => setIsDrawing(false), []);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#0A0A0B';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSig(false);
    }, []);

    const handleSign = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasSig || !agreed) return;
        sign(canvas.toDataURL('image/png'));

        const rawAmount = (fixedAmount ? String(fixedAmount) : contractParams.amount).replace(/[^0-9]/g, '');
        const amount = parseInt(rawAmount, 10);
        if (!amount || amount <= 0) {
            console.error('[checkout] 金額無效:', contractParams.amount, 'fixedAmount:', fixedAmount);
            return;
        }

        setPaying(true);
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: 'new',
                    amount,
                    title: `${plan} — ${contractParams.timeline}`,
                    email: profile?.email ?? '',
                }),
            });
            const data = await res.json();
            if (data.gatewayUrl && data.fields) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = data.gatewayUrl;
                Object.entries(data.fields).forEach(([k, v]) => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = k;
                    input.value = String(v);
                    form.appendChild(input);
                });
                document.body.appendChild(form);
                form.submit();
            }
        } catch (e) {
            console.error('[checkout]', e);
            setPaying(false);
        }
    }, [hasSig, agreed, sign, contractParams, plan, profile]);

    return (
        <div className="flex flex-col h-full w-full bg-[#000000] font-mono overflow-hidden">

            {/* Topbar */}
            <div className="h-12 border-b border-zinc-900 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-[#FF5500] rounded flex items-center justify-center">
                        <span className="text-[7px] font-black text-black">J</span>
                    </div>
                    <span className="text-[11px] text-zinc-600">JAGGER OS</span>
                    <span className="text-zinc-800">›</span>
                    <span className="text-[11px] text-zinc-300">Service Agreement</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 border border-zinc-900 rounded-full px-3 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                        <span className="text-[9px] text-yellow-500 tracking-widest">PENDING SIGNATURE</span>
                    </div>
                    <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Two-column body */}
            <div className="flex flex-1 overflow-hidden">

                {/* LEFT — Contract text */}
                <div className="w-1/2 border-r border-zinc-900 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="px-8 py-5 border-b border-zinc-900">
                        <span className="text-[10px] text-zinc-600 tracking-widest block mb-1">// JAGGER OS · SERVICE AGREEMENT</span>
                        <h2 className="text-xl font-bold text-white">設計服務合約</h2>
                        <p className="text-sm text-zinc-500 mt-1">Design & Development Service Contract</p>
                    </div>

                    {/* Client info strip */}
                    <div className="px-8 py-4 border-b border-zinc-900 grid grid-cols-2 gap-x-6 gap-y-3">
                        {[
                            { label: 'CLIENT',   value: profile?.name  ?? '—' },
                            { label: 'EMAIL',    value: profile?.email ?? '—' },
                            { label: 'COMPANY',  value: profile?.company || '個人接案' },
                            { label: 'PLAN',     value: plan },
                            { label: 'AMOUNT',   value: contractParams.amount ? `NT$ ${contractParams.amount}` : '—' },
                            { label: 'TIMELINE', value: contractParams.timeline || '—' },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <span className="text-[10px] text-zinc-600 block">{label}</span>
                                <span className="text-sm text-zinc-300 truncate block">{value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Clauses */}
                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-7">
                        {CONTRACT_CLAUSES.map(clause => {
                            const body = clause.num === '02' && (contractParams.amount || contractParams.timeline)
                                ? clause.body
                                    .replace('[[AMOUNT]]', contractParams.amount ? `NT$ ${contractParams.amount}` : '（待確認）')
                                    .replace('[[TIMELINE]]', contractParams.timeline || '（待確認）')
                                : clause.body;
                            return (
                            <div key={clause.num} className="flex gap-5">
                                <span className="text-[11px] text-[#FF5500] font-bold shrink-0 mt-0.5 w-6">{clause.num}</span>
                                <div>
                                    <div className="text-sm font-bold text-zinc-100 mb-2">{clause.title}</div>
                                    <p className="text-[14px] text-zinc-400 leading-[1.75]">{body}</p>
                                </div>
                            </div>
                            );
                        })}
                        <div className="pt-5 border-t border-zinc-900 text-[12px] text-zinc-600 leading-relaxed">
                            本合約於雙方電子簽署完成時即告生效，具有等同書面合約之法律效力。
                        </div>
                    </div>
                </div>

                {/* RIGHT — Signature */}
                <div className="w-1/2 flex flex-col overflow-hidden">
                    <div className="px-8 py-5 border-b border-zinc-900">
                        <span className="text-[10px] text-zinc-600 tracking-widest block mb-1">// ELECTRONIC SIGNATURE</span>
                        <h3 className="text-base font-bold text-white">電子簽名</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">

                        {/* Sig pad */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-zinc-600 tracking-widest">SIGNATURE PAD</span>
                                <button onClick={clearCanvas} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors border border-zinc-900 px-2.5 py-1 rounded hover:border-zinc-700">
                                    CLEAR
                                </button>
                            </div>
                            <div className="border border-zinc-800 rounded-xl overflow-hidden relative bg-[#0A0A0B]" style={{ minHeight: '220px' }}>
                                {!hasSig && (
                                    <span className="absolute inset-0 flex items-center justify-center text-[12px] font-mono text-zinc-700 pointer-events-none select-none">
                                        在此以滑鼠或觸控板簽名
                                    </span>
                                )}
                                <canvas
                                    ref={canvasRef}
                                    width={800}
                                    height={300}
                                    className="w-full cursor-crosshair touch-none"
                                    style={{ height: '220px' }}
                                    onMouseDown={startDraw}
                                    onMouseMove={draw}
                                    onMouseUp={stopDraw}
                                    onMouseLeave={stopDraw}
                                    onTouchStart={startDraw}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDraw}
                                />
                            </div>
                            {hasSig && (
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] text-emerald-500">簽名已記錄</span>
                                </div>
                            )}
                        </div>

                        {/* Contract params */}
                        <div className="space-y-3">
                            <div className="text-[10px] text-zinc-600 tracking-widest">CONTRACT PARAMETERS</div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-zinc-600 block mb-1.5">AMOUNT (NT$)</label>
                                    {isFixedProject ? (
                                        <input
                                            type="text"
                                            value={contractParams.amount}
                                            onChange={e => setContractParams({ ...contractParams, amount: e.target.value })}
                                            placeholder="e.g. 88000"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none focus:border-[#FF5500]/60"
                                        />
                                    ) : (
                                        <div className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-[#FF5500] font-mono">
                                            NT$ {Number(contractParams.amount || fixedAmount).toLocaleString()} / mo
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-600 block mb-1.5">TIMELINE</label>
                                    <input
                                        type="text"
                                        value={contractParams.timeline}
                                        onChange={e => setContractParams({ ...contractParams, timeline: e.target.value })}
                                        placeholder={isFixedProject ? 'e.g. 3 個月' : '按月續約'}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none focus:border-[#FF5500]/60"
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-zinc-700">// 填入後自動嵌入條款第 02 節</p>
                        </div>

                        {/* Date/timestamp */}
                        <div className="border border-zinc-900 rounded-lg p-4">
                            <div className="text-[9px] text-zinc-600 mb-1">SIGNED DATE</div>
                            <div className="text-[12px] text-zinc-300">{new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>

                        {/* Agree checkbox */}
                        <div
                            onClick={() => setAgreed(v => !v)}
                            className="flex items-start gap-3 cursor-pointer group"
                        >
                            <div className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-all ${agreed ? 'bg-[#FF5500] border-[#FF5500]' : 'border-zinc-700 bg-transparent group-hover:border-zinc-500'}`}>
                                {agreed && (
                                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                        <path d="M1 3.5L3.5 6L8 1" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-[12px] text-zinc-400 leading-relaxed">
                                我已詳閱左側服務合約全文，同意所有條款，並確認本電子簽名具有等同手簽之法律效力。
                            </span>
                        </div>

                        {/* Submit */}
                        <button
                            onClick={handleSign}
                            disabled={!hasSig || !agreed || paying}
                            className={`w-full py-3.5 rounded-lg font-mono font-bold text-[12px] tracking-widest uppercase transition-all duration-200 ${
                                paying
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                    : hasSig && agreed
                                        ? 'bg-[#FF5500] text-black hover:bg-white hover:text-black cursor-pointer'
                                        : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
                            }`}
                        >
                            {paying ? '⟳ 前往付款中…' : hasSig && agreed ? '確認簽署 · 前往付款 →' : '請完成簽名並勾選同意'}
                        </button>

                        <div className="text-[10px] text-zinc-700 text-center">
                            // 簽署完成後將跳轉藍新金流完成付款
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
