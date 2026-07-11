import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { google } from 'googleapis';
import { getDriveClient } from '@/lib/googleDrive';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const projectId = formData.get('projectId') as string | null;
        const title = formData.get('title') as string | null;
        const description = formData.get('description') as string | null;
        const files = formData.getAll('files') as File[];

        if (!projectId || !title) {
            return NextResponse.json({ error: '缺少必要欄位：專案或標題' }, { status: 400 });
        }

        // Initialize Supabase Admin client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Authenticate client
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: '未授權訪問' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) {
            return NextResponse.json({ error: '未授權訪問：Token 無效' }, { status: 401 });
        }

        // Call Gemini API to structure the mouth description
        let ai_title = title;
        let ai_structured_content = { features: [] as string[], deliverables: [] as string[] };

        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            try {
                const prompt = `You are a professional project manager and business analyst.
Analyze the following raw client request:
專案標題 / Title: ${title}
需求描述 / Description: ${description || '（無口語描述）'}

任務目標 / Goals:
1. 將口語的需求梳理，優化成一個精準且高大上的繁體中文（Traditional Chinese）專案主題/標題 (請以 "ai_title" 為 JSON 屬性回傳)。
2. 從中梳理出「功能規格點」(Features) 列表以繁體中文陣列表示 (請以 "features" 為 JSON 屬性回傳)。
3. 從中梳理出「交付物清單」(Deliverables) 列表以繁體中文陣列表示 (請以 "deliverables" 為 JSON 屬性回傳)。

請「僅」回傳一個乾淨、無 Markdown 標記、合法且可被 JSON.parse 讀取的 JSON 物件，格式如下：
{
  "ai_title": "精準的中文標題",
  "features": ["功能點 1", "功能點 2"],
  "deliverables": ["交付物 1", "交付物 2"]
}`;

                const ai = new GoogleGenAI({ apiKey });
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });

                let responseText = response.text || '{}';
                // Clean up markdown block if model wraps it
                responseText = responseText.replace(/```json|```/g, '').trim();
                
                try {
                    const parsed = JSON.parse(responseText);
                    if (parsed.ai_title) ai_title = parsed.ai_title;
                    if (parsed.features) ai_structured_content.features = parsed.features;
                    if (parsed.deliverables) ai_structured_content.deliverables = parsed.deliverables;
                } catch (parseErr) {
                    console.error('[Gemini JSON Parse Error]', parseErr, 'Raw Text:', responseText);
                }
            } catch (geminiErr) {
                console.error('[Gemini API Call Error]', geminiErr);
            }
        } else {
            console.warn('[Gemini API Key missing] Skipping AI structure pipeline');
        }

        // Upload files & create folders in Google Drive
        const drive_file_urls: { name: string; url: string }[] = [];

        // 1. Fetch project's google_drive_folder_id
        const { data: project, error: projErr } = await supabase
            .from('projects')
            .select('google_drive_folder_id')
            .eq('id', projectId)
            .single();

        if (!projErr && project && project.google_drive_folder_id) {
            const parentFolderId = project.google_drive_folder_id;

            try {
                const drive = getDriveClient();

                // 3. Find target folder (01_共用上傳區) inside the parent project folder
                let targetFolderId = parentFolderId;
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
                    console.warn('[drive-upload] Failed to find 01_ upload subfolder, using root project folder:', searchErr);
                }

                // 4. Generate dynamic folder name: [需求] 年月日_AI生成的需求主題
                const dateParts = new Intl.DateTimeFormat('zh-TW', {
                    timeZone: 'Asia/Taipei',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).formatToParts(new Date());
                const year = dateParts.find(p => p.type === 'year')?.value || '';
                const month = dateParts.find(p => p.type === 'month')?.value || '';
                const day = dateParts.find(p => p.type === 'day')?.value || '';
                const dateStr = `${year}${month}${day}`;
                const folderName = `[需求] ${dateStr}_${ai_title}`;

                // 5. Create the new dynamic subfolder
                let requestFolderId = targetFolderId;
                try {
                    const folderRes = await drive.files.create({
                        requestBody: {
                            name: folderName,
                            mimeType: 'application/vnd.google-apps.folder',
                            parents: [targetFolderId],
                        },
                        fields: 'id',
                        supportsAllDrives: true,
                    });
                    if (folderRes.data.id) {
                        requestFolderId = folderRes.data.id;
                    }
                } catch (createFolderErr) {
                    console.error('[drive-upload] Failed to create request subfolder:', createFolderErr);
                }

                // 6. Upload all files into the new subfolder
                for (const file of files) {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        const readableStream = require('stream').Readable.from(buffer);

                        const uploaded = await drive.files.create({
                            requestBody: {
                                name: file.name,
                                parents: [requestFolderId],
                            },
                            media: {
                                mimeType: file.type || 'application/octet-stream',
                                body: readableStream,
                            },
                            fields: 'id, webViewLink',
                            supportsAllDrives: true,
                        });

                        if (uploaded.data.webViewLink) {
                            drive_file_urls.push({
                                name: file.name,
                                url: uploaded.data.webViewLink,
                            });
                        }
                    } catch (uploadErr) {
                        console.error(`[drive-upload] Failed to upload file ${file.name}:`, uploadErr);
                    }
                }
            } catch (authErr) {
                console.error('[drive-upload] Failed to initialize Google Drive client or upload files:', authErr);
            }
        } else {
            console.warn('[drive-upload] Project folder id not found in database, skipping file upload to Drive');
        }

        // Insert request to database
        const { data: request, error: insertErr } = await supabase
            .from('project_requests')
            .insert({
                project_id: projectId,
                client_id: user.id,
                title,
                description,
                ai_title,
                ai_structured_content,
                drive_file_urls,
                status: '審核中'
            })
            .select()
            .single();

        if (insertErr || !request) {
            return NextResponse.json({ error: `寫入資料庫失敗: ${insertErr?.message}` }, { status: 500 });
        }

        return NextResponse.json({ request });

    } catch (err: any) {
        console.error('[project-requests api error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
