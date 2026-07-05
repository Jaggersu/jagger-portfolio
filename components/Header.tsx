'use client';

import React, { useState } from 'react';
import { useUserFlow } from '../lib/userFlow';
import LoginModal from './LoginModal';

interface HeaderProps {
  visible: boolean;
}

export default function Header({ visible }: HeaderProps) {
  const { flowState, profile, reset } = useUserFlow();
  const [showLogin, setShowLogin] = useState(false);

  const navItems = [
    { name: '// LIVE PROJECTS', href: '#live-sites' },
    { name: '// PORTFOLIO', href: '#works' },
    { name: '// PROCESS', href: '#process' },
    { name: '// SUBSCRIPTION', href: '#subscription' },
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
              <button
                onClick={() => void reset()}
                className="text-[11px] text-zinc-500 hover:text-white transition-colors tracking-wider border border-zinc-800 px-3 py-1 rounded"
              >
                {profile?.email?.split('@')[0] ?? 'USER'} · 登出
              </button>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="text-[11px] text-[#FF5500] hover:text-white transition-colors tracking-wider border border-[#FF5500]/40 hover:border-white/40 px-3 py-1 rounded"
              >
                // LOGIN
              </button>
            )}
          </nav>
        </div>
      </header>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}