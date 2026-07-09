'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import XIcon from '../icons/XIcon';
import UsersGroupIcon from '../icons/UsersGroupIcon';
import Stack3Icon from '../icons/Stack3Icon';
import FileDescriptionIcon from '../icons/FileDescriptionIcon';
import GearIcon from '../icons/GearIcon';
import { ContractIcon } from '../icons/ContractIcon';
import AdminContractPanel from './AdminContractPanel';
import type { AnimatedIconHandle } from '../icons/types';

interface AdminDashboardProps {
    onClose: () => void;
}

type AdminNav = 'clients' | 'contracts' | 'tasks' | 'files' | 'settings';

interface ClientRow {
    id: string;
    name: string;
    email: string;
    company: string;
    plan_type: string;
    status: string;
    role: string;
    created_at: string;
}

interface TaskRow {
    id: string;
    title: string;
    status: string;
    type: string;
    priority: string;
    eta: string;
    user_id: string;
    client_name?: string;
}

const NAV_ITEMS: { key: AdminNav; label: string }[] = [
    { key: 'clients',   label: 'Clients' },
    { key: 'contracts', label: 'Contracts' },
    { key: 'tasks',     label: 'Tasks' },
    { key: 'files',     label: 'Files' },
    { key: 'settings',  label: 'Settings' },
];

