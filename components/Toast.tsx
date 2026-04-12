'use client'
import { useEffect, useRef, useState } from 'react'

export const TOAST_EVENT = 'someday-toast'

export function showToast(msg: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: msg }))
  }
}

export default function Toast() {
  const [msg, setMsg] = useState('')
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail
      setMsg(text)
      setVisible(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(false), 2600)
    }
    window.addEventListener(TOAST_EVENT, handler)
    return () => window.removeEventListener(TOAST_EVENT, handler)
  }, [])

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 100,
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? 0 : 14}px)`,
        background: 'rgba(13, 27, 57, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: 40,
        fontSize: 13,
        fontWeight: 500,
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.24s ease, transform 0.24s ease',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        letterSpacing: -0.1,
      }}
    >
      {msg}
    </div>
  )
}
