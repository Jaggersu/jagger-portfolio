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
    const [paymentTab, setPaymentTab] = useState<'fiat' | 'crypto' | 'coffee'>('fiat');
    const [cryptoChain, setCryptoChain] = useState<string>('TRC-20');
    const [copiedChain, setCopiedChain] = useState<string | null>(null);
    const [txid, setTxid] = useState('');
    const [txidSubmitting, setTxidSubmitting] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [draftReadBottom, setDraftReadBottom] = useState(false);
    const [signReadBottom, setSignReadBottom] = useState(false);
    
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

    const renderClauseBody = (body: string, amtText: string, timelineText: string, baseClass = "text-zinc-400") => {
        const parts = body.split(/(\[\[AMOUNT\]\]|\[\[TIMELINE\]\])/g);
        return (
            <span className={baseClass}>
                {parts.map((part, i) => {
                    if (part === '[[AMOUNT]]') return <strong key={i} className="text-[#FF5500] font-bold">{amtText}</strong>;
                    if (part === '[[TIMELINE]]') return <strong key={i} className="text-[#FF5500] font-bold">{timelineText || '（未提供）'}</strong>;
                    return <span key={i}>{part}</span>;
                })}
            </span>
        );
    };

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
        const isSigned = targetContract.status === 'SIGNED';
        const sigSrc = targetContract.signature_snapshot || targetContract.metadata?.signature;
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Service Agreement - ${planName}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px 30px; color: #111; line-height: 1.4; font-size: 12.5px; }
                    .header-container { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
                    .logo-title { font-size: 21px; margin: 0; color: #000; }
                    .logo-sub { color: #666; margin: 3px 0 0 0; font-size: 9.5px; letter-spacing: 0.5px; font-family: monospace; }
                    .meta { margin-bottom: 18px; border-bottom: 1px solid #ccc; padding-bottom: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11.5px; }
                    .meta-item { margin-bottom: 4px; }
                    .clause { margin-bottom: 12px; }
                    .clause-title { font-weight: bold; font-size: 13px; margin-bottom: 3px; color: #000; }
                    .sig-section { margin-top: 25px; border-top: 2px solid #000; padding-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                    .sig-img { max-height: 50px; border: 1px solid #eee; margin-top: 6px; background: #000; filter: invert(1); }
                </style>
            </head>
            <body>
                <div class="header-container">
                    <div>
                        <h1 class="logo-title">設計服務合約</h1>
                        <p class="logo-sub">JAGGER OS · SERVICE AGREEMENT</p>
                    </div>
                    <svg width="85" height="52" viewBox="0 0 316 194" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M94.2432 134.593C94.6279 135.106 94.8203 135.619 94.8203 136.132C94.8203 137.799 93.9867 138.633 92.3194 138.633C90.6521 138.633 89.8184 137.799 89.8184 136.132C89.8184 135.491 90.0108 134.978 90.3956 134.593V130.553C88.7283 132.99 86.6121 134.978 84.0471 136.517C81.482 137.928 78.2757 138.633 74.4281 138.633C69.4263 138.633 65.4504 137.543 62.5006 135.362C59.6791 133.182 57.627 130.425 56.3445 127.09C55.1902 123.627 54.6131 120.1 54.6131 116.509V100.927C54.6131 97.2073 55.1902 93.6803 56.3445 90.3458C57.4988 87.0112 59.8073 84.2538 63.2701 82.0735C66.8612 79.8932 72.1196 78.803 79.0452 78.803H90.3956V60.7194C90.3956 57.7696 89.8826 54.948 88.8565 52.2547C87.9588 49.4332 86.3556 47.1246 84.0471 45.3291C81.7385 43.4053 78.5322 42.4434 74.4281 42.4434C68.6568 42.4434 64.5527 44.1748 62.1159 47.6376C59.6791 51.1004 58.3965 54.8839 58.2683 58.988C58.653 59.501 58.8454 60.014 58.8454 60.527C58.8454 62.0661 58.0118 62.8356 56.3445 62.8356C54.6772 62.8356 53.8436 62.0661 53.8436 60.527C53.8436 59.7575 54.0359 59.1804 54.4207 58.7956C54.6772 55.3328 55.4467 52.0623 56.7293 48.9843C58.14 45.9062 60.2562 43.4053 63.0778 41.4815C65.8993 39.5577 69.6828 38.5958 74.4281 38.5958C79.43 38.5958 83.3417 39.686 86.1632 41.8663C89.1131 44.0466 91.1651 46.804 92.3194 50.1386C93.6019 53.4731 94.2432 57.0001 94.2432 60.7194V134.593ZM58.4607 116.509C58.4607 119.459 58.9095 122.345 59.8073 125.166C60.7051 127.988 62.3082 130.296 64.6168 132.092C67.0536 133.888 70.324 134.785 74.4281 134.785C78.5322 134.785 81.6744 133.952 83.8547 132.284C86.1632 130.617 87.7664 128.501 88.6642 125.936C89.6902 123.371 90.2673 120.678 90.3956 117.856V82.6506H79.0452C73.0173 82.6506 68.5285 83.5484 65.5787 85.3439C62.6289 87.1394 60.7051 89.448 59.8073 92.2696C58.9095 95.0911 58.4607 97.9768 58.4607 100.927V116.509Z" fill="#111111" />
                        <path d="M40.592 117.279C40.592 120.87 39.9507 124.333 38.6682 127.667C37.5139 130.874 35.4619 133.503 32.5121 135.555C29.6905 137.607 25.7147 138.633 20.5846 138.633C13.5307 138.633 8.46468 136.645 5.38661 132.669C2.4368 128.693 0.833642 124.14 0.577137 119.01C0.192379 118.625 0 118.048 0 117.279C0 115.612 0.833642 114.778 2.50093 114.778C4.16821 114.778 5.00185 115.612 5.00185 117.279C5.00185 118.048 4.80947 118.625 4.42472 119.01C4.55297 123.371 5.8355 127.09 8.2723 130.168C10.7091 133.246 14.8132 134.785 20.5846 134.785C26.7407 134.785 30.973 132.99 33.2816 129.399C35.5901 125.808 36.7444 121.768 36.7444 117.279V4.35234C36.3596 3.96757 36.1673 3.39044 36.1673 2.62092C36.1673 1.97966 36.4238 1.40252 36.9368 0.889513C37.578 0.376501 38.1552 0.119995 38.6682 0.119995C40.3355 0.119995 41.1691 0.953638 41.1691 2.62092C41.1691 3.39044 40.9767 3.96757 40.592 4.35234V117.279Z" fill="#111111" />
                        <path d="M265.781 134.593C266.166 134.978 266.358 135.491 266.358 136.132C266.358 137.799 265.525 138.633 263.858 138.633C262.19 138.633 261.357 137.799 261.357 136.132C261.357 135.491 261.549 134.978 261.934 134.593V42.8281C261.549 42.1869 261.357 41.6097 261.357 41.0967C261.357 39.4294 262.19 38.5958 263.858 38.5958C265.525 38.5958 266.358 39.4294 266.358 41.0967C266.358 41.6097 266.166 42.1869 265.781 42.8281V49.5614C267.577 46.6116 269.693 44.3672 272.13 42.8281C274.695 41.2891 277.901 40.5196 281.749 40.5196H285.019C285.661 40.1348 286.238 39.9425 286.751 39.9425C288.418 39.9425 289.252 40.7761 289.252 42.4434C289.252 44.1107 288.418 44.9443 286.751 44.9443C286.238 44.9443 285.661 44.7519 285.019 44.3672H281.749C276.362 44.3672 272.322 46.291 269.629 50.1385C267.064 53.9861 265.781 58.1543 265.781 62.6432V134.593Z" fill="#111111" />
                        <path d="M136.746 73.9916C142.841 69.7972 148.809 66.5732 154.653 64.3195C160.496 62.0659 165.554 60.939 169.826 60.939C174.099 60.939 176.832 62.1598 178.026 64.6013C180.476 61.7842 183.523 60.2817 187.168 60.0939C188.236 60.0313 189.555 60 191.126 60C192.697 60 193.671 60.2191 194.048 60.6573C194.425 61.0329 194.77 61.7842 195.084 62.911C195.398 64.0378 195.587 64.6639 195.65 64.7891C195.713 64.9143 195.744 65.1334 195.744 65.4464C195.744 65.6968 195.587 66.0411 195.273 66.4793C194.959 66.8549 194.582 67.2306 194.142 67.6062C193.765 67.9818 193.545 68.2009 193.482 68.2635C179.597 88.1084 165.397 110.739 150.883 136.156C165.837 122.947 179.22 113.462 191.032 107.703C191.786 107.327 192.508 107.139 193.199 107.139C194.205 107.139 194.864 107.797 195.179 109.111C195.493 110.363 195.65 112.179 195.65 114.558C195.65 116.937 195.493 118.408 195.179 118.971C194.927 119.535 193.482 120.662 190.843 122.352C188.204 124.042 184.78 126.233 180.57 128.925C176.361 131.617 171.9 134.591 167.187 137.846C155.878 145.671 146.579 153.903 139.291 162.542C129.866 173.873 123.112 183.013 119.028 189.962C117.52 192.654 114.975 194 111.394 194C104.294 194 100.744 190.651 100.744 183.952C100.744 177.129 104.105 170.149 110.828 163.012C115.855 157.691 120.473 153.34 124.682 149.959C128.892 146.579 131.185 144.669 131.562 144.231C136.212 137.282 142.526 127.423 150.506 114.652C143.72 121.726 137.123 127.36 130.714 131.554C124.368 135.749 119.625 137.846 116.483 137.846C106.87 137.846 102.063 133.745 102.063 125.545C102.063 119.034 103.728 112.461 107.058 105.825C110.389 99.189 114.661 93.2731 119.876 88.0771C125.091 82.8185 130.714 78.1233 136.746 73.9916ZM172.654 71.5501C165.365 73.1152 158.517 75.7132 152.108 79.3441C145.699 82.9124 140.422 86.7624 136.275 90.8942C132.128 94.9633 128.547 99.1577 125.531 103.477C119.876 111.553 117.049 117.813 117.049 122.258C117.049 123.322 117.3 123.854 117.803 123.854C118.368 123.854 119.562 123.291 121.384 122.164C123.269 121.037 125.908 119.128 129.301 116.436C132.693 113.681 136.463 110.426 140.61 106.67C150.223 97.843 160.904 86.1364 172.654 71.5501Z" fill="#111111" />
                        <path d="M136.746 73.9916C142.841 69.7972 148.809 66.5732 154.653 64.3195C160.496 62.0659 165.554 60.939 169.826 60.939C174.099 60.939 176.832 62.1598 178.026 64.6013C180.476 61.7842 183.523 60.2817 187.168 60.0939C188.236 60.0313 189.555 60 191.126 60C192.697 60 193.671 60.2191 194.048 60.6573C194.425 61.0329 194.77 61.7842 195.084 62.911C195.398 64.0378 195.587 64.6639 195.65 64.7891C195.713 64.9143 195.744 65.1334 195.744 65.4464C195.744 65.6968 195.587 66.0411 195.273 66.4793C194.959 66.8549 194.582 67.2306 194.142 67.6062C193.765 67.9818 193.545 68.2009 193.482 68.2635C179.597 88.1084 165.397 110.739 150.883 136.156C165.837 122.947 179.22 113.462 191.032 107.703C191.786 107.327 192.508 107.139 193.199 107.139C194.205 107.139 194.864 107.797 195.179 109.111C195.493 110.363 195.65 112.179 195.65 114.558C195.65 116.937 195.493 118.408 195.179 118.971C194.927 119.535 193.482 120.662 190.843 122.352C188.204 124.042 184.78 126.233 180.57 128.925C176.361 131.617 171.9 134.591 167.187 137.846C155.878 145.671 146.579 153.903 139.291 162.542C129.866 173.873 123.112 183.013 119.028 189.962C117.52 192.654 114.975 194 111.394 194C104.294 194 100.744 190.651 100.744 183.952C100.744 177.129 104.105 170.149 110.828 163.012C115.855 157.691 120.473 153.34 124.682 149.959C128.892 146.579 131.185 144.669 131.562 144.231C136.212 137.282 142.526 127.423 150.506 114.652C143.72 121.726 137.123 127.36 130.714 131.554C124.368 135.749 119.625 137.846 116.483 137.846C106.87 137.846 102.063 133.745 102.063 125.545C102.063 119.034 103.728 112.461 107.058 105.825C110.389 99.189 114.661 93.2731 119.876 88.0771C125.091 82.8185 130.714 78.1233 136.746 73.9916ZM172.654 71.5501C165.365 73.1152 158.517 75.7132 152.108 79.3441C145.699 82.9124 140.422 86.7624 136.275 90.8942C132.128 94.9633 128.547 99.1577 125.531 103.477C119.876 111.553 117.049 117.813 117.049 122.258C117.049 123.322 117.3 123.854 117.803 123.854C118.368 123.854 119.562 123.291 121.384 122.164C123.269 121.037 125.908 119.128 129.301 116.436C132.693 113.681 136.463 110.426 140.61 106.67C150.223 97.843 160.904 86.1364 172.654 71.5501Z" fill="#FF5500" />
                        <path d="M190.899 51.95C194.349 51.2214 196.742 50.8571 198.079 50.8571C198.574 50.8571 198.855 51.0214 198.922 51.35C198.948 51.4786 199.015 51.5786 199.122 51.65C199.229 51.7071 199.336 51.9857 199.443 52.4857C199.563 52.9857 199.63 53.3929 199.644 53.7071V53.9C199.644 54.4 199.47 54.6857 199.122 54.7571C197.839 55.0429 195.746 55.3 192.844 55.5286C189.956 55.7571 188.238 55.9143 187.69 56C187.409 56 186.961 55.8357 186.346 55.5071C186.225 55.3786 186.092 55.15 185.945 54.8214C185.811 54.4929 185.744 54.2071 185.744 53.9643C185.744 53.7214 185.871 53.3286 186.125 52.7857C186.165 52.6857 187.001 51.6786 188.632 49.7643C189.033 49.3071 190.076 48.2857 191.761 46.7C193.459 45.1 194.636 43.9071 195.291 43.1214C195.96 42.3214 197.123 41 198.781 39.1571C200.439 37.3143 201.67 35.8857 202.472 34.8714C203.274 33.8429 203.675 33.1143 203.675 32.6857C203.675 32.4143 203.481 32.2786 203.094 32.2786C202.706 32.2786 202.231 32.4071 201.67 32.6643C201.121 32.9071 200.479 33.2786 199.744 33.7786C198.019 34.9643 196.361 36.75 194.77 39.1357C194.69 39.2071 194.649 39.3571 194.649 39.5857C194.542 39.8714 194.315 40.1071 193.967 40.2929C193.62 40.4786 193.339 40.5/60" 193.125 40.5714C192.911 40.5714 192.637 40.5 192.303 40.3571C191.982 40.2 191.741 40.0429 191.581 39.8857C191.581 39.7286 191.501 39.4286 191.501 38.9857C191.501 38.5429 191.735 37.9143 192.203 37.1C192.671 36.2714 193.326 35.4 194.169 34.4857C195.011 33.5571 195.947 32.6857 196.977 31.8714C198.02 31.0429 199.183 30.3571 200.467 29.8143C201.75 29.2714 202.84 29 203.736 29C204.632 29 205.294 29.2071 205.722 29.6214C206.511 30.3929 206.905 31.25 206.905 32.1929C206.905 33.1357 206.484 34.2929 205.641 35.6643C204.812 37.0357 203.682 38.5429 202.252 40.1857C200.66 41.8286 199.47 43.3214 198.2 44.6643C196.76 46.0071 195.358 47.4571 193.968 49.0143C192.417 50.5571 191.287 51.5357 191.06 51.95Z" fill="#111111" />
                        <path d="M15.1265 4.42307C14.7281 4.80768 14.1305 5 13.3336 5C11.6072 5 10.744 4.16666 10.744 2.5C10.744 0.833337 11.6072 -1.50929e-07 13.3336 0C13.8649 4.64399e-08 14.4625 0.192313 15.1265 0.576926L36.5607 0.57693C36.9591 0.192317 37.4904 4.01919e-06 38.1544 4.07724e-06C39.8808 4.22817e-06 40.744 0.833341 40.744 2.5C40.744 4.16667 39.8808 5 38.1544 5C37.4904 5 36.9591 4.80769 36.5607 4.42307L15.1265 4.42307Z" fill="#111111" />
                        <path d="M293.734 131.512L293.704 131.999C293.704 132.507 293.897 132.943 294.283 133.309C294.668 133.674 295.024 133.857 295.349 133.857C297.786 133.857 299.938 133.491 301.806 132.76C303.695 132.029 304.639 131.298 304.639 130.567C304.639 130.222 304.294 129.928 303.603 129.684C302.933 129.42 301.786 129.105 300.161 128.74C298.557 128.354 297.39 128.059 296.658 127.856C295.927 127.633 295.349 127.43 294.922 127.247C294.496 127.064 294.059 126.81 293.612 126.486C292.658 125.815 292.181 124.82 292.181 123.5C292.181 122.16 292.668 120.84 293.643 119.541C294.638 118.221 295.877 117.094 297.359 116.16C298.841 115.225 300.436 114.403 302.141 113.692C305.512 112.291 308.345 111.59 310.64 111.59C312.894 111.59 314.285 112.078 314.813 113.053C314.975 113.398 315.057 113.784 315.057 114.21V114.423C315.057 115.5 314.823 116.342 314.356 116.951C313.909 117.561 313.188 118.109 312.193 118.596C311.219 119.084 310.437 119.327 309.848 119.327C309.279 119.327 308.914 119.287 308.751 119.206C308.609 119.124 308.487 119.023 308.386 118.901C308.284 118.759 308.152 118.657 307.99 118.596C307.848 118.535 307.776 118.383 307.776 118.139C307.776 117.896 307.878 117.652 308.081 117.408C308.284 117.144 308.426 116.87 308.508 116.586C307.167 116.647 305.766 116.962 304.304 117.53C302.842 118.079 301.583 118.698 300.527 119.388C299.491 120.079 298.628 120.739 297.938 121.368C297.247 121.998 296.902 122.465 296.902 122.769C296.902 123.054 297.369 123.287 298.303 123.47C302.507 124.303 305.269 125.023 306.589 125.633C307.908 126.242 308.822 126.932 309.33 127.704C309.838 128.476 310.091 129.176 310.091 129.806C310.091 131.105 309.574 132.334 308.538 133.491C307.502 134.649 306.223 135.593 304.7 136.324C301.431 137.928 298.577 138.731 296.141 138.731C293.724 138.731 292.049 138.355 291.115 137.604C290.201 136.873 289.744 135.999 289.744 134.984C289.744 133.969 289.998 133.035 290.506 132.182C291.034 131.308 291.704 130.872 292.516 130.872C293.328 130.872 293.734 131.085 293.734 131.512Z" fill="#111111" />
                        <path d="M295.684 107.387C294.628 107.387 293.846 107.093 293.338 106.504C292.831 105.894 292.577 105.123 292.577 104.189C292.577 103.234 292.922 102.3 293.612 101.386C294.303 100.452 295.318 99.4876 296.658 98.4926C298.019 97.4975 299.156 97 300.07 97C300.537 97 300.862 97.1117 301.045 97.3351C301.228 97.5381 301.4 97.6701 301.563 97.731C301.745 97.792 301.837 97.9747 301.837 98.2793C301.837 98.5839 301.756 98.8073 301.593 98.9495C301.431 99.0713 301.014 99.6094 300.344 100.564C299.694 101.498 299.309 102.117 299.187 102.422C299.512 102.747 299.674 103.255 299.674 103.945C299.674 104.615 299.278 105.356 298.486 106.169C297.694 106.981 296.76 107.387 295.684 107.387Z" fill="#111111" />
                        <path d="M248.374 83.0547H212.592V116.913C212.592 119.863 213.041 122.749 213.938 125.57C214.964 128.392 216.632 130.701 218.94 132.496C221.377 134.292 224.584 135.189 228.559 135.189C234.587 135.189 238.691 133.522 240.871 130.188C243.18 126.725 244.526 118.645C244.142 118.26 243.949 117.105C243.949 117.105C243.949 115.439 244.783 114.605 246.45 114.604C248.117 114.604 248.951 115.438 248.951 117.105C248.951 117.747 248.759 118.26 248.374 118.645C248.117 122.107 247.348 125.378 246.065 128.456C244.783 131.534 242.731 134.099 239.909 136.151C237.216 138.075 233.433 139.037 228.559 139.037C223.558 139.037 219.582 137.947 216.632 135.767C213.81 133.586 211.758 130.829 210.475 127.494C209.321 124.031 208.744 120.504 208.744 116.913V76H212.592V79.207H244.526V76H248.374V83.0547ZM212.592 72H208.744V68H212.592V72ZM248.374 72H244.526V68H248.374V72ZM228.559 39C233.561 39.0001 237.472 40.0904 240.294 42.2705C243.244 44.4508 245.296 47.2084 246.45 50.543C247.733 53.8775 248.374 57.4047 248.374 61.124V64H244.526V61.124C244.526 58.1743 244.077 55.3524 243.18 52.6592C242.282 49.8376 240.679 47.5289 238.37 45.7334C236.062 43.8098 232.791 42.8477 228.559 42.8477C224.584 42.8477 221.377 43.8096 218.94 45.7334C216.632 47.5289 214.964 49.8376 213.938 52.6592C213.041 55.3524 212.592 58.1743 212.592 61.124V64H208.744V61.124C208.744 57.4048 209.321 53.8775 210.475 50.543C211.758 47.2084 213.81 44.4508 216.632 42.2705C219.582 40.0902 223.558 39 228.559 39Z" fill="#111111" />
                        <path d="M286.656 164C286.656 165.387 286.208 166.485 285.312 167.296C284.438 168.085 283.083 168.48 281.249 168.48C279.414 168.48 278.038 168.085 277.121 167.296C276.225 166.485 275.777 165.387 275.777 164V151.2C275.777 149.813 276.214 148.725 277.089 147.936C277.985 147.125 279.35 146.72 281.185 146.72C283.019 146.72 284.385 147.125 285.281 147.936C286.198 148.725 286.656 149.813 286.656 151.2V164ZM284.417 151.2C284.417 150.389 284.15 149.76 283.617 149.312C283.083 148.864 282.273 148.64 281.185 148.64C280.118 148.64 279.318 148.864 278.785 149.312C278.273 149.76 278.017 150.389 278.017 151.2V164C278.017 164.789 278.283 165.419 278.816 165.888C279.35 166.336 280.161 166.56 281.249 166.56C282.315 166.56 283.105 166.336 283.617 165.888C284.15 165.44 284.417 164.811 284.417 164V151.2Z" fill="#111111" />
                        <path d="M270.83 168H265.39V166.08H266.99V149.12H265.39V147.2H270.83V149.12H269.23V166.08H270.83V168Z" fill="#111111" />
                        <path d="M254.413 147.2H256.653V166.08H262.509V168H254.413V147.2Z" fill="#111111" />
                        <path d="M248.5 164C248.5 165.387 248.052 166.485 247.156 167.296C246.282 168.085 244.927 168.48 243.092 168.48C241.258 168.48 239.882 168.085 238.964 167.296C238.068 166.485 237.62 165.387 237.62 164V151.2C237.62 149.813 238.058 148.725 238.932 147.936C239.828 147.125 241.194 146.72 243.028 146.72C244.863 146.72 246.228 147.125 247.124 147.936C248.042 148.725 248.5 149.813 248.5 151.2V164ZM246.26 151.2C246.26 150.389 245.994 149.76 245.46 149.312C244.927 148.864 244.116 148.64 243.028 148.64C241.962 148.64 241.162 148.864 240.628 149.312C240.116 149.76 239.86 150.389 239.86 151.2V164C239.86 164.789 240.127 165.419 240.66 165.888C241.194 166.336 242.004 166.56 243.092 166.56C244.159 166.56 244.948 166.336 245.46 165.888C245.994 165.44 246.26 164.811 246.26 164V151.2Z" fill="#111111" />
                        <path d="M224.819 168V147.2H233.619V149.12H227.059V156.48H232.339V158.4H227.059V168H224.819Z" fill="#111111" />
                        <path d="M209.288 168V147.2H214.12C215.826 147.2 217.096 147.605 217.928 148.416C218.781 149.205 219.208 151.68V156.16C219.208 157.205 218.973 158.091 218.504 158.816C218.034 159.52 217.33 160.021 216.392 160.32L220.328 168H217.864L214.12 160.64H211.528V168H209.288ZM216.968 151.68C216.968 150.891 216.722 150.272 216.232 149.824C215.762 149.355 215.058 149.12 214.12 149.12H211.528V158.72H214.12C215.08 158.72 215.794 158.496 216.264 158.048C216.733 157.579 216.968 156.949 216.968 156.16V151.68Z" fill="#111111" />
                        <path d="M203.375 164C203.375 165.387 202.927 166.485 202.031 167.296C201.157 168.085 199.802 168.48 197.967 168.48C196.133 168.48 194.757 168.085 193.839 167.296C192.943 166.485 192.495 165.387 192.495 164V151.2C192.495 149.813 192.933 148.725 193.807 147.936C194.703 147.125 196.069 146.72 197.903 146.72C199.738 146.72 201.103 147.125 201.999 147.936C202.917 148.725 203.375 149.813 203.375 151.2V164ZM201.135 151.2C201.135 150.389 200.869 149.76 200.335 149.312C199.802 148.864 198.991 148.64 197.903 148.64C196.837 148.64 196.037 148.864 195.503 149.312C194.991 149.76 194.735 150.389 194.735 151.2V164C194.735 164.789 195.002 165.419 195.535 165.888C196.069 166.336 196.879 166.56 197.967 166.56C199.034 166.56 199.823 166.336 200.335 165.888C200.869 165.44 201.135 164.811 201.135 164V151.2Z" fill="#111111" />
                        <path d="M177.944 168V147.2H182.776C184.483 147.2 185.752 147.605 186.584 148.416C187.437 149.205 187.864 151.68V157.12C187.864 158.507 187.448 159.605 186.616 160.416C185.784 161.205 184.504 161.6 182.776 161.6H180.184V168H177.944ZM185.624 151.68C185.624 150.891 185.379 150.272 184.888 149.824C184.419 149.355 183.715 149.12 182.776 149.12H180.184V159.68H182.776C183.736 159.68 184.451 159.456 184.92 159.008C185.389 158.539 185.624 157.909 185.624 157.12V151.68Z" fill="#111111" />
                    </svg>
                </div>
                <div class="meta">
                    <div class="meta-item"><strong>Client:</strong> ${profile?.name || '—'}</div>
                    <div class="meta-item"><strong>Email:</strong> ${profile?.email || '—'}</div>
                    <div class="meta-item"><strong>Plan:</strong> ${planName}</div>
                    <div class="meta-item"><strong>Amount:</strong> NT$ ${amt}</div>
                    <div class="meta-item"><strong>Timeline:</strong> ${timelineText}</div>
                    <div class="meta-item"><strong>Signed Date:</strong> ${targetContract.signed_at ? new Date(targetContract.signed_at).toLocaleString('zh-TW') : 'Pending'}</div>
                </div>
                <div>
                    ${isSigned ? `
                        <div style="white-space: pre-wrap; font-family: monospace; font-size: 11.5px; border: 1px solid #ddd; padding: 15px; background: #fafafa; border-radius: 6px; line-height: 1.5; color: #333; margin-bottom: 20px;">${targetContract.raw_contract_body || targetContract.content || ''}</div>
                    ` : `
                        ${CONTRACT_CLAUSES.map(c => `
                            <div class="clause">
                                <div class="clause-title">${c.num}. ${c.title}</div>
                                <div>${c.body.replace('[[AMOUNT]]', `<span style="color: #FF5500; font-weight: bold;">NT$ ${amt}</span>`).replace('[[TIMELINE]]', `<span style="color: #FF5500; font-weight: bold;">${timelineText}</span>`)}</div>
                            </div>
                        `).join('')}
                    `}
                </div>
                <div class="sig-section">
                    <div>
                        <strong>甲方 (客戶) 簽署 / Client Signature:</strong><br/>
                        <div style="margin-top: 6px; font-size: 11px; color: #555;">
                            代表人 (Representative): ${profile?.name || '—'}<br/>
                            簽署日期 (Date): ${targetContract.signed_at ? new Date(targetContract.signed_at).toLocaleString('zh-TW') : 'Pending'}
                        </div>
                        <div style="margin-top: 8px;">
                            ${sigSrc ? `<img class="sig-img" src="${sigSrc}" />` : '<em>尚未簽署</em>'}
                        </div>
                    </div>
                    <div>
                        <strong>乙方 (積加設計工作室) 簽署 / Service Provider:</strong><br/>
                        <div style="margin-top: 6px; font-size: 11px; color: #555;">
                            代表人 (Representative): Jagger Su<br/>
                            簽署日期 (Date): ${targetContract.signed_at ? new Date(targetContract.signed_at).toLocaleString('zh-TW') : 'Pending'}
                        </div>
                        <div style="margin-top: 8px;">
                            <div style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 18px; color: #111; font-weight: bold; border: 1px solid #ddd; padding: 4px 12px; display: inline-block; background: #fafafa; border-radius: 4px; letter-spacing: 1px; transform: rotate(-2deg); box-shadow: inset 0 0 3px rgba(0,0,0,0.05);">Jagger Su</div>
                        </div>
                    </div>
                </div>
                ${isSigned && targetContract.metadata ? `
                <div style="margin-top: 25px; border-top: 1px dashed #ccc; padding-top: 15px; font-family: monospace; font-size: 9.5px; color: #666; line-height: 1.4;">
                    <strong>數位存證指紋 / Forensic Fingerprint:</strong><br/>
                    IP Address: ${targetContract.metadata.ip || '—'}<br/>
                    User Agent: ${targetContract.metadata.userAgent || '—'}
                </div>
                ` : ''}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        // Defer print dialog so the browser can flush layout (avoids INP issue)
        setTimeout(() => {
            printWindow.print();
            // close() after print dialog dismissal; most browsers ignore close on print
            printWindow.close();
        }, 50);
    };

    // Download contract function - uses native print engine to guarantee A4 PDF vectors rendering

    // Handle plan selection update price and timeline defaults
    useEffect(() => {
        setDraftReadBottom(false);
        if (isAdding) {
            if (newPlan === 'ON-DEMAND') {
                setNewAmount('');
                setNewTimeline('');
            } else {
                const price = PLAN_PRICES[newPlan];
                setNewAmount(String(price));
                setNewTimeline('按月續約');
            }
        }
    }, [newPlan, isAdding]);

    useEffect(() => {
        setSignReadBottom(false);
    }, [selectedContractId]);

    const handleSign = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasSig || !agreed) return;
        const signatureDataUrl = canvas.toDataURL('image/png');
        sign(signatureDataUrl);

        const currentPlan = isAdding ? newPlan : initialPlan;
        const timelineVal = isAdding ? newTimeline : contractParams.timeline;
        if (!timelineVal || timelineVal.trim() === "") {
            setCheckoutError('請先填寫合約時程/交期再繼續');
            setPaying(false);
            return;
        }

        const readBottom = isAdding ? draftReadBottom : signReadBottom;
        if (!readBottom) {
            setCheckoutError('請先向下滾動完整閱讀合約條款再繼續');
            setPaying(false);
            return;
        }

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
    }, [hasSig, agreed, sign, activate, contractParams, initialPlan, profile, isAdding, newPlan, newAmount, newTimeline, embedded, fetchContracts, draftReadBottom, signReadBottom]);

    // RENDER: Embedded cabinet list view
    if (embedded) {
        return (
            <div className="flex-1 flex overflow-hidden h-full" style={{ maxHeight: '100%' }}>
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
                                                {c.status === 'SIGNED' ? '✓ 已簽署' : '待付款'}
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
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {['LITE', 'PRO', 'SCALE', 'ON-DEMAND'].map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setNewPlan(p)}
                                                    className={`py-2 rounded-lg text-[9px] font-mono font-bold border transition-colors ${
                                                        newPlan === p
                                                            ? 'border-[#FF5500]/60 bg-[#FF5500]/5 text-[#FF5500]'
                                                            : 'border-zinc-800 text-zinc-500 hover:text-zinc-350'
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
                                    <div 
                                        onScroll={e => {
                                            const target = e.currentTarget;
                                            if (target.scrollHeight - target.scrollTop <= target.clientHeight + 15) {
                                                setDraftReadBottom(true);
                                            }
                                        }}
                                        className="border border-zinc-900 rounded-xl p-3 bg-zinc-950/20 max-h-56 overflow-y-auto space-y-3" 
                                        style={{ scrollbarWidth: 'thin' }}
                                    >
                                        <div className="text-[9px] text-zinc-600 tracking-widest font-mono">// CONTRACT PREVIEW CLAUSES (請向下滾動完整閱讀解鎖)</div>
                                        {CONTRACT_CLAUSES.map(c => (
                                            <div key={c.num} className="text-[11px] leading-relaxed">
                                                <span className="text-[#FF5500] font-bold mr-1.5">{c.num}.</span>
                                                {renderClauseBody(c.body, `NT$ ${Number(newAmount || 0).toLocaleString()}`, newTimeline, "text-zinc-400")}
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
                                            {(!draftReadBottom || !newAmount.trim() || !newTimeline.trim()) && (
                                                <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center text-[10px] text-zinc-500 font-mono text-center px-4 space-y-1 z-10 select-none">
                                                    <span>🔒 請填寫金額、交期並向下滾動完整閱讀合約</span>
                                                    <span className="text-[8px] text-zinc-750 font-bold">（完成後即可解鎖電子簽名區）</span>
                                                </div>
                                            )}
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
                                {activeContract.status === 'SIGNED' ? (
                                    <div className="border border-zinc-900 rounded-xl p-4 bg-zinc-950/40 max-h-72 overflow-y-auto font-mono text-zinc-400 text-xs whitespace-pre-wrap leading-relaxed" style={{ scrollbarWidth: 'thin' }}>
                                        {activeContract.raw_contract_body || activeContract.content || '（無合約本文封存）'}
                                    </div>
                                ) : (
                                    <div className="border border-zinc-900 rounded-xl p-4 bg-zinc-950/40 space-y-4 max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                        {CONTRACT_CLAUSES.map(clause => {
                                            const finalAmt = Number(amtValue).toLocaleString();
                                            return (
                                                <div key={clause.num} className="text-xs leading-relaxed">
                                                    <div className="font-bold text-zinc-200 mb-1 font-mono">{clause.num}. {clause.title}</div>
                                                    {renderClauseBody(clause.body, `NT$ ${finalAmt}`, timelineText, "text-zinc-400 block")}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Signature image */}
                                {(activeContract.signature_snapshot || activeContract.metadata?.signature) && (
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] text-zinc-600 tracking-widest font-mono">ELECTRONIC SIGNATURE</span>
                                        <div className="border border-zinc-900 rounded-xl p-3 bg-zinc-950/40 flex items-center justify-center">
                                            <img
                                                src={activeContract.signature_snapshot || activeContract.metadata.signature}
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

                                {/* Forensic Fingerprint */}
                                {activeContract.status === 'SIGNED' && activeContract.metadata && (
                                    <div className="border border-zinc-900/50 rounded-xl p-3.5 bg-zinc-950/20 space-y-1.5 text-[11px] font-mono text-zinc-500">
                                        <div className="text-[10px] text-zinc-650 tracking-wider mb-0.5">// SIGNATURE FORENSIC FINGERPRINT</div>
                                        {activeContract.metadata.ip && <div>IP Address: {activeContract.metadata.ip}</div>}
                                        {activeContract.metadata.userAgent && <div className="break-all leading-normal">User Agent: {activeContract.metadata.userAgent}</div>}
                                    </div>
                                )}

                                {/* Print & Download action strip */}
                                <div className="grid grid-cols-1 gap-3 pt-2">
                                    <button
                                        onClick={() => handlePrintContract(activeContract)}
                                        className="py-2.5 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-mono font-bold hover:border-zinc-700 transition-colors"
                                    >
                                        🖨 列印合約
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
                        paymentTab={paymentTab}
                        setPaymentTab={setPaymentTab}
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

                    <div 
                        onScroll={e => {
                            const target = e.currentTarget;
                            if (target.scrollHeight - target.scrollTop <= target.clientHeight + 15) {
                                setSignReadBottom(true);
                            }
                        }}
                        className="flex-1 overflow-y-auto px-8 py-6 space-y-7"
                    >
                        {CONTRACT_CLAUSES.map(clause => {
                            const amountText = contractParams.amount ? `NT$ ${Number(contractParams.amount).toLocaleString()}` : '（待確認）';
                            const timelineText = contractParams.timeline || '（待確認）';

                            const renderBody = () => {
                                return renderClauseBody(clause.body, amountText, timelineText, "text-[14px] text-zinc-400 leading-[1.75] block");
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
                                {(!signReadBottom || !contractParams.amount || String(contractParams.amount).trim() === "" || !contractParams.timeline || String(contractParams.timeline).trim() === "") && (
                                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center text-[11px] text-zinc-500 font-mono text-center px-4 space-y-1.5 z-10 select-none">
                                        <span>🔒 請確認金額、交期並閱讀左側合約至最下方</span>
                                        <span className="text-[9px] text-zinc-750 font-bold">（完成後即可解鎖電子簽名區）</span>
                                    </div>
                                )}
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
                    paymentTab={paymentTab}
                    setPaymentTab={setPaymentTab}
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
    paymentTab: 'fiat' | 'crypto' | 'coffee';
    setPaymentTab: (tab: 'fiat' | 'crypto' | 'coffee') => void;
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
    paymentTab,
    setPaymentTab,
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
        { chain: 'TRC-20',      network: 'Tron Network', address: 'TAgWCpyof2tNYEq67v5PBgUApqpKHviYEY',                   warn: '請務必使用波場 Tron 網路傳送，勿使用 ERC-20 或其他網路。',            icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M12 2L2 8l10 14L22 8L12 2z" fill="#FF0013" opacity="0.8"/></svg> },
        { chain: 'Base / Arb',  network: 'EVM Network',  address: '0x8D929F645fa9c97df90349203b8949c3318ceACE',             warn: '支援 Base 與 Arbitrum 網路，請勿使用主網 ETH 或其他 EVM 網路。',    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0"><circle cx="12" cy="12" r="10" fill="#0052FF" opacity="0.8"/><path d="M8 12h8M12 8v8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg> },
        { chain: 'TON',         network: 'TON Network',  address: 'UQBXuoeso8Yxl-LNGxD_q8JQqtWKgkZIgOlyTfY57ESXTHSw',   warn: '僅限 TON 網路轉帳，請勿使用其他網路。',                              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M12 2L3 9h18L12 2z" fill="#0098EA" opacity="0.8"/><path d="M3 9l9 13L21 9" fill="#0098EA" opacity="0.5"/></svg> },
    ];
    const activeWallet = WALLETS.find(w => w.chain === cryptoChain) ?? WALLETS[0];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm">
            <div className="bg-[#0A0A0B] border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] transition-all">
                <div className="h-14 border-b border-zinc-900 flex items-center justify-between px-7 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5500] animate-pulse" />
                        <span className="text-[12px] text-zinc-400 tracking-widest font-mono font-bold">// SECURE PAYMENT</span>
                    </div>
                    <button onClick={() => setShowPayment(false)} className="text-zinc-500 hover:text-zinc-200 text-xl font-medium transition-colors">×</button>
                </div>

                <div className="grid grid-cols-3 border-b border-zinc-900 shrink-0">
                    {([
                        { 
                            key: 'fiat' as const,   
                            label: '信用卡 / 匯款',  
                            sub: '線上安全金流', 
                            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> 
                        },
                        { 
                            key: 'crypto' as const, 
                            label: 'USDT / USDC', 
                            sub: '區塊鏈快速轉帳', 
                            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 9l4-3 4 3M8 15l4 3 4-3"/></svg> 
                        },
                        {
                            key: 'coffee' as const,
                            label: 'Buy Coffee',
                            sub: '小額/贊助支付',
                            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>
                        }
                    ]).map(tab => {
                        const isActive = paymentTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setPaymentTab(tab.key)}
                                className={`py-4.5 text-center transition-all flex flex-col items-center gap-1.5 hover:bg-zinc-900/40 border-b-2 ${
                                    isActive ? 'border-[#FF5500] bg-zinc-900/25' : 'border-transparent text-zinc-500'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={isActive ? 'text-[#FF5500]' : 'text-zinc-500'}>{tab.icon}</div>
                                    <div className={`text-[13px] font-bold font-mono transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}>{tab.label}</div>
                                </div>
                                <div className="text-[9px] text-zinc-650 tracking-wider font-mono mt-0.5 uppercase">{tab.sub}</div>
                            </button>
                        );
                    })}
                </div>

                {paymentTab === 'fiat' && (
                    <div className="p-8 space-y-6 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF5500" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                            </div>
                            <div>
                                <div className="text-[14px] font-bold text-white font-mono">藍新金流 NewebPay</div>
                                <div className="text-[11px] text-zinc-500 font-mono">支援國內外信用卡、ATM 轉帳、超商付費</div>
                            </div>
                        </div>

                        <p className="text-[12px] text-zinc-400 font-mono leading-relaxed">
                            點擊下方按鈕後將前往藍新金流安全收銀台，您可以選擇信用卡一次付清、ATM 轉帳或超商代碼付款。完成付款後系統將即時啟用您的專案。
                        </p>

                        <div className="grid grid-cols-3 gap-2.5">
                            {[
                                { label: '安全信用卡', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
                                { label: 'ATM 匯款', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M6 14h.01M10 10h8M10 14h8"/></svg> },
                                { label: '超商代碼', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg> },
                            ].map(m => (
                                <div key={m.label} className="bg-zinc-900/30 border border-zinc-850 rounded-xl p-3.5 flex flex-col items-center gap-2">
                                    <div className="text-[#FF5500]">{m.icon}</div>
                                    <span className="text-[11px] text-zinc-400 font-mono font-medium">{m.label}</span>
                                </div>
                            ))}
                        </div>

                        {checkoutError && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                <p className="text-[12px] text-red-400 font-mono">⚠ {checkoutError}</p>
                            </div>
                        )}

                        <button
                            onClick={handleSign}
                            disabled={paying}
                            className="w-full py-4 bg-[#FF5500] hover:bg-white text-black font-mono font-bold text-[13px] tracking-widest rounded-xl transition-all duration-200 disabled:opacity-50 active:scale-[0.99]"
                        >
                            {paying ? '⟳ 跳轉收銀台中…' : '確認合約並前往付款 →'}
                        </button>
                    </div>
                )}

                {paymentTab === 'crypto' && (
                    <div className="p-8 space-y-6 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#FF5500] text-xl">
                                🪙
                            </div>
                            <div>
                                <div className="text-[14px] font-bold text-white font-mono">USDT / USDC 區塊鏈轉帳</div>
                                <div className="text-[11px] text-zinc-500 font-mono">請選擇公鏈鏈路，並複製專屬地址進行付款</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                            {WALLETS.map(w => (
                                <button
                                    key={w.chain}
                                    type="button"
                                    onClick={() => setCryptoChain(w.chain)}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        cryptoChain === w.chain
                                            ? 'border-[#FF5500]/60 bg-[#FF5500]/5 text-white'
                                            : 'border-zinc-850 bg-zinc-950/20 text-zinc-500 hover:text-zinc-350'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 font-bold text-xs font-mono">
                                        {w.icon}
                                        {w.chain}
                                    </div>
                                    <div className="text-[9px] text-zinc-650 mt-1 font-mono uppercase">{w.network}</div>
                                </button>
                            ))}
                        </div>

                        <div className="border border-zinc-900 bg-zinc-950/40 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono font-bold tracking-wider">
                                <span>TRANSFER ADDRESS ({activeWallet.chain})</span>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(activeWallet.chain, activeWallet.address)}
                                    className="text-[#FF5500] hover:text-white transition-colors"
                                >
                                    {copiedChain === activeWallet.chain ? '✓ COPIED' : 'COPY ADDRESS'}
                                </button>
                            </div>
                            <div className="bg-black/60 border border-zinc-850 p-3.5 rounded-xl text-[12px] text-zinc-300 break-all select-all font-mono leading-relaxed">
                                {activeWallet.address}
                            </div>
                            <div className="text-[11px] text-zinc-500 leading-relaxed font-mono flex items-start gap-1.5">
                                <span className="text-[#FF5500]">⚠</span>
                                <span>{activeWallet.warn}</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setTxid(`USER_CONFIRMED_${cryptoChain}_PAYMENT`);
                                setTimeout(() => {
                                    handleTxidSubmit();
                                }, 50);
                            }}
                            disabled={txidSubmitting}
                            className="w-full py-4.5 bg-[#FF5500] hover:bg-white text-black font-mono font-bold text-[13px] tracking-widest rounded-xl transition-all duration-200 disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                            {txidSubmitting ? '通知中…' : '我已完成轉帳，通知管理員確認'}
                        </button>
                    </div>
                )}

                {paymentTab === 'coffee' && (
                    <div className="p-8 space-y-6 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#FFDD00]">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>
                            </div>
                            <div>
                                <div className="text-[14px] font-bold text-white font-mono">Buy Me a Coffee</div>
                                <div className="text-[11px] text-zinc-500 font-mono">使用信用卡/Apple Pay等國際管道小額支付</div>
                            </div>
                        </div>

                        <p className="text-[12px] text-zinc-400 font-mono leading-relaxed">
                            請點擊下方按鈕前往我們的 Buy Me a Coffee 頁面完成付款或贊助支持（支援國內外信用卡、Google Pay 與 Apple Pay）。轉帳完成後請點選「我已完成付款」通知管理員。
                        </p>

                        <div className="bg-zinc-950/20 border border-zinc-850 rounded-2xl p-6 flex flex-col items-center justify-center gap-4">
                            <a
                                href="https://buymeacoffee.com/jaggersu"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-4 bg-[#FFDD00] hover:bg-[#FFEA00] text-black font-mono font-bold text-sm tracking-wider rounded-xl transition-all duration-200 text-center flex items-center justify-center gap-2 active:scale-[0.99] shadow-lg shadow-[#FFDD00]/10"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M20.216 11.455h-1a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2zm-2.072 4.195l-.707-.707a1 1 0 1 1 1.414-1.414l.707.707a1 1 0 1 1-1.414 1.414zm-7.644-8.195a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm-2.122-2.122a1 1 0 1 1-1.414 1.414 1 1 0 0 1 1.414-1.414zm13.122 8.122a6.002 6.002 0 0 1-5.9 5H6a6 6 0 0 1-6-6V9a6 6 0 0 1 6-6h7.622a6.002 6.002 0 0 1 5.9 5v1.455zm-1 0V9a4.002 4.002 0 0 0-3.9-3H6a4 4 0 0 0-4 4v2.455a4 4 0 0 0 4 4h7.622a4.002 4.002 0 0 0 3.9-3v-1.455zm-7 8.545a1 1 0 1 1-2 0V17h2v2.545z"/></svg>
                                前往 Buy Me a Coffee ☕
                            </a>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setTxid("USER_CONFIRMED_COFFEE_SPONSOR");
                                setTimeout(() => {
                                    handleTxidSubmit();
                                }, 50);
                            }}
                            disabled={txidSubmitting}
                            className="w-full py-4.5 bg-[#FF5500] hover:bg-white text-black font-mono font-bold text-[13px] tracking-widest rounded-xl transition-all duration-200 disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                            {txidSubmitting ? '通知中…' : '我已完成付款，發送確認通知'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
