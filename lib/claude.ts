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
) {
    const sorted = [...places].sort((a, b) => Number(a.distance) - Number(b.distance))
    const themeRule = THEME_INSTRUCTIONS[theme] ?? THEME_INSTRUCTIONS.balanced

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
- name: use exact place name from the list
${themeRule}`

        userContent = `Location: ${locationName}
Nearby places:
${sorted.map(p => `- ${p.name} (${p.category}, ${p.distance}m)`).join('\n')}

Create a single-day course starting at ${startTime}. JSON only.`

    } else if (tripType === '1n2d') {
        maxTokens = 2500
        systemPrompt = `You are a travel course planner. Respond with valid JSON only — no other text.

JSON format:
{"title":"string","theme":"string","totalTime":"1박 2일","steps":[{"order":1,"day":1,"name":"string","time":"HH:MM","duration":"string","desc":"string","badge":"string","tags":["string"]}]}

CRITICAL RULES:
1. Every step MUST have "day": 1 or 2 (integer). Never omit.
2. Day 1: 3-4 spots starting at ${startTime} (afternoon arrival feel). Day 2: 3-4 spots starting at 09:00.
3. Geographic flow: Day 1 in one area, Day 2 explores a DIFFERENT direction/zone.
4. Total 6-8 spots. "order" is continuous across days (1,2,3...).
5. badge: one of 관광명소/맛집/카페/문화/자연/쇼핑
7. tags: array from [food, view, cafe, culture]
8. desc: 1-2 Korean sentences
9. name: exact place name from list
${themeRule}`

        userContent = `Location: ${locationName}
Available places (sorted nearest→farthest — use distance spread to create geographic day variety):
${sorted.map(p => `- ${p.name} (${p.category}, ${p.distance}m)`).join('\n')}

Create a 1-night 2-day trip. EVERY step needs "day":1 or "day":2. JSON only.`

    } else {
        maxTokens = 3500
        systemPrompt = `You are a travel course planner. Respond with valid JSON only — no other text.

JSON format:
{"title":"string","theme":"string","totalTime":"2박 3일","steps":[{"order":1,"day":1,"name":"string","time":"HH:MM","duration":"string","desc":"string","badge":"string","tags":["string"]}]}

CRITICAL RULES:
1. Every step MUST have "day": 1, 2, or 3 (integer). NEVER omit the day field.
2. Distribution: Day 1 = 3-4 spots (arrival + evening), Day 2 = 4-5 spots (full day), Day 3 = 3-4 spots (morning + departure).
3. GEOGRAPHIC VARIETY: Each day must explore a DIFFERENT zone or direction from center. Use the distance spread in the place list to assign closer places to Day 1/3 and farther places to Day 2.
4. Total 10-13 spots. "order" is continuous (1,2,3...) across all days.
5. Time: Day 1 starts at ${startTime}, Day 2 starts 09:00, Day 3 starts 09:00.
6. badge: one of 관광명소/맛집/카페/문화/자연/쇼핑
8. tags: array from [food, view, cafe, culture]
9. desc: 1-2 Korean sentences
10. name: exact place name from list
${themeRule}`

        userContent = `Location: ${locationName}
Available places (sorted nearest→farthest — use distance spread to ensure geographic variety across 3 days):
${sorted.map(p => `- ${p.name} (${p.category}, ${p.distance}m)`).join('\n')}

Create a 2-night 3-day trip. EVERY step MUST have "day":1, "day":2, or "day":3. JSON only.`
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
