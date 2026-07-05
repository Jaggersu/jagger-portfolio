'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

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
    setContractParams: (p: ContractParams) => void;
    // Transitions — swap these for real DB calls later
    register: (profile: UserProfile, plan: string) => void;
    sign: (signatureDataUrl: string) => void;
    activate: () => void;
    reset: () => void;
}

const UserFlowContext = createContext<UserFlowContextValue | null>(null);

export function UserFlowProvider({ children }: { children: React.ReactNode }) {
    const [flowState, setFlowState] = useState<UserFlowState>('GUEST');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [contractParams, setContractParams] = useState<ContractParams>({ amount: '', timeline: '' });

    const register = useCallback((p: UserProfile, plan: string) => {
        // TODO: POST /api/users  { ...p, plan }
        setProfile(p);
        setSelectedPlan(plan);
        setFlowState('REGISTERED');
    }, []);

    const sign = useCallback((_signatureDataUrl: string) => {
        // TODO: POST /api/contracts  { userId, signatureDataUrl }
        setFlowState('SIGNED');
        // Simulate async contract verification
        setTimeout(() => setFlowState('ACTIVE'), 800);
    }, []);

    const activate = useCallback(() => {
        setFlowState('ACTIVE');
    }, []);

    const reset = useCallback(() => {
        setFlowState('GUEST');
        setProfile(null);
        setSelectedPlan(null);
    }, []);

    return (
        <UserFlowContext.Provider value={{ flowState, profile, selectedPlan, contractParams, setContractParams, register, sign, activate, reset }}>
            {children}
        </UserFlowContext.Provider>
    );
}

export function useUserFlow() {
    const ctx = useContext(UserFlowContext);
    if (!ctx) throw new Error('useUserFlow must be used inside UserFlowProvider');
    return ctx;
}
