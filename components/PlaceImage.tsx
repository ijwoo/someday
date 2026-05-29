'use client'

import {
  MapPin, Utensils, Coffee, Landmark, Trees, ShoppingBag,
  Sparkles, Image as ImageIcon, Camera, type LucideIcon,
} from 'lucide-react'

// badge/카테고리 → 아이콘 (블랙&화이트 톤이라 색은 쓰지 않고 글리프만 구분)
const BADGE_ICON: Record<string, LucideIcon> = {
  '관광명소': MapPin,
  '맛집':    Utensils,
  '카페':    Coffee,
  '문화':    Landmark,
  '문화시설': Landmark,
  '자연':    Trees,
  '쇼핑':    ShoppingBag,
  '핫플':    Sparkles,
  '전시':    ImageIcon,
  '포토스팟': Camera,
  '카페거리': Coffee,
}

interface Props {
  name: string
  badge?: string
  width: number
  height: number
  style?: React.CSSProperties
}

export default function PlaceImage({ badge, width, height, style }: Props) {
  const Glyph = (badge && BADGE_ICON[badge]) || MapPin

  const min = Math.min(width, height)
  const iconSize = width <= 60 ? Math.round(min * 0.46) : Math.round(min * 0.32)

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--surface)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}>
      <Glyph size={iconSize} color="var(--text3)" strokeWidth={1.5} />
    </div>
  )
}
