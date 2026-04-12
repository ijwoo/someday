'use client'

// badge → 카테고리별 색상 설정
const BADGE_CONFIG: Record<string, { from: string; to: string; iconPath: string }> = {
  '관광명소': { from: '#2563eb', to: '#60a5fa', iconPath: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
  '맛집':    { from: '#dc2626', to: '#f97316', iconPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  '카페':    { from: '#b45309', to: '#f59e0b', iconPath: 'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3' },
  '문화':    { from: '#6d28d9', to: '#a78bfa', iconPath: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z' },
  '자연':    { from: '#047857', to: '#34d399', iconPath: 'M3 18l9-14 9 14H3zM12 4v14' },
  '쇼핑':    { from: '#be185d', to: '#f472b6', iconPath: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0' },
  '핫플':    { from: '#0e7490', to: '#22d3ee', iconPath: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
  '전시':    { from: '#4338ca', to: '#818cf8', iconPath: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7' },
  '포토스팟': { from: '#0369a1', to: '#38bdf8', iconPath: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  '카페거리': { from: '#92400e', to: '#fbbf24', iconPath: 'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z' },
}

// 장소명 첫 글자로 fallback 색상 결정 (일관성 유지)
const FALLBACK_PALETTES = [
  { from: '#1d4ed8', to: '#60a5fa' },
  { from: '#0f766e', to: '#2dd4bf' },
  { from: '#7c3aed', to: '#c084fc' },
  { from: '#b45309', to: '#fcd34d' },
  { from: '#be123c', to: '#fb7185' },
]

function nameToIndex(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  return hash % FALLBACK_PALETTES.length
}

interface Props {
  name: string
  badge?: string
  width: number
  height: number
  style?: React.CSSProperties
}

export default function PlaceImage({ name, badge, width, height, style }: Props) {
  const cfg = badge ? BADGE_CONFIG[badge] : undefined
  const fallback = FALLBACK_PALETTES[nameToIndex(name)]
  const from = cfg?.from ?? fallback.from
  const to = cfg?.to ?? fallback.to
  const iconPath = cfg?.iconPath

  // 장소명 이니셜 (한글은 첫 글자, 영문은 첫 두 글자)
  const initial = name.length > 0 ? name[0] : '?'

  const isSmall = width <= 60

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(135deg, ${from}, ${to})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      ...style,
    }}>
      {/* 배경 패턴: 큰 아이콘 워터마크 */}
      {iconPath && !isSmall && (
        <svg
          viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.15)" strokeWidth="1.2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            position: 'absolute',
            width: Math.min(width, height) * 0.9,
            height: Math.min(width, height) * 0.9,
            right: '-10%', bottom: '-10%',
          }}
        >
          {iconPath.split('M').filter(Boolean).map((d, i) => (
            <path key={i} d={`M${d}`}/>
          ))}
        </svg>
      )}

      {/* 장소 이니셜 */}
      {isSmall ? (
        <span style={{
          fontSize: width * 0.38,
          fontWeight: 800, color: 'rgba(255,255,255,0.9)',
          letterSpacing: -0.5, lineHeight: 1,
          textShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }}>{initial}</span>
      ) : (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          zIndex: 1,
        }}>
          <span style={{
            fontSize: Math.min(width, height) * 0.18,
            fontWeight: 800, color: 'rgba(255,255,255,0.95)',
            letterSpacing: -0.5, lineHeight: 1,
            textShadow: '0 2px 8px rgba(0,0,0,0.2)',
            maxWidth: width * 0.85,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</span>
          {badge && (
            <span style={{
              fontSize: Math.min(width, height) * 0.1,
              fontWeight: 600, color: 'rgba(255,255,255,0.7)',
              letterSpacing: 0.2,
            }}>{badge}</span>
          )}
        </div>
      )}
    </div>
  )
}
