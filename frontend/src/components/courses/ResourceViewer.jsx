import { useState } from 'react'
import { Download, Copy, Check, ExternalLink, FileText, Code, Map, Film, File } from 'lucide-react'

/**
 * ResourceViewer renders a resource intelligently based on its type:
 *  - python / r_script / sql / code_snippet → syntax-highlighted code block
 *  - markdown    → rendered as preformatted text (full markdown rendering deferred to future)
 *  - pdf         → iframe embed with download fallback
 *  - video       → <video> player
 *  - image       → <img> preview
 *  - geojson / dataset → metadata card + download
 *  - notebook    → link to nbviewer + download
 *  - everything else → download card
 */
export default function ResourceViewer({ resource, onDownload }) {
  const type = resource.type

  if (type === 'python' || type === 'r_script' || type === 'sql' || type === 'code_snippet' || type === 'markdown') {
    return <CodeViewer resource={resource} onDownload={onDownload} />
  }
  if (type === 'pdf') {
    return <PdfViewer resource={resource} onDownload={onDownload} />
  }
  if (type === 'video') {
    return <VideoViewer resource={resource} />
  }
  if (type === 'image') {
    return <ImageViewer resource={resource} onDownload={onDownload} />
  }
  if (type === 'geojson' || type === 'shapefile' || type === 'geopackage' || type === 'raster' || type === 'dataset') {
    return <GisDatasetViewer resource={resource} onDownload={onDownload} />
  }
  if (type === 'notebook') {
    return <NotebookViewer resource={resource} onDownload={onDownload} />
  }
  // Generic: link + download
  return <GenericViewer resource={resource} onDownload={onDownload} />
}

// ── Syntax-highlighted code viewer ────────────────────────────────────────────

const LANG_LABELS = {
  python: 'Python', r: 'R', r_script: 'R', sql: 'SQL',
  markdown: 'Markdown', json: 'JSON', code_snippet: 'Code',
}

const LANG_COLORS = {
  python:   'text-blue-400',
  r:        'text-green-400', r_script: 'text-green-400',
  sql:      'text-yellow-400',
  markdown: 'text-purple-400',
  json:     'text-cyan-400',
  default:  'text-surface/60',
}

