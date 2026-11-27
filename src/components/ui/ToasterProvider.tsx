'use client'

import { AlertTriangle, Check, Info, X } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { useTheme } from '@/hooks/useTheme'
import './toast.css'

export function ToasterProvider() {
  // Sonner only knows the OS setting; follow the app's own theme instead
  const theme = useTheme()
  return (
    <Toaster
      theme={theme}
      position="top-right"
      offset={20}
      gap={12}
      visibleToasts={4}
      closeButton
      duration={4500}
      icons={{
        success: <Check strokeWidth={3} aria-hidden="true" />,
        error: <X strokeWidth={3} aria-hidden="true" />,
        warning: <AlertTriangle aria-hidden="true" />,
        info: <Info aria-hidden="true" />,
      }}
    />
  )
}

export { toast }
