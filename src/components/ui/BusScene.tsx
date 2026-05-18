'use client';

interface BusSceneProps {
  compact?: boolean;   // small strip for landing page hero
  fullPanel?: boolean; // fills the entire auth left panel
  className?: string;
}

const CSS = `
@keyframes _bRoll {
  0%   { left: -22%; }
  100% { left: 112%; }
}
@keyframes _bFloat {
  0%, 100% { transform: translateY(0px); }
  25%       { transform: translateY(-6px); }
  75%       { transform: translateY(-3px); }
}
@keyframes _dashL {
  from { transform: translateX(0); }
  to   { transform: translateX(-60px); }
}
@keyframes _cldA {
  from { transform: translateX(0); }
  to   { transform: translateX(-800px); }
}
@keyframes _cldB {
  from { transform: translateX(0); }
  to   { transform: translateX(-600px); }
}
@keyframes _pufA {
  0%   { opacity: 0.55; transform: scale(0.5) translate(0,0); }
  100% { opacity: 0;    transform: scale(2.8) translate(-14px,-22px); }
}
@keyframes _pufB {
  0%   { opacity: 0.4;  transform: scale(0.4) translate(0,0); }
  100% { opacity: 0;    transform: scale(2.2) translate(-10px,-16px); }
}
@keyframes _sunPulse {
  0%, 100% { opacity: 0.9; r: 28; }
  50%       { opacity: 1;   r: 32; }
}
@keyframes _bird1 {
  0%   { transform: translateX(0)   translateY(0); }
  50%  { transform: translateX(40px) translateY(-12px); }
  100% { transform: translateX(80px) translateY(0); }
}
@keyframes _bird2 {
  0%   { transform: translateX(0)    translateY(0); }
  50%  { transform: translateX(-30px) translateY(-8px); }
  100% { transform: translateX(-60px) translateY(0); }
}
`;

