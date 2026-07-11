import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { getDriveClient } from '@/lib/googleDrive';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const projectId = formData.get('projectId') as string | null;
        const folderId = formData.get('folderId') as string | null;
        const requestId = formData.get('requestId') as string | null;

        if (!file || !projectId) {
            return NextResponse.json({ error: 'Missing file or projectId' }, { status: 400 });
        }

        // 1. Fetch project's google_drive_folder_id (as fallback if folderId is not passed)
        let targetFolderId = folderId;

        if (!targetFolderId) {
            const { data: project, error: projErr } = await supabaseAdmin
                .from('projects')
                .select('google_drive_folder_id')
                .eq('id', projectId)
                .single();

            if (projErr || !project || !project.google_drive_folder_id) {
                return NextResponse.json({ error: 'Project folder not found' }, { status: 404 });
            }

            const parentFolderId = project.google_drive_folder_id;
            targetFolderId = parentFolderId;

            // Find target folder (01_共用上傳區) inside the parent project folder
            const drive = getDriveClient();
            try {
                const listRes = await drive.files.list({
                    q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name contains '01_' and trashed = false`,
                    fields: 'files(id, name)',
                    supportsAllDrives: true,
                    includeItemsFromAllDrives: true,
                });
                if (listRes.data.files && listRes.data.files.length > 0) {
                    targetFolderId = listRes.data.files[0].id!;
                }
            } catch (searchErr) {
                console.warn('[drive-upload] Failed to find 01_ upload subfolder, uploading to root project folder instead:', searchErr);
            }
        }

        if (!targetFolderId) {
            return NextResponse.json({ error: 'Target folder ID not found' }, { status: 400 });
        }

        // 2. Configure Google Drive auth
        const drive = getDriveClient();

        // 3. Stream upload file directly to Google Drive target folder
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const readableStream = require('stream').Readable.from(buffer);

        const uploaded: any = await drive.files.create({
            requestBody: {
                name: file.name,
                parents: [targetFolderId],
            },
            media: {
                mimeType: file.type || 'application/octet-stream',
                body: readableStream,
            },
            fields: 'id, webViewLink',
            supportsAllDrives: true,
        });

        const fileUrl = uploaded.data.webViewLink;

        // 4. Update project_requests table if requestId is provided
        if (requestId && fileUrl) {
            // Fetch current drive_file_urls
            const { data: reqData } = await supabaseAdmin
                .from('project_requests')
                .select('drive_file_urls')
                .eq('id', requestId)
                .single();

            const currentUrls = reqData?.drive_file_urls || [];
            const updatedUrls = [...currentUrls, { name: file.name, url: fileUrl }];

            await supabaseAdmin
                .from('project_requests')
                .update({ drive_file_urls: updatedUrls })
                .eq('id', requestId);
        }

        return NextResponse.json({
            name: file.name,
            url: fileUrl,
        });

    } catch (err: any) {
        console.error('[drive-upload]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
