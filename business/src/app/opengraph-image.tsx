import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Gaviom for Business — Employee Contest Benefits';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: 'linear-gradient(135deg, #0A0A0F 0%, #1a1520 50%, #0A0A0F 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: '#C9A84C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
              color: '#0A0A0F',
            }}
          >
            G
          </div>
          <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.5)' }}>
            Gaviom / Business
          </span>
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            maxWidth: 900,
          }}
        >
          Turn Your Workforce Into Winners
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 26,
            color: 'rgba(255,255,255,0.65)',
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Luxury employee contest benefits. We handle everything — you take the
          credit.
        </div>
        <div
          style={{
            marginTop: 48,
            padding: '16px 32px',
            background: '#C9A84C',
            borderRadius: 12,
            fontSize: 22,
            fontWeight: 600,
            color: '#0A0A0F',
            alignSelf: 'flex-start',
          }}
        >
          gaviom.com/business
        </div>
      </div>
    ),
    { ...size },
  );
}
