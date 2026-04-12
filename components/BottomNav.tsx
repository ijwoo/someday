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
      padding: '8px 16px',
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      pointerEvents: 'none',
    }}>
      <div
        className="glass"
        style={{ display: 'flex', padding: '6px 8px', borderRadius: 24, pointerEvents: 'all' }}
      >
        {ITEMS.map((item, i) => {
          const isActive = i === active
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
                padding: '8px 0',
                cursor: 'pointer',
                borderRadius: 16,
                border: 'none',
                background: isActive ? 'rgba(59,126,248,0.1)' : 'transparent',
                transition: 'background 0.18s',
                fontFamily: 'inherit',
              }}
            >
              <Icon
                name={item.icon}
                size={22}
                color={isActive ? 'var(--blue)' : 'var(--text3)'}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: isActive ? 'var(--blue)' : 'var(--text3)',
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
