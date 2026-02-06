'use client'

import { Button } from '@/components/ui/button'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/components/providers'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycle = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  return (
    <Button variant="secondary" size="icon" onClick={cycle} className="shadow-lg">
      {theme === 'dark' && <Sun className="h-4 w-4" />}
      {theme === 'light' && <Moon className="h-4 w-4" />}
      {theme === 'system' && <Monitor className="h-4 w-4" />}
    </Button>
  )
}
