'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { paintScene } from '@/components/SceneCanvas'
import PlaceImage from '@/components/PlaceImage'
import Loading from '@/components/Loading'
import Toast, { showToast } from '@/components/Toast'
import Icon from '@/components/Icon'
import BottomNav from '@/components/BottomNav'
import { fetchPlaces, createCourse } from '@/lib/api'
import { DEMO_COURSE } from '@/lib/demo'
import type { TripType, Course, CourseStep, RegenInfo } from '@/types'

const TAG = { food:'맛집', view:'뷰맛집', cafe:'카페', culture:'문화' }
const TAG_COLOR = { food:'chip-rose', view:'chip-blue', cafe:'chip-amber', culture:'chip-teal' }
const DAY_COLORS: Record<number, string> = { 1:'#3b7ef8', 2:'#10b981', 3:'#f59e0b' }

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function drivingMinutes(a: CourseStep, b: CourseStep) {
  if (!a.lat || !a.lng || !b.lat || !b.lng) return null
  const km = haversineKm(a.lat, a.lng, b.lat, b.lng)
  return Math.max(5, Math.round(km / 40 * 60))
}

type View = 'plan' | 'map' | 'share'

export default function PlanPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('plan')
  const [dayIdx, setDayIdx] = useState(0)
  const [course, setCourse] = useState<Course>(DEMO_COURSE as Course)
  const [region, setRegion] = useState({ name:'서울', ti:0 })
  const [tripType, setTripType] = useState<TripType>('day')
  const [saved, setSaved] = useState(false)
  const [visited, setVisited] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [loadTitle, setLoadTitle] = useState('')
  const [loadSub, setLoadSub] = useState('')
  const heroCv = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    try {
      const c = sessionStorage.getItem('someday-course')
      const r = sessionStorage.getItem('someday-region')
      const rg = sessionStorage.getItem('someday-regen')
      if (c) setCourse(JSON.parse(c))
      if (r) setRegion(JSON.parse(r))
      if (rg) setTripType((JSON.parse(rg) as RegenInfo).tripType)
    } catch {}
  }, [])

  // localStorage: saved state
  useEffect(() => {
    if (!course.title) return
    try {
      const list = JSON.parse(localStorage.getItem('someday-saved') || '[]')
      setSaved(list.some((s: any) => s.course.title === course.title))
    } catch {}
  }, [course.title])

  // localStorage: visited state
  useEffect(() => {
    if (!course.title) return
    try {
      const v = JSON.parse(localStorage.getItem(`someday-visited-${course.title}`) || '[]')
      setVisited(new Set(v))
    } catch {}
  }, [course.title])

  useEffect(() => {
    const cv = heroCv.current
    if (!cv) return
    cv.width = 390; cv.height = 290
    paintScene(cv, region.ti * 17 + 3, region.ti)
  }, [region])

  function toggleSave() {
    try {
      const list = JSON.parse(localStorage.getItem('someday-saved') || '[]')
      if (saved) {
        localStorage.setItem('someday-saved', JSON.stringify(list.filter((s: any) => s.course.title !== course.title)))
        setSaved(false)
        showToast('저장이 취소됐어요')
      } else {
        localStorage.setItem('someday-saved', JSON.stringify([{ course, region, savedAt: Date.now() }, ...list].slice(0, 20)))
        setSaved(true)
        showToast('코스가 저장됐어요')
      }
    } catch {
      showToast('저장에 실패했어요')
    }
  }

  function toggleVisit(order: number) {
    setVisited(prev => {
      const next = new Set(prev)
      if (next.has(order)) next.delete(order); else next.add(order)
      try { localStorage.setItem(`someday-visited-${course.title}`, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  async function handleRegen() {
    const raw = sessionStorage.getItem('someday-regen')
    if (!raw) { showToast('재생성 정보가 없어요'); return }
    const regen: RegenInfo = JSON.parse(raw)
    setLoading(true)
    setLoadTitle('주변 장소 검색 중')
    setLoadSub('새로운 코스를 위해 장소를 탐색해요')
    try {
      const { places } = await fetchPlaces(regen.lat, regen.lng, regen.tripType)
      setLoadTitle('코스 재설계 중')
      setLoadSub('AI가 다른 코스를 만들고 있어요')
      const newCourse = await createCourse(
        regen.locationName, regen.lat, regen.lng, places,
        regen.tripType, regen.theme, regen.startTime, true, // nocache=true
      )
      setCourse(newCourse)
      setVisited(new Set())
      sessionStorage.setItem('someday-course', JSON.stringify(newCourse))
      setDayIdx(0)
      showToast('새 코스가 만들어졌어요')
    } catch {
      showToast('재생성에 실패했어요')
    }
    setLoading(false)
  }

  const days = [...new Set(course.steps.map(s => s.day ?? 1))].sort()
  const isMultiDay = days.length > 1
  const filtered = isMultiDay
    ? course.steps.filter(s => (s.day ?? 1) === days[dayIdx])
    : course.steps

  const tripLabel = tripType === 'day' ? '당일치기' : tripType === '1n2d' ? '1박 2일' : '2박 3일'

  if (view === 'map')   return <MapView   course={course} region={region} onBack={() => setView('plan')}/>
  if (view === 'share') return <ShareView course={course} region={region} tripLabel={tripLabel} onBack={() => setView('plan')}/>

  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>

      {/* Hero */}
      <div style={{ height:290, position:'relative', overflow:'hidden', flexShrink:0 }}>
        <canvas ref={heroCv} width={390} height={290} style={{ width:'100%', height:'100%', display:'block' }}/>
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(to bottom, rgba(10,20,60,0.08) 0%, rgba(10,20,60,0.82) 100%)',
          display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'20px 22px',
        }}>
          <button className="icon-btn" onClick={() => router.push('/upload')} style={{
            position:'absolute', left:16,
            background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)',
            top:'max(16px, env(safe-area-inset-top))',
          }}>
            <Icon name="chevron-left" size={20} color="#fff" strokeWidth={2}/>
          </button>
          <button className="icon-btn" onClick={() => setView('share')} style={{
            position:'absolute', right:16,
            background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)',
            top:'max(16px, env(safe-area-inset-top))',
          }}>
            <Icon name="arrow-up" size={18} color="#fff" strokeWidth={2}/>
          </button>

          <div style={{
            display:'inline-flex', alignItems:'center', gap:5,
            background:'rgba(59,126,248,0.82)', color:'#fff',
            fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20,
            marginBottom:10, width:'fit-content', letterSpacing:0.1,
          }}>
            <Icon name="sparkle" size={11} color="#fff" strokeWidth={2}/>
            AI 추천 코스
          </div>

          <h1 style={{
            fontFamily:'var(--font-dm-serif), serif',
            fontSize:24, color:'#fff', marginBottom:12, lineHeight:1.2, letterSpacing:-0.4,
            textShadow:'0 2px 12px rgba(0,0,0,0.2)',
          }}>{course.title || `${region.name} 여행 코스`}</h1>

          <div style={{ display:'flex', gap:0 }}>
            {[
              { icon:'calendar' as const, label: tripLabel },
              { icon:'pin'      as const, label: `${course.steps.length}개 스팟` },
              { icon:'clock'    as const, label: course.totalTime || '—' },
            ].map((m, i, arr) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:5,
                background:'rgba(255,255,255,0.14)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
                border:'1px solid rgba(255,255,255,0.2)', padding:'5px 12px',
                fontSize:11, fontWeight:600, color:'#fff',
                borderRadius: i===0?'10px 0 0 10px': i===arr.length-1?'0 10px 10px 0':0,
                borderLeft: i>0?'none':undefined,
              }}>
                <Icon name={m.icon} size={11} color="rgba(255,255,255,0.8)" strokeWidth={2}/>
                {m.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Day tabs + 지도 버튼 */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 20px 0', flexShrink:0, overflowX:'auto', scrollbarWidth:'none' } as React.CSSProperties}>
        {isMultiDay ? days.map((d, i) => {
          const color = DAY_COLORS[d] ?? 'var(--blue)'
          return (
            <button key={d} onClick={() => setDayIdx(i)} style={{
              flexShrink:0, padding:'7px 16px', borderRadius:20,
              fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
              border: i===dayIdx ? 'none' : '1px solid rgba(180,200,255,0.4)',
              background: i===dayIdx ? color : 'rgba(255,255,255,0.65)',
              color: i===dayIdx ? '#fff' : 'var(--text3)',
              boxShadow: i===dayIdx ? `0 4px 14px ${color}55` : undefined,
              transition:'all 0.18s',
            }}>
              {`Day ${d}`}
            </button>
          )
        }) : (
          <div style={{ padding:'7px 0', fontSize:13, fontWeight:600, color:'var(--text3)' }}>
            당일 코스 · {course.steps.length}개 스팟
          </div>
        )}
        <button onClick={() => setView('map')} style={{
          flexShrink:0, marginLeft:'auto', display:'flex', alignItems:'center', gap:6,
          padding:'7px 14px', borderRadius:20,
          fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
          background:'rgba(59,126,248,0.08)', border:'none', color:'var(--blue)',
        }}>
          <Icon name="navigation" size={13} color="var(--blue)" strokeWidth={2}/>
          지도
        </button>
      </div>

      {/* Timeline */}
      <div className="scr">
        <div style={{ padding:'16px 20px 8px' }}>
          {filtered.map((item, i) => {
            const mins = i > 0 ? drivingMinutes(filtered[i-1], item) : null
            return (
              <div key={item.order}>
                {mins !== null && (
                  <div style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 0 4px 18px' }}>
                    <Icon name="car" size={11} color="var(--text3)" strokeWidth={1.8}/>
                    <span style={{ fontSize:11, color:'var(--text3)' }}>차로 약 {mins}분</span>
                  </div>
                )}
                <TLItem
                  item={item}
                  idx={i}
                  last={i === filtered.length - 1}
                  visited={visited.has(item.order)}
                  onToggleVisit={() => toggleVisit(item.order)}
                  dayColor={DAY_COLORS[item.day ?? 1] ?? 'var(--blue)'}
                />
              </div>
            )
          })}
        </div>

        {/* 방문 진행률 */}
        {course.steps.length > 0 && visited.size > 0 && (
          <div style={{ padding:'0 20px 8px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:600, color:'var(--text3)' }}>방문 완료</span>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--blue)' }}>{visited.size} / {course.steps.length}</span>
            </div>
            <div style={{ height:4, borderRadius:2, background:'var(--blue4)', overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:2,
                background:'linear-gradient(90deg, var(--blue), var(--blue2))',
                width:`${(visited.size / course.steps.length) * 100}%`,
                transition:'width 0.4s ease',
              }}/>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:8, padding:'8px 20px 4px' }}>
          <button className="btn btn-secondary" style={{ flex:1 }} onClick={toggleSave}>
            <Icon name="bookmark" size={16}
              color={saved ? 'var(--blue)' : 'var(--text)'}
              strokeWidth={saved ? 2.5 : 1.8}/>
            {saved ? '저장됨' : '저장'}
          </button>
          <button className="btn btn-secondary" style={{ flex:1 }} onClick={handleRegen}>
            <Icon name="refresh" size={16} color="var(--text)" strokeWidth={1.8}/>
            재생성
          </button>
          <button className="btn btn-primary" style={{ flex:2 }} onClick={() => setView('share')}>
            <Icon name="share" size={16} color="#fff" strokeWidth={1.8}/>
            공유하기
          </button>
        </div>
        <div style={{ height: 8 }}/>
      </div>

      <Loading visible={loading} title={loadTitle} subtitle={loadSub}/>
      <BottomNav activeOverride={2}/>
      <Toast/>
    </div>
  )
}

