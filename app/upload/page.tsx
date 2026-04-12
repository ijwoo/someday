'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PlaceImage from '@/components/PlaceImage'
import Loading from '@/components/Loading'
import Toast, { showToast } from '@/components/Toast'
import Icon from '@/components/Icon'
import BottomNav from '@/components/BottomNav'
import { extractGPS } from '@/lib/exif'
import { analyzePhoto, fetchPlaces, createCourse } from '@/lib/api'
import { DEMO_COURSE } from '@/lib/demo'
import type { TripType, Theme } from '@/types'

const MAX_PHOTOS = 6

const POPULAR_REGIONS = [
  { name: '서울', sub: '홍대 · 성수 · 경복궁 · 익선동', ti: 0, lat: 37.5665, lng: 126.9780 },
  { name: '제주', sub: '협재 · 성산일출봉 · 한라산',    ti: 1, lat: 33.4996, lng: 126.5312 },
  { name: '부산', sub: '해운대 · 감천 · 남포동',         ti: 2, lat: 35.1796, lng: 129.0756 },
]

const TRIP_OPTIONS: { type: TripType; label: string; sub: string; icon: 'sun' | 'moon' | 'star' }[] = [
  { type: 'day',  label: '당일치기', sub: '4~6곳 · 하루 일정',      icon: 'sun'  },
  { type: '1n2d', label: '1박 2일',  sub: '6~8곳 · 알찬 1박',       icon: 'moon' },
  { type: '2n3d', label: '2박 3일',  sub: '10~13곳 · 여유로운 여행', icon: 'star' },
]

const THEME_OPTIONS: { type: Theme; label: string; emoji: string }[] = [
  { type: 'balanced', label: '균형잡힌', emoji: '✨' },
  { type: 'food',     label: '맛집 위주', emoji: '🍽' },
  { type: 'nature',   label: '자연 · 뷰', emoji: '🌿' },
  { type: 'culture',  label: '문화 · 역사', emoji: '🏛' },
]

const START_TIMES = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00']

