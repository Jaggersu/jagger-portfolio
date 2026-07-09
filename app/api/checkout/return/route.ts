import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const payment = searchParams.get('payment') ?? 'success';
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('payment', payment);
    return NextResponse.redirect(redirectUrl, 302);
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const payment = searchParams.get('payment') ?? 'success';
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('payment', payment);
    return NextResponse.redirect(redirectUrl, 302);
}
