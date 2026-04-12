import { NextRequest, NextResponse } from 'next/server';
import { reverseGeocode, searchNearby } from '@/lib/kakao';

export async function POST(req: NextRequest) {
    try {
        const { lat, lng, tripType = 'day' } = await req.json();

        if (!lat || !lng) {
            return NextResponse.json({ error: '좌표가 없어요' }, { status: 400 });
        }

        // 병렬로 실행
        const [locationName, places] = await Promise.all([
            reverseGeocode(lat, lng),
            searchNearby(lat, lng, tripType),
        ]);

        return NextResponse.json({ locationName, places });

    } catch (err: any) {
        console.error('[places]', err);
        return NextResponse.json({ error: '장소 검색 중 오류가 발생했어요' }, { status: 500 });
    }
}