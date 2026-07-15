import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
function getSupabaseClient() {
    if (!client) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) {
            throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
        }
        const hybridStorage = {
            getItem: (key: string) => {
                if (typeof window === 'undefined') return null;
                if (key.includes('-code-verifier')) {
                    const value = document.cookie
                        .split('; ')
                        .find((row) => row.startsWith(`${key}=`))
                        ?.split('=')[1];
                    return value ? decodeURIComponent(value) : null;
                }
                
                // Try localStorage first
                let localVal = null;
                try {
                    localVal = localStorage.getItem(key);
                } catch {}

                // If localVal exists, we can return it, but also check if a fresh session cookie was set by the server
                const cookieVal = document.cookie
                    .split('; ')
                    .find((row) => row.startsWith(`${key}=`))
                    ?.split('=')[1];
                
                if (cookieVal) {
                    try {
                        const decoded = decodeURIComponent(cookieVal);
                        localStorage.setItem(key, decoded);
                        // Clear the cookie immediately to avoid sending huge headers on subsequent requests
                        document.cookie = `${key}=; path=/; max-age=0`;
                        return decoded;
                    } catch (e) {
                        console.error('Failed to migrate session cookie:', e);
                    }
                }

                return localVal;
            },
            setItem: (key: string, value: string) => {
                if (typeof window === 'undefined') return;
                if (key.includes('-code-verifier')) {
                    const isHttps = window.location.protocol === 'https:';
                    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=3600; SameSite=Lax${isHttps ? '; Secure' : ''}`;
                } else {
                    try {
                        localStorage.setItem(key, value);
                    } catch (e) {
                        console.error('localStorage setItem failed:', e);
                    }
                }
            },
            removeItem: (key: string) => {
                if (typeof window === 'undefined') return;
                if (key.includes('-code-verifier')) {
                    document.cookie = `${key}=; path=/; max-age=0`;
                } else {
                    try {
                        localStorage.removeItem(key);
                    } catch (e) {
                        console.error('localStorage removeItem failed:', e);
                    }
                }
            },
        };

        client = createClient(url, key, {
            auth: {
                flowType: 'pkce',
                detectSessionInUrl: true,
                persistSession: true,
                storage: hybridStorage,
            },
        });
    }
    return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop: string) {
        const value = (getSupabaseClient() as any)[prop];
        if (typeof value === 'function') {
            return value.bind(getSupabaseClient());
        }
        return value;
    },
}) as SupabaseClient;