"use client"

interface PhoneMockupProps {
  screenshot?: string
  width?: number
  height?: number
  frameColor?: string
  placeholder?: string
}

export function PhoneMockup({
  screenshot,
  width = 140,
  height = 280,
  frameColor = "rgba(255,255,255,0.92)",
  placeholder,
}: PhoneMockupProps) {
  const borderWidth = Math.max(6, Math.round(width * 0.045))
  const cornerRadius = Math.round(width * 0.14)
  const notchWidth = Math.round(width * 0.4)
  const notchHeight = Math.round(width * 0.1)

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: `${cornerRadius}px`,
        border: `${borderWidth}px solid ${frameColor}`,
        background: "#111118",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.5)",
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Top notch */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${notchWidth}px`,
          height: `${notchHeight}px`,
          borderRadius: `0 0 ${notchHeight}px ${notchHeight}px`,
          background: frameColor,
          zIndex: 10,
        }}
      />
      {/* Screen */}
      {screenshot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={screenshot}
          alt="App screenshot"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "8px",
            background: "linear-gradient(160deg, #131318 0%, #0d0d12 100%)",
          }}
        >
          {/* Placeholder UI mockup */}
          <div
            style={{
              width: "70%",
              height: "12px",
              borderRadius: "6px",
              background: "rgba(212,175,55,0.3)",
              marginTop: "20px",
            }}
          />
          <div
            style={{
              width: "50%",
              height: "8px",
              borderRadius: "4px",
              background: "rgba(255,255,255,0.1)",
            }}
          />
          <div
            style={{
              width: "60%",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(212,175,55,0.15)",
              border: "1px solid rgba(212,175,55,0.25)",
              marginTop: "8px",
            }}
          />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: "70%",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            />
          ))}
          <div
            style={{
              width: "65%",
              height: "36px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #D4AF37, #F6E27A)",
              marginTop: "8px",
            }}
          />
          {placeholder && (
            <p
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: "10px",
                textAlign: "center",
                padding: "0 12px",
                marginTop: "4px",
              }}
            >
              {placeholder}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
