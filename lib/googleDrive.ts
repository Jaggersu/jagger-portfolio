import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client for backend data updates (bypassing RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizePrivateKey(raw: string): string {
    // 1. Strip surrounding whitespace and quotes (single or double)
    let key = raw.trim().replace(/^["']|["']$/g, '').trim();
    // 2. If there are no real newlines, the string has literal \n – replace them
    if (!key.includes('\n')) {
        key = key.replace(/\\n/g, '\n');
    }
    // 3. Normalize CRLF → LF
    key = key.replace(/\r\n/g, '\n').replace(/\r/g, '');
    // 4. Ensure header/footer have their own lines (paranoia guard)
    key = key
        .replace(/-----BEGIN PRIVATE KEY-----\s*/g, '-----BEGIN PRIVATE KEY-----\n')
        .replace(/\s*-----END PRIVATE KEY-----/g, '\n-----END PRIVATE KEY-----');
    return key;
}

function getDriveClient() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!email || !rawKey) {
        throw new Error('Google credentials not configured in environment variables');
    }

    const privateKey = normalizePrivateKey(rawKey);

    if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        throw new Error(`GOOGLE_PRIVATE_KEY is malformed. First 80 chars: ${privateKey.slice(0, 80)}`);
    }

    // Use google.auth.JWT directly – more reliable than GoogleAuth wrapper on Vercel/OpenSSL 3
    // Cast to any to satisfy googleapis type overload (JWT private property conflict)
    const auth = new google.auth.JWT(
        email,
        undefined,
        privateKey,
        ['https://www.googleapis.com/auth/drive']
    ) as any;

    return google.drive({ version: 'v3', auth });
}


/**
 * Gets or creates a client-specific mother folder inside the root Google Drive folder.
 */
export async function getOrCreateClientFolder(profileId: string, clientName: string, clientEmail: string): Promise<string> {
    // 1. Check database cache first using Admin client
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('google_drive_folder_id')
        .eq('id', profileId)
        .single();

    if (profile?.google_drive_folder_id) {
        return profile.google_drive_folder_id;
    }

    const drive = getDriveClient();
    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const folderName = `${clientName} (${clientEmail})`;

    // 2. Search if folder already exists in Google Drive
    let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
    if (rootFolderId) {
        query += ` and '${rootFolderId}' in parents`;
    }

    const listRes = await drive.files.list({
        q: query,
        fields: 'files(id)',
        spaces: 'drive',
    });

    let folderId = (listRes.data as any).files?.[0]?.id as string | undefined;

    // 3. Create folder if it doesn't exist
    if (!folderId) {
        const createRes = await drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: rootFolderId ? [rootFolderId] : undefined,
            },
            fields: 'id',
        });
        folderId = createRes.data.id ?? undefined;
    }

    if (!folderId) {
        throw new Error('Failed to create or retrieve client folder on Google Drive');
    }

    // 4. Cache folder ID in profiles table using Admin client
    await supabaseAdmin
        .from('profiles')
        .update({ google_drive_folder_id: folderId })
        .eq('id', profileId);

    return folderId;
}

/**
 * Creates project folder and its two subfolders (Upload & View) and configures permissions.
 */
export async function createProjectFolders(
    projectId: string,
    projectName: string,
    clientFolderId: string,
    clientEmail: string
) {
    const drive = getDriveClient();
    const projectFolderName = `${projectName}_${projectId.slice(0, 6)}`;

    // 1. Create main project folder
    const projFolderRes = await drive.files.create({
        requestBody: {
            name: projectFolderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [clientFolderId],
        },
        fields: 'id',
    });
    const projectFolderId = projFolderRes.data.id;
    if (!projectFolderId) throw new Error('Failed to create main project folder');

    // 2. Create subfolder: 01_共用上傳區 (Client Upload)
    const uploadFolderRes = await drive.files.create({
        requestBody: {
            name: '01_共用上傳區 (Client Upload)',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [projectFolderId],
        },
        fields: 'id, webViewLink',
    });
    const uploadFolderId = uploadFolderRes.data.id;
    const uploadUrl = uploadFolderRes.data.webViewLink ?? '';

    // 3. Create subfolder: 02_交付檢視區 (Jagger Deliverables)
    const viewFolderRes = await drive.files.create({
        requestBody: {
            name: '02_交付檢視區 (Jagger Deliverables)',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [projectFolderId],
        },
        fields: 'id, webViewLink',
    });
    const viewFolderId = viewFolderRes.data.id;
    const viewUrl = viewFolderRes.data.webViewLink ?? '';

    // 4. Configure permissions
    // We share both folders with the client's email, and also make them link-accessible to prevent login friction
    if (uploadFolderId) {
        try {
            // Share with email as Editor
            await drive.permissions.create({
                fileId: uploadFolderId,
                requestBody: {
                    role: 'writer',
                    type: 'user',
                    emailAddress: clientEmail,
                },
            });
        } catch (e) {
            console.warn('[Google Drive] Failed to share upload folder with client email, falling back to link sharing:', e);
            try {
                // Fallback: Link sharing Editor
                await drive.permissions.create({
                    fileId: uploadFolderId,
                    requestBody: {
                        role: 'writer',
                        type: 'anyone',
                    },
                });
            } catch (linkErr) {
                console.error('[Google Drive] Link sharing for upload folder failed:', linkErr);
            }
        }
    }

    if (viewFolderId) {
        try {
            // Share with email as Viewer
            await drive.permissions.create({
                fileId: viewFolderId,
                requestBody: {
                    role: 'reader',
                    type: 'user',
                    emailAddress: clientEmail,
                },
            });
        } catch (e) {
            console.warn('[Google Drive] Failed to share view folder with client email, falling back to link sharing:', e);
            try {
                // Fallback: Link sharing Viewer
                await drive.permissions.create({
                    fileId: viewFolderId,
                    requestBody: {
                        role: 'reader',
                        type: 'anyone',
                    },
                });
            } catch (linkErr) {
                console.error('[Google Drive] Link sharing for view folder failed:', linkErr);
            }
        }
    }

    // 5. Update projects record in Supabase with folder IDs & URLs using Admin client
    await supabaseAdmin
        .from('projects')
        .update({
            google_drive_folder_id: projectFolderId,
            drive_upload_url: uploadUrl,
            drive_view_url: viewUrl,
        })
        .eq('id', projectId);

    return {
        projectFolderId,
        uploadFolderId,
        uploadUrl,
        viewFolderId,
        viewUrl,
    };
}

/**
 * High-level orchestration function to setup Google Drive folder structure for a given project ID.
 */
export async function initializeProjectDriveFolders(projectId: string) {
    const { data: project, error: projErr } = await supabaseAdmin
        .from('projects')
        .select('id, name, user_id, profiles(name, email)')
        .eq('id', projectId)
        .single();

    if (projErr || !project) {
        throw new Error(`Project not found: ${projErr?.message || 'Unknown error'}`);
    }

    const profile = project.profiles as any;
    if (!profile) {
        throw new Error('Client profile relation not found on project');
    }

    const clientFolderId = await getOrCreateClientFolder(
        project.user_id,
        profile.name || 'Client',
        profile.email || 'no-email@example.com'
    );

    return await createProjectFolders(
        project.id,
        project.name,
        clientFolderId,
        profile.email || 'no-email@example.com'
    );
}
