import { LRUCache } from 'lru-cache';

// 코스 결과를 메모리에 캐싱 (Vercel 재시작시 초기화 — 나중에 Redis로 교체)
const cache = new LRUCache<string, any>({
    max: 200,           // 최대 200개 항목
    ttl: 1000 * 60 * 60 * 24, // 24시간
});

export function getCached(key: string) {
    return cache.get(key);
}

export function setCached(key: string, value: any) {
    cache.set(key, value);
}

// 좌표를 캐시 키로 변환 (소수점 2자리로 반올림 — 약 1km 단위)
export function coordKey(lat: number, lng: number, tripType = 'day', theme = 'balanced') {
    return `${lat.toFixed(2)}_${lng.toFixed(2)}_${tripType}_${theme}`;
}