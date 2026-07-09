'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import XIcon from '../icons/XIcon';
import UsersGroupIcon from '../icons/UsersGroupIcon';
import Stack3Icon from '../icons/Stack3Icon';
import FileDescriptionIcon from '../icons/FileDescriptionIcon';
import GearIcon from '../icons/GearIcon';
import LayoutDashboardIcon from '../icons/LayoutDashboardIcon';
import { ContractIcon } from '../icons/ContractIcon';
import AdminContractPanel from './AdminContractPanel';
import type { AnimatedIconHandle } from '../icons/types';
import SatelliteDishIcon from '../icons/SatelliteDishIcon';

interface AdminDashboardProps {
    onClose: () => void;
}

type AdminNav = 'clients' | 'contracts' | 'projects' | 'files' | 'settings';

interface ProjectRow {
    id: string;
    name: string;
    user_id: string;
    status: string;
    created_at: string;
    client_name?: string;
    task_stats?: { status: string; count: number }[];
}

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
    project_id: string;
    client_name?: string;
}

interface TaskCommentRow {
    id: string;
    task_id: string;
    content: string;
    is_admin: boolean;
    created_at: string;
    user_name?: string;
}

interface ContractSummary {
    id: string;
    status: string;
    created_at: string;
    signed_at: string | null;
    project_id: string;
}

const NAV_ITEMS: { key: AdminNav; label: string }[] = [
    { key: 'clients',   label: 'Clients'   },
    { key: 'contracts', label: 'Contracts' },
    { key: 'projects',  label: 'Projects'  },
    { key: 'files',     label: 'Files'     },
    { key: 'settings',  label: 'Settings'  },
];

