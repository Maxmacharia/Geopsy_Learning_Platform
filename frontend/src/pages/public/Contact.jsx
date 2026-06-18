import { Mail, MapPin, Globe } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'

const CONTACTS = [
  { icon: Mail,   label: 'Email',    value: 'info@geopsyresearch.org', href: 'mailto:info@geopsyresearch.org' },
  { icon: Globe,  label: 'Website',  value: 'geopsyresearch.org',       href: 'https://geopsyresearch.org' },
  { icon: MapPin, label: 'Location', value: 'Nairobi, Kenya',           href: null },
]

export default function Contact() {
  function handleSubmit(e) {
    e.preventDefault()
    alert("Message sent! We'll get back to you at info@geopsyresearch.org soon.")
  }

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="heading-1 mb-2">Contact Us</h1>
          <p className="text-muted">We'd love to hear from institutions, students, and partners.</p>
        </div>

        {/* Contact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {CONTACTS.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="card p-5 text-center">
              <div className="w-9 h-9 bg-info-bg rounded-xl flex items-center justify-center mx-auto mb-3">
                <Icon className="w-4 h-4 text-ring" />
              </div>
              <p className="text-2xs text-muted uppercase tracking-wider font-semibold mb-1">{label}</p>
              {href ? (
                <a href={href} className="text-sm font-medium text-ring hover:underline break-all">
                  {value}
                </a>
              ) : (
                <p className="text-sm font-medium text-ink">{value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="card p-6">
          <h2 className="heading-4 mb-5">Send a Message</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="label" htmlFor="c_name">Your Name</label>
              <input id="c_name" className="input" placeholder="Jane Mwangi" required />
            </div>
            <div>
              <label className="label" htmlFor="c_email">Email Address</label>
              <input id="c_email" className="input" type="email" placeholder="jane@university.ac.ke" required />
            </div>
            <div>
              <label className="label" htmlFor="c_subject">Subject</label>
              <input id="c_subject" className="input" placeholder="Partnership / Course enquiry / Technical support" required />
            </div>
            <div>
              <label className="label" htmlFor="c_message">Message</label>
              <textarea id="c_message" className="input resize-none" rows={5} placeholder="Your message…" required />
            </div>
            <button type="submit" className="btn-primary w-full py-2.5">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </PageWrapper>
  )
}
