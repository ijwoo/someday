'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import Icon from '@/components/Icon'
import Toast, { showToast } from '@/components/Toast'
import { getThemeMode, applyThemeMode, type ThemeMode } from '@/lib/theme'

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: '시스템' },
  { mode: 'light',  label: '라이트' },
  { mode: 'dark',   label: '다크' },
]

export default function ProfilePage() {
  const router = useRouter()
  const [savedCount, setSavedCount] = useState(0)
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('someday-saved') || '[]')
      setSavedCount(saved.length)
    } catch {}
    setThemeMode(getThemeMode())
  }, [])

  function changeTheme(mode: ThemeMode) {
    applyThemeMode(mode)
    setThemeMode(mode)
  }

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
            boxShadow: '0 6px 20px rgba(25,31,40,0.28)',
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
          <button
            className="glass"
            onClick={() => router.push('/saved')}
            style={{
              width: '100%', borderRadius: 18, padding: '16px 18px',
              display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(25,31,40,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="bookmark" size={20} color="var(--blue)" strokeWidth={1.8}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2, color: 'var(--text)' }}>저장한 코스</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{savedCount}개 보관 중 · 전체보기</div>
            </div>
            <Icon name="chevron-right" size={16} color="var(--text3)" strokeWidth={1.8}/>
          </button>
        </div>

        {/* 설정 항목 */}
        <div style={{ padding: '0 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 10, letterSpacing: 0.3, textTransform: 'uppercase' }}>설정</div>
          <div className="glass" style={{ borderRadius: 18, overflow: 'hidden' }}>
            {/* 화면 테마 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', borderBottom: '1px solid var(--border-hair)',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(25,31,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="moon" size={16} color="var(--blue)" strokeWidth={1.8}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>화면 테마</div>
              </div>
              <div role="radiogroup" aria-label="화면 테마" style={{
                display: 'flex', gap: 2, padding: 3, borderRadius: 12,
                background: 'var(--blue4)', flexShrink: 0,
              }}>
                {THEME_OPTIONS.map(opt => {
                  const isSel = themeMode === opt.mode
                  return (
                    <button
                      key={opt.mode}
                      role="radio"
                      aria-checked={isSel}
                      onClick={() => changeTheme(opt.mode)}
                      style={{
                        padding: '6px 11px', borderRadius: 9, cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                        border: 'none', transition: 'background 0.18s, color 0.18s',
                        background: isSel ? 'var(--blue)' : 'transparent',
                        color: isSel ? '#fff' : 'var(--text3)',
                        boxShadow: isSel ? '0 2px 8px rgba(25,31,40,0.3)' : 'none',
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <button onClick={resetOnboarding} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 18px', background: 'none', border: 'none',
              borderBottom: '1px solid var(--border-hair)',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(25,31,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,146,161,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="star" size={16} color="var(--text3)" strokeWidth={1.8}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2, color: 'var(--text2)' }}>더 많은 기능</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>준비 중이에요</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue)', background: 'rgba(25,31,40,0.1)', padding: '3px 8px', borderRadius: 6 }}>Soon</span>
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