const STATUS_LABEL: Record<string, string> = {
    QUEUED: 'Todo', IN_PROGRESS: 'In Progress', REVIEW: 'In Review', DELIVERED: 'Done',
};
const STATUS_COLOR: Record<string, string> = {
    QUEUED: '#52525b', IN_PROGRESS: '#60a5fa', REVIEW: '#facc15', DELIVERED: '#34d399',
};
const BADGE_COLOR: Record<string, string> = {
    QUEUED:      'text-zinc-500 border-zinc-800',
    IN_PROGRESS: 'text-blue-400  border-blue-900',
    REVIEW:      'text-yellow-400 border-yellow-900',
    DELIVERED:   'text-emerald-400 border-emerald-900',
    REGISTERED:  'text-orange-400 border-orange-900',
    ACTIVE:      'text-emerald-400 border-emerald-900',
};
const KANBAN_COLS = ['QUEUED', 'IN_PROGRESS', 'REVIEW', 'DELIVERED'] as const;

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
    const [activeNav, setActiveNav]           = useState<AdminNav>('clients');
    const [clients, setClients]               = useState<ClientRow[]>([]);
    const [projects, setProjects]             = useState<ProjectRow[]>([]);
    const [tasks, setTasks]                   = useState<TaskRow[]>([]);
    const [loading, setLoading]               = useState(true);
    const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
    const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    // Client detail extras
    const [clientProjects, setClientProjects]   = useState<ProjectRow[]>([]);
    const [clientContracts, setClientContracts] = useState<ContractSummary[]>([]);

    // Activity update
    const [activityDraft, setActivityDraft]   = useState('');
    const [activityLoading, setActivityLoading] = useState(false);

    // Comments and activities feed per task
    const [taskComments, setTaskComments]     = useState<any[]>([]);
    const [commentsTaskId, setCommentsTaskId] = useState<string | null>(null);

    // New project form
    const [newProjectName, setNewProjectName]       = useState('');
    const [newProjectClientId, setNewProjectClientId] = useState('');
    const [newProjectLoading, setNewProjectLoading] = useState(false);

    // New task inline form (per kanban column)
    const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle]     = useState('');
    const [newTaskType, setNewTaskType]       = useState('GENERAL');
    const [newTaskPriority, setNewTaskPriority] = useState('MED');
    const [newTaskEta, setNewTaskEta]         = useState('');
    const [newTaskLoading, setNewTaskLoading] = useState(false);
    const [newProjectError, setNewProjectError] = useState('');

    // Unread dots: task IDs that have client (is_admin=false) comments
    const [clientCommentTaskIds, setClientCommentTaskIds] = useState<Set<string>>(new Set());

    const closeIconRef = useRef<AnimatedIconHandle>(null);
    const iconRefs     = useRef<(AnimatedIconHandle | null)[]>([]);
    const adminChatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        adminChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [taskComments]);

    // ── Fetch helpers ────────────────────────────────────────────
    const fetchClients = useCallback(async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        setClients(data ?? []);
    }, []);

    const fetchProjects = useCallback(async () => {
        const { data } = await supabase
            .from('projects')
            .select('*, profiles(name), tasks(status)')
            .order('created_at', { ascending: false });
        setProjects((data ?? []).map((p: any) => ({
            ...p,
            client_name: p.profiles?.name ?? '—',
            task_stats:  (p.tasks as { status: string }[] || []).reduce(
                (acc: { status: string; count: number }[], t: { status: string }) => {
                    const found = acc.find(x => x.status === t.status);
                    if (found) found.count += 1;
                    else acc.push({ status: t.status, count: 1 });
                    return acc;
                }, []
            ),
        })));
    }, []);

    const fetchTasks = useCallback(async () => {
        const { data } = await supabase
            .from('tasks')
            .select('*, profiles(name), projects(name)')
            .order('created_at', { ascending: false });
        setTasks((data ?? []).map((t: any) => ({
            ...t,
            client_name: t.profiles?.name ?? '—',
        })));
    }, []);

    const fetchClientCommentTaskIds = useCallback(async () => {
        const { data } = await supabase
            .from('task_comments')
            .select('id, task_id, created_at')
            .eq('is_admin', false)
            .order('created_at', { ascending: false });

        if (!data) return;

        const latestIds: Record<string, string> = {};
        data.forEach((c: any) => {
            if (!latestIds[c.task_id]) {
                latestIds[c.task_id] = c.id;
            }
        });

        const unread = new Set<string>();
        Object.entries(latestIds).forEach(([taskId, commentId]) => {
            const seenId = localStorage.getItem(`seen-admin-task-${taskId}`);
            if (seenId !== commentId) {
                unread.add(taskId);
            }
        });
        setClientCommentTaskIds(unread);
    }, []);

    useEffect(() => {
        if (!expandedTaskId || taskComments.length === 0) return;
        const latestClientCmt = [...taskComments].reverse().find(item => item.type === 'comment' && !item.is_admin);
        if (latestClientCmt) {
            const cmtId = latestClientCmt.id.replace('cmt-', '');
            localStorage.setItem(`seen-admin-task-${expandedTaskId}`, cmtId);
            setClientCommentTaskIds(prev => {
                const next = new Set(prev);
                next.delete(expandedTaskId);
                return next;
            });
        }
    }, [expandedTaskId, taskComments]);

    const fetchClientExtras = useCallback(async (clientId: string) => {
        const [{ data: ps }, { data: cs }] = await Promise.all([
            supabase.from('projects').select('id,name,status,created_at,user_id,tasks(status)').eq('user_id', clientId),
            supabase.from('contracts').select('id,status,created_at,signed_at,project_id').eq('user_id', clientId),
        ]);
        setClientProjects((ps ?? []).map((p: any) => ({
            ...p,
            task_stats: (p.tasks as { status: string }[] || []).reduce(
                (acc: { status: string; count: number }[], t: { status: string }) => {
                    const found = acc.find(x => x.status === t.status);
                    if (found) found.count += 1;
                    else acc.push({ status: t.status, count: 1 });
                    return acc;
                }, []
            ),
        })));
        setClientContracts(cs ?? []);
    }, []);

    const fetchTaskTimeline = useCallback(async (taskId: string) => {
        const [{ data: acts }, { data: cmts }] = await Promise.all([
            supabase
                .from('task_activities')
                .select('id,task_id,content,created_at,profiles(name)')
                .eq('task_id', taskId),
            supabase
                .from('task_comments')
                .select('id,task_id,content,is_admin,created_at,profiles(name)')
                .eq('task_id', taskId)
        ]);

        const merged: any[] = [];
        if (acts) {
            acts.forEach((a: any) => {
                merged.push({
                    id: `act-${a.id}`,
                    type: 'activity',
                    content: a.content,
                    created_at: a.created_at,
                    user_name: a.profiles?.name ?? 'Admin',
                });
            });
        }
        if (cmts) {
            cmts.forEach((c: any) => {
                merged.push({
                    id: `cmt-${c.id}`,
                    type: 'comment',
                    content: c.content,
                    created_at: c.created_at,
                    user_name: c.profiles?.name ?? (c.is_admin ? 'Admin' : 'Client'),
                    is_admin: c.is_admin,
                });
            });
        }

        merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setTaskComments(merged);
    }, []);

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchClients(), fetchProjects(), fetchTasks(), fetchClientCommentTaskIds()]).finally(() => setLoading(false));
    }, [fetchClients, fetchProjects, fetchTasks, fetchClientCommentTaskIds]);

    useEffect(() => {
        if (selectedClient) fetchClientExtras(selectedClient.id);
        else { setClientProjects([]); setClientContracts([]); }
    }, [selectedClient, fetchClientExtras]);

    useEffect(() => {
        if (!expandedTaskId) { setTaskComments([]); setCommentsTaskId(null); return; }
        if (commentsTaskId !== expandedTaskId) {
            setCommentsTaskId(expandedTaskId);
            fetchTaskTimeline(expandedTaskId);
        }
    }, [expandedTaskId, commentsTaskId, fetchTaskTimeline]);

    // ── Realtime ─────────────────────────────────────────────────
    useEffect(() => {
        const taskCh = supabase.channel('admin-tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => { fetchTasks(); fetchProjects(); })
            .subscribe();
        const projCh = supabase.channel('admin-projects')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchProjects())
            .subscribe();
        const commentCh = supabase.channel('admin-comments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments' }, () => {
                if (commentsTaskId) fetchTaskTimeline(commentsTaskId);
                fetchClientCommentTaskIds();
            })
            .subscribe();
        const actCh = supabase.channel('admin-activities')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'task_activities' }, () => {
                if (commentsTaskId) fetchTaskTimeline(commentsTaskId);
            })
            .subscribe();
        return () => {
            supabase.removeChannel(taskCh);
            supabase.removeChannel(projCh);
            supabase.removeChannel(commentCh);
            supabase.removeChannel(actCh);
        };
    }, [fetchTasks, fetchProjects, commentsTaskId, fetchTaskTimeline]);

    // ── Actions ──────────────────────────────────────────────────
    const createProject = useCallback(async () => {
        if (!newProjectClientId) { setNewProjectError('請先選擇 client'); return; }
        if (!newProjectName.trim()) { setNewProjectError('請填寫專案名稱'); return; }
        setNewProjectError('');
        setNewProjectLoading(true);
        const { error } = await supabase
            .from('projects')
            .insert({ name: newProjectName.trim(), user_id: newProjectClientId, status: 'ACTIVE' });
        setNewProjectLoading(false);
        if (error) { alert(`建立專案失敗：${error.message}`); }
        else { setNewProjectName(''); setNewProjectClientId(''); fetchProjects(); }
    }, [newProjectName, newProjectClientId, fetchProjects]);

    const updateTaskStatus = useCallback(async (taskId: string, newStatus: string) => {
        const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
        if (error) alert(`更新失敗：${error.message}`);
        else fetchTasks();
    }, [fetchTasks]);

    const submitActivity = useCallback(async (taskId: string) => {
        if (!activityDraft.trim()) return;
        setActivityLoading(true);
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) { setActivityLoading(false); alert('請先登入'); return; }
        const { error } = await supabase.from('task_activities')
            .insert({ task_id: taskId, user_id: userId, content: activityDraft.trim() });
        setActivityLoading(false);
        if (error) { alert(`Activity 更新失敗：${error.message}`); }
        else { setActivityDraft(''); fetchTaskTimeline(taskId); }
    }, [activityDraft, fetchTaskTimeline]);

    const submitComment = useCallback(async (taskId: string) => {
        if (!activityDraft.trim()) return;
        setActivityLoading(true);
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) { setActivityLoading(false); alert('請先登入'); return; }
        const { error } = await supabase.from('task_comments')
            .insert({ task_id: taskId, user_id: userId, content: activityDraft.trim(), is_admin: true });
        setActivityLoading(false);
        if (error) { alert(`留言失敗：${error.message}`); }
        else { setActivityDraft(''); fetchTaskTimeline(taskId); }
    }, [activityDraft, fetchTaskTimeline]);

    const createTask = useCallback(async (projectId: string, clientUserId: string, status: string) => {
        if (!newTaskTitle.trim()) return;
        setNewTaskLoading(true);
        const { error } = await supabase.from('tasks').insert({
            project_id: projectId,
            user_id:    clientUserId,
            title:      newTaskTitle.trim(),
            type:       newTaskType || 'GENERAL',
            priority:   newTaskPriority || 'MED',
            eta:        newTaskEta.trim() || null,
            status:     status,
        });
        setNewTaskLoading(false);
        if (error) { alert(`建立任務失敗：${error.message}`); }
        else {
            setNewTaskTitle(''); setNewTaskType('GENERAL');
            setNewTaskPriority('MED'); setNewTaskEta('');
            setAddingToColumn(null);
            fetchTasks(); fetchProjects();
        }
    }, [newTaskTitle, newTaskType, newTaskPriority, newTaskEta, fetchTasks, fetchProjects]);

    const deleteTask = useCallback(async (taskId: string) => {
        if (!confirm('確定要刪除這個任務嗎？')) return;
        const { error } = await supabase.from('tasks').delete().eq('id', taskId);
        if (error) { alert(`刪除失敗：${error.message}`); }
        else { if (expandedTaskId === taskId) setExpandedTaskId(null); fetchTasks(); fetchProjects(); }
    }, [expandedTaskId, fetchTasks, fetchProjects]);

    // ── Helpers ──────────────────────────────────────────────────
    const getProjectProgress = (project: ProjectRow) => {
        const total = project.task_stats?.reduce((s, x) => s + x.count, 0) || 0;
        const done  = project.task_stats?.find(s => s.status === 'DELIVERED')?.count || 0;
        return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
    };

    return (
        <div className="flex h-full w-full bg-[#000000] font-mono overflow-hidden">

            {/* ── Sidebar ──────────────────────────────────────────── */}
            <aside className="w-52 shrink-0 border-r border-zinc-900 flex flex-col bg-[#000000]">
                <div className="px-4 py-4 border-b border-zinc-900">
                    <div className="text-xs text-[#3b82f6] tracking-widest mb-0.5">ADMIN CONSOLE</div>
                    <div className="text-sm font-bold text-white tracking-wide">JAGGER OS</div>
                </div>
                <nav className="flex-1 px-2 py-3 space-y-0.5">
                    {NAV_ITEMS.map((item, i) => (
                        <button
                            key={item.key}
                            onClick={() => { setActiveNav(item.key); setSelectedClient(null); setSelectedProject(null); setExpandedTaskId(null); }}
                            onMouseEnter={() => iconRefs.current[i]?.startAnimation()}
                            onMouseLeave={() => iconRefs.current[i]?.stopAnimation()}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left ${activeNav === item.key ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}`}
                        >
                            <span className="shrink-0 pointer-events-none">
                                {item.key === 'clients'   && <UsersGroupIcon      ref={el => { iconRefs.current[i] = el; }} size={16} />}
                                {item.key === 'contracts' && <ContractIcon size={16} animate={activeNav === 'contracts' ? 'hover' : 'idle'} />}
                                {item.key === 'projects'  && <LayoutDashboardIcon ref={el => { iconRefs.current[i] = el; }} size={16} />}
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

            {/* ── Main ─────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Topbar */}
                <div className="h-12 border-b border-zinc-900 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-600">ADMIN</span>
                        <span className="text-zinc-800">›</span>
                        <span className="text-sm text-zinc-300 uppercase">{activeNav}</span>
                        {activeNav === 'projects' && selectedProject && (
                            <>
                                <span className="text-zinc-800">›</span>
                                <span className="text-sm text-zinc-300 truncate max-w-[200px]">{selectedProject.name}</span>
                            </>
                        )}
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
                        <div className="flex items-center justify-center h-full text-zinc-600 text-sm tracking-widest">// LOADING…</div>
                    ) : (
                        <>
                            {/* ── CLIENTS ──────────────────────────────────────── */}
                            {activeNav === 'clients' && (
                                <div className="flex h-full">
                                    {/* Client list */}
                                    <div className={`flex flex-col border-r border-zinc-900 overflow-y-auto transition-all ${selectedClient ? 'w-[45%]' : 'w-full'}`}>
                                        <div className="grid grid-cols-5 border-b border-zinc-900 px-4 py-2 text-xs text-zinc-600 tracking-widest shrink-0">
                                            <span>NAME</span><span>EMAIL</span><span>PLAN</span><span>STATUS</span><span>ROLE</span>
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
                                                <span className={`inline-flex items-center text-xs border rounded px-1.5 py-0.5 w-fit tracking-widest ${BADGE_COLOR[c.status] ?? 'text-zinc-600 border-zinc-800'}`}>
                                                    {c.status}
                                                </span>
                                                <span className={`text-xs tracking-widest ${c.role === 'admin' ? 'text-[#3b82f6]' : 'text-zinc-600'}`}>
                                                    {c.role?.toUpperCase() ?? 'CLIENT'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Client detail panel */}
                                    {selectedClient && (
                                        <div className="flex-1 flex flex-col overflow-y-auto">
                                            <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
                                                <span className="text-xs text-zinc-600 tracking-widest">// CLIENT DETAIL</span>
                                                <button onClick={() => setSelectedClient(null)} className="text-zinc-700 hover:text-zinc-400 text-xs transition-colors">✕</button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                                                {/* Basic info */}
                                                <div className="space-y-3">
                                                    {[
                                                        { label: 'NAME',    value: selectedClient.name },
                                                        { label: 'EMAIL',   value: selectedClient.email },
                                                        { label: 'COMPANY', value: selectedClient.company },
                                                        { label: 'PLAN',    value: selectedClient.plan_type },
                                                        { label: 'STATUS',  value: selectedClient.status },
                                                        { label: 'ROLE',    value: selectedClient.role?.toUpperCase() },
                                                        { label: 'JOINED',  value: new Date(selectedClient.created_at).toLocaleDateString('zh-TW') },
                                                        { label: 'ID',      value: selectedClient.id },
                                                    ].map(({ label, value }) => (
                                                        <div key={label} className="flex gap-4">
                                                            <span className="text-xs text-zinc-600 tracking-widest w-20 shrink-0">{label}</span>
                                                            <span className="text-sm text-zinc-300 break-all">{value || '—'}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Projects */}
                                                <div className="border border-zinc-900 rounded-lg p-4">
                                                    <div className="text-xs text-zinc-600 tracking-widest mb-3">// PROJECTS</div>
                                                    {clientProjects.length === 0 ? (
                                                        <div className="text-xs text-zinc-700">尚無專案</div>
                                                    ) : clientProjects.map(p => {
                                                        const { total, done, pct } = getProjectProgress(p);
                                                        return (
                                                            <div key={p.id}
                                                                onClick={() => { setActiveNav('projects'); setSelectedProject(p); }}
                                                                className="flex items-center gap-3 py-2.5 border-b border-zinc-900/50 last:border-b-0 cursor-pointer hover:bg-zinc-900/30 -mx-1 px-1 rounded transition-colors">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm text-zinc-300 truncate">{p.name}</div>
                                                                    <div className="text-xs text-zinc-600 mt-0.5">{total} tasks · {done} done</div>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <div className="w-16 bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                                                        <div className="h-full rounded-full bg-[#3b82f6] transition-all" style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                    <span className="text-xs text-[#3b82f6] w-8 text-right">{pct}%</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Contracts */}
                                                <div className="border border-zinc-900 rounded-lg p-4">
                                                    <div className="text-xs text-zinc-600 tracking-widest mb-3">// CONTRACTS</div>
                                                    {clientContracts.length === 0 ? (
                                                        <div className="text-xs text-zinc-700">尚無合約</div>
                                                    ) : clientContracts.map(c => (
                                                        <div key={c.id}
                                                            onClick={() => setActiveNav('contracts')}
                                                            className="flex items-center gap-3 py-2.5 border-b border-zinc-900/50 last:border-b-0 cursor-pointer hover:bg-zinc-900/30 -mx-1 px-1 rounded transition-colors">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs text-zinc-500 font-mono">{c.id.slice(0, 16)}…</div>
                                                                <div className="text-xs text-zinc-600 mt-0.5">{new Date(c.created_at).toLocaleDateString('zh-TW')}</div>
                                                            </div>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border tracking-widest shrink-0 ${c.status === 'SIGNED' ? 'text-emerald-400 border-emerald-900' : 'text-zinc-500 border-zinc-800'}`}>
                                                                {c.status === 'SIGNED' ? '已簽署' : '待簽署'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── CONTRACTS ────────────────────────────────────── */}
                            {activeNav === 'contracts' && <AdminContractPanel />}

                            {/* ── PROJECTS ─────────────────────────────────────── */}
                            {activeNav === 'projects' && (() => {
                                if (!selectedProject) {
                                    /* Project cards list */
                                    return (
                                        <div className="flex flex-col h-full overflow-y-auto">
                                            {/* Header + New Project form */}
                                            <div className="px-5 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
                                                <div className="text-sm text-zinc-300 tracking-wide">PROJECTS</div>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={newProjectClientId}
                                                        onChange={e => setNewProjectClientId(e.target.value)}
                                                        className="bg-zinc-950 text-xs border border-zinc-800 rounded px-2 py-1.5 text-zinc-400 outline-none"
                                                    >
                                                        <option value="">Select client</option>
                                                        {clients.filter(c => c.role !== 'admin').map(c => (
                                                            <option key={c.id} value={c.id}>{c.name || c.email}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={newProjectName}
                                                        onChange={e => setNewProjectName(e.target.value)}
                                                        placeholder="Project name"
                                                        className="bg-zinc-950 text-xs border border-zinc-800 rounded px-2 py-1.5 text-zinc-300 placeholder-zinc-700 outline-none w-44"
                                                        onKeyDown={e => e.key === 'Enter' && createProject()}
                                                    />
                                                    <button
                                                        onClick={createProject}
                                                        disabled={newProjectLoading}
                                                        className="text-xs bg-[#3b82f6] text-black hover:bg-white px-3 py-1.5 rounded font-bold transition-colors disabled:opacity-50"
                                                    >
                                                        {newProjectLoading ? '…' : '+ New Project'}
                                                    </button>
                                                </div>
                                                {newProjectError && (
                                                    <div className="text-[10px] text-red-400 mt-1.5">⚠ {newProjectError}</div>
                                                )}
                                            </div>
                                            {/* Cards */}
                                            <div className="grid grid-cols-3 gap-4 p-5">
                                                {projects.length === 0 ? (
                                                    <div className="col-span-3 text-center py-12 text-zinc-700 text-sm">// NO PROJECTS YET</div>
                                                ) : projects.map(p => {
                                                    const { total, done, pct } = getProjectProgress(p);
                                                    return (
                                                        <div key={p.id}
                                                            onClick={() => setSelectedProject(p)}
                                                            className="bg-zinc-950 border border-zinc-900 rounded-lg p-4 cursor-pointer hover:border-zinc-700 transition-colors">
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div>
                                                                    <div className="text-sm font-bold text-zinc-200 mb-0.5">{p.name}</div>
                                                                    <div className="text-xs text-zinc-600">{p.client_name}</div>
                                                                </div>
                                                                <span className={`text-xs border rounded px-1.5 py-0.5 shrink-0 ml-2 ${BADGE_COLOR[p.status] ?? 'text-zinc-600 border-zinc-800'}`}>{p.status}</span>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="text-zinc-600">{total} tasks</span>
                                                                    <span className="text-zinc-400">{pct}%</span>
                                                                </div>
                                                                <div className="bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: '#3b82f6' }} />
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                                    {KANBAN_COLS.map(s => {
                                                                        const cnt = p.task_stats?.find(x => x.status === s)?.count || 0;
                                                                        return cnt > 0 ? (
                                                                            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded border"
                                                                                style={{ color: STATUS_COLOR[s], borderColor: `${STATUS_COLOR[s]}40` }}>
                                                                                {STATUS_LABEL[s]} {cnt}
                                                                            </span>
                                                                        ) : null;
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                }

                                /* ── Kanban board ── */
                                const clientUserId = selectedProject.user_id;
                                return (
                                    <div className="flex flex-col h-full">
                                        {/* Board header */}
                                        <div className="px-5 py-3 border-b border-zinc-900 flex items-center gap-3 shrink-0">
                                            <button onClick={() => { setSelectedProject(null); setExpandedTaskId(null); setAddingToColumn(null); }}
                                                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← Back</button>
                                            <span className="text-sm font-bold text-white">{selectedProject.name}</span>
                                            <span className="text-xs text-[#3b82f6] border border-[#3b82f6]/30 px-1.5 py-0.5 rounded">{selectedProject.client_name}</span>
                                            {(() => {
                                                const { total, done, pct } = getProjectProgress(selectedProject);
                                                return (
                                                    <div className="flex items-center gap-2 ml-auto">
                                                        <span className="text-xs text-zinc-600">{done}/{total} done</span>
                                                        <div className="w-20 bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                                            <div className="h-full rounded-full bg-[#3b82f6] transition-all" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="text-xs text-[#3b82f6] font-bold">{pct}%</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        {/* Kanban columns */}
                                        <div className="flex-1 overflow-x-auto p-5">
                                            <div className="flex gap-4 min-w-[900px] h-full">
                                                {KANBAN_COLS.map(colStatus => {
                                                    const colTasks = tasks.filter(t => t.project_id === selectedProject.id && t.status === colStatus);
                                                    const isAdding = addingToColumn === colStatus;
                                                    return (
                                                        <div key={colStatus} className="flex-1 flex flex-col min-w-[220px] bg-zinc-950/50 border border-zinc-900 rounded-lg">
                                                            {/* Column header */}
                                                            <div className="px-3 py-2.5 border-b border-zinc-900 flex items-center gap-2 shrink-0">
                                                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[colStatus] }} />
                                                                <span className="text-xs font-bold" style={{ color: STATUS_COLOR[colStatus] }}>{STATUS_LABEL[colStatus]}</span>
                                                                <span className="text-xs text-zinc-600 ml-auto">{colTasks.length}</span>
                                                            </div>
                                                            {/* Task cards */}
                                                            <div className="flex-1 overflow-y-auto p-2 space-y-2"
                                                                style={{ scrollbarWidth: 'thin', scrollbarColor: '#27272a transparent' }}>
                                                                {colTasks.map(t => {
                                                                    const isExpanded = expandedTaskId === t.id;
                                                                    return (
                                                                        <div key={t.id} className="bg-zinc-900/60 border border-zinc-900 rounded-lg">
                                                                            {/* Card header */}
                                                                            <div className="p-2.5 cursor-pointer"
                                                                                onClick={() => {
                                                                                    setExpandedTaskId(isExpanded ? null : t.id);
                                                                                    if (!isExpanded) setActivityDraft('');
                                                                                }}>
                                                                                <div className="flex items-start justify-between gap-2">
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <span className="text-xs text-zinc-300 font-medium leading-snug">{t.title}</span>
                                                                                            {clientCommentTaskIds.has(t.id) && (
                                                                                                <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] shrink-0" title="Client 留言" />
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="text-[10px] text-zinc-600 mt-0.5">{t.client_name} · {t.type}</div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                                        <span className="text-[10px] text-zinc-500 border border-zinc-800 px-1 py-0.5 rounded">{t.priority}</span>
                                                                                        <button
                                                                                            onClick={e => { e.stopPropagation(); deleteTask(t.id); }}
                                                                                            className="text-[10px] text-zinc-700 hover:text-red-400 transition-colors px-0.5"
                                                                                            title="刪除"
                                                                                        >✕</button>
                                                                                    </div>
                                                                                </div>
                                                                                {t.eta && t.eta !== '—' && (
                                                                                    <div className="text-[10px] text-zinc-600 mt-1">ETA: {t.eta}</div>
                                                                                )}
                                                                            </div>

                                                                            {/* Expanded panel */}
                                                                            {isExpanded && (
                                                                                <div className="border-t border-zinc-900 p-2.5 space-y-3">
                                                                                    {/* Status dropdown */}
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-[10px] text-zinc-600 shrink-0">STATUS</span>
                                                                                        <select
                                                                                            value={t.status}
                                                                                            onChange={e => updateTaskStatus(t.id, e.target.value)}
                                                                                            className="flex-1 bg-zinc-950 text-[10px] border border-zinc-800 rounded px-1.5 py-1 text-zinc-400 outline-none cursor-pointer"
                                                                                        >
                                                                                            {KANBAN_COLS.map(s => (
                                                                                                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                                                                                            ))}
                                                                                        </select>
                                                                                    </div>

                                                                                    {/* Unified Chronological Feed */}
                                                                                    <div className="border border-zinc-900 rounded p-2 bg-zinc-950/40 space-y-2 flex flex-col">
                                                                                        <div className="text-[9px] text-zinc-600 tracking-widest font-mono flex items-center gap-2">
                                                                                            <SatelliteDishIcon size={20} className="text-[#3b82f6]" />
                                                                                            <span>// DISCUSSION & ACTIVITIES</span>
                                                                                        </div>
                                                                                        <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1" style={{ scrollbarWidth: 'thin' }}>
                                                                                            {taskComments.length === 0 ? (
                                                                                                <div className="text-[10px] text-zinc-700 italic text-center py-2">尚無對話或動態</div>
                                                                                            ) : (
                                                                                                taskComments.map(item => {
                                                                                                    if (item.type === 'activity') {
                                                                                                        return (
                                                                                                            <div key={item.id} className="flex flex-col items-center">
                                                                                                                <div className="bg-zinc-900/60 border border-zinc-900 rounded px-2 py-0.5 text-center max-w-[95%]">
                                                                                                                    <span className="text-[8px] text-zinc-500 font-mono block">{new Date(item.created_at).toLocaleString('zh-TW')}</span>
                                                                                                                    <span className="text-[10px] text-zinc-400 font-mono">⚡ {item.user_name}: {item.content}</span>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        );
                                                                                                    } else {
                                                                                                        const isAdmin = item.is_admin;
                                                                                                        return (
                                                                                                            <div key={item.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                                                                                                                <div className="flex items-center gap-1 px-1 text-[8px] text-zinc-500 font-mono">
                                                                                                                    <span className="font-bold">{isAdmin ? 'Admin' : 'Client'}</span>
                                                                                                                    <span>·</span>
                                                                                                                    <span>{new Date(item.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                                                </div>
                                                                                                                <div className={`max-w-[90%] rounded px-2 py-1 text-[11px] leading-relaxed border ${
                                                                                                                    isAdmin 
                                                                                                                        ? 'bg-zinc-900/80 border-zinc-800 text-zinc-200' 
                                                                                                                        : 'bg-[#3b82f6]/5 border-[#3b82f6]/20 text-[#3b82f6]'
                                                                                                                }`}>
                                                                                                                    {item.content}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        );
                                                                                                    }
                                                                                                })
                                                                                            )}
                                                                                            <div ref={adminChatEndRef} />
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Actions/Textarea */}
                                                                                    <div className="space-y-2">
                                                                                        <textarea
                                                                                            value={activityDraft}
                                                                                            onChange={e => setActivityDraft(e.target.value)}
                                                                                            placeholder="輸入訊息或進度更新..."
                                                                                            rows={2}
                                                                                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 outline-none resize-none focus:border-[#3b82f6]/40"
                                                                                        />
                                                                                        <div className="flex items-center justify-between gap-1.5">
                                                                                            <button onClick={() => { setExpandedTaskId(null); setActivityDraft(''); }}
                                                                                                className="text-[10px] text-zinc-500 border border-zinc-800 px-2 py-1.5 rounded hover:border-zinc-600 transition-colors">
                                                                                                收合
                                                                                            </button>
                                                                                            <div className="flex-1" />
                                                                                            <button
                                                                                                onClick={() => submitComment(t.id)}
                                                                                                disabled={activityLoading || !activityDraft.trim()}
                                                                                                className="text-[10px] border border-[#3b82f6]/40 text-[#3b82f6] px-2.5 py-1.5 rounded font-bold disabled:opacity-50 transition-colors hover:bg-[#3b82f6]/10"
                                                                                            >
                                                                                                傳送留言
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => submitActivity(t.id)}
                                                                                                disabled={activityLoading || !activityDraft.trim()}
                                                                                                className="text-[10px] bg-[#3b82f6] text-black px-2.5 py-1.5 rounded font-bold disabled:opacity-50 transition-colors hover:bg-white"
                                                                                            >
                                                                                                發布動態
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}

                                                                {/* Add Task inline form */}
                                                                {isAdding ? (
                                                                    <div className="bg-zinc-900/80 border border-[#3b82f6]/30 rounded-lg p-3 space-y-2">
                                                                        <input
                                                                            type="text"
                                                                            value={newTaskTitle}
                                                                            onChange={e => setNewTaskTitle(e.target.value)}
                                                                            placeholder="Task title…"
                                                                            autoFocus
                                                                            className="w-full bg-zinc-950 text-xs border border-zinc-800 rounded px-2 py-1.5 text-zinc-200 placeholder-zinc-700 outline-none focus:border-[#3b82f6]/60"
                                                                            onKeyDown={e => e.key === 'Enter' && createTask(selectedProject.id, clientUserId, colStatus)}
                                                                        />
                                                                        <div className="grid grid-cols-2 gap-1.5">
                                                                            <select value={newTaskType} onChange={e => setNewTaskType(e.target.value)}
                                                                                className="bg-zinc-950 text-[10px] border border-zinc-800 rounded px-1.5 py-1 text-zinc-400 outline-none">
                                                                                {['GENERAL','BRAND','WEB','PRINT','DEV','DESIGN'].map(t => <option key={t} value={t}>{t}</option>)}
                                                                            </select>
                                                                            <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)}
                                                                                className="bg-zinc-950 text-[10px] border border-zinc-800 rounded px-1.5 py-1 text-zinc-400 outline-none">
                                                                                <option value="HIGH">↑ High</option>
                                                                                <option value="MED">→ Medium</option>
                                                                                <option value="LOW">↓ Low</option>
                                                                            </select>
                                                                        </div>
                                                                        <input
                                                                            type="text"
                                                                            value={newTaskEta}
                                                                            onChange={e => setNewTaskEta(e.target.value)}
                                                                            placeholder="ETA (e.g. 3d)"
                                                                            className="w-full bg-zinc-950 text-[10px] border border-zinc-800 rounded px-2 py-1.5 text-zinc-400 placeholder-zinc-700 outline-none"
                                                                        />
                                                                        <div className="flex gap-1.5">
                                                                            <button onClick={() => { setAddingToColumn(null); setNewTaskTitle(''); }}
                                                                                className="flex-1 text-[10px] text-zinc-500 border border-zinc-800 py-1 rounded hover:border-zinc-600 transition-colors">
                                                                                Cancel
                                                                            </button>
                                                                            <button
                                                                                onClick={() => createTask(selectedProject.id, clientUserId, colStatus)}
                                                                                disabled={newTaskLoading || !newTaskTitle.trim()}
                                                                                className="flex-1 text-[10px] bg-[#3b82f6] text-black py-1 rounded font-bold disabled:opacity-50 hover:bg-white transition-colors"
                                                                            >
                                                                                {newTaskLoading ? '…' : 'Add'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => { setAddingToColumn(colStatus); setExpandedTaskId(null); setNewTaskTitle(''); }}
                                                                        className="w-full text-[10px] text-zinc-600 hover:text-zinc-400 border border-dashed border-zinc-800 hover:border-zinc-600 rounded py-1.5 transition-colors"
                                                                    >
                                                                        + Add Task
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── FILES ────────────────────────────────────────── */}
                            {activeNav === 'files' && (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-600">
                                    <span className="text-sm tracking-widest">// FILE UPLOAD COMING SOON</span>
                                    <span className="text-xs">Supabase Storage 整合中</span>
                                </div>
                            )}

                            {/* ── SETTINGS ─────────────────────────────────────── */}
                            {activeNav === 'settings' && (
                                <div className="flex flex-col px-6 py-6 gap-4 max-w-lg">
                                    <span className="text-xs text-zinc-600 tracking-widest">// SYSTEM SETTINGS</span>
                                    <div className="space-y-3 text-sm text-zinc-500">
                                        {[
                                            { label: 'Supabase 連線', value: 'CONNECTED',  color: 'text-emerald-400' },
                                            { label: 'PKCE Auth Flow', value: 'ENABLED',   color: 'text-emerald-400' },
                                            { label: 'Admin Role',     value: 'ACTIVE',    color: 'text-[#3b82f6]' },
                                        ].map(item => (
                                            <div key={item.label} className="flex items-center justify-between border border-zinc-900 rounded px-4 py-3">
                                                <span>{item.label}</span>
                                                <span className={`text-xs ${item.color}`}>● {item.value}</span>
                                            </div>
                                        ))}
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
