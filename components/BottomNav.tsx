'use client'
import { useRouter, usePathname } from 'next/navigation'
import Icon from './Icon'
import type { IconName } from './Icon'

const ITEMS: { icon: IconName; label: string; path: string }[] = [
  { icon: 'home',   label: '홈',    path: '/' },
  { icon: 'camera', label: '업로드', path: '/upload' },
  { icon: 'map',    label: '지도',   path: '/plan' },
  { icon: 'person', label: '프로필', path: '/profile' },
]

export default function BottomNav({ activeOverride }: { activeOverride?: number }) {
  const router = useRouter()
  const pathname = usePathname()

  const active =
    activeOverride !== undefined
      ? activeOverride
      : pathname === '/upload' ? 1
      : pathname === '/plan'   ? 2
      : 0

  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 100,
      background: 'var(--bg)',
      borderTop: '1px solid var(--border-hair)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      <div style={{ display: 'flex', padding: '8px 8px 6px' }}>
        {ITEMS.map((item, i) => {
          const isActive = i === active
          const color = isActive ? 'var(--blue)' : 'var(--text3)'
          return (
            <button
              key={i}
              onClick={() => router.push(item.path)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '6px 0',
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                fontFamily: 'inherit',
              }}
            >
              <Icon
                name={item.icon}
                size={23}
                color={color}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span style={{
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                color,
                letterSpacing: -0.2,
                transition: 'color 0.18s',
              }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
