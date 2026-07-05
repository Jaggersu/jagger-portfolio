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
    name: string;
    email: string;
    phone: string;
    company: string;
    plan: string;
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
    register: (profile: UserProfile, plan: string) => void;
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

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setProfile(prev => prev ?? {
                    name: session.user.user_metadata?.name ?? '',
                    email: session.user.email ?? '',
                    phone: session.user.user_metadata?.phone ?? '',
                    company: session.user.user_metadata?.company ?? '',
                    plan: session.user.user_metadata?.plan ?? '',
                });
                setFlowState('ACTIVE');
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setProfile(prev => prev ?? {
                    name: session.user.user_metadata?.name ?? '',
                    email: session.user.email ?? '',
                    phone: session.user.user_metadata?.phone ?? '',
                    company: session.user.user_metadata?.company ?? '',
                    plan: session.user.user_metadata?.plan ?? '',
                });
                setFlowState('ACTIVE');
            } else {
                setFlowState('GUEST');
                setProfile(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const register = useCallback((p: UserProfile, plan: string) => {
        setProfile(p);
        setSelectedPlan(plan);
        setFlowState('REGISTERED');
    }, []);

    const sign = useCallback((_signatureDataUrl: string) => {
        setFlowState('SIGNED');
        setTimeout(() => setFlowState('ACTIVE'), 800);
    }, []);

    const activate = useCallback(() => {
        setFlowState('ACTIVE');
    }, []);

    const reset = useCallback(async () => {
        await supabase.auth.signOut();
        setFlowState('GUEST');
        setProfile(null);
        setSelectedPlan(null);
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
        <UserFlowContext.Provider value={{ flowState, profile, selectedPlan, contractParams, setContractParams, register, sign, activate, reset, sendMagicLink }}>
            {children}
        </UserFlowContext.Provider>
    );
}

export function useUserFlow() {
    const ctx = useContext(UserFlowContext);
    if (!ctx) throw new Error('useUserFlow must be used inside UserFlowProvider');
    return ctx;
}
