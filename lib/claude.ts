const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const headers = {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY!,
    'anthropic-version': '2023-06-01',
};

function extractJSON(text: string): string {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
        return text.slice(start, end + 1);
    }
    throw new Error(`No JSON found in response: ${text.slice(0, 100)}`);
}

// 모든 코스/교체 프롬프트에 공통으로 들어가는 품질 가이드
const QUALITY_RULE = "- Build a real trip, not a list of nearby shops. Favor iconic, representative, travel-worthy spots (landmarks, scenic spots, signature local eateries, distinctive cafes) AND the region's genuinely famous local restaurants/foods. Avoid generic chains, cinemas, marts, and everyday errands. You MAY include a few of the region's well-known signature spots and famous local eateries by their exact real Korean name even if they are not in the candidate list — but ONLY real, genuinely well-known places (no invented names). Prefer the candidate list for everything else."

const THEME_INSTRUCTIONS: Record<string, string> = {
    balanced: '- Balance all categories: mix sightseeing, food, cafe, and culture spots evenly.',
    food:     '- FOOD THEME: At least 50% of spots must be restaurants or local food experiences. Prioritize 음식점/맛집.',
    nature:   '- NATURE THEME: Prioritize parks, mountains, rivers, coastal areas, and scenic viewpoints (자연/공원/뷰포인트).',
    culture:  '- CULTURE THEME: Prioritize museums, temples, galleries, historical landmarks, and cultural sites (문화/역사).',
}

// Vision — 사진에서 장소 인식
export async function analyzeImage(base64: string, mediaType: string) {
    const res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            system: `사진을 보고 촬영 장소를 파악하세요.
JSON만 반환하세요 (다른 텍스트 없이):
{"name":"장소명","lat":위도숫자,"lng":경도숫자,"confidence":"high|medium|low"}
장소를 특정할 수 없으면 lat, lng를 null로.`,
            messages: [{
                role: 'user',
                content: [
                    { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                    { type: 'text', text: '이 사진의 촬영 장소는 어디인가요?' },
                ],
            }],
        }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Claude API 오류');
    const text = data.content?.[0]?.text || '';
    try { return JSON.parse(extractJSON(text)); }
    catch { return { lat: null, lng: null, confidence: 'low' }; }
}

