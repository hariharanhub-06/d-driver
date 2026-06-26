// Branded opening / route-loading screen — OnLive logo on the dark brand bg.
export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        background: "#0a0f1e",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/onlive-logo.png"
        alt="Onlive"
        width={150}
        height={150}
        style={{ objectFit: "contain", animation: "onlivePulse 1.6s ease-in-out infinite" }}
      />
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.15)",
          borderTopColor: "#facc15",
          animation: "onliveSpin 0.8s linear infinite",
        }}
      />
      <style>{`
        @keyframes onliveSpin { to { transform: rotate(360deg); } }
        @keyframes onlivePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
      `}</style>
    </div>
  );
}
