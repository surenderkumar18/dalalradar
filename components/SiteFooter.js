// components/SiteFooter.js

export default function SiteFooter() {
  return (
    <>
      <footer className="site-footer">
        <div className="site-footer-inner">
          {/* Brand */}
          <div className="site-footer-col site-footer-col-brand">
            <div className="site-footer-brand">
              <svg viewBox="0 0 28 28" width="24" height="24">
                <circle
                  cx="14"
                  cy="14"
                  r="12"
                  fill="none"
                  stroke="#00ffa2"
                  strokeWidth="1.5"
                  opacity="0.5"
                />

                <circle
                  cx="14"
                  cy="14"
                  r="2.5"
                  fill="#00ffa2"
                />
              </svg>

              <span>
                Dalal
                <em className="site-footer-em">
                  Radar
                </em>
              </span>
            </div>

            <p className="site-footer-tagline">
              Smart money radar for Indian F&amp;O markets.
              Track institutions, not noise.
            </p>
          </div>

          {/* Product */}
          <div className="site-footer-col">
            <h5>Product</h5>

            <ul>
              <li>
                <a
                  href="https://app.dalalradar.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Launch App
                </a>
              </li>

              <li>
                <a href="/methodology">
                  Methodology
                </a>
              </li>

              <li>
                <a href="/pricing">
                  Pricing
                </a>
              </li>

              <li>
                <a href="/faq">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="site-footer-col">
            <h5>Company</h5>

            <ul>
              <li>
                <a href="/about">
                  About
                </a>
              </li>

              <li>
                <a href="/contact">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="site-footer-col">
            <h5>Legal</h5>

            <ul>
              <li>
                <a href="/privacy">
                  Privacy
                </a>
              </li>

              <li>
                <a href="/terms">
                  Terms
                </a>
              </li>

              <li>
                <a href="/disclaimer">
                  Disclaimer
                </a>
              </li>

              <li>
                <a href="/refund">
                  Refund Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <hr />
        <div className="site-footer-bottom">
          <div className="site-footer-disclaimer">
            <strong>Disclaimer:</strong> DalalRadar is an analytical
            tool for educational and informational purposes only.
            We are not SEBI-registered investment advisors.
            Nothing on this site or in the application constitutes
            investment advice, a recommendation, or a solicitation
            to buy or sell any security. Trading in F&amp;O carries
            substantial risk of loss and is not suitable for every
            investor.
          </div>

          <div className="site-footer-socials">
            <a
              href="https://youtube.com/@DalalRadar"
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube
            </a>

            <a
              href="https://x.com/DalalRadarIN"
              target="_blank"
              rel="noopener noreferrer"
            >
              X
            </a>

            <a
              href="https://instagram.com/dalalradar"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .site-footer {
          background: #050507;
          border-top: 1px solid var(--line);
          padding: 60px 0px 32px;
        }

        .site-footer-inner {
          max-width: 1200px;
          margin: 0 auto 40px;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
        }

        .site-footer-col-brand {
          max-width: 320px;
        }

        .site-footer-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .site-footer-em {
          color: var(--green);
          font-style: italic;
        }

        .site-footer-tagline {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--text-dim);
          line-height: 1.6;
          margin-bottom: 16px;
        }

        .site-footer-col h5 {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--green);
          margin-bottom: 16px;
        }

        .site-footer-col ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0;
          margin: 0;
        }

        .site-footer-col li {
          font-family: var(--font-mono);
          font-size: 13px;
        }

        .site-footer-col a {
          color: var(--text-dim);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .site-footer-col a:hover {
          color: var(--green);
        }

        .site-footer-bottom {
          max-width: 1200px;
          margin: 0 auto;
          padding-top: 24px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          flex-wrap: wrap;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-mute);
        }

        .site-footer-disclaimer {
          max-width: 900px;
          line-height: 1.7;
          flex: 1;
        }

        .site-footer-disclaimer strong {
          color: var(--text-dim);
        }

        .site-footer-socials {
          display: flex;
          gap: 14px;
          flex-shrink: 0;
        }

        .site-footer-socials a {
          color: var(--text-mute);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .site-footer-socials a:hover {
          color: var(--green);
        }

        @media (max-width: 900px) {
          .site-footer-inner {
            grid-template-columns: 1fr 1fr;
            gap: 32px;
          }

          .site-footer-col-brand {
            grid-column: 1 / -1;
            max-width: none;
          }
        }

        @media (max-width: 640px) {
          .site-footer {
            padding: 40px 20px 24px;
          }

          .site-footer-inner {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .site-footer-bottom {
            flex-direction: column;
            align-items: flex-start;
          }
        }
       
      hr {
        
          border-top: 1px solid var(--line);
      }   
      `}</style>
    </>
  );
}