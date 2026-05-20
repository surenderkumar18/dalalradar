"use client";

// components/ToolCard.js
//
// 🎴 TOOL CARD — single tool tile on the dashboard.
//
// Takes a tool object from lib/tools.js and renders it as a clickable card.
// Different visual state for "live" vs "soon" tools.

import Link from "next/link";
import { STATUS_CONFIG } from "@/lib/tools";

// ─── ICON COMPONENTS ──────────────────────────────────────────────────
// Custom SVG icons that match the brand. Each is 48x48 and uses
// the tool's accent color (passed via CSS variable).
const Icons = {
  bubble: (color) => (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <circle cx="14" cy="40" r="4" fill={color} opacity="0.5" />
      <circle cx="22" cy="32" r="5" fill={color} opacity="0.7" />
      <circle cx="32" cy="24" r="6" fill={color} opacity="0.85" />
      <circle cx="42" cy="14" r="7" fill={color} />
      <circle
        cx="42"
        cy="14"
        r="11"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.4"
      />
    </svg>
  ),
  rollover: (color) => (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <path
        d="M14 28 A14 14 0 0 1 42 28"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M42 28 A14 14 0 0 1 14 28"
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M38 22 L42 28 L48 24"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M18 34 L14 28 L8 32"
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.4"
      />
    </svg>
  ),
  heatmap: (color) => (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="8" y="8" width="10" height="10" fill={color} opacity="0.9" />
      <rect x="20" y="8" width="10" height="10" fill={color} opacity="0.6" />
      <rect x="32" y="8" width="10" height="10" fill={color} opacity="0.3" />
      <rect x="44" y="8" width="4" height="10" fill={color} opacity="0.2" />
      <rect x="8" y="20" width="10" height="10" fill={color} opacity="0.7" />
      <rect x="20" y="20" width="10" height="10" fill={color} opacity="0.9" />
      <rect x="32" y="20" width="10" height="10" fill={color} opacity="0.5" />
      <rect x="44" y="20" width="4" height="10" fill={color} opacity="0.3" />
      <rect x="8" y="32" width="10" height="10" fill={color} opacity="0.4" />
      <rect x="20" y="32" width="10" height="10" fill={color} opacity="0.6" />
      <rect x="32" y="32" width="10" height="10" fill={color} opacity="0.8" />
      <rect x="44" y="32" width="4" height="10" fill={color} opacity="0.5" />
    </svg>
  ),
  learn: (color) => (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <path
        d="M10 14 L46 14 L46 42 L28 46 L10 42 Z"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.5"
      />
      <path d="M28 14 L28 46" stroke={color} strokeWidth="1.5" opacity="0.5" />
      <path
        d="M14 22 L24 22"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 28 L24 28"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 34 L20 34"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M32 22 L42 22"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M32 28 L42 28"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M32 34 L38 34"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export default function ToolCard({ tool }) {
  const status = STATUS_CONFIG[tool.status];
  const isLive = tool.status === "live" || tool.status === "beta";
  const Icon = Icons[tool.icon] || Icons.bubble;

  // Card content (same JSX, different wrapper)
  const cardInner = (
    <div className="tool-card-inner">
      {/* Status badge - top right */}
      <div className="tool-card-status">
        <span
          className="tool-card-badge"
          style={{
            color: status.color,
            background: status.bg,
            border: `1px solid ${status.color}40`,
          }}
        >
          ● {status.label}
        </span>
      </div>

      {/* Icon */}
      <div className="tool-card-icon">{Icon(tool.accent)}</div>

      {/* Title + tagline */}
      <div className="tool-card-header">
        <h3 className="tool-card-title">{tool.name}</h3>
        <div className="tool-card-tagline" style={{ color: tool.accent }}>
          {tool.tagline}
        </div>
      </div>

      {/* Description */}
      <p className="tool-card-desc">{tool.description}</p>

      {/* Feature list (3-4 bullets) */}
      <ul className="tool-card-features">
        {tool.features.slice(0, 4).map((f, i) => (
          <li key={i}>
            <span
              className="tool-card-bullet"
              style={{ color: tool.accent }}
            >
              ›
            </span>
            {f}
          </li>
        ))}
      </ul>

      {/* Footer CTA */}
      <div className="tool-card-footer">
        {isLive ? (
          <span className="tool-card-cta" style={{ color: tool.accent }}>
            Open <span className="tool-card-arrow">→</span>
          </span>
        ) : (
          <span className="tool-card-cta-soon">
            Coming soon · <span style={{ color: tool.accent }}>Notify me</span>
          </span>
        )}
      </div>
    </div>
  );

  // Live tools wrap in Link, soon tools are non-interactive divs
  return isLive ? (
    <Link href={tool.href} className="tool-card tool-card-live">
      {cardInner}
    </Link>
  ) : (
    <div
      className="tool-card tool-card-soon"
      onClick={() => {
        // TODO: hook up to email capture later
        alert(
          `${tool.name} is coming soon. We'll notify you when it's live!`,
        );
      }}
    >
      {cardInner}
    </div>
  );
}