'use client'

import { useEffect, useState } from 'react'

import DarkModeToggle from '@/app/components/darkmodetoggle'
import FooterConsent from '@/app/components/footerconsent'
import { usePathname } from 'next/navigation'

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    setDarkMode(saved === 'dark')
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <>
      {children}
      <DarkModeToggle setDarkMode={setDarkMode} />

      <FooterConsent className={(pathname ?? '').startsWith('/main') ? 'ml-5' : ''} />
    </>
  )
}