type Region = {
  name: string; lat: number; lng: number; ti: number
  sub?: string; photoCount?: number
}
type PhotoResult = {
  file: File
  status: 'gps' | 'ai' | 'none'
  lat?: number
  lng?: number
}
type Step = 'idle' | 'results' | 'analyzed' | 'duration'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function UploadPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('idle')
  const [isManual, setIsManual] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadTitle, setLoadTitle] = useState('분석하는 중')
  const [loadSub, setLoadSub] = useState('잠시만 기다려주세요')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [photoResults, setPhotoResults] = useState<PhotoResult[]>([])
  const [detectedRegions, setDetectedRegions] = useState<Region[]>([])
  const [pendingRegion, setPendingRegion] = useState<Region | null>(null)
  // duration step options
  const [selectedType, setSelectedType] = useState<TripType>('day')
  const [theme, setTheme] = useState<Theme>('balanced')
  const [startTime, setStartTime] = useState('09:00')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleAnalyze() {
    setLoading(true)
    setLoadTitle('사진 분석 중')
    setLoadSub(`0 / ${uploadedFiles.length}장 처리 중`)

    try {
      const results: PhotoResult[] = []

      // Phase 1: GPS 추출
      for (let i = 0; i < uploadedFiles.length; i++) {
        setLoadSub(`${i + 1} / ${uploadedFiles.length}장 GPS 확인 중`)
        const gps = await extractGPS(uploadedFiles[i])
        results.push({
          file: uploadedFiles[i],
          status: gps ? 'gps' : 'none',
          lat: gps?.lat,
          lng: gps?.lng,
        })
      }

      // Phase 2: GPS 없는 사진은 AI로 분석 (최대 3장)
      const noGpsIdx = results.map((r, i) => r.status === 'none' ? i : -1).filter(i => i >= 0)
      if (noGpsIdx.length > 0) {
        setLoadTitle('AI 이미지 분석 중')
        setLoadSub(`GPS 없는 ${noGpsIdx.length}장을 AI가 분석해요`)
        for (const i of noGpsIdx.slice(0, 3)) {
          try {
            const res = await analyzePhoto(results[i].file)
            if (res.lat && res.lng) {
              results[i] = { ...results[i], status: 'ai', lat: res.lat, lng: res.lng }
            }
          } catch {}
        }
      }

      // Phase 3: 위치별 클러스터링 + 지역명 조회
      setLoadTitle('위치 확인 중')
      setLoadSub('지역명을 가져오고 있어요')

      type Cluster = { lat: number; lng: number; photoCount: number; hasGps: boolean; hasAi: boolean }
      const clusters: Cluster[] = []
      for (const r of results) {
        if (!r.lat || !r.lng) continue
        const nearby = clusters.find(c => haversineKm(r.lat!, r.lng!, c.lat, c.lng) < 30)
        if (nearby) {
          nearby.photoCount++
          if (r.status === 'gps') nearby.hasGps = true
          if (r.status === 'ai') nearby.hasAi = true
        } else {
          clusters.push({ lat: r.lat, lng: r.lng, photoCount: 1, hasGps: r.status === 'gps', hasAi: r.status === 'ai' })
        }
      }

      const regions: Region[] = []
      for (const c of clusters) {
        try {
          const { locationName } = await fetchPlaces(c.lat, c.lng, 'day')
          const src = c.hasGps && c.hasAi ? 'GPS · AI 추정'
            : c.hasGps ? 'GPS'
            : 'AI 추정'
          regions.push({
            name: locationName || '감지된 위치',
            lat: c.lat, lng: c.lng,
            ti: regions.length % 4,
            sub: `${src} · 사진 ${c.photoCount}장`,
            photoCount: c.photoCount,
          })
        } catch {
          regions.push({ name: '감지된 위치', lat: c.lat, lng: c.lng, ti: 0, photoCount: c.photoCount })
        }
      }

      setPhotoResults(results)
      setDetectedRegions(regions)
      setIsManual(regions.length === 0)
      setStep('results')
    } catch {
      showToast('분석 중 오류가 발생했어요')
      setIsManual(true)
      setDetectedRegions(POPULAR_REGIONS)
      setStep('analyzed')
    }

    setLoading(false)
  }

  function selectRegion(r: Region) {
    setPendingRegion(r)
    setStep('duration')
  }

  async function buildCourse() {
    const r = pendingRegion!
    const tripLabel = TRIP_OPTIONS.find(o => o.type === selectedType)!.label
    setLoading(true)
    setLoadTitle('주변 장소 검색 중')
    setLoadSub(`${r.name} 일대를 탐색하고 있어요`)
    try {
      const { locationName: fetched, places } = await fetchPlaces(r.lat, r.lng, selectedType)
      const locationName = (fetched && fetched !== '알 수 없는 위치') ? fetched : r.name

      setLoadTitle('코스 설계 중')
      setLoadSub(`AI가 ${tripLabel} 코스를 짜고 있어요`)

      const course = await createCourse(locationName, r.lat, r.lng, places, selectedType, theme, startTime)
      localStorage.setItem('someday-course', JSON.stringify(course))
      localStorage.setItem('someday-regen', JSON.stringify({
        lat: r.lat, lng: r.lng, locationName,
        regionName: r.name, regionTi: r.ti,
        tripType: selectedType, theme, startTime,
      }))
      localStorage.removeItem('someday-is-demo')
    } catch {
      localStorage.setItem('someday-course', JSON.stringify(DEMO_COURSE))
      localStorage.setItem('someday-is-demo', '1')
      showToast('코스 생성에 실패해 샘플 코스를 보여드려요')
    }
    localStorage.setItem('someday-region', JSON.stringify({ name: r.name, ti: r.ti }))
    setLoading(false)
    router.push('/plan')
  }

  function handleFiles(files: FileList) {
    if (!files.length) return
    const incoming = Array.from(files)
    const combined = [...uploadedFiles, ...incoming].slice(0, MAX_PHOTOS)
    if (uploadedFiles.length + incoming.length > MAX_PHOTOS)
      showToast(`사진은 최대 ${MAX_PHOTOS}장까지 추가할 수 있어요`)
    setUploadedFiles(combined)
    setStep('idle')
    setDetectedRegions([])
    setPendingRegion(null)
  }

  const headerTitle =
    step === 'duration' ? '여행 옵션 설정'
    : step === 'results' ? '분석 결과'
    : step === 'analyzed' ? '지역 선택'
    : '사진 분석'

  function goBack() {
    if (step === 'duration') { setStep(photoResults.length > 0 ? 'results' : 'analyzed'); return }
    if (step === 'results') { setStep('idle'); setPhotoResults([]); setDetectedRegions([]); return }
    if (step === 'analyzed') { setStep('idle'); setDetectedRegions([]); return }
    router.push('/')
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px 12px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        flexShrink: 0,
      }}>
        <button className="icon-btn icon-btn-ghost" onClick={goBack}>
          <Icon name="chevron-left" size={20} color="var(--text)" strokeWidth={2}/>
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3, color: 'var(--text)' }}>
          {headerTitle}
        </span>
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => e.target.files && handleFiles(e.target.files)}/>
        {step === 'idle' && uploadedFiles.length > 0 && uploadedFiles.length < MAX_PHOTOS && (
          <button onClick={() => fileInputRef.current?.click()}
            className="btn btn-ghost"
            style={{ marginLeft: 'auto', height: 34, padding: '0 14px', fontSize: 13 }}>
            <Icon name="plus" size={14} color="var(--blue)" strokeWidth={2.2}/>
            사진 추가
          </button>
        )}
      </div>

      <div className="scr">

        {/* ── IDLE: 사진 없음 ── */}
        {step === 'idle' && uploadedFiles.length === 0 && (
          <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 96, height: 96, borderRadius: 28,
              background: 'linear-gradient(135deg, rgba(59,126,248,0.1), rgba(91,148,255,0.06))',
              border: '1.5px solid rgba(59,126,248,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="image" size={40} color="var(--blue)" strokeWidth={1.2}/>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: -0.4 }}>사진을 가져오세요</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.8 }}>
                GPS가 있는 사진은 자동으로 장소를 인식해요<br/>
                GPS가 없으면 AI가 이미지를 분석해드려요<br/>
                <span style={{ color: 'var(--blue)', fontWeight: 600 }}>최대 {MAX_PHOTOS}장</span>까지 추가할 수 있어요
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => fileInputRef.current?.click()}>
              <Icon name="plus" size={18} color="#fff" strokeWidth={2}/>
              사진 추가하기
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--blue3)' }}/>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>또는</span>
              <div style={{ flex: 1, height: 1, background: 'var(--blue3)' }}/>
            </div>
            <button className="btn btn-secondary" style={{ width: '100%' }}
              onClick={() => { setIsManual(true); setDetectedRegions(POPULAR_REGIONS); setStep('analyzed') }}>
              <Icon name="pin" size={16} color="var(--text)" strokeWidth={1.8}/>
              지역 직접 선택하기
            </button>
          </div>
        )}

        {/* ── IDLE: 사진 있음 ── */}
        {step === 'idle' && uploadedFiles.length > 0 && (
          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)' }}>
                {uploadedFiles.length}/{MAX_PHOTOS}장 선택됨
              </span>
              <button onClick={() => setUploadedFiles([])}
                style={{ fontSize: 12, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                초기화
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, marginBottom: 20 }}>
              {uploadedFiles.map((f, i) => (
                <UploadedCell key={i} file={f} onRemove={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))}/>
              ))}
              {uploadedFiles.length < MAX_PHOTOS && (
                <button onClick={() => fileInputRef.current?.click()} style={{
                  aspectRatio: '1', borderRadius: 12,
                  border: '1.5px dashed rgba(59,126,248,0.3)',
                  background: 'rgba(59,126,248,0.04)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 4, cursor: 'pointer',
                }}>
                  <Icon name="plus" size={20} color="var(--blue)" strokeWidth={2}/>
                  <span style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 600 }}>추가</span>
                </button>
              )}
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAnalyze}>
              <Icon name="sparkle" size={18} color="#fff" strokeWidth={1.5}/>
              장소 분석하기
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>
              GPS 정보 또는 AI로 촬영 장소를 인식해요
            </p>
          </div>
        )}

        {/* ── RESULTS: 사진별 분석 결과 + 위치 선택 ── */}
        {step === 'results' && (
          <div style={{ padding: '0 20px 32px', animation: 'slideUp 0.3s ease' }}>

            {/* 사진별 상태 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 10, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                사진별 분석 결과
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 } as React.CSSProperties}>
                {photoResults.map((r, i) => (
                  <PhotoStatusCell key={i} file={r.file} status={r.status}/>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {photoResults.filter(r => r.status === 'gps').length > 0 && (
                  <span className="chip chip-blue">
                    📍 GPS {photoResults.filter(r => r.status === 'gps').length}장
                  </span>
                )}
                {photoResults.filter(r => r.status === 'ai').length > 0 && (
                  <span className="chip chip-teal">
                    🤖 AI 추정 {photoResults.filter(r => r.status === 'ai').length}장
                  </span>
                )}
                {photoResults.filter(r => r.status === 'none').length > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 8,
                    background: 'rgba(148,163,184,0.12)', color: 'var(--text3)',
                  }}>
                    ❓ 위치 불명 {photoResults.filter(r => r.status === 'none').length}장
                  </span>
                )}
              </div>
            </div>

            {/* 위치 후보 */}
            {!isManual && detectedRegions.length > 0 ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3, marginBottom: 4 }}>
                  어느 지역으로 코스를 짤까요?
                </div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>
                  감지된 위치 중 하나를 선택하세요
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {detectedRegions.map((r, i) => (
                    <button key={i} className="glass" onClick={() => selectRegion(r)} style={{
                      width: '100%', padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 14,
                      borderRadius: 'var(--r-sm)', cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.9)',
                      fontFamily: 'inherit', textAlign: 'left',
                      animation: `itemIn 0.3s ${i * 0.07}s ease both`,
                    }}>
                      <div style={{ width: 46, height: 46, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                        <PlaceImage name={r.name} width={46} height={46}/>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.3, marginBottom: 2 }}>{r.name}</div>
                        {r.sub && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.sub}</div>}
                      </div>
                      <Icon name="chevron-right" size={16} color="var(--text3)" strokeWidth={1.8}/>
                    </button>
                  ))}
                </div>
                <button className="btn btn-secondary" style={{ width: '100%' }}
                  onClick={() => { setIsManual(true); setDetectedRegions(POPULAR_REGIONS) }}>
                  <Icon name="pin" size={16} color="var(--text)" strokeWidth={1.8}/>
                  다른 지역 직접 선택하기
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3, marginBottom: 4 }}>
                  위치를 인식하지 못했어요
                </div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>
                  인기 여행지에서 선택해주세요
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {POPULAR_REGIONS.map((r, i) => (
                    <button key={i} className="glass" onClick={() => selectRegion(r)} style={{
                      width: '100%', padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 14,
                      borderRadius: 'var(--r-sm)', cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.9)',
                      fontFamily: 'inherit', textAlign: 'left',
                      animation: `itemIn 0.3s ${i * 0.07}s ease both`,
                    }}>
                      <div style={{ width: 46, height: 46, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                        <PlaceImage name={r.name} width={46} height={46}/>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.3, marginBottom: 2 }}>{r.name}</div>
                        {r.sub && <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>}
                      </div>
                      <Icon name="chevron-right" size={16} color="var(--text3)" strokeWidth={1.8}/>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ANALYZED: 지역 선택 (수동) ── */}
        {step === 'analyzed' && (
          <div style={{ padding: '0 20px 32px', animation: 'slideUp 0.3s ease' }}>
            {isManual ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3, marginBottom: 4 }}>인기 여행지</div>
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>지역을 선택하면 AI가 코스를 만들어드려요</div>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', marginBottom: 16,
                background: 'linear-gradient(135deg, rgba(59,126,248,0.08), rgba(91,148,255,0.04))',
                borderRadius: 'var(--r-sm)', border: '1px solid rgba(59,126,248,0.12)',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--blue), var(--blue2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(59,126,248,0.28)',
                }}>
                  <Icon name="sparkle" size={18} color="#fff" strokeWidth={1.5}/>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>분석 완료</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>코스를 만들 지역을 선택하세요</div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {detectedRegions.map((r, i) => (
                <button key={i} className="glass" onClick={() => selectRegion(r)} style={{
                  width: '100%', padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  borderRadius: 'var(--r-sm)', cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.9)',
                  fontFamily: 'inherit', textAlign: 'left',
                  animation: `itemIn 0.3s ${i * 0.07}s ease both`,
                }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                    <PlaceImage name={r.name} width={46} height={46}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.3, marginBottom: 2 }}>{r.name}</div>
                    {r.sub && <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>}
                    {r.photoCount != null && <div style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600, marginTop: 2 }}>사진 {r.photoCount}장 감지</div>}
                  </div>
                  <Icon name="chevron-right" size={16} color="var(--text3)" strokeWidth={1.8}/>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── DURATION: 여행 옵션 ── */}
        {step === 'duration' && pendingRegion && (
          <div style={{ padding: '0 20px 32px', animation: 'slideUp 0.3s ease' }}>

            {/* 선택된 지역 요약 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 22,
              background: 'linear-gradient(135deg, rgba(59,126,248,0.08), rgba(91,148,255,0.04))',
              borderRadius: 'var(--r-sm)', border: '1px solid rgba(59,126,248,0.12)',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                <PlaceImage name={pendingRegion.name} width={36} height={36}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>{pendingRegion.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>목적지 선택됨</div>
              </div>
            </div>

            {/* 여행 기간 */}
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 10, letterSpacing: -0.2 }}>여행 기간</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
              {TRIP_OPTIONS.map((opt, i) => {
                const isSel = selectedType === opt.type
                return (
                  <button key={opt.type} onClick={() => setSelectedType(opt.type)} style={{
                    width: '100%', padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    background: isSel ? 'linear-gradient(135deg, rgba(59,126,248,0.12), rgba(91,148,255,0.06))' : 'rgba(255,255,255,0.7)',
                    border: isSel ? '2px solid rgba(59,126,248,0.5)' : '1.5px solid rgba(200,215,255,0.5)',
                    boxShadow: isSel ? '0 2px 12px rgba(59,126,248,0.15)' : 'none',
                    transition: 'all 0.15s',
                    animation: `itemIn 0.25s ${i * 0.06}s ease both`,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: isSel
                        ? (opt.type === 'day' ? 'rgba(245,158,11,0.15)' : opt.type === '1n2d' ? 'rgba(59,126,248,0.15)' : 'rgba(139,92,246,0.15)')
                        : 'rgba(200,215,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={opt.icon} size={20}
                        color={isSel ? (opt.type === 'day' ? '#f59e0b' : opt.type === '1n2d' ? 'var(--blue)' : '#8b5cf6') : 'var(--text3)'}
                        strokeWidth={1.6}/>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: isSel ? 'var(--blue)' : 'var(--text)', letterSpacing: -0.3, marginBottom: 2 }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{opt.sub}</div>
                    </div>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: isSel ? 'var(--blue)' : 'transparent',
                      border: isSel ? 'none' : '1.5px solid rgba(180,200,255,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSel && <Icon name="check" size={11} color="#fff" strokeWidth={2.5}/>}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 여행 테마 */}
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 10, letterSpacing: -0.2 }}>여행 테마</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
              {THEME_OPTIONS.map(opt => {
                const isSel = theme === opt.type
                return (
                  <button key={opt.type} onClick={() => setTheme(opt.type)} style={{
                    padding: '8px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 13, fontWeight: 600,
                    background: isSel ? 'var(--blue)' : 'rgba(255,255,255,0.7)',
                    color: isSel ? '#fff' : 'var(--text2)',
                    border: isSel ? 'none' : '1.5px solid rgba(200,215,255,0.5)',
                    boxShadow: isSel ? '0 2px 10px rgba(59,126,248,0.25)' : 'none',
                    transition: 'all 0.15s',
                  }}>
                    {opt.emoji} {opt.label}
                  </button>
                )
              })}
            </div>

            {/* 출발 시간 */}
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 10, letterSpacing: -0.2 }}>
              출발 시간 {selectedType !== 'day' && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)' }}>(1일차 기준)</span>}
            </div>
            <div style={{ display: 'flex', gap: 7, marginBottom: 28, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 } as React.CSSProperties}>
              {START_TIMES.map(t => {
                const isSel = startTime === t
                return (
                  <button key={t} onClick={() => setStartTime(t)} style={{
                    flexShrink: 0, padding: '7px 13px', borderRadius: 16, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 13, fontWeight: 600,
                    background: isSel ? 'var(--blue)' : 'rgba(255,255,255,0.7)',
                    color: isSel ? '#fff' : 'var(--text2)',
                    border: isSel ? 'none' : '1.5px solid rgba(200,215,255,0.5)',
                    boxShadow: isSel ? '0 2px 10px rgba(59,126,248,0.25)' : 'none',
                    transition: 'all 0.15s',
                  }}>
                    {t}
                  </button>
                )
              })}
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={buildCourse}>
              <Icon name="sparkle" size={18} color="#fff" strokeWidth={1.5}/>
              코스 만들기
            </button>
          </div>
        )}
      </div>

      <Loading visible={loading} title={loadTitle} subtitle={loadSub}/>
      <Toast/>
      <BottomNav activeOverride={1}/>
    </div>
  )
}

function PhotoStatusCell({ file, status }: { file: File; status: 'gps' | 'ai' | 'none' }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  if (!url) return <div style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 12, background: 'var(--blue4)' }}/>
  const badge =
    status === 'gps' ? { label: 'GPS', bg: 'rgba(59,126,248,0.9)' } :
    status === 'ai'  ? { label: 'AI',  bg: 'rgba(16,185,129,0.88)' } :
                       { label: '?',   bg: 'rgba(148,163,184,0.85)' }
  return (
    <div style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
      <div style={{
        position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)',
        background: badge.bg, color: '#fff',
        fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap',
      }}>{badge.label}</div>
    </div>
  )
}

function UploadedCell({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  if (!url) return <div style={{ aspectRatio: '1', borderRadius: 12, background: 'var(--blue4)' }}/>
  return (
    <div style={{ aspectRatio: '1', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
      <button onClick={onRemove} style={{
        position: 'absolute', top: 4, right: 4,
        width: 20, height: 20, borderRadius: '50%',
        background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="x" size={11} color="#fff" strokeWidth={2.5}/>
      </button>
    </div>
  )
}
