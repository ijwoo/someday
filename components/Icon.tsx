import {
  Home, Camera, Map as MapIcon, User, ChevronLeft, ChevronRight,
  Share, Bookmark, X, Sparkles, MapPin, Clock, Calendar, Link2,
  Plus, Check, Navigation, Wand2, Image as ImageIcon, Route,
  ArrowUp, MoreHorizontal, Star, Flag, Sun, Moon, RefreshCw, Car,
  type LucideIcon,
} from 'lucide-react'

export type IconName =
  | 'home' | 'camera' | 'map' | 'person' | 'chevron-left' | 'chevron-right'
  | 'share' | 'bookmark' | 'x' | 'sparkle' | 'pin' | 'clock' | 'calendar'
  | 'link' | 'plus' | 'check' | 'navigation' | 'wand' | 'image' | 'route'
  | 'arrow-up' | 'dots' | 'star' | 'flag' | 'sun' | 'moon' | 'refresh' | 'car'

// shadcn/lucide 아이콘 매핑 — 기존 호출부 이름은 그대로 유지
const MAP: Record<IconName, LucideIcon> = {
  home: Home,
  camera: Camera,
  map: MapIcon,
  person: User,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  share: Share,
  bookmark: Bookmark,
  x: X,
  sparkle: Sparkles,
  pin: MapPin,
  clock: Clock,
  calendar: Calendar,
  link: Link2,
  plus: Plus,
  check: Check,
  navigation: Navigation,
  wand: Wand2,
  image: ImageIcon,
  route: Route,
  'arrow-up': ArrowUp,
  dots: MoreHorizontal,
  star: Star,
  flag: Flag,
  sun: Sun,
  moon: Moon,
  refresh: RefreshCw,
  car: Car,
}

interface IconProps {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}

export default function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.75, className }: IconProps) {
  const Cmp = MAP[name]
  return (
    <Cmp
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    />
  )
}
