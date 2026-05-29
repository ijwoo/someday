'use client'
import { useEffect, useRef } from 'react'

// 블랙&화이트 톤 — 그레이스케일 일러스트 (ti별로 명도만 다르게)
export const THEMES = [
  { s: ['#3a4150', '#6b7280', '#cbd2da'], m: ['#272d39', '#3a4150', '#6b7280'], g: '#1b1f27' },
  { s: ['#444b59', '#7b828f', '#d4dae1'], m: ['#2d333f', '#444b59', '#7b828f'], g: '#20242d' },
  { s: ['#333a47', '#646b78', '#c2c9d2'], m: ['#22272f', '#333a47', '#646b78'], g: '#181c23' },
  { s: ['#3f4654', '#727987', '#cdd4dc'], m: ['#2a303b', '#3f4654', '#727987'], g: '#1e222b' },
  { s: ['#2e333f', '#5c6470', '#b9c0c9'], m: ['#1f242d', '#2e333f', '#5c6470'], g: '#15181f' },
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
