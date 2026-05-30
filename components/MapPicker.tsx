'use client'
import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/Icon'
import { reverseLookup } from '@/lib/api'

interface Props {
  onConfirm: (lat: number, lng: number, name: string) => void
  onClose: () => void
}

export default function MapPicker({ onConfirm, onClose }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapObjRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [name, setName] = useState('')
  const [loadingName, setLoadingName] = useState(false)

  useEffect(() => {
    function init() {
      const kakao = (window as any).kakao
      if (!kakao?.maps || !mapDivRef.current) return
      const map = new kakao.maps.Map(mapDivRef.current, {
        center: new kakao.maps.LatLng(36.5, 127.8), // 한국 중앙
        level: 13,
      })
      mapObjRef.current = map
      kakao.maps.event.addListener(map, 'click', (e: any) => {
        const ll = e.latLng
        place(ll.getLat(), ll.getLng())
      })
      setReady(true)
    }
    const kakao = (window as any).kakao
    if (kakao?.maps) { kakao.maps.load(init); return }
    const existing = document.querySelector('script[data-kakao-map]') as HTMLScriptElement | null
    if (existing) { existing.addEventListener('load', () => (window as any).kakao.maps.load(init)); return }
    const script = document.createElement('script')
    script.setAttribute('data-kakao-map', '1')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false`
    script.onload = () => (window as any).kakao.maps.load(init)
    document.head.appendChild(script)
  }, [])

  async function place(lat: number, lng: number) {
    const kakao = (window as any).kakao
    const map = mapObjRef.current
    if (!kakao?.maps || !map) return
    const pos = new kakao.maps.LatLng(lat, lng)
    if (markerRef.current) markerRef.current.setMap(null)
    const marker = new kakao.maps.Marker({ position: pos })
    marker.setMap(map)
    markerRef.current = marker
    map.panTo(pos)
    setPicked({ lat, lng })
    setLoadingName(true)
    try {
      const { locationName } = await reverseLookup(lat, lng)
      setName(locationName && locationName !== '알 수 없는 위치' ? locationName : '선택한 위치')
    } catch {
      setName('선택한 위치')
    }
    setLoadingName(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', flexDirection: 'column', background: 'var(--bg)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px 12px', paddingTop: 'max(16px, env(safe-area-inset-top))',
        flexShrink: 0, background: 'var(--bg)', zIndex: 10,
        borderBottom: '1px solid var(--border-hair)',
      }}>
        <button className="icon-btn icon-btn-ghost" onClick={onClose}>
          <Icon name="chevron-left" size={20} color="var(--text)" strokeWidth={2}/>
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3, color: 'var(--text)' }}>
          지도에서 위치 선택
        </span>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div ref={mapDivRef} style={{ width: '100%', height: '100%' }}/>

        {!ready && (
          <div className="skeleton" style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>지도 불러오는 중…</span>
          </div>
        )}

        {/* 안내 (선택 전) */}
        {ready && !picked && (
          <div style={{
            position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 30,
            background: 'var(--cta-dark)', color: '#fff',
            fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 999,
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}>
            <Icon name="pin" size={14} color="#fff" strokeWidth={2}/>
            지도를 탭해서 위치를 선택하세요
          </div>
        )}

        {/* 선택 결과 시트 */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
          background: 'var(--sheet)', borderTop: '1px solid var(--border-soft)',
          borderRadius: '20px 20px 0 0',
          padding: '16px 20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="pin" size={18} color={picked ? 'var(--text)' : 'var(--text3)'} strokeWidth={1.8}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {picked ? (loadingName ? '위치 확인 중…' : name) : '선택된 위치 없음'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
                {picked ? '이 위치를 중심으로 코스를 만들어요' : '지도를 탭해 위치를 골라주세요'}
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', opacity: picked ? 1 : 0.45 }}
            disabled={!picked}
            onClick={() => picked && onConfirm(picked.lat, picked.lng, name || '선택한 위치')}
          >
            <Icon name="check" size={18} color="var(--on-accent)" strokeWidth={2}/>
            이 위치로 선택
          </button>
        </div>
      </div>
    </div>
  )
}
