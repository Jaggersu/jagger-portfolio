'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useUserFlow } from '../../lib/userFlow';
import { supabase } from '../../lib/supabase';
import { LayoutList } from '../icons/LayoutList';
import { FileIcon } from '../icons/FileIcon';
import PenIcon from '../icons/PenIcon';
import { SettingsIcon } from '../icons/SettingsIcon';
import RocketIcon from '../icons/RocketIcon';
import DownloadIcon from '../icons/DownloadIcon';
import BrandAnthropicIcon from '../icons/BrandAnthropicIcon';
import AskAIDialog from './AskAIDialog';
import ContractPanel from './ContractPanel';
import XIcon from '../icons/XIcon';
import SatelliteDishIcon from '../icons/SatelliteDishIcon';
import MailFilledIcon from '../icons/MailFilledIcon';
import type { AnimatedIconHandle } from '../icons/types';

interface DashboardPanelProps {
    onClose: () => void;
    initialNav?: NavItem;
}

function StatusIcon({ status, className }: { status: string; className?: string }) {
    if (status === 'QUEUED') {
        return (
            <svg className={`w-3.5 h-3.5 ${className}`} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        );
    }
    if (status === 'IN_PROGRESS') {
        return (
            <svg className={`w-3.5 h-3.5 ${className}`} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 1.75C11.4518 1.75 14.25 4.54822 14.25 8C14.25 11.4518 11.4518 14.25 8 14.25V1.75Z" fill="currentColor" />
            </svg>
        );
    }
    if (status === 'REVIEW') {
        return (
            <svg className={`w-3.5 h-3.5 ${className}`} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.5 2.5" />
            </svg>
        );
    }
    if (status === 'DELIVERED') {
        return (
            <svg className={`w-3.5 h-3.5 ${className}`} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="6.25" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5.5 8L7 9.5L10.5 6" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    return (
        <svg className={`w-3.5 h-3.5 ${className}`} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
}

function PriorityIcon({ priority, className }: { priority: string; className?: string }) {
    const isLow = priority === 'LOW';
    const isMed = priority === 'MED';
    const isHigh = priority === 'HIGH';
    return (
        <svg className={`w-3.5 h-3.5 ${className}`} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="10" width="2.5" height="4" rx="0.5" fill={isLow || isMed || isHigh ? 'currentColor' : '#27272a'} />
            <rect x="6.75" y="7" width="2.5" height="7" rx="0.5" fill={isMed || isHigh ? 'currentColor' : '#27272a'} />
            <rect x="11.5" y="4" width="2.5" height="10" rx="0.5" fill={isHigh ? 'currentColor' : '#27272a'} />
        </svg>
    );
}

type TaskStatus = 'QUEUED' | 'IN_PROGRESS' | 'REVIEW' | 'DELIVERED';
type NavItem = 'projects' | 'inbox' | 'files' | 'contract' | 'settings';
type SettingsTab = 'account' | 'billing' | 'integrations';

interface ProjectRow {
    id: string;
    name: string;
    status: string;
    created_at: string;
    drive_upload_url?: string;
    drive_view_url?: string;
    google_drive_folder_url?: string;
}

interface Task {
    id: string;
    real_id: string;
    project_id?: string;
    title: string;
    status: TaskStatus;
    type: string;
    eta: string;
    priority: 'HIGH' | 'MED' | 'LOW';
    description?: string;
    ai_summary?: string;
}

interface TaskActivity {
    id: string;
    task_id: string;
    content: string;
    created_at: string;
    user_name?: string;
}

interface TaskComment {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    is_admin: boolean;
    created_at: string;
    user_name?: string;
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

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; dot: string; progress: number }> = {
    QUEUED:      { label: 'Todo',        color: 'text-zinc-500',    bg: 'bg-zinc-900',       dot: 'bg-zinc-600',                    progress: 0   },
    IN_PROGRESS: { label: 'In Progress', color: 'text-[#FF5500]',   bg: 'bg-[#FF5500]/10',   dot: 'bg-[#FF5500] animate-pulse',     progress: 50  },
    REVIEW:      { label: 'In Review',   color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  dot: 'bg-yellow-400',                  progress: 80  },
    DELIVERED:   { label: 'Done',        color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400',                 progress: 100 },
};

const PRIORITY_CONFIG = {
    HIGH: { label: 'High',   color: 'text-red-400',    icon: '↑' },
    MED:  { label: 'Medium', color: 'text-yellow-400', icon: '→' },
    LOW:  { label: 'Low',    color: 'text-zinc-600',   icon: '↓' },
};

const NAV: { key: NavItem; icon: React.ReactNode; label: string }[] = [
    { key: 'projects', icon: <LayoutList size={16} />,  label: '我的專案' },
    { key: 'inbox',    icon: <MailFilledIcon size={16} />, label: '我的需求' },
    { key: 'files',    icon: <RocketIcon size={16} />,    label: '檔案中心' },
    { key: 'contract', icon: <PenIcon size={16} />,     label: '我的合約' },
    { key: 'settings', icon: <SettingsIcon size={16} />, label: '帳戶設定' },
];

function fmt(bytes: number) {
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
    return `${bytes} B`;
}

interface AiPanel {
    task: Task;
    state: 'generating' | 'done' | 'error';
    summary: string;
    emailSent: boolean;
}

export default function DashboardPanel({ onClose, initialNav }: DashboardPanelProps) {
    const { profile, selectedPlan, reset, pendingPanel, clearPendingPanel } = useUserFlow();
    const [activeNav, setActiveNav]             = useState<NavItem>(initialNav ?? 'projects');
    const [hoveredNav, setHoveredNav]           = useState<NavItem | null>(null);
    const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);
    const [selectedTask, setSelectedTask]       = useState<Task | null>(null);
    const [projects, setProjects]               = useState<ProjectRow[]>([]);
    const [tasks, setTasks]                     = useState<Task[]>([]);
    const [files, setFiles]                     = useState<FileItem[]>([]);
    const [loading, setLoading]                 = useState(true);
    const [aiPanel, setAiPanel]                 = useState<AiPanel | null>(null);
    const [showAskAI, setShowAskAI]             = useState(false);
    const [selectedFileProjectId, setSelectedFileProjectId] = useState<string | null>(null);
    const [fileSearch, setFileSearch]           = useState('');
    const [driveLoading, setDriveLoading]       = useState<string | null>(null);
    const [settingsTab, setSettingsTab]         = useState<SettingsTab>('account');
    const contractIconRef                       = useRef<AnimatedIconHandle>(null);
    const jagAgentIconRef                       = useRef<AnimatedIconHandle>(null);
    const filesIconRef                          = useRef<AnimatedIconHandle>(null);
    const cardUploadIconRef                     = useRef<AnimatedIconHandle>(null);
    const cardDownloadIconRef                   = useRef<AnimatedIconHandle>(null);
    const [settingsForm, setSettingsForm]       = useState({
        displayName:      profile?.name  ?? '',
        notifyEmail:      profile?.email ?? '',
        lineId:           '',
        telegramWebhook:  '',
    });

    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestTitle, setRequestTitle]         = useState('');
    const [requestDesc, setRequestDesc]           = useState('');
    const [requestProjectId, setRequestProjectId] = useState('');
    const [requestFiles, setRequestFiles]         = useState<File[]>([]);
    const [uploadingFile, setUploadingFile]       = useState(false);
    const [submitLoading, setSubmitLoading]       = useState(false);

    const [clientRequests, setClientRequests] = useState<any[]>([]);
    const [clientRequestsLoading, setClientRequestsLoading] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

    const fetchClientRequests = useCallback(async () => {
        setClientRequestsLoading(true);
        const { data, error } = await supabase
            .from('project_requests')
            .select('*, projects(name)')
            .order('created_at', { ascending: false });
        if (!error && data) {
            setClientRequests(data);
            setSelectedRequestId(prev => {
                if (data.length === 0) return null;
                if (prev && data.some((r: any) => r.id === prev)) return prev;
                return data[0].id;
            });
        } else if (error) {
            console.error('Failed to fetch client requests:', error);
        }
        setClientRequestsLoading(false);
    }, []);

    useEffect(() => {
        if (activeNav === 'inbox') {
            fetchClientRequests();
        }
    }, [activeNav, fetchClientRequests]);

    useEffect(() => {
        if (projects.length > 0 && !requestProjectId) {
            setRequestProjectId(projects[0].id);
        }
    }, [projects, requestProjectId]);

    const handleFileUpload = async (filesToUpload: FileList) => {
        if (!requestProjectId) {
            alert('請先選擇所屬專案！');
            return;
        }
        const newFiles: File[] = [];
        for (let i = 0; i < filesToUpload.length; i++) {
            newFiles.push(filesToUpload[i]);
        }
        setRequestFiles(prev => [...prev, ...newFiles]);
    };

    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (uploadingFile || !requestProjectId) return;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files);
        }
    };

    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!requestProjectId) return;
        setSubmitLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('無法取得驗證 Token');

            // Step 1: Submit the request details (without files) to generate folder and DB record
            const formData = new FormData();
            formData.append('projectId', requestProjectId);
            formData.append('title', requestTitle);
            formData.append('description', requestDesc);

            const res = await fetch('/api/project-requests', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || '提交失敗');
            }

            const { id: requestId } = data.request;
            const folderId = data.folderId;

            // Step 2: Upload files individually if any exist
            if (requestFiles.length > 0 && folderId && requestId) {
                for (const file of requestFiles) {
                    const uploadData = new FormData();
                    uploadData.append('file', file);
                    uploadData.append('projectId', requestProjectId);
                    uploadData.append('folderId', folderId);
                    uploadData.append('requestId', requestId);

                    const uploadRes = await fetch('/api/drive-upload', {
                        method: 'POST',
                        body: uploadData,
                    });
                    if (!uploadRes.ok) {
                        const errData = await uploadRes.json();
                        throw new Error(errData.error || '檔案上傳失敗');
                    }
                }
            }

            alert('需求已成功提交，並已完成 AI 規格梳理與檔案上傳！');
            setShowRequestModal(false);
            setRequestTitle('');
            setRequestDesc('');
            setRequestFiles([]);
            fetchClientRequests();
        } catch (err: any) {
            console.error(err);
            alert(`提交失敗：${err.message}`);
        } finally {
            setSubmitLoading(false);
        }
    };

    useEffect(() => {
        if (pendingPanel) {
            setActiveNav(pendingPanel as NavItem);
            clearPendingPanel();
        }
    }, [pendingPanel, clearPendingPanel]);

    // ── Task detail: unified timeline feed ────────────────────────
    const [timeline, setTimeline]               = useState<any[]>([]);
    const [commentDraft, setCommentDraft]       = useState('');
    const [aiCommentDraft, setAiCommentDraft]   = useState('');
    const [commentLoading, setCommentLoading]   = useState(false);
    const [commentAiLoading, setCommentAiLoading] = useState(false);
    const chatEndRef                            = React.useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [timeline, scrollToBottom]);

    // Unread dots: tasks that have admin activity updates
    const [adminActivityTaskIds, setAdminActivityTaskIds] = useState<Set<string>>(new Set());

    // ── Supabase: fetch helpers ───────────────────────────────────
    const fetchProjects = useCallback(async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('id,name,status,created_at,drive_upload_url,drive_view_url,google_drive_folder_url')
            .order('created_at', { ascending: false });
        if (!error && data) setProjects(data);
    }, []);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tasks')
            .select('id,project_id,task_code,title,priority,type,status,eta,description,ai_summary')
            .order('created_at', { ascending: false });
        if (!error && data) {
            setTasks(data.map((r: any) => ({
                id:          r.task_code ?? r.id,
                real_id:     r.id,
                project_id:  r.project_id,
                title:       r.title,
                status:      r.status as TaskStatus,
                type:        r.type ?? '—',
                eta:         r.eta  ?? '—',
                priority:    r.priority as 'HIGH' | 'MED' | 'LOW',
                description: r.description ?? undefined,
                ai_summary:  r.ai_summary  ?? undefined,
            })));
        }
        setLoading(false);
    }, []);

    const fetchTaskTimeline = useCallback(async (taskId: string) => {
        const [{ data: acts, error: actErr }, { data: cmts, error: cmtErr }] = await Promise.all([
            supabase
                .from('task_activities')
                .select('id,task_id,content,created_at,profiles(name)')
                .eq('task_id', taskId),
            supabase
                .from('task_comments')
                .select('id,task_id,user_id,content,is_admin,created_at,profiles(name)')
                .eq('task_id', taskId)
        ]);

        if (actErr) console.error(actErr);
        if (cmtErr) console.error(cmtErr);

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

        // Sort chronologically (oldest first, newest last)
        merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setTimeline(merged);
    }, []);

    const fetchAdminActivityTaskIds = useCallback(async () => {
        const [{ data: acts }, { data: cmts }] = await Promise.all([
            supabase
                .from('task_activities')
                .select('id, task_id, created_at')
                .order('created_at', { ascending: false }),
            supabase
                .from('task_comments')
                .select('id, task_id, created_at')
                .eq('is_admin', true)
                .order('created_at', { ascending: false })
        ]);

        const latestIds: Record<string, { id: string; time: number }> = {};

        if (acts) {
            acts.forEach((a: any) => {
                const t = new Date(a.created_at).getTime();
                if (!latestIds[a.task_id] || t > latestIds[a.task_id].time) {
                    latestIds[a.task_id] = { id: `act-${a.id}`, time: t };
                }
            });
        }
        if (cmts) {
            cmts.forEach((c: any) => {
                const t = new Date(c.created_at).getTime();
                if (!latestIds[c.task_id] || t > latestIds[c.task_id].time) {
                    latestIds[c.task_id] = { id: `cmt-${c.id}`, time: t };
                }
            });
        }

        const unread = new Set<string>();
        Object.entries(latestIds).forEach(([taskId, item]) => {
            const seenId = localStorage.getItem(`seen-client-task-${taskId}`);
            if (seenId !== item.id) {
                unread.add(taskId);
            }
        });
        setAdminActivityTaskIds(unread);
    }, []);

    useEffect(() => {
        if (!selectedTask?.real_id || timeline.length === 0) return;
        const latest = timeline[timeline.length - 1];
        if (latest && latest.task_id === selectedTask.real_id) {
            localStorage.setItem(`seen-client-task-${selectedTask.real_id}`, latest.id);
            setAdminActivityTaskIds(prev => {
                const next = new Set(prev);
                next.delete(selectedTask.real_id);
                return next;
            });
        }
    }, [selectedTask?.real_id, timeline]);

    const fetchFiles = useCallback(async () => {
        const { data, error } = await supabase
            .from('files')
            .select('id,file_name,file_url,size,storage_path,google_drive_id,created_at')
            .order('created_at', { ascending: false });
        if (!error && data) {
            setFiles(data.map((r: any) => ({
                id:              r.id,
                file_name:       r.file_name,
                file_url:        r.file_url        ?? '#',
                size:            r.size            ?? 0,
                storage_path:    r.storage_path    ?? '',
                google_drive_id: r.google_drive_id ?? undefined,
                created_at:      r.created_at?.slice(0, 10) ?? '',
            })));
        }
    }, []);

    useEffect(() => {
        Promise.all([fetchProjects(), fetchTasks(), fetchAdminActivityTaskIds()]);
    }, [fetchProjects, fetchTasks, fetchAdminActivityTaskIds]);
    useEffect(() => { fetchFiles(); }, [fetchFiles]);

    // ── Supabase Realtime ─────────────────────────────────────────
    useEffect(() => {
        if (!profile?.id) return;
        const taskCh = supabase
            .channel('client-tasks')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${profile.id}` },
                () => { fetchTasks(); }
            ).subscribe();
        const projCh = supabase
            .channel('client-projects')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${profile.id}` },
                () => { fetchProjects(); fetchTasks(); }
            ).subscribe();
        const actCh = supabase
            .channel('client-activities')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'task_activities' },
                () => { fetchAdminActivityTaskIds(); }
            ).subscribe();
        const cmtCh = supabase
            .channel('client-comments-dot')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'task_comments' },
                () => { fetchAdminActivityTaskIds(); }
            ).subscribe();
        return () => {
            supabase.removeChannel(taskCh);
            supabase.removeChannel(projCh);
            supabase.removeChannel(actCh);
            supabase.removeChannel(cmtCh);
        };
    }, [profile?.id, fetchTasks, fetchProjects, fetchAdminActivityTaskIds]);

    // 選取 task 時載入 timeline
    useEffect(() => {
        setTimeline([]);
        if (!selectedTask) {
            setCommentDraft(''); setAiCommentDraft('');
            return;
        }
        fetchTaskTimeline(selectedTask.real_id);
    }, [selectedTask, fetchTaskTimeline]);

    // 監聽 activity / comment realtime
    useEffect(() => {
        if (!selectedTask?.real_id) return;
        const aCh = supabase.channel(`client-task-activities-${selectedTask.real_id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'task_activities', filter: `task_id=eq.${selectedTask.real_id}` },
                () => fetchTaskTimeline(selectedTask.real_id))
            .subscribe();
        const cCh = supabase.channel(`client-task-comments-${selectedTask.real_id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${selectedTask.real_id}` },
                () => fetchTaskTimeline(selectedTask.real_id))
            .subscribe();
        return () => { supabase.removeChannel(aCh); supabase.removeChannel(cCh); };
    }, [selectedTask?.real_id, fetchTaskTimeline]);

    const handleSignOut = () => { reset(); onClose(); };

    const handleAiSummary = useCallback(async (task: Task) => {
        setAiPanel({ task, state: 'generating', summary: '', emailSent: false });
        try {
            const res = await fetch('/api/ai-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId: task.id, title: task.title, status: task.status, description: task.description ?? '', history: '' }),
            });
            const data = await res.json();
            if (data.summary) {
                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ai_summary: data.summary } : t));
                setSelectedTask(prev => prev?.id === task.id ? { ...prev, ai_summary: data.summary } : prev);
                setAiPanel(p => p ? { ...p, state: 'done', summary: data.summary } : null);
                const mailRes = await fetch('/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ taskId: task.id, title: task.title, status: task.status, summary: data.summary, clientEmail: profile?.email ?? '' }),
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

    const filteredFiles = files.filter(f => f.file_name.toLowerCase().includes(fileSearch.toLowerCase()));

    const handleSubmitComment = useCallback(async () => {
        if (!selectedTask?.real_id || !commentDraft.trim() || !profile?.id) return;
        setCommentLoading(true);
        const { error } = await supabase
            .from('task_comments')
            .insert({ task_id: selectedTask.real_id, user_id: profile.id, content: aiCommentDraft || commentDraft.trim(), is_admin: false });
        setCommentLoading(false);
        if (error) {
            alert(`留言失敗：${error.message}`);
        } else {
            setCommentDraft(''); setAiCommentDraft('');
            fetchTaskTimeline(selectedTask.real_id);
        }
    }, [commentDraft, aiCommentDraft, selectedTask, profile, fetchTaskTimeline]);

    const handleAiComment = useCallback(async () => {
        if (!selectedTask?.real_id || !commentDraft.trim()) return;
        setCommentAiLoading(true);
        try {
            const res = await fetch('/api/ai-comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ draft: commentDraft, context: selectedTask.title }),
            });
            const data = await res.json();
            if (data.text) { setAiCommentDraft(data.text); }
            else { alert(data.error ?? 'AI 生成失敗'); }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setCommentAiLoading(false);
        }
    }, [commentDraft, selectedTask]);

    // ── Task detail right panel (shared) ─────────────────────────
    const renderTaskDetail = (task: Task) => {
        const s = STATUS_CONFIG[task.status] || { label: task.status || 'Unknown', color: 'text-zinc-500', bg: 'bg-zinc-900', dot: 'bg-zinc-600', progress: 0 };
        const p = PRIORITY_CONFIG[task.priority] || { label: task.priority || 'Unknown', color: 'text-zinc-500', icon: '•' };
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
                <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
                    <div className="min-w-0 flex-1 pr-4">
                        <span className="text-[10px] text-zinc-600 font-mono tracking-widest">{task.id}</span>
                        <h2 className="text-sm font-bold text-white leading-snug mt-0.5 truncate" title={task.title}>{task.title}</h2>
                    </div>
                    <button onClick={() => setSelectedTask(null)} className="text-zinc-600 hover:text-zinc-400 text-[13px] transition-colors p-1">✕</button>
                </div>
                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#27272a transparent' }}>

                    {/* Properties grid (Linear style) */}
                    <div className="border border-zinc-900 rounded-lg p-3.5 space-y-3 bg-zinc-950/20 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-zinc-900/40">
                            <span className="text-zinc-500 tracking-wider font-mono">STATUS</span>
                            <div className="flex items-center gap-1.5 font-medium">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                                <span className={s.color}>{s.label}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-zinc-900/40">
                            <span className="text-zinc-500 tracking-wider font-mono">PRIORITY</span>
                            <span className={`font-medium ${p.color}`}>{p.icon} {p.label}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-zinc-900/40">
                            <span className="text-zinc-500 tracking-wider font-mono">TYPE</span>
                            <span className="text-zinc-300 font-mono border border-zinc-800 px-1.5 py-0.5 rounded text-[10px]">{task.type}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                            <span className="text-zinc-500 tracking-wider font-mono">ETA</span>
                            <span className="text-zinc-300">{task.eta}</span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="border border-zinc-900 rounded-lg p-4 bg-zinc-950/20">
                        <div className="text-[10px] text-zinc-600 tracking-widest mb-1.5 font-mono">// DESCRIPTION</div>
                        <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{task.description ?? '無描述。'}</p>
                    </div>

                    {/* Unified Timeline Chat Feed */}
                    <div className="border border-zinc-900 rounded-lg p-4 flex-1 flex flex-col min-h-[300px] bg-zinc-950/40">
                        <div className="text-[10px] text-zinc-600 tracking-widest mb-3 font-mono flex items-center gap-2">
                            <SatelliteDishIcon size={20} className="text-[#FF5500]" />
                            <span>// 任務對話</span>
                        </div>
                        
                        {/* Feed Messages */}
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 max-h-[350px]" style={{ scrollbarWidth: 'thin' }}>
                            {timeline.length === 0 ? (
                                <div className="text-xs text-zinc-700 italic text-center py-6">尚無對話或動態更新</div>
                            ) : (
                                timeline.map((item) => {
                                    if (item.type === 'activity') {
                                        return (
                                            <div key={item.id} className="flex flex-col items-center py-1">
                                                <div className="bg-zinc-900/40 border border-zinc-900 rounded px-2.5 py-1 text-center max-w-[90%]">
                                                    <span className="text-[9px] text-zinc-600 block mb-0.5 font-mono">{new Date(item.created_at).toLocaleString('zh-TW')}</span>
                                                    <span className="text-[11px] text-zinc-400 font-mono">⚡ {item.user_name}: {item.content}</span>
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        // Comment bubble
                                        const isAdmin = item.is_admin;
                                        return (
                                            <div key={item.id} className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}>
                                                <div className="flex items-center gap-1.5 mb-1 px-1 text-[9px] text-zinc-500 font-mono">
                                                    <span className="font-bold">{isAdmin ? 'Jagger Team' : item.user_name}</span>
                                                    <span>·</span>
                                                    <span>{new Date(item.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap border ${
                                                    isAdmin 
                                                        ? 'bg-zinc-900/80 border-zinc-800 text-zinc-200' 
                                                        : 'bg-[#FF5500]/5 border-[#FF5500]/20 text-[#FF5500]'
                                                }`}>
                                                    {item.content}
                                                </div>
                                            </div>
                                        );
                                    }
                                })
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Textarea Input */}
                        <div className="space-y-2 pt-2 border-t border-zinc-900">
                            <textarea
                                value={aiCommentDraft || commentDraft}
                                onChange={e => { setCommentDraft(e.target.value); setAiCommentDraft(''); }}
                                placeholder="針對此任務提出修改意見..."
                                rows={2}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#FF5500]/60 resize-none font-sans"
                            />
                            {commentDraft.trim() && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleAiComment}
                                        disabled={commentAiLoading}
                                        className="text-[10px] text-[#FF5500] border border-[#FF5500]/40 hover:bg-[#FF5500]/10 px-2.5 py-1 rounded transition-colors disabled:opacity-50 font-mono"
                                    >
                                        {commentAiLoading ? '⚡ Generating…' : '⚡ /ai 修飾'}
                                    </button>
                                    <div className="flex-1" />
                                    <button
                                        onClick={handleSubmitComment}
                                        disabled={commentLoading || !(aiCommentDraft || commentDraft).trim()}
                                        className="text-[10px] bg-[#FF5500] text-black hover:bg-white px-3 py-1.5 rounded font-bold transition-colors disabled:opacity-50 font-mono"
                                    >
                                        {commentLoading ? '…' : '送出'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full w-full bg-[#000000] font-mono overflow-hidden relative">

            {/* ── AI Summary Overlay ────────────────────────────────── */}
            {aiPanel && (
                <div className="absolute inset-0 z-50 flex items-end justify-center pb-8 px-8 pointer-events-none">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                        onClick={() => aiPanel.state !== 'generating' && setAiPanel(null)} />
                    <div className="relative pointer-events-auto w-full max-w-2xl bg-[#0A0A0B] border border-zinc-800 rounded-xl shadow-2xl shadow-black overflow-hidden"
                        style={{ animation: 'slideUp 0.22s cubic-bezier(0.16,1,0.3,1)' }}>
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-900">
                            <div className="flex items-center gap-2.5">
                                <span className="text-xs text-[#FF5500] tracking-widest">⚡ AI EXECUTIVE SUMMARY</span>
                                <span className="text-zinc-800">·</span>
                                <span className="text-xs text-zinc-600 truncate max-w-[240px]">{aiPanel.task.id} — {aiPanel.task.title}</span>
                            </div>
                            {aiPanel.state !== 'generating' && (
                                <button onClick={() => setAiPanel(null)} className="text-zinc-600 hover:text-zinc-300 text-[13px]">✕</button>
                            )}
                        </div>
                        <div className="px-5 py-5 space-y-4">
                            {aiPanel.state === 'generating' && (
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2 text-[13px] text-zinc-500">
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
                                    <p className="text-[13px] text-zinc-200 leading-[1.8] border-l-2 border-[#FF5500] pl-4">{aiPanel.summary}</p>
                                    <div className="flex items-center gap-2 pt-1">
                                        {aiPanel.emailSent
                                            ? <span className="text-xs text-emerald-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Email notification sent</span>
                                            : <span className="text-xs text-zinc-600">// Email not sent (RESEND_API_KEY not set)</span>
                                        }
                                        <div className="flex-1" />
                                        <button onClick={() => setAiPanel(null)} className="text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-4 py-1.5 rounded transition-colors">Close</button>
                                    </div>
                                </>
                            )}
                            {aiPanel.state === 'error' && (
                                <div className="space-y-3">
                                    <pre className="text-[13px] text-red-400 whitespace-pre-wrap break-all font-mono bg-zinc-950 rounded p-3 border border-zinc-900">{aiPanel.summary}</pre>
                                    <button onClick={() => setAiPanel(null)} className="text-xs border border-zinc-800 text-zinc-400 px-4 py-1.5 rounded hover:border-zinc-600 transition-colors">Dismiss</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <aside className="w-56 shrink-0 border-r border-zinc-900 flex flex-col bg-[#000000]">
                <div className="px-4 py-4 border-b border-zinc-900">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-[#FF5500] rounded flex items-center justify-center">
                            <span className="text-[8px] font-black text-black">J</span>
                        </div>
                        <div>
                            <div className="text-[13px] font-bold text-white tracking-wide">JAGGER OS</div>
                            <div className="text-[13px] text-zinc-600">{profile?.company || profile?.name || 'JAGGER OS'}</div>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 px-2 py-3 space-y-0.5">
                    {NAV.map(item => {
                        const isHovered = hoveredNav === item.key;
                        let iconWithAnimate = item.icon;
                        if (item.key === 'contract') {
                            iconWithAnimate = React.cloneElement(item.icon as React.ReactElement<any>, { ref: contractIconRef });
                        } else if (item.key === 'files') {
                            iconWithAnimate = React.cloneElement(item.icon as React.ReactElement<any>, { ref: filesIconRef });
                        } else {
                            iconWithAnimate = React.cloneElement(item.icon as React.ReactElement<any>, { animate: isHovered ? 'hover' : 'idle' });
                        }
                        return (
                            <button
                                key={item.key}
                                onClick={() => { setActiveNav(item.key); if (item.key !== 'projects') { setSelectedProject(null); setSelectedTask(null); } }}
                                onMouseEnter={() => {
                                    setHoveredNav(item.key);
                                    if (item.key === 'contract') contractIconRef.current?.startAnimation();
                                    if (item.key === 'files') filesIconRef.current?.startAnimation();
                                }}
                                onMouseLeave={() => {
                                    setHoveredNav(null);
                                    if (item.key === 'contract') contractIconRef.current?.stopAnimation();
                                    if (item.key === 'files') filesIconRef.current?.stopAnimation();
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left ${activeNav === item.key ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}`}
                            >
                                <span className="shrink-0">{iconWithAnimate}</span>{item.label}
                            </button>
                        );
                    })}
                </nav>
                <div className="px-3 py-3 border-t border-zinc-900">
                    <div className="bg-zinc-900/80 rounded-lg px-3 py-2 mb-3">
                        <div className="text-[13px] text-zinc-600 mb-0.5">ACTIVE PLAN</div>
                        <div className="text-[13px] text-[#FF5500] font-bold">{selectedPlan}</div>
                        <div className="flex items-center gap-1 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[13px] text-emerald-500">Active</span>
                        </div>
                    </div>
                    <button onClick={handleSignOut} className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1.5 border border-zinc-900 rounded hover:border-zinc-700">
                        Sign out
                    </button>
                </div>
            </aside>

            {/* ── Main ─────────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Topbar */}
                <div className="h-12 border-b border-zinc-900 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] text-zinc-600">JAGGER OS</span>
                        <span className="text-zinc-800">›</span>
                        {selectedProject && activeNav === 'projects' ? (
                            <>
                                <button onClick={() => { setSelectedProject(null); setSelectedTask(null); }}
                                    className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors">My Projects</button>
                                <span className="text-zinc-800">›</span>
                                <span className="text-[13px] text-zinc-300 truncate max-w-[180px]">{selectedProject.name}</span>
                            </>
                        ) : (
                            <span className="text-[13px] text-zinc-300 capitalize">
                                {activeNav === 'projects' ? 'My Projects' : activeNav}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowAskAI(true)}
                            onMouseEnter={() => jagAgentIconRef.current?.startAnimation()}
                            onMouseLeave={() => jagAgentIconRef.current?.stopAnimation()}
                            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:border-[#FF5500]/60 px-2.5 py-1 rounded transition-colors group"
                        >
                            <BrandAnthropicIcon ref={jagAgentIconRef} size={14} color="#FF5500" />
                            Jag Agent
                        </button>
                        <span className="text-xs text-zinc-600 border border-zinc-900 px-2.5 py-1 rounded">{profile?.name ?? 'Client'}</span>
                        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">

                    {/* ── PROJECTS ──────────────────────────────────────────── */}
                    {activeNav === 'projects' && (() => {
                        const projectTasks  = selectedProject ? tasks.filter(t => t.project_id === selectedProject.id) : [];
                        const projectDone   = projectTasks.filter(t => t.status === 'DELIVERED').length;
                        const projectProg   = projectTasks.length ? Math.round(projectDone / projectTasks.length * 100) : 0;
                        const pInProgress   = projectTasks.filter(t => t.status === 'IN_PROGRESS');
                        const pReview       = projectTasks.filter(t => t.status === 'REVIEW');
                        const pQueued       = projectTasks.filter(t => t.status === 'QUEUED');
                        const pDelivered    = projectTasks.filter(t => t.status === 'DELIVERED');

                        if (!selectedProject) {
                            /* ── Project Cards ── */
                            return (
                                <div className="flex flex-col h-full">
                                    <div className="px-6 py-4 border-b border-zinc-900 shrink-0 flex items-center justify-between">
                                        <span className="text-xs text-zinc-600 tracking-widest">// MY PROJECTS</span>
                                        {projects.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    setRequestProjectId(projects[0].id);
                                                    setRequestFiles([]);
                                                    setShowRequestModal(true);
                                                }}
                                                className="text-[11px] bg-[#FF5500]/10 hover:bg-[#FF5500]/20 text-[#FF5500] border border-[#FF5500]/30 hover:border-[#FF5500]/50 px-3 py-1.5 rounded-lg font-mono font-bold transition-all shrink-0"
                                            >
                                                提出需求
                                            </button>
                                        )}
                                    </div>
                                    {loading ? (
                                        <div className="flex items-center justify-center flex-1 text-zinc-600 text-sm">載入中…</div>
                                    ) : projects.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center flex-1 gap-2">
                                            <div className="text-zinc-600 text-[13px] font-mono">目前沒有進行中的專案</div>
                                            <div className="text-zinc-700 text-xs font-mono">完成合約簽署後，專案將會出現在這裡</div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-y-auto p-6">
                                            <div className="grid gap-4 max-w-2xl">
                                                {projects.map(project => {
                                                    const ptasks = tasks.filter(t => t.project_id === project.id);
                                                    const done   = ptasks.filter(t => t.status === 'DELIVERED').length;
                                                    const prog   = ptasks.length ? Math.round(done / ptasks.length * 100) : 0;
                                                    const statItems = [
                                                        { label: 'Todo',        count: ptasks.filter(t => t.status === 'QUEUED').length,      color: 'text-zinc-500' },
                                                        { label: 'In Progress', count: ptasks.filter(t => t.status === 'IN_PROGRESS').length,  color: 'text-[#FF5500]' },
                                                        { label: 'In Review',   count: ptasks.filter(t => t.status === 'REVIEW').length,       color: 'text-yellow-400' },
                                                        { label: 'Done',        count: done,                                                   color: 'text-emerald-400' },
                                                    ].filter(s => s.count > 0);
                                                    return (
                                                        <div
                                                            key={project.id}
                                                            onClick={() => { setSelectedProject(project); setSelectedTask(null); }}
                                                            className="bg-zinc-950 border border-zinc-900 hover:border-zinc-700 rounded-xl p-5 cursor-pointer transition-all group"
                                                        >
                                                            <div className="flex items-start justify-between mb-4">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="text-[15px] font-bold text-white group-hover:text-[#FF5500] transition-colors leading-snug">{project.name}</div>
                                                                        {ptasks.some(t => adminActivityTaskIds.has(t.real_id)) && (
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500] shrink-0 animate-pulse" title="有未讀更新" />
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-zinc-600 mt-0.5">{ptasks.length} tasks</div>
                                                                </div>
                                                                <span className="text-[10px] text-emerald-400 border border-emerald-900/60 px-2 py-0.5 rounded tracking-widest shrink-0 ml-3">ACTIVE</span>
                                                            </div>
                                                            <div className="space-y-2.5">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3 flex-wrap">
                                                                        {statItems.map(s => (
                                                                            <span key={s.label} className={`text-[10px] ${s.color}`}>{s.label} {s.count}</span>
                                                                        ))}
                                                                        {statItems.length === 0 && <span className="text-[10px] text-zinc-700">No tasks yet</span>}
                                                                    </div>
                                                                    <span className={`text-xs font-bold ${prog === 100 ? 'text-emerald-400' : 'text-[#FF5500]'}`}>{prog}%</span>
                                                                </div>
                                                                <div className="bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                                                    <div className="h-full rounded-full transition-all duration-700"
                                                                        style={{ width: `${prog}%`, background: prog === 100 ? '#34d399' : '#FF5500' }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        /* ── Task List inside selected project ── */
                        return (
                            <div className="flex h-full w-full overflow-hidden">
                                {/* Left: Task List */}
                                <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r border-zinc-900">
                                    {/* Project header */}
                                    <div className="px-6 py-3 border-b border-zinc-900 shrink-0">
                                        <div className="flex items-center justify-between mb-2.5">
                                            <button
                                                onClick={() => { setSelectedProject(null); setSelectedTask(null); }}
                                                className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                                            >
                                                ← 我的專案
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setRequestProjectId(selectedProject.id);
                                                    setRequestFiles([]);
                                                    setShowRequestModal(true);
                                                }}
                                                className="text-[10px] bg-[#FF5500]/10 hover:bg-[#FF5500]/20 text-[#FF5500] border border-[#FF5500]/30 hover:border-[#FF5500]/50 px-2.5 py-1 rounded-lg font-mono transition-all font-bold"
                                            >
                                                + 提出需求
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-bold text-white">{selectedProject.name}</div>
                                                <div className="text-xs text-zinc-600 mt-0.5">{projectDone} / {projectTasks.length} done</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${projectProg}%`, background: projectProg === 100 ? '#34d399' : '#FF5500' }} />
                                                </div>
                                                <span className={`text-xs font-bold ${projectProg === 100 ? 'text-emerald-400' : 'text-[#FF5500]'}`}>{projectProg}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Status summary row */}
                                    <div className="grid grid-cols-4 border-b border-zinc-900 shrink-0">
                                        {[
                                            { label: 'In Progress', count: pInProgress.length, accent: true  },
                                            { label: 'In Review',   count: pReview.length,     accent: false },
                                            { label: 'Queued',      count: pQueued.length,     accent: false },
                                            { label: 'Done',        count: pDelivered.length,  accent: false },
                                        ].map(s => (
                                            <div key={s.label} className="px-4 py-3 border-r border-zinc-900 last:border-r-0">
                                                <div className={`text-xl font-black ${s.accent ? 'text-[#FF5500]' : 'text-white'}`}>{s.count}</div>
                                                <div className="text-xs text-zinc-600 mt-0.5">{s.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Column header */}
                                    <div className="grid grid-cols-12 gap-4 px-6 py-2 border-b border-zinc-900 text-xs text-zinc-600 shrink-0">
                                        <div className="col-span-1">PRI</div>
                                        <div className="col-span-5">Title</div>
                                        <div className="col-span-2">Type</div>
                                        <div className="col-span-2">Status</div>
                                        <div className="col-span-2">ETA</div>
                                    </div>
                                    {/* Task rows */}
                                    <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/60">
                                        {projectTasks.length === 0 ? (
                                            <div className="px-6 py-12 text-center text-zinc-600 text-[13px] font-mono">
                                                此專案尚無任務
                                            </div>
                                        ) : projectTasks.map(task => {
                                            const s = STATUS_CONFIG[task.status] || { label: task.status || 'Unknown', color: 'text-zinc-500', bg: 'bg-zinc-900', dot: 'bg-zinc-600', progress: 0 };
                                            const p = PRIORITY_CONFIG[task.priority] || { label: task.priority || 'Unknown', color: 'text-zinc-500', icon: '•' };
                                            const isSelected = selectedTask?.id === task.id;
                                            return (
                                                <div key={task.id}
                                                    onClick={() => setSelectedTask(isSelected ? null : task)}
                                                    className={`grid grid-cols-12 gap-4 px-6 py-3.5 cursor-pointer transition-colors group ${isSelected ? 'bg-zinc-900' : 'hover:bg-zinc-900/40'}`}>
                                                    <div className={`col-span-1 flex items-center justify-start transition-colors ${
                                                        task.priority === 'HIGH' ? 'text-zinc-650 group-hover:text-red-400' :
                                                        task.priority === 'MED'  ? 'text-zinc-650 group-hover:text-yellow-400' :
                                                        'text-zinc-650 group-hover:text-zinc-300'
                                                    }`}>
                                                        <PriorityIcon priority={task.priority} />
                                                    </div>
                                                    <div className="col-span-5 flex flex-col justify-center min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-zinc-200 truncate block">{task.title}</span>
                                                            {adminActivityTaskIds.has(task.id) && (
                                                                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500] shrink-0" title="Admin 新更新" />
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-zinc-700 mt-0.5 truncate">{task.id}</div>
                                                    </div>
                                                    <div className="col-span-2 flex items-center">
                                                        <span className="text-xs text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded">{task.type}</span>
                                                    </div>
                                                    <div className="col-span-2 flex items-center gap-1.5">
                                                        <StatusIcon status={task.status} className={s.color} />
                                                        <span className={`text-xs ${s.color}`}>{s.label}</span>
                                                    </div>
                                                    <div className={`col-span-2 flex items-center text-xs ${task.eta === '—' ? 'text-zinc-700' : 'text-zinc-400'}`}>{task.eta}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right: Task Detail Panel */}
                                {selectedTask && renderTaskDetail(selectedTask)}
                            </div>
                        );
                    })()}

                    {/* ── CLIENT INBOX ────────────────────────────────────── */}
                    {activeNav === 'inbox' && (
                        <div className="flex flex-col h-full w-full overflow-hidden bg-[#000000]">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-zinc-900 shrink-0 flex items-center justify-between bg-[#080809]">
                                <div>
                                    <span className="text-[10px] text-zinc-650 tracking-widest font-mono">// REQUESTS INBOX</span>
                                    <h2 className="text-sm font-bold text-white font-mono mt-0.5">我的需求</h2>
                                </div>
                                {projects.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setRequestProjectId(projects[0].id);
                                            setRequestFiles([]);
                                            setShowRequestModal(true);
                                        }}
                                        className="text-[11px] bg-[#FF5500] hover:bg-[#FF7733] text-black px-4 py-2 rounded-lg font-mono font-bold transition-all shrink-0"
                                    >
                                        + 提出需求
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 flex overflow-hidden w-full">
                                {clientRequestsLoading ? (
                                    <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 font-mono">載入中…</div>
                                ) : clientRequests.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-2">
                                        <div className="text-zinc-500 text-xs font-mono">目前沒有提交任何需求</div>
                                        <button
                                            onClick={() => {
                                                setRequestProjectId(projects[0]?.id || '');
                                                setRequestFiles([]);
                                                setShowRequestModal(true);
                                            }}
                                            className="text-xs text-[#FF5500] hover:underline font-mono mt-2"
                                            disabled={projects.length === 0}
                                        >
                                            立即點擊「提出需求」提交您的第一個項目
                                        </button>
                                    </div>
                                ) : (() => {
                                    const selectedReq = clientRequests.find(r => r.id === selectedRequestId) || clientRequests[0];
                                    return (
                                        <>
                                            {/* Left List */}
                                            <div className="w-80 md:w-96 border-r border-zinc-900 flex flex-col overflow-y-auto bg-[#040405] shrink-0" style={{ scrollbarWidth: 'thin' }}>
                                                <div className="divide-y divide-zinc-900/60">
                                                    {clientRequests.map(req => {
                                                        const isSelected = selectedReq?.id === req.id;
                                                        
                                                        // Format Date: MM/DD
                                                        const d = new Date(req.created_at);
                                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                                        const date = String(d.getDate()).padStart(2, '0');
                                                        const shortDate = `${month}/${date}`;

                                                        return (
                                                            <div
                                                                key={req.id}
                                                                onClick={() => setSelectedRequestId(req.id)}
                                                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
                                                                    isSelected
                                                                        ? 'bg-zinc-900/50 border-l-2 border-l-[#FF5500] pl-[14px]'
                                                                        : 'hover:bg-zinc-900/20 border-l-2 border-l-transparent'
                                                                }`}
                                                            >
                                                                {/* Status tag */}
                                                                <span className={`text-[9px] border px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                                                                    req.status === '審核中'
                                                                        ? 'border-[#FF5500]/30 text-[#FF5500] bg-[#FF5500]/5'
                                                                        : req.status === '已轉任務'
                                                                        ? 'border-emerald-900/60 text-emerald-400 bg-emerald-950/20'
                                                                        : 'border-zinc-800 text-zinc-500 bg-zinc-900/10'
                                                                }`}>
                                                                    {req.status === '審核中' ? '審核中' : req.status === '已轉任務' ? '已轉' : '已婉拒'}
                                                                </span>

                                                                {/* Title */}
                                                                <span className={`text-xs font-mono truncate flex-1 ${
                                                                    isSelected ? 'text-white font-semibold' : 'text-zinc-400 group-hover:text-zinc-200'
                                                                }`}>
                                                                    {req.ai_title || req.title}
                                                                </span>

                                                                {/* Date */}
                                                                <span className="text-[10px] text-zinc-600 font-mono shrink-0">
                                                                    {shortDate}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Right Details */}
                                            <div className="flex-1 overflow-y-auto bg-[#000000] p-6 flex flex-col" style={{ scrollbarWidth: 'thin' }}>
                                                {selectedReq ? (
                                                    <div className="max-w-3xl w-full space-y-5 font-mono">
                                                        {/* Header Details */}
                                                        <div className="space-y-1">
                                                            <div className="text-[10px] text-zinc-500 tracking-wider">
                                                                專案：{selectedReq.projects?.name || '未知專案'} · 提交時間：{new Date(selectedReq.created_at).toLocaleString('zh-TW')}
                                                            </div>
                                                            <h3 className="text-sm font-bold text-white leading-snug flex items-center gap-2.5">
                                                                {selectedReq.title}
                                                                <span className={`text-[9px] border px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                                                    selectedReq.status === '審核中'
                                                                        ? 'border-[#FF5500]/30 text-[#FF5500] bg-[#FF5500]/5'
                                                                        : selectedReq.status === '已轉任務'
                                                                        ? 'border-emerald-900/60 text-emerald-400 bg-emerald-950/20'
                                                                        : 'border-zinc-800 text-zinc-500'
                                                                }`}>
                                                                    {selectedReq.status}
                                                                </span>
                                                            </h3>
                                                        </div>

                                                        {/* Description */}
                                                        <div className="space-y-1.5">
                                                            <span className="text-[9px] text-zinc-600 tracking-wider">// 原始需求描述</span>
                                                            <div className="bg-zinc-950/40 border border-zinc-900/80 rounded-xl p-4 text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">
                                                                {selectedReq.description}
                                                            </div>
                                                        </div>

                                                        {/* AI Structured recommendation card */}
                                                        {selectedReq.ai_title && (
                                                            <div className="border border-[#FF5500]/15 rounded-xl p-4 bg-zinc-950/60 space-y-2.5 text-xs">
                                                                <div className="text-[10px] text-[#FF5500] tracking-wider font-bold">// AI 需求梳理與規格建議</div>
                                                                <div className="font-bold text-zinc-200">優化主題：{selectedReq.ai_title}</div>
                                                                {selectedReq.ai_structured_content && (
                                                                    <div className="text-zinc-400 space-y-3 mt-1.5 text-[11px] leading-relaxed">
                                                                        {selectedReq.ai_structured_content.features && selectedReq.ai_structured_content.features.length > 0 && (
                                                                            <div>
                                                                                <div className="text-[10px] text-zinc-500 font-bold mb-1">● 功能規格點 (Features)</div>
                                                                                <ul className="list-disc pl-4 space-y-0.5">
                                                                                    {selectedReq.ai_structured_content.features.map((f: string, i: number) => (
                                                                                        <li key={i}>{f}</li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        )}
                                                                        {selectedReq.ai_structured_content.deliverables && selectedReq.ai_structured_content.deliverables.length > 0 && (
                                                                            <div>
                                                                                <div className="text-[10px] text-zinc-500 font-bold mb-1">● 交付物清單 (Deliverables)</div>
                                                                                <ul className="list-disc pl-4 space-y-0.5">
                                                                                    {selectedReq.ai_structured_content.deliverables.map((d: string, i: number) => (
                                                                                        <li key={i}>{d}</li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Attachments */}
                                                        {selectedReq.drive_file_urls && selectedReq.drive_file_urls.length > 0 && (
                                                            <div className="space-y-1.5">
                                                                <span className="text-[9px] text-zinc-650 tracking-wider">// 相關附件</span>
                                                                <div className="flex items-center gap-3 flex-wrap p-3.5 border border-zinc-900 rounded-xl bg-zinc-950/30">
                                                                    {selectedReq.drive_file_urls.map((file: any, idx: number) => (
                                                                        <a
                                                                            key={idx}
                                                                            href={file.url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="text-[10px] text-sky-450 hover:text-sky-400 hover:underline flex items-center gap-1.5 bg-zinc-900/40 border border-zinc-900/60 px-2.5 py-1.5 rounded-lg"
                                                                        >
                                                                            📄 {file.name} ↗
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 flex items-center justify-center text-xs text-zinc-600">
                                                        請點擊左側列表項目以查閱詳細需求內容
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* ── FILES ─────────────────────────────────────────── */}
                    {activeNav === 'files' && (() => {
                        const activeProjectId = selectedFileProjectId || projects[0]?.id;
                        const activeProject = projects.find(p => p.id === activeProjectId);

                        return (
                            <div className="flex h-full overflow-hidden">
                                {/* Left rail: project list */}
                                <div className="w-52 border-r border-zinc-900 flex flex-col shrink-0 bg-[#000000]">
                                    <div className="px-4 pt-4 pb-2 border-b border-zinc-900 bg-[#080809]">
                                        <span className="text-[10px] text-zinc-600 font-mono tracking-widest">// CLOUD DRIVE PORTAL</span>
                                        <div className="text-xs font-bold text-white font-mono mt-0.5">Files</div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                        {projects.length === 0 ? (
                                            <div className="px-3 py-4 text-[11px] text-zinc-700 font-mono">尚無專案</div>
                                        ) : projects.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setSelectedFileProjectId(p.id)}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-mono transition-colors flex flex-col gap-0.5 ${
                                                    p.id === activeProjectId
                                                        ? 'bg-zinc-900 text-white'
                                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                                                }`}
                                            >
                                                <span className="font-bold truncate leading-tight">{p.name}</span>
                                                <span className={`text-[10px] ${p.status === 'ACTIVE' ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                                    ● {p.status}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Right panel: folder cards */}
                                <div className="flex-1 flex flex-col overflow-hidden bg-[#000000]">
                                    <div className="px-6 py-3.5 border-b border-zinc-900 shrink-0 bg-[#080809]">
                                        <span className="text-[10px] text-zinc-500 font-mono tracking-widest">// GOOGLE DRIVE PORTAL</span>
                                        <h2 className="text-sm font-bold text-white font-mono mt-0.5">檔案中心 (Google Drive)</h2>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6">
                                        {!activeProject ? (
                                            <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-700 font-mono">
                                                <span className="text-xs tracking-widest">// NO ACTIVE PROJECTS</span>
                                                <span className="text-[11px]">目前尚無進行中的專案，因此無法建立雲端資料夾。</span>
                                            </div>
                                        ) : (
                                            <div className="max-w-3xl w-full space-y-6">
                                                {/* Project Info Header */}
                                                <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-5 flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[10px] text-zinc-600 font-mono tracking-widest">// CURRENT PROJECT</span>
                                                        <div className="flex items-center gap-3 mt-0.5">
                                                            <div className="text-base font-bold text-zinc-200 font-mono">{activeProject.name}</div>
                                                            {(activeProject.google_drive_folder_url || activeProject.drive_upload_url || activeProject.drive_view_url) && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/20 border border-emerald-900/40 px-2 py-0.5 rounded-full uppercase tracking-wider animate-fade-in">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                                    ● CONNECTED（已連線）
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className={`text-[10px] font-mono border px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                                        activeProject.status === 'ACTIVE'
                                                            ? 'border-emerald-900/60 text-emerald-400 bg-emerald-950/20'
                                                            : 'border-[#FF5500]/30 text-[#FF5500] bg-[#FF5500]/5'
                                                    }`}>
                                                        {activeProject.status}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Folder 1: Client Upload */}
                                                    <div
                                                        onMouseEnter={() => cardUploadIconRef.current?.startAnimation()}
                                                        onMouseLeave={() => cardUploadIconRef.current?.stopAnimation()}
                                                        className="bg-zinc-950/20 border border-zinc-900 rounded-xl p-6 flex flex-col justify-between hover:border-zinc-800 transition-colors"
                                                    >
                                                        <div>
                                                            <div className="flex items-center gap-2.5 mb-3">
                                                                <RocketIcon ref={cardUploadIconRef} size={20} color="#FF5500" className="pointer-events-none" />
                                                                <h3 className="text-sm font-bold text-zinc-200 font-mono">01_共用上傳區</h3>
                                                            </div>
                                                            <p className="text-xs text-zinc-500 leading-relaxed font-mono min-h-[60px]">
                                                                請在此上傳您的品牌 Logo、素材、文案或參考資料。此資料夾設定為可編輯，您可以直接拖曳檔案上傳，我們將能同步讀取。
                                                            </p>
                                                        </div>
                                                        <div className="mt-6">
                                                            {activeProject.drive_upload_url ? (
                                                                <a
                                                                    href={activeProject.drive_upload_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="w-full text-center block text-xs text-[#FF5500] hover:text-[#FF7733] border border-[#FF5500]/40 bg-[#FF5500]/10 hover:bg-[#FF5500]/20 px-4 py-2.5 rounded-lg font-bold font-mono transition-colors"
                                                                >
                                                                    開啟雲端資料夾 ↗
                                                                </a>
                                                            ) : (
                                                                <div className="w-full text-center text-xs border border-zinc-900 text-zinc-700 py-2.5 rounded-lg font-mono bg-zinc-950/40">
                                                                    資料夾建置中，請稍候…
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Folder 2: Deliverables */}
                                                    <div
                                                        onMouseEnter={() => cardDownloadIconRef.current?.startAnimation()}
                                                        onMouseLeave={() => cardDownloadIconRef.current?.stopAnimation()}
                                                        className="bg-zinc-950/20 border border-zinc-900 rounded-xl p-6 flex flex-col justify-between hover:border-zinc-800 transition-colors"
                                                    >
                                                        <div>
                                                            <div className="flex items-center gap-2.5 mb-3">
                                                                <DownloadIcon ref={cardDownloadIconRef} size={20} color="#3b82f6" className="pointer-events-none" />
                                                                <h3 className="text-sm font-bold text-zinc-200 font-mono">02_交付檢視區</h3>
                                                            </div>
                                                            <p className="text-xs text-zinc-500 leading-relaxed font-mono min-h-[60px]">
                                                                此為唯讀資料夾。您可以直接檢視與下載 Jagger 交付的設計稿、最終成品與專案檔案。您無法修改或刪除此區的檔案。
                                                            </p>
                                                        </div>
                                                        <div className="mt-6">
                                                            {activeProject.drive_view_url ? (
                                                                <a
                                                                    href={activeProject.drive_view_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="w-full text-center block text-xs text-sky-400 hover:text-sky-300 border border-sky-900/60 bg-sky-950/20 hover:bg-sky-950/40 px-4 py-2.5 rounded-lg font-bold font-mono transition-colors"
                                                                >
                                                                    開啟雲端資料夾 ↗
                                                                </a>
                                                            ) : (
                                                                <div className="w-full text-center text-xs border border-zinc-900 text-zinc-700 py-2.5 rounded-lg font-mono bg-zinc-950/40">
                                                                    資料夾建置中，請稍候…
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}



                    {/* ── CONTRACT ─────────────────────────────────────────── */}
                    {activeNav === 'contract' && (
                        <div className="h-full overflow-hidden">
                            <ContractPanel
                                plan={profile?.plan ?? selectedPlan ?? ''}
                                embedded={true}
                                onClose={() => {
                                    setActiveNav('projects');
                                    fetchTasks();
                                    fetchProjects();
                                }}
                            />
                        </div>
                    )}

                    {/* ── SETTINGS ──────────────────────────────────────── */}
                    {activeNav === 'settings' && (
                        <div className="flex h-full overflow-hidden">
                            <div className="w-44 border-r border-zinc-900 flex flex-col pt-4 shrink-0">
                                {(['account', 'billing', 'integrations'] as SettingsTab[]).map(tab => (
                                    <button key={tab} onClick={() => setSettingsTab(tab)}
                                        className={`text-left px-4 py-2.5 text-[13px] capitalize transition-colors ${settingsTab === tab ? 'text-white bg-zinc-900' : 'text-zinc-600 hover:text-zinc-400'}`}>
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                                {settingsTab === 'account' && (
                                    <div>
                                        <div className="text-xs text-zinc-600 tracking-widest mb-4">// ACCOUNT & NOTIFICATIONS</div>
                                        <div className="space-y-4 max-w-sm">
                                            {[
                                                { key: 'displayName', label: 'DISPLAY NAME',        type: 'text',  placeholder: profile?.name  ?? '' },
                                                { key: 'notifyEmail', label: 'NOTIFICATION EMAIL',  type: 'email', placeholder: profile?.email ?? '' },
                                            ].map(field => (
                                                <div key={field.key}>
                                                    <label className="text-xs text-zinc-600 block mb-1.5">{field.label}</label>
                                                    <input type={field.type}
                                                        value={settingsForm[field.key as keyof typeof settingsForm]}
                                                        onChange={e => setSettingsForm(f => ({ ...f, [field.key]: e.target.value }))}
                                                        placeholder={field.placeholder}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none focus:border-zinc-600"
                                                    />
                                                </div>
                                            ))}
                                            <button className="text-[13px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-4 py-2 rounded transition-colors">
                                                SAVE CHANGES
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {settingsTab === 'billing' && (
                                    <>
                                        <div className="text-xs text-zinc-600 tracking-widest mb-4">// BILLING & MANAGEMENT</div>
                                        <div className="border border-zinc-900 rounded-xl p-5 max-w-sm space-y-4">
                                            <div>
                                                <div className="text-[13px] text-zinc-600 mb-1">CURRENT PLAN</div>
                                                <div className="text-base font-bold text-[#FF5500]">{selectedPlan ?? '—'}</div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-[13px] text-zinc-600 mb-0.5">STATUS</div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-[13px] text-emerald-400">Active</span>
                                                    </div>
                                                </div>
                                                <button className="text-xs border border-zinc-800 text-zinc-500 px-3 py-1.5 rounded hover:border-red-900 hover:text-red-400 transition-colors">
                                                    Cancel Plan
                                                </button>
                                            </div>
                                            <div className="pt-3 border-t border-zinc-900 text-xs text-zinc-700">
                                                // Stripe integration pending · Transaction history will appear here
                                            </div>
                                        </div>
                                    </>
                                )}
                                {settingsTab === 'integrations' && (
                                    <>
                                        <div className="text-xs text-zinc-600 tracking-widest mb-4">// INTEGRATIONS</div>
                                        <div className="space-y-4 max-w-sm">
                                            {[
                                                { key: 'lineId',          label: 'LINE USER ID',         placeholder: 'Uxxxxxxxxxxxxxxxx' },
                                                { key: 'telegramWebhook', label: 'TELEGRAM WEBHOOK URL', placeholder: 'https://api.telegram.org/bot…' },
                                            ].map(field => (
                                                <div key={field.key}>
                                                    <label className="text-xs text-zinc-600 block mb-1.5">{field.label}</label>
                                                    <input type="text"
                                                        value={settingsForm[field.key as keyof typeof settingsForm]}
                                                        onChange={e => setSettingsForm(f => ({ ...f, [field.key]: e.target.value }))}
                                                        placeholder={field.placeholder}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none focus:border-zinc-600"
                                                    />
                                                </div>
                                            ))}
                                            <button className="text-[13px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-4 py-2 rounded transition-colors">
                                                SAVE TOKENS
                                            </button>
                                            <p className="text-xs text-zinc-700">// Tokens stored locally until Supabase profiles hook is connected</p>
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

            {/* Submit Request Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
                        <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between bg-[#080809]">
                            <div>
                                <span className="text-[10px] text-zinc-500 font-mono tracking-widest">// SUBMIT NEW REQUEST</span>
                                <h3 className="text-sm font-bold text-white font-mono mt-0.5">提交新需求 (Inbox)</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowRequestModal(false);
                                    setRequestTitle('');
                                    setRequestDesc('');
                                    setRequestFiles([]);
                                }}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                            >
                                <XIcon size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleRequestSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]" style={{ scrollbarWidth: 'thin' }}>
                             {/* Project Selection */}
                             <div className="space-y-1.5 font-mono">
                                 <label className="text-[10px] text-zinc-500 tracking-wider uppercase">所屬專案 / PROJECT</label>
                                 {selectedProject ? (
                                     <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-3 text-xs text-zinc-400">
                                         {selectedProject.name} <span className="text-[10px] text-zinc-600 ml-1.5">(已鎖定專案)</span>
                                     </div>
                                 ) : (
                                     <select
                                         required
                                         value={requestProjectId}
                                         onChange={e => setRequestProjectId(e.target.value)}
                                         className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-3 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 cursor-pointer"
                                     >
                                         <option value="" disabled>-- 請選擇專案 --</option>
                                         {projects.map(p => (
                                             <option key={p.id} value={p.id}>{p.name}</option>
                                         ))}
                                     </select>
                                 )}
                             </div>

                            {/* Title */}
                            <div className="space-y-1.5 font-mono">
                                <label className="text-[10px] text-zinc-500 tracking-wider uppercase">需求標題 / TITLE</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="請輸入簡短、明確的需求標題"
                                    value={requestTitle}
                                    onChange={e => setRequestTitle(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-3 text-xs text-zinc-250 placeholder-zinc-700 focus:outline-none focus:border-zinc-700"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5 font-mono">
                                <label className="text-[10px] text-zinc-500 tracking-wider uppercase">詳細描述 / DESCRIPTION</label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="請詳細說明您的具體需求、交付物規格或修改意見…"
                                    value={requestDesc}
                                    onChange={e => setRequestDesc(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-3 text-xs text-zinc-250 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 resize-none leading-relaxed"
                                />
                            </div>

                            {/* Drag and Drop File Upload Area */}
                            <div className="space-y-1.5 font-mono">
                                <label className="text-[10px] text-zinc-500 tracking-wider uppercase">附件上傳 (直傳 GOOGLE DRIVE) / ATTACHMENTS</label>
                                
                                <div
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={handleFileDrop}
                                    className="border border-dashed border-zinc-900 hover:border-zinc-750 rounded-xl p-5 bg-zinc-950/20 text-center cursor-pointer transition-colors relative"
                                >
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileSelect}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        disabled={uploadingFile || !requestProjectId}
                                    />
                                    <div className="space-y-1">
                                        <div className="text-xs text-zinc-400">
                                            {uploadingFile ? '檔案上傳至 Google Drive 中…' : '拖曳檔案至此，或點擊選取檔案'}
                                        </div>
                                        <div className="text-[10px] text-zinc-650">
                                            {!requestProjectId ? '（請先選擇專案）' : '附件將自動存入 01_共用上傳區'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Uploaded Files List */}
                            {requestFiles.length > 0 && (
                                <div className="space-y-1.5 font-mono">
                                    <span className="text-[9px] text-zinc-650 tracking-wider">// ATTACHMENTS TO UPLOAD</span>
                                    <div className="border border-zinc-900 rounded-xl bg-zinc-950/40 p-3 divide-y divide-zinc-900/60 max-h-28 overflow-y-auto">
                                        {requestFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0 text-xs">
                                                <span className="text-zinc-400 truncate max-w-[85%]">
                                                    📄 {file.name}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setRequestFiles(prev => prev.filter((_, i) => i !== idx))}
                                                    className="text-zinc-650 hover:text-red-400 text-[10px] transition-colors"
                                                >
                                                    移除
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Submit button */}
                            <div className="pt-2 font-mono">
                                <button
                                    type="submit"
                                    disabled={submitLoading || uploadingFile}
                                    className="w-full bg-[#FF5500] hover:bg-[#FF7733] disabled:bg-zinc-800 text-white py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                                >
                                    {submitLoading ? 'AI 正在為您梳理需求規格...' : '確認並提交需求'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