function BusSVG({ w, h }: { w: number; h: number }) {
  const vW = 168; const vH = 62;
  return (
    <svg viewBox={`0 0 ${vW} ${vH}`} width={w} height={h} xmlns="http://www.w3.org/2000/svg">
      <rect x="4"   y="5"  width="156" height="38" rx="5"   fill="#FFD700"/>
      <rect x="8"   y="2"  width="148" height="14" rx="4"   fill="#FFC200"/>
      <rect x="150" y="9"  width="12"  height="28" rx="3"   fill="#E8A000"/>
      <rect x="4"   y="25" width="156" height="3"  fill="#111" opacity="0.28"/>
      <rect x="14"  y="8"  width="22"  height="14" rx="2"   fill="#B8D8F0" opacity="0.88"/>
      <rect x="41"  y="8"  width="22"  height="14" rx="2"   fill="#B8D8F0" opacity="0.88"/>
      <rect x="68"  y="8"  width="22"  height="14" rx="2"   fill="#B8D8F0" opacity="0.88"/>
      <rect x="95"  y="8"  width="22"  height="14" rx="2"   fill="#B8D8F0" opacity="0.88"/>
      <rect x="122" y="8"  width="20"  height="14" rx="2"   fill="#B8D8F0" opacity="0.88"/>
      <rect x="14"  y="8"  width="8"   height="4"  rx="1"   fill="white"   opacity="0.35"/>
      <rect x="41"  y="8"  width="8"   height="4"  rx="1"   fill="white"   opacity="0.35"/>
      <rect x="68"  y="8"  width="8"   height="4"  rx="1"   fill="white"   opacity="0.35"/>
      <rect x="95"  y="8"  width="8"   height="4"  rx="1"   fill="white"   opacity="0.35"/>
      <rect x="122" y="8"  width="7"   height="4"  rx="1"   fill="white"   opacity="0.35"/>
      <rect x="4"   y="28" width="8"   height="14" rx="1"   fill="#FFB300" stroke="#333" strokeWidth="0.7"/>
      <circle cx="10" cy="35" r="1.3"  fill="#333" opacity="0.65"/>
      <rect x="158" y="14" width="7"   height="6"  rx="1.5" fill="#FFFDE7"/>
      <rect x="158" y="22" width="7"   height="4"  rx="1"   fill="#FFF9C4" opacity="0.75"/>
      <rect x="156" y="39" width="12"  height="5"  rx="2"   fill="#9E9E9E"/>
      <rect x="0"   y="39" width="8"   height="5"  rx="2"   fill="#9E9E9E"/>
      <rect x="0"   y="31" width="7"   height="3"  rx="1"   fill="#666"/>
      <ellipse cx="38"  cy="43" rx="17" ry="9"  fill="#111"/>
      <ellipse cx="124" cy="43" rx="17" ry="9"  fill="#111"/>
      <circle cx="38"  cy="44" r="14"  fill="#1a1a1a"/>
      <circle cx="38"  cy="44" r="9"   fill="#383838"/>
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 38 44" to="360 38 44" dur="0.55s" repeatCount="indefinite"/>
        <line x1="38" y1="35" x2="38" y2="53" stroke="#666" strokeWidth="1.8"/>
        <line x1="29" y1="44" x2="47" y2="44" stroke="#666" strokeWidth="1.8"/>
        <line x1="31.6" y1="37.6" x2="44.4" y2="50.4" stroke="#666" strokeWidth="1.5"/>
        <line x1="44.4" y1="37.6" x2="31.6" y2="50.4" stroke="#666" strokeWidth="1.5"/>
      </g>
      <circle cx="38"  cy="44" r="4.5" fill="#555"/>
      <circle cx="38"  cy="44" r="2"   fill="#777"/>
      <circle cx="124" cy="44" r="14"  fill="#1a1a1a"/>
      <circle cx="124" cy="44" r="9"   fill="#383838"/>
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 124 44" to="360 124 44" dur="0.55s" repeatCount="indefinite"/>
        <line x1="124" y1="35" x2="124" y2="53" stroke="#666" strokeWidth="1.8"/>
        <line x1="115" y1="44" x2="133" y2="44" stroke="#666" strokeWidth="1.8"/>
        <line x1="117.6" y1="37.6" x2="130.4" y2="50.4" stroke="#666" strokeWidth="1.5"/>
        <line x1="130.4" y1="37.6" x2="117.6" y2="50.4" stroke="#666" strokeWidth="1.5"/>
      </g>
      <circle cx="124" cy="44" r="4.5" fill="#555"/>
      <circle cx="124" cy="44" r="2"   fill="#777"/>
      <text x="32" y="37" fontSize="6.5" fontWeight="bold" fill="#555" opacity="0.55" fontFamily="Arial,sans-serif">D-DRIVER 365</text>
      <text x="16" y="21" fontSize="4"   fill="#333" opacity="0.4"  fontFamily="Arial,sans-serif">SCHOOL BUS</text>
    </svg>
  );
}

