import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Gaviom for Business, Employee Prize Draw Platform';

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
            fontSize: 52,
            fontWeight: 700,
            color: '#1a2030',
            lineHeight: 1.12,
            letterSpacing: '-0.02em',
            maxWidth: 900,
          }}
        >
          Fully managed employee prize draws for your company
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 24,
            color: '#4a5568',
            maxWidth: 820,
            lineHeight: 1.45,
          }}
        >
          Ticket packs or custom draws. Compliance, comms, and certification
          handled end-to-end.
        </div>
      </div>
    ),
    { ...size },
  );
}
