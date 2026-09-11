import { Link } from 'react-router-dom'
import { Globe, Twitter, Github, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-ink text-subtle mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">

        {/* Brand column */}
        <div>
          <div className="flex items-center gap-2 text-surface font-bold text-base mb-3">
            <img src="/geopsy-logo.png" alt="GeoPsy" className="h-6 w-auto bg-surface rounded px-1.5 py-1" />
          </div>
          <p className="text-sm leading-relaxed">
            GIS capacity building for tertiary institutions across Kenya.
            Open, accessible, community-driven.
          </p>
        </div>

        {/* Learn */}
        <div>
          <h4 className="text-surface font-semibold mb-3 text-sm tracking-wide">Learn</h4>
          <ul className="space-y-2 text-sm">
            {[
              { to: '/courses',                              label: 'All Courses' },
              { to: '/courses?category=GIS Fundamentals',   label: 'GIS Fundamentals' },
              { to: '/courses?category=QGIS',               label: 'QGIS' },
              { to: '/courses?category=Python for GIS',     label: 'Python for GIS' },
              { to: '/courses?category=Remote Sensing',     label: 'Remote Sensing' },
            ].map(({ to, label }) => (
              <li key={label}>
                <Link to={to} className="hover:text-surface transition-colors">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Community */}
        <div>
          <h4 className="text-surface font-semibold mb-3 text-sm tracking-wide">Community</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/forums"  className="hover:text-surface transition-colors">Discussion Forums</Link></li>
            <li><Link to="/about"   className="hover:text-surface transition-colors">About GeoPsy</Link></li>
            <li><Link to="/contact" className="hover:text-surface transition-colors">Contact Us</Link></li>
          </ul>
        </div>

        {/* Connect */}
        <div>
          <h4 className="text-surface font-semibold mb-3 text-sm tracking-wide">Connect</h4>
          <div className="flex gap-3 mb-4">
            <a
              href="mailto:info@geopsyresearch.org"
              className="hover:text-surface transition-colors"
              aria-label="Email GeoPsy"
            >
              <Mail className="w-5 h-5" />
            </a>
            <a
              href="https://github.com"
              target="_blank" rel="noreferrer"
              className="hover:text-surface transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank" rel="noreferrer"
              className="hover:text-surface transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="w-5 h-5" />
            </a>
          </div>
          <p className="text-xs">info@geopsyresearch.org</p>
          <p className="text-xs mt-0.5">geopsyresearch.org</p>
        </div>
      </div>

      <div className="border-t border-surface/10 text-center py-4 text-xs">
        © {new Date().getFullYear()} GeoPsy Learning Platform · Built for Kenyan GIS students
      </div>
    </footer>
  )
}
