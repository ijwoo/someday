import { NextRequest, NextResponse } from 'next/server';
import { analyzeImage } from '@/lib/claude';

export async function POST(req: NextRequest) {
    try {
        const { imageBase64, mediaType } = await req.json();

        if (!imageBase64 || !mediaType) {
            return NextResponse.json({ error: '이미지가 없어요' }, { status: 400 });
        }

        // 이미지 크기 제한 (5MB)
        const sizeBytes = (imageBase64.length * 3) / 4;
        if (sizeBytes > 5 * 1024 * 1024) {
            return NextResponse.json({ error: '이미지가 너무 커요 (최대 5MB)' }, { status: 400 });
        }

        const result = await analyzeImage(imageBase64, mediaType);
        return NextResponse.json(result);

    } catch (err: any) {
        console.error('[analyze]', err);

        // Anthropic 에러 코드별 처리
        if (err.message?.includes('401')) {
            return NextResponse.json({ error: 'API 키를 확인해주세요' }, { status: 401 });
        }
        if (err.message?.includes('429')) {
            return NextResponse.json({ error: '잠시 후 다시 시도해주세요' }, { status: 429 });
        }

        return NextResponse.json({ error: '분석 중 오류가 발생했어요' }, { status: 500 });
    }
}