function CodeViewer({ resource, onDownload }) {
  const [copied, setCopied] = useState(false)
  const lang     = resource.language || resource.type
  const code     = resource.code_content
  const langLabel = LANG_LABELS[lang] || lang?.toUpperCase() || 'Code'
  const langColor = LANG_COLORS[lang] || LANG_COLORS.default

  async function handleCopy() {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-card">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-ink">
        <div className="flex items-center gap-2">
          <Code className="w-3.5 h-3.5 text-subtle" />
          <span className={`text-xs font-mono font-semibold ${langColor}`}>{langLabel}</span>
          <span className="text-subtle text-xs">·</span>
          <span className="text-subtle text-xs">{resource.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {resource.file_url && (
            <button onClick={onDownload} className="text-subtle hover:text-surface text-xs flex items-center gap-1 transition-colors">
              <Download className="w-3 h-3" /> Download
            </button>
          )}
          {code && (
            <button
              onClick={handleCopy}
              className="text-subtle hover:text-surface text-xs flex items-center gap-1 transition-colors"
            >
              {copied ? <><Check className="w-3 h-3 text-success" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
          )}
        </div>
      </div>

      {/* Code body */}
      {code ? (
        <div className="bg-ink/95 overflow-auto max-h-[500px] scrollbar-thin">
          <pre className="p-4 text-xs font-mono leading-relaxed text-surface/80">
            {/* Line numbers */}
            <code>
              {code.split('\n').map((line, i) => (
                <div key={i} className="flex">
                  <span className="select-none text-subtle/50 w-8 flex-shrink-0 text-right pr-4">{i + 1}</span>
                  <span className="flex-1">{line || ' '}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      ) : resource.file_url ? (
        <div className="bg-ink/95 p-6 text-center text-subtle text-sm">
          <p>Code preview not available inline.</p>
          <button onClick={onDownload} className="text-ring hover:underline mt-2 inline-flex items-center gap-1 text-xs">
            <Download className="w-3 h-3" /> Download to view
          </button>
        </div>
      ) : (
        <div className="bg-ink/95 p-6 text-center text-subtle text-sm">No content available.</div>
      )}
    </div>
  )
}

// ── PDF viewer ────────────────────────────────────────────────────────────────

function PdfViewer({ resource, onDownload }) {
  const [showEmbed, setShowEmbed] = useState(false)
  const url = resource.file_url || resource.external_url

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-card">
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-raised border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-ring" />
          <span className="text-sm font-medium text-ink">{resource.title}</span>
          {resource.file_size_bytes && (
            <span className="text-xs text-muted">· {(resource.file_size_bytes / 1024).toFixed(0)} KB</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEmbed(!showEmbed)} className="btn-ghost text-xs">
            {showEmbed ? 'Hide preview' : 'Preview'}
          </button>
          <button onClick={onDownload} className="btn-primary text-xs">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
        </div>
      </div>
      {showEmbed && url && (
        <iframe
          src={`${url}#toolbar=1&view=FitH`}
          className="w-full"
          style={{ height: '600px' }}
          title={resource.title}
        />
      )}
    </div>
  )
}

// ── Video player ───────────────────────────────────────────────────────────────

function VideoViewer({ resource }) {
  const url = resource.file_url || resource.external_url
  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-card bg-ink">
      <div className="flex items-center gap-2 px-4 py-2 bg-ink border-b border-surface/10">
        <Film className="w-4 h-4 text-subtle" />
        <span className="text-sm font-medium text-surface/80">{resource.title}</span>
      </div>
      {url ? (
        <video
          controls
          preload="metadata"
          className="w-full max-h-[480px]"
          src={url}
        >
          Your browser doesn't support video playback.
          <a href={url} className="text-ring">Download video</a>
        </video>
      ) : (
        <div className="p-8 text-center text-subtle text-sm">Video not available.</div>
      )}
    </div>
  )
}

// ── Image viewer ───────────────────────────────────────────────────────────────

function ImageViewer({ resource, onDownload }) {
  const url = resource.file_url || resource.external_url
  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-card">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-raised border-b border-border">
        <span className="text-sm font-medium text-ink">{resource.title}</span>
        <button onClick={onDownload} className="btn-ghost text-xs"><Download className="w-3.5 h-3.5" /> Download</button>
      </div>
      {url ? (
        <div className="bg-surface-sunken p-4 flex items-center justify-center">
          <img
            src={url}
            alt={resource.title}
            className="max-w-full max-h-[500px] object-contain rounded-lg"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="p-8 text-center text-muted text-sm">Image not available.</div>
      )}
    </div>
  )
}

// ── GIS dataset viewer ────────────────────────────────────────────────────────

const GIS_TYPE_LABELS = {
  geojson: 'GeoJSON', shapefile: 'Shapefile', geopackage: 'GeoPackage',
  raster: 'Raster', dataset: 'Dataset',
}

function GisDatasetViewer({ resource, onDownload }) {
  const meta = resource.metadata_json || {}
  const typeLabel = GIS_TYPE_LABELS[resource.type] || resource.type.toUpperCase()

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-card">
      <div className="flex items-center justify-between px-4 py-3 bg-surface-raised border-b border-border">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-ring" />
          <span className="text-sm font-semibold text-ink">{resource.title}</span>
          <span className="badge badge-ring">{typeLabel}</span>
        </div>
        <button onClick={onDownload} className="btn-primary text-xs">
          <Download className="w-3.5 h-3.5" /> Download
        </button>
      </div>

      <div className="p-5 bg-surface">
        {Object.keys(meta).length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-subtle uppercase tracking-wider font-semibold mb-3">Dataset Metadata</p>
            {Object.entries(meta).map(([key, val]) => (
              <div key={key} className="flex gap-3 text-sm">
                <span className="text-muted font-medium w-32 flex-shrink-0 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-ink">{String(val)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted">
            <Map className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{typeLabel} dataset</p>
            {resource.file_size_bytes && (
              <p className="text-xs mt-0.5">{(resource.file_size_bytes / 1024).toFixed(0)} KB</p>
            )}
            <p className="text-xs text-subtle mt-1">Download to view in QGIS, ArcGIS, or your GIS tool of choice.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Jupyter Notebook viewer ────────────────────────────────────────────────────

function NotebookViewer({ resource, onDownload }) {
  const url = resource.file_url
  const nbviewerUrl = url ? `https://nbviewer.org/urls/${url.replace(/^https?:\/\//, '')}` : null

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-card">
      <div className="flex items-center justify-between px-4 py-3 bg-surface-raised border-b border-border">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-ring" />
          <span className="text-sm font-semibold text-ink">{resource.title}</span>
          <span className="badge badge-ring">Notebook</span>
        </div>
        <div className="flex gap-2">
          {nbviewerUrl && (
            <a href={nbviewerUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
              <ExternalLink className="w-3.5 h-3.5" /> Open in nbviewer
            </a>
          )}
          <button onClick={onDownload} className="btn-primary text-xs">
            <Download className="w-3.5 h-3.5" /> Download .ipynb
          </button>
        </div>
      </div>
      <div className="p-5 text-center text-muted text-sm">
        <p>Jupyter Notebooks open in nbviewer for interactive viewing.</p>
        <p className="text-xs text-subtle mt-1">Or download and open in Jupyter Lab / VS Code.</p>
      </div>
    </div>
  )
}

// ── Generic fallback ───────────────────────────────────────────────────────────

function GenericViewer({ resource, onDownload }) {
  const url = resource.file_url || resource.external_url
  return (
    <div className="card p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-info-bg flex items-center justify-center flex-shrink-0">
          <File className="w-4 h-4 text-ring" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{resource.title}</p>
          <p className="text-xs text-muted uppercase mt-0.5">
            {resource.type}{resource.file_size_bytes ? ` · ${(resource.file_size_bytes / 1024).toFixed(0)} KB` : ''}
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {url && resource.type === 'link' && (
          <a href={url} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
            <ExternalLink className="w-3.5 h-3.5" /> Open Link
          </a>
        )}
        {url && resource.type !== 'link' && (
          <button onClick={onDownload} className="btn-primary text-xs">
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        )}
      </div>
    </div>
  )
}
