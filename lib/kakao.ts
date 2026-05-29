const KAKAO_BASE = 'https://dapi.kakao.com';
const headers = {
    Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
};

// 프랜차이즈 필터 — 이 단어가 포함된 장소는 제외
const FRANCHISE_KEYWORDS = [
    // 카페 체인
    '스타벅스', '이디야', '투썸플레이스', '메가커피', '컴포즈커피', '파스쿠찌', '할리스',
    '탐앤탐스', '폴바셋', '빽다방', '커피베이', '더벤티', '엔제리너스', '커피스미스',
    // 패스트푸드
    '맥도날드', '롯데리아', '버거킹', 'KFC', '맘스터치', '서브웨이', '쉐이크쉑',
    // 치킨 체인
    'BBQ', 'BHC', '교촌치킨', '굽네치킨', '노랑통닭', '처갓집', '호식이',
    // 베이커리/디저트 체인
    '파리바게뜨', '뚜레쥬르', '던킨', '배스킨라빈스', '크리스피크림',
    // 편의점
    'CU', 'GS25', '세븐일레븐', '이마트24', '미니스톱',
    // 피자
    '도미노피자', '피자헛', '피자알볼로', '피자나라',
    // 기타 체인
    '올리브영', '다이소', '이마트', '홈플러스', '롯데마트',
]

// 여행지가 아닌 장소 — 이 단어가 포함되면 제외 (영화관·마트·생활편의·비관광 POI)
const NON_TRAVEL_KEYWORDS = [
    // 영화관
    'CGV', '메가박스', '롯데시네마', '씨네Q', '씨네큐',
    // 대형/창고형 유통
    '트레이더스', '코스트코', '노브랜드', '하나로마트', '킴스클럽',
    // 의료
    '병원', '의원', '약국', '한의원', '치과', '동물병원',
    // 교육
    '학원', '어학원', '교습소', '독서실', '스터디카페',
    // 금융/공공
    '은행', '새마을금고', '신협', '우체국', '주민센터', '행정복지센터',
    '구청', '시청', '경찰서', '소방서', '세무서',
    // 차량/주유
    '주유소', '충전소', '카센터', '정비', '세차', '중고차',
    // 생활/오락(비관광)
    '헬스', '피트니스', '휘트니스', 'PC방', '피시방', '노래', '당구', '스크린골프',
    '부동산', '공인중개', '마트', '편의점',
    // 비관광 카페 형태
    '키즈카페', '만화카페', '룸카페', '보드게임', '무인카페',
    // 교통
    '주차장', '정류장', '버스터미널',
]

function isExcluded(name: string): boolean {
    return FRANCHISE_KEYWORDS.some(f => name.includes(f))
        || NON_TRAVEL_KEYWORDS.some(f => name.includes(f))
}

// Haversine 거리 (미터)
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 표시용 짧은 지명 (읍/리 제거)
// 예) "제주특별자치도 제주시 애월읍 하귀1리" → "제주시 애월읍"
//     "부산광역시 해운대구 중동"             → "부산 해운대구"
//     "경상남도 통영시 도남동"               → "통영시"
export function formatLocationName(address: string): string {
    const parts = address.split(' ')
    const p0 = parts[0] || ''
    const isMetro = /특별시|광역시|특별자치시/.test(p0)
    const isProv  = /특별자치도|[가-힣]도$/.test(p0)

    // 한국 행정구역 주소가 아니면 원문 반환
    if (!isMetro && !isProv) return address

    if (isMetro) {
        // 서울특별시 강남구 → "서울 강남구"
        const city = p0.replace(/특별자치시|특별시|광역시/, '')
        return [city, parts[1]].filter(Boolean).join(' ')
    }

    // 도 레벨: parts[1]=시군, parts[2]=읍면동
    const si  = parts[1] || ''
    const eup = parts[2] || ''
    // 읍/면까지만 표시 (동/리 제외)
    if (eup.endsWith('읍') || eup.endsWith('면')) return `${si} ${eup}`
    return si
}