/* ── Timeline item ── */
function TLItem({ item, idx, last, visited, onToggleVisit, dayColor }: {
  item: CourseStep; idx: number; last: boolean
  visited: boolean; onToggleVisit: () => void; dayColor: string
}) {
  const badge = (item as any).badge ?? '명소'
  const tags  = (item as any).tags  ?? ['view']

  function openKakaoMap() {
    if (item.lat && item.lng) {
      window.open(`https://map.kakao.com/link/to/${encodeURIComponent(item.name)},${item.lat},${item.lng}`, '_blank')
    } else {
      showToast('위치 정보가 없어요')
    }
  }

  return (
    <div style={{ display:'flex', gap:14, marginBottom:14, animation:`itemIn 0.32s ${idx*0.06}s ease both`, opacity: visited ? 0.6 : 1, transition:'opacity 0.2s' }}>
      {/* Time axis */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:38, flexShrink:0, paddingTop:2 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textAlign:'center', lineHeight:1.3, marginBottom:6 }}>
          {item.time}
        </div>
        {/* 탭하면 방문 체크 */}
        <button
          onClick={onToggleVisit}
          style={{
            width:24, height:24, borderRadius:'50%', flexShrink:0, cursor:'pointer',
            background: visited ? '#10b981' : dayColor,
            border: 'none',
            boxShadow: visited ? '0 0 0 3px rgba(16,185,129,0.2)' : `0 0 0 3px ${dayColor}30`,
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all 0.2s',
          }}
        >
          {visited
            ? <Icon name="check" size={12} color="#fff" strokeWidth={2.5}/>
            : <div style={{ width:8, height:8, borderRadius:'50%', background:'rgba(255,255,255,0.9)' }}/>
          }
        </button>
        {!last && <div style={{ width:1.5, flex:1, background:'var(--blue3)', minHeight:16, marginTop:4 }}/>}
      </div>

      {/* Card — 탭하면 카카오맵 */}
      <div style={{ flex:1 }}>
        <div
          className="glass"
          style={{ borderRadius:18, overflow:'hidden', cursor:'pointer', transition:'transform 0.12s' }}
          onClick={openKakaoMap}
          onTouchStart={e => (e.currentTarget.style.transform='scale(0.98)')}
          onTouchEnd={e => (e.currentTarget.style.transform='')}
        >
          <div style={{ height:100, position:'relative', overflow:'hidden' }}>
            <PlaceImage name={item.name} badge={badge} width={320} height={100}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 35%, rgba(10,20,60,0.55))' }}/>
            <span style={{
              position:'absolute', top:9, left:10,
              background:'rgba(255,255,255,0.2)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
              border:'1px solid rgba(255,255,255,0.3)', color:'#fff',
              fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:8,
            }}>{badge}</span>
            {/* 카카오맵 힌트 */}
            <div style={{
              position:'absolute', bottom:8, right:10,
              display:'flex', alignItems:'center', gap:3,
              background:'rgba(0,0,0,0.35)', borderRadius:8, padding:'3px 8px',
            }}>
              <Icon name="navigation" size={9} color="rgba(255,255,255,0.8)" strokeWidth={2}/>
              <span style={{ fontSize:9, color:'rgba(255,255,255,0.8)', fontWeight:600 }}>길찾기</span>
            </div>
          </div>
          <div style={{ padding:'12px 14px 14px' }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:4, letterSpacing:-0.3 }}>{item.name}</div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'var(--text3)' }}>
                <Icon name="clock" size={11} color="var(--text3)" strokeWidth={1.8}/> {item.duration}
              </span>
            </div>
            <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.75, marginBottom:10 }}>{item.desc}</p>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {tags.map((t:string) => (
                <span key={t} className={`chip ${TAG_COLOR[t as keyof typeof TAG_COLOR] ?? 'chip-blue'}`}>
                  {TAG[t as keyof typeof TAG] ?? t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Map View ── */
function MapView({ course, region, onBack }: { course:Course; region:{name:string; ti:number}; onBack:()=>void }) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapObjRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [sel, setSel] = useState(0)
  const [dayFilter, setDayFilter] = useState(0)
  const [mapReady, setMapReady] = useState(false)

  const days = [...new Set(course.steps.map(s => s.day ?? 1))].sort()
  const visible = dayFilter === 0 ? course.steps : course.steps.filter(s => (s.day ?? 1) === days[dayFilter - 1])
  const selected = course.steps[sel]

  useEffect(() => {
    function init() {
      const kakao = (window as any).kakao
      if (!kakao?.maps || !mapDivRef.current) return
      const firstWithCoords = course.steps.find(s => s.lat && s.lng)
      const map = new kakao.maps.Map(mapDivRef.current, {
        center: new kakao.maps.LatLng(firstWithCoords?.lat ?? 37.5665, firstWithCoords?.lng ?? 126.9780),
        level: 6,
      })
      mapObjRef.current = map
      setMapReady(true)
    }
    const kakao = (window as any).kakao
    if (kakao?.maps) { init(); return }
    const existing = document.querySelector('script[data-kakao-map]') as HTMLScriptElement | null
    if (existing) { existing.addEventListener('load', () => (window as any).kakao.maps.load(init)); return }
    const script = document.createElement('script')
    script.setAttribute('data-kakao-map', '1')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false`
    script.onload = () => (window as any).kakao.maps.load(init)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    const kakao = (window as any).kakao
    const map = mapObjRef.current
    if (!kakao?.maps || !map) return

    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    const bounds = new kakao.maps.LatLngBounds()
    visible.forEach(step => {
      if (!step.lat || !step.lng) return
      const pos = new kakao.maps.LatLng(step.lat, step.lng)
      bounds.extend(pos)
      const idx = course.steps.indexOf(step)
      const isSel = idx === sel
      const dayNum = step.day ?? 1
      const color = DAY_COLORS[dayNum] ?? '#3b7ef8'
      const content = `<div style="
        background:${isSel ? color : '#fff'};
        color:${isSel ? '#fff' : '#0d1b39'};
        border:2px solid ${color};
        border-radius:10px;padding:5px 12px;
        font-size:11px;font-weight:700;white-space:nowrap;
        box-shadow:0 2px 12px ${color}44;
        font-family:-apple-system,sans-serif;cursor:pointer;
      " data-idx="${idx}">${step.name}</div>`
      const overlay = new kakao.maps.CustomOverlay({ position: pos, content, yAnchor: 1.4 })
      overlay.setMap(map)
      markersRef.current.push(overlay)
      setTimeout(() => {
        const el = document.querySelector(`[data-idx="${idx}"]`) as HTMLElement | null
        if (el) el.onclick = () => setSel(idx)
      }, 100)
    })
    if (visible.some(s => s.lat && s.lng)) map.setBounds(bounds, 80)
  }, [mapReady, dayFilter, sel])

  return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
      <div style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'16px 20px 12px', paddingTop:'max(16px, env(safe-area-inset-top))',
        flexShrink:0, background:'var(--bg)', zIndex:10,
      }}>
        <button className="icon-btn icon-btn-ghost" onClick={onBack}>
          <Icon name="chevron-left" size={20} color="var(--text)" strokeWidth={2}/>
        </button>
        <span style={{ fontSize:17, fontWeight:700, letterSpacing:-0.3 }}>코스 지도</span>
        <button onClick={onBack} style={{ marginLeft:'auto', fontSize:13, color:'var(--blue)', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
          목록보기
        </button>
      </div>

      {/* Day 필터 (색상 연동) */}
      <div style={{ display:'flex', gap:8, padding:'0 20px 12px', flexShrink:0, overflowX:'auto', scrollbarWidth:'none', background:'var(--bg)', zIndex:10 } as React.CSSProperties}>
        {['전체', ...days.map(d => `Day ${d}`)].map((lbl, i) => {
          const color = i === 0 ? 'var(--blue)' : (DAY_COLORS[days[i-1]] ?? 'var(--blue)')
          return (
            <button key={i} onClick={() => setDayFilter(i)} style={{
              flexShrink:0, padding:'7px 18px', borderRadius:20,
              fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
              border: i===dayFilter ? 'none' : '1px solid rgba(180,200,255,0.4)',
              background: i===dayFilter ? color : 'rgba(255,255,255,0.65)',
              color: i===dayFilter ? '#fff' : 'var(--text3)',
              transition:'all 0.18s',
            }}>{lbl}</button>
          )
        })}
      </div>

      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        <div ref={mapDivRef} style={{ width:'100%', height:'100%' }}/>
        {!mapReady && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--blue4)' }}>
            <div style={{ fontSize:13, color:'var(--text3)' }}>지도 로딩 중...</div>
          </div>
        )}

        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          background:'rgba(255,255,255,0.94)', backdropFilter:'blur(28px) saturate(200%)', WebkitBackdropFilter:'blur(28px) saturate(200%)',
          border:'1px solid rgba(255,255,255,0.95)', borderBottom:'none',
          borderRadius:'24px 24px 0 0', boxShadow:'0 -4px 24px rgba(59,126,248,0.10)',
          padding:'14px 18px', paddingBottom:'max(18px, env(safe-area-inset-bottom))', zIndex:10,
        }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'rgba(180,200,255,0.45)', margin:'0 auto 14px' }}/>
          <div className="glass-subtle" style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 14px', borderRadius:'var(--r-sm)', marginBottom:12 }}>
            <div style={{ width:48, height:48, borderRadius:12, overflow:'hidden', flexShrink:0 }}>
              <PlaceImage name={selected?.name ?? ''} badge={(selected as any)?.badge} width={48} height={48}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:3, letterSpacing:-0.2 }}>{selected?.name}</div>
              <div style={{ display:'flex', gap:6 }}>
                <span className="chip chip-blue">{(selected as any)?.badge ?? '명소'}</span>
                {(selected as any)?.day && (
                  <span className="chip chip-teal" style={{ background: `${DAY_COLORS[(selected as any).day] ?? 'var(--blue)'}22`, color: DAY_COLORS[(selected as any).day] ?? 'var(--blue)' }}>
                    Day {(selected as any).day}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ width:'100%' }} onClick={() => {
            const s = selected
            if (s?.lat && s?.lng) {
              window.open(`https://map.kakao.com/link/to/${encodeURIComponent(s.name)},${s.lat},${s.lng}`, '_blank')
            } else showToast('위치 정보가 없어요')
          }}>
            <Icon name="navigation" size={16} color="#fff" strokeWidth={2}/>
            카카오맵으로 길찾기
          </button>
        </div>
      </div>
      <Toast/>
    </div>
  )
}

