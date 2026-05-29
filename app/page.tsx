'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { paintScene } from '@/components/SceneCanvas'
import BottomNav from '@/components/BottomNav'
import Toast, { showToast } from '@/components/Toast'
import Icon from '@/components/Icon'
import type { IconName } from '@/components/Icon'

const OB_SLIDES: {
  seed: number; ti: number
  icon: IconName; iconLabel: string
  title: React.ReactNode; desc: string
}[] = [
  {
    seed: 5, ti: 0,
    icon: 'camera', iconLabel: 'GPS · AI 위치 인식',
    title: (<>사진 속 <em style={{ color: '#93c5fd', fontStyle: 'italic' }}>장소</em>를<br/>AI가 찾아드려요</>),
    desc: 'GPS 또는 AI 이미지 인식으로\n어디서 찍었는지 자동 파악해요',
  },
  {
    seed: 42, ti: 1,
    icon: 'route', iconLabel: '최적 동선 자동 생성',
    title: (<>가고 싶던 곳들이<br/><em style={{ color: '#6ee7b7', fontStyle: 'italic' }}>여행 코스</em>로</>),
    desc: '당일치기부터 2박 3일까지\nAI가 최적의 여행 동선을 짜드려요',
  },
  {
    seed: 78, ti: 3,
    icon: 'share', iconLabel: '링크 하나로 공유',
    title: (<>친구와 <em style={{ color: '#c4b5fd', fontStyle: 'italic' }}>공유</em>하고<br/>같이 떠나요</>),
    desc: '완성된 코스를 링크로 공유하면\n앱 없이도 바로 확인할 수 있어요',
  },
]

type SavedItem = { course: any; region: { name: string; ti: number }; savedAt: number }
type Phase = 'onboard' | 'home'

