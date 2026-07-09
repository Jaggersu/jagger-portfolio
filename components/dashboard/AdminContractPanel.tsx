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
    project_name?: string;
}

export default function AdminContractPanel() {
    const [contracts, setContracts] = useState<ContractRow[]>([]);
    const [selected, setSelected]   = useState<ContractRow | null>(null);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState('');

    const fetchContracts = useCallback(async () => {
        const { data, error } = await supabase
            .from('contracts')
            .select('*, profiles(name, email, plan_type), projects(name)')
            .order('created_at', { ascending: false });
        if (error) {
            console.error('[admin/contracts] fetch error:', error);
            setContracts([]);
        } else {
            setContracts((data ?? []).map((c: any) => ({
                ...c,
                client_name:  c.profiles?.name    ?? '—',
                client_email: c.profiles?.email   ?? '—',
                plan_type:    c.profiles?.plan_type ?? '—',
                project_name: c.projects?.name    ?? '—',
            })));
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchContracts(); }, [fetchContracts]);

    useEffect(() => {
        const channel = supabase
            .channel('admin-contracts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () => fetchContracts())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchContracts]);

    // Fuzzy-style filter: check all relevant fields
    const query = search.toLowerCase().trim();
    const filtered = query
        ? contracts.filter(c =>
            c.client_name?.toLowerCase().includes(query) ||
            c.client_email?.toLowerCase().includes(query) ||
            c.project_name?.toLowerCase().includes(query) ||
            c.plan_type?.toLowerCase().includes(query) ||
            c.status?.toLowerCase().includes(query) ||
            c.content?.toLowerCase().includes(query) ||
            c.id.toLowerCase().includes(query)
        )
        : contracts;

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
            <div className="w-[340px] shrink-0 border-r border-zinc-900 flex flex-col bg-[#000000]">
                {/* Header + Search */}
                <div className="px-4 py-3 border-b border-zinc-900 space-y-2.5 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-zinc-600 tracking-widest">// CONTRACTS</div>
                        <div className="text-[13px] text-zinc-500">{filtered.length} / {contracts.length}</div>
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="搜尋客戶 / 專案 / 合約內容…"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-700 outline-none focus:border-zinc-600 font-mono"
                    />
                </div>
                {/* List */}
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/50">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-12 text-center text-zinc-700 text-sm">// NO RESULTS</div>
                    ) : filtered.map(c => {
                        const isSigned   = c.status === 'SIGNED';
                        const isSelected = selected?.id === c.id;
                        return (
                            <button
                                key={c.id}
                                onClick={() => setSelected(isSelected ? null : c)}
                                className={`w-full text-left px-4 py-3 transition-colors ${isSelected ? 'bg-zinc-900' : 'hover:bg-zinc-900/40'}`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm text-zinc-300 truncate font-medium">{c.client_name}</span>
                                    <span className="text-[10px] text-zinc-600 font-mono ml-2 shrink-0">{c.id.slice(0, 8)}</span>
                                </div>
                                <div className="text-xs text-zinc-500 truncate mb-1">{c.project_name}</div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isSigned ? 'text-emerald-400 border-emerald-900 bg-emerald-950/30' : 'text-zinc-500 border-zinc-800'}`}>
                                        {isSigned ? '已簽' : '待簽'}
                                    </span>
                                    <span className="text-[10px] text-zinc-600">{c.plan_type}</span>
                                    <span className="text-[10px] text-zinc-700 ml-auto">{c.created_at.slice(0, 10)}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
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
                        {/* Title row */}
                        <div className="flex items-start justify-between border-b border-zinc-900 pb-4">
                            <div>
                                <div className="text-xs text-zinc-600 tracking-widest mb-1">// CONTRACT DETAIL</div>
                                <h2 className="text-base font-bold text-white">{selected.client_name}</h2>
                                <div className="text-xs text-zinc-500 mt-0.5">{selected.client_email}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] px-2 py-1 rounded border ${selected.status === 'SIGNED' ? 'text-emerald-400 border-emerald-900 bg-emerald-950/30' : 'text-zinc-500 border-zinc-800'}`}>
                                    {selected.status === 'SIGNED' ? '已簽署' : '待簽署'}
                                </span>
                                {selected.status === 'SIGNED' && (
                                    <span className="text-[10px] px-2 py-1 rounded border text-emerald-400 border-emerald-900 bg-emerald-950/30">已付款</span>
                                )}
                            </div>
                        </div>

                        {/* Meta grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {[
                                { label: 'PROJECT',   value: selected.project_name ?? '—' },
                                { label: 'PLAN',      value: selected.plan_type ?? '—' },
                                { label: 'CREATED',   value: new Date(selected.created_at).toLocaleDateString('zh-TW') },
                                { label: 'SIGNED AT', value: selected.signed_at ? new Date(selected.signed_at).toLocaleString('zh-TW') : '—' },
                            ].map(({ label, value }) => (
                                <div key={label} className="border border-zinc-900 rounded-lg p-3">
                                    <div className="text-xs text-zinc-600 mb-1 tracking-widest">{label}</div>
                                    <div className="text-zinc-300">{value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Contract content */}
                        <div className="border border-zinc-900 rounded-lg p-4">
                            <div className="text-xs text-zinc-600 mb-3 tracking-widest">// CONTRACT CONTENT</div>
                            {selected.content ? (
                                <pre className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono">
                                    {selected.content}
                                </pre>
                            ) : (
                                <div className="space-y-2">
                                    <div className="text-xs text-zinc-600 italic">// 尚無合約文字內容</div>
                                    <div className="text-xs text-zinc-700">
                                        合約內容需在簽署時寫入 contracts.content 欄位。
                                        目前可透過 contracts.metadata 查看相關資料。
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Metadata */}
                        {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                            <div className="border border-zinc-900 rounded-lg p-4">
                                <div className="text-xs text-zinc-600 mb-3 tracking-widest">// METADATA</div>
                                <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap break-all">
                                    {JSON.stringify(selected.metadata, null, 2)}
                                </pre>
                            </div>
                        )}

                        {/* Project ID */}
                        <div className="border border-zinc-900 rounded-lg p-4">
                            <div className="text-xs text-zinc-600 mb-1 tracking-widest">PROJECT ID</div>
                            <div className="text-xs text-zinc-400 font-mono break-all">{selected.project_id}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