// Text — 코스 생성
export async function generateCourse(
    locationName: string,
    places: { name: string; category: string; distance: string | number; lat?: number; lng?: number }[],
    tripType: 'day' | '1n2d' | '2n3d' = 'day',
    theme = 'balanced',
    startTime = '09:00',
    opts: { exclude?: string[]; note?: string; anchor?: string } = {},
) {
    const exclude = opts.exclude ?? []
    const note = (opts.note ?? '').trim()
    // 사진 속 그 장소(주인공). 사용자가 직접 제외했다면 무시한다.
    const anchor = opts.anchor && !exclude.includes(opts.anchor) ? opts.anchor : ''

    const sorted = [...places].sort((a, b) => Number(a.distance) - Number(b.distance))
    // 사용자가 뺀 장소는 후보에서 아예 제거
    const avail = exclude.length ? sorted.filter(p => !exclude.includes(p.name)) : sorted

    const extraRules = [
        anchor ? `- ANCHOR — the heart of this trip: "${anchor}". This is the exact place the traveler's photo came from, and the whole course exists to take them there. You MUST include "${anchor}" as a spot, place it FIRST (on Day 1), and choose every other spot so it complements "${anchor}" — same area, matching mood. Never drop it.` : '',
        exclude.length ? `- The user removed these places — NEVER include them: ${exclude.join(', ')}.` : '',
        note ? `- Extra request from the user, treat it as a priority: "${note}".` : '',
    ].filter(Boolean).join('\n')

    const baseTheme = THEME_INSTRUCTIONS[theme] ?? THEME_INSTRUCTIONS.balanced
    const themeRule = [baseTheme, QUALITY_RULE, extraRules].filter(Boolean).join('\n')

    let systemPrompt: string
    let userContent: string
    let maxTokens: number

    if (tripType === 'day') {
        maxTokens = 1500
        systemPrompt = `You are a travel course planner. Respond with valid JSON only — no other text.

JSON format:
{"title":"string","theme":"string","totalTime":"약 6~8시간","steps":[{"order":1,"name":"string","time":"HH:MM","duration":"string","desc":"string","badge":"string","tags":["string"]}]}

Rules:
- Pick 4-6 places for a single-day course ordered by logical visit flow
- First spot starts at ${startTime}. Schedule subsequent spots realistically.
- title: evocative Korean title including location name
- badge: one of 관광명소/맛집/카페/문화/자연/쇼핑
- tags: array from [food, view, cafe, culture]
- desc: 1-2 Korean sentences on why to visit
- name: exact place name — prefer the candidate list; for the region's famous spots/restaurants not listed, use their exact real Korean name
${themeRule}`

        userContent = `Location: ${locationName}
Nearby places:
${avail.map(p => `- ${p.name} (${p.category}, ${p.distance}m)`).join('\n')}

Create a single-day course starting at ${startTime}. JSON only.`

    } else if (tripType === '1n2d') {
        maxTokens = 2500
        systemPrompt = `You are a travel course planner. Respond with valid JSON only — no other text.

JSON format:
{"title":"string","theme":"string","totalTime":"1박 2일","steps":[{"order":1,"day":1,"name":"string","time":"HH:MM","duration":"string","desc":"string","badge":"string","tags":["string"]}]}

CRITICAL RULES:
1. Every step MUST have "day": 1 or 2 (integer). Never omit.
2. Day 1: 3-4 spots starting at ${startTime} (afternoon arrival feel). Day 2: 3-4 spots starting at 09:00.
3. Cover the WHOLE region, not one neighborhood. Treat this as a trip across the entire city/region (${locationName} and beyond), spanning multiple districts. Day 1 explores one district/area, Day 2 a clearly DIFFERENT district. Favor the region's iconic must-see spots even if farther — use the distance spread in the list.
4. Total 6-8 spots. "order" is continuous across days (1,2,3...).
5. badge: one of 관광명소/맛집/카페/문화/자연/쇼핑
7. tags: array from [food, view, cafe, culture]
8. desc: 1-2 Korean sentences
9. name: exact place name — prefer the list; for famous local spots/restaurants not listed, use their exact real Korean name
${themeRule}`

        userContent = `Location: ${locationName}
Available places (the region's top/most-representative spots first; the number is distance in meters from the start point — use it to group spots by area per day):
${avail.map(p => `- ${p.name} (${p.category}, ${p.distance}m)`).join('\n')}

Create a 1-night 2-day trip that covers the region's signature spots across two different areas. EVERY step needs "day":1 or "day":2. JSON only.`

    } else {
        maxTokens = 3500
        systemPrompt = `You are a travel course planner. Respond with valid JSON only — no other text.

JSON format:
{"title":"string","theme":"string","totalTime":"2박 3일","steps":[{"order":1,"day":1,"name":"string","time":"HH:MM","duration":"string","desc":"string","badge":"string","tags":["string"]}]}

CRITICAL RULES:
1. Every step MUST have "day": 1, 2, or 3 (integer). NEVER omit the day field.
2. Distribution: Day 1 = 3-4 spots (arrival + evening), Day 2 = 4-5 spots (full day), Day 3 = 3-4 spots (morning + departure).
3. COVER THE WHOLE REGION across 3 days — this is a trip through the entire city/region (${locationName} and beyond), NOT one neighborhood. Each day explores a DIFFERENT district/zone. Prioritize the region's signature must-see landmarks even when they are far apart, using the distance spread to assign closer places to Day 1/3 and the farther iconic spots to Day 2.
4. Total 10-13 spots. "order" is continuous (1,2,3...) across all days.
5. Time: Day 1 starts at ${startTime}, Day 2 starts 09:00, Day 3 starts 09:00.
6. badge: one of 관광명소/맛집/카페/문화/자연/쇼핑
8. tags: array from [food, view, cafe, culture]
9. desc: 1-2 Korean sentences
10. name: exact place name — prefer the list; for famous local spots/restaurants not listed, use their exact real Korean name
${themeRule}`

        userContent = `Location: ${locationName}
Available places (the region's top/most-representative spots first; the number is distance in meters from the start point — use it to group spots by area per day):
${avail.map(p => `- ${p.name} (${p.category}, ${p.distance}m)`).join('\n')}

Create a 2-night 3-day trip that journeys across the whole region — its signature must-see spots spread over three different areas/districts. EVERY step MUST have "day":1, "day":2, or "day":3. JSON only.`
    }

    const res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [{ role: 'user', content: userContent }],
        }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Claude API 오류');
    const text = data.content?.[0]?.text || '';
    return JSON.parse(extractJSON(text));
}

// Text — 단일 스팟 교체 (나머지 일정은 유지하고 한 곳만 다른 곳으로)
export async function generateReplacement(
    locationName: string,
    places: { name: string; category: string; distance: string | number; lat?: number; lng?: number }[],
    currentNames: string[],
    target: { name: string; badge?: string; time?: string },
    theme = 'balanced',
) {
    const used = new Set(currentNames)
    const sorted = [...places].sort((a, b) => Number(a.distance) - Number(b.distance))
    // 이미 코스에 포함된 장소는 제외 (교체 대상 자신 포함)
    const candidates = sorted.filter(p => !used.has(p.name))
    if (candidates.length === 0) throw new Error('대체할 장소가 없어요')

    const themeRule = `${THEME_INSTRUCTIONS[theme] ?? THEME_INSTRUCTIONS.balanced}\n${QUALITY_RULE}`

    const systemPrompt = `You are a travel course planner. The user wants to swap ONE spot in an existing course for a different place. Respond with valid JSON only — no other text.

JSON format:
{"name":"string","desc":"string","badge":"string","tags":["string"],"duration":"string"}

Rules:
- Pick exactly ONE place from the candidate list that is a good alternative to the spot being replaced.
- Prefer a place with a similar vibe/category to the replaced spot, located near the area.
- name: use the EXACT place name from the candidate list. Never invent a name.
- badge: one of 관광명소/맛집/카페/문화/자연/쇼핑
- tags: array from [food, view, cafe, culture]
- desc: 1-2 Korean sentences on why to visit
- duration: a realistic stay duration like "1시간 30분"
${themeRule}`

    const userContent = `Location: ${locationName}
Spot being replaced: ${target.name}${target.badge ? ` (${target.badge})` : ''}${target.time ? ` at ${target.time}` : ''}

Candidate places (nearest→farthest, none are already in the course):
${candidates.map(p => `- ${p.name} (${p.category}, ${p.distance}m)`).join('\n')}

Pick ONE replacement for "${target.name}". JSON only.`

    const res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 400,
            system: systemPrompt,
            messages: [{ role: 'user', content: userContent }],
        }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Claude API 오류');
    const text = data.content?.[0]?.text || '';
    return JSON.parse(extractJSON(text));
}
