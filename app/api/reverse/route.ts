import { NextRequest, NextResponse } from 'next/server';
import { reverseGeocode, formatLocationName } from '@/lib/kakao';

// 좌표 → 지역명 (지도에서 위치를 직접 찍을 때 표시용)
export async function POST(req: NextRequest) {
    try {
        const { lat, lng } = await req.json();
        if (lat == null || lng == null) {
            return NextResponse.json({ error: '좌표가 없어요' }, { status: 400 });
        }
        const rawAddress = await reverseGeocode(lat, lng);
        return NextResponse.json({ locationName: formatLocationName(rawAddress), rawAddress });
    } catch (err: any) {
        console.error('[reverse]', err);
        return NextResponse.json({ error: '위치 조회 중 오류가 발생했어요' }, { status: 500 });
    }
}
