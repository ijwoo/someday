interface IconProps {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}

export type IconName =
  | 'home' | 'camera' | 'map' | 'person' | 'chevron-left' | 'chevron-right'
  | 'share' | 'bookmark' | 'x' | 'sparkle' | 'pin' | 'clock' | 'calendar'
  | 'link' | 'plus' | 'check' | 'navigation' | 'wand' | 'image' | 'route'
  | 'arrow-up' | 'dots' | 'star' | 'flag' | 'sun' | 'moon' | 'refresh' | 'car'

const D: Record<IconName, string | string[]> = {
  home:           'M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-5H9v5H4a1 1 0 0 1-1-1V9.5z',
  camera:         ['M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11z', 'M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  map:            ['M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z', 'M9 4v13', 'M15 7v13'],
  person:         ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  'chevron-left': 'M15 18l-6-6 6-6',
  'chevron-right':'M9 18l6-6-6-6',
  share:          ['M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8', 'M16 6l-4-4-4 4', 'M12 2v13'],
  bookmark:       'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
  x:              ['M18 6L6 18', 'M6 6l12 12'],
  sparkle:        ['M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z', 'M5 3l.88 2.63L8 6.5l-2.12.87L5 10l-.88-2.63L2 6.5l2.12-.87L5 3z'],
  pin:            ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  clock:          ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  calendar:       ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
  link:           ['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'],
  plus:           ['M12 5v14', 'M5 12h14'],
  check:          'M20 6L9 17l-5-5',
  navigation:     'M3 11l19-9-9 19-2-8-8-2z',
  wand:           ['M15 4V2', 'M15 16v-2', 'M8 9h2', 'M20 9h2', 'M17.8 11.8L19 13', 'M15 9h.01', 'M17.8 6.2L19 5', 'M3 21l9-9', 'M12.2 6.2L11 5'],
  image:          ['M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z', 'M3 16l5-5 4 4 3-3 4 4', 'M8.5 10.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
  route:          ['M3 17h3a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H3', 'M21 7h-3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3', 'M9 12h6'],
  'arrow-up':     ['M12 19V5', 'M5 12l7-7 7 7'],
  dots:           ['M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
  star:           'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  flag:           ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'],
  sun:            ['M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', 'M12 1v2', 'M12 21v2', 'M4.22 4.22l1.42 1.42', 'M18.36 18.36l1.42 1.42', 'M1 12h2', 'M21 12h2', 'M4.22 19.78l1.42-1.42', 'M18.36 5.64l1.42-1.42'],
  moon:           'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  refresh:        ['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15'],
  car:            ['M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2', 'M7 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0', 'M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0'],
}

export default function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.6, className }: IconProps) {
  const paths = D[name]
  const arr = Array.isArray(paths) ? paths : [paths]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {arr.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}
