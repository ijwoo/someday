'use client'
import { useEffect, useRef } from 'react'

// 블루 톤 일러스트 (ti별로 색조만 다르게)
export const THEMES = [
  { s: ['#2f6bd8', '#5b9dfd', '#bcd6ff'], m: ['#1f4fb0', '#2f6bd8', '#5b9dfd'], g: '#163a82' },
  { s: ['#3b82f6', '#60a5fa', '#c3ddff'], m: ['#2563c9', '#3b82f6', '#60a5fa'], g: '#1d4ed8' },
  { s: ['#2c74de', '#5a96f0', '#bdd8fb'], m: ['#1d57aa', '#2c74de', '#5a96f0'], g: '#143a7e' },
  { s: ['#4187f2', '#6aa6fb', '#cae0ff'], m: ['#2a66c4', '#4187f2', '#6aa6fb'], g: '#1c4aa0' },
  { s: ['#2a6cd6', '#5392ef', '#b8d4fa'], m: ['#1c4f9e', '#2a6cd6', '#5392ef'], g: '#123372' },
]

function rng(seed: number) {
  let s = seed | 0
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

export function paintScene(cv: HTMLCanvasElement, seed: number, ti = 0) {
  const W = cv.width, H = cv.height
  const ctx = cv.getContext('2d')
  if (!ctx) return
  const r = rng(seed)
  const t = THEMES[ti % THEMES.length]

  // Sky gradient
  const sk = ctx.createLinearGradient(0, 0, 0, H * 0.72)
  sk.addColorStop(0, t.s[0]); sk.addColorStop(0.55, t.s[1]); sk.addColorStop(1, t.s[2])
  ctx.fillStyle = sk; ctx.fillRect(0, 0, W, H)

  // Stars
  for (let i = 0; i < 22; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.1 + r() * 0.45})`
    ctx.beginPath(); ctx.arc(r() * W, r() * H * 0.5, r() * 1.5 + 0.4, 0, Math.PI * 2); ctx.fill()
  }

  // Mountains (3 layers)
  for (let layer = 2; layer >= 0; layer--) {
    ctx.fillStyle = t.m[layer] + ['44', '77', 'aa'][layer]
    ctx.beginPath(); ctx.moveTo(0, H)
    let x = 0
    while (x < W + 30) {
      const ph = H * (0.22 + r() * 0.32 - layer * 0.05)
      ctx.lineTo(x, H - ph); x += 12 + r() * 22
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill()
  }

  // Ground
  const gd = ctx.createLinearGradient(0, H * 0.7, 0, H)
  gd.addColorStop(0, t.m[0]); gd.addColorStop(1, t.g)
  ctx.fillStyle = gd; ctx.fillRect(0, H * 0.7, W, H * 0.3)

  // Moon
  ctx.fillStyle = 'rgba(255,255,255,.92)'
  ctx.beginPath(); ctx.arc(W * 0.76, H * 0.16, 13, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = t.s[0] + 'cc'
  ctx.beginPath(); ctx.arc(W * 0.79, H * 0.13, 10, 0, Math.PI * 2); ctx.fill()
}

interface Props {
  seed: number
  themeIndex?: number
  width: number
  height: number
  className?: string
  style?: React.CSSProperties
}

export default function SceneCanvas({ seed, themeIndex = 0, width, height, className, style }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    cv.width = width
    cv.height = height
    paintScene(cv, seed, themeIndex)
  }, [seed, themeIndex, width, height])

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      className={className}
      style={{ display: 'block', ...style }}
    />
  )
}
