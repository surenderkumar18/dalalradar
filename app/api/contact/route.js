// app/api/contact/route.js
//
// 🎯 CONTACT FORM API
//
// Receives POST submissions from dalalradar.com/contact.html (different
// subdomain), validates them, and sends an email via Resend.
//
// Security layers:
//   1. CORS — only dalalradar.com (and app.dalalradar.com, localhost for dev)
//   2. Honeypot field — bots fill it, humans don't
//   3. Required field check
//   4. Email format validation
//   5. Length limits (no novel-length spam)
//   6. In-memory rate limit (5 submissions per IP per hour)
//   7. Resend API for delivery

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── CORS CONFIG ─────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://dalalradar.com",
  "https://www.dalalradar.com",
  "https://app.dalalradar.com",
  "http://localhost:8000", // for python -m http.server dev testing
  "http://127.0.0.1:8000",
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : "https://dalalradar.com";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

// ─── SIMPLE IN-MEMORY RATE LIMIT ─────────────────────────────────────
// Wipes on every cold start (fine for low-volume contact form).
// 5 submissions per IP per hour.
const rateBuckets = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || [];
  const recent = bucket.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  rateBuckets.set(ip, recent);
  return false;
}

// ─── HANDLE PREFLIGHT (OPTIONS) ──────────────────────────────────────
export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

// ─── HANDLE POST ─────────────────────────────────────────────────────
export async function POST(req) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    // ─── Parse body ─────────────────────────────────────────────────
    const body = await req.json();
    const { name, email, topic, message, _gotcha } = body;

    // ─── 1. Honeypot check (silent reject if bot filled it) ─────────
    if (_gotcha && _gotcha.length > 0) {
      // Pretend success — bots shouldn't know they were caught
      return Response.json({ success: true }, { status: 200, headers });
    }

    // ─── 2. Required field check ────────────────────────────────────
    if (!name || !email || !topic || !message) {
      return Response.json(
        { success: false, error: "All fields are required" },
        { status: 400, headers },
      );
    }

    // ─── 3. Length limits ────────────────────────────────────────────
    if (
      name.length > 100 ||
      email.length > 200 ||
      topic.length > 100 ||
      message.length > 5000
    ) {
      return Response.json(
        { success: false, error: "Input too long" },
        { status: 400, headers },
      );
    }

    // ─── 4. Basic email format check ────────────────────────────────
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      return Response.json(
        { success: false, error: "Invalid email format" },
        { status: 400, headers },
      );
    }

    // ─── 5. Rate limit by IP ────────────────────────────────────────
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    if (isRateLimited(ip)) {
      return Response.json(
        { success: false, error: "Too many submissions. Try again later." },
        { status: 429, headers },
      );
    }

    // ─── 6. Sanitize (escape HTML chars to prevent injection in email) ──
    const esc = (s) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const safeName = esc(name);
    const safeEmail = esc(email);
    const safeTopic = esc(topic);
    const safeMessage = esc(message).replace(/\n/g, "<br>");

    // ─── 7. Send the email via Resend ───────────────────────────────
    const { data, error } = await resend.emails.send({
      // ⚠️ "onboarding@resend.dev" works without DNS setup for sending.
      // Once you verify a custom domain in Resend, change to:
      //   from: "DalalRadar <contact@dalalradar.com>",
      from: "DalalRadar Contact <onboarding@resend.dev>",
      to: ["dalalradar@gmail.com"],
      reply_to: email, // ← so you can hit Reply and respond to the sender
      subject: `[DalalRadar] ${topic} — ${name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b1220; color: #e8e8ed; padding: 32px; border-radius: 8px;">
          <h2 style="color: #00ffa2; font-family: Georgia, serif; margin-top: 0;">New contact form submission</h2>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 12px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; width: 100px;">Name</td>
              <td style="padding: 8px 12px; color: #e8e8ed; font-weight: 600;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Email</td>
              <td style="padding: 8px 12px;"><a href="mailto:${safeEmail}" style="color: #00ffa2;">${safeEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Topic</td>
              <td style="padding: 8px 12px; color: #facc15; font-weight: 600;">${safeTopic}</td>
            </tr>
          </table>

          <div style="margin: 24px 0; padding: 20px; background: #0f172a; border-left: 3px solid #00ffa2; border-radius: 4px;">
            <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">Message</div>
            <div style="color: #e8e8ed; line-height: 1.6;">${safeMessage}</div>
          </div>

          <hr style="border: none; border-top: 1px solid #1e2a44; margin: 24px 0;">
          <p style="color: #64748b; font-size: 11px; line-height: 1.5;">
            Submitted from <strong style="color: #94a3b8;">dalalradar.com/contact.html</strong><br>
            IP: ${esc(ip)} · ${new Date().toISOString()}
          </p>
        </div>
      `,
      // Plain text fallback for email clients that don't render HTML
      text: `New contact form submission

Name: ${name}
Email: ${email}
Topic: ${topic}

Message:
${message}

---
Submitted from dalalradar.com/contact.html
IP: ${ip}
${new Date().toISOString()}
`,
    });

    if (error) {
      console.error("Resend error:", error);
      return Response.json(
        { success: false, error: "Email delivery failed" },
        { status: 500, headers },
      );
    }

    // ─── Success ─────────────────────────────────────────────────────
    return Response.json({ success: true, id: data?.id }, { status: 200, headers });
  } catch (err) {
    console.error("Contact API error:", err);
    return Response.json(
      { success: false, error: "Server error" },
      { status: 500, headers },
    );
  }
}