import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const projectId = formData.get('projectId') as string | null;

        if (!file || !projectId) {
            return NextResponse.json({ error: 'Missing file or projectId' }, { status: 400 });
        }

        // 1. Fetch project's google_drive_folder_id
        const { data: project, error: projErr } = await supabaseAdmin
            .from('projects')
            .select('google_drive_folder_id')
            .eq('id', projectId)
            .single();

        if (projErr || !project || !project.google_drive_folder_id) {
            return NextResponse.json({ error: 'Project folder not found' }, { status: 404 });
        }

        const parentFolderId = project.google_drive_folder_id;

        // 2. Configure Google Drive auth
        const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        let privateKey = process.env.GOOGLE_PRIVATE_KEY;
        if (!email || !privateKey) {
            return NextResponse.json({ error: 'Google credentials not configured' }, { status: 500 });
        }

        privateKey = privateKey.trim().replace(/^"|"$/g, '').replace(/\\n/g, '\n');

        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: email, private_key: privateKey },
            scopes: ['https://www.googleapis.com/auth/drive'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // 3. Find target folder (01_共用上傳區) inside the parent project folder
        let targetFolderId = parentFolderId;
        try {
            const listRes = await drive.files.list({
                q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name contains '01_' and trashed = false`,
                fields: 'files(id, name)',
            });
            if (listRes.data.files && listRes.data.files.length > 0) {
                targetFolderId = listRes.data.files[0].id!;
            }
        } catch (searchErr) {
            console.warn('[drive-upload] Failed to find 01_ upload subfolder, uploading to root project folder instead:', searchErr);
        }

        // 4. Stream upload file directly to Google Drive target folder
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const readableStream = require('stream').Readable.from(buffer);

        const uploaded = await drive.files.create({
            requestBody: {
                name: file.name,
                parents: [targetFolderId],
            },
            media: {
                mimeType: file.type || 'application/octet-stream',
                body: readableStream,
            },
            fields: 'id, webViewLink',
        });

        return NextResponse.json({
            name: file.name,
            url: uploaded.data.webViewLink,
        });

    } catch (err: any) {
        console.error('[drive-upload]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
