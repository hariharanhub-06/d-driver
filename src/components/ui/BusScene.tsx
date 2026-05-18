'use client';

interface BusSceneProps {
  compact?: boolean;
  className?: string;
}

const CSS = `
@keyframes _bRoll {
  0%   { left: -22%; }
  100% { left: 112%; }
}
@keyframes _bFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-5px); }
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
`;

export default function BusScene({ compact = false, className = '' }: BusSceneProps) {
  const h     = compact ? 186 : 300;
  const roadH = compact ? 58  : 88;
  const skyH  = h - roadH;
  const bW    = compact ? 108 : 168;
  const bH    = compact ? 42  : 65;
  const bDur  = compact ? '7s' : '11s';
  const fDur  = compact ? '0.85s' : '1s';
  const busBottom = roadH * 0.46;

  return (
    <div
      className={`relative overflow-hidden pointer-events-none select-none ${className}`}
      style={{ height: h }}
      aria-hidden="true"
    >
      <style>{CSS}</style>

      {/* Sky gradient */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, #4BA3C7 0%, #87CEEB 35%, #B8E4F0 65%, #C8E9C1 100%)' }}
      />

      {/* Clouds – wide SVG scrolling continuously */}
      <svg
        className="absolute top-0 left-0"
        style={{ width: '250%', height: skyH }}
        viewBox={`0 0 2000 ${skyH}`}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMinYMid"
      >
        <g style={{ animation: `_cldA 26s linear infinite` }}>
          {/* Cloud 1 */}
          <ellipse cx="180"  cy="42"  rx="58" ry="22" fill="white" opacity="0.92"/>
          <ellipse cx="145"  cy="55"  rx="38" ry="16" fill="white" opacity="0.92"/>
          <ellipse cx="222"  cy="53"  rx="34" ry="14" fill="white" opacity="0.92"/>
          {/* Cloud 2 */}
          <ellipse cx="680"  cy="32"  rx="48" ry="19" fill="white" opacity="0.78"/>
          <ellipse cx="645"  cy="43"  rx="30" ry="13" fill="white" opacity="0.78"/>
          <ellipse cx="718"  cy="41"  rx="28" ry="11" fill="white" opacity="0.78"/>
          {/* Cloud 3 */}
          <ellipse cx="1180" cy="38"  rx="52" ry="20" fill="white" opacity="0.82"/>
          <ellipse cx="1144" cy="50"  rx="33" ry="14" fill="white" opacity="0.82"/>
          <ellipse cx="1218" cy="48"  rx="30" ry="12" fill="white" opacity="0.82"/>
          {/* Cloud 4 */}
          <ellipse cx="1700" cy="28"  rx="44" ry="17" fill="white" opacity="0.7"/>
          <ellipse cx="1666" cy="38"  rx="28" ry="12" fill="white" opacity="0.7"/>
        </g>
        <g style={{ animation: `_cldB 38s linear infinite`, animationDelay: '-18s' }}>
          <ellipse cx="420"  cy="50"  rx="36" ry="14" fill="white" opacity="0.6"/>
          <ellipse cx="392"  cy="58"  rx="22" ry="10" fill="white" opacity="0.6"/>
          <ellipse cx="448"  cy="57"  rx="20" ry="9"  fill="white" opacity="0.6"/>
          <ellipse cx="1100" cy="44"  rx="42" ry="16" fill="white" opacity="0.65"/>
          <ellipse cx="1068" cy="54"  rx="27" ry="11" fill="white" opacity="0.65"/>
          <ellipse cx="1136" cy="52"  rx="25" ry="10" fill="white" opacity="0.65"/>
        </g>
      </svg>

      {/* Horizon – hills, trees, buildings */}
      <svg
        className="absolute left-0 right-0"
        style={{ bottom: roadH - 4, width: '100%' }}
        viewBox={`0 0 1000 ${compact ? 38 : 70}`}
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Rolling hills */}
        <path d={compact
          ? 'M0,38 Q120,10 240,38 Q360,10 480,38 Q600,8 720,38 Q840,10 960,38 L1000,38 L1000,50 L0,50Z'
          : 'M0,70 Q150,20 300,70 Q450,15 600,70 Q750,18 900,70 L1000,70 L1000,80 L0,80Z'
        } fill="#3a7a30" opacity="0.55"/>
        <path d={compact
          ? 'M0,38 Q180,18 360,38 Q540,15 720,38 Q860,18 1000,38 L1000,50 L0,50Z'
          : 'M0,70 Q200,35 400,70 Q600,28 800,70 Q900,35 1000,70 L1000,80 L0,80Z'
        } fill="#4a8a40" opacity="0.4"/>

        {!compact && (
          <>
            {/* Silhouette buildings */}
            <rect x="310" y="12" width="24" height="58" fill="#2c2c4a" opacity="0.45"/>
            <rect x="340" y="22" width="30" height="48" fill="#3a3a5c" opacity="0.4"/>
            <rect x="376" y="8"  width="20" height="62" fill="#2c2c4a" opacity="0.45"/>
            {/* Windows on buildings */}
            <rect x="316" y="20" width="5" height="5" fill="#FFD700" opacity="0.4"/>
            <rect x="323" y="20" width="5" height="5" fill="#FFD700" opacity="0.3"/>
            <rect x="316" y="30" width="5" height="5" fill="#FFD700" opacity="0.35"/>
            <rect x="346" y="28" width="5" height="5" fill="#87CEEB" opacity="0.35"/>
            <rect x="354" y="28" width="5" height="5" fill="#87CEEB" opacity="0.3"/>
            <rect x="381" y="18" width="4" height="4" fill="#FFD700" opacity="0.4"/>
            <rect x="381" y="28" width="4" height="4" fill="#FFD700" opacity="0.35"/>
          </>
        )}

        {/* Trees */}
        {compact ? (
          <>
            <polygon points="52,38  61,10  70,38"  fill="#1e5c1e" opacity="0.65"/>
            <polygon points="68,38  77,6   86,38"  fill="#1e5c1e" opacity="0.65"/>
            <polygon points="510,38 519,12 528,38" fill="#1e5c1e" opacity="0.6"/>
            <polygon points="526,38 535,8  544,38" fill="#1e5c1e" opacity="0.6"/>
            <polygon points="720,38 730,14 740,38" fill="#1e5c1e" opacity="0.55"/>
            <polygon points="900,38 910,10 920,38" fill="#1e5c1e" opacity="0.6"/>
          </>
        ) : (
          <>
            <polygon points="60,70  73,28  86,70"  fill="#1e5c1e" opacity="0.65"/>
            <polygon points="80,70  93,18  106,70" fill="#1e5c1e" opacity="0.65"/>
            <polygon points="110,70 120,35 130,70" fill="#266b26" opacity="0.5"/>
            <polygon points="520,70 533,24 546,70" fill="#1e5c1e" opacity="0.6"/>
            <polygon points="540,70 553,15 566,70" fill="#1e5c1e" opacity="0.6"/>
            <polygon points="730,70 743,22 756,70" fill="#1e5c1e" opacity="0.55"/>
            <polygon points="910,70 923,18 936,70" fill="#1e5c1e" opacity="0.6"/>
            <polygon points="935,70 946,28 957,70" fill="#1e5c1e" opacity="0.5"/>
          </>
        )}
      </svg>

      {/* Road */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: roadH, backgroundColor: '#2a2a2a' }}
      >
        {/* Top road edge highlight */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.45)' }} />
        {/* Bottom edge */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.15)' }} />
        {/* Left shoulder stripe */}
        <div style={{ position: 'absolute', top: 6, left: 14, bottom: 6, width: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
        {/* Right shoulder stripe */}
        <div style={{ position: 'absolute', top: 6, right: 14, bottom: 6, width: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />

        {/* Animated dashed centre line */}
        <div style={{ position: 'absolute', top: '46%', left: 0, right: 0, height: 4, overflow: 'hidden' }}>
          <div style={{ display: 'flex', animation: '_dashL 0.48s linear infinite', width: 'calc(100% + 70px)' }}>
            {Array.from({ length: 50 }).map((_, i) => (
              <div key={i} style={{ flexShrink: 0, width: 38, height: 4, marginRight: 22, background: '#FFD700', borderRadius: 2, opacity: 0.72 }} />
            ))}
          </div>
        </div>
      </div>

      {/* Animated bus */}
      <div style={{ position: 'absolute', bottom: busBottom, animation: `_bRoll ${bDur} linear infinite` }}>
        {/* Float wrapper */}
        <div style={{ animation: `_bFloat ${fDur} ease-in-out infinite` }}>
          {/* Exhaust puffs at the back (left side of SVG = back of bus, bus drives right) */}
          <div style={{ position: 'absolute', left: 4, top: '28%' }}>
            <div style={{ position: 'absolute', width: 9, height: 9, borderRadius: '50%', background: 'rgba(160,160,160,0.55)', animation: '_pufA 1.6s ease-out infinite' }} />
            <div style={{ position: 'absolute', width: 7, height: 7, borderRadius: '50%', background: 'rgba(150,150,150,0.45)', animation: '_pufB 1.6s ease-out infinite', animationDelay: '0.55s' }} />
          </div>

          {/* Bus SVG — front facing RIGHT, back on LEFT */}
          <svg viewBox="0 0 168 62" width={bW} height={bH} xmlns="http://www.w3.org/2000/svg">
            {/* Main body */}
            <rect x="4"   y="5"  width="156" height="38" rx="5"   fill="#FFD700"/>
            {/* Roof */}
            <rect x="8"   y="2"  width="148" height="14" rx="4"   fill="#FFC200"/>
            {/* Front hood (right side) */}
            <rect x="150" y="9"  width="12"  height="28" rx="3"   fill="#E8A000"/>
            {/* Safety stripe */}
            <rect x="4"   y="25" width="156" height="3"  fill="#111" opacity="0.28"/>
            {/* Windows (5 panes, back to front) */}
            <rect x="14"  y="8"  width="22"  height="14" rx="2"   fill="#B8D8F0" opacity="0.88"/>
            <rect x="41"  y="8"  width="22"  height="14" rx="2"   fill="#B8D8F0" opacity="0.88"/>
            <rect x="68"  y="8"  width="22"  height="14" rx="2"   fill="#B8D8F0" opacity="0.88"/>
            <rect x="95"  y="8"  width="22"  height="14" rx="2"   fill="#B8D8F0" opacity="0.88"/>
            <rect x="122" y="8"  width="20"  height="14" rx="2"   fill="#B8D8F0" opacity="0.88"/>
            {/* Window glare highlights */}
            <rect x="14"  y="8"  width="8"   height="4"  rx="1"   fill="white"   opacity="0.35"/>
            <rect x="41"  y="8"  width="8"   height="4"  rx="1"   fill="white"   opacity="0.35"/>
            <rect x="68"  y="8"  width="8"   height="4"  rx="1"   fill="white"   opacity="0.35"/>
            <rect x="95"  y="8"  width="8"   height="4"  rx="1"   fill="white"   opacity="0.35"/>
            <rect x="122" y="8"  width="7"   height="4"  rx="1"   fill="white"   opacity="0.35"/>
            {/* Emergency door (left = back) */}
            <rect x="4"   y="28" width="8"   height="14" rx="1"   fill="#FFB300" stroke="#333" strokeWidth="0.7"/>
            <circle cx="10" cy="35" r="1.3"  fill="#333" opacity="0.65"/>
            {/* Headlights (right = front) */}
            <rect x="158" y="14" width="7"   height="6"  rx="1.5" fill="#FFFDE7"/>
            <rect x="158" y="22" width="7"   height="4"  rx="1"   fill="#FFF9C4" opacity="0.75"/>
            {/* Front bumper */}
            <rect x="156" y="39" width="12"  height="5"  rx="2"   fill="#9E9E9E"/>
            {/* Rear bumper */}
            <rect x="0"   y="39" width="8"   height="5"  rx="2"   fill="#9E9E9E"/>
            {/* Exhaust pipe */}
            <rect x="0"   y="31" width="7"   height="3"  rx="1"   fill="#666"/>
            {/* Wheel wells */}
            <ellipse cx="38"  cy="43" rx="17" ry="9"  fill="#111"/>
            <ellipse cx="124" cy="43" rx="17" ry="9"  fill="#111"/>
            {/* Rear wheel */}
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
            {/* Front wheel */}
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
            {/* Side text */}
            <text x="32" y="37" fontSize="6.5" fontWeight="bold" fill="#555" opacity="0.55" fontFamily="Arial,sans-serif">D-DRIVER 365</text>
            <text x="16" y="21" fontSize="4"   fill="#333" opacity="0.4"  fontFamily="Arial,sans-serif">SCHOOL BUS</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
