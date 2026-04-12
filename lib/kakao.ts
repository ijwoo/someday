const KAKAO_BASE = 'https://dapi.kakao.com';
const headers = {
    Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
};

// 좌표 → 주소 변환
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
    const res = await fetch(
        `${KAKAO_BASE}/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
        { headers },
    );
    const data = await res.json();
    const doc = data.documents?.[0];
    return doc?.road_address?.address_name
        || doc?.address?.address_name
        || '알 수 없는 위치';
}

// tripType별 검색 설정 (차로 이동 기준)
const SEARCH_CONFIG = {
    day:    { radius: 10000, size: 10 }, // 10km, 카테고리당 10개 → 최대 40개
    '1n2d': { radius: 15000, size: 12 }, // 15km, 카테고리당 12개 → 최대 48개
    '2n3d': { radius: 20000, size: 15 }, // 20km (API 최대), 카테고리당 15개 → 최대 60개
}

// 주변 장소 검색 (카테고리별)
export async function searchNearby(
    lat: number,
    lng: number,
    tripType: 'day' | '1n2d' | '2n3d' = 'day',
) {
    const { radius, size } = SEARCH_CONFIG[tripType] ?? SEARCH_CONFIG.day
    const categories = [
        { code: 'AT4', label: '관광명소' },
        { code: 'FD6', label: '음식점' },
        { code: 'CE7', label: '카페' },
        { code: 'CT1', label: '문화시설' },
    ];

    const results = await Promise.all(
        categories.map(async ({ code, label }) => {
            const res = await fetch(
                `${KAKAO_BASE}/v2/local/search/category.json` +
                `?category_group_code=${code}&x=${lng}&y=${lat}&radius=${radius}&size=${size}`,
                { headers },
            );
            const data = await res.json();
            return (data.documents || []).map((d: any) => ({
                name: d.place_name,
                address: d.road_address_name || d.address_name,
                category: label,
                lat: parseFloat(d.y),
                lng: parseFloat(d.x),
                distance: parseInt(d.distance, 10),
            }));
        }),
    );

    return results.flat();
}