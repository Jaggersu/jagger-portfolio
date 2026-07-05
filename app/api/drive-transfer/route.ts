import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(req: NextRequest) {
    try {
        const { fileUrl, fileName, clientFolderId } = await req.json();

        const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        let privateKey = process.env.GOOGLE_PRIVATE_KEY;
        const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        if (!email || !privateKey) {
            return NextResponse.json({ error: 'Google credentials not configured' }, { status: 500 });
        }

        privateKey = privateKey.trim().replace(/^"|"$/g, '').replace(/\\n/g, '\n');

        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: email, private_key: privateKey },
            scopes: ['https://www.googleapis.com/auth/drive'],
        });

        const drive = google.drive({ version: 'v3', auth });

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