/* ── Share View ── */
function ShareView({ course, region, tripLabel, onBack }: { course:Course; region:{name:string; ti:number}; tripLabel:string; onBack:()=>void }) {
  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
      <div style={{ height:230, position:'relative', overflow:'hidden', flexShrink:0 }}>
        <PlaceImage name={region.name} width={390} height={230}/>
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(to bottom, rgba(10,20,60,0.15), rgba(10,20,60,0.85))',
          display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'18px 22px',
        }}>
          <button className="icon-btn" onClick={onBack} style={{
            position:'absolute', top:'max(16px, env(safe-area-inset-top))', right:16,
            background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)',
          }}>
            <Icon name="x" size={18} color="#fff" strokeWidth={2}/>
          </button>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginBottom:4 }}>내가 만든 코스</p>
          <h2 style={{ fontFamily:'var(--font-dm-serif), serif', fontSize:22, color:'#fff', marginBottom:10, letterSpacing:-0.4 }}>
            {course.title}
          </h2>
          <div style={{ display:'flex', gap:6 }}>
            {[
              { icon:'calendar' as const, label: tripLabel },
              { icon:'pin'      as const, label: `${course.steps.length}개 스팟` },
              { icon:'clock'    as const, label: course.totalTime },
            ].map((m, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:4,
                background:'rgba(255,255,255,0.14)', border:'1px solid rgba(255,255,255,0.2)',
                color:'#fff', fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:10,
              }}>
                <Icon name={m.icon} size={10} color="rgba(255,255,255,0.75)" strokeWidth={2}/>
                {m.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="scr">
        <div style={{ padding:'20px 20px 0' }}>
          <h3 style={{ fontSize:16, fontWeight:700, marginBottom:14, letterSpacing:-0.3 }}>코스 미리보기</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
            {course.steps.slice(0,5).map((s, i) => (
              <div key={i} className="glass" style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:'var(--r-sm)' }}>
                <div style={{
                  width:28, height:28, borderRadius:'50%',
                  background:`linear-gradient(135deg, ${DAY_COLORS[s.day ?? 1] ?? 'var(--blue)'}, ${DAY_COLORS[s.day ?? 1] ?? 'var(--blue2)'}aa)`,
                  color:'#fff', fontSize:11, fontWeight:700,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                }}>{i+1}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, letterSpacing:-0.2 }}>{s.name}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>
                    {s.time}{s.day ? ` · Day ${s.day}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass" style={{ borderRadius:20, padding:'18px 18px', marginBottom:10 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:3, letterSpacing:-0.3 }}>Someday 앱으로 전체 보기</div>
            <div style={{ fontSize:12, color:'var(--text3)', marginBottom:16 }}>지도, 상세 정보, 길찾기까지 한번에</div>
            {[
              { label:'App Store', sub:'Download on the' },
              { label:'Google Play', sub:'Get it on' },
            ].map((s, i) => (
              <div key={i} onClick={() => showToast(`${s.label}으로 이동`)} style={{
                display:'flex', alignItems:'center', gap:14, padding:'13px 16px',
                borderRadius:'var(--r-sm)', background:'var(--text)', color:'#fff',
                cursor:'pointer', marginBottom: i===0 ? 8 : 0,
              }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name="star" size={18} color="#fff" strokeWidth={1.5}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, opacity:0.55, marginBottom:1 }}>{s.sub}</div>
                  <div style={{ fontSize:14, fontWeight:700 }}>{s.label}</div>
                </div>
                <Icon name="chevron-right" size={16} color="rgba(255,255,255,0.5)" strokeWidth={2}/>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:10 }}>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button className="btn btn-primary" style={{ flex:1 }} onClick={async () => {
                try { await navigator.share({ title: course.title, text: `${course.title} 코스를 확인해보세요!`, url: window.location.href }) } catch {}
              }}>
                <Icon name="share" size={16} color="#fff" strokeWidth={1.8}/>
                공유
              </button>
            )}
            <button className="btn btn-secondary" style={{ flex:1 }} onClick={async () => {
              try { await navigator.clipboard.writeText(window.location.href); showToast('링크가 복사됐어요') }
              catch { showToast('복사 실패 — 주소창에서 직접 복사해주세요') }
            }}>
              <Icon name="link" size={16} color="var(--text)" strokeWidth={1.8}/>
              링크 복사
            </button>
          </div>
        </div>
        <div style={{ height:32 }}/>
      </div>
      <Toast/>
    </div>
  )
}
