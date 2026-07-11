import { forwardRef } from 'react'

const DIMENSIONS = {
  instagram: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  twitter: { width: 1200, height: 675 },
}

const SERIF = 'Georgia, "Times New Roman", serif'
const SANS = 'system-ui, Arial, sans-serif'

const COLORS = {
  gold: '#B8860B',
  cream: '#FFF8F0',
  cream2: '#F5E6D0',
  text: '#4A3728',
  textMuted: '#8B7355',
  terracotta: '#C1694F',
}

function Rule({ width = 64, color = COLORS.gold, height = 3 }) {
  return <div style={{ width: `${width}px`, height: `${height}px`, background: color, flexShrink: 0 }} />
}

function ReferenceBadge({ reference, size = 26 }) {
  if (!reference) return null
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '10px 26px',
        border: `2px solid ${COLORS.gold}`,
        borderRadius: '999px',
        fontFamily: SERIF,
        fontWeight: 700,
        fontSize: `${size}px`,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        color: COLORS.gold,
        whiteSpace: 'nowrap',
      }}
    >
      {reference}
    </span>
  )
}

function CornerAccent({ position, size = 56, color = COLORS.gold, thickness = 3 }) {
  const base = { position: 'absolute', width: `${size}px`, height: `${size}px` }
  const bordersByPosition = {
    'top-left': { top: '56px', left: '56px', borderTop: `${thickness}px solid ${color}`, borderLeft: `${thickness}px solid ${color}` },
    'bottom-right': { bottom: '56px', right: '56px', borderBottom: `${thickness}px solid ${color}`, borderRight: `${thickness}px solid ${color}` },
  }
  return <div style={{ ...base, ...bordersByPosition[position] }} />
}

