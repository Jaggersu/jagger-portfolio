import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { initializeProjectDriveFolders } from '@/lib/googleDrive';

export async function POST(req: NextRequest) {
    try {
        const { projectId } = await req.json();

        if (!projectId) {
            return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }

        // Initialize Supabase Admin client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Auth check: Get session user and verify admin role
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile, error: profErr } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profErr || profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
        }

        // Initialize Google Drive folders
        const result = await initializeProjectDriveFolders(projectId);

        return NextResponse.json({ success: true, result });

    } catch (err: any) {
        console.error('[generate-drive-folders api]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
