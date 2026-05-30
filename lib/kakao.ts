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

// 광역 검색용 지역 키워드
// broad=false: "부산광역시 해운대구" → "부산 해운대" (당일치기 — 구 단위)
// broad=true : "부산광역시 해운대구" → "부산"        (숙박 여행 — 도시 전체)
export function extractRegion(address: string, broad = false): string {
    const parts = address.split(' ')
    if (parts.length === 0) return address
    const p0 = parts[0]
    const isMetro = /특별시|광역시|특별자치시/.test(p0)
    const isProv  = /특별자치도|[가-힣]도$/.test(p0)

    if (isMetro) {
        const city = p0.replace(/특별자치시|특별시|광역시/, '')
        if (broad) return city // 숙박 여행: 도시 전체를 검색 (구로 좁히지 않음)
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

// tripType별 검색 설정 (radius는 Kakao 카테고리 검색 상한 20km 이내)
const SEARCH_CONFIG = {
    day:    { radius: 10000, size: 15 },
    '1n2d': { radius: 18000, size: 15 },
    '2n3d': { radius: 20000, size: 15 },
}

// tripType별 최종 후보 수 — 숙박이 길수록 도시 전역을 커버하도록 더 많이
const MAX_CANDIDATES_BY_TRIP: Record<string, number> = {
    day: 34, '1n2d': 42, '2n3d': 52,
}

// 후보 랭킹 — 명소/자연/문화를 식당·카페보다 우선
const CATEGORY_WEIGHT: Record<string, number> = {
    '관광명소': 5, '자연': 4, '문화시설': 4, '문화': 4, '쇼핑': 3, '맛집': 3, '카페': 2,
}
// 카테고리별 후보 상한 — 식당·카페가 풀을 독식하지 않도록
const CATEGORY_CAP: Record<string, number> = {
    '관광명소': 16, '자연': 8, '문화시설': 8, '쇼핑': 6, '맛집': 12, '카페': 8,
}

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
        .map((d: any, i: number) => ({
            name: d.place_name,
            address: d.road_address_name || d.address_name,
            category: label,
            lat: parseFloat(d.y),
            lng: parseFloat(d.x),
            distance: parseInt(d.distance, 10),
            rank: i,        // 검색 정확도/인기 순서
            wide: false,    // 반경 기반(근처) 결과
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
        .map((d: any, i: number) => ({
            name: d.place_name,
            address: d.road_address_name || d.address_name,
            category: label,
            lat: parseFloat(d.y),
            lng: parseFloat(d.x),
            distance: parseInt(d.distance, 10),
            rank: i,        // 검색 정확도/인기 순서
            wide: false,    // 반경 기반(근처) 결과
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
        .map((d: any, i: number) => {
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
                rank: i,       // 지역 내 인기/대표성 순서
                wide: true,    // 광역(도시 전역) 결과
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
    // 숙박 여행은 도시 전체(부산 등)를 검색해 한 동네에 갇히지 않게 한다
    const region = extractRegion(locationName, tripType !== 'day')

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
            wideAttractions, wideMustSee, wideFood, wideCafe, wideNature,
        ] = await Promise.all([
            // 반경 기반 (가까운 곳 우선 확보)
            searchByCategory('AT4', '관광명소', lat, lng, radius, size),
            searchByCategory('CT1', '문화시설', lat, lng, radius, size),
            searchByKeyword('맛집', '맛집', lat, lng, radius, size),
            searchByKeyword('카페', '카페', lat, lng, Math.min(radius, 10000), size),
            // 광역 키워드 검색 (도시 전역 커버 — 여러 구·지역의 대표 명소 확보)
            searchRegional(`${region} 관광명소`, '관광명소', lat, lng),
            searchRegional(`${region} 가볼만한곳`, '관광명소', lat, lng),
            searchRegional(`${region} 맛집 현지`, '맛집', lat, lng),
            searchRegional(`${region} 카페`, '카페', lat, lng),
            searchRegional(`${region} 자연 명소`, '자연', lat, lng),
        ])
        // 광역(인기) 결과를 앞에 둬서 중복 제거 시 대표 명소 버전이 살아남게 한다
        all = [
            ...wideAttractions, ...wideMustSee, ...wideNature, ...wideFood, ...wideCafe,
            ...nearLandmarks, ...nearCulture, ...nearFood, ...nearCafe,
        ]
    }

    // 중복 제거 (같은 장소명)
    const seen = new Set<string>()
    const dedup = all.filter(p => {
        if (seen.has(p.name)) return false
        seen.add(p.name)
        return true
    })

    // 카테고리별 상한 적용
    // - 당일치기: 가까운 순(걸어서/짧은 이동)
    // - 숙박 여행: 도시 인기/대표성 순(광역 결과 우선) — 멀어도 해운대·광안리 등 명소 확보
    const overnight = tripType !== 'day'
    const popScore = (p: any) => (p.wide ? 0 : 1000) + (p.rank ?? 999)
    const order = overnight
        ? (a: any, b: any) => popScore(a) - popScore(b) || a.distance - b.distance
        : (a: any, b: any) => a.distance - b.distance

    const byCat = new Map<string, any[]>()
    for (const p of dedup) {
        const arr = byCat.get(p.category) ?? []
        arr.push(p)
        byCat.set(p.category, arr)
    }
    const capped: any[] = []
    for (const [cat, arr] of byCat) {
        arr.sort(order)
        capped.push(...arr.slice(0, CATEGORY_CAP[cat] ?? 10))
    }

    // 명소·자연·문화 우선, 그다음 (숙박=인기순 / 당일=거리순) → 상위 후보만 AI에 전달
    capped.sort((a, b) =>
        (CATEGORY_WEIGHT[b.category] ?? 1) - (CATEGORY_WEIGHT[a.category] ?? 1)
        || order(a, b),
    )
    return capped.slice(0, MAX_CANDIDATES_BY_TRIP[tripType] ?? 34)
}

// 이름으로 좌표 조회 (지역 힌트와 함께)
// AI가 후보 목록 밖의 유명 장소(예: 부산 '이재모피자')를 코스에 넣었을 때,
// 그 이름을 Kakao에서 검색해 실제 좌표를 확보한다. 없으면 null.
export async function geocodeNamed(
    name: string, region: string, baseLat: number, baseLng: number,
): Promise<{ name: string; lat: number; lng: number; distance: number } | null> {
    const q = region ? `${region} ${name}` : name
    const res = await fetch(
        `${KAKAO_BASE}/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=5&sort=accuracy`,
        { headers },
    )
    const data = await res.json()
    const docs = (data.documents || []).filter((d: any) => !isExcluded(d.place_name))
    if (!docs.length) return null
    const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
    const t = norm(name)
    // 이름이 실제로 닮은 결과를 우선, 없으면 가장 정확도 높은 첫 결과
    const pick = docs.find((d: any) => {
        const pn = norm(d.place_name)
        return pn.length >= 2 && t.length >= 2 && (pn.includes(t) || t.includes(pn))
    }) || docs[0]
    const pLat = parseFloat(pick.y), pLng = parseFloat(pick.x)
    return {
        name: pick.place_name,
        lat: pLat,
        lng: pLng,
        distance: Math.round(haversine(baseLat, baseLng, pLat, pLng)),
    }
}

// 사진 속 "그 장소" = 코스의 주인공(앵커)
// 사진이 찍힌 좌표에 가장 가까운 '여행할 만한 곳'을 찾는다.
// (관광명소/문화시설/가볼만한곳 중 좌표에 가장 가까운 것)
// 없으면 null → 호출부에서 앵커 없이 일반 코스로 폴백.
export interface AnchorPlace {
    name: string
    address: string
    category: string
    lat: number
    lng: number
    distance: number
}

export async function findAnchor(lat: number, lng: number): Promise<AnchorPlace | null> {
    const RADIUS = 1500 // 사진 좌표 근처 — 보통 그 자리의 명소가 곧 촬영지
    const [landmarks, attractions, culture] = await Promise.all([
        searchByCategory('AT4', '관광명소', lat, lng, RADIUS, 5),
        searchByKeyword('가볼만한곳', '관광명소', lat, lng, RADIUS, 5),
        searchByCategory('CT1', '문화시설', lat, lng, RADIUS, 5),
    ])

    const pool = [...landmarks, ...attractions, ...culture]
    if (pool.length === 0) return null

    const seen = new Set<string>()
    const dedup = pool.filter(p => {
        if (seen.has(p.name)) return false
        seen.add(p.name)
        return true
    })

    // 좌표에 가장 가까운 여행지가 사진 속 그 장소일 확률이 가장 높다
    dedup.sort((a, b) => a.distance - b.distance)
    return dedup[0]
}
