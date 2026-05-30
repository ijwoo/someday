import { NextRequest, NextResponse } from 'next/server';
import { generateCourse } from '@/lib/claude';
import { findAnchor, geocodeNamed } from '@/lib/kakao';
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

        // 각 step에 lat/lng 좌표 보강
        // 1차: 후보 풀에서 정규화·부분일치로 매칭
        // 2차: 후보 밖 유명 장소(AI가 이름으로 넣은 맛집/명소)는 Kakao 지오코딩
        // (실패 시 중심좌표 폴백 — 거리 0이면 '차로 5분'으로 표시됨)
        if (course.steps) {
            const norm = (s: string) => (s || '').replace(/\s+/g, '').toLowerCase();
            const matchPool = (name: string): { lat: number; lng: number } | null => {
                if (!name) return null;
                const t = norm(name);
                const p = pool.find(p => p.name === name)
                    || pool.find(p => norm(p.name) === t)
                    || pool.find(p => {
                        const pn = norm(p.name);
                        return pn.length >= 2 && t.length >= 2 && (pn.includes(t) || t.includes(pn));
                    });
                return p && p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null;
            };

            const region = (locationName || '').split(' ')[0] || locationName;
            const resolved: { step: any; coords: { lat: number; lng: number } | null }[] =
                course.steps.map((step: any) => ({ step, coords: matchPool(step.name) }));

            // 후보에 없던 이름 → Kakao에서 직접 검색해 좌표 확보
            const misses = resolved.filter(r => !r.coords);
            if (misses.length) {
                const geo = await Promise.all(
                    misses.map(r => geocodeNamed(r.step.name, region, lat, lng).catch(() => null)),
                );
                misses.forEach((r, i) => { if (geo[i]) r.coords = { lat: geo[i]!.lat, lng: geo[i]!.lng }; });
            }

            const stillMissing = resolved.filter(r => !r.coords).length;
            course.steps = resolved.map(r => r.coords ? { ...r.step, ...r.coords } : { ...r.step, lat, lng });
            if (stillMissing) console.warn(`[course] 좌표 미해결 ${stillMissing}/${course.steps.length} — 중심좌표 폴백`);
        }

        if (anchorName) course.anchor = anchorName;
        if (!hasConstraints) setCached(key, course);
        return NextResponse.json(course);

    } catch (err: any) {
        console.error('[course]', err);
        return NextResponse.json({ error: '코스 생성 중 오류가 발생했어요' }, { status: 500 });
    }
}
