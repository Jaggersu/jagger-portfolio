'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useUserFlow } from '../../lib/userFlow';
import { supabase } from '../../lib/supabase';
import { LayoutList } from '../icons/LayoutList';
import { FileIcon } from '../icons/FileIcon';
import { ContractIcon } from '../icons/ContractIcon';
import { SettingsIcon } from '../icons/SettingsIcon';
import AskAIDialog from './AskAIDialog';

interface DashboardPanelProps {
    onClose: () => void;
}

type TaskStatus = 'QUEUED' | 'IN_PROGRESS' | 'REVIEW' | 'DELIVERED';
type NavItem = 'tasks' | 'files' | 'contract' | 'settings';
type SettingsTab = 'account' | 'billing' | 'integrations';

interface Task {
    id: string;
    title: string;
    status: TaskStatus;
    type: string;
    eta: string;
    priority: 'HIGH' | 'MED' | 'LOW';
    description?: string;
    ai_summary?: string;
}

interface FileItem {
    id: string;
    file_name: string;
    file_url: string;
    size: number;
    storage_path: string;
    google_drive_id?: string;
    created_at: string;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; dot: string }> = {
    QUEUED:      { label: 'Queued',      color: 'text-zinc-500',    bg: 'bg-zinc-900',          dot: 'bg-zinc-600' },
    IN_PROGRESS: { label: 'In Progress', color: 'text-[#FF5500]',   bg: 'bg-[#FF5500]/10',      dot: 'bg-[#FF5500] animate-pulse' },
    REVIEW:      { label: 'In Review',   color: 'text-yellow-400',  bg: 'bg-yellow-500/10',     dot: 'bg-yellow-400' },
    DELIVERED:   { label: 'Delivered',   color: 'text-emerald-400', bg: 'bg-emerald-500/10',    dot: 'bg-emerald-400' },
};

const PRIORITY_CONFIG = {
    HIGH: { label: 'High',   color: 'text-red-400',    icon: '↑' },
    MED:  { label: 'Medium', color: 'text-yellow-400', icon: '→' },
    LOW:  { label: 'Low',    color: 'text-zinc-600',   icon: '↓' },
};

const MOCK_TASKS: Task[] = [
    { id: 'JOS-001', title: '品牌 Logo 主視覺設計', status: 'IN_PROGRESS', type: 'BRAND', eta: '2d', priority: 'HIGH', description: '包含主標準字、輔助圖形、配色系統，交付 AI/EPS 原始檔及使用規範 PDF。' },
    { id: 'JOS-002', title: '社群 DM 系列 ×6',     status: 'QUEUED',      type: 'PRINT', eta: '4d', priority: 'MED',  description: '針對 IG 9:16 與 FB 1:1 比例設計六款主題貼文，含動態版。' },
    { id: 'JOS-003', title: 'Landing Page UI/UX',  status: 'REVIEW',      type: 'WEB',   eta: '1d', priority: 'HIGH', description: '首頁視覺設計與 Figma prototype，需客戶確認後進入切版階段。' },
    { id: 'JOS-004', title: '名片 + 信封套組印刷稿', status: 'DELIVERED',   type: 'PRINT', eta: '—',  priority: 'LOW',  description: '已完成 CMYK 印刷稿，交付印刷廠確認稿與客戶電子稿備份。' },
    { id: 'JOS-005', title: 'PWA 前端架構規劃',     status: 'QUEUED',      type: 'DEV',   eta: '7d', priority: 'MED',  description: '規劃 Next.js App Router 架構、Supabase 認證流程與 offline cache 策略。' },
    { id: 'JOS-006', title: 'Supabase DB Schema',  status: 'QUEUED',      type: 'DEV',   eta: '5d', priority: 'HIGH', description: '設計 profiles/contracts/tasks/files 資料表及 RLS 政策。' },
];

