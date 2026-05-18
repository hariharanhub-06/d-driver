'use client';

interface AuthBusPanelProps {
  brandColor?: string;
}

export default function AuthBusPanel({ brandColor }: AuthBusPanelProps) {
  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden">
      {/* Real bus photo */}
      <img
        src="https://images.unsplash.com/photo-1583508805133-8fd03a9916d4?fm=jpg&q=80&w=1200&auto=format&fit=crop"
        alt="School bus"
        className="absolute inset-0 w-full h-full object-cover object-center"
        draggable={false}
      />
      {/* Dark gradient overlay so form side contrasts well */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${brandColor || 'rgba(30,58,138,0.72)'} 0%, rgba(0,0,0,0.55) 100%)`,
        }}
      />
      {/* Branding text */}
      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-2 px-8">
        <div className="w-12 h-1 rounded-full bg-white/40 mb-1" />
        <p className="text-white/90 text-lg font-bold tracking-wide">D-Driver</p>
        <p className="text-white/55 text-xs text-center">School Bus Management Platform</p>
      </div>
    </div>
  );
}
