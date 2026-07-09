'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

interface ContractRow {
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    content: string | null;
    metadata: any;
    signed_at: string | null;
    created_at: string;
    client_name?: string;
    client_email?: string;
    plan_type?: string;
}

export default function AdminContractPanel() {
    const [contracts, setContracts] = useState<ContractRow[]>([]);
    const [selected, setSelected] = useState<ContractRow | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchContracts = useCallback(async () => {
        const { data, error } = await supabase
            .from('contracts')
            .select('*, profiles(name, email, plan_type)')
            .order('created_at', { ascending: false });
        if (error) {
            console.error('[admin/contracts] fetch error:', error);
            setContracts([]);
        } else {
            setContracts((data ?? []).map((c: any) => ({
                ...c,
                client_name: c.profiles?.name ?? '—',
                client_email: c.profiles?.email ?? '—',
                plan_type: c.profiles?.plan_type ?? '—',
            })));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    // 監聽 contracts 變更
    useEffect(() => {
        const channel = supabase
            .channel('admin-contracts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () => {
                fetchContracts();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchContracts]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm tracking-widest">
                // LOADING…
            </div>
        );
    }

    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Left: contract list */}
            <div className="w-[340px] shrink-0 border-r border-zinc-900 overflow-y-auto bg-[#000000]">
                <div className="px-4 py-3 border-b border-zinc-900">
                    <div className="text-xs text-zinc-600 tracking-widest">// CONTRACTS</div>
                    <div className="text-[13px] text-zinc-500 mt-0.5">{contracts.length} records</div>
                </div>
                {contracts.length === 0 ? (
                    <div className="px-4 py-12 text-center text-zinc-700 text-sm">// NO CONTRACTS</div>
                ) : (
                    <div className="divide-y divide-zinc-900/50">
                        {contracts.map(c => {
                            const isSigned = c.status === 'SIGNED';
                            const isPaid = c.status === 'SIGNED';
                            const isSelected = selected?.id === c.id;
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => setSelected(isSelected ? null : c)}
                                    className={`w-full text-left px-4 py-3 transition-colors ${isSelected ? 'bg-zinc-900' : 'hover:bg-zinc-900/40'}`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm text-zinc-300 truncate font-medium">{c.client_name}</span>
                                        <span className="text-xs text-zinc-600 font-mono">{c.id.slice(0, 8)}</span>
                                    </div>
                                    <div className="text-xs text-zinc-500 truncate mb-2">{c.client_email}</div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isSigned ? 'text-emerald-400 border-emerald-900 bg-emerald-950/30' : 'text-zinc-500 border-zinc-800'}`}>
                                            {isSigned ? '已簽' : '未簽'}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isPaid ? 'text-emerald-400 border-emerald-900 bg-emerald-950/30' : 'text-zinc-500 border-zinc-800'}`}>
                                            {isPaid ? '已付' : '未付'}
                                        </span>
                                        <span className="text-[10px] text-zinc-600 ml-auto">{c.plan_type}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Right: contract detail */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
                {!selected ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-700">
                        <span className="text-sm tracking-widest">// SELECT A CONTRACT</span>
                        <span className="text-xs">從左側列表選擇合約查看內容</span>
                    </div>
                ) : (
                    <div className="space-y-5 max-w-3xl">
                        <div className="flex items-start justify-between border-b border-zinc-900 pb-4">
                            <div>
                                <div className="text-xs text-zinc-600 tracking-widest mb-1">// CONTRACT DETAIL</div>
                                <h2 className="text-base font-bold text-white">{selected.client_name}</h2>
                                <div className="text-xs text-zinc-500 mt-0.5">{selected.client_email}</div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] px-2 py-1 rounded border ${selected.status === 'SIGNED' ? 'text-emerald-400 border-emerald-900 bg-emerald-950/30' : 'text-zinc-500 border-zinc-800'}`}>
                                    {selected.status === 'SIGNED' ? '已簽署' : '待簽署'}
                                </span>
                                {selected.status === 'SIGNED' && (
                                    <span className="text-[10px] px-2 py-1 rounded border text-emerald-400 border-emerald-900 bg-emerald-950/30">
                                        已付款
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="border border-zinc-900 rounded-lg p-3">
                                <div className="text-xs text-zinc-600 mb-1">PLAN</div>
                                <div className="text-zinc-300">{selected.plan_type ?? '—'}</div>
                            </div>
                            <div className="border border-zinc-900 rounded-lg p-3">
                                <div className="text-xs text-zinc-600 mb-1">CREATED</div>
                                <div className="text-zinc-300">{new Date(selected.created_at).toLocaleDateString('zh-TW')}</div>
                            </div>
                            <div className="border border-zinc-900 rounded-lg p-3">
                                <div className="text-xs text-zinc-600 mb-1">SIGNED AT</div>
                                <div className="text-zinc-300">{selected.signed_at ? new Date(selected.signed_at).toLocaleString('zh-TW') : '—'}</div>
                            </div>
                            <div className="border border-zinc-900 rounded-lg p-3">
                                <div className="text-xs text-zinc-600 mb-1">PROJECT ID</div>
                                <div className="text-zinc-300 font-mono text-xs break-all">{selected.project_id}</div>
                            </div>
                        </div>

                        <div className="border border-zinc-900 rounded-lg p-4">
                            <div className="text-xs text-zinc-600 mb-3">CONTENT</div>
                            <pre className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono">
                                {selected.content ?? '// NO CONTENT'}
                            </pre>
                        </div>

                        {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                            <div className="border border-zinc-900 rounded-lg p-4">
                                <div className="text-xs text-zinc-600 mb-3">METADATA</div>
                                <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap break-all">
                                    {JSON.stringify(selected.metadata, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
