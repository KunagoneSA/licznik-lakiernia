import { useEffect, useRef } from 'react'

export function useModalKeys(onClose: () => void, onSubmit?: () => void) {
  const closeRef = useRef(onClose)
  const submitRef = useRef(onSubmit)
  closeRef.current = onClose
  submitRef.current = onSubmit

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeRef.current()
      }
      if (e.key === 'Enter' && !e.shiftKey && submitRef.current) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        submitRef.current()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
}
