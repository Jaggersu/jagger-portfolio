'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import XIcon from '../icons/XIcon';
import UsersGroupIcon from '../icons/UsersGroupIcon';
import Stack3Icon from '../icons/Stack3Icon';
import FileDescriptionIcon from '../icons/FileDescriptionIcon';
import RocketIcon from '../icons/RocketIcon';
import DownloadIcon from '../icons/DownloadIcon';
import PlugConnectedIcon from '../icons/PlugConnectedIcon';
import GearIcon from '../icons/GearIcon';
import LayoutDashboardIcon from '../icons/LayoutDashboardIcon';
import PenIcon from '../icons/PenIcon';
import MailFilledIcon from '../icons/MailFilledIcon';
import AdminContractPanel from './AdminContractPanel';
import type { AnimatedIconHandle } from '../icons/types';
import SatelliteDishIcon from '../icons/SatelliteDishIcon';
import { useUserFlow } from '../../lib/userFlow';
import LogoutIcon from '../icons/LogoutIcon';

interface AdminDashboardProps {
    onClose: () => void;
}

type AdminNav = 'clients' | 'contracts' | 'projects' | 'files' | 'inbox' | 'settings';

interface ProjectRow {
    id: string;
    name: string;
    user_id: string;
    status: string;
    created_at: string;
    client_name?: string;
    task_stats?: { status: string; count: number }[];
    drive_upload_url?: string;
    drive_view_url?: string;
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
    description?: string;
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
    { key: 'clients',   label: '客戶管理'   },
    { key: 'contracts', label: '合約管理'   },
    { key: 'projects',  label: '專案管理'   },
    { key: 'files',     label: '雲端設定'   },
    { key: 'inbox',     label: '需求追蹤' },
    { key: 'settings',  label: '系統設定'   },
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

function StatusIcon({ status, className, style }: { status: string; className?: string; style?: React.CSSProperties }) {
    if (status === 'QUEUED') {
        return (
            <svg className={`w-3.5 h-3.5 ${className}`} style={style} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        );
    }
    if (status === 'IN_PROGRESS') {
        return (
            <svg className={`w-3.5 h-3.5 ${className}`} style={style} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 1.75C11.4518 1.75 14.25 4.54822 14.25 8C14.25 11.4518 11.4518 14.25 8 14.25V1.75Z" fill="currentColor" />
            </svg>
        );
    }
    if (status === 'REVIEW') {
        return (
            <svg className={`w-3.5 h-3.5 ${className}`} style={style} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.5 2.5" />
            </svg>
        );
    }
    if (status === 'DELIVERED') {
        return (
            <svg className={`w-3.5 h-3.5 ${className}`} style={style} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="6.25" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5.5 8L7 9.5L10.5 6" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    return (
        <svg className={`w-3.5 h-3.5 ${className}`} style={style} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
}

function PriorityIcon({ priority, className }: { priority: string; className?: string }) {
    const isLow = priority === 'LOW';
    const isMed = priority === 'MED';
    const isHigh = priority === 'HIGH';
    return (
        <svg className={`w-3 h-3 ${className}`} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="10" width="2.5" height="4" rx="0.5" fill={isLow || isMed || isHigh ? 'currentColor' : '#27272a'} />
            <rect x="6.75" y="7" width="2.5" height="7" rx="0.5" fill={isMed || isHigh ? 'currentColor' : '#27272a'} />
            <rect x="11.5" y="4" width="2.5" height="10" rx="0.5" fill={isHigh ? 'currentColor' : '#27272a'} />
        </svg>
    );
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
    const { reset } = useUserFlow();
    const handleSignOut = () => { reset(); onClose(); };

    const [activeNav, setActiveNav]           = useState<AdminNav>('clients');
    const [clients, setClients]               = useState<ClientRow[]>([]);
    const [projects, setProjects]             = useState<ProjectRow[]>([]);
    const [tasks, setTasks]                   = useState<TaskRow[]>([]);
    const [loading, setLoading]               = useState(true);
    const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
    const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [adminProfile, setAdminProfile]     = useState<{ name: string; email: string } | null>(null);
    const [dbStatus, setDbStatus]             = useState<'checking' | 'ok' | 'error'>('checking');
    const [announcement, setAnnouncement]     = useState({ text: '', enabled: false });
    const [announceSaving, setAnnounceSaving] = useState(false);
    const [announceSaved, setAnnounceSaved]   = useState(false);
    const [projectTabClientId, setProjectTabClientId] = useState<string | null>(null);
    const [filesTabClientId, setFilesTabClientId]     = useState<string | null>(null);
    const [generatingDriveProjectId, setGeneratingDriveProjectId] = useState<string | null>(null);
    const uploadIconRefs   = useRef<Map<string, AnimatedIconHandle>>(new Map());
    const downloadIconRefs = useRef<Map<string, AnimatedIconHandle>>(new Map());
    const plugIconRefs     = useRef<Map<string, AnimatedIconHandle>>(new Map());
    const boardUploadIconRef = useRef<AnimatedIconHandle>(null);
    const boardDownloadIconRef = useRef<AnimatedIconHandle>(null);

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
    const [requests, setRequests] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
    const [requestsLoading, setRequestsLoading] = useState(false);

    const fetchRequests = useCallback(async () => {
        setRequestsLoading(true);
        const { data, error } = await supabase
            .from('project_requests')
            .select('*, projects(name), profiles(name, email)')
            .eq('status', '審核中')
            .order('created_at', { ascending: false });
        if (!error && data) {
            setRequests(data);
        } else if (error) {
            console.error('Failed to fetch requests:', error);
        }
        setRequestsLoading(false);
    }, []);

    const markRequestAsRead = useCallback(async (requestId: string) => {
        const { error } = await supabase
            .from('project_requests')
            .update({ is_read: true })
            .eq('id', requestId);
        if (error) {
            console.error('Failed to mark request as read:', error);
        } else {
            fetchRequests();
        }
    }, [fetchRequests]);

    const unreadRequestCount = requests.filter(r => !r.is_read).length;

    const [newProjectError, setNewProjectError] = useState('');

    // Unread dots: task IDs that have client (is_admin=false) comments
    const [clientCommentTaskIds, setClientCommentTaskIds] = useState<Set<string>>(new Set());

    const closeIconRef = useRef<AnimatedIconHandle>(null);
    const iconRefs     = useRef<(AnimatedIconHandle | null)[]>([]);
    const adminChatEndRef = useRef<HTMLDivElement>(null);
    const logoutIconRef = useRef<AnimatedIconHandle>(null);
    const logoutIconRef2 = useRef<AnimatedIconHandle>(null);

    useEffect(() => {
        adminChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [taskComments]);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                supabase
                    .from('profiles')
                    .select('name, email')
                    .eq('id', data.user.id)
                    .maybeSingle()
                    .then(({ data: p }) => {
                        if (p) setAdminProfile({ name: p.name ?? '', email: p.email ?? data.user.email ?? '' });
                    });
            }
        });
        supabase.from('profiles').select('id', { count: 'exact', head: true }).then(({ error }) => {
            setDbStatus(error ? 'error' : 'ok');
        });
        supabase
            .from('system_settings')
            .select('key, value')
            .in('key', ['announcement_text', 'announcement_enabled'])
            .then(({ data }) => {
                if (data) {
                    const txt = data.find(r => r.key === 'announcement_text')?.value ?? '';
                    const en  = data.find(r => r.key === 'announcement_enabled')?.value === 'true';
                    setAnnouncement({ text: txt, enabled: en });
                }
            });
    }, []);

    const handleSaveAnnouncement = useCallback(async () => {
        setAnnounceSaving(true);
        await Promise.all([
            supabase.from('system_settings')
                .upsert({ key: 'announcement_text',    value: announcement.text,              updated_at: new Date().toISOString() }),
            supabase.from('system_settings')
                .upsert({ key: 'announcement_enabled', value: String(announcement.enabled),   updated_at: new Date().toISOString() }),
        ]);
        setAnnounceSaving(false);
        setAnnounceSaved(true);
        setTimeout(() => setAnnounceSaved(false), 2500);
    }, [announcement]);

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
        if (latestClientCmt && latestClientCmt.task_id === expandedTaskId) {
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
            supabase.from('projects').select('id,name,status,created_at,user_id,drive_upload_url,drive_view_url,tasks(status)').eq('user_id', clientId),
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
                    task_id: a.task_id,
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
                    task_id: c.task_id,
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
        Promise.all([
            fetchClients(),
            fetchProjects(),
            fetchTasks(),
            fetchClientCommentTaskIds(),
            fetchRequests()
        ]).finally(() => setLoading(false));
    }, [fetchClients, fetchProjects, fetchTasks, fetchClientCommentTaskIds, fetchRequests]);

    useEffect(() => {
        if (selectedClient) fetchClientExtras(selectedClient.id);
        else { setClientProjects([]); setClientContracts([]); }
    }, [selectedClient, fetchClientExtras]);

    useEffect(() => {
        setTaskComments([]);
        if (!expandedTaskId) { setCommentsTaskId(null); return; }
        setCommentsTaskId(expandedTaskId);
        fetchTaskTimeline(expandedTaskId);
    }, [expandedTaskId, fetchTaskTimeline]);

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
        const reqCh = supabase.channel('admin-requests')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'project_requests' }, () => fetchRequests())
            .subscribe();
        return () => {
            supabase.removeChannel(taskCh);
            supabase.removeChannel(projCh);
            supabase.removeChannel(commentCh);
            supabase.removeChannel(actCh);
            supabase.removeChannel(reqCh);
        };
    }, [fetchTasks, fetchProjects, commentsTaskId, fetchTaskTimeline, fetchRequests]);

    // ── Actions ──────────────────────────────────────────────────
    const handleConvertRequest = async (request: any) => {
        if (!confirm(`確定要將此需求「${request.title}」轉化為專案任務嗎？`)) return;
        try {
            // Format task title (use AI polished title if available)
            const finalTitle = request.ai_title || request.title;

            // Format task description combining raw input and AI suggestions
            let finalDesc = request.description || '';
            if (request.ai_structured_content) {
                const features = request.ai_structured_content.features || [];
                const deliverables = request.ai_structured_content.deliverables || [];
                if (features.length > 0 || deliverables.length > 0) {
                    finalDesc += `\n\n### ⚡ AI 規格梳理建議`;
                    if (features.length > 0) {
                        finalDesc += `\n**功能點 (Features):**\n` + features.map((f: string) => `- ${f}`).join('\n');
                    }
                    if (deliverables.length > 0) {
                        finalDesc += `\n\n**交付物 (Deliverables):**\n` + deliverables.map((d: string) => `- ${d}`).join('\n');
                    }
                }
            }

            // 1. Insert into tasks
            const { error: insertErr } = await supabase
                .from('tasks')
                .insert({
                    project_id: request.project_id,
                    user_id: request.client_id,
                    title: finalTitle,
                    description: finalDesc,
                    status: 'QUEUED',
                    type: 'GENERAL',
                    priority: 'MED'
                });
            if (insertErr) throw insertErr;

            // 2. Update request status to '已轉任務'
            const { error: updateErr } = await supabase
                .from('project_requests')
                .update({ status: '已轉任務' })
                .eq('id', request.id);
            if (updateErr) throw updateErr;

            alert('已成功轉化為任務並加入 Todo 佇列！');
            setSelectedRequest(null);
            fetchRequests();
            fetchTasks();
            fetchProjects();
        } catch (err: any) {
            console.error(err);
            alert(`操作失敗：${err.message}`);
        }
    };

    const handleDeclineRequest = async (request: any) => {
        if (!confirm(`確定要婉拒此需求「${request.title}」嗎？`)) return;
        try {
            const { error } = await supabase
                .from('project_requests')
                .update({ status: '已婉拒' })
                .eq('id', request.id);
            if (error) throw error;

            alert('已婉拒該需求。');
            setSelectedRequest(null);
            fetchRequests();
        } catch (err: any) {
            console.error(err);
            alert(`操作失敗：${err.message}`);
        }
    };

    const createProject = useCallback(async () => {
        if (!newProjectClientId) { setNewProjectError('請先選擇 client'); return; }
        if (!newProjectName.trim()) { setNewProjectError('請填寫專案名稱'); return; }
        setNewProjectError('');
        setNewProjectLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('無法取得驗證 Token');

            const res = await fetch('/api/admin/create-project', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newProjectName.trim(),
                    userId: newProjectClientId
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || '建立失敗');
            }

            if (data.warning) {
                alert(`警告：${data.warning}`);
            }

            setNewProjectName('');
            setNewProjectClientId('');
            fetchProjects();
        } catch (err: any) {
            alert(`建立專案失敗：${err.message}`);
        } finally {
            setNewProjectLoading(false);
        }
    }, [newProjectName, newProjectClientId, fetchProjects]);

    const handleGenerateDriveFolders = useCallback(async (projectId: string) => {
        setGeneratingDriveProjectId(projectId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('無法取得驗證 Token');

            const res = await fetch('/api/admin/generate-drive-folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ projectId })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || '建立失敗');
            }

            alert('Google Drive 資料夾成功建立！');
            fetchProjects();
        } catch (err: any) {
            alert(`建立資料夾失敗：${err.message}`);
        } finally {
            setGeneratingDriveProjectId(null);
        }
    }, [fetchProjects]);

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
                                {item.key === 'contracts' && <PenIcon             ref={el => { iconRefs.current[i] = el; }} size={16} />}
                                {item.key === 'projects'  && <LayoutDashboardIcon ref={el => { iconRefs.current[i] = el; }} size={16} />}
                                {item.key === 'files'     && <RocketIcon          ref={el => { iconRefs.current[i] = el; }} size={16} />}
                                {item.key === 'inbox'     && <MailFilledIcon      ref={el => { iconRefs.current[i] = el; }} size={16} />}
                                {item.key === 'settings'  && <GearIcon            ref={el => { iconRefs.current[i] = el; }} size={16} />}
                            </span>
                            <span className="flex-1">{item.label}</span>
                            {item.key === 'inbox' && unreadRequestCount > 0 && (
                                <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                                    {unreadRequestCount}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
                <div className="px-3 py-3 border-t border-zinc-900 space-y-3">
                    <div className="bg-zinc-900/80 rounded-lg px-3 py-2">
                        <div className="text-[13px] text-zinc-600 mb-0.5">ADMIN ACCESS</div>
                        <div className="text-[13px] text-[#3b82f6] font-bold">Jagger Team</div>
                        <div className="flex items-center gap-1 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[13px] text-blue-500">Active</span>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        onMouseEnter={() => logoutIconRef.current?.startAnimation()}
                        onMouseLeave={() => logoutIconRef.current?.stopAnimation()}
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors py-1.5 border border-zinc-900 rounded hover:border-red-400/40"
                    >
                        <span className="pointer-events-none">
                            <LogoutIcon ref={logoutIconRef} size={14} strokeWidth={2} color="currentColor" />
                        </span>
                        Sign out
                    </button>
                </div>
            </aside>

            {/* ── Main ─────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Topbar */}
                <div className="h-12 border-b border-zinc-900 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-3 select-none">
                        <span className="text-xs text-zinc-650 font-mono">ADMIN</span>
                        <span className="text-zinc-800">›</span>
                        <button
                            onClick={() => {
                                if (activeNav === 'projects') {
                                    setSelectedProject(null);
                                    setExpandedTaskId(null);
                                    setAddingToColumn(null);
                                } else if (activeNav === 'clients') {
                                    setSelectedClient(null);
                                }
                            }}
                            className={`text-xs uppercase font-mono transition-colors ${
                                (activeNav === 'projects' && selectedProject) || (activeNav === 'clients' && selectedClient)
                                    ? 'text-zinc-500 hover:text-zinc-350 cursor-pointer'
                                    : 'text-zinc-300 pointer-events-none'
                            }`}
                        >
                            {activeNav}
                        </button>
                        {activeNav === 'projects' && selectedProject && (
                            <>
                                <span className="text-zinc-800">›</span>
                                <span className="text-xs text-zinc-350 truncate max-w-[200px] font-mono">{selectedProject.name}</span>
                            </>
                        )}
                        {activeNav === 'clients' && selectedClient && (
                            <>
                                <span className="text-zinc-800">›</span>
                                <span className="text-xs text-zinc-350 truncate max-w-[200px] font-mono">{selectedClient.name}</span>
                            </>
                        )}
                        {activeNav === 'clients' && !selectedClient && (
                            <span className="text-xs text-zinc-600 border border-zinc-900 px-1.5 py-0.5 rounded font-mono">
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
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border tracking-widest shrink-0 ${c.status === 'SIGNED' ? 'text-emerald-400 border-emerald-950 bg-emerald-950/20' : 'text-yellow-400 border-yellow-950 bg-yellow-950/20'}`}>
                                                                {c.status === 'SIGNED' ? '已簽署' : '待付款'}
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
                                    /* Split View: Clients on the left, their projects on the right */
                                    const clientList = clients.filter(c => c.role !== 'admin');
                                    const selectedClientObj = clientList.find(c => c.id === projectTabClientId);
                                    const activeClientProjects = projectTabClientId
                                        ? projects.filter(p => p.user_id === projectTabClientId)
                                        : [];

                                    return (
                                        <div className="flex h-full w-full overflow-hidden divide-x divide-zinc-900/60">
                                            {/* Left Pane: Clients List */}
                                            <div className="w-[240px] shrink-0 flex flex-col bg-[#000000]">
                                                <div className="px-4 py-[15px] border-b border-zinc-900 shrink-0">
                                                    <div className="text-xs text-zinc-650 tracking-widest font-mono">// CLIENTS</div>
                                                </div>
                                                <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/30">
                                                    {clientList.length === 0 ? (
                                                        <div className="px-4 py-12 text-center text-zinc-700 text-xs font-mono">// NO CLIENTS</div>
                                                    ) : clientList.map(client => {
                                                        const isSelected = projectTabClientId === client.id;
                                                        const clientProjectsCount = projects.filter(p => p.user_id === client.id).length;
                                                        return (
                                                            <button
                                                                key={client.id}
                                                                onClick={() => {
                                                                    setProjectTabClientId(isSelected ? null : client.id);
                                                                    setNewProjectClientId(isSelected ? '' : client.id);
                                                                }}
                                                                className={`w-full text-left px-4 py-3 transition-colors ${isSelected ? 'bg-zinc-900' : 'hover:bg-zinc-900/40'}`}
                                                            >
                                                                <div className="text-sm text-zinc-200 font-bold truncate">{client.name}</div>
                                                                <div className="text-[11px] text-zinc-500 truncate mt-0.5">{client.email}</div>
                                                                <div className="text-[10px] text-zinc-655 font-mono mt-1.5 flex items-center justify-between">
                                                                    <span>{clientProjectsCount} 個專案</span>
                                                                    {isSelected && <span className="text-[#FF5500]">ACTIVE ›</span>}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Right Pane: Selected Client's Projects */}
                                            <div className="flex-1 flex flex-col bg-[#000000] overflow-y-auto">
                                                {!projectTabClientId ? (
                                                    <div className="flex flex-col items-center justify-center flex-1 gap-2 text-zinc-700 font-mono">
                                                        <span className="text-sm tracking-widest">// SELECT A CLIENT</span>
                                                        <span className="text-xs">請從左側選擇客戶來管理專案</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col h-full">
                                                        {/* Header with New Project Form */}
                                                        <div className="px-5 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-[#080809]">
                                                            <div>
                                                                <span className="text-[10px] text-zinc-600 font-mono tracking-widest">// PROJECTS OF</span>
                                                                <h2 className="text-sm font-bold text-white font-mono mt-0.5">{selectedClientObj?.name || '專案列表'}</h2>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={newProjectName}
                                                                    onChange={e => setNewProjectName(e.target.value)}
                                                                    placeholder="輸入專案名稱…"
                                                                    className="bg-zinc-950 text-xs border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-300 placeholder-zinc-700 outline-none w-44 focus:border-zinc-600 font-mono"
                                                                    onKeyDown={e => e.key === 'Enter' && createProject()}
                                                                />
                                                                <button
                                                                    onClick={createProject}
                                                                    disabled={newProjectLoading}
                                                                    className="text-xs bg-[#FF5500] text-black hover:bg-white px-3 py-1.5 rounded font-bold font-mono transition-colors disabled:opacity-50"
                                                                >
                                                                    {newProjectLoading ? '…' : '+ 建立專案'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {newProjectError && (
                                                            <div className="px-5 py-2 bg-red-950/20 border-b border-red-900/30 text-[10px] text-red-400 font-mono">
                                                                ⚠ {newProjectError}
                                                            </div>
                                                        )}

                                                        {/* Projects Grid */}
                                                        <div className="grid grid-cols-2 gap-4 p-5 flex-1 overflow-y-auto">
                                                            {activeClientProjects.length === 0 ? (
                                                                <div className="col-span-2 text-center py-12 text-zinc-700 text-sm italic font-mono">// 此客戶尚無專案</div>
                                                            ) : activeClientProjects.map(p => {
                                                                const { total, done, pct } = getProjectProgress(p);
                                                                return (
                                                                    <div key={p.id}
                                                                        onClick={() => setSelectedProject(p)}
                                                                        className="bg-zinc-950/30 border border-zinc-900 rounded-xl p-4 cursor-pointer hover:border-zinc-700 transition-colors h-fit">
                                                                        <div className="flex items-start justify-between mb-3">
                                                                            <div>
                                                                                <div className="text-sm font-bold text-zinc-200 mb-0.5 font-mono">{p.name}</div>
                                                                                <div className="text-[11px] text-zinc-600 font-mono">{p.client_name}</div>
                                                                            </div>
                                                                            <span className={`text-[10px] font-mono border rounded px-1.5 py-0.5 shrink-0 ml-2 ${BADGE_COLOR[p.status] ?? 'text-zinc-600 border-zinc-800'}`}>{p.status}</span>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <div className="flex items-center justify-between text-xs">
                                                                                <span className="text-zinc-650 font-mono">{total} tasks</span>
                                                                                <span className="text-zinc-400 font-mono">{pct}%</span>
                                                                            </div>
                                                                            <div className="bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: '#FF5500' }} />
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                                                {KANBAN_COLS.map(s => {
                                                                                    const cnt = p.task_stats?.find(x => x.status === s)?.count || 0;
                                                                                    return cnt > 0 ? (
                                                                                        <span key={s} className="text-[9px] px-1 py-0.5 rounded border flex items-center gap-1 font-mono"
                                                                                            style={{ color: STATUS_COLOR[s], borderColor: `${STATUS_COLOR[s]}40` }}>
                                                                                            <StatusIcon status={s} className="w-2.5 h-2.5" />
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
                                                )}
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
                                            {selectedProject.drive_upload_url && (
                                                <a href={selectedProject.drive_upload_url} target="_blank" rel="noreferrer"
                                                    onMouseEnter={() => boardUploadIconRef.current?.startAnimation()}
                                                    onMouseLeave={() => boardUploadIconRef.current?.stopAnimation()}
                                                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-900/60 bg-emerald-950/20 hover:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg transition-colors font-mono font-bold">
                                                    <RocketIcon ref={boardUploadIconRef} size={15} color="currentColor" className="pointer-events-none" />
                                                    上傳區 ↗
                                                </a>
                                            )}
                                            {selectedProject.drive_view_url && (
                                                <a href={selectedProject.drive_view_url} target="_blank" rel="noreferrer"
                                                    onMouseEnter={() => boardDownloadIconRef.current?.startAnimation()}
                                                    onMouseLeave={() => boardDownloadIconRef.current?.stopAnimation()}
                                                    className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 border border-sky-900/60 bg-sky-950/20 hover:bg-sky-950/40 px-2.5 py-1.5 rounded-lg transition-colors font-mono font-bold">
                                                    <DownloadIcon ref={boardDownloadIconRef} size={15} color="currentColor" className="pointer-events-none" />
                                                    交付區 ↗
                                                </a>
                                            )}
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
                                        {/* Kanban columns + Drawer side-by-side */}
                                        <div className="flex-1 flex overflow-hidden">
                                            {/* Column Scroll Container */}
                                            <div className="flex-1 overflow-x-auto p-5">
                                                <div className="flex gap-4 min-w-[900px] h-full">
                                                    {KANBAN_COLS.map(colStatus => {
                                                        const colTasks = tasks.filter(t => t.project_id === selectedProject.id && t.status === colStatus);
                                                        const isAdding = addingToColumn === colStatus;
                                                        return (
                                                            <div key={colStatus} className="flex-1 flex flex-col min-w-[220px] bg-zinc-950/50 border border-zinc-900 rounded-lg">
                                                                {/* Column header */}
                                                                <div className="px-3 py-2.5 border-b border-zinc-900 flex items-center gap-2 shrink-0">
                                                                    <StatusIcon status={colStatus} className="shrink-0" style={{ color: STATUS_COLOR[colStatus] }} />
                                                                    <span className="text-xs font-bold font-mono" style={{ color: STATUS_COLOR[colStatus] }}>{STATUS_LABEL[colStatus]}</span>
                                                                    <span className="text-xs text-zinc-650 ml-auto font-mono">{colTasks.length}</span>
                                                                </div>
                                                                {/* Task cards */}
                                                                <div className="flex-1 overflow-y-auto p-2 space-y-2"
                                                                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#27272a transparent' }}>
                                                                    {colTasks.map(t => {
                                                                        const isSelected = expandedTaskId === t.id;
                                                                        return (
                                                                            <div
                                                                                key={t.id}
                                                                                onClick={() => {
                                                                                    setExpandedTaskId(isSelected ? null : t.id);
                                                                                    if (!isSelected) setActivityDraft('');
                                                                                }}
                                                                                className={`bg-zinc-900/60 border rounded-lg p-2.5 cursor-pointer transition-all group ${
                                                                                    isSelected ? 'border-[#3b82f6]/60 bg-zinc-900' : 'border-zinc-900 hover:border-zinc-800'
                                                                                }`}
                                                                            >
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
                                                                                        <div className={`p-1 rounded border transition-colors flex items-center justify-center ${
                                                                                            t.priority === 'HIGH' ? 'text-zinc-650 border-zinc-900 group-hover:text-red-400 group-hover:border-red-950/60' :
                                                                                            t.priority === 'MED'  ? 'text-zinc-650 border-zinc-900 group-hover:text-yellow-450 group-hover:border-yellow-950/60' :
                                                                                            'text-zinc-650 border-zinc-900 group-hover:text-zinc-350 group-hover:border-zinc-800'
                                                                                        }`} title={`優先級: ${t.priority}`}>
                                                                                            <PriorityIcon priority={t.priority} />
                                                                                        </div>
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
                                                                                    {['GENERAL','BRAND','WEB','PRINT','DEV','DESIGN'].map(typeOpt => <option key={typeOpt} value={typeOpt}>{typeOpt}</option>)}
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

                                            {/* ── Slide-in right drawer for task details (Linear style) ── */}
                                            {(() => {
                                                const activeTask = tasks.find(t => t.id === expandedTaskId);
                                                if (!activeTask) return null;
                                                return (
                                                    <div className="w-[460px] shrink-0 border-l border-zinc-900 flex flex-col bg-[#0A0A0B] overflow-hidden relative"
                                                        style={{ animation: 'slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                                        <style dangerouslySetInnerHTML={{__html: `
                                                            @keyframes slideInRight {
                                                                from { transform: translateX(100%); }
                                                                to { transform: translateX(0); }
                                                            }
                                                        `}} />
                                                        {/* Header */}
                                                        <div className="px-5 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
                                                            <div className="min-w-0 flex-1 pr-4">
                                                                <span className="text-[10px] text-zinc-600 font-mono tracking-widest">{activeTask.id}</span>
                                                                <h2 className="text-sm font-bold text-white leading-snug mt-0.5 truncate" title={activeTask.title}>{activeTask.title}</h2>
                                                            </div>
                                                            <button onClick={() => setExpandedTaskId(null)} className="text-zinc-600 hover:text-zinc-400 text-[13px] transition-colors p-1">✕</button>
                                                        </div>
                                                        {/* Body */}
                                                        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4"
                                                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#27272a transparent' }}>

                                                            {/* Properties Grid (Linear style) */}
                                                            <div className="border border-zinc-900 rounded-lg p-3 bg-zinc-950/20 text-xs space-y-3">
                                                                <div className="flex items-center justify-between py-1 border-b border-zinc-900/40">
                                                                    <span className="text-zinc-500 tracking-wider font-mono">STATUS</span>
                                                                    <select
                                                                        value={activeTask.status}
                                                                        onChange={e => updateTaskStatus(activeTask.id, e.target.value)}
                                                                        className="bg-zinc-950 text-xs border border-zinc-800 rounded px-1.5 py-1 text-zinc-400 outline-none cursor-pointer w-32"
                                                                    >
                                                                        {KANBAN_COLS.map(s => (
                                                                            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div className="flex items-center justify-between py-1 border-b border-zinc-900/40">
                                                                    <span className="text-zinc-500 tracking-wider font-mono">PRIORITY</span>
                                                                    <select
                                                                        value={activeTask.priority}
                                                                        onChange={async (e) => {
                                                                            const newVal = e.target.value;
                                                                            const { error } = await supabase.from('tasks').update({ priority: newVal }).eq('id', activeTask.id);
                                                                            if (!error) fetchTasks();
                                                                        }}
                                                                        className="bg-zinc-950 text-xs border border-zinc-800 rounded px-1.5 py-1 text-zinc-400 outline-none cursor-pointer w-32"
                                                                    >
                                                                        <option value="HIGH">↑ High</option>
                                                                        <option value="MED">→ Medium</option>
                                                                        <option value="LOW">↓ Low</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex items-center justify-between py-1 border-b border-zinc-900/40">
                                                                    <span className="text-zinc-500 tracking-wider font-mono">TYPE</span>
                                                                    <select
                                                                        value={activeTask.type}
                                                                        onChange={async (e) => {
                                                                            const newVal = e.target.value;
                                                                            const { error } = await supabase.from('tasks').update({ type: newVal }).eq('id', activeTask.id);
                                                                            if (!error) fetchTasks();
                                                                        }}
                                                                        className="bg-zinc-950 text-xs border border-zinc-800 rounded px-1.5 py-1 text-zinc-400 outline-none cursor-pointer w-32"
                                                                    >
                                                                        {['GENERAL','BRAND','WEB','PRINT','DEV','DESIGN'].map(typeOpt => <option key={typeOpt} value={typeOpt}>{typeOpt}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="flex items-center justify-between py-1">
                                                                    <span className="text-zinc-500 tracking-wider font-mono">ETA</span>
                                                                    <input
                                                                        type="text"
                                                                        value={activeTask.eta || ''}
                                                                        placeholder="ETA (e.g. 3d)"
                                                                        onChange={async (e) => {
                                                                            const newVal = e.target.value;
                                                                            setTasks(prev => prev.map(x => x.id === activeTask.id ? { ...x, eta: newVal } : x));
                                                                        }}
                                                                        onBlur={async (e) => {
                                                                            await supabase.from('tasks').update({ eta: e.target.value }).eq('id', activeTask.id);
                                                                            fetchTasks();
                                                                        }}
                                                                        className="bg-zinc-950 text-xs border border-zinc-800 rounded px-2 py-1 text-zinc-300 outline-none w-32 text-right"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Description */}
                                                            <div className="border border-zinc-900 rounded-lg p-3 bg-zinc-950/20">
                                                                <div className="text-[10px] text-zinc-600 tracking-widest mb-1.5 font-mono">// DESCRIPTION</div>
                                                                <textarea
                                                                    value={activeTask.description || ''}
                                                                    placeholder="點擊輸入任務描述..."
                                                                    onChange={(e) => {
                                                                        const newVal = e.target.value;
                                                                        setTasks(prev => prev.map(x => x.id === activeTask.id ? { ...x, description: newVal } : x));
                                                                    }}
                                                                    onBlur={async (e) => {
                                                                        await supabase.from('tasks').update({ description: e.target.value }).eq('id', activeTask.id);
                                                                        fetchTasks();
                                                                    }}
                                                                    rows={3}
                                                                    className="w-full bg-transparent text-xs text-zinc-400 placeholder-zinc-700 outline-none resize-none focus:text-zinc-200"
                                                                />
                                                            </div>

                                                            {/* Unified Chronological Feed */}
                                                            <div className="border border-zinc-900 rounded-lg p-4 flex-1 flex flex-col min-h-[300px] bg-zinc-950/40">
                                                                <div className="text-[10px] text-zinc-600 tracking-widest mb-3 font-mono flex items-center gap-2">
                                                                    <SatelliteDishIcon size={20} className="text-[#3b82f6]" />
                                                                    <span>// DISCUSSION & ACTIVITIES</span>
                                                                </div>
                                                                <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 max-h-[320px]" style={{ scrollbarWidth: 'thin' }}>
                                                                    {taskComments.length === 0 ? (
                                                                        <div className="text-xs text-zinc-700 italic text-center py-6">尚無對話或動態</div>
                                                                    ) : (
                                                                        taskComments.map(item => {
                                                                            if (item.type === 'activity') {
                                                                                if (!item.content?.trim()) return null;
                                                                                return (
                                                                                    <div key={item.id} className="flex flex-col items-end">
                                                                                        <div className="flex items-center gap-1.5 px-1 text-[9px] text-zinc-600 font-mono">
                                                                                            <span className="text-[#3b82f6] font-bold">Jagger Team</span>
                                                                                            <span>·</span>
                                                                                            <span>{new Date(item.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                        </div>
                                                                                        <div className="mt-1 max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed bg-zinc-900 text-zinc-200 border border-zinc-800 font-mono">
                                                                                            ⚡ {item.content}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            } else {
                                                                                const isAdmin = item.is_admin;
                                                                                return (
                                                                                    <div key={item.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                                                                                        <div className="flex items-center gap-1.5 px-1 text-[9px] text-zinc-600 font-mono">
                                                                                            <span className={isAdmin ? 'text-[#3b82f6]' : 'text-zinc-400'}>{isAdmin ? 'Jagger Team' : 'Client'}</span>
                                                                                            <span>·</span>
                                                                                            <span>{new Date(item.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                        </div>
                                                                                        <div className={`mt-1 max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                                                                                            isAdmin
                                                                                                ? 'bg-zinc-900 text-zinc-200 border border-zinc-800'
                                                                                                : 'bg-[#3b82f6]/5 text-[#3b82f6] border border-[#3b82f6]/20'
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

                                                                {/* Action Input Box */}
                                                                <div className="space-y-2.5 mt-auto">
                                                                    <textarea
                                                                        value={activityDraft}
                                                                        onChange={e => setActivityDraft(e.target.value)}
                                                                        placeholder="輸入訊息或進度更新..."
                                                                        rows={2}
                                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-700 outline-none resize-none focus:border-[#3b82f6]/40"
                                                                    />
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1" />
                                                                        <button
                                                                            onClick={() => submitComment(activeTask.id)}
                                                                            disabled={activityLoading || !activityDraft.trim()}
                                                                            className="text-[10px] border border-[#3b82f6]/40 text-[#3b82f6] px-3 py-1.5 rounded font-bold disabled:opacity-50 transition-colors hover:bg-[#3b82f6]/10"
                                                                        >
                                                                            傳送留言
                                                                        </button>
                                                                        <button
                                                                            onClick={() => submitActivity(activeTask.id)}
                                                                            disabled={activityLoading || !activityDraft.trim()}
                                                                            className="text-[10px] bg-[#3b82f6] text-black px-3 py-1.5 rounded font-bold disabled:opacity-50 transition-colors hover:bg-white"
                                                                        >
                                                                            發布動態
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── FILES ────────────────────────────────────────── */}
                            {activeNav === 'files' && (() => {
                                const selectedClientObj = clients.find(c => c.id === filesTabClientId);
                                const clientProjs = projects.filter(p => p.user_id === filesTabClientId);

                                return (
                                    <div className="flex h-full overflow-hidden">
                                        {/* Left Side: Client list */}
                                        <div className="w-64 border-r border-zinc-900 flex flex-col bg-[#000000] shrink-0">
                                            <div className="px-5 py-3 border-b border-zinc-900 flex items-center justify-between bg-[#080809]">
                                                <span className="text-[10px] text-zinc-650 font-mono tracking-widest">// CLIENTS</span>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
                                                {clients.map(client => (
                                                    <button
                                                        key={client.id}
                                                        onClick={() => setFilesTabClientId(client.id)}
                                                        className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-mono transition-colors flex flex-col gap-0.5 ${
                                                            filesTabClientId === client.id
                                                                ? 'bg-zinc-900 text-white'
                                                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                                                        }`}
                                                    >
                                                        <span className="font-bold">{client.name || '未設定名稱'}</span>
                                                        <span className="text-[10px] text-zinc-600 truncate">{client.email}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Right Side: Shared Folders list */}
                                        <div className="flex-1 flex flex-col bg-[#000000] overflow-hidden">
                                            <div className="px-5 py-3 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-[#080809]">
                                                <div>
                                                    <span className="text-[10px] text-zinc-650 font-mono tracking-widest">// CLOUD STORAGE MANAGEMENT</span>
                                                    <h2 className="text-sm font-bold text-white font-mono mt-0.5">雲端硬碟管理</h2>
                                                </div>
                                            </div>

                                            <div className="flex-1 overflow-y-auto p-6">
                                                {!selectedClientObj ? (
                                                    <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-700 font-mono py-24">
                                                        <span className="text-xs tracking-widest">// SELECT CLIENT</span>
                                                        <span className="text-[11px]">請在左側選擇客戶以管理其專案雲端資料夾。</span>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6 max-w-3xl">
                                                        {/* Client Info Banner */}
                                                        <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-5 flex items-center justify-between">
                                                            <div>
                                                                <span className="text-[10px] text-zinc-600 font-mono tracking-widest">// CLIENT INFO</span>
                                                                <div className="text-sm font-bold text-zinc-300 mt-0.5 font-mono">
                                                                    {selectedClientObj.name} ({selectedClientObj.email})
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] font-mono border border-blue-900 text-blue-400 bg-blue-950/20 px-2.5 py-0.5 rounded-full uppercase">
                                                                {clientProjs.length} Projects
                                                            </span>
                                                        </div>

                                                        {/* Project List */}
                                                        <div className="space-y-4">
                                                            <div className="text-[10px] text-zinc-600 font-mono tracking-widest px-1">// ASSOCIATED FOLDERS</div>
                                                            
                                                            {clientProjs.length === 0 ? (
                                                                <div className="text-xs text-zinc-700 font-mono p-4 border border-dashed border-zinc-900 rounded-lg text-center bg-zinc-950/20">
                                                                    該客戶目前沒有任何專案。
                                                                </div>
                                                            ) : (
                                                                clientProjs.map(project => {
                                                                    const isGenerating = generatingDriveProjectId === project.id;
                                                                    const hasUrls = project.drive_upload_url || project.drive_view_url;

                                                                    return (
                                                                        <div key={project.id} className="bg-zinc-950/20 border border-zinc-900 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-zinc-800 transition-colors">
                                                                            <div>
                                                                                <div className="text-xs font-bold text-zinc-300 font-mono">{project.name}</div>
                                                                                <div className="text-[10px] text-zinc-600 font-mono mt-0.5">專案狀態: {project.status}</div>
                                                                            </div>

                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                {hasUrls ? (
                                                                                    <>
                                                                                        {project.drive_upload_url && (
                                                                                            <a
                                                                                                href={project.drive_upload_url}
                                                                                                target="_blank"
                                                                                                rel="noreferrer"
                                                                                                onMouseEnter={() => uploadIconRefs.current.get(project.id)?.startAnimation()}
                                                                                                onMouseLeave={() => uploadIconRefs.current.get(project.id)?.stopAnimation()}
                                                                                                className="inline-flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-900/60 bg-emerald-950/20 hover:bg-emerald-950/40 px-3 py-2 rounded-lg font-bold font-mono transition-colors"
                                                                                            >
                                                                                                <RocketIcon
                                                                                                    ref={el => { if (el) uploadIconRefs.current.set(project.id, el); }}
                                                                                                    size={16} color="currentColor" className="pointer-events-none"
                                                                                                />
                                                                                                上傳區 (Editor) ↗
                                                                                            </a>
                                                                                        )}
                                                                                        {project.drive_view_url && (
                                                                                            <a
                                                                                                href={project.drive_view_url}
                                                                                                target="_blank"
                                                                                                rel="noreferrer"
                                                                                                onMouseEnter={() => downloadIconRefs.current.get(project.id)?.startAnimation()}
                                                                                                onMouseLeave={() => downloadIconRefs.current.get(project.id)?.stopAnimation()}
                                                                                                className="inline-flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 border border-sky-900/60 bg-sky-950/20 hover:bg-sky-950/40 px-3 py-2 rounded-lg font-bold font-mono transition-colors"
                                                                                            >
                                                                                                <DownloadIcon
                                                                                                    ref={el => { if (el) downloadIconRefs.current.set(project.id, el); }}
                                                                                                    size={16} color="currentColor" className="pointer-events-none"
                                                                                                />
                                                                                                交付區 (Viewer) ↗
                                                                                            </a>
                                                                                        )}
                                                                                    </>
                                                                                ) : (
                                                                                    <button
                                                                                        onClick={() => handleGenerateDriveFolders(project.id)}
                                                                                        disabled={isGenerating}
                                                                                        onMouseEnter={() => plugIconRefs.current.get(project.id)?.startAnimation()}
                                                                                        onMouseLeave={() => plugIconRefs.current.get(project.id)?.stopAnimation()}
                                                                                        className="inline-flex items-center gap-2 text-xs text-[#FF5500] hover:text-[#FF7733] border border-[#FF5500]/40 bg-[#FF5500]/10 hover:bg-[#FF5500]/20 px-3 py-2 rounded-lg font-bold font-mono transition-colors disabled:opacity-40"
                                                                                    >
                                                                                        <PlugConnectedIcon
                                                                                            ref={el => { if (el) plugIconRefs.current.set(project.id, el); }}
                                                                                            size={19} color="currentColor" className="pointer-events-none"
                                                                                        />
                                                                                        {isGenerating ? '建立中…' : '建立雲端資料夾'}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── INBOX ────────────────────────────────────────────── */}
                            {activeNav === 'inbox' && (
                                <div className="flex h-full w-full overflow-hidden">
                                    {/* Left: Request list */}
                                    <div className="w-96 border-r border-zinc-900 flex flex-col shrink-0 bg-[#000000]">
                                        <div className="px-6 py-4 border-b border-zinc-900 shrink-0">
                                            <span className="text-[10px] text-zinc-500 font-mono tracking-widest">// TRIAGE INBOX</span>
                                            <h2 className="text-sm font-bold text-white font-mono mt-0.5">客戶需求追蹤</h2>
                                        </div>
                                        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/60 p-2 space-y-1">
                                            {requestsLoading ? (
                                                <div className="text-center py-8 text-xs text-zinc-500 font-mono">載入中…</div>
                                            ) : requests.length === 0 ? (
                                                <div className="text-center py-12 text-xs text-zinc-650 font-mono">目前尚無任何需求提案</div>
                                            ) : (
                                                requests.map(req => {
                                                    const isSelected = selectedRequest?.id === req.id;
                                                    const isUnread = !req.is_read;
                                                    return (
                                                        <button
                                                            key={req.id}
                                                            onClick={() => {
                                                                setSelectedRequest(req);
                                                                if (isUnread) markRequestAsRead(req.id);
                                                            }}
                                                            className={`w-full text-left p-3.5 rounded-xl transition-all font-mono flex flex-col gap-1.5 border border-transparent relative ${
                                                                isSelected ? 'bg-zinc-905 border-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-950/40 hover:text-zinc-300'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-1.5 w-full">
                                                                {isUnread && (
                                                                    <span className="relative flex h-2 w-2 shrink-0">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                                    </span>
                                                                )}
                                                                <span className="text-[10px] text-zinc-500 max-w-[60%] truncate">
                                                                    {req.profiles?.name || '未知客戶'} ({req.projects?.name || '未知專案'})
                                                                </span>
                                                                <span className="text-[9px] text-zinc-600 ml-auto">
                                                                    {new Date(req.created_at).toLocaleDateString('zh-TW')}
                                                                </span>
                                                            </div>
                                                            <div className={`text-xs truncate w-full ${isUnread ? 'font-bold text-zinc-200' : 'font-medium text-zinc-300'}`}>{req.title}</div>
                                                            <div className="text-[10px] text-zinc-600 line-clamp-2 leading-relaxed">
                                                                    {req.description}
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Selected Request Detail */}
                                    <div className="flex-1 flex flex-col overflow-hidden bg-[#000000] p-6">
                                        {selectedRequest ? (
                                            <div className="max-w-2xl w-full h-full flex flex-col justify-between font-mono">
                                                <div className="space-y-5 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                                                    {/* Header */}
                                                    <div className="border-b border-zinc-900 pb-4">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="text-[10px] bg-[#FF5500]/10 text-[#FF5500] border border-[#FF5500]/30 px-2 py-0.5 rounded uppercase tracking-wider">
                                                                {selectedRequest.status}
                                                            </span>
                                                            <span className="text-xs text-zinc-500">
                                                                專案：{selectedRequest.projects?.name || '—'}
                                                            </span>
                                                        </div>
                                                        <h1 className="text-lg font-black text-white leading-snug">{selectedRequest.title}</h1>
                                                        <div className="text-xs text-zinc-500 mt-2 flex items-center gap-3">
                                                            <span>客戶：{selectedRequest.profiles?.name} ({selectedRequest.profiles?.email})</span>
                                                            <span>•</span>
                                                            <span>提交時間：{new Date(selectedRequest.created_at).toLocaleString('zh-TW')}</span>
                                                        </div>
                                                    </div>

                                                    {/* Description Body */}
                                                    <div className="space-y-1.5">
                                                        <span className="text-[10px] text-zinc-600 tracking-wider">// DETAILED DESCRIPTION</span>
                                                        <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                                            {selectedRequest.description || '（無提供詳細描述）'}
                                                        </div>
                                                    </div>

                                                    {/* AI Structure Suggestions */}
                                                    {selectedRequest.ai_title && (
                                                        <div className="space-y-1.5 font-mono">
                                                            <span className="text-[10px] text-[#FF5500] tracking-wider">// AI 需求梳理成果</span>
                                                            <div className="border border-zinc-900 bg-zinc-950/40 rounded-xl p-4 space-y-3 text-xs">
                                                                <div>
                                                                    <span className="text-zinc-550 font-bold block mb-0.5">優化主題 (ai_title):</span>
                                                                    <span className="text-zinc-200">{selectedRequest.ai_title}</span>
                                                                </div>
                                                                {selectedRequest.ai_structured_content && (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-900/60">
                                                                        {selectedRequest.ai_structured_content.features && selectedRequest.ai_structured_content.features.length > 0 && (
                                                                            <div>
                                                                                <span className="text-zinc-550 font-bold block mb-1">功能規格點 (Features):</span>
                                                                                <ul className="list-disc pl-4 space-y-0.5 text-zinc-350 text-[11px]">
                                                                                    {selectedRequest.ai_structured_content.features.map((f: string, i: number) => (
                                                                                        <li key={i}>{f}</li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        )}
                                                                        {selectedRequest.ai_structured_content.deliverables && selectedRequest.ai_structured_content.deliverables.length > 0 && (
                                                                            <div>
                                                                                <span className="text-zinc-550 font-bold block mb-1">交付物清單 (Deliverables):</span>
                                                                                <ul className="list-disc pl-4 space-y-0.5 text-zinc-350 text-[11px]">
                                                                                    {selectedRequest.ai_structured_content.deliverables.map((d: string, i: number) => (
                                                                                        <li key={i}>{d}</li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Attachments from Google Drive */}
                                                    <div className="space-y-1.5">
                                                        <span className="text-[10px] text-zinc-650 tracking-wider">// ATTACHMENTS (GOOGLE DRIVE)</span>
                                                        {selectedRequest.drive_file_urls && selectedRequest.drive_file_urls.length > 0 ? (
                                                            <div className="border border-zinc-900 rounded-xl bg-zinc-950/20 p-3.5 space-y-2">
                                                                {selectedRequest.drive_file_urls.map((file: any, idx: number) => (
                                                                    <a
                                                                        key={idx}
                                                                        href={file.url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 hover:underline"
                                                                    >
                                                                        <span>📄</span>
                                                                        <span className="truncate">{file.name}</span>
                                                                        <span className="text-[10px] text-zinc-600 font-normal">↗</span>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-zinc-600 italic">無附加檔案</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action buttons */}
                                                <div className="border-t border-zinc-900 pt-5 flex items-center gap-4">
                                                    <button
                                                        onClick={() => handleConvertRequest(selectedRequest)}
                                                        className="flex-1 bg-[#FF5500] hover:bg-[#FF7733] text-black py-3 rounded-xl text-xs font-bold transition-colors"
                                                    >
                                                        一鍵生成任務
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeclineRequest(selectedRequest)}
                                                        className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 text-zinc-400 hover:text-zinc-200 px-6 py-3 rounded-xl text-xs font-bold transition-colors"
                                                    >
                                                        婉拒需求
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 font-mono gap-1.5">
                                                <span className="text-xs tracking-widest">// NO REQUEST SELECTED</span>
                                                <span className="text-[11px]">請在左側選擇一筆客戶提交的需求以進行審核。</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── SETTINGS ───────────────────────────────────────────────────── */}
                            {activeNav === 'settings' && (
                                <div className="flex-1 overflow-y-auto px-6 py-6" style={{ scrollbarWidth: 'thin' }}>
                                    <div className="max-w-xl space-y-6">
                                        <span className="text-[10px] text-zinc-600 tracking-widest font-mono">// SYSTEM SETTINGS</span>

                                        {/* 系統狀態 */}
                                        <div className="space-y-2">
                                            <div className="text-[10px] text-zinc-700 tracking-widest font-mono mb-2">// SERVICES STATUS</div>
                                            {[
                                                {
                                                    label: 'Supabase Database',
                                                    value: dbStatus === 'checking' ? 'CHECKING…' : dbStatus === 'ok' ? 'CONNECTED' : 'ERROR',
                                                    color: dbStatus === 'ok' ? 'text-emerald-400' : dbStatus === 'error' ? 'text-red-400' : 'text-zinc-500',
                                                },
                                                { label: 'PKCE Auth Flow',   value: 'ENABLED',   color: 'text-emerald-400' },
                                                { label: 'Realtime Channel', value: 'ACTIVE',    color: 'text-emerald-400' },
                                                { label: 'Admin Role',       value: 'VERIFIED',  color: 'text-[#3b82f6]'  },
                                            ].map(item => (
                                                <div key={item.label} className="flex items-center justify-between border border-zinc-900 rounded-lg px-4 py-3 bg-zinc-950/20">
                                                    <span className="text-sm text-zinc-400 font-mono">{item.label}</span>
                                                    <span className={`text-xs font-mono ${item.color}`}>● {item.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Admin 身份資訊 */}
                                        <div className="space-y-2">
                                            <div className="text-[10px] text-zinc-700 tracking-widest font-mono mb-2">// ADMIN IDENTITY</div>
                                            <div className="border border-zinc-900 rounded-xl p-4 bg-zinc-950/20 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-zinc-600 font-mono">NAME</span>
                                                    <span className="text-sm text-zinc-200 font-mono">{adminProfile?.name || '—'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-zinc-600 font-mono">EMAIL</span>
                                                    <span className="text-sm text-zinc-400 font-mono">{adminProfile?.email || '—'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-zinc-600 font-mono">ROLE</span>
                                                    <span className="text-xs font-mono border border-[#3b82f6]/40 text-[#3b82f6] bg-[#3b82f6]/10 px-2.5 py-0.5 rounded-full">admin</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 系統公告 */}
                                        <div className="space-y-2">
                                            <div className="text-[10px] text-zinc-700 tracking-widest font-mono mb-2">// 系統公告橫幅</div>
                                            <div className="border border-zinc-900 rounded-xl p-4 bg-zinc-950/20 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-sm text-zinc-300 font-mono">啟用公告</div>
                                                        <div className="text-[11px] text-zinc-600 font-mono mt-0.5">開啟後所有 Client 登入後頂部將顯示公告橫幅</div>
                                                    </div>
                                                    <button
                                                        onClick={() => setAnnouncement(a => ({ ...a, enabled: !a.enabled }))}
                                                        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                                                            announcement.enabled ? 'bg-[#FF5500]' : 'bg-zinc-800'
                                                        }`}
                                                    >
                                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                                            announcement.enabled ? 'translate-x-5' : 'translate-x-0'
                                                        }`} />
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-zinc-600 font-mono block mb-1.5">公告內容</label>
                                                    <textarea
                                                        value={announcement.text}
                                                        onChange={e => setAnnouncement(a => ({ ...a, text: e.target.value }))}
                                                        placeholder="輸入要顯示給所有 Client 的公告訊息…"
                                                        rows={3}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none focus:border-zinc-600 resize-none"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={handleSaveAnnouncement}
                                                        disabled={announceSaving}
                                                        className="text-[13px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-4 py-2 rounded-lg font-mono transition-colors disabled:opacity-40"
                                                    >
                                                        {announceSaving ? '儲存中…' : '發佈公告'}
                                                    </button>
                                                    {announceSaved && <span className="text-xs text-emerald-400 font-mono">● 已發佈</span>}
                                                </div>
                                                {announcement.enabled && announcement.text && (
                                                    <div className="border border-[#FF5500]/30 rounded-lg px-3 py-2 bg-[#FF5500]/5">
                                                        <div className="text-[10px] text-zinc-600 font-mono mb-1">// 預覽</div>
                                                        <div className="text-xs text-zinc-300 font-mono">{announcement.text}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 封存統計摘要 */}
                                        <div className="space-y-2">
                                            <div className="text-[10px] text-zinc-700 tracking-widest font-mono mb-2">// DATA OVERVIEW</div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {[
                                                    { label: 'Clients',  value: clients.length },
                                                    { label: 'Projects', value: projects.length },
                                                    { label: 'Tasks',    value: tasks.length },
                                                ].map(stat => (
                                                    <div key={stat.label} className="border border-zinc-900 rounded-xl p-4 bg-zinc-950/20 text-center">
                                                        <div className="text-2xl font-black text-[#FF5500] font-mono">{stat.value}</div>
                                                        <div className="text-[11px] text-zinc-600 font-mono mt-1">{stat.label}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 危險區 */}
                                        <div className="space-y-2">
                                            <div className="text-[10px] text-red-900 tracking-widest font-mono mb-2">// DANGER ZONE</div>
                                            <div className="border border-red-950 rounded-xl p-4 bg-red-950/10 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-sm text-zinc-300 font-mono">登出管理員帳號</div>
                                                        <div className="text-[11px] text-zinc-600 font-mono mt-0.5">結束此制材主要工作區旧回首頁</div>
                                                    </div>
                                                    <button
                                                        onClick={handleSignOut}
                                                        onMouseEnter={() => logoutIconRef2.current?.startAnimation()}
                                                        onMouseLeave={() => logoutIconRef2.current?.stopAnimation()}
                                                        className="flex items-center gap-1.5 text-xs border border-red-900/60 text-red-400 hover:bg-red-950/40 px-4 py-2 rounded-lg font-mono transition-colors"
                                                    >
                                                        <span className="pointer-events-none">
                                                            <LogoutIcon ref={logoutIconRef2} size={14} strokeWidth={2} color="currentColor" />
                                                        </span>
                                                        Sign Out
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between border-t border-zinc-900/60 pt-3">
                                                    <div>
                                                        <div className="text-sm text-zinc-300 font-mono">清除本地快取</div>
                                                        <div className="text-[11px] text-zinc-600 font-mono mt-0.5">清除 localStorage 中的已讀標記與暫存資料</div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const keys = Object.keys(localStorage).filter(k => k.startsWith('seen-admin-task-'));
                                                            keys.forEach(k => localStorage.removeItem(k));
                                                            alert(`已清除 ${keys.length} 筆快取記錄`);
                                                        }}
                                                        className="text-xs border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 px-4 py-2 rounded-lg font-mono transition-colors"
                                                    >
                                                        Clear Cache
                                                    </button>
                                                </div>
                                            </div>
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
