import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getDriveClient } from '@/lib/googleDrive';

export async function POST(req: NextRequest) {
    try {
        const { fileUrl, fileName, clientFolderId } = await req.json();
        const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        const drive = getDriveClient();

        // Stream from Supabase Storage URL directly into Drive
        const fileRes = await fetch(fileUrl);
        if (!fileRes.ok) throw new Error('Cannot fetch source file');

        const contentType = fileRes.headers.get('content-type') ?? 'application/octet-stream';
        const body = fileRes.body;
        if (!body) throw new Error('Empty file body');

        const targetFolder = clientFolderId ?? rootFolderId;

        const uploaded = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: targetFolder ? [targetFolder] : undefined,
            },
            media: {
                mimeType: contentType,
                body: require('stream').Readable.fromWeb(body),
            },
            fields: 'id, webViewLink',
        });

        return NextResponse.json({
            driveId:     uploaded.data.id,
            webViewLink: uploaded.data.webViewLink,
        });

    } catch (err: any) {
        console.error('[drive-transfer]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
