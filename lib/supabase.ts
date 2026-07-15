import { createClient } from './supabase/client';

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
    if (!client) {
        client = createClient();
    }
    return client;
}

export const supabase = getSupabaseClient();
