'use client'

import {
  MapPin, Utensils, Coffee, Landmark, Trees, ShoppingBag,
  Sparkles, Image as ImageIcon, Camera, type LucideIcon,
} from 'lucide-react'

type Tint = { bg: string; fg: string }

const TINTS: Record<string, Tint> = {
  blue:   { bg: 'rgba(49,130,246,0.12)',  fg: '#3182f6' },
  red:    { bg: 'rgba(240,68,82,0.12)',   fg: '#f04452' },
  amber:  { bg: 'rgba(245,159,0,0.16)',   fg: '#e08e0b' },
  violet: { bg: 'rgba(139,92,246,0.14)',  fg: '#8b5cf6' },
  green:  { bg: 'rgba(21,168,107,0.14)',  fg: '#15a86b' },
  pink:   { bg: 'rgba(230,73,128,0.13)',  fg: '#e64980' },
  cyan:   { bg: 'rgba(11,165,196,0.14)',  fg: '#0ba5c4' },
}

// badge/카테고리 → 톤 + 아이콘
const BADGE_CONFIG: Record<string, { tint: keyof typeof TINTS; icon: LucideIcon }> = {
  '관광명소': { tint: 'blue',   icon: MapPin },
  '맛집':    { tint: 'red',    icon: Utensils },
  '카페':    { tint: 'amber',  icon: Coffee },
  '문화':    { tint: 'violet', icon: Landmark },
  '문화시설': { tint: 'violet', icon: Landmark },
  '자연':    { tint: 'green',  icon: Trees },
  '쇼핑':    { tint: 'pink',   icon: ShoppingBag },
  '핫플':    { tint: 'cyan',   icon: Sparkles },
  '전시':    { tint: 'violet', icon: ImageIcon },
  '포토스팟': { tint: 'blue',   icon: Camera },
  '카페거리': { tint: 'amber',  icon: Coffee },
}

// 장소명 기반 fallback 톤 (일관성 유지)
const FALLBACK_TINTS: (keyof typeof TINTS)[] = ['blue', 'green', 'violet', 'amber', 'pink', 'cyan']

function nameToIndex(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  return hash % FALLBACK_TINTS.length
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
  const tint = cfg ? TINTS[cfg.tint] : TINTS[FALLBACK_TINTS[nameToIndex(name)]]
  const Glyph = cfg?.icon ?? MapPin

  const min = Math.min(width, height)
  const iconSize = width <= 60 ? Math.round(min * 0.46) : Math.round(min * 0.32)

  return (
    <div style={{
      width: '100%', height: '100%',
      background: tint.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}>
      <Glyph size={iconSize} color={tint.fg} strokeWidth={1.5} />
    </div>
  )
}