export const SocialCard = forwardRef(function SocialCard(
  { text, type = 'instagram', hashtags = [], reference, style = 'verse', showWatermark = false },
  ref
) {
  const { width, height } = DIMENSIONS[type] ?? DIMENSIONS.instagram

  const baseStyle = {
    width: `${width}px`,
    height: `${height}px`,
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
  }

  if (style === 'quote') {
    return (
      <div
        ref={ref}
        style={{
          ...baseStyle,
          background:
            'radial-gradient(circle at 50% 0%, rgba(184,134,11,0.35), transparent 45%), linear-gradient(180deg, #8B7355 0%, #5C4A35 100%)',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '140px 90px 120px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: SERIF,
            fontSize: '320px',
            lineHeight: 1,
            color: COLORS.gold,
            opacity: 0.18,
            userSelect: 'none',
          }}
        >
          &ldquo;
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '48px' }}>
            <Rule width={70} />
          </div>

          <p
            style={{
              fontFamily: SANS,
              fontSize: '62px',
              lineHeight: 1.45,
              color: '#FFFFFF',
              fontWeight: 700,
              margin: 0,
            }}
          >
            {text}
          </p>

          {reference && (
            <div style={{ marginTop: '56px', display: 'flex', alignItems: 'center', gap: '18px' }}>
              <Rule width={32} height={2} color="rgba(232,220,200,0.6)" />
              <span
                style={{
                  fontFamily: SANS,
                  fontSize: '28px',
                  fontWeight: 600,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: COLORS.gold,
                }}
              >
                {reference}
              </span>
              <Rule width={32} height={2} color="rgba(232,220,200,0.6)" />
            </div>
          )}

          {hashtags.length > 0 && (
            <p
              style={{
                marginTop: '32px',
                fontFamily: SANS,
                fontSize: '26px',
                color: '#E8DCC8',
                opacity: 0.75,
              }}
            >
              {hashtags.join(' ')}
            </p>
          )}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            left: 0,
            width: '100%',
            textAlign: 'center',
            fontFamily: SANS,
            fontSize: '22px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: '#E8DCC8',
            opacity: 0.55,
          }}
        >
          MiKerygma
        </div>
        {showWatermark && (
          <div
            style={{
              position: 'absolute',
              bottom: '96px',
              left: 0,
              width: '100%',
              textAlign: 'center',
              fontFamily: SANS,
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              opacity: 0.9,
            }}
          >
            Generado con MiKerygma.com
          </div>
        )}
      </div>
    )
  }

  if (style === 'reflection') {
    return (
      <div
        ref={ref}
        style={{
          ...baseStyle,
          background: COLORS.cream,
          flexDirection: 'row',
        }}
      >
        <div
          style={{
            width: '20px',
            height: '100%',
            background: `linear-gradient(180deg, ${COLORS.terracotta} 0%, ${COLORS.gold} 100%)`,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '70px 84px',
            textAlign: 'left',
            background: 'radial-gradient(circle at 100% 0%, rgba(184,134,11,0.10), transparent 55%)',
          }}
        >
          <Rule width={56} />

          <p
            style={{
              fontFamily: SANS,
              fontSize: '46px',
              lineHeight: 1.4,
              fontWeight: 600,
              color: COLORS.text,
              margin: '28px 0 0 0',
            }}
          >
            {text}
          </p>

          {(reference || hashtags.length > 0) && (
            <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
              <ReferenceBadge reference={reference} size={22} />
              {hashtags.length > 0 && (
                <span style={{ fontFamily: SANS, fontSize: '26px', color: COLORS.gold }}>
                  {hashtags.join(' ')}
                </span>
              )}
            </div>
          )}

          <div
            style={{
              position: 'absolute',
              bottom: '32px',
              right: '48px',
              fontFamily: SANS,
              fontSize: '20px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#C1A87C',
              opacity: 0.6,
            }}
          >
            MiKerygma
          </div>
          {showWatermark && (
            <div
              style={{
                position: 'absolute',
                bottom: '64px',
                right: '48px',
                fontFamily: SANS,
                fontSize: '24px',
                fontWeight: 'bold',
                color: COLORS.textMuted,
                opacity: 0.9,
              }}
            >
              Generado con MiKerygma.com
            </div>
          )}
        </div>
      </div>
    )
  }

  // style === 'verse' (default)
  return (
    <div
      ref={ref}
      style={{
        ...baseStyle,
        background: `radial-gradient(circle at 85% 12%, rgba(184,134,11,0.14), transparent 50%), linear-gradient(180deg, ${COLORS.cream} 0%, ${COLORS.cream2} 100%)`,
        borderTop: `14px solid ${COLORS.gold}`,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '96px 84px',
        textAlign: 'center',
      }}
    >
      <CornerAccent position="top-left" />
      <CornerAccent position="bottom-right" />

      <div style={{ marginBottom: '40px' }}>
        <Rule />
      </div>

      <p
        style={{
          fontFamily: SERIF,
          fontStyle: 'italic',
          fontSize: '58px',
          lineHeight: 1.42,
          fontWeight: 700,
          color: COLORS.text,
          margin: 0,
        }}
      >
        {text}
      </p>

      {reference && (
        <div style={{ marginTop: '44px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <ReferenceBadge reference={reference} />
        </div>
      )}

      {hashtags.length > 0 && (
        <p
          style={{
            marginTop: '28px',
            fontFamily: SANS,
            fontSize: '26px',
            color: COLORS.gold,
            opacity: 0.8,
          }}
        >
          {hashtags.join(' ')}
        </p>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: '36px',
          left: 0,
          width: '100%',
          textAlign: 'center',
          fontFamily: SANS,
          fontSize: '22px',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          color: '#C1A87C',
          opacity: 0.6,
        }}
      >
        MiKerygma
      </div>
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            left: 0,
            width: '100%',
            textAlign: 'center',
            fontFamily: SANS,
            fontSize: '28px',
            fontWeight: 'bold',
            color: COLORS.textMuted,
            opacity: 0.9,
          }}
        >
          Generado con MiKerygma.com
        </div>
      )}
    </div>
  )
})

export default SocialCard
