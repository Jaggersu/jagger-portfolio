'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ContractPanel from '../../../components/dashboard/ContractPanel';

function OnboardingContractContent() {
    const searchParams = useSearchParams();
    const plan = searchParams.get('plan') ?? 'LITE';

    return (
        <div className="fixed inset-0 z-50 bg-black">
            <ContractPanel
                plan={plan}
                embedded={false}
                onClose={() => { window.location.href = '/'; }}
                onActivated={() => { window.location.href = '/dashboard'; }}
            />
        </div>
    );
}

export default function OnboardingContractPage() {
    return (
        <Suspense
            fallback={
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white">
                    <p className="font-mono text-zinc-400 text-sm tracking-widest">載入合約…</p>
                </div>
            }
        >
            <OnboardingContractContent />
        </Suspense>
    );
}
