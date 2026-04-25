// Monochrome line-art illustrations for the landing page.
// All use #111 stroke on #FFF (or transparent). 1.5-2px strokes, no fills except #111.

interface Props { size?: number | string; className?: string }

/**
 * Hero comic: a stressed designer at desk surrounded by floating papers/arrows/chat bubbles.
 */
export function HeroComic({ size = 220, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      fill="none"
      stroke="#111"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Desk */}
      <line x1="30" y1="170" x2="190" y2="170" />
      {/* Monitor */}
      <rect x="75" y="105" width="70" height="45" />
      <line x1="110" y1="150" x2="110" y2="162" />
      <line x1="100" y1="170" x2="120" y2="170" />
      {/* Designer — head + body behind the desk */}
      <circle cx="110" cy="85" r="14" />
      {/* Sweat drops */}
      <path d="M98 78 L95 72 L101 72 Z" fill="#111" stroke="none" />
      <path d="M122 80 L125 74 L119 74 Z" fill="#111" stroke="none" />
      {/* Worried eyes */}
      <circle cx="106" cy="85" r="1.5" fill="#111" stroke="none" />
      <circle cx="114" cy="85" r="1.5" fill="#111" stroke="none" />
      {/* Mouth — upside frown */}
      <path d="M104 93 Q110 89 116 93" />
      {/* Shoulders */}
      <path d="M92 100 Q110 96 128 100 L128 105 L92 105 Z" />
      {/* Hair — hand through hair */}
      <path d="M118 78 Q125 70 123 60 L130 62" />
      {/* Floating chaos — papers/bubbles around head */}
      {/* Papers top-left */}
      <rect x="20" y="28" width="30" height="22" transform="rotate(-12 35 39)" />
      <line x1="24" y1="36" x2="46" y2="36" transform="rotate(-12 35 39)" />
      <line x1="24" y1="42" x2="42" y2="42" transform="rotate(-12 35 39)" />
      {/* Chat bubble top-center */}
      <path d="M100 18 H130 V34 H118 L114 40 L114 34 H100 Z" />
      <circle cx="108" cy="26" r="1.5" fill="#111" stroke="none" />
      <circle cx="115" cy="26" r="1.5" fill="#111" stroke="none" />
      <circle cx="122" cy="26" r="1.5" fill="#111" stroke="none" />
      {/* Chat bubble top-right */}
      <path d="M160 40 H188 V56 H176 L172 62 L172 56 H160 Z" />
      {/* Envelope right */}
      <rect x="172" y="85" width="26" height="18" transform="rotate(15 185 94)" />
      <path d="M172 85 L185 96 L198 85" transform="rotate(15 185 94)" />
      {/* Clock left */}
      <circle cx="30" cy="95" r="12" />
      <line x1="30" y1="95" x2="30" y2="88" />
      <line x1="30" y1="95" x2="36" y2="98" />
      {/* Exclamation left bottom */}
      <line x1="42" y1="140" x2="42" y2="152" />
      <circle cx="42" cy="158" r="1.5" fill="#111" stroke="none" />
      {/* Exclamation right */}
      <line x1="180" y1="130" x2="180" y2="142" />
      <circle cx="180" cy="148" r="1.5" fill="#111" stroke="none" />
      {/* Arrow loops — chaos */}
      <path d="M55 60 Q75 45 95 55" />
      <path d="M95 55 L92 51 M95 55 L92 59" />
      <path d="M160 70 Q145 50 130 60" />
      <path d="M130 60 L133 56 M130 60 L133 64" />
    </svg>
  );
}

/**
 * Before: 5 chaotic papers stacked messily.
 */
export function BeforeFiles({ size = 140, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none" stroke="#111"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      {/* Scattered paper stack */}
      <rect x="30" y="22" width="70" height="52" transform="rotate(-10 65 48)" />
      <rect x="38" y="38" width="70" height="52" transform="rotate(6 73 64)" />
      <rect x="26" y="58" width="70" height="52" transform="rotate(-4 61 84)" />
      <rect x="44" y="72" width="70" height="52" transform="rotate(14 79 98)" />
      {/* Text lines on top paper */}
      <line x1="52" y1="82" x2="92" y2="92" />
      <line x1="50" y1="90" x2="86" y2="100" />
      <line x1="48" y1="98" x2="80" y2="108" />
      {/* Question marks floating */}
      <text x="12" y="32" fontFamily="var(--af-font-display)" fontSize="18" fontWeight="900" fill="#111" stroke="none">?</text>
      <text x="118" y="48" fontFamily="var(--af-font-display)" fontSize="18" fontWeight="900" fill="#111" stroke="none">?</text>
      <text x="112" y="124" fontFamily="var(--af-font-display)" fontSize="18" fontWeight="900" fill="#111" stroke="none">?</text>
    </svg>
  );
}