export default function HomePage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase | null>(null)
  const [obIdx, setObIdx] = useState(0)
  const [savedCourses, setSavedCourses] = useState<SavedItem[]>([])
  const [recentCourse, setRecentCourse] = useState<{ title: string; ti: number; steps: number } | null>(null)

  useEffect(() => {
    let visited = false
    try { visited = !!localStorage.getItem('someday-visited') } catch {}
    setPhase(visited ? 'home' : 'onboard')
  }, [])

  useEffect(() => {
    if (phase !== 'home') return
    try {
      const saved = JSON.parse(localStorage.getItem('someday-saved') || '[]')
      setSavedCourses(saved)
    } catch {}
    try {
      const c = localStorage.getItem('someday-course')
      const r = localStorage.getItem('someday-region')
      if (c) {
        const parsed = JSON.parse(c)
        const region = r ? JSON.parse(r) : { ti: 0 }
        setRecentCourse({ title: parsed.title, ti: region.ti ?? 0, steps: parsed.steps?.length ?? 0 })
      }
    } catch {}
  }, [phase])

  function finishOnboard() {
    try { localStorage.setItem('someday-visited', '1') } catch {}
    setPhase('home')
  }

  function openSaved(item: SavedItem) {
    try {
      localStorage.setItem('someday-course', JSON.stringify(item.course))
      localStorage.setItem('someday-region', JSON.stringify(item.region))
      localStorage.removeItem('someday-regen')
    } catch {}
    router.push('/plan')
  }

  function deleteSaved(title: string) {
    const next = savedCourses.filter(s => s.course.title !== title)
    try { localStorage.setItem('someday-saved', JSON.stringify(next)) } catch {}
    setSavedCourses(next)
    showToast('삭제됐어요')
  }

  const SplashOverlay = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'linear-gradient(160deg, #1a4fd6 0%, #3b7ef8 60%, #60a5fa 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      animation: 'splashOut 0.4s 1.5s ease forwards', pointerEvents: 'none',
    }}>
      <div style={{
        width: 88, height: 88, borderRadius: 26,
        background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22,
        animation: 'popIn 0.7s cubic-bezier(.34,1.56,.64,1) both',
        boxShadow: '0 12px 40px rgba(0,0,60,0.22)',
      }}>
        <Icon name="map" size={40} color="#fff" strokeWidth={1.4}/>
      </div>
      <div style={{
        fontFamily: 'var(--font-dm-serif), serif',
        fontSize: 44, color: '#fff', letterSpacing: -1.5,
        animation: 'slideUp 0.6s 0.18s ease both',
      }}>Someday</div>
      <p style={{
        fontSize: 14, color: 'rgba(255,255,255,0.68)', marginTop: 10,
        textAlign: 'center', lineHeight: 1.7, animation: 'slideUp 0.6s 0.3s ease both',
      }}>언젠가 가야지 했던 곳들<br/>이제 진짜 가봐요</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 52, animation: 'slideUp 0.5s 0.44s ease both' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.45)',
            animation: `pulse 1.5s ${i*0.22}s ease-in-out infinite`,
          }}/>
        ))}
      </div>
    </div>
  )

  if (phase === null) return <>{SplashOverlay}<div style={{ minHeight: '100dvh', background: 'var(--bg)' }}/></>

  /* ── Onboarding ── */
  if (phase === 'onboard') {
    const slide = OB_SLIDES[obIdx]
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
        {SplashOverlay}
        <div style={{ height: 'env(safe-area-inset-top, 20px)', flexShrink: 0 }}/>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 28px 0' }}>

          {/* SceneCanvas 일러스트 */}
          <div style={{
            width: 280, height: 210, borderRadius: 32, overflow: 'hidden',
            position: 'relative', boxShadow: 'var(--sh-lg)', marginBottom: 36,
          }}>
            <ObCanvas seed={slide.seed} ti={slide.ti}/>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(5,15,50,0.65))' }}/>
            {/* 기능 카드 */}
            <div style={{
              position: 'absolute', bottom: 16, left: 14, right: 14,
              background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.25)', borderRadius: 14,
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={slide.icon} size={17} color="#fff" strokeWidth={1.8}/>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: -0.2 }}>
                {slide.iconLabel}
              </span>
            </div>
          </div>

          <h2 style={{
            fontFamily: 'var(--font-dm-serif), serif',
            fontSize: 28, lineHeight: 1.2, textAlign: 'center',
            marginBottom: 14, color: 'var(--text)', letterSpacing: -0.5,
          }}>{slide.title}</h2>
          <p style={{ fontSize: 14, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.85 }}>
            {slide.desc.split('\n').map((l, i, arr) => (
              <span key={i}>{l}{i < arr.length - 1 && <br/>}</span>
            ))}
          </p>
        </div>

        <div style={{ flexShrink: 0, padding: '24px 24px', paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 22 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                height: 4, borderRadius: 4,
                width: i === obIdx ? 24 : 6,
                background: i === obIdx ? 'var(--blue)' : 'var(--blue3)',
                transition: 'all 0.3s ease',
              }}/>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={finishOnboard} style={{
              flex: 1, height: 52, borderRadius: 'var(--r-sm)',
              fontSize: 14, fontWeight: 600, color: 'var(--text3)',
              background: 'var(--surface)', border: '1px solid var(--border-soft)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>건너뛰기</button>
            <button className="btn btn-primary" style={{ flex: 2 }}
              onClick={() => obIdx < 2 ? setObIdx(obIdx + 1) : finishOnboard()}>
              {obIdx === 2 ? '시작하기' : '다음'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Home ── */
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {SplashOverlay}
      <div className="scr">

        <div style={{ padding: '60px 22px 28px' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 8, letterSpacing: 0.4, textTransform: 'uppercase' }}>Someday</p>
          <h1 style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: 29, lineHeight: 1.15, letterSpacing: -0.8, color: 'var(--text)' }}>
            언젠가 가야지<br/>했던 곳들,{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--blue), var(--blue2))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>이제 가봐요</span>
          </h1>
        </div>

        {/* Upload CTA */}
        <div style={{ padding: '0 20px', marginBottom: 36 }}>
          <button onClick={() => router.push('/upload')} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 22,
            background: 'linear-gradient(135deg, var(--blue) 0%, var(--blue2) 100%)',
            border: 'none', cursor: 'pointer', position: 'relative', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(59,126,248,0.32)', fontFamily: 'inherit', transition: 'transform 0.14s',
          }}
            onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.975)')}
            onTouchEnd={e => (e.currentTarget.style.transform = '')}
          >
            <div style={{ position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }}/>
            <div style={{ width: 50, height: 50, borderRadius: 16, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="camera" size={24} color="#fff" strokeWidth={1.5}/>
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 3, letterSpacing: -0.3 }}>사진 가져오기</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>GPS · AI 인식 · 코스 자동 생성</div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevron-right" size={18} color="#fff" strokeWidth={2}/>
            </div>
          </button>
        </div>

        {/* 저장한 코스 */}
        <div className="sec-hdr">
          <span className="sec-title">저장한 코스</span>
          {savedCourses.length > 0 && (
            <span className="sec-more" onClick={() => showToast('전체 보기 준비 중')}>전체보기</span>
          )}
        </div>

        {savedCourses.length > 0 ? (
          <div style={{ display: 'flex', gap: 12, padding: '0 20px 4px', overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
            {savedCourses.map((item, i) => (
              <SavedCard key={i} item={item} onOpen={() => openSaved(item)} onDelete={() => deleteSaved(item.course.title)}/>
            ))}
          </div>
        ) : (
          <div style={{ padding: '0 20px' }}>
            <div style={{
              padding: '24px 20px', borderRadius: 18,
              background: 'var(--surface-soft)', textAlign: 'center',
              border: '1.5px dashed var(--dash)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <Icon name="bookmark" size={28} color="var(--blue3)" strokeWidth={1.2}/>
              <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.7 }}>
                코스를 만들고 저장하면<br/>여기에 모아볼 수 있어요
              </div>
            </div>
          </div>
        )}

        {/* 최근 만든 코스 */}
        <div style={{ height: 28 }}/>
        <div className="sec-hdr">
          <span className="sec-title">최근 만든 코스</span>
        </div>

        <div style={{ padding: '0 20px' }}>
          {recentCourse ? (
            <button className="glass" onClick={() => router.push('/plan')} style={{
              width: '100%', borderRadius: 18, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer', border: '2px solid rgba(59,126,248,0.2)',
              fontFamily: 'inherit', textAlign: 'left', transition: 'transform 0.14s',
              background: 'linear-gradient(135deg, rgba(59,126,248,0.06), var(--surface))',
            }}
              onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.98)')}
              onTouchEnd={e => (e.currentTarget.style.transform = '')}
            >
              <div style={{ width: 52, height: 52, borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
                <RecentCanvas ti={recentCourse.ti}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue)', background: 'rgba(59,126,248,0.1)', padding: '2px 7px', borderRadius: 6 }}>최근</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, letterSpacing: -0.2, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {recentCourse.title}
                </div>
                <span className="chip chip-blue">
                  <Icon name="pin" size={10} color="var(--blue)" strokeWidth={2}/> {recentCourse.steps}개 스팟
                </span>
              </div>
              <Icon name="chevron-right" size={16} color="var(--blue)" strokeWidth={1.8}/>
            </button>
          ) : (
            <div style={{
              padding: '36px 20px', borderRadius: 18, background: 'var(--surface-soft)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center',
              border: '1.5px dashed var(--dash)',
            }}>
              <Icon name="route" size={32} color="var(--blue3)" strokeWidth={1.2}/>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>아직 만든 코스가 없어요</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.75 }}>
                  사진을 분석하거나 지역을 선택해서<br/>나만의 여행 코스를 만들어보세요
                </div>
              </div>
              <button className="btn btn-primary" style={{ height: 42, padding: '0 22px', fontSize: 13 }} onClick={() => router.push('/upload')}>
                <Icon name="sparkle" size={14} color="#fff" strokeWidth={2}/>
                코스 만들기
              </button>
            </div>
          )}
        </div>
        <div style={{ height: 24 }}/>
      </div>

      <BottomNav activeOverride={0}/>
      <Toast/>
    </div>
  )
}

