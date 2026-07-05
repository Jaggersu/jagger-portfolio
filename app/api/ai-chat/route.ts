import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
    try {
        const { message, context } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return NextResponse.json({ reply: '目前 AI 服務未設定。' });

        const systemPrompt = `你是 JAGGER OS 的客戶服務 AI，代表設計師 Jagger Su 回答客戶問題。
回答風格：簡潔專業，中文回答，適當使用技術術語但不過度複雜。
你的服務包含：平面設計、品牌識別、網站開發（Next.js/PWA）、AI 輔助工作流程。
方案：LITE (NT$25,000/mo)、PRO (NT$45,000/mo)、SCALE (NT$85,000/mo)、一次性專案 (NT$88,000起)。
${context ? `\n客戶專案背景：${context}` : ''}
請直接回答，不要過多客套。`;

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${systemPrompt}\n\n客戶問：${message}`,
        });

        const reply = response.text ?? '抱歉，無法取得回應。';
        return NextResponse.json({ reply });
    } catch (err: any) {
        console.error('[ai-chat] error:', err.message);
        return NextResponse.json({ reply: `錯誤：${err.message}` }, { status: 500 });
    }
}
