'use client';

import React, { useState, useRef } from 'react';
import { useUserFlow } from '../lib/userFlow';
import LoginModal from './LoginModal';
import OnboardingModal from './dashboard/OnboardingModal';
import LogoutIcon from './icons/LogoutIcon';
import GolangIcon from './icons/GolangIcon';
import type { AnimatedIconHandle } from './icons/types';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  visible: boolean;
}

export default function Header({ visible }: HeaderProps) {
  const { flowState, profile, reset, openDashboard, dashboardOpen, closeDashboard } = useUserFlow();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const logoutIconRef = useRef<AnimatedIconHandle>(null);
  const loginIconRef = useRef<AnimatedIconHandle>(null);

  const navItems = [
    { name: '// LIVE PROJECTS', href: '#live-sites' },
    { name: '// PORTFOLIO', href: '#works' },
    { name: '// PROCESS', href: '#process' },
    { name: '// ON-DEMAND', href: '#subscription' },
    { name: '// CONTACT', href: '#contact' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 bg-[#0A0A0B]/90 backdrop-blur-md border-b border-[#1F1F23] transition-transform duration-500 ease-in-out ${
          visible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between font-mono">
          <a href="#" className="text-sm font-bold tracking-widest text-white">
            JAGGER <span className="text-[#FF5500]">OS</span>
          </a>

          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-[11px] text-zinc-500 hover:text-[#FF5500] transition-colors duration-200 tracking-wider"
              >
                {item.name}
              </a>
            ))}

            {flowState === 'ACTIVE' ? (
              <div className="flex items-center gap-2">
                {/* 登出按鈕 */}
                <button
                  onClick={() => void reset()}
                  title="登出"
                  onMouseEnter={() => logoutIconRef.current?.startAnimation()}
                  onMouseLeave={() => logoutIconRef.current?.stopAnimation()}
                  className="flex items-center gap-1 text-[10px] font-mono text-zinc-600 hover:text-red-400 transition-colors border border-zinc-800 hover:border-red-400/40 px-2 py-1.5 rounded-lg"
                >
                  <span className="pointer-events-none">
                    <LogoutIcon ref={logoutIconRef} size={18} strokeWidth={2} color="currentColor" />
                  </span>
                  <span className="hidden sm:inline">登出</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                onMouseEnter={() => loginIconRef.current?.startAnimation()}
                onMouseLeave={() => loginIconRef.current?.stopAnimation()}
                className="flex items-center gap-1.5 text-[11px] text-[#FF5500] hover:text-white transition-colors tracking-wider border border-[#FF5500]/40 hover:border-white/40 px-3 py-1 rounded"
              >
                LOGIN <span className="text-zinc-600">//</span> 登入
                <span className="pointer-events-none">
                  <GolangIcon ref={loginIconRef} size={18} color="currentColor" strokeWidth={1.5} />
                </span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      {dashboardOpen && flowState === 'ACTIVE' && (
        <OnboardingModal plan={profile?.plan ?? ''} onClose={closeDashboard} />
      )}
    </>
  );
}