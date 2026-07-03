import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CopyButton({ getText, label = 'Copiar', className, variant = 'outline', size = 'sm' }) {
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    const text = typeof getText === 'function' ? getText() : getText
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handleClick}
    >
      {copied ? (
        <>
          <Check className="text-primary" /> Copiado ✓
        </>
      ) : (
        <>
          <Copy /> {label}
        </>
      )}
    </Button>
  )
}
