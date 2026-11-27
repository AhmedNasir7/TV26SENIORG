'use client'

/**
 * Turns a component's error or success text into a toast. Drop it where the coloured text used to be:
 *   <ErrorToast message={error} />   <SuccessToast message={done} />
 * It shows once per new message and renders nothing itself.
 */
import { useEffect } from 'react'
import { toast } from './ToasterProvider'

export function ErrorToast({ message }: { message?: string | null }) {
  useEffect(() => {
    if (message) toast.error(message)
  }, [message])
  return null
}

export function SuccessToast({ message }: { message?: string | null }) {
  useEffect(() => {
    if (message) toast.success(message)
  }, [message])
  return null
}
