import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getDriveClient } from '@/lib/googleDrive';

let supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin() {
    if (!supabaseAdmin) {
        supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }
    return supabaseAdmin;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { projectId, folderId, requestId, files } = body as {
            projectId: string;
            folderId: string;
            requestId: string;
            files: { name: string; supabaseUrl: string; filePath: string }[];
        };

        if (!projectId || !folderId || !files || files.length === 0) {
            return NextResponse.json({ error: 'Missing required parameters or empty files list' }, { status: 400 });
        }

        const drive = getDriveClient();
        const results = [];

        for (const fileItem of files) {
            const { name: fileName, supabaseUrl, filePath } = fileItem;

            try {
                // 1. Fetch the file data from Supabase URL
                const response = await fetch(supabaseUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch file from Supabase: ${response.statusText}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const readableStream = require('stream').Readable.from(buffer);

                // 2. Upload directly to Google Drive folderId
                const uploaded: any = await drive.files.create({
                    requestBody: {
                        name: fileName,
                        parents: [folderId],
                    },
                    media: {
                        mimeType: response.headers.get('Content-Type') || 'application/octet-stream',
                        body: readableStream,
                    },
                    fields: 'id, webViewLink',
                    supportsAllDrives: true,
                });

                const fileUrl = uploaded.data.webViewLink;
                if (!fileUrl) {
                    throw new Error('Google Drive upload succeeded but no webViewLink was returned');
                }

                // 3. Update database if requestId is provided
                if (requestId) {
                    const { data: reqData } = await getSupabaseAdmin()
                        .from('project_requests')
                        .select('drive_file_urls')
                        .eq('id', requestId)
                        .single();

                    const currentUrls = reqData?.drive_file_urls || [];
                    const updatedUrls = [...currentUrls, { name: fileName, url: fileUrl }];

                    await getSupabaseAdmin()
                        .from('project_requests')
                        .update({ drive_file_urls: updatedUrls })
                        .eq('id', requestId);
                }

                // 4. Delete temp file from Supabase Storage to keep footprint 0MB
                const { error: removeErr } = await getSupabaseAdmin().storage
                    .from('project-attachments')
                    .remove([filePath]);

                if (removeErr) {
                    console.warn(`[drive-upload] Temp file deletion failed for ${filePath}:`, removeErr.message);
                }

                results.push({ name: fileName, url: fileUrl, status: 'success' });
            } catch (err: any) {
                console.error(`[drive-upload] Failed to process ${fileName}:`, err);
                results.push({ name: fileName, error: err.message, status: 'failed' });
            }
        }

        return NextResponse.json({ results });

    } catch (err: any) {
        console.error('[drive-upload]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
