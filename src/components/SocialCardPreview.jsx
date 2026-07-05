import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { Download, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SocialCard } from '@/components/SocialCard'

const DIMENSIONS = {
  instagram: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  twitter: { width: 1200, height: 675 },
}

const PREVIEW_BOX = 260

export function SocialCardPreview({
  text,
  type = 'instagram',
  hashtags = [],
  reference,
  style = 'verse',
  showWatermark = false,
  filename = 'mikerygma',
  platform,
}) {
  const captureRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | downloading | done

  const { width, height } = DIMENSIONS[type] ?? DIMENSIONS.instagram
  const scale = Math.min(PREVIEW_BOX / width, PREVIEW_BOX / height)
  const displayWidth = Math.round(width * scale)
  const displayHeight = Math.round(height * scale)

  const handleDownload = async () => {
    if (!captureRef.current || status === 'downloading') return
    setStatus('downloading')
    try {
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      })
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${filename}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
      setStatus('done')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      console.error('Error al generar la imagen para redes:', err)
      setStatus('idle')
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
          overflow: 'hidden',
          position: 'relative',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: `${width}px`,
            height: `${height}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <SocialCard
            text={text}
            type={type}
            hashtags={hashtags}
            reference={reference}
            style={style}
            showWatermark={showWatermark}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {platform && (
          <Badge variant="secondary" className="text-xs text-muted-foreground">
            {platform} · {width}×{height}
          </Badge>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={status === 'downloading'}
        >
          {status === 'done' ? (
            <>
              <Check className="text-primary" /> Descargado ✓
            </>
          ) : (
            <>
              <Download /> {status === 'downloading' ? 'Descargando...' : 'Descargar imagen'}
            </>
          )}
        </Button>
      </div>

      {/* Instancia oculta a tamaño real, usada solo para exportar con html2canvas */}
      <div style={{ position: 'fixed', top: 0, left: '-9999px', pointerEvents: 'none' }} aria-hidden="true">
        <SocialCard
          ref={captureRef}
          text={text}
          type={type}
          hashtags={hashtags}
          reference={reference}
          style={style}
          showWatermark={showWatermark}
        />
      </div>
    </div>
  )
}

export default SocialCardPreview
