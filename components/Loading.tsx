'use client'

interface Props {
  visible: boolean
  title?: string
  subtitle?: string
}

export default function Loading({
  visible,
  title = 'AI가 분석하는 중',
  subtitle = '잠시만 기다려주세요',
}: Props) {
  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(242, 245, 255, 0.88)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      zIndex: 999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      animation: 'fadeIn 0.2s ease',
    }}>
      {/* Spinner */}
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <div style={{
          position: 'absolute', inset: 0,
          border: '2.5px solid var(--blue3)',
          borderTopColor: 'var(--blue)',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--blue), var(--blue2))',
            boxShadow: '0 4px 12px rgba(59,126,248,0.3)',
          }} />
        </div>
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6, letterSpacing: -0.3 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>{subtitle}</div>
      </div>
    </div>
  )
}
