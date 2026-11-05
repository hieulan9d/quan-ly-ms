import React from 'react';

interface AuraBackgroundProps {
  children?: React.ReactNode;
}

export function AuraBackground({ children }: AuraBackgroundProps) {
  return (
    <div
      className="aura-bg"
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: "100vh",
        /* NO backgroundColor - blend modes composite against body/page bg */
      }}
    >
      <div
        className="aura-layer-1"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(236,253,245,0.96) 0%, rgba(167,243,208,0.58) 50%, rgba(110,231,183,0.30) 100%)",
          mixBlendMode: "normal",
          pointerEvents: "none",
          transform: "translateZ(0)",
          willChange: "transform",
        }}
        aria-hidden="true"
      />
      <div
        className="aura-layer-2"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 50% 45% at 30% 40%, rgba(52,211,153,0.26) 0%, transparent 68%)",
          mixBlendMode: "multiply",
          pointerEvents: "none",
          transform: "translateZ(0)",
          willChange: "transform",
        }}
        aria-hidden="true"
      />
      <div
        className="aura-layer-3"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 45% 50% at 72% 60%, rgba(45,212,191,0.20) 0%, transparent 70%)",
          mixBlendMode: "multiply",
          pointerEvents: "none",
          transform: "translateZ(0)",
          willChange: "transform",
        }}
        aria-hidden="true"
      />
      <div
        className="aura-layer-4"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(120deg, rgba(255,255,255,0.62) 0%, transparent 45%, rgba(255,255,255,0.32) 100%)",
          mixBlendMode: "multiply",
          pointerEvents: "none",
          transform: "translateZ(0)",
          willChange: "transform",
        }}
        aria-hidden="true"
      />
      <div
        style={{ position: "relative", zIndex: 1 }}
        className="min-h-screen text-slate-900 pb-20 md:pb-8 flex flex-col font-sans"
      >
        {children}
      </div>
    </div>
  );
}
