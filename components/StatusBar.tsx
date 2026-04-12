'use client'
import { useEffect, useState } from 'react'

interface Props {
  light?: boolean
}

export default function StatusBar({ light = false }: Props) {
  const [time, setTime] = useState('9:41')

  useEffect(() => {
    const update = () => {
      const n = new Date()
      setTime(`${n.getHours()}:${String(n.getMinutes()).padStart(2, '0')}`)
    }
    update()
    const id = setInterval(update, 10000)
    return () => clearInterval(id)
  }, [])

  const color = light ? '#fff' : 'var(--text)'
  const opacity = light ? 0.85 : 1

  return (
    <div
      style={{
        height: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        flexShrink: 0,
        color,
        opacity,
      }}
    >
      <span style={{ fontSize: 15, fontWeight: 700 }}>{time}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, opacity: 0.7 }}>
        <span>▲ ●</span>
        <div style={{
          width: 22, height: 12,
          border: '2px solid currentColor',
          borderRadius: 3,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)',
            width: 3, height: 6, background: 'currentColor', borderRadius: '0 2px 2px 0',
          }} />
          <div style={{
            position: 'absolute', inset: '1.5px 4px 1.5px 1.5px',
            background: 'currentColor', borderRadius: 1,
          }} />
        </div>
      </div>
    </div>
  )
}