/**
 * After: single clean folder/document with checkmark.
 */
export function AfterFiles({ size = 140, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none" stroke="#111"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      {/* Folder */}
      <path d="M20 40 H55 L62 32 H120 V110 H20 Z" />
      {/* Tabs inside */}
      <line x1="32" y1="58" x2="108" y2="58" />
      <line x1="32" y1="72" x2="108" y2="72" />
      <line x1="32" y1="86" x2="108" y2="86" />
      {/* Checkmark circle */}
      <circle cx="105" cy="95" r="14" fill="#111" />
      <path d="M99 95 L104 100 L112 91" stroke="#fff" strokeWidth="2.2" />
    </svg>
  );
}

/**
 * Before: 4 different messenger icons scattered with chaos lines.
 */
export function BeforeChats({ size = 140, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none" stroke="#111"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      {/* 4 chat bubbles in corners */}
      <path d="M8 20 H42 V40 H22 L18 46 L18 40 H8 Z" />
      <path d="M98 14 H132 V34 H116 L112 40 L112 34 H98 Z" />
      <path d="M12 88 H46 V108 H30 L26 114 L26 108 H12 Z" />
      <path d="M92 94 H128 V114 H110 L106 120 L106 114 H92 Z" />
      {/* Confused tangle lines between them */}
      <path d="M40 32 Q70 58 102 28" strokeDasharray="3 3" />
      <path d="M28 100 Q55 65 110 104" strokeDasharray="3 3" />
      <path d="M44 38 Q75 68 94 104" strokeDasharray="3 3" />
      {/* Center question mark */}
      <text x="60" y="78" fontFamily="var(--af-font-display)" fontSize="28" fontWeight="900" fill="#111" stroke="none">?</text>
    </svg>
  );
}

/**
 * After: one single chat window.
 */
export function AfterChats({ size = 140, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none" stroke="#111"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      {/* Single window */}
      <rect x="18" y="24" width="104" height="92" />
      <line x1="18" y1="42" x2="122" y2="42" />
      {/* Messages — alternating */}
      <rect x="28" y="54" width="50" height="12" />
      <rect x="62" y="72" width="50" height="12" />
      <rect x="28" y="90" width="42" height="12" />
      {/* Search icon in top right */}
      <circle cx="108" cy="33" r="4" />
      <line x1="111" y1="36" x2="115" y2="40" />
    </svg>
  );
}

/**
 * Before: paper document with pen, signature line, "scan → post" arrow loop.
 */
export function BeforeSign({ size = 140, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none" stroke="#111"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      {/* Paper */}
      <rect x="30" y="24" width="66" height="86" />
      <line x1="40" y1="40" x2="86" y2="40" />
      <line x1="40" y1="50" x2="86" y2="50" />
      <line x1="40" y1="60" x2="76" y2="60" />
      {/* Signature line */}
      <line x1="40" y1="88" x2="86" y2="88" />
      <path d="M42 84 Q50 78 58 84 Q66 90 74 82" />
      {/* Pen */}
      <path d="M98 70 L118 50 L124 56 L104 76 Z" />
      <path d="M100 74 L108 82" />
      {/* Loop arrow around */}
      <path d="M22 44 Q8 72 22 100 L28 94 M22 100 L16 94" strokeDasharray="3 3" />
    </svg>
  );
}

/**
 * After: phone with SMS code → checkmark.
 */
export function AfterSign({ size = 140, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none" stroke="#111"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      {/* Phone */}
      <rect x="44" y="18" width="52" height="100" rx="6" />
      <line x1="64" y1="26" x2="76" y2="26" />
      {/* SMS bubble */}
      <rect x="50" y="40" width="40" height="18" />
      <text x="55" y="54" fontFamily="var(--af-font-mono)" fontSize="9" fontWeight="700" fill="#111" stroke="none">1 2 3 4</text>
      {/* Check */}
      <circle cx="70" cy="84" r="14" fill="#111" />
      <path d="M64 84 L69 89 L77 80" stroke="#fff" strokeWidth="2.2" />
      {/* Home indicator */}
      <line x1="62" y1="110" x2="78" y2="110" />
    </svg>
  );
}

/**
 * Before: calendar with X / missed date, clock emergency.
 */
