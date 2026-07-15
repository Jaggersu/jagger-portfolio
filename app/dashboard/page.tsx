'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserFlow } from '../../lib/userFlow';
import DashboardPanel from '../../components/dashboard/DashboardPanel';

export default function DashboardPage() {
    const { isLoading, flowState } = useUserFlow();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && flowState !== 'ACTIVE') {
            router.replace('/');
        }
    }, [isLoading, flowState, router]);

    if (isLoading || flowState !== 'ACTIVE') {
        return <div className="min-h-screen bg-[#121214]" />;
    }

    return <DashboardPanel onClose={() => router.push('/')} />;
}
