import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Award, CheckCircle, XCircle, Download, Globe } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import { certificatesApi } from '../../services/api'

export default function VerifyCertificate() {
  const { verificationId } = useParams()
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    certificatesApi.verify(verificationId)
      .then(({ data }) => setResult(data))
      .catch(() => setResult({ valid: false, message: 'Verification failed. Please try again.' }))
      .finally(() => setLoading(false))
  }, [verificationId])

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <img src="/geopsy-logo.png" alt="GeoPsy" className="h-10 w-auto mx-auto mb-4" />
          <h1 className="heading-2">Certificate Verification</h1>
          <p className="text-muted text-sm mt-1">GeoPsy Learning Platform · geopsyresearch.org</p>
        </div>

        {loading ? (
          <div className="card p-10 text-center animate-pulse">
            <div className="h-8 bg-surface-raised rounded w-1/2 mx-auto mb-4" />
            <div className="h-4 bg-surface-raised rounded w-3/4 mx-auto" />
          </div>
        ) : (
          <div className={`card p-8 ${result.valid ? 'border-success/30 bg-success-bg/30' : 'border-danger/30 bg-danger-bg/30'}`}>
            {/* Valid / Invalid indicator */}
            <div className="flex flex-col items-center text-center mb-6">
              {result.valid
                ? <CheckCircle className="w-16 h-16 text-success mb-3" />
                : <XCircle className="w-16 h-16 text-danger mb-3" />
              }
              <h2 className={`text-xl font-bold ${result.valid ? 'text-success' : 'text-danger'}`}>
                {result.valid ? 'Certificate Verified ✓' : 'Certificate Invalid'}
              </h2>
              <p className="text-muted text-sm mt-1">{result.message}</p>
            </div>

            {/* Certificate details */}
            {result.certificate && (
              <div className="border-t border-border pt-6 space-y-4">
                {[
                  { label: 'Awarded to',       value: result.certificate.learner_name },
                  { label: 'Course',            value: result.certificate.course_name },
                  { label: 'Competency',        value: result.certificate.competency_achieved },
                  { label: 'Level',             value: result.certificate.certification_level },
                  { label: 'Final Score',       value: result.certificate.final_score_pct ? `${result.certificate.final_score_pct.toFixed(1)}%` : null },
                  { label: 'Date Issued',       value: new Date(result.certificate.issued_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }) },
                  { label: 'Certificate No.',   value: result.certificate.certificate_number },
                  { label: 'Verification ID',   value: verificationId, mono: true },
                ].filter(item => item.value).map(({ label, value, mono }) => (
                  <div key={label} className="flex gap-4">
                    <span className="text-xs text-subtle uppercase tracking-wider font-semibold w-32 flex-shrink-0 pt-0.5">{label}</span>
                    <span className={`text-sm text-ink flex-1 ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{value}</span>
                  </div>
                ))}

                {result.certificate.pdf_url && (
                  <div className="pt-4 border-t border-border">
                    <a
                      href={result.certificate.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary inline-flex"
                    >
                      <Download className="w-4 h-4" /> Download Certificate PDF
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer note */}
        <div className="text-center mt-8">
          <p className="text-xs text-subtle">
            Certificates issued by the GeoPsy Learning Platform are verifiable at{' '}
            <a href="https://geopsyresearch.org" className="text-ring hover:underline">geopsyresearch.org</a>.
            For questions contact{' '}
            <a href="mailto:info@geopsyresearch.org" className="text-ring hover:underline">info@geopsyresearch.org</a>.
          </p>
        </div>
      </div>
    </PageWrapper>
  )
}