function ObCanvas({ seed, ti }: { seed: number; ti: number }) {
  const ref = (el: HTMLCanvasElement | null) => {
    if (!el) return
    el.width = 560; el.height = 420
    paintScene(el, seed, ti)
  }
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }}/>
}

function RecentCanvas({ ti }: { ti: number }) {
  const ref = (el: HTMLCanvasElement | null) => {
    if (!el) return
    el.width = 104; el.height = 104
    paintScene(el, ti * 17 + 3, ti)
  }
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }}/>
}

function SavedCanvas({ ti }: { ti: number }) {
  const ref = (el: HTMLCanvasElement | null) => {
    if (!el) return
    el.width = 320; el.height = 200
    paintScene(el, ti * 17 + 3, ti)
  }
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }}/>
}

function SavedCard({ item, onOpen, onDelete }: { item: SavedItem; onOpen: () => void; onDelete: () => void }) {
  const { course, region } = item
  const days = [...new Set((course.steps || []).map((s: any) => s.day ?? 1))].length
  const tripLabel = days === 1 ? '당일치기' : days === 2 ? '1박 2일' : '2박 3일'

  return (
    <div style={{ flexShrink: 0, width: 160, borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--sh)', position: 'relative' }}>
      <button onClick={onOpen} style={{ display: 'block', width: '100%', border: 'none', padding: 0, cursor: 'pointer', background: 'none' }}>
        <div style={{ width: '100%', height: 100, position: 'relative', overflow: 'hidden' }}>
          <SavedCanvas ti={region.ti}/>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.04), rgba(0,0,0,0.55))' }}/>
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
          }}>{tripLabel}</div>
          <div style={{
            position: 'absolute', bottom: 8, left: 10,
            color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: -0.2,
            textShadow: '0 1px 6px rgba(0,0,0,0.4)',
            maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{region.name}</div>
        </div>
        <div className="glass" style={{ padding: '10px 12px', borderTop: '1px solid var(--glass-border)', textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {course.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{course.steps?.length ?? 0}개 스팟</div>
        </div>
      </button>
      <button onClick={onDelete} style={{
        position: 'absolute', top: 8, left: 8,
        width: 22, height: 22, borderRadius: '50%',
        background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="x" size={10} color="#fff" strokeWidth={2.5}/>
      </button>
    </div>
  )
}
