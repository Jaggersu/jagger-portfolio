import { Suspense } from 'react';
import AuthCallbackClient from './AuthCallbackClient';

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-black text-white">
                    <p className="font-mono text-zinc-400 text-sm tracking-widest">正在處理登入…</p>
                </div>
            }
        >
            <AuthCallbackClient />
        </Suspense>
    );
}
