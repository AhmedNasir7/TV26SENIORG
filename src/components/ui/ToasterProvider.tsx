'use client'

import { Toaster, toast } from 'sonner'
import { useTheme } from '@/hooks/useTheme'

export function ToasterProvider() {
  // Sonner only knows the OS setting; follow the app's own theme instead
  const theme = useTheme()
  return <Toaster richColors theme={theme} position="top-right" />
}

export { toast }