const STATUS_COLOR: Record<string, string> = {
    QUEUED:      'text-zinc-500 border-zinc-800',
    IN_PROGRESS: 'text-blue-400 border-blue-900',
    REVIEW:      'text-yellow-400 border-yellow-900',
    DELIVERED:   'text-emerald-400 border-emerald-900',
    REGISTERED:  'text-orange-400 border-orange-900',
    ACTIVE:      'text-emerald-400 border-emerald-900',
};

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
    const [activeNav, setActiveNav] = useState<AdminNav>('clients');
    const [clients, setClients] = useState<ClientRow[]>([]);
    const [tasks, setTasks] = useState<TaskRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [activityDraft, setActivityDraft] = useState('');
    const [activityLoading, setActivityLoading] = useState(false);
    const closeIconRef = useRef<AnimatedIconHandle>(null);
    const iconRefs = useRef<(AnimatedIconHandle | null)[]>([]);

    const fetchClients = useCallback(async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        setClients(data ?? []);
    }, []);

    const fetchTasks = useCallback(async () => {
        const { data } = await supabase
            .from('tasks')
            .select('*, profiles(name)')
            .order('created_at', { ascending: false });
        setTasks((data ?? []).map((t: any) => ({ ...t, client_name: t.profiles?.name ?? '—' })));
    }, []);

    const updateTaskStatus = useCallback(async (taskId: string, newStatus: string) => {
        const { error } = await supabase
            .from('tasks')
            .update({ status: newStatus })
            .eq('id', taskId);
        if (error) {
            console.error('[admin] update task status error:', error);
            alert(`更新失敗：${error.message}`);
        } else {
            fetchTasks();
        }
    }, [fetchTasks]);

    const submitTaskActivity = useCallback(async (taskId: string) => {
        if (!activityDraft.trim()) return;
        setActivityLoading(true);
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) {
            setActivityLoading(false);
            alert('請先登入');
            return;
        }
        const { error } = await supabase
            .from('task_activities')
            .insert({ task_id: taskId, user_id: userId, content: activityDraft.trim() });
        setActivityLoading(false);
        if (error) {
            console.error('[admin] submit activity error:', error);
            alert(`Activity 更新失敗：${error.message}`);
        } else {
            setActivityDraft('');
            setSelectedTaskId(null);
        }
    }, [activityDraft]);

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchClients(), fetchTasks()]).finally(() => setLoading(false));
    }, [fetchClients, fetchTasks]);

    // ── Supabase Realtime: 監聽所有任務變更 ─────────────────────
    useEffect(() => {
        const channel = supabase
            .channel('admin-tasks')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks' },
                () => { fetchTasks(); }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchTasks]);

    return (
        <div className="flex h-full w-full bg-[#000000] font-mono overflow-hidden">

            {/* Sidebar */}
            <aside className="w-52 shrink-0 border-r border-zinc-900 flex flex-col bg-[#000000]">
                <div className="px-4 py-4 border-b border-zinc-900">
                    <div className="text-xs text-[#FF5500] tracking-widest mb-0.5">ADMIN CONSOLE</div>
                    <div className="text-sm font-bold text-white tracking-wide">JAGGER OS</div>
                </div>
                <nav className="flex-1 px-2 py-3 space-y-0.5">
                    {NAV_ITEMS.map((item, i) => (
                        <button
                            key={item.key}
                            onClick={() => setActiveNav(item.key)}
                            onMouseEnter={() => { iconRefs.current[i]?.startAnimation(); }}
                            onMouseLeave={() => { iconRefs.current[i]?.stopAnimation(); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left ${activeNav === item.key ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}`}
                        >
                            <span className="shrink-0 pointer-events-none">
                                {item.key === 'clients'   && <UsersGroupIcon      ref={el => { iconRefs.current[i] = el; }} size={16} />}
                                {item.key === 'contracts' && <ContractIcon size={16} animate={activeNav === 'contracts' ? 'hover' : 'idle'} />}
                                {item.key === 'tasks'     && <Stack3Icon          ref={el => { iconRefs.current[i] = el; }} size={16} />}
                                {item.key === 'files'     && <FileDescriptionIcon ref={el => { iconRefs.current[i] = el; }} size={16} />}
                                {item.key === 'settings'  && <GearIcon            ref={el => { iconRefs.current[i] = el; }} size={16} />}
                            </span>
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="px-3 py-3 border-t border-zinc-900">
                    <div className="text-xs text-red-500/60 tracking-widest">ADMIN ACCESS</div>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Topbar */}
                <div className="h-12 border-b border-zinc-900 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-600">ADMIN</span>
                        <span className="text-zinc-800">›</span>
                        <span className="text-sm text-zinc-300 uppercase">{activeNav}</span>
                        {activeNav === 'clients' && (
                            <span className="text-xs text-zinc-600 border border-zinc-900 px-1.5 py-0.5 rounded">
                                {clients.length} users
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        onMouseEnter={() => closeIconRef.current?.startAnimation()}
                        onMouseLeave={() => closeIconRef.current?.stopAnimation()}
                        title="最小化"
                        className="text-zinc-600 hover:text-zinc-300 transition-colors px-1"
                    >
                        <span className="pointer-events-none">
                            <XIcon ref={closeIconRef} size={14} strokeWidth={2} color="currentColor" />
                        </span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-zinc-600 text-sm tracking-widest">
                            // LOADING…
                        </div>
                    ) : (
                        <>
                            {/* CLIENTS */}
                            {activeNav === 'clients' && (
                                <div className="flex h-full">
                                    <div className={`flex flex-col border-r border-zinc-900 overflow-y-auto transition-all ${selectedClient ? 'w-1/2' : 'w-full'}`}>
                                        <div className="grid grid-cols-5 border-b border-zinc-900 px-4 py-2 text-xs text-zinc-600 tracking-widest shrink-0">
                                            <span>NAME</span>
                                            <span>EMAIL</span>
                                            <span>PLAN</span>
                                            <span>STATUS</span>
                                            <span>ROLE</span>
                                        </div>
                                        {clients.length === 0 ? (
                                            <div className="flex items-center justify-center flex-1 text-zinc-700 text-sm">// NO CLIENTS YET</div>
                                        ) : clients.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => setSelectedClient(prev => prev?.id === c.id ? null : c)}
                                                className={`grid grid-cols-5 px-4 py-3 border-b border-zinc-900/50 text-left transition-colors text-sm ${selectedClient?.id === c.id ? 'bg-zinc-900' : 'hover:bg-zinc-900/40'}`}
                                            >
                                                <span className="text-zinc-300 truncate">{c.name || '—'}</span>
                                                <span className="text-zinc-500 truncate">{c.email}</span>
                                                <span className="text-zinc-500 truncate">{c.plan_type || '—'}</span>
                                                <span className={`inline-flex items-center text-xs border rounded px-1.5 py-0.5 w-fit tracking-widest ${STATUS_COLOR[c.status] ?? 'text-zinc-600 border-zinc-800'}`}>
                                                    {c.status}
                                                </span>
                                                <span className={`text-xs tracking-widest ${c.role === 'admin' ? 'text-[#FF5500]' : 'text-zinc-600'}`}>
                                                    {c.role?.toUpperCase() ?? 'CLIENT'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    {selectedClient && (
                                        <div className="w-1/2 flex flex-col overflow-y-auto px-6 py-5 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-zinc-600 tracking-widest">// CLIENT DETAIL</span>
                                                <button onClick={() => setSelectedClient(null)} className="text-zinc-700 hover:text-zinc-400 text-xs">✕</button>
                                            </div>
                                            <div className="space-y-3">
                                                {[
                                                    { label: 'NAME',   value: selectedClient.name },
                                                    { label: 'EMAIL',  value: selectedClient.email },
                                                    { label: 'COMPANY',value: selectedClient.company },
                                                    { label: 'PLAN',   value: selectedClient.plan_type },
                                                    { label: 'STATUS', value: selectedClient.status },
                                                    { label: 'ROLE',   value: selectedClient.role?.toUpperCase() },
                                                    { label: 'JOINED', value: new Date(selectedClient.created_at).toLocaleDateString('zh-TW') },
                                                    { label: 'ID',     value: selectedClient.id },
                                                ].map(({ label, value }) => (
                                                    <div key={label} className="flex gap-4">
                                                        <span className="text-xs text-zinc-600 tracking-widest w-20 shrink-0">{label}</span>
                                                        <span className="text-sm text-zinc-300 break-all">{value || '—'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CONTRACTS */}
                            {activeNav === 'contracts' && (
                                <AdminContractPanel />
                            )}

                            {/* TASKS */}
                            {activeNav === 'tasks' && (() => {
                                const statusList = ['QUEUED','IN_PROGRESS','REVIEW','DELIVERED'] as const;
                                const statusLabel: Record<string,string> = { QUEUED:'Queued', IN_PROGRESS:'In Progress', REVIEW:'Review', DELIVERED:'Delivered' };
                                const statusClr: Record<string,string>   = { QUEUED:'#52525b', IN_PROGRESS:'#60a5fa', REVIEW:'#facc15', DELIVERED:'#34d399' };
                                const counts = statusList.map(s => tasks.filter(t => t.status === s).length);
                                const total  = tasks.length || 1;
                                const R = 36, C = 2 * Math.PI * R;
                                let offset = 0;
                                const slices = statusList.map((s, i) => {
                                    const dash  = (counts[i] / total) * C;
                                    const slice = { s, dash, gap: C - dash, offset, color: statusClr[s] };
                                    offset += dash;
                                    return slice;
                                });
                                const clientMap: Record<string, number> = {};
                                tasks.forEach(t => { clientMap[t.client_name ?? '—'] = (clientMap[t.client_name ?? '—'] ?? 0) + 1; });
                                const maxBar = Math.max(...Object.values(clientMap), 1);
                                return (
                                    <div className="flex flex-col h-full overflow-y-auto">
                                        {/* KPI + Charts */}
                                        <div className="flex gap-4 px-5 py-4 border-b border-zinc-900 shrink-0 flex-wrap">
                                            <div className="flex gap-3 flex-wrap">
                                                {statusList.map((s, i) => (
                                                    <div key={s} className="bg-zinc-950 border border-zinc-900 rounded-lg px-4 py-3 flex flex-col gap-1 min-w-[96px]">
                                                        <span className="text-xs tracking-widest" style={{ color: statusClr[s] }}>{statusLabel[s].toUpperCase()}</span>
                                                        <span className="text-2xl font-black text-white">{counts[i]}</span>
                                                        <span className="text-xs text-zinc-600">{Math.round(counts[i]/total*100)}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Donut */}
                                            <div className="flex items-center gap-4 bg-zinc-950 border border-zinc-900 rounded-lg px-4 py-3">
                                                <svg width="88" height="88" viewBox="0 0 88 88">
                                                    <circle cx="44" cy="44" r={R} fill="none" stroke="#18181b" strokeWidth="12" />
                                                    {slices.map(sl => (
                                                        <circle key={sl.s} cx="44" cy="44" r={R} fill="none"
                                                            stroke={sl.color} strokeWidth="12"
                                                            strokeDasharray={`${sl.dash} ${sl.gap}`}
                                                            strokeDashoffset={-sl.offset + C / 4}
                                                        />
                                                    ))}
                                                    <text x="44" y="48" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="monospace">{tasks.length}</text>
                                                </svg>
                                                <div className="space-y-1.5">
                                                    {statusList.map((s, i) => (
                                                        <div key={s} className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusClr[s] }} />
                                                            <span className="text-xs text-zinc-500 w-20">{statusLabel[s]}</span>
                                                            <span className="text-xs text-zinc-400 font-bold">{counts[i]}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Per-client bar */}
                                            <div className="flex-1 bg-zinc-950 border border-zinc-900 rounded-lg px-4 py-3 min-w-[160px]">
                                                <div className="text-xs text-zinc-600 tracking-widest mb-3">TASKS PER CLIENT</div>
                                                <div className="space-y-2">
                                                    {Object.entries(clientMap).map(([name, cnt]) => (
                                                        <div key={name} className="flex items-center gap-2">
                                                            <span className="text-xs text-zinc-500 w-20 truncate shrink-0">{name}</span>
                                                            <div className="flex-1 bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                                                <div className="h-full rounded-full bg-[#FF5500] transition-all duration-500"
                                                                    style={{ width: `${(cnt / maxBar) * 100}%` }} />
                                                            </div>
                                                            <span className="text-xs text-zinc-400 w-4 text-right">{cnt}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Table */}
                                        <div className="grid grid-cols-6 border-b border-zinc-900 px-4 py-2 text-xs text-zinc-600 tracking-widest shrink-0">
                                            <span>ID</span>
                                            <span className="col-span-2">TITLE</span>
                                            <span>STATUS</span>
                                            <span>CLIENT</span>
                                            <span>PROGRESS</span>
                                        </div>
                                        {tasks.length === 0 ? (
                                            <div className="flex items-center justify-center flex-1 text-zinc-700 text-sm">// NO TASKS YET</div>
                                        ) : tasks.map(t => {
                                            const pct    = ({ QUEUED: 0, IN_PROGRESS: 40, REVIEW: 75, DELIVERED: 100 } as Record<string,number>)[t.status] ?? 0;
                                            const barClr = ({ QUEUED: '#52525b', IN_PROGRESS: '#60a5fa', REVIEW: '#facc15', DELIVERED: '#34d399' } as Record<string,string>)[t.status] ?? '#52525b';
                                            const isExpanded = selectedTaskId === t.id;
                                            return (
                                                <div key={t.id} className="border-b border-zinc-900/50">
                                                    <div className="grid grid-cols-6 px-4 py-3 text-sm items-center">
                                                        <span className="text-zinc-600 font-mono text-xs">{t.id.slice(0, 8)}</span>
                                                        <span className="col-span-2 text-zinc-300 truncate">{t.title}</span>
                                                        <select
                                                            value={t.status}
                                                            onChange={e => updateTaskStatus(t.id, e.target.value)}
                                                            className={`bg-zinc-950 text-xs border rounded px-1.5 py-0.5 w-fit tracking-widest outline-none cursor-pointer ${STATUS_COLOR[t.status] ?? 'text-zinc-600 border-zinc-800'}`}
                                                        >
                                                            {['QUEUED', 'IN_PROGRESS', 'REVIEW', 'DELIVERED'].map(s => (
                                                                <option key={s} value={s}>{s}</option>
                                                            ))}
                                                        </select>
                                                        <span className="text-zinc-500 truncate">{t.client_name}</span>
                                                        <div className="flex items-center gap-2 pr-2">
                                                            <div className="flex-1 bg-zinc-900 rounded-full h-1 overflow-hidden">
                                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barClr }} />
                                                            </div>
                                                            <span className="text-xs text-zinc-600 w-7 text-right shrink-0">{pct}%</span>
                                                            <button
                                                                onClick={() => setSelectedTaskId(isExpanded ? null : t.id)}
                                                                className={`text-xs px-2 py-0.5 rounded border transition-colors ${isExpanded ? 'text-[#FF5500] border-[#FF5500]/40 bg-[#FF5500]/10' : 'text-zinc-600 border-zinc-800 hover:border-zinc-600'}`}
                                                            >
                                                                {isExpanded ? 'Close' : 'Update'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {isExpanded && (
                                                        <div className="px-4 pb-3">
                                                            <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-3 space-y-2">
                                                                <div className="text-xs text-zinc-600">// ADD ACTIVITY UPDATE</div>
                                                                <textarea
                                                                    value={activityDraft}
                                                                    onChange={e => setActivityDraft(e.target.value)}
                                                                    placeholder="輸入進度更新，Client 會在 task 面板看到…"
                                                                    rows={3}
                                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#FF5500]/60 resize-none"
                                                                />
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={() => setSelectedTaskId(null)}
                                                                        className="text-xs text-zinc-500 border border-zinc-800 px-3 py-1.5 rounded hover:border-zinc-600"
                                                                    >
                                                                        取消
                                                                    </button>
                                                                    <button
                                                                        onClick={() => submitTaskActivity(t.id)}
                                                                        disabled={activityLoading || !activityDraft.trim()}
                                                                        className="text-xs bg-[#FF5500] text-black hover:bg-white px-3 py-1.5 rounded font-bold transition-colors disabled:opacity-50"
                                                                    >
                                                                        {activityLoading ? '…' : 'Save Update'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}

                            {/* FILES */}
                            {activeNav === 'files' && (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-600">
                                    <span className="text-sm tracking-widest">// FILE UPLOAD COMING SOON</span>
                                    <span className="text-xs">Supabase Storage 整合中</span>
                                </div>
                            )}

                            {/* SETTINGS */}
                            {activeNav === 'settings' && (
                                <div className="flex flex-col px-6 py-6 gap-4 max-w-lg">
                                    <span className="text-xs text-zinc-600 tracking-widest">// SYSTEM SETTINGS</span>
                                    <div className="space-y-3 text-sm text-zinc-500">
                                        <div className="flex items-center justify-between border border-zinc-900 rounded px-4 py-3">
                                            <span>Supabase 連線</span>
                                            <span className="text-emerald-400 text-xs">● CONNECTED</span>
                                        </div>
                                        <div className="flex items-center justify-between border border-zinc-900 rounded px-4 py-3">
                                            <span>PKCE Auth Flow</span>
                                            <span className="text-emerald-400 text-xs">● ENABLED</span>
                                        </div>
                                        <div className="flex items-center justify-between border border-zinc-900 rounded px-4 py-3">
                                            <span>Admin Role</span>
                                            <span className="text-[#FF5500] text-xs">● ACTIVE</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