const MOCK_FILES: FileItem[] = [
    { id: 'f001', file_name: 'brand-logo-v3.ai',       file_url: '#', size: 4200000,  storage_path: 'clients/jos/brand-logo-v3.ai',       created_at: '2026-07-01' },
    { id: 'f002', file_name: 'landing-page-figma.pdf', file_url: '#', size: 8500000,  storage_path: 'clients/jos/landing-page-figma.pdf', created_at: '2026-07-02' },
    { id: 'f003', file_name: 'dm-series-final.zip',    file_url: '#', size: 22000000, storage_path: 'clients/jos/dm-series-final.zip',    created_at: '2026-07-03' },
];

const NAV: { key: NavItem; icon: React.ReactNode; label: string }[] = [
    { key: 'tasks',    icon: <LayoutList size={16} />,  label: 'My Tasks' },
    { key: 'files',    icon: <FileIcon size={16} />,    label: 'Files' },
    { key: 'contract', icon: <ContractIcon size={16} />, label: 'Contract' },
    { key: 'settings', icon: <SettingsIcon size={16} />, label: 'Settings' },
];

function fmt(bytes: number) {
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
    return `${bytes} B`;
}

// ── AI overlay panel state ──────────────────────────────────
interface AiPanel {
    task: Task;
    state: 'generating' | 'done' | 'error';
    summary: string;
    emailSent: boolean;
}

