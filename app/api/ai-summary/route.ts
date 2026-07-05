import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
    try {
        const { taskId, title, status, description, history } = await req.json();

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
        }

        const prompt = `You are a concise project status reporter for a design studio OS.
Given the following task context, write a 2-3 sentence executive summary in Traditional Chinese (繁體中文).
Be direct. Focus on current state, blockers if any, and next action.

Task ID: ${taskId}
Title: ${title}
Status: ${status}
Description: ${description ?? 'N/A'}
Recent Activity: ${history ?? 'No recent activity'}

Output only the summary text. No labels or headers.`;

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const summary = response.text ?? '無法生成摘要。';

        return NextResponse.json({ summary });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
