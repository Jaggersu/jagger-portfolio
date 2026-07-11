import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
    try {
        const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        let privateKey = process.env.GOOGLE_PRIVATE_KEY;
        const rootFolderId = process.env.GOOGLE_DRIVE_PORTFOLIO_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID;

        if (!email || !privateKey || !rootFolderId) {
            return NextResponse.json({ error: '環境變數配置不完整' }, { status: 500 });
        }

        // 金鑰清洗
        privateKey = privateKey.trim();
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
        }
        privateKey = privateKey.replace(/\\n/g, '\n');

        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: email, private_key: privateKey },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // 1. 撈取所有子資料夾
        const foldersResponse = await drive.files.list({
            q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
        });

        const subFolders = foldersResponse.data.files || [];
        if (subFolders.length === 0) return NextResponse.json({ files: [], categories: [] });

        const folderMap = new Map(subFolders.map(f => [f.id, f.name]));

        // 2. 撈取所有檔案 (新增：讀取 description 欄位)
        const parentQuery = subFolders.map(f => `'${f.id}' in parents`).join(' or ');
        const filesResponse = await drive.files.list({
            pageSize: 100, // 稍微撈多一點
            q: `(${parentQuery}) and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
            // 關鍵：加入 description，用來存外部連結
            fields: 'files(id, name, mimeType, thumbnailLink, webViewLink, parents, description)',
            orderBy: 'name', // 依檔名排序
        });

        const allFiles = filesResponse.data.files || [];

        const localizedFiles = allFiles.map(file => {
            const parentId = file.parents?.[0];
            return {
                id: file.id,
                name: file.name?.replace(/\.[^/.]+$/, "") ?? file.name ?? '', // 自動隱藏副檔名
                mimeType: file.mimeType,
                // 提高預覽圖解析度
                thumbnailLink: file.thumbnailLink ? file.thumbnailLink.replace(/=s\d+/, '=s600') : null,
                webViewLink: file.webViewLink,
                category: parentId ? folderMap.get(parentId) || '未分類' : '未分類',
                // 新增：外部專案連結 (若有)
                externalLink: file.description || null,
            };
        });

        return NextResponse.json({
            files: localizedFiles,
            categories: subFolders.map(f => f.name),
        });

    } catch (error: any) {
        console.error('Google Drive API 錯誤:', error);
        return NextResponse.json({ error: '無法讀取雲端硬碟資料', details: error.message }, { status: 500 });
    }
}