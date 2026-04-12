import { NextRequest, NextResponse } from 'next/server';
import { generateCourse } from '@/lib/claude';
import { getCached, setCached, coordKey } from '@/lib/cache';

export async function POST(req: NextRequest) {
    try {
        const {
            locationName, lat, lng, places,
            tripType = 'day',
            theme = 'balanced',
            startTime = '09:00',
            nocache = false,
        } = await req.json();

        const key = coordKey(lat, lng, tripType, theme);

        if (!nocache) {
            const cached = getCached(key);
            if (cached) {
                console.log(`[course] 캐시 히트: ${key}`);
                return NextResponse.json({ ...cached, cached: true });
            }
        }

        const course = await generateCourse(locationName, places, tripType, theme, startTime);

        // Kakao places 데이터로 각 step에 lat/lng 좌표 보강
        if (course.steps && Array.isArray(places)) {
            const placeMap = new Map<string, { lat: number; lng: number }>();
            for (const p of places) {
                if (p.name && p.lat != null && p.lng != null) {
                    placeMap.set(p.name, { lat: p.lat, lng: p.lng });
                }
            }
            course.steps = course.steps.map((step: any) => {
                const coords = placeMap.get(step.name);
                return coords ? { ...step, ...coords } : { ...step, lat, lng };
            });
        }

        setCached(key, course);
        return NextResponse.json(course);

    } catch (err: any) {
        console.error('[course]', err);
        return NextResponse.json({ error: '코스 생성 중 오류가 발생했어요' }, { status: 500 });
    }
}
