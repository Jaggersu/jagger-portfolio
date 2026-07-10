import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { initializeProjectDriveFolders } from '@/lib/googleDrive';

export async function POST(req: NextRequest) {
    try {
        const { name, userId } = await req.json();

        if (!name || !userId) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
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

        // 1. Create project
        const { data: project, error: projErr } = await supabase
            .from('projects')
            .insert({ name: name.trim(), user_id: userId, status: 'ACTIVE' })
            .select()
            .single();

        if (projErr || !project) {
            return NextResponse.json({ error: `Failed to create project: ${projErr?.message}` }, { status: 500 });
        }

        // 2. Initialize Google Drive folders
        try {
            await initializeProjectDriveFolders(project.id);
        } catch (driveErr: any) {
            console.error('[Google Drive Admin Init Error]', driveErr);
            // We return success anyway, but note the drive error
            return NextResponse.json({
                project,
                warning: `Project created, but Google Drive initialization failed: ${driveErr.message}`
            });
        }

        return NextResponse.json({ project });

    } catch (err: any) {
        console.error('[create-project api]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
