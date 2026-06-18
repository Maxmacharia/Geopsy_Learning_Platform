import { Globe, BookOpen, Users, Map } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'

const PILLARS = [
  {
    icon: BookOpen,
    title: 'Our Mission',
    desc: 'To democratize GIS education across Kenya by providing free, structured, mobile-accessible courses and practical resources to every student regardless of location or institutional capacity.',
  },
  {
    icon: Users,
    title: 'Our Community',
    desc: "GeoPsy is community-driven. Students, lecturers, and GIS professionals collaborate in forums, share resources, and support each other's growth in geospatial sciences.",
  },
  {
    icon: Map,
    title: 'Why GIS?',
    desc: 'Geospatial skills are in high demand across agriculture, urban planning, environment, and government in Kenya. We exist to ensure every student can access this transformative knowledge.',
  },
]

export default function About() {
  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="w-14 h-14 bg-info-bg rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Globe className="w-7 h-7 text-ring" />
          </div>
          <h1 className="heading-1 mb-4">About GeoPsy Learning Platform</h1>
          <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            A free, open-source GIS learning platform built specifically for students at Kenyan
            tertiary institutions who lack access to quality geospatial education.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {PILLARS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6">
              <div className="w-10 h-10 bg-info-bg rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-ring" />
              </div>
              <h3 className="heading-4 mb-2">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Open source callout */}
        <div className="card p-8 bg-info-bg border-border text-center">
          <h2 className="heading-3 mb-3">Built with Open Source</h2>
          <p className="text-muted text-sm leading-relaxed max-w-xl mx-auto">
            GeoPsy is powered by FastAPI, React, PostgreSQL, and Leaflet.js — all open-source tools.
            We believe open technology for open education is the only way to sustainably serve Kenyan students.
          </p>
        </div>

        {/* Contact strip */}
        <div className="mt-10 text-center">
          <p className="text-muted text-sm">
            Questions or partnerships?{' '}
            <a href="mailto:info@geopsyresearch.org" className="text-ring font-medium hover:underline">
              info@geopsyresearch.org
            </a>
            {' '}·{' '}
            <a href="https://geopsyresearch.org" target="_blank" rel="noreferrer" className="text-ring font-medium hover:underline">
              geopsyresearch.org
            </a>
          </p>
        </div>
      </div>
    </PageWrapper>
  )
}
