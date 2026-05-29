'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { paintScene } from '@/components/SceneCanvas'
import BottomNav from '@/components/BottomNav'
import Toast, { showToast } from '@/components/Toast'
import Icon from '@/components/Icon'

type SavedItem = { course: any; region: { name: string; ti: number }; savedAt: number }

function timeAgo(ts: number) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}주 전`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}개월 전`
  return `${Math.floor(d / 365)}년 전`
}

export default function SavedPage() {
  const router = useRouter()
  const [items, setItems] = useState<SavedItem[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved: SavedItem[] = JSON.parse(localStorage.getItem('someday-saved') || '[]')
      saved.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))
      setItems(saved)
    } catch {}
    setReady(true)
  }, [])

  function openSaved(item: SavedItem) {
    try {
      localStorage.setItem('someday-course', JSON.stringify(item.course))
      localStorage.setItem('someday-region', JSON.stringify(item.region))
      localStorage.removeItem('someday-regen')
    } catch {}
    router.push('/plan')
  }

  function deleteSaved(title: string) {
    const next = items.filter(s => s.course.title !== title)
    try { localStorage.setItem('someday-saved', JSON.stringify(next)) } catch {}
    setItems(next)
    showToast('삭제됐어요')
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px 12px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        flexShrink: 0,
      }}>
        <button className="icon-btn icon-btn-ghost" onClick={() => router.back()} aria-label="뒤로">
          <Icon name="chevron-left" size={20} color="var(--text)" strokeWidth={2}/>
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3, color: 'var(--text)' }}>저장한 코스</span>
        {items.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--text3)' }}>{items.length}개</span>
        )}
      </div>

      <div className="scr">
        {!ready ? null : items.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '4px 20px 8px' }}>
            {items.map((item, i) => (
              <SavedCard key={item.course.title + i} item={item} onOpen={() => openSaved(item)} onDelete={() => deleteSaved(item.course.title)}/>
            ))}
          </div>
        ) : (
          <div style={{ padding: '60px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div style={{
              width: 84, height: 84, borderRadius: 26,
              background: 'rgba(59,126,248,0.08)', border: '1.5px dashed var(--dash)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="bookmark" size={34} color="var(--blue3)" strokeWidth={1.2}/>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8, letterSpacing: -0.3 }}>저장한 코스가 없어요</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.8 }}>
                마음에 드는 코스를 저장하면<br/>여기에 모아서 다시 볼 수 있어요
              </div>
            </div>
            <button className="btn btn-primary" style={{ height: 44, padding: '0 22px', fontSize: 14 }} onClick={() => router.push('/upload')}>
              <Icon name="sparkle" size={15} color="#fff" strokeWidth={2}/>
              코스 만들기
            </button>
          </div>
        )}
        <div style={{ height: 24 }}/>
      </div>

      <BottomNav activeOverride={0}/>
      <Toast/>
    </div>
  )
}

function SavedCanvas({ ti }: { ti: number }) {
  const ref = (el: HTMLCanvasElement | null) => {
    if (!el) return
    el.width = 320; el.height = 220
    paintScene(el, ti * 17 + 3, ti)
  }
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }}/>
}

function SavedCard({ item, onOpen, onDelete }: { item: SavedItem; onOpen: () => void; onDelete: () => void }) {
  const { course, region } = item
  const days = [...new Set((course.steps || []).map((s: any) => s.day ?? 1))].length
  const tripLabel = days === 1 ? '당일치기' : days === 2 ? '1박 2일' : '2박 3일'
  const ago = timeAgo(item.savedAt)

  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--sh)', position: 'relative' }}>
      <button onClick={onOpen} style={{ display: 'block', width: '100%', border: 'none', padding: 0, cursor: 'pointer', background: 'none', textAlign: 'left' }}>
        <div style={{ width: '100%', height: 110, position: 'relative', overflow: 'hidden' }}>
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
        <div className="glass" style={{ padding: '10px 12px', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {course.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{course.steps?.length ?? 0}개 스팟</span>
            {ago && <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ago}</span>}
          </div>
        </div>
      </button>
      <button onClick={onDelete} aria-label="삭제" style={{
        position: 'absolute', top: 8, left: 8,
        width: 24, height: 24, borderRadius: '50%',
        background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="x" size={11} color="#fff" strokeWidth={2.5}/>
      </button>
    </div>
  )
}
