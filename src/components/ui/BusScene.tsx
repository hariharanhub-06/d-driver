'use client';

interface BusSceneProps {
  compact?: boolean;
  fullPanel?: boolean;
  className?: string;
}

function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#111" />
      <circle cx={cx} cy={cy} r={r * 0.68} fill="#222" />
      <circle cx={cx} cy={cy} r={r * 0.32} fill="#444" />
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="0.85s" repeatCount="indefinite" />
        {[0, 60, 120, 180, 240, 300].map(deg => (
          <line key={deg}
            x1={cx + r * 0.32 * Math.cos(deg * Math.PI / 180)}
            y1={cy + r * 0.32 * Math.sin(deg * Math.PI / 180)}
            x2={cx + r * 0.68 * Math.cos(deg * Math.PI / 180)}
            y2={cy + r * 0.68 * Math.sin(deg * Math.PI / 180)}
            stroke="#555" strokeWidth="1.5" />
        ))}
      </g>
    </g>
  );
}

function BusSVG({ w, h }: { w: number; h: number }) {
  return (
    <svg viewBox="0 0 270 105" width={w} height={h} fill="none" overflow="visible">
      <defs>
        <filter id="_hgl" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="_body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDD835" />
          <stop offset="100%" stopColor="#F9A825" />
        </linearGradient>
        <linearGradient id="_roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE57F" />
          <stop offset="100%" stopColor="#FDD835" />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="135" cy="100" rx="118" ry="6" fill="rgba(0,0,0,0.25)" />

      {/* Body */}
      <rect x="8" y="22" width="244" height="62" rx="5" fill="url(#_body)" />
      {/* Roof */}
      <rect x="12" y="12" width="236" height="18" rx="4" fill="url(#_roof)" />
      {/* Black divider strips */}
      <rect x="8" y="36" width="244" height="3" fill="#1a1a1a" opacity="0.6" />
      <rect x="8" y="73" width="244" height="7" rx="3" fill="#1a1a1a" />

      {/* Speed streaks behind bus (rear/left side) */}
      <rect x="-52" y="37" width="48" height="2.5" rx="1" fill="rgba(253,216,53,0.45)" />
      <rect x="-65" y="48" width="62" height="2" rx="1" fill="rgba(253,216,53,0.3)" />
      <rect x="-42" y="59" width="38" height="2" rx="1" fill="rgba(253,216,53,0.22)" />
      <rect x="-58" y="68" width="52" height="1.5" rx="1" fill="rgba(253,216,53,0.15)" />

      {/* Windows */}
      {[32, 68, 104, 140, 172].map((x, i) => (
        <g key={i}>
          <rect x={x} y="40" width={i === 4 ? 22 : 28} height="24" rx="3" fill="#1e3d6b" opacity="0.9" />
          <rect x={x} y="40" width={i === 4 ? 22 : 28} height="24" rx="3" fill="#FF9A3C" opacity="0.2" />
          <rect x={x + 2} y="42" width="8" height="3" rx="1" fill="rgba(255,255,255,0.22)" />
        </g>
      ))}

      {/* Front cab */}
      <rect x="208" y="12" width="44" height="72" rx="6" fill="#F9A825" />
      {/* Windshield */}
      <path d="M213 38 L244 32 L250 58 L213 58 Z" fill="#1e3d6b" opacity="0.88" />
      <path d="M215 40 L232 36 L232 42 L215 42 Z" fill="rgba(255,255,255,0.2)" />

      {/* Headlight + glow */}
      <rect x="247" y="44" width="8" height="12" rx="3" fill="#FFF9C4" filter="url(#_hgl)" />
      <ellipse cx="252" cy="50" rx="14" ry="10" fill="rgba(255,240,80,0.3)" filter="url(#_hgl)" />

      {/* Rear tail light */}
      <rect x="8" y="42" width="7" height="12" rx="2" fill="#FF3B3B" />

      {/* Door */}
      <rect x="183" y="38" width="20" height="36" rx="2" fill="#E8A000" stroke="#1a1a1a" strokeWidth="1" />
      <line x1="193" y1="38" x2="193" y2="74" stroke="#1a1a1a" strokeWidth="1" />
      <circle cx="195" cy="56" r="2.5" fill="#1a1a1a" />

      {/* SCHOOL BUS label */}
      <text x="30" y="78" fontSize="8" fontWeight="800" fill="#1a1a1a" fontFamily="Arial, sans-serif" letterSpacing="1.5">SCHOOL BUS</text>

      {/* Wheel arches */}
      <path d="M45 80 Q75 68 105 80" fill="#111" />
      <path d="M165 80 Q195 68 225 80" fill="#111" />

      <Wheel cx={75} cy={88} r={17} />
      <Wheel cx={195} cy={88} r={17} />
    </svg>
  );
}

