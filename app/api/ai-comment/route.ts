import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
    try {
        const { draft, context } = await req.json();

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
        }

        const prompt = `You are a helpful assistant polishing a client comment for a design studio project management system.
Rewrite the following draft in Traditional Chinese (繁體中文) to be clear, concise, and professional. Keep the original meaning and length similar. Output only the polished text, no labels or explanations.

Task context: ${context ?? 'N/A'}
Draft: ${draft}`;

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text ?? draft;

        return NextResponse.json({ text });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