export function BeforeSchedule({ size = 140, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none" stroke="#111"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      {/* Calendar */}
      <rect x="22" y="30" width="76" height="64" />
      <line x1="22" y1="46" x2="98" y2="46" />
      <line x1="33" y1="26" x2="33" y2="34" />
      <line x1="87" y1="26" x2="87" y2="34" />
      {/* Grid */}
      <line x1="41" y1="46" x2="41" y2="94" />
      <line x1="60" y1="46" x2="60" y2="94" />
      <line x1="79" y1="46" x2="79" y2="94" />
      <line x1="22" y1="62" x2="98" y2="62" />
      <line x1="22" y1="78" x2="98" y2="78" />
      {/* Big X on a cell — missed */}
      <line x1="63" y1="65" x2="76" y2="75" />
      <line x1="76" y1="65" x2="63" y2="75" />
      {/* Clock — alarm */}
      <circle cx="110" cy="92" r="16" />
      <line x1="110" y1="92" x2="110" y2="82" />
      <line x1="110" y1="92" x2="118" y2="95" />
      <path d="M100 78 L104 74 M120 78 L116 74" />
      {/* Exclamation */}
      <line x1="50" y1="110" x2="50" y2="124" />
      <circle cx="50" cy="130" r="1.5" fill="#111" stroke="none" />
    </svg>
  );
}

/**
 * After: calendar with bell and neat visit plashka.
 */
export function AfterSchedule({ size = 140, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none" stroke="#111"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      {/* Calendar */}
      <rect x="18" y="28" width="104" height="84" />
      <line x1="18" y1="46" x2="122" y2="46" />
      <line x1="38" y1="24" x2="38" y2="32" />
      <line x1="102" y1="24" x2="102" y2="32" />
      {/* Grid */}
      <line x1="44" y1="46" x2="44" y2="112" />
      <line x1="70" y1="46" x2="70" y2="112" />
      <line x1="96" y1="46" x2="96" y2="112" />
      <line x1="18" y1="68" x2="122" y2="68" />
      <line x1="18" y1="90" x2="122" y2="90" />
      {/* Visit plashka */}
      <rect x="48" y="72" width="18" height="10" fill="#111" />
      <rect x="74" y="94" width="18" height="10" fill="#111" />
      {/* Bell icon */}
      <path d="M104 20 L104 14 M100 14 H108" />
      <path d="M96 22 Q104 18 112 22 Q112 30 114 34 H94 Q96 30 96 22 Z" />
      <circle cx="104" cy="37" r="2" />
    </svg>
  );
}

/**
 * Client cabinet illustration — for module 04 mockup replacement.
 * Designer + Client with document in the middle.
 */
export function ClientCabinetArt({ className }: Props) {
  return (
    <svg viewBox="0 0 400 300" fill="none" stroke="#111" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ width: "100%", height: "100%", display: "block" }} aria-hidden="true">
      {/* Document in center */}
      <rect x="150" y="90" width="100" height="130" fill="#fff" />
      <line x1="165" y1="110" x2="235" y2="110" />
      <line x1="165" y1="125" x2="235" y2="125" />
      <line x1="165" y1="140" x2="235" y2="140" />
      <line x1="165" y1="155" x2="215" y2="155" />
      {/* Signature line */}
      <line x1="165" y1="185" x2="220" y2="185" />
      <path d="M168 182 Q175 175 183 182 Q191 189 200 180" />
      {/* Stamp */}
      <circle cx="220" cy="200" r="10" fill="#111" />
      <path d="M215 200 L219 204 L225 196" stroke="#fff" strokeWidth="2" />

      {/* Designer — left */}
      <circle cx="65" cy="110" r="22" />
      <circle cx="59" cy="108" r="1.8" fill="#111" stroke="none" />
      <circle cx="71" cy="108" r="1.8" fill="#111" stroke="none" />
      <path d="M57 118 Q65 122 73 118" />
      <path d="M45 138 Q65 130 85 138 L85 220 L45 220 Z" />
      {/* Designer arm pointing */}
      <line x1="85" y1="155" x2="140" y2="150" />

      {/* Client — right */}
      <circle cx="335" cy="110" r="22" />
      <circle cx="329" cy="108" r="1.8" fill="#111" stroke="none" />
      <circle cx="341" cy="108" r="1.8" fill="#111" stroke="none" />
      <path d="M327 116 Q335 120 343 116" />
      <path d="M315 138 Q335 130 355 138 L355 220 L315 220 Z" />
      {/* Client arm pointing */}
      <line x1="315" y1="155" x2="260" y2="150" />

      {/* Labels */}
      <text x="65" y="250" fontFamily="var(--af-font-mono)" fontSize="9"
        fontWeight="700" letterSpacing="1.5" textAnchor="middle" fill="#111" stroke="none">
        ДИЗАЙНЕР
      </text>
      <text x="335" y="250" fontFamily="var(--af-font-mono)" fontSize="9"
        fontWeight="700" letterSpacing="1.5" textAnchor="middle" fill="#111" stroke="none">
        ЗАКАЗЧИК
      </text>
      <text x="200" y="250" fontFamily="var(--af-font-mono)" fontSize="9"
        fontWeight="700" letterSpacing="1.5" textAnchor="middle" fill="#111" stroke="none">
        АКТ · ПОДПИСАН
      </text>
    </svg>
  );
}
