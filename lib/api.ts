// 클라이언트 코드에서는 내 서버만 호출
// Anthropic/Kakao API 키는 절대 노출 안 됨

import exifr from 'exifr';

export async function extractGPS(file: File) {
    try {
        const gps = await exifr.gps(file);
        return gps ? { lat: gps.latitude, lng: gps.longitude } : null;
    } catch {
        return null;
    }
}

export async function analyzePhoto(file: File) {
    const base64 = await fileToBase64(file);
    const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64.split(',')[1], mediaType: file.type }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
}

export async function fetchPlaces(lat: number, lng: number, tripType = 'day') {
    const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, tripType }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
}

export async function createCourse(
    locationName: string,
    lat: number,
    lng: number,
    places: any[],
    tripType = 'day',
    theme = 'balanced',
    startTime = '09:00',
    nocache = false,
    opts: { exclude?: string[]; note?: string } = {},
) {
    const res = await fetch('/api/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            locationName, lat, lng, places, tripType, theme, startTime, nocache,
            exclude: opts.exclude ?? [],
            note: opts.note ?? '',
        }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
}

// 단일 스팟 교체 — 나머지 일정은 유지하고 한 곳만 다른 곳으로
export async function swapPlace(
    locationName: string,
    lat: number,
    lng: number,
    places: any[],
    currentNames: string[],
    target: { name: string; badge?: string; time?: string },
    theme = 'balanced',
) {
    const res = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationName, lat, lng, places, currentNames, target, theme }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
}

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