export default function DashboardPanel({ onClose }: DashboardPanelProps) {
    const { profile, selectedPlan, reset } = useUserFlow();
    const [activeNav, setActiveNav]         = useState<NavItem>('tasks');
    const [hoveredNav, setHoveredNav]       = useState<NavItem | null>(null);
    const [selectedTask, setSelectedTask]   = useState<Task | null>(null);
    const [tasks, setTasks]                 = useState<Task[]>([]);
    const [files, setFiles]                 = useState<FileItem[]>([]);
    const [loading, setLoading]             = useState(true);
    const [aiPanel, setAiPanel]             = useState<AiPanel | null>(null);
    const [showAskAI, setShowAskAI]         = useState(false);
    const [showNewProject, setShowNewProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [fileSearch, setFileSearch]       = useState('');
    const [driveLoading, setDriveLoading]   = useState<string | null>(null);
    const [settingsTab, setSettingsTab]     = useState<SettingsTab>('account');
    const [settingsForm, setSettingsForm]   = useState({
        displayName: profile?.name ?? '',
        notifyEmail: profile?.email ?? '',
        lineId: '',
        telegramWebhook: '',
    });

    // ── Supabase: fetch tasks ──────────────────────────────────
    useEffect(() => {
        async function fetchTasks() {
            setLoading(true);
            const { data, error } = await supabase
                .from('tasks')
                .select('id,task_code,title,priority,type,status,eta,description,ai_summary')
                .order('created_at', { ascending: false });
            if (!error && data) {
                setTasks(data.map(r => ({
                    id:          r.task_code ?? r.id,
                    title:       r.title,
                    status:      r.status as TaskStatus,
                    type:        r.type ?? '—',
                    eta:         r.eta  ?? '—',
                    priority:    r.priority as 'HIGH'|'MED'|'LOW',
                    description: r.description ?? undefined,
                    ai_summary:  r.ai_summary  ?? undefined,
                })));
            }
            setLoading(false);
        }
        fetchTasks();
    }, []);

    // ── Supabase: fetch files ──────────────────────────────────
    useEffect(() => {
        async function fetchFiles() {
            const { data, error } = await supabase
                .from('files')
                .select('id,file_name,file_url,size,storage_path,google_drive_id,created_at')
                .order('created_at', { ascending: false });
            if (!error && data) {
                setFiles(data.map(r => ({
                    id:              r.id,
                    file_name:       r.file_name,
                    file_url:        r.file_url  ?? '#',
                    size:            r.size       ?? 0,
                    storage_path:    r.storage_path ?? '',
                    google_drive_id: r.google_drive_id ?? undefined,
                    created_at:      r.created_at?.slice(0, 10) ?? '',
                })));
            }
        }
        fetchFiles();
    }, []);

    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS');
    const queued     = tasks.filter(t => t.status === 'QUEUED');
    const review     = tasks.filter(t => t.status === 'REVIEW');
    const delivered  = tasks.filter(t => t.status === 'DELIVERED');

    const handleSignOut = () => { reset(); onClose(); };

    const handleAiSummary = useCallback(async (task: Task) => {
        // 開啟 overlay，狀態設為 generating
        setAiPanel({ task, state: 'generating', summary: '', emailSent: false });
        try {
            const res = await fetch('/api/ai-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId:      task.id,
                    title:       task.title,
                    status:      task.status,
                    description: task.description ?? '',
                    history:     '',
                }),
            });
            const data = await res.json();
            if (data.summary) {
                // 更新 tasks list
                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ai_summary: data.summary } : t));
                setSelectedTask(prev => prev?.id === task.id ? { ...prev, ai_summary: data.summary } : prev);
                // 更新 overlay 為 done
                setAiPanel(p => p ? { ...p, state: 'done', summary: data.summary } : null);
                // fire email
                const mailRes = await fetch('/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        taskId:      task.id,
                        title:       task.title,
                        status:      task.status,
                        summary:     data.summary,
                        clientEmail: profile?.email ?? '',
                    }),
                });
                const mailData = await mailRes.json();
                setAiPanel(p => p ? { ...p, emailSent: mailData.sent === true } : null);
            } else {
                const msg = data.details ? `${data.error}\n\n${data.details}` : (data.error ?? '無法生成摘要');
                setAiPanel(p => p ? { ...p, state: 'error', summary: msg } : null);
            }
        } catch (e: any) {
            setAiPanel(p => p ? { ...p, state: 'error', summary: e.message } : null);
        }
    }, [profile]);

    const handleDriveTransfer = useCallback(async (file: FileItem) => {
        setDriveLoading(file.id);
        try {
            const res = await fetch('/api/drive-transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileUrl: file.file_url, fileName: file.file_name }),
            });
            const data = await res.json();
            if (data.webViewLink) window.open(data.webViewLink, '_blank');
        } finally {
            setDriveLoading(null);
        }
    }, []);

    const filteredFiles = files.filter(f =>
        f.file_name.toLowerCase().includes(fileSearch.toLowerCase())
    );

    const handleCreateProject = useCallback(async () => {
        if (!newProjectName.trim() || !profile?.id) return;
        const { data, error } = await supabase
            .from('projects')
            .insert({ user_id: profile.id, name: newProjectName.trim(), status: 'ACTIVE' })
            .select()
            .single();
        if (error) {
            alert(`建立失敗：${error.message}`);
            return;
        }
        alert(`✅ 專案已建立：${data.name}`);
        setNewProjectName('');
        setShowNewProject(false);
    }, [newProjectName, profile]);

    return (
        <div className="flex h-full w-full bg-[#000000] font-mono overflow-hidden relative">

            {/* ── AI Overlay Panel ─────────────────────────────────── */}
            {aiPanel && (
                <div className="absolute inset-0 z-50 flex items-end justify-center pb-8 px-8 pointer-events-none">
                    {/* backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                        onClick={() => aiPanel.state !== 'generating' && setAiPanel(null)}
                    />
                    {/* panel */}
                    <div className="relative pointer-events-auto w-full max-w-2xl bg-[#0A0A0B] border border-zinc-800 rounded-xl shadow-2xl shadow-black overflow-hidden"
                        style={{ animation: 'slideUp 0.22s cubic-bezier(0.16,1,0.3,1)' }}>
                        {/* header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-900">
                            <div className="flex items-center gap-2.5">
                                <span className="text-[10px] text-[#FF5500] tracking-widest">⚡ AI EXECUTIVE SUMMARY</span>
                                <span className="text-zinc-800">·</span>
                                <span className="text-[10px] text-zinc-600 truncate max-w-[240px]">{aiPanel.task.id} — {aiPanel.task.title}</span>
                            </div>
                            {aiPanel.state !== 'generating' && (
                                <button onClick={() => setAiPanel(null)} className="text-zinc-600 hover:text-zinc-300 transition-colors text-[11px]">✕</button>
                            )}
                        </div>
                        {/* body */}
                        <div className="px-5 py-5 space-y-4">
                            {aiPanel.state === 'generating' && (
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                        <span className="inline-block w-3 h-3 rounded-full border-2 border-[#FF5500] border-t-transparent animate-spin" />
                                        Calling Gemini 1.5 Flash…
                                    </div>
                                    <div className="h-2.5 bg-zinc-900 rounded animate-pulse w-3/4" />
                                    <div className="h-2.5 bg-zinc-900 rounded animate-pulse w-full" />
                                    <div className="h-2.5 bg-zinc-900 rounded animate-pulse w-2/3" />
                                </div>
                            )}
                            {aiPanel.state === 'done' && (
                                <>
                                    <p className="text-[13px] text-zinc-200 leading-[1.8] border-l-2 border-[#FF5500] pl-4">
                                        {aiPanel.summary}
                                    </p>
                                    <div className="flex items-center gap-2 pt-1">
                                        {aiPanel.emailSent ? (
                                            <span className="text-[10px] text-emerald-500 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Email notification sent
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-zinc-600">// Email not sent (RESEND_API_KEY not set)</span>
                                        )}
                                        <div className="flex-1" />
                                        <button onClick={() => setAiPanel(null)}
                                            className="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-4 py-1.5 rounded transition-colors">
                                            Close
                                        </button>
                                    </div>
                                </>
                            )}
                            {aiPanel.state === 'error' && (
                                <div className="space-y-3">
                                    <pre className="text-[11px] text-red-400 whitespace-pre-wrap break-all font-mono bg-zinc-950 rounded p-3 border border-zinc-900">{aiPanel.summary}</pre>
                                    <button onClick={() => setAiPanel(null)}
                                        className="text-[10px] border border-zinc-800 text-zinc-400 px-4 py-1.5 rounded hover:border-zinc-600 transition-colors">
                                        Dismiss
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Sidebar ─────────────────────────────────────────────── */}
            <aside className="w-56 shrink-0 border-r border-zinc-900 flex flex-col bg-[#000000]">
                <div className="px-4 py-4 border-b border-zinc-900">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-[#FF5500] rounded flex items-center justify-center">
                            <span className="text-[8px] font-black text-black">J</span>
                        </div>
                        <div>
                            <div className="text-[11px] font-bold text-white tracking-wide">JAGGER OS</div>
                            <div className="text-[9px] text-zinc-600">{profile?.company || profile?.name || 'JAGGER OS'}</div>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 px-2 py-3 space-y-0.5">
                    {NAV.map(item => {
                        const isHovered = hoveredNav === item.key;
                        const iconWithAnimate = React.cloneElement(item.icon as React.ReactElement<any>, {
                            animate: isHovered ? 'hover' : 'idle',
                        });
                        return (
                            <button
                                key={item.key}
                                onClick={() => setActiveNav(item.key)}
                                onMouseEnter={() => setHoveredNav(item.key)}
                                onMouseLeave={() => setHoveredNav(null)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] transition-colors text-left ${activeNav === item.key ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}`}
                            >
                                <span className="shrink-0">{iconWithAnimate}</span>{item.label}
                            </button>
                        );
                    })}
                </nav>
                <div className="px-3 py-3 border-t border-zinc-900">
                    <div className="bg-zinc-900/80 rounded-lg px-3 py-2 mb-3">
                        <div className="text-[9px] text-zinc-600 mb-0.5">ACTIVE PLAN</div>
                        <div className="text-[11px] text-[#FF5500] font-bold">{selectedPlan}</div>
                        <div className="flex items-center gap-1 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] text-emerald-500">Active</span>
                        </div>
                    </div>
                    <button onClick={handleSignOut} className="w-full text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors py-1.5 border border-zinc-900 rounded hover:border-zinc-700">
                        Sign out
                    </button>
                </div>
            </aside>

            {/* ── Main ────────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="h-12 border-b border-zinc-900 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] text-zinc-600">JAGGER OS</span>
                        <span className="text-zinc-800">›</span>
                        <span className="text-[11px] text-zinc-300 capitalize">{activeNav}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowAskAI(true)}
                            className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-white border border-zinc-800 hover:border-[#FF5500]/60 px-2.5 py-1 rounded transition-colors"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse" />
                            Jag Agent
                        </button>
                        <button
                            onClick={() => setShowNewProject(true)}
                            className="text-[10px] text-black bg-[#FF5500] hover:bg-white px-2.5 py-1 rounded font-bold tracking-wider transition-colors"
                        >
                            + New Project
                        </button>
                        <span className="text-[10px] text-zinc-600 border border-zinc-900 px-2.5 py-1 rounded">{profile?.name ?? 'Client'}</span>
                        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">

                    {/* ── TASKS ─────────────────────────────────────────── */}
                    {activeNav === 'tasks' && (
                        <div className="flex h-full">
                            <div className={`flex flex-col border-r border-zinc-900 overflow-y-auto transition-all ${selectedTask ? 'w-1/2' : 'w-full'}`}>
                                <div className="grid grid-cols-4 border-b border-zinc-900 shrink-0">
                                    {[
                                        { label: 'In Progress', count: inProgress.length, accent: true },
                                        { label: 'In Review',   count: review.length,     accent: false },
                                        { label: 'Queued',      count: queued.length,     accent: false },
                                        { label: 'Delivered',   count: delivered.length,  accent: false },
                                    ].map(s => (
                                        <div key={s.label} className="px-6 py-4 border-r border-zinc-900 last:border-r-0">
                                            <div className={`text-2xl font-black ${s.accent ? 'text-[#FF5500]' : 'text-white'}`}>{s.count}</div>
                                            <div className="text-[10px] text-zinc-600 mt-0.5">{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-12 gap-4 px-6 py-2 border-b border-zinc-900 text-[10px] text-zinc-600 shrink-0">
                                    <div className="col-span-1">PRI</div>
                                    <div className="col-span-5">Title</div>
                                    <div className="col-span-2">Type</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-2">ETA</div>
                                </div>
                                <div className="divide-y divide-zinc-900/60">
                                    {loading && (
                                        <div className="px-6 py-12 text-center text-zinc-600 text-[11px] font-mono">載入中…</div>
                                    )}
                                    {!loading && tasks.length === 0 && (
                                        <div className="px-6 py-12 text-center">
                                            <div className="text-zinc-600 text-[11px] font-mono mb-2">目前沒有任務</div>
                                            <div className="text-zinc-700 text-[10px] font-mono">專案建立後，任務會顯示在這裡</div>
                                        </div>
                                    )}
                                    {tasks.map(task => {
                                        const s = STATUS_CONFIG[task.status];
                                        const p = PRIORITY_CONFIG[task.priority];
                                        const isSelected = selectedTask?.id === task.id;
                                        return (
                                            <div key={task.id} onClick={() => setSelectedTask(isSelected ? null : task)}
                                                className={`grid grid-cols-12 gap-4 px-6 py-3.5 cursor-pointer transition-colors ${isSelected ? 'bg-zinc-900' : 'hover:bg-zinc-900/40'}`}>
                                                <div className={`col-span-1 text-[13px] font-bold ${p.color}`}>{p.icon}</div>
                                                <div className="col-span-5">
                                                    <div className="text-[12px] text-zinc-200 truncate">{task.title}</div>
                                                    <div className="text-[10px] text-zinc-700 mt-0.5">{task.id}</div>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-[10px] text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded">{task.type}</span>
                                                </div>
                                                <div className="col-span-2 flex items-center gap-1.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                                                    <span className={`text-[10px] ${s.color}`}>{s.label}</span>
                                                </div>
                                                <div className={`col-span-2 text-[10px] ${task.eta === '—' ? 'text-zinc-700' : 'text-zinc-400'}`}>{task.eta}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Task detail */}
                            {selectedTask && (() => {
                                const s = STATUS_CONFIG[selectedTask.status];
                                const p = PRIORITY_CONFIG[selectedTask.priority];
                                return (
                                    <div className="w-1/2 flex flex-col overflow-y-auto">
                                        <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
                                            <span className="text-[10px] text-zinc-600">{selectedTask.id}</span>
                                            <button onClick={() => setSelectedTask(null)} className="text-zinc-700 hover:text-zinc-400 text-[11px]">✕</button>
                                        </div>
                                        <div className="px-6 py-5 flex flex-col gap-5">
                                            <h2 className="text-base font-bold text-white leading-snug">{selectedTask.title}</h2>
                                            <div className="grid grid-cols-2 gap-4">
                                                {[
                                                    { label: 'Status',   value: <span className={`text-[11px] ${s.color} flex items-center gap-1.5`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>{s.label}</span> },
                                                    { label: 'Priority', value: <span className={`text-[11px] ${p.color}`}>{p.icon} {p.label}</span> },
                                                    { label: 'Type',     value: <span className="text-[11px] text-zinc-400 border border-zinc-800 px-1.5 py-0.5 rounded">{selectedTask.type}</span> },
                                                    { label: 'ETA',      value: <span className="text-[11px] text-zinc-400">{selectedTask.eta}</span> },
                                                ].map(({ label, value }) => (
                                                    <div key={label} className="border border-zinc-900 rounded-lg p-3">
                                                        <div className="text-[9px] text-zinc-600 mb-1.5">{label.toUpperCase()}</div>
                                                        {value}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="border border-zinc-900 rounded-lg p-4">
                                                <div className="text-[9px] text-zinc-600 mb-2">DESCRIPTION</div>
                                                <p className="text-[12px] text-zinc-400 leading-relaxed">{selectedTask.description ?? '—'}</p>
                                            </div>

                                            {/* AI Summary */}
                                            <div className="border border-zinc-900 rounded-lg p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-[9px] text-zinc-600">// AI EXECUTIVE SUMMARY</div>
                                                    <button
                                                        onClick={() => handleAiSummary(selectedTask)}
                                                        disabled={aiPanel?.state === 'generating'}
                                                        className={`text-[10px] font-mono px-3 py-1.5 rounded border transition-all ${
                                                            aiPanel?.state === 'generating'
                                                                ? 'text-zinc-600 border-zinc-800 cursor-not-allowed'
                                                                : 'text-[#FF5500] border-[#FF5500]/40 hover:bg-[#FF5500]/10 cursor-pointer'
                                                        }`}
                                                    >
                                                        ⚡ /ai Generate
                                                    </button>
                                                </div>
                                                {selectedTask.ai_summary ? (
                                                    <p className="text-[12px] text-zinc-300 leading-relaxed border-l-2 border-[#FF5500] pl-3">{selectedTask.ai_summary}</p>
                                                ) : (
                                                    <p className="text-[11px] text-zinc-700 italic">Press ⚡ /ai Generate to create a summary and notify the client.</p>
                                                )}
                                            </div>

                                            <div className="border border-zinc-900 rounded-lg p-4">
                                                <div className="text-[9px] text-zinc-600 mb-3">ACTIVITY</div>
                                                <div className="text-[10px] text-zinc-700 italic">No activity yet.</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* ── FILES ─────────────────────────────────────────── */}
                    {activeNav === 'files' && (
                        <div className="flex flex-col h-full overflow-y-auto">
                            <div className="px-6 py-4 border-b border-zinc-900 flex items-center gap-3 shrink-0">
                                <span className="text-[10px] text-zinc-600 tracking-widest">// FILES</span>
                                <div className="flex-1" />
                                <input
                                    type="text"
                                    value={fileSearch}
                                    onChange={e => setFileSearch(e.target.value)}
                                    placeholder="Search files…"
                                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-[12px] text-zinc-300 font-mono placeholder-zinc-700 focus:outline-none focus:border-zinc-600 w-56"
                                />
                            </div>
                            <div className="divide-y divide-zinc-900/60">
                                {/* Column header */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-2 text-[10px] text-zinc-600">
                                    <div className="col-span-5">File Name</div>
                                    <div className="col-span-2">Size</div>
                                    <div className="col-span-3">Uploaded</div>
                                    <div className="col-span-2">Actions</div>
                                </div>
                                {filteredFiles.length === 0 && (
                                    <div className="px-6 py-12 text-center text-[11px] text-zinc-700">No files found.</div>
                                )}
                                {filteredFiles.map(file => (
                                    <div key={file.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-900/30 transition-colors">
                                        <div className="col-span-5">
                                            <div className="text-[12px] text-zinc-300 truncate">{file.file_name}</div>
                                            <div className="text-[10px] text-zinc-700 mt-0.5 truncate">{file.storage_path}</div>
                                        </div>
                                        <div className="col-span-2 text-[11px] text-zinc-500">{fmt(file.size)}</div>
                                        <div className="col-span-3 text-[11px] text-zinc-500">{file.created_at}</div>
                                        <div className="col-span-2 flex items-center gap-2">
                                            <a href={file.file_url} download className="text-[10px] text-zinc-500 hover:text-zinc-300 border border-zinc-900 px-2 py-1 rounded hover:border-zinc-700 transition-colors">↓</a>
                                            <button
                                                onClick={() => handleDriveTransfer(file)}
                                                disabled={driveLoading === file.id}
                                                className={`text-[10px] border px-2 py-1 rounded transition-colors ${driveLoading === file.id ? 'text-zinc-700 border-zinc-900 cursor-not-allowed' : 'text-[#FF5500] border-[#FF5500]/30 hover:bg-[#FF5500]/10 cursor-pointer'}`}
                                                title="Transfer to Google Drive"
                                            >
                                                {driveLoading === file.id ? '…' : '▲'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── CONTRACT (placeholder) ─────────────────────────── */}
                    {activeNav === 'contract' && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center space-y-2">
                                <div className="text-3xl text-zinc-800">✦</div>
                                <div className="text-[11px] text-zinc-700">// Signed contract · Supabase hook pending</div>
                            </div>
                        </div>
                    )}

                    {/* ── SETTINGS ──────────────────────────────────────── */}
                    {activeNav === 'settings' && (
                        <div className="flex h-full overflow-hidden">
                            {/* Settings sub-nav */}
                            <div className="w-44 border-r border-zinc-900 flex flex-col pt-4 shrink-0">
                                {(['account', 'billing', 'integrations'] as SettingsTab[]).map(tab => (
                                    <button key={tab} onClick={() => setSettingsTab(tab)}
                                        className={`text-left px-4 py-2.5 text-[11px] capitalize transition-colors ${settingsTab === tab ? 'text-white bg-zinc-900' : 'text-zinc-600 hover:text-zinc-400'}`}>
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

                                {/* Account */}
                                {settingsTab === 'account' && (
                                    <>
                                        <div>
                                            <div className="text-[10px] text-zinc-600 tracking-widest mb-4">// ACCOUNT & NOTIFICATIONS</div>
                                            <div className="space-y-4 max-w-sm">
                                                {[
                                                    { key: 'displayName', label: 'DISPLAY NAME', type: 'text', placeholder: profile?.name ?? '' },
                                                    { key: 'notifyEmail', label: 'NOTIFICATION EMAIL', type: 'email', placeholder: profile?.email ?? '' },
                                                ].map(field => (
                                                    <div key={field.key}>
                                                        <label className="text-[10px] text-zinc-600 block mb-1.5">{field.label}</label>
                                                        <input type={field.type}
                                                            value={settingsForm[field.key as keyof typeof settingsForm]}
                                                            onChange={e => setSettingsForm(f => ({ ...f, [field.key]: e.target.value }))}
                                                            placeholder={field.placeholder}
                                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none focus:border-zinc-600"
                                                        />
                                                    </div>
                                                ))}
                                                <button className="text-[11px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-4 py-2 rounded transition-colors">
                                                    SAVE CHANGES
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Billing */}
                                {settingsTab === 'billing' && (
                                    <>
                                        <div className="text-[10px] text-zinc-600 tracking-widest mb-4">// BILLING & MANAGEMENT</div>
                                        <div className="border border-zinc-900 rounded-xl p-5 max-w-sm space-y-4">
                                            <div>
                                                <div className="text-[9px] text-zinc-600 mb-1">CURRENT PLAN</div>
                                                <div className="text-base font-bold text-[#FF5500]">{selectedPlan ?? '—'}</div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-[9px] text-zinc-600 mb-0.5">STATUS</div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-[11px] text-emerald-400">Active</span>
                                                    </div>
                                                </div>
                                                <button className="text-[10px] border border-zinc-800 text-zinc-500 px-3 py-1.5 rounded hover:border-red-900 hover:text-red-400 transition-colors">
                                                    Cancel Plan
                                                </button>
                                            </div>
                                            <div className="pt-3 border-t border-zinc-900 text-[10px] text-zinc-700">
                                                // Stripe integration pending · Transaction history will appear here
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Integrations */}
                                {settingsTab === 'integrations' && (
                                    <>
                                        <div className="text-[10px] text-zinc-600 tracking-widest mb-4">// INTEGRATIONS</div>
                                        <div className="space-y-4 max-w-sm">
                                            {[
                                                { key: 'lineId',          label: 'LINE USER ID',        placeholder: 'Uxxxxxxxxxxxxxxxx' },
                                                { key: 'telegramWebhook', label: 'TELEGRAM WEBHOOK URL', placeholder: 'https://api.telegram.org/bot…' },
                                            ].map(field => (
                                                <div key={field.key}>
                                                    <label className="text-[10px] text-zinc-600 block mb-1.5">{field.label}</label>
                                                    <input type="text"
                                                        value={settingsForm[field.key as keyof typeof settingsForm]}
                                                        onChange={e => setSettingsForm(f => ({ ...f, [field.key]: e.target.value }))}
                                                        placeholder={field.placeholder}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none focus:border-zinc-600"
                                                    />
                                                </div>
                                            ))}
                                            <button className="text-[11px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-4 py-2 rounded transition-colors">
                                                SAVE TOKENS
                                            </button>
                                            <p className="text-[10px] text-zinc-700">// Tokens stored locally until Supabase profiles hook is connected</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </main>

            {showAskAI && (
                <AskAIDialog
                    onClose={() => setShowAskAI(false)}
                    context={profile ? `客戶：${profile.name}，方案：${selectedPlan}，目前任務數：${tasks.length}` : undefined}
                />
            )}

            {showNewProject && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNewProject(false)}>
                    <div className="bg-[#0A0A0B] border border-zinc-800 rounded-xl w-full max-w-sm p-6 space-y-5" onClick={e => e.stopPropagation()}>
                        <div>
                            <div className="text-[10px] text-zinc-600 tracking-widest mb-1">// NEW PROJECT</div>
                            <h3 className="text-base font-bold text-white">建立新專案</h3>
                        </div>
                        <div>
                            <label className="text-[10px] text-zinc-600 block mb-1.5">PROJECT NAME</label>
                            <input
                                type="text"
                                value={newProjectName}
                                onChange={e => setNewProjectName(e.target.value)}
                                placeholder="e.g. 品牌重塑專案"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none focus:border-[#FF5500]/60"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowNewProject(false)}
                                className="flex-1 py-2.5 text-[11px] text-zinc-500 border border-zinc-800 rounded-lg hover:border-zinc-600 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleCreateProject}
                                disabled={!newProjectName.trim()}
                                className="flex-1 py-2.5 text-[11px] font-bold bg-[#FF5500] text-black rounded-lg hover:bg-white transition-colors disabled:opacity-40"
                            >
                                建立 →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
