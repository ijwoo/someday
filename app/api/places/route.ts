import { NextRequest, NextResponse } from 'next/server';
import { reverseGeocode, searchNearby } from '@/lib/kakao';

export async function POST(req: NextRequest) {
    try {
        const { lat, lng, tripType = 'day' } = await req.json();

        if (!lat || !lng) {
            return NextResponse.json({ error: '좌표가 없어요' }, { status: 400 });
        }

        // locationName이 먼저 필요 (광역 검색 쿼리에 지역명 사용)
        const locationName = await reverseGeocode(lat, lng);
        const places = await searchNearby(lat, lng, tripType, locationName);

        return NextResponse.json({ locationName, places });

    } catch (err: any) {
        console.error('[places]', err);
        return NextResponse.json({ error: '장소 검색 중 오류가 발생했어요' }, { status: 500 });
    }
}