// 광역 검색용 지역 키워드 (도 레벨 → 짧게)
// 예) "제주특별자치도 제주시 애월읍" → "제주"
//     "부산광역시 해운대구"          → "부산 해운대"
export function extractRegion(address: string): string {
    const parts = address.split(' ')
    if (parts.length === 0) return address
    const p0 = parts[0]
    const isMetro = /특별시|광역시|특별자치시/.test(p0)
    const isProv  = /특별자치도|[가-힣]도$/.test(p0)

    if (isMetro) {
        const city = p0.replace(/특별자치시|특별시|광역시/, '')
        const gu = (parts[1] || '').replace(/[구]$/, '')
        return gu ? `${city} ${gu}` : city
    }

    if (isProv) {
        // 제주특별자치도 → 제주, 전라남도 → 전남 등
        let prov = p0
            .replace('특별자치도', '')
            .replace(/([가-힣]+)[도]$/, (_, m) => {
                const abbr: Record<string, string> = {
                    경기: '경기', 강원: '강원', 충청북: '충북', 충청남: '충남',
                    전라북: '전북', 전라남: '전남', 경상북: '경북', 경상남: '경남',
                }
                return abbr[m] ?? m
            })
        // 제주 → 제주 (no 도 suffix)
        if (prov === '제주') return '제주'
        const si = (parts[1] || '').replace(/[시군]$/, '')
        return si ? `${prov} ${si}` : prov
    }

    return parts.slice(0, 2).join(' ')
}

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

// tripType별 검색 설정
const SEARCH_CONFIG = {
    day:    { radius: 10000, size: 15 },
    '1n2d': { radius: 15000, size: 15 },
    '2n3d': { radius: 20000, size: 15 },
}

// 후보 랭킹 — 명소/자연/문화를 식당·카페보다 우선
const CATEGORY_WEIGHT: Record<string, number> = {
    '관광명소': 5, '자연': 4, '문화시설': 4, '문화': 4, '쇼핑': 3, '맛집': 3, '카페': 2,
}
// 카테고리별 후보 상한 — 식당·카페가 풀을 독식하지 않도록
const CATEGORY_CAP: Record<string, number> = {
    '관광명소': 16, '자연': 8, '문화시설': 8, '쇼핑': 6, '맛집': 12, '카페': 8,
}
const MAX_CANDIDATES = 34

// 카테고리 검색 (반경 기반 — 당일치기용)
async function searchByCategory(
    code: string, label: string,
    lat: number, lng: number,
    radius: number, size: number,
) {
    const res = await fetch(
        `${KAKAO_BASE}/v2/local/search/category.json` +
        `?category_group_code=${code}&x=${lng}&y=${lat}&radius=${radius}&size=${size}&sort=accuracy`,
        { headers },
    );
    const data = await res.json();
    return (data.documents || [])
        .filter((d: any) => !isExcluded(d.place_name))
        .map((d: any) => ({
            name: d.place_name,
            address: d.road_address_name || d.address_name,
            category: label,
            lat: parseFloat(d.y),
            lng: parseFloat(d.x),
            distance: parseInt(d.distance, 10),
        }));
}

// 키워드 검색 (반경 기반)
async function searchByKeyword(
    query: string, label: string,
    lat: number, lng: number,
    radius: number, size: number,
) {
    const res = await fetch(
        `${KAKAO_BASE}/v2/local/search/keyword.json` +
        `?query=${encodeURIComponent(query)}&x=${lng}&y=${lat}&radius=${radius}&size=${size}&sort=accuracy`,
        { headers },
    );
    const data = await res.json();
    return (data.documents || [])
        .filter((d: any) => !isExcluded(d.place_name))
        .map((d: any) => ({
            name: d.place_name,
            address: d.road_address_name || d.address_name,
            category: label,
            lat: parseFloat(d.y),
            lng: parseFloat(d.x),
            distance: parseInt(d.distance, 10),
        }));
}