export default function BusScene({ compact, fullPanel, className }: BusSceneProps) {
  const h = compact ? 180 : 300;
  const busW = compact ? 138 : fullPanel ? 260 : 210;
  const busH = compact ? 54 : fullPanel ? 100 : 80;
  const dur = compact ? '7s' : fullPanel ? '13s' : '11s';
  const floatDur = compact ? '0.6s' : '0.8s';

  const outerStyle: React.CSSProperties = fullPanel
    ? { position: 'absolute', inset: 0, height: '100%', minHeight: '100vh' }
    : { height: h };

  return (
    <div
      className={`w-full relative overflow-hidden select-none${className ? ' ' + className : ''}`}
      style={outerStyle}
    >
      <style>{`
        @keyframes _bR { from{transform:translateX(112%)} to{transform:translateX(-112%)} }
        @keyframes _bF { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes _dS { from{transform:translateX(0)} to{transform:translateX(-64px)} }
        @keyframes _tw { 0%,100%{opacity:0.45} 50%{opacity:1} }
        @keyframes _lp { 0%,100%{opacity:0.5} 50%{opacity:0.95} }
        @keyframes _pA { 0%{opacity:0;transform:translate(0,0) scale(0.3)} 45%{opacity:0.55} 100%{opacity:0;transform:translate(-20px,-28px) scale(1.3)} }
      `}</style>

      {/* ── Full scene SVG ── */}
      <svg
        width="100%" height="100%"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          <linearGradient id="_sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#080616" />
            <stop offset="18%" stopColor="#160d38" />
            <stop offset="42%" stopColor="#4a1258" />
            <stop offset="63%" stopColor="#b83040" />
            <stop offset="78%" stopColor="#e86e1a" />
            <stop offset="91%" stopColor="#f5b030" />
            <stop offset="100%" stopColor="#fdd060" />
          </linearGradient>
          <radialGradient id="_sunHalo" cx="70%" cy="67%" r="22%">
            <stop offset="0%" stopColor="#FFF5C0" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#F5A020" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#E86A10" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="_gnd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d180a" />
            <stop offset="100%" stopColor="#060c06" />
          </linearGradient>
          <filter id="_lampGlow" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Sky + sun halo */}
        <rect width="800" height="600" fill="url(#_sky)" />
        <rect width="800" height="600" fill="url(#_sunHalo)" />

        {/* Stars */}
        {[
          [72,38],[148,22],[228,56],[318,30],[408,48],[468,18],[558,42],[638,26],[718,52],[758,19],
          [95,78],[195,88],[348,72],[498,82],[678,68],[46,108],[275,98],[428,112],[598,92],[742,102],
          [350,140],[450,125],[520,155],[180,130],[640,118],
        ].map(([sx, sy], i) => (
          <circle key={i} cx={sx} cy={sy} r={i % 3 === 0 ? 1.5 : 1} fill="white" opacity="0.65"
            style={{ animation: `_tw ${2 + i % 3}s ease-in-out ${((i * 0.37) % 4).toFixed(1)}s infinite` }} />
        ))}

        {/* Ground */}
        <rect x="0" y="370" width="800" height="230" fill="url(#_gnd)" />

        {/* Hill silhouette */}
        <path d="M0 388 Q90 342 180 380 Q250 355 340 382 Q420 348 510 376 Q590 352 680 380 Q740 360 800 374 L800 600 L0 600 Z"
          fill="#090f07" />

        {/* Background city buildings */}
        {[
          [20,130,40],[68,168,32],[108,145,44],[158,195,36],[200,158,28],[242,210,48],
          [292,172,34],[334,190,40],[380,215,32],[422,178,44],[468,200,36],[512,174,28],
          [556,192,40],[600,165,34],[642,205,44],[688,158,36],[732,182,28],[770,172,40],
        ].map(([bx, bh, bw], i) => (
          <rect key={i} x={bx} y={370 - bh} width={bw} height={bh} fill="#08041a" opacity="0.85" />
        ))}

        {/* Building window lights */}
        {[
          [30,248],[48,260],[75,235],[90,252],[115,242],[130,256],[162,238],[178,254],
          [212,248],[228,264],[250,240],[266,258],[298,232],[315,250],[342,244],[358,260],
          [385,228],[402,246],[428,238],[445,254],[472,242],[488,258],[515,230],[532,248],
          [560,240],[576,256],[604,236],[620,252],[648,240],[664,256],[692,230],[708,246],
          [736,238],[752,254],[775,232],[790,250],
          [40,265],[85,275],[140,268],[200,270],[255,272],[310,265],[370,270],[430,268],
          [490,272],[548,266],[608,272],[660,268],[718,272],[780,266],
        ].map(([wx, wy], i) => (
          <rect key={i} x={wx} y={wy} width="5" height="6" rx="0.5"
            fill={i % 5 === 0 ? '#FFC870' : '#FFB040'} opacity="0.8"
            style={{ animation: `_tw ${2.5 + i % 4 * 0.6}s ease-in-out ${((i * 0.42) % 5).toFixed(1)}s infinite` }} />
        ))}

        {/* Foreground trees */}
        {[
          [12, 370, 26, 72], [50, 370, 20, 56], [618, 370, 26, 70],
          [660, 370, 22, 54], [718, 370, 30, 78], [762, 370, 20, 58],
        ].map(([tx, ty, tw, th], i) => (
          <g key={i}>
            <polygon points={`${tx},${ty} ${tx + tw / 2},${ty - th} ${tx + tw},${ty}`} fill="#030d03" />
            <polygon points={`${tx + 3},${ty} ${tx + tw / 2},${ty - th * 0.65} ${tx + tw - 3},${ty}`} fill="#060f06" />
          </g>
        ))}

        {/* Street lamps */}
        {[115, 275, 440, 598, 748].map((lx, i) => (
          <g key={i}>
            <rect x={lx} y={332} width="3" height="38" fill="#14142a" />
            <path d={`M${lx + 1.5} 332 Q${lx + 16} 316 ${lx + 24} 319`}
              stroke="#14142a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <circle cx={lx + 24} cy={319} r="5"
              fill="#FFF0A0" filter="url(#_lampGlow)"
              style={{ animation: `_lp 3.5s ease-in-out ${(i * 0.8).toFixed(1)}s infinite` }} />
            <ellipse cx={lx + 24} cy={342} rx="24" ry="12"
              fill="rgba(255,240,100,0.07)"
              style={{ animation: `_lp 3.5s ease-in-out ${(i * 0.8).toFixed(1)}s infinite` }} />
          </g>
        ))}

        {/* Road */}
        <rect x="0" y="370" width="800" height="56" fill="#0e0e12" />
        <rect x="0" y="370" width="800" height="2.5" fill="rgba(255,255,255,0.15)" />
        <rect x="0" y="424" width="800" height="2.5" fill="rgba(255,255,255,0.12)" />

        {/* Animated road dashes */}
        <g style={{ animation: '_dS 0.52s linear infinite' }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <rect key={i} x={i * 64} y="392" width="40" height="5" rx="2.5"
              fill="#F5C800" opacity="0.88" />
          ))}
        </g>
      </svg>

      {/* ── Animated bus ── */}
      <div style={{
        position: 'absolute',
        bottom: fullPanel ? '24.5%' : `${Math.round(h * 0.053)}px`,
        left: 0,
        width: '100%',
        animation: `_bR ${dur} linear infinite`,
      }}>
        <div style={{ animation: `_bF ${floatDur} ease-in-out infinite`, display: 'inline-block' }}>
          <BusSVG w={busW} h={busH} />
        </div>
      </div>

      {/* Exhaust puffs */}
      {[0, 1.3, 2.6].map((delay, i) => (
        <div key={i} style={{
          position: 'absolute',
          bottom: fullPanel ? '35%' : `${Math.round(h * 0.23)}px`,
          left: '7%',
          width: 12, height: 12,
          borderRadius: '50%',
          background: 'rgba(160,140,100,0.35)',
          animation: `_pA 2.6s ease-out ${delay}s infinite`,
        }} />
      ))}
    </div>
  );
}
