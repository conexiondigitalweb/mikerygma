import { forwardRef } from 'react'

const DIMENSIONS = {
  instagram: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  twitter: { width: 1200, height: 675 },
}

const SERIF = 'Georgia, "Times New Roman", serif'
const SANS = 'system-ui, Arial, sans-serif'

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
          background: 'linear-gradient(180deg, #8B7355 0%, #5C4A35 100%)',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '100px 70px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: SERIF,
            fontSize: '340px',
            lineHeight: 1,
            color: '#B8860B',
            opacity: 0.2,
            userSelect: 'none',
          }}
        >
          &ldquo;
        </div>
        <p
          style={{
            position: 'relative',
            zIndex: 1,
            fontFamily: SANS,
            fontSize: '58px',
            lineHeight: 1.5,
            color: '#FFFFFF',
            fontWeight: 500,
            margin: 0,
          }}
        >
          {text}
        </p>
        {reference && (
          <p
            style={{
              position: 'relative',
              zIndex: 1,
              marginTop: '36px',
              fontFamily: SANS,
              fontSize: '30px',
              color: '#E8DCC8',
              opacity: 0.85,
            }}
          >
            {reference}
          </p>
        )}
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            left: 0,
            width: '100%',
            textAlign: 'center',
            fontFamily: SANS,
            fontSize: '22px',
            color: '#E8DCC8',
            opacity: 0.6,
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
          background: '#FFF8F0',
          flexDirection: 'row',
        }}
      >
        <div style={{ width: '28px', height: '100%', background: '#C1694F', flexShrink: 0 }} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '64px 72px',
            textAlign: 'left',
          }}
        >
          <p
            style={{
              fontFamily: SANS,
              fontSize: '44px',
              lineHeight: 1.45,
              color: '#4A3728',
              margin: 0,
            }}
          >
            {text}
          </p>
          {hashtags.length > 0 && (
            <p
              style={{
                marginTop: '28px',
                fontFamily: SANS,
                fontSize: '28px',
                color: '#B8860B',
              }}
            >
              {hashtags.join(' ')}
            </p>
          )}
          <div
            style={{
              position: 'absolute',
              bottom: '32px',
              right: '48px',
              fontFamily: SANS,
              fontSize: '20px',
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
                color: '#8B7355',
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
        background: 'linear-gradient(180deg, #FFF8F0 0%, #F5E6D0 100%)',
        borderTop: '14px solid #B8860B',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 60px',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: SERIF,
          fontStyle: 'italic',
          fontSize: '54px',
          lineHeight: 1.45,
          color: '#4A3728',
          margin: 0,
        }}
      >
        {text}
      </p>
      {reference && (
        <p
          style={{
            marginTop: '36px',
            fontFamily: SERIF,
            fontSize: '30px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            color: '#B8860B',
          }}
        >
          {reference}
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
            color: '#8B7355',
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
