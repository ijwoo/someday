import { NextRequest, NextResponse } from 'next/server';
import { reverseGeocode, formatLocationName, searchNearby } from '@/lib/kakao';

export async function POST(req: NextRequest) {
    try {
        const { lat, lng, tripType = 'day' } = await req.json();

        if (!lat || !lng) {
            return NextResponse.json({ error: '좌표가 없어요' }, { status: 400 });
        }

        // 전체 주소를 먼저 얻어서 — 광역 검색 쿼리에 사용 (extractRegion)
        const rawAddress = await reverseGeocode(lat, lng);
        // 표시용은 짧게 포맷 (읍/리 제거)
        const locationName = formatLocationName(rawAddress);
        const places = await searchNearby(lat, lng, tripType, rawAddress);

        return NextResponse.json({ locationName, places });

    } catch (err: any) {
        console.error('[places]', err);
        return NextResponse.json({ error: '장소 검색 중 오류가 발생했어요' }, { status: 500 });
    }
}