// 지역명 기반 광역 검색 (반경 제한 없음 — 숙박 여행용)
async function searchRegional(
    query: string, label: string,
    baseLat: number, baseLng: number,
) {
    const [r1, r2] = await Promise.all([
        fetch(
            `${KAKAO_BASE}/v2/local/search/keyword.json` +
            `?query=${encodeURIComponent(query)}&size=15&sort=accuracy&page=1`,
            { headers },
        ),
        fetch(
            `${KAKAO_BASE}/v2/local/search/keyword.json` +
            `?query=${encodeURIComponent(query)}&size=15&sort=accuracy&page=2`,
            { headers },
        ),
    ])
    const [d1, d2] = await Promise.all([r1.json(), r2.json()])
    return [...(d1.documents || []), ...(d2.documents || [])]
        .filter((d: any) => !isExcluded(d.place_name))
        .map((d: any) => {
            const pLat = parseFloat(d.y)
            const pLng = parseFloat(d.x)
            return {
                name: d.place_name,
                address: d.road_address_name || d.address_name,
                category: label,
                lat: pLat,
                lng: pLng,
                // 실제 거리 계산 (Haversine)
                distance: Math.round(haversine(baseLat, baseLng, pLat, pLng)),
            }
        })
}

// 주변 장소 검색
export async function searchNearby(
    lat: number,
    lng: number,
    tripType: 'day' | '1n2d' | '2n3d' = 'day',
    locationName = '',
) {
    const { radius, size } = SEARCH_CONFIG[tripType] ?? SEARCH_CONFIG.day
    const region = extractRegion(locationName)

    let all: any[]

    if (tripType === 'day') {
        // 당일: 반경 기반 검색 (10km, 걷거나 짧은 이동)
        const [landmarks, spots, culture, nature, food, cafe] = await Promise.all([
            searchByCategory('AT4', '관광명소', lat, lng, radius, size),
            searchByKeyword('가볼만한곳', '관광명소', lat, lng, radius, size),
            searchByCategory('CT1', '문화시설', lat, lng, radius, size),
            searchByKeyword('공원', '자연', lat, lng, radius, size),
            searchByKeyword('맛집', '맛집', lat, lng, radius, size),
            searchByKeyword('카페', '카페', lat, lng, Math.min(radius, 8000), size),
        ])
        all = [...landmarks, ...spots, ...culture, ...nature, ...food, ...cafe]

    } else {
        // 숙박 여행: 광역 검색 (지역명 키워드, 반경 무제한)
        // 반경 검색과 광역 검색 병행 → 가까운 곳 + 멀리 퍼진 명소 모두 확보
        const [
            nearLandmarks, nearCulture, nearFood, nearCafe,
            wideAttractions, wideFood, wideCafe, wideNature,
        ] = await Promise.all([
            // 반경 기반 (가까운 곳 우선 확보)
            searchByCategory('AT4', '관광명소', lat, lng, radius, size),
            searchByCategory('CT1', '문화시설', lat, lng, radius, size),
            searchByKeyword('맛집', '맛집', lat, lng, radius, size),
            searchByKeyword('카페', '카페', lat, lng, Math.min(radius, 10000), size),
            // 광역 키워드 검색 (지역 전체 커버)
            searchRegional(`${region} 관광명소`, '관광명소', lat, lng),
            searchRegional(`${region} 맛집 현지`, '맛집', lat, lng),
            searchRegional(`${region} 카페`, '카페', lat, lng),
            searchRegional(`${region} 자연 명소`, '자연', lat, lng),
        ])
        all = [
            ...nearLandmarks, ...nearCulture, ...nearFood, ...nearCafe,
            ...wideAttractions, ...wideFood, ...wideCafe, ...wideNature,
        ]
    }

    // 중복 제거 (같은 장소명)
    const seen = new Set<string>()
    const dedup = all.filter(p => {
        if (seen.has(p.name)) return false
        seen.add(p.name)
        return true
    })

    // 카테고리별로 가까운 순 정렬 후 상한 적용 (과다 카테고리 정리)
    const byCat = new Map<string, any[]>()
    for (const p of dedup) {
        const arr = byCat.get(p.category) ?? []
        arr.push(p)
        byCat.set(p.category, arr)
    }
    const capped: any[] = []
    for (const [cat, arr] of byCat) {
        arr.sort((a, b) => a.distance - b.distance)
        capped.push(...arr.slice(0, CATEGORY_CAP[cat] ?? 10))
    }

    // 명소·자연·문화 우선, 그다음 거리순 → 상위 후보만 AI에 전달
    capped.sort((a, b) =>
        (CATEGORY_WEIGHT[b.category] ?? 1) - (CATEGORY_WEIGHT[a.category] ?? 1)
        || a.distance - b.distance,
    )
    return capped.slice(0, MAX_CANDIDATES)
}
