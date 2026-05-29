export type TripType = 'day' | '1n2d' | '2n3d'
export type Theme = 'balanced' | 'food' | 'nature' | 'culture'

export interface AnalyzeRequest {
    imageBase64: string;
    mediaType: string;
}

export interface AnalyzeResponse {
    lat: number | null;
    lng: number | null;
    locationName: string;
    confidence: 'high' | 'medium' | 'low';
}

export interface Place {
    name: string;
    address: string;
    category: string;
    lat: number;
    lng: number;
    distance: string;
}

export interface DayInfo {
    day: number;
    title: string;
}

export interface CourseStep {
    order: number;
    day?: number;
    name: string;
    time: string;
    duration: string;
    desc: string;
    lat: number;
    lng: number;
    badge?: string;
    tags?: string[];
}

export interface Course {
    title: string;
    theme: string;
    totalTime: string;
    days?: DayInfo[];
    steps: CourseStep[];
    // 사진 속 그 장소 = 코스의 주인공(앵커). 코스가 이 장소를 중심으로 짜였음을 표시.
    anchor?: string;
}

export interface CourseRequest {
    locationName: string;
    lat: number;
    lng: number;
    places: Place[];
}

export interface RegenInfo {
    lat: number;
    lng: number;
    locationName: string;
    regionName: string;
    regionTi: number;
    tripType: TripType;
    theme: Theme;
    startTime: string;
}
