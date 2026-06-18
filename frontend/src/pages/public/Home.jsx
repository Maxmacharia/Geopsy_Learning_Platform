import { Link } from 'react-router-dom'
import { BookOpen, Users, Download, MapPin, ChevronRight, Globe, Layers, Code, Satellite } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'

const STATS = [
  { label: 'GIS Courses',   value: '50+',    icon: BookOpen },
  { label: 'Students',      value: '2,000+', icon: Users },
  { label: 'Downloads',     value: '8,000+', icon: Download },
  { label: 'Institutions',  value: '30+',    icon: MapPin },
]

const CATEGORIES = [
  { name: 'GIS Fundamentals', icon: Globe,     color: 'bg-info-bg text-ring' },
  { name: 'Remote Sensing',   icon: Satellite, color: 'bg-surface-raised text-muted' },
  { name: 'QGIS',             icon: Layers,    color: 'bg-success-bg text-success' },
  { name: 'Python for GIS',   icon: Code,      color: 'bg-surface-raised text-muted' },
  { name: 'Web GIS',          icon: Globe,     color: 'bg-info-bg text-ring' },
  { name: 'Spatial Analysis', icon: MapPin,    color: 'bg-success-bg text-success' },
]

const WHY = [
  { title: 'Mobile-First',      desc: 'Designed for smartphone users with limited data. Every page loads fast on any connection.' },
  { title: 'Practical Content', desc: 'Real GIS datasets, embedded maps, and hands-on exercises using QGIS, Python, and PostGIS.' },
  { title: 'Community-Driven',  desc: 'Forums, peer learning, and expert discussions keep you connected and supported.' },
]

const TESTIMONIALS = [
  { name: 'Amina Odhiambo', institution: 'University of Nairobi',  quote: 'GeoPsy gave me access to GIS learning resources I could never afford. The QGIS course helped me land my first internship.' },
  { name: 'Brian Mutua',    institution: 'Moi University',         quote: 'The community forums are amazing. I solved a PostGIS problem in hours that had blocked me for weeks.' },
  { name: 'Grace Wanjiku',  institution: 'JKUAT',                  quote: 'Finally, a GIS platform built for Kenyan students. Low data usage, mobile-friendly, and real practical content.' },
]

export default function Home() {
  return (
    <PageWrapper>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-ink text-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-surface/10 text-surface/80 text-xs px-3 py-1.5 rounded-full mb-6 border border-surface/20">
              <Globe className="w-3 h-3" /> Open GIS Education · Kenya
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-4 text-balance">
              Learn GIS.<br />
              <span className="text-ring">Shape Kenya's Future.</span>
            </h1>
            <p className="text-surface/70 text-lg max-w-xl mb-8 leading-relaxed">
              High-quality, free GIS courses built for students at Kenyan tertiary institutions.
              Mobile-first, low-bandwidth, and community-powered.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link to="/register" className="btn-primary bg-ring hover:bg-ring-dark text-base px-6 py-3">
                Start Learning Free <ChevronRight className="w-4 h-4" />
              </Link>
              <Link to="/courses" className="btn-secondary bg-transparent border-surface/30 text-surface hover:bg-surface/10 text-base px-6 py-3">
                Browse Courses
              </Link>
            </div>
          </div>
          {/* Hero illustration */}
          <div className="flex-1 hidden md:block">
            <div className="w-full aspect-video rounded-2xl bg-surface/5 border border-surface/15 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center text-surface/40 p-6">
                <Globe className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Interactive GIS maps inside every course</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <div className="w-10 h-10 bg-info-bg rounded-xl flex items-center justify-center mx-auto mb-2">
                <Icon className="w-5 h-5 text-ring" />
              </div>
              <div className="text-2xl font-bold text-ink">{value}</div>
              <div className="text-sm text-muted">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="section-heading">Explore GIS Topics</h2>
          <p className="text-muted">14 specializations from fundamentals to advanced spatial analysis</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {CATEGORIES.map(({ name, icon: Icon, color }) => (
            <Link
              key={name}
              to={`/courses?category=${encodeURIComponent(name)}`}
              className={`card p-4 flex flex-col items-center gap-2 hover:shadow-card-md hover:-translate-y-0.5 transition-all duration-150 border-0 ${color}`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium text-center leading-tight">{name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Why GeoPsy ───────────────────────────────────────────────── */}
      <section className="bg-info-bg border-y border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-ink mb-4 tracking-tight">Why GeoPsy?</h2>
          <p className="text-muted text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            GIS skills are in demand across agriculture, urban planning, environment, and government in Kenya —
            yet quality training is concentrated in major cities and expensive institutions.
            GeoPsy bridges that gap with free, structured, mobile-accessible learning.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
            {WHY.map(({ title, desc }) => (
              <div key={title} className="card p-5 border-border/60">
                <h3 className="font-semibold text-ink mb-2">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="section-heading text-center mb-10">What Students Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map(({ name, institution, quote }) => (
            <div key={name} className="card p-6">
              <p className="text-sm text-muted leading-relaxed mb-5 italic">"{quote}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-9 h-9 rounded-full bg-ring-light text-ring flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">{name}</div>
                  <div className="text-xs text-muted">{institution}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-ink text-surface">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4 tracking-tight">Ready to start your GIS journey?</h2>
          <p className="text-surface/60 mb-8">Join thousands of Kenyan students building geospatial skills that matter.</p>
          <Link to="/register" className="btn-primary bg-ring hover:bg-ring-dark text-base px-8 py-3">
            Create Free Account <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </PageWrapper>
  )
}
