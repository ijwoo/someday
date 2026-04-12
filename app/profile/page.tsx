'use client'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import Icon from '@/components/Icon'
import Toast, { showToast } from '@/components/Toast'

export default function ProfilePage() {
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('someday-saved') || '[]')
      setSavedCount(saved.length)
    } catch {}
  }, [])

  function resetOnboarding() {
    try {
      localStorage.removeItem('someday-visited')
      showToast('온보딩이 초기화됐어요. 앱을 다시 시작하면 보여요')
    } catch {}
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{
        padding: '16px 20px 12px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
      }}>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3, color: 'var(--text)' }}>프로필</span>
      </div>

      <div className="scr">
        {/* 프로필 헤더 */}
        <div style={{ padding: '20px 20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--blue), var(--blue2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(59,126,248,0.28)',
          }}>
            <Icon name="person" size={32} color="#fff" strokeWidth={1.5}/>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>내 여행 기록</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>저장한 코스 {savedCount}개</div>
          </div>
        </div>

        {/* 통계 */}
        <div style={{ padding: '0 20px', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="glass" style={{ flex: 1, borderRadius: 18, padding: '16px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue)', letterSpacing: -0.5 }}>{savedCount}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>저장한 코스</div>
            </div>
          </div>
        </div>

        {/* 설정 항목 */}
        <div style={{ padding: '0 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 10, letterSpacing: 0.3, textTransform: 'uppercase' }}>설정</div>
          <div className="glass" style={{ borderRadius: 18, overflow: 'hidden' }}>
            <button onClick={resetOnboarding} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 18px', background: 'none', border: 'none',
              borderBottom: '1px solid rgba(200,215,255,0.25)',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,126,248,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="sparkle" size={16} color="var(--blue)" strokeWidth={1.8}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>온보딩 다시 보기</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>앱 소개 슬라이드를 초기화해요</div>
              </div>
              <Icon name="chevron-right" size={16} color="var(--text3)" strokeWidth={1.8}/>
            </button>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 18px',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(100,120,180,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="star" size={16} color="var(--text3)" strokeWidth={1.8}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2, color: 'var(--text2)' }}>더 많은 기능</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>준비 중이에요</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue)', background: 'rgba(59,126,248,0.1)', padding: '3px 8px', borderRadius: 6 }}>Soon</span>
            </div>
          </div>
        </div>

        <div style={{ height: 32 }}/>
      </div>

      <BottomNav activeOverride={3}/>
      <Toast/>
    </div>
  )
}
