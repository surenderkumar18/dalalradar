// components/ToolIcon.js
//
// 🎨 TOOL ICONS — one SVG per tool, drawn to match DalalRadar's visual language.
//
// All icons are 56×56, use currentColor where appropriate so the accent
// color from tools.js drives the tint. Each icon is hand-drawn (not Lucide)
// so they feel native to the brand instead of looking like a generic icon
// pack.
//
// Usage:
//   <ToolIcon name="bubble" accent="var(--green)" />
//
// Add a new tool icon by adding a case to the switch below.

export default function ToolIcon({ name, accent = "var(--green)", size = 56 }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 56 56",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    style: { color: accent },
  };

  switch (name) {
    /* ─── SMART MONEY RADAR — ascending bubbles (existing) ─── */
    case "bubble":
      return (
        <svg {...props}>
          <circle cx="10" cy="42" r="4" fill="currentColor" opacity="0.4" />
          <circle cx="22" cy="34" r="5" fill="currentColor" opacity="0.6" />
          <circle cx="34" cy="24" r="6.5" fill="currentColor" opacity="0.8" />
          <circle cx="46" cy="12" r="8" fill="currentColor" />
        </svg>
      );

    /* ─── SMART MONEY SECTOR RIVER — flowing ribbon streams ─── */
    case "river":
      return (
        <svg {...props}>
          <path
            d="M4 16 Q 16 8, 28 20 T 52 16"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.4"
            fill="none"
          />
          <path
            d="M4 28 Q 18 36, 30 26 T 52 32"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.7"
            fill="none"
          />
          <path
            d="M4 42 Q 14 48, 28 40 T 52 44"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* flow arrowheads */}
          <path
            d="M48 14 L 52 16 L 48 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
            fill="none"
          />
          <path
            d="M48 30 L 52 32 L 48 34"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
            fill="none"
          />
          <path
            d="M48 42 L 52 44 L 48 46"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );

    /* ─── MARKET ALPHA — relative strength chart with α mark ─── */
    case "alpha":
      return (
        <svg {...props}>
          {/* baseline (NIFTY 100) */}
          <line
            x1="4"
            y1="34"
            x2="52"
            y2="34"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.35"
          />
          {/* leader line — climbing */}
          <path
            d="M4 38 L 14 32 L 24 24 L 34 18 L 44 12 L 52 8"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* laggard line — dropping */}
          <path
            d="M4 30 L 14 36 L 24 42 L 34 46 L 44 48 L 52 50"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
            fill="none"
          />
          {/* endpoint dots */}
          <circle cx="52" cy="8" r="2.5" fill="currentColor" />
          <circle cx="52" cy="50" r="2" fill="currentColor" opacity="0.4" />
        </svg>
      );

    /* ─── ADVANCED HEATMAP — 3×3 cell grid (existing style) ─── */
    case "heatmap":
      return (
        <svg {...props}>
          {/* row 1 */}
          <rect x="6" y="6" width="12" height="12" fill="currentColor" opacity="0.35" />
          <rect x="22" y="6" width="12" height="12" fill="currentColor" opacity="0.55" />
          <rect x="38" y="6" width="12" height="12" fill="currentColor" />
          {/* row 2 */}
          <rect x="6" y="22" width="12" height="12" fill="currentColor" opacity="0.75" />
          <rect x="22" y="22" width="12" height="12" fill="currentColor" opacity="0.35" />
          <rect x="38" y="22" width="12" height="12" fill="currentColor" opacity="0.55" />
          {/* row 3 */}
          <rect x="6" y="38" width="12" height="12" fill="currentColor" opacity="0.55" />
          <rect x="22" y="38" width="12" height="12" fill="currentColor" />
          <rect x="38" y="38" width="12" height="12" fill="currentColor" opacity="0.35" />
        </svg>
      );

    /* ─── ROLLOVER (legacy, kept in case referenced) ─── */
    case "rollover":
      return (
        <svg {...props}>
          <path
            d="M14 28 A 14 14 0 1 1 42 28"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M38 22 L 42 28 L 48 24"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="28" cy="36" r="3" fill="currentColor" />
        </svg>
      );

    /* ─── LEARN — open book ─── */
    case "learn":
      return (
        <svg {...props}>
          <path
            d="M6 14 L 26 18 L 26 46 L 6 42 Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            fill="none"
            opacity="0.85"
          />
          <path
            d="M50 14 L 30 18 L 30 46 L 50 42 Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            fill="none"
            opacity="0.85"
          />
          {/* page lines */}
          <line x1="10" y1="22" x2="22" y2="24.4" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <line x1="10" y1="28" x2="22" y2="30.4" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <line x1="34" y1="24.4" x2="46" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <line x1="34" y1="30.4" x2="46" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        </svg>
      );

    /* ─── FILTER (dev) ─── */
    case "filter":
      return (
        <svg {...props}>
          <path
            d="M8 12 L 48 12 L 34 30 L 34 46 L 22 42 L 22 30 Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );

    default:
      // Fallback dot if icon name is unknown
      return (
        <svg {...props}>
          <circle cx="28" cy="28" r="10" fill="currentColor" opacity="0.4" />
        </svg>
      );
  }
}