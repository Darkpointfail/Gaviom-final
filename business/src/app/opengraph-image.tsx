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
          background: 'linear-gradient(135deg, #FAF7F2 0%, #F4EFE6 50%, #F3EBD9 100%)',
        }}
      >
        <div
          style={{
            width: 72,
            height: 4,
            borderRadius: 999,
            background: '#C9A84C',
            marginBottom: 32,
          }}
        />
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: '#B8943E',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          Gaviom for Business
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#1a2030',
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
            color: '#4a5568',
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Luxury employee contest benefits. We handle everything — you take the
          credit.
        </div>
      </div>
    ),
    { ...size },
  );
}