export default function BusScene({ compact = false, fullPanel = false, className = '' }: BusSceneProps) {
  const h     = fullPanel ? 900 : compact ? 186 : 300;
  const roadH = fullPanel ? 180 : compact ? 58  : 88;
  const skyH  = h - roadH;
  const bW    = fullPanel ? 240 : compact ? 108 : 168;
  const bH    = fullPanel ? 93  : compact ? 42  : 65;
  const bDur  = fullPanel ? '9s' : compact ? '7s' : '11s';
  const fDur  = fullPanel ? '1.1s' : compact ? '0.85s' : '1s';
  const busBottom = fullPanel ? roadH * 0.5 : roadH * 0.46;

  const outerStyle: React.CSSProperties = fullPanel
    ? { height: '100%', minHeight: '100vh', position: 'absolute', inset: 0 }
    : { height: h };

  return (
    <div
      className={`relative overflow-hidden pointer-events-none select-none ${className}`}
      style={outerStyle}
      aria-hidden="true"
    >
      <style>{CSS}</style>

      {/* Sky */}
      <div
        className="absolute inset-0"
        style={{ background: fullPanel
          ? 'linear-gradient(to bottom, #1a3a5c 0%, #2d6a9f 25%, #4BA3C7 55%, #87CEEB 75%, #C8E9C1 100%)'
          : 'linear-gradient(to bottom, #4BA3C7 0%, #87CEEB 35%, #B8E4F0 65%, #C8E9C1 100%)'
        }}
      />

      {/* Sun (only in full panel) */}
      {fullPanel && (
        <svg className="absolute" style={{ top: skyH * 0.08, right: '12%' }} width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="28" fill="#FFE066" opacity="0.9">
            <animate attributeName="r" values="28;32;28" dur="4s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.9;1;0.9" dur="4s" repeatCount="indefinite"/>
          </circle>
          <circle cx="40" cy="40" r="20" fill="#FFD700"/>
          {/* Sun rays */}
          {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg) => (
            <line key={deg}
              x1="40" y1="40"
              x2={40 + 38 * Math.cos(deg * Math.PI / 180)}
              y2={40 + 38 * Math.sin(deg * Math.PI / 180)}
              stroke="#FFE066" strokeWidth="2.5" opacity="0.5"
              strokeLinecap="round"
            />
          ))}
        </svg>
      )}

      {/* Birds (only in full panel) */}
      {fullPanel && (
        <svg className="absolute" style={{ top: skyH * 0.22, left: '15%' }} width="120" height="40" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
          <g style={{ animation: '_bird1 4s ease-in-out infinite' }}>
            <path d="M10,20 Q15,14 20,20 Q25,14 30,20" stroke="#1a3a5c" strokeWidth="1.8" fill="none" opacity="0.55"/>
          </g>
          <g style={{ animation: '_bird2 5s ease-in-out infinite', animationDelay: '1s' }}>
            <path d="M50,15 Q55,9  60,15 Q65,9  70,15" stroke="#1a3a5c" strokeWidth="1.5" fill="none" opacity="0.45"/>
          </g>
          <g style={{ animation: '_bird1 6s ease-in-out infinite', animationDelay: '2s' }}>
            <path d="M85,25 Q89,20 93,25 Q97,20 101,25" stroke="#1a3a5c" strokeWidth="1.3" fill="none" opacity="0.35"/>
          </g>
        </svg>
      )}

      {/* Clouds */}
      <svg
        className="absolute left-0 top-0"
        style={{ width: '250%', height: skyH }}
        viewBox={`0 0 2000 ${skyH}`}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMinYMid"
      >
        <g style={{ animation: `_cldA 26s linear infinite` }}>
          <ellipse cx="180"  cy={skyH * 0.18} rx="58" ry="22" fill="white" opacity="0.92"/>
          <ellipse cx="145"  cy={skyH * 0.23} rx="38" ry="16" fill="white" opacity="0.92"/>
          <ellipse cx="222"  cy={skyH * 0.22} rx="34" ry="14" fill="white" opacity="0.92"/>
          <ellipse cx="680"  cy={skyH * 0.14} rx="48" ry="19" fill="white" opacity="0.78"/>
          <ellipse cx="645"  cy={skyH * 0.18} rx="30" ry="13" fill="white" opacity="0.78"/>
          <ellipse cx="718"  cy={skyH * 0.17} rx="28" ry="11" fill="white" opacity="0.78"/>
          <ellipse cx="1180" cy={skyH * 0.16} rx="52" ry="20" fill="white" opacity="0.82"/>
          <ellipse cx="1144" cy={skyH * 0.21} rx="33" ry="14" fill="white" opacity="0.82"/>
          <ellipse cx="1218" cy={skyH * 0.20} rx="30" ry="12" fill="white" opacity="0.82"/>
          <ellipse cx="1700" cy={skyH * 0.12} rx="44" ry="17" fill="white" opacity="0.7"/>
          <ellipse cx="1666" cy={skyH * 0.16} rx="28" ry="12" fill="white" opacity="0.7"/>
        </g>
        <g style={{ animation: `_cldB 38s linear infinite`, animationDelay: '-18s' }}>
          <ellipse cx="420"  cy={skyH * 0.22} rx="36" ry="14" fill="white" opacity="0.6"/>
          <ellipse cx="392"  cy={skyH * 0.26} rx="22" ry="10" fill="white" opacity="0.6"/>
          <ellipse cx="448"  cy={skyH * 0.25} rx="20" ry="9"  fill="white" opacity="0.6"/>
          <ellipse cx="1100" cy={skyH * 0.19} rx="42" ry="16" fill="white" opacity="0.65"/>
          <ellipse cx="1068" cy={skyH * 0.23} rx="27" ry="11" fill="white" opacity="0.65"/>
          <ellipse cx="1136" cy={skyH * 0.22} rx="25" ry="10" fill="white" opacity="0.65"/>
        </g>
      </svg>

      {/* Horizon — hills, trees, buildings */}
      <svg
        className="absolute left-0 right-0"
        style={{ bottom: roadH - 4, width: '100%' }}
        viewBox={`0 0 1000 ${fullPanel ? 120 : compact ? 38 : 70}`}
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {fullPanel ? (
          <>
            {/* Far hills */}
            <path d="M0,120 Q120,50 250,120 Q380,40 520,120 Q660,35 800,120 Q900,55 1000,120 L1000,130 L0,130Z" fill="#3a7a30" opacity="0.4"/>
            {/* Near hills */}
            <path d="M0,120 Q180,70 360,120 Q540,55 720,120 Q860,65 1000,120 L1000,130 L0,130Z" fill="#4a8a40" opacity="0.55"/>
            {/* Buildings */}
            <rect x="280" y="35"  width="26" height="85" fill="#1e2240" opacity="0.55"/>
            <rect x="312" y="50"  width="32" height="70" fill="#262840" opacity="0.5"/>
            <rect x="350" y="28"  width="22" height="92" fill="#1e2240" opacity="0.55"/>
            <rect x="378" y="55"  width="28" height="65" fill="#262840" opacity="0.45"/>
            {/* Building windows */}
            {[285,293,301,285,293,301].map((x, i) => (
              <rect key={i} x={x} y={45 + (i < 3 ? 0 : 14)} width="5" height="5" fill="#FFD700" opacity={0.35 + Math.random()*0.2}/>
            ))}
            <rect x="318" y="58" width="5" height="5" fill="#87CEEB" opacity="0.4"/>
            <rect x="326" y="58" width="5" height="5" fill="#FFD700" opacity="0.3"/>
            <rect x="318" y="68" width="5" height="5" fill="#87CEEB" opacity="0.35"/>
            <rect x="356" y="36" width="4" height="4" fill="#FFD700" opacity="0.45"/>
            <rect x="356" y="46" width="4" height="4" fill="#FFD700" opacity="0.35"/>
            <rect x="356" y="56" width="4" height="4" fill="#FFD700" opacity="0.4"/>
            {/* Trees */}
            <polygon points="52,120  65,75   78,120"  fill="#1e5c1e" opacity="0.7"/>
            <polygon points="72,120  85,62   98,120"  fill="#1e5c1e" opacity="0.7"/>
            <polygon points="105,120 116,80  127,120" fill="#266b26" opacity="0.55"/>
            <polygon points="520,120 535,68  550,120" fill="#1e5c1e" opacity="0.65"/>
            <polygon points="545,120 558,55  571,120" fill="#1e5c1e" opacity="0.65"/>
            <polygon points="730,120 745,72  760,120" fill="#1e5c1e" opacity="0.6"/>
            <polygon points="910,120 925,62  940,120" fill="#1e5c1e" opacity="0.65"/>
            <polygon points="940,120 950,78  960,120" fill="#1e5c1e" opacity="0.55"/>
          </>
        ) : compact ? (
          <>
            <path d="M0,38 Q120,10 240,38 Q360,10 480,38 Q600,8 720,38 Q840,10 960,38 L1000,38 L1000,50 L0,50Z" fill="#3a7a30" opacity="0.55"/>
            <polygon points="52,38  61,10  70,38"  fill="#1e5c1e" opacity="0.65"/>
            <polygon points="68,38  77,6   86,38"  fill="#1e5c1e" opacity="0.65"/>
            <polygon points="510,38 519,12 528,38" fill="#1e5c1e" opacity="0.6"/>
            <polygon points="720,38 730,14 740,38" fill="#1e5c1e" opacity="0.55"/>
            <polygon points="900,38 910,10 920,38" fill="#1e5c1e" opacity="0.6"/>
          </>
        ) : (
          <>
            <path d="M0,70 Q150,20 300,70 Q450,15 600,70 Q750,18 900,70 L1000,70 L1000,80 L0,80Z" fill="#3a7a30" opacity="0.55"/>
            <path d="M0,70 Q200,35 400,70 Q600,28 800,70 Q900,35 1000,70 L1000,80 L0,80Z" fill="#4a8a40" opacity="0.4"/>
            <rect x="310" y="10" width="24" height="60" fill="#2c2c4a" opacity="0.45"/>
            <rect x="340" y="22" width="30" height="48" fill="#3a3a5c" opacity="0.4"/>
            <rect x="376" y="5"  width="20" height="65" fill="#2c2c4a" opacity="0.45"/>
            <polygon points="60,70  73,28  86,70"  fill="#1e5c1e" opacity="0.65"/>
            <polygon points="80,70  93,18  106,70" fill="#1e5c1e" opacity="0.65"/>
            <polygon points="520,70 533,24 546,70" fill="#1e5c1e" opacity="0.6"/>
            <polygon points="540,70 553,15 566,70" fill="#1e5c1e" opacity="0.6"/>
            <polygon points="730,70 743,22 756,70" fill="#1e5c1e" opacity="0.55"/>
            <polygon points="910,70 923,18 936,70" fill="#1e5c1e" opacity="0.6"/>
          </>
        )}
      </svg>

      {/* Road */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: roadH, backgroundColor: '#2a2a2a' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.45)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.15)' }} />
        <div style={{ position: 'absolute', top: 6, left: 14, bottom: 6, width: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
        <div style={{ position: 'absolute', top: 6, right: 14, bottom: 6, width: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
        {/* Animated centre dashes */}
        <div style={{ position: 'absolute', top: '46%', left: 0, right: 0, height: fullPanel ? 6 : 4, overflow: 'hidden' }}>
          <div style={{ display: 'flex', animation: '_dashL 0.48s linear infinite', width: 'calc(100% + 70px)' }}>
            {Array.from({ length: 50 }).map((_, i) => (
              <div key={i} style={{ flexShrink: 0, width: 38, height: fullPanel ? 6 : 4, marginRight: 22, background: '#FFD700', borderRadius: 2, opacity: 0.72 }} />
            ))}
          </div>
        </div>
      </div>

      {/* Animated bus */}
      <div style={{ position: 'absolute', bottom: busBottom, animation: `_bRoll ${bDur} linear infinite` }}>
        <div style={{ animation: `_bFloat ${fDur} ease-in-out infinite` }}>
          {/* Exhaust puffs */}
          <div style={{ position: 'absolute', left: 4, top: '28%' }}>
            <div style={{ position: 'absolute', width: 9, height: 9, borderRadius: '50%', background: 'rgba(160,160,160,0.55)', animation: '_pufA 1.6s ease-out infinite' }} />
            <div style={{ position: 'absolute', width: 7, height: 7, borderRadius: '50%', background: 'rgba(150,150,150,0.45)', animation: '_pufB 1.6s ease-out infinite', animationDelay: '0.55s' }} />
          </div>
          <BusSVG w={bW} h={bH} />
        </div>
      </div>
    </div>
  );
}
