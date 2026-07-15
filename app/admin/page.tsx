'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserFlow } from '../../lib/userFlow';
import AdminDashboard from '../../components/dashboard/AdminDashboard';

export default function AdminPage() {
    const { isLoading, flowState, profile } = useUserFlow();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (flowState !== 'ACTIVE') {
                router.replace('/');
            } else if (profile?.role !== 'admin') {
                router.replace('/dashboard');
            }
        }
    }, [isLoading, flowState, profile, router]);

    if (isLoading || flowState !== 'ACTIVE' || profile?.role !== 'admin') {
        return <div className="min-h-screen bg-[#121214]" />;
    }

    return <AdminDashboard onClose={() => router.push('/')} />;
}
