'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useUserFlow } from '../../lib/userFlow';
import { supabase } from '../../lib/supabase';
import XIcon from '../icons/XIcon';
import type { AnimatedIconHandle } from '../icons/types';
import SatelliteDishIcon from '../icons/SatelliteDishIcon';

interface ContractPanelProps {
    plan: string;
    onClose: () => void;
    embedded?: boolean;
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
    'LITE':  25000,
    'PRO':   45000,
    'SCALE': 85000,
    'ON-DEMAND': 0,
    '平面視覺訂閱': 25000,
    '全包廣域核心': 45000,
    '雙軌並行代理': 85000,
};

export default function ContractPanel({ plan: initialPlan, onClose, embedded = false }: ContractPanelProps) {
    const { sign, activate, profile, contractParams, setContractParams } = useUserFlow();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const closeIconRef = useRef<AnimatedIconHandle>(null);
    
    // Cabinet/Database states
    const [contracts, setContracts] = useState<any[]>([]);
    const [loadingContracts, setLoadingContracts] = useState(true);
    const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
    
    // Add Contract states
    const [isAdding, setIsAdding] = useState(false);
    const [newPlan, setNewPlan] = useState<string>('LITE');
    const [newAmount, setNewAmount] = useState<string>('25000');
    const [newTimeline, setNewTimeline] = useState<string>('按月續約');
    
    // Drawing / signing states
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSig, setHasSig] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [paying, setPaying] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentTab, setPaymentTab] = useState<'fiat' | 'crypto'>('fiat');
    const [cryptoChain, setCryptoChain] = useState<string>('TRC-20');
    const [copiedChain, setCopiedChain] = useState<string | null>(null);
    const [txid, setTxid] = useState('');
    const [txidSubmitting, setTxidSubmitting] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const formSubmitRef = useRef(false);

    // Fetch cabinet contracts
    const fetchContracts = useCallback(async () => {
        if (!profile?.id) return;
        setLoadingContracts(true);
        const { data, error } = await supabase
            .from('contracts')
            .select('id,project_id,status,metadata,content,signed_at,created_at')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false });
        if (!error && data) {
            setContracts(data);
        }
        setLoadingContracts(false);
    }, [profile?.id]);

    useEffect(() => {
        if (embedded) {
            fetchContracts();
        }
    }, [embedded, fetchContracts]);

    const activeContract = contracts.find(c => c.id === selectedContractId);

    // Canvas drawing setup
    useEffect(() => {
        if (!isAdding && embedded) return;
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
    }, [isAdding, embedded]);

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

    // Print contract function
    const handlePrintContract = (targetContract: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const planName = targetContract.metadata?.plan || initialPlan;
        const amt = Number(targetContract.metadata?.amount || 0).toLocaleString();
        const timelineText = targetContract.metadata?.timeline || '按月續約';
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Service Agreement - ${planName}</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; color: #111; line-height: 1.6; }
                    h1 { font-size: 24px; margin-bottom: 5px; }
                    .meta { margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                    .meta-item { margin-bottom: 8px; }
                    .clause { margin-bottom: 25px; }
                    .clause-title { font-weight: bold; font-size: 15px; margin-bottom: 5px; color: #000; }
                    .sig-section { margin-top: 40px; border-top: 2px solid #000; padding-top: 20px; }
                    .sig-img { max-width: 280px; border: 1px solid #eee; margin-top: 10px; background: #000; filter: invert(1); }
                </style>
            </head>
            <body>
                <h1>設計服務合約</h1>
                <p style="color: #666; margin-top: 0;">JAGGER OS · SERVICE AGREEMENT</p>
                <div class="meta">
                    <div class="meta-item"><strong>Client:</strong> ${profile?.name || '—'}</div>
                    <div class="meta-item"><strong>Email:</strong> ${profile?.email || '—'}</div>
                    <div class="meta-item"><strong>Plan:</strong> ${planName}</div>
                    <div class="meta-item"><strong>Amount:</strong> NT$ ${amt}</div>
                    <div class="meta-item"><strong>Timeline:</strong> ${timelineText}</div>
                    <div class="meta-item"><strong>Signed Date:</strong> ${targetContract.signed_at ? new Date(targetContract.signed_at).toLocaleString('zh-TW') : 'Pending'}</div>
                </div>
                <div>
                    ${CONTRACT_CLAUSES.map(c => `
                        <div class="clause">
                            <div class="clause-title">${c.num}. ${c.title}</div>
                            <div>${c.body.replace('[[AMOUNT]]', `NT$ ${amt}`).replace('[[TIMELINE]]', timelineText)}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="sig-section">
                    <strong>電子簽名:</strong><br/>
                    ${targetContract.metadata?.signature ? `<img class="sig-img" src="${targetContract.metadata.signature}" />` : '<em>尚未簽署</em>'}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    // Download contract function
    const handleDownloadContract = (targetContract: any) => {
        const planName = targetContract.metadata?.plan || initialPlan;
        const amt = Number(targetContract.metadata?.amount || 0).toLocaleString();
        const timelineText = targetContract.metadata?.timeline || '按月續約';
        
        // Create temporary styled element for PDF rendering
        const container = document.createElement('div');
        container.style.fontFamily = 'sans-serif';
        container.style.padding = '40px';
        container.style.color = '#111';
        container.style.lineHeight = '1.6';
        container.style.background = '#ffffff';
        
        container.innerHTML = `
            <h1 style="font-size: 22px; margin-bottom: 5px; color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">設計服務合約</h1>
            <p style="color: #666; margin-top: 5px; font-size: 11px; tracking-widest: 1px;">JAGGER OS · SERVICE AGREEMENT</p>
            
            <div style="margin-top: 20px; margin-bottom: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; border-bottom: 1px dashed #ccc; padding-bottom: 15px;">
                <div><strong>Client:</strong> ${profile?.name || '—'}</div>
                <div><strong>Email:</strong> ${profile?.email || '—'}</div>
                <div><strong>Plan:</strong> ${planName}</div>
                <div><strong>Amount:</strong> NT$ ${amt}</div>
                <div><strong>Timeline:</strong> ${timelineText}</div>
                <div><strong>Signed Date:</strong> ${targetContract.signed_at ? new Date(targetContract.signed_at).toLocaleString('zh-TW') : 'Pending'}</div>
            </div>
            
            <div style="margin-top: 15px;">
                ${CONTRACT_CLAUSES.map(c => `
                    <div style="margin-bottom: 18px; font-size: 12px; page-break-inside: avoid;">
                        <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px; color: #000;">${c.num}. ${c.title}</div>
                        <div style="color: #333;">${c.body.replace('[[AMOUNT]]', `NT$ ${amt}`).replace('[[TIMELINE]]', timelineText)}</div>
                    </div>
                `).join('')}
            </div>
            
            <div style="margin-top: 30px; border-top: 2px solid #000; padding-top: 15px; font-size: 12px; page-break-inside: avoid;">
                <strong>電子簽名:</strong><br/>
                ${targetContract.metadata?.signature ? `<img style="max-height: 70px; margin-top: 8px; border: 1px solid #eee; background: #000; filter: invert(1);" src="${targetContract.metadata.signature}" />` : '<em>尚未簽署</em>'}
            </div>
        `;
        
        document.body.appendChild(container);
        
        const opt = {
            margin:       12,
            filename:     `contract-${planName}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2.5, useCORS: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        const runHtml2Pdf = () => {
            const w = window as any;
            if (w.html2pdf) {
                w.html2pdf().from(container).set(opt).save().then(() => {
                    document.body.removeChild(container);
                });
            }
        };
        
        if (!(window as any).html2pdf) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = runHtml2Pdf;
            document.head.appendChild(script);
        } else {
            runHtml2Pdf();
        }
    };

    // Handle plan selection update price
    useEffect(() => {
        if (isAdding) {
            const price = PLAN_PRICES[newPlan];
            setNewAmount(String(price));
        }
    }, [newPlan, isAdding]);

    const handleSign = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasSig || !agreed) return;
        const signatureDataUrl = canvas.toDataURL('image/png');
        sign(signatureDataUrl);

        const currentPlan = isAdding ? newPlan : initialPlan;
        const rawAmount = (isAdding ? newAmount : (PLAN_PRICES[initialPlan] ? String(PLAN_PRICES[initialPlan]) : contractParams.amount)).replace(/[^0-9]/g, '');
        const amount = parseInt(rawAmount, 10);
        if (!amount || amount <= 0) {
            setCheckoutError('請先填寫合約金額再繼續');
            setPaying(false);
            return;
        }
        setCheckoutError(null);

        if (formSubmitRef.current) return;
        formSubmitRef.current = true;
        setPaying(true);

        const timeline = isAdding ? newTimeline : (contractParams.timeline || '按月續約');
        const contractContent = CONTRACT_CLAUSES
            .map(c => `${c.num}. ${c.title}\n${c.body}`)
            .join('\n\n')
            .replace('[[AMOUNT]]', `NT$ ${amount.toLocaleString()}`)
            .replace('[[TIMELINE]]', timeline);
        const projectTitle = `${currentPlan} — ${timeline}`;

        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: 'new',
                    amount,
                    title: projectTitle,
                    email:    profile?.email ?? '',
                    userId:   profile?.id ?? '',
                    plan:     currentPlan,
                    timeline,
                    content:  contractContent,
                    signature: signatureDataUrl,
                }),
            });
            const data = await res.json();

            if (data.mock) {
                setPaying(false);
                activate();
                if (embedded) {
                    setIsAdding(false);
                    fetchContracts();
                }
                return;
            }

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
                setTimeout(() => {
                    document.body.removeChild(form);
                    formSubmitRef.current = false;
                }, 0);
            } else {
                formSubmitRef.current = false;
            }
        } catch (e) {
            console.error('[checkout]', e);
            formSubmitRef.current = false;
            setPaying(false);
        }
    }, [hasSig, agreed, sign, activate, contractParams, initialPlan, profile, isAdding, newPlan, newAmount, newTimeline, embedded, fetchContracts]);

    // RENDER: Embedded cabinet list view
    if (embedded) {
        return (
            <div className="flex-1 flex overflow-hidden h-full">
                {/* Left: Cabinet Contract Cards */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#000000] border-r border-zinc-900">
                    <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
                        <div>
                            <span className="text-[10px] font-mono text-zinc-600 tracking-widest block">// CABINET: SERVICE AGREEMENTS</span>
                            <h2 className="text-sm font-bold text-white font-mono">合約檔案櫃</h2>
                        </div>
                        <button
                            onClick={() => {
                                setIsAdding(true);
                                setSelectedContractId(null);
                                setHasSig(false);
                                setAgreed(false);
                            }}
                            className="text-[11px] font-mono bg-[#FF5500] hover:bg-white text-black px-3 py-1.5 rounded font-bold transition-all"
                        >
                            + 新增合約
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-3" style={{ scrollbarWidth: 'thin' }}>
                        {loadingContracts ? (
                            <div className="text-xs text-zinc-600 italic font-mono py-10 text-center">Loading cabinet…</div>
                        ) : contracts.length === 0 ? (
                            <div className="text-xs text-zinc-700 italic font-mono py-16 text-center">櫃中尚無合約檔案，點擊右上角簽署新合約。</div>
                        ) : (
                            contracts.map(c => {
                                const isSelected = selectedContractId === c.id;
                                const planName = c.metadata?.plan || initialPlan;
                                const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString('zh-TW') : '—';
                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => {
                                            setSelectedContractId(isSelected ? null : c.id);
                                            setIsAdding(false);
                                        }}
                                        className={`p-4 border rounded-xl cursor-pointer transition-all ${
                                            isSelected
                                                ? 'bg-zinc-900 border-[#FF5500]/50 shadow-[#FF5500]/5 shadow-lg'
                                                : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="min-w-0">
                                                <div className="text-xs font-mono text-zinc-500 tracking-widest">ORDER NO: {c.metadata?.merchantOrderNo || 'MOCK'}</div>
                                                <h3 className="text-sm font-bold text-white mt-1 font-mono">{planName} 視覺開發合約</h3>
                                                <div className="text-[11px] text-zinc-600 mt-0.5">{dateStr} · NT$ {Number(c.metadata?.amount || 0).toLocaleString()}</div>
                                            </div>
                                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                                c.status === 'SIGNED'
                                                    ? 'text-emerald-400 border-emerald-950 bg-emerald-950/20'
                                                    : 'text-yellow-400 border-yellow-950 bg-yellow-950/20'
                                            }`}>
                                                {c.status === 'SIGNED' ? '✓ 已簽署' : '● 待付款'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right: Contract details slider */}
                {(() => {
                    if (isAdding) {
                        return (
                            <div className="w-[480px] shrink-0 border-l border-zinc-900 flex flex-col bg-[#0A0A0B] overflow-hidden"
                                style={{ animation: 'slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                <style dangerouslySetInnerHTML={{__html: `
                                    @keyframes slideInRight {
                                        from { transform: translateX(100%); }
                                        to { transform: translateX(0); }
                                    }
                                `}} />
                                <div className="px-5 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
                                    <div>
                                        <span className="text-[10px] text-zinc-600 font-mono tracking-widest">// NEW AGREEMENT</span>
                                        <h2 className="text-sm font-bold text-white font-mono">起草新合約</h2>
                                    </div>
                                    <button onClick={() => setIsAdding(false)} className="text-zinc-500 hover:text-zinc-300 text-sm">✕</button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                                    
                                    {/* Parameters selection */}
                                    <div className="border border-zinc-900 rounded-xl p-3.5 space-y-3 bg-zinc-950/20">
                                        <div className="text-[10px] text-zinc-600 tracking-widest font-mono">SELECT PLAN</div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['LITE', 'PRO', 'SCALE'].map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setNewPlan(p)}
                                                    className={`py-2 rounded-lg text-xs font-mono font-bold border transition-colors ${
                                                        newPlan === p
                                                            ? 'border-[#FF5500]/60 bg-[#FF5500]/5 text-[#FF5500]'
                                                            : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <div>
                                                <label className="text-[10px] text-zinc-600 block mb-1">AMOUNT (NT$)</label>
                                                <input
                                                    type="text"
                                                    value={newAmount}
                                                    onChange={e => setNewAmount(e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#FF5500]/60"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-zinc-600 block mb-1">TIMELINE</label>
                                                <input
                                                    type="text"
                                                    value={newTimeline}
                                                    onChange={e => setNewTimeline(e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#FF5500]/60"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preview Clauses strip */}
                                    <div className="border border-zinc-900 rounded-xl p-3 bg-zinc-950/20 max-h-56 overflow-y-auto space-y-3" style={{ scrollbarWidth: 'thin' }}>
                                        <div className="text-[9px] text-zinc-600 tracking-widest font-mono">// CONTRACT PREVIEW CLAUSES</div>
                                        {CONTRACT_CLAUSES.map(c => (
                                            <div key={c.num} className="text-[11px] leading-relaxed">
                                                <span className="text-[#FF5500] font-bold mr-1.5">{c.num}.</span>
                                                <span className="text-zinc-400">{c.body.replace('[[AMOUNT]]', `NT$ ${Number(newAmount || 0).toLocaleString()}`).replace('[[TIMELINE]]', newTimeline)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Signature Canvas */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-zinc-600 tracking-widest font-mono">SIGNATURE PAD</span>
                                            <button onClick={clearCanvas} className="text-[9px] text-zinc-600 hover:text-zinc-400 border border-zinc-900 px-2 py-0.5 rounded">CLEAR</button>
                                        </div>
                                        <div className="border border-zinc-800 rounded-xl overflow-hidden relative bg-[#000000]" style={{ height: '110px' }}>
                                            {!hasSig && (
                                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-zinc-700 pointer-events-none select-none">
                                                    在此以滑鼠或觸控板簽名
                                                </span>
                                            )}
                                            <canvas
                                                ref={canvasRef}
                                                width={600}
                                                height={150}
                                                className="w-full cursor-crosshair touch-none"
                                                style={{ height: '110px' }}
                                                onMouseDown={startDraw}
                                                onMouseMove={draw}
                                                onMouseUp={stopDraw}
                                                onMouseLeave={stopDraw}
                                                onTouchStart={startDraw}
                                                onTouchMove={draw}
                                                onTouchEnd={stopDraw}
                                            />
                                        </div>
                                    </div>

                                    {/* Agreement & Submit */}
                                    <div
                                        onClick={() => setAgreed(v => !v)}
                                        className="flex items-start gap-2.5 cursor-pointer group"
                                    >
                                        <div className={`mt-0.5 w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-all ${agreed ? 'bg-[#FF5500] border-[#FF5500]' : 'border-zinc-850 bg-transparent group-hover:border-zinc-500'}`}>
                                            {agreed && (
                                                <svg width="8" height="6" viewBox="0 0 9 7" fill="none">
                                                    <path d="M1 3.5L3.5 6L8 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-zinc-500 leading-normal select-none">
                                            我同意合約所有條款，並確認此電子簽名具法律效力。
                                        </span>
                                    </div>

                                    {checkoutError && (
                                        <div className="text-[10px] text-red-400 font-mono">⚠ {checkoutError}</div>
                                    )}

                                    <button
                                        onClick={() => { if (hasSig && agreed) setShowPayment(true); }}
                                        disabled={!hasSig || !agreed || paying}
                                        className={`w-full py-3 rounded-lg font-mono font-bold text-[11px] tracking-widest uppercase transition-all ${
                                            paying
                                                ? 'bg-zinc-800 text-zinc-650 cursor-not-allowed'
                                                : hasSig && agreed
                                                    ? 'bg-[#FF5500] text-black hover:bg-white cursor-pointer font-bold'
                                                    : 'bg-zinc-900 text-zinc-650 cursor-not-allowed border border-zinc-850'
                                        }`}
                                    >
                                        {paying ? '⟳ 處理中…' : '確認簽署並前往付款'}
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    if (!activeContract) {
                        return (
                            <div className="w-[480px] shrink-0 border-l border-zinc-900 flex flex-col bg-[#0A0A0B] items-center justify-center p-8 text-zinc-600 italic text-xs font-mono">
                                點擊左側合約查看詳細內容
                            </div>
                        );
                    }

                    const amtValue = activeContract.metadata?.amount || 0;
                    const timelineText = activeContract.metadata?.timeline || '按月續約';
                    return (
                        <div className="w-[480px] shrink-0 border-l border-zinc-900 flex flex-col bg-[#0A0A0B] overflow-hidden"
                            style={{ animation: 'slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                            <div className="px-5 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
                                <div>
                                    <span className="text-[10px] text-zinc-600 font-mono tracking-widest">CONTRACT DETAILS</span>
                                    <h2 className="text-sm font-bold text-white font-mono">{activeContract.metadata?.plan || initialPlan} 服務協議</h2>
                                </div>
                                <button onClick={() => setSelectedContractId(null)} className="text-zinc-500 hover:text-zinc-300 text-sm">✕</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: 'thin' }}>
                                
                                {/* Info Strip */}
                                <div className="grid grid-cols-2 gap-4 border border-zinc-900 rounded-xl p-3 bg-zinc-950/20 text-xs">
                                    <div>
                                        <span className="text-[10px] text-zinc-600 block">PLAN</span>
                                        <span className="text-zinc-200 font-mono">{activeContract.metadata?.plan || initialPlan}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-zinc-600 block">AMOUNT</span>
                                        <span className="text-[#FF5500] font-mono">NT$ {Number(amtValue).toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-zinc-600 block">TIMELINE</span>
                                        <span className="text-zinc-200">{timelineText}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-zinc-600 block">STATUS</span>
                                        <span className={activeContract.status === 'SIGNED' ? 'text-emerald-400' : 'text-yellow-500'}>
                                            {activeContract.status === 'SIGNED' ? '✓ 已簽署' : '待付款'}
                                        </span>
                                    </div>
                                </div>

                                {/* Clauses Text Container */}
                                <div className="border border-zinc-900 rounded-xl p-4 bg-zinc-950/40 space-y-4 max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                    {CONTRACT_CLAUSES.map(clause => {
                                        const finalAmt = Number(amtValue).toLocaleString();
                                        return (
                                            <div key={clause.num} className="text-xs leading-relaxed">
                                                <div className="font-bold text-zinc-200 mb-1 font-mono">{clause.num}. {clause.title}</div>
                                                <p className="text-zinc-400">{clause.body.replace('[[AMOUNT]]', `NT$ ${finalAmt}`).replace('[[TIMELINE]]', timelineText)}</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Signature image */}
                                {activeContract.metadata?.signature && (
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] text-zinc-600 tracking-widest font-mono">ELECTRONIC SIGNATURE</span>
                                        <div className="border border-zinc-900 rounded-xl p-3 bg-zinc-950/40 flex items-center justify-center">
                                            <img
                                                src={activeContract.metadata.signature}
                                                alt="Signature"
                                                className="max-h-20 bg-black filter invert scale-95 transition-transform"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Date Signed */}
                                <div className="text-[11px] text-zinc-600 font-mono">
                                    Signed At: {activeContract.signed_at ? new Date(activeContract.signed_at).toLocaleString('zh-TW') : 'Pending payment validation'}
                                </div>

                                {/* Print & Download action strip */}
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        onClick={() => handlePrintContract(activeContract)}
                                        className="py-2.5 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-mono font-bold hover:border-zinc-700 transition-colors"
                                    >
                                        🖨 列印合約
                                    </button>
                                    <button
                                        onClick={() => handleDownloadContract(activeContract)}
                                        className="py-2.5 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-mono font-bold hover:border-zinc-700 transition-colors"
                                    >
                                        📥 下載 PDF 檔
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Live Payment Modal */}
                {showPayment && (
                    <PaymentFormModal
                        profile={profile}
                        newPlan={newPlan}
                        newAmount={newAmount}
                        paying={paying}
                        checkoutError={checkoutError}
                        cryptoChain={cryptoChain}
                        setCryptoChain={setCryptoChain}
                        copiedChain={copiedChain}
                        setCopiedChain={setCopiedChain}
                        txid={txid}
                        setTxid={setTxid}
                        txidSubmitting={txidSubmitting}
                        setShowPayment={setShowPayment}
                        handleSign={handleSign}
                        handleCopy={(chain, address) => {
                            navigator.clipboard.writeText(address);
                            setCopiedChain(chain);
                            setTimeout(() => setCopiedChain(null), 2000);
                        }}
                        handleTxidSubmit={async () => {
                            if (!txid.trim()) return;
                            setTxidSubmitting(true);
                            try {
                                await fetch('/api/contact', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        name: profile?.name ?? '',
                                        email: profile?.email ?? '',
                                        message: `[Crypto Payment]\nChain: ${cryptoChain}\nTXID: ${txid}\nPlan: ${isAdding ? newPlan : initialPlan}\nAmount: ${isAdding ? newAmount : contractParams.amount}`,
                                    }),
                                });
                                alert('✅ TXID 已送出，我們將盡快驗證！');
                                setTxid('');
                                setShowPayment(false);
                                setIsAdding(false);
                                fetchContracts();
                            } catch {
                                alert('送出失敗，請稍後再試');
                            }
                            setTxidSubmitting(false);
                        }}
                    />
                )}
            </div>
        );
    }

    // RENDER: Full page onboarding mode
    const fixedAmount = PLAN_PRICES[initialPlan];
    const isFixedProject = !fixedAmount;

    useEffect(() => {
        if (fixedAmount) {
            setContractParams(prev => ({ ...prev, amount: String(fixedAmount) }));
        }
    }, [fixedAmount, setContractParams]);

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
                    <button
                        onClick={onClose}
                        onMouseEnter={() => closeIconRef.current?.startAnimation()}
                        onMouseLeave={() => closeIconRef.current?.stopAnimation()}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                        <span className="pointer-events-none">
                            <XIcon ref={closeIconRef} size={14} strokeWidth={1.75} color="currentColor" />
                        </span>
                    </button>
                </div>
            </div>

            {/* Two-column body */}
            <div className="flex flex-1 overflow-hidden">
                {/* LEFT — Contract text */}
                <div className="w-1/2 border-r border-zinc-900 flex flex-col overflow-hidden">
                    <div className="px-8 py-5 border-b border-zinc-900">
                        <span className="text-[10px] text-zinc-600 tracking-widest block mb-1">// JAGGER OS · SERVICE AGREEMENT</span>
                        <h2 className="text-xl font-bold text-white">設計服務合約</h2>
                        <p className="text-sm text-zinc-500 mt-1">Design & Development Service Contract</p>
                    </div>

                    <div className="px-8 py-4 border-b border-zinc-900 grid grid-cols-2 gap-x-6 gap-y-3">
                        {[
                            { label: 'CLIENT',   value: profile?.name  ?? '—' },
                            { label: 'EMAIL',    value: profile?.email ?? '—' },
                            { label: 'COMPANY',  value: profile?.company || '個人接案' },
                            { label: 'PLAN',     value: initialPlan },
                            { label: 'AMOUNT',   value: contractParams.amount ? `NT$ ${contractParams.amount}` : '—' },
                            { label: 'TIMELINE', value: contractParams.timeline || '—' },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <span className="text-[10px] text-zinc-600 block">{label}</span>
                                <span className="text-sm text-zinc-300 truncate block">{value}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-7">
                        {CONTRACT_CLAUSES.map(clause => {
                            const amountText = contractParams.amount ? `NT$ ${Number(contractParams.amount).toLocaleString()}` : '（待確認）';
                            const timelineText = contractParams.timeline || '（待確認）';

                            const renderBody = () => {
                                if (clause.num !== '02' || (!contractParams.amount && !contractParams.timeline)) {
                                    return <p className="text-[14px] text-zinc-400 leading-[1.75]">{clause.body}</p>;
                                }
                                const parts = clause.body.split(/(\[\[AMOUNT\]\]|\[\[TIMELINE\]\])/);
                                return (
                                    <p className="text-[14px] text-zinc-400 leading-[1.75]">
                                        {parts.map((part, i) => {
                                            if (part === '[[AMOUNT]]') return <span key={i} className="text-[#FF5500] font-bold">{amountText}</span>;
                                            if (part === '[[TIMELINE]]') return <span key={i} className="text-[#FF5500] font-bold">{timelineText}</span>;
                                            return <span key={i}>{part}</span>;
                                        })}
                                    </p>
                                );
                            };

                            return (
                                <div key={clause.num} className="flex gap-5">
                                    <span className="text-[11px] text-[#FF5500] font-bold shrink-0 mt-0.5 w-6">{clause.num}</span>
                                    <div>
                                        <div className="text-sm font-bold text-zinc-100 mb-2">{clause.title}</div>
                                        {renderBody()}
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

                    <div className="flex-1 overflow-y-auto px-8 py-4 flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-zinc-650 tracking-widest">SIGNATURE PAD</span>
                                <button onClick={clearCanvas} className="text-[10px] text-zinc-650 hover:text-zinc-400 border border-zinc-900 px-2.5 py-1 rounded">CLEAR</button>
                            </div>
                            <div className="border border-zinc-800 rounded-xl overflow-hidden relative bg-[#0A0A0B]" style={{ minHeight: '150px' }}>
                                {!hasSig && (
                                    <span className="absolute inset-0 flex items-center justify-center text-[12px] font-mono text-zinc-700 pointer-events-none select-none">
                                        在此以滑鼠或觸控板簽名
                                    </span>
                                )}
                                <canvas
                                    ref={canvasRef}
                                    width={800}
                                    height={200}
                                    className="w-full cursor-crosshair touch-none"
                                    style={{ height: '150px' }}
                                    onMouseDown={startDraw}
                                    onMouseMove={draw}
                                    onMouseUp={stopDraw}
                                    onMouseLeave={stopDraw}
                                    onTouchStart={startDraw}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDraw}
                                />
                            </div>
                        </div>

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
                        </div>

                        <div className="border border-zinc-900 rounded-lg p-4">
                            <div className="text-[9px] text-zinc-600 mb-1">SIGNED DATE</div>
                            <div className="text-[12px] text-zinc-300">{new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>

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
                            <span className="text-[12px] text-zinc-400 leading-relaxed select-none">
                                我已詳閱左側服務合約全文，同意所有條款，並確認本電子簽名具有等同手簽之法律效力。
                            </span>
                        </div>

                        <button
                            onClick={() => { if (hasSig && agreed) setShowPayment(true); }}
                            disabled={!hasSig || !agreed || paying}
                            className={`w-full py-3.5 rounded-lg font-mono font-bold text-[12px] tracking-widest uppercase transition-all duration-200 ${
                                paying
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                    : hasSig && agreed
                                        ? 'bg-[#FF5500] text-black hover:bg-white hover:text-black cursor-pointer'
                                        : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
                            }`}
                        >
                            {paying ? '⟳ 處理中…' : hasSig && agreed ? '確認簽署 · 前往付款 →' : '請完成簽名並勾選同意'}
                        </button>
                    </div>
                </div>
            </div>

            {showPayment && (
                <PaymentFormModal
                    profile={profile}
                    newPlan={initialPlan}
                    newAmount={contractParams.amount || String(fixedAmount)}
                    paying={paying}
                    checkoutError={checkoutError}
                    cryptoChain={cryptoChain}
                    setCryptoChain={setCryptoChain}
                    copiedChain={copiedChain}
                    setCopiedChain={setCopiedChain}
                    txid={txid}
                    setTxid={setTxid}
                    txidSubmitting={txidSubmitting}
                    setShowPayment={setShowPayment}
                    handleSign={handleSign}
                    handleCopy={(chain, address) => {
                        navigator.clipboard.writeText(address);
                        setCopiedChain(chain);
                        setTimeout(() => setCopiedChain(null), 2000);
                    }}
                    handleTxidSubmit={async () => {
                        if (!txid.trim()) return;
                        setTxidSubmitting(true);
                        try {
                            await fetch('/api/contact', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    name: profile?.name ?? '',
                                    email: profile?.email ?? '',
                                    message: `[Crypto Payment]\nChain: ${cryptoChain}\nTXID: ${txid}\nPlan: ${initialPlan}\nAmount: ${contractParams.amount}`,
                                }),
                            });
                            alert('✅ TXID 已送出，我們將盡快驗證！');
                            setTxid('');
                            setShowPayment(false);
                            onClose();
                        } catch {
                            alert('送出失敗，請稍後再試');
                        }
                        setTxidSubmitting(false);
                    }}
                />
            )}
        </div>
    );
}

// ── Shared Payment Modal Subcomponent ──
interface PaymentModalProps {
    profile: any;
    newPlan: string;
    newAmount: string;
    paying: boolean;
    checkoutError: string | null;
    cryptoChain: string;
    setCryptoChain: (chain: string) => void;
    copiedChain: string | null;
    setCopiedChain: (chain: string | null) => void;
    txid: string;
    setTxid: (txid: string) => void;
    txidSubmitting: boolean;
    setShowPayment: (show: boolean) => void;
    handleSign: () => void;
    handleCopy: (chain: string, address: string) => void;
    handleTxidSubmit: () => void;
}

function PaymentFormModal({
    profile,
    newPlan,
    newAmount,
    paying,
    checkoutError,
    cryptoChain,
    setCryptoChain,
    copiedChain,
    txid,
    setTxid,
    txidSubmitting,
    setShowPayment,
    handleSign,
    handleCopy,
    handleTxidSubmit
}: PaymentModalProps) {
    const WALLETS = [
        { chain: 'TRC-20',      network: 'Tron Network', address: 'TAgWCpyof2tNYEq67v5PBgUApqpKHviYEY',                   warn: '請務必使用波場 Tron 網路傳送，勿使用 ERC-20 或其他網路。',            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M12 2L2 8l10 14L22 8L12 2z" fill="#FF0013" opacity="0.8"/></svg> },
        { chain: 'Base / Arb',  network: 'EVM Network',  address: '0x8D929F645fa9c97df90349203b8949c3318ceACE',             warn: '支援 Base 與 Arbitrum 網路，請勿使用主網 ETH 或其他 EVM 網路。',    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0"><circle cx="12" cy="12" r="10" fill="#0052FF" opacity="0.8"/><path d="M8 12h8M12 8v8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg> },
        { chain: 'TON',         network: 'TON Network',  address: 'UQBXuoeso8Yxl-LNGxD_q8JQqtWKgkZIgOlyTfY57ESXTHSw',   warn: '僅限 TON 網路轉帳，請勿使用其他網路。',                              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M12 2L3 9h18L12 2z" fill="#0098EA" opacity="0.8"/><path d="M3 9l9 13L21 9" fill="#0098EA" opacity="0.5"/></svg> },
    ];
    const activeWallet = WALLETS.find(w => w.chain === cryptoChain) ?? WALLETS[0];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0A0A0B] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="h-12 border-b border-zinc-900 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#FF5500]" />
                        <span className="text-[11px] text-zinc-400 tracking-widest font-mono">// PAYMENT</span>
                    </div>
                    <button onClick={() => setShowPayment(false)} className="text-zinc-650 hover:text-zinc-300 text-lg">×</button>
                </div>

                <div className="grid grid-cols-2 border-b border-zinc-900 shrink-0">
                    {([
                        { key: 'fiat' as const,   label: '信用卡 / 匯款',  sub: 'NewebPay 線上金流', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
                        { key: 'crypto' as const, label: 'USDT / USDC', sub: '區塊鏈轉帳', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 9l4-3 4 3M8 15l4 3 4-3"/></svg> },
                    ]).map(tab => (
                        <button key={tab.key} onClick={() => {}}
                            className={`py-4 text-center transition-colors flex flex-col items-center gap-1 hover:bg-zinc-900/40`}>
                            <div className="flex items-center gap-1.5 text-zinc-500">
                                {tab.icon}
                                <div className="text-[13px] font-bold font-mono text-zinc-500">{tab.label}</div>
                            </div>
                            <div className="text-[10px] text-zinc-650 tracking-widest">{tab.sub}</div>
                        </button>
                    ))}
                </div>

                <div className="p-6 space-y-5 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF5500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                        </div>
                        <div>
                            <div className="text-[13px] font-bold text-white font-mono">藍新金流 NewebPay</div>
                            <div className="text-[11px] text-zinc-500 font-mono">信用卡、ATM 轉帳、超商代碼</div>
                        </div>
                    </div>

                    <p className="text-[12px] text-zinc-500 font-mono leading-relaxed">
                        點擊下方按鈕後將跳轉至藍新金流，可依偏好選擇信用卡、ATM 匯款或超商付款等方式。
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: '信用卡', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
                            { label: 'ATM 匯款', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M6 14h.01M10 10h8M10 14h8"/></svg> },
                            { label: '超商代碼', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg> },
                        ].map(m => (
                            <div key={m.label} className="bg-zinc-900/30 border border-zinc-850 rounded-lg p-3 flex flex-col items-center gap-1.5">
                                <div className="text-[#FF5500]">{m.icon}</div>
                                <span className="text-[11px] text-zinc-400 font-mono">{m.label}</span>
                            </div>
                        ))}
                    </div>

                    {checkoutError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5">
                            <p className="text-[12px] text-red-400 font-mono">⚠ {checkoutError}</p>
                        </div>
                    )}

                    <button
                        onClick={handleSign}
                        disabled={paying}
                        className="w-full py-4 bg-[#FF5500] hover:bg-white text-black font-mono font-bold text-[13px] tracking-widest rounded-lg transition-colors disabled:opacity-50"
                    >
                        {paying ? '⟳ 跳轉中…' : '確認簽名並前往付款 →'}
                    </button>
                </div>
            </div>
        </div>
    );
}
