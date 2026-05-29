import { NextRequest, NextResponse } from 'next/server';
import { generateReplacement } from '@/lib/claude';

export async function POST(req: NextRequest) {
    try {
        const {
            locationName, lat, lng, places,
            currentNames = [],
            target,
            theme = 'balanced',
        } = await req.json();

        if (!target?.name) {
            return NextResponse.json({ error: '교체할 장소 정보가 없어요' }, { status: 400 });
        }

        const spot = await generateReplacement(locationName, places, currentNames, target, theme);

        // Kakao places 데이터로 좌표 보강
        if (Array.isArray(places)) {
            const match = places.find((p: any) => p.name === spot.name);
            if (match && match.lat != null && match.lng != null) {
                spot.lat = match.lat;
                spot.lng = match.lng;
            } else {
                spot.lat = lat;
                spot.lng = lng;
            }
        }

        return NextResponse.json(spot);

    } catch (err: any) {
        console.error('[swap]', err);
        return NextResponse.json({ error: '장소 교체 중 오류가 발생했어요' }, { status: 500 });
    }
}
