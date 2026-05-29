import { NextRequest, NextResponse } from 'next/server';
import { generateCourse } from '@/lib/claude';
import { findAnchor } from '@/lib/kakao';
import { getCached, setCached, coordKey } from '@/lib/cache';

export async function POST(req: NextRequest) {
    try {
        const {
            locationName, lat, lng, places,
            tripType = 'day',
            theme = 'balanced',
            startTime = '09:00',
            nocache = false,
            exclude = [],
            note = '',
        } = await req.json();

        // 제약(제외 장소/추가 요청)이 있으면 캐시를 쓰지 않음 — 매번 새 코스
        const hasConstraints = (Array.isArray(exclude) && exclude.length > 0) || (typeof note === 'string' && note.trim() !== '');
        const key = coordKey(lat, lng, tripType, theme);

        if (!nocache && !hasConstraints) {
            const cached = getCached(key);
            if (cached) {
                console.log(`[course] 캐시 히트: ${key}`);
                return NextResponse.json({ ...cached, cached: true });
            }
        }

        // 사진 속 그 장소(주인공)를 찾아 코스의 앵커로 강제 포함
        // — 사용자가 직접 제외한 장소라면 앵커로 쓰지 않는다.
        const excl: string[] = Array.isArray(exclude) ? exclude : [];
        const pool: any[] = Array.isArray(places) ? [...places] : [];
        let anchorName: string | undefined;
        try {
            const anchor = await findAnchor(lat, lng);
            if (anchor && !excl.includes(anchor.name)) {
                anchorName = anchor.name;
                if (!pool.some(p => p.name === anchor.name)) pool.unshift(anchor);
            }
        } catch (e) {
            console.warn('[course] 앵커 탐색 실패 — 앵커 없이 진행', e);
        }

        const course = await generateCourse(locationName, pool, tripType, theme, startTime, { exclude, note, anchor: anchorName });

        // Kakao places 데이터로 각 step에 lat/lng 좌표 보강
        if (course.steps) {
            const placeMap = new Map<string, { lat: number; lng: number }>();
            for (const p of pool) {
                if (p.name && p.lat != null && p.lng != null) {
                    placeMap.set(p.name, { lat: p.lat, lng: p.lng });
                }
            }
            course.steps = course.steps.map((step: any) => {
                const coords = placeMap.get(step.name);
                return coords ? { ...step, ...coords } : { ...step, lat, lng };
            });
        }

        if (anchorName) course.anchor = anchorName;
        if (!hasConstraints) setCached(key, course);
        return NextResponse.json(course);

    } catch (err: any) {
        console.error('[course]', err);
        return NextResponse.json({ error: '코스 생성 중 오류가 발생했어요' }, { status: 500 });
    }
}
