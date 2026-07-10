'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from './supabase';

// ─── State Machine ─────────────────────────────────────────────────────────────
// GUEST      → 未登入，訪客
// REGISTERED → 已填表/登入，尚未簽約
// SIGNED     → 已完成線上簽約，等待驗證
// ACTIVE     → 完整啟用，解鎖 Dashboard
// ──────────────────────────────────────────────────────────────────────────────
export type UserFlowState = 'GUEST' | 'REGISTERED' | 'SIGNED' | 'ACTIVE';

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    plan: string;
    role: 'client' | 'admin';
}

export interface ContractParams {
    amount: string;
    timeline: string;
}

interface UserFlowContextValue {
    flowState: UserFlowState;
    profile: UserProfile | null;
    selectedPlan: string | null;
    contractParams: ContractParams;
    setContractParams: React.Dispatch<React.SetStateAction<ContractParams>>;
    dashboardOpen: boolean;
    openDashboard: () => void;
    closeDashboard: () => void;
    pendingPanel: string | null;
    clearPendingPanel: () => void;
    register: (profile: UserProfile, plan: string) => Promise<{ error: string | null }>;
    sign: (signatureDataUrl: string) => void;
    activate: () => void;
    reset: () => void;
    sendMagicLink: (email: string) => Promise<{ error: string | null }>;
}

const UserFlowContext = createContext<UserFlowContextValue | null>(null);

export function UserFlowProvider({ children }: { children: React.ReactNode }) {
    const [flowState, setFlowState] = useState<UserFlowState>('GUEST');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [contractParams, setContractParams] = useState<ContractParams>({ amount: '', timeline: '' });
    const [dashboardOpen, setDashboardOpen] = useState(false);
    // pendingPanel: set when returning from external payment so DB opens on the right tab
    const [pendingPanel, setPendingPanel] = useState<string | null>(null);

    useEffect(() => {
        const syncSession = async (session: any) => {
            if (session?.user) {
                const u = session.user;
                // 從 profiles 表讀取 role
                const { data: profileRow } = await supabase
                    .from('profiles')
                    .select('name, email, phone, company, plan_type, role')
                    .eq('id', u.id)
                    .single();
                setProfile({
                    id: u.id,
                    name: profileRow?.name ?? u.user_metadata?.name ?? '',
                    email: profileRow?.email ?? u.email ?? '',
                    phone: profileRow?.phone ?? u.user_metadata?.phone ?? '',
                    company: profileRow?.company ?? u.user_metadata?.company ?? '',
                    plan: profileRow?.plan_type ?? u.user_metadata?.plan ?? '',
                    role: (profileRow?.role as 'client' | 'admin') ?? 'client',
                });
                setFlowState('ACTIVE');
            } else {
                setFlowState('GUEST');
                setProfile(null);
                setDashboardOpen(false);
            }
        };

        supabase.auth.getSession().then(({ data: { session } }) => syncSession(session));

        // ?auth=success 或 ?payment= 時主動再 getSession 並開啟 Dashboard
        if (typeof window !== 'undefined' && (window.location.search.includes('auth=success') || window.location.search.includes('payment='))) {
            // Capture panel param BEFORE clearing the URL
            const urlParams = new URLSearchParams(window.location.search);
            const panel = urlParams.get('panel');
            if (panel) setPendingPanel(panel);
            supabase.auth.getSession().then(({ data: { session } }) => {
                syncSession(session);
                if (session?.user) setDashboardOpen(true);
                // 清掉 URL 參數避免重複觸發
                window.history.replaceState({}, '', window.location.pathname);
            });
        }

        let initialSessionHandled = false;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            syncSession(session);
            // 只有真正完成登入動作才自動開 Dashboard，
            // TOKEN_REFRESHED / INITIAL_SESSION（頁面重整/分頁回來）不觸發
            if (event === 'SIGNED_IN' && session?.user && !initialSessionHandled) {
                setDashboardOpen(true);
            }
            if (event === 'INITIAL_SESSION') {
                initialSessionHandled = true;
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const openDashboard = useCallback(() => setDashboardOpen(true), []);
    const closeDashboard = useCallback(() => setDashboardOpen(false), []);
    const clearPendingPanel = useCallback(() => setPendingPanel(null), []);

    const register = useCallback(async (p: UserProfile, plan: string): Promise<{ error: string | null }> => {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
        const { error } = await supabase.auth.signInWithOtp({
            email: p.email,
            options: {
                emailRedirectTo: `${siteUrl}/auth/callback`,
                data: { name: p.name, phone: p.phone, company: p.company, plan },
            },
        });

        if (error) return { error: error.message };

        // 暫存資料供 UI 顯示，等 magic link 點擊後 onAuthStateChange 才真正 ACTIVE
        setProfile({ ...p, id: '', plan });
        setSelectedPlan(plan);
        setFlowState('REGISTERED');
        return { error: null };
    }, []);

    const sign = useCallback((_signatureDataUrl: string) => {
        setFlowState('SIGNED');
    }, []);

    const activate = useCallback(() => {
        setFlowState('ACTIVE');
        setDashboardOpen(true);
    }, []);

    const reset = useCallback(async () => {
        await supabase.auth.signOut();
        setFlowState('GUEST');
        setProfile(null);
        setSelectedPlan(null);
        setDashboardOpen(false);
    }, []);

    const sendMagicLink = useCallback(async (email: string) => {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${siteUrl}/auth/callback` },
        });
        return { error: error?.message ?? null };
    }, []);

    return (
        <UserFlowContext.Provider value={{ flowState, profile, selectedPlan, contractParams, setContractParams, dashboardOpen, openDashboard, closeDashboard, pendingPanel, clearPendingPanel, register, sign, activate, reset, sendMagicLink }}>
            {children}
        </UserFlowContext.Provider>
    );
}

export function useUserFlow() {
    const ctx = useContext(UserFlowContext);
    if (!ctx) throw new Error('useUserFlow must be used inside UserFlowProvider');
    return ctx;
}
