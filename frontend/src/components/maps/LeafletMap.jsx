import { useEffect, useRef } from 'react'

// Lazy-load leaflet to keep the initial bundle small
export default function LeafletMap({ geojson, centerLat = -1.286, centerLng = 36.817, zoom = 6, height = '400px', title = 'Map' }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('leaflet').then((L) => {
      const map = L.map(containerRef.current).setView([centerLat, centerLng], zoom)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      if (geojson) {
        const layer = L.geoJSON(geojson, {
          style: { color: '#2563eb', weight: 2, fillOpacity: 0.15 },
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              const props = Object.entries(feature.properties)
                .map(([k, v]) => `<b>${k}:</b> ${v}`)
                .join('<br/>')
              layer.bindPopup(props)
            }
          },
        }).addTo(map)

        try { map.fitBounds(layer.getBounds(), { padding: [20, 20] }) } catch {}
      }

      // Coordinate display
      const coordDisplay = L.control({ position: 'bottomleft' })
      coordDisplay.onAdd = () => {
        const div = L.DomUtil.create('div', 'bg-surface px-2 py-1 text-xs rounded shadow text-muted')
        div.id = 'coord-display'
        div.innerHTML = 'Hover for coordinates'
        return div
      }
      coordDisplay.addTo(map)

      map.on('mousemove', (e) => {
        const el = document.getElementById('coord-display')
        if (el) el.innerHTML = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`
      })

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-card">
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-raised border-b border-border text-xs font-medium text-muted">
        <span>🗺</span> {title}
      </div>
      <div ref={containerRef} style={{ height }} />
    </div>
  )
}
