import { useState } from 'react'
import { User, Save, X } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import useAuthStore from '../../store/authStore'
import { usersApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user }          = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]   = useState({
    full_name:   user?.full_name   || '',
    institution: user?.institution || '',
    bio:         user?.bio         || '',
  })

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await usersApi.updateProfile(form)
      toast.success('Profile updated')
      setEditing(false)
    } catch { toast.error('Failed to update profile') }
    setSaving(false)
  }

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="heading-1 mb-8">My Profile</h1>

        <div className="card p-8">
          {/* Avatar + name */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                className="w-16 h-16 rounded-full object-cover border-2 border-border"
                alt={user.full_name}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-ring-light text-ring flex items-center justify-center text-2xl font-bold flex-shrink-0">
                {user?.full_name?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="heading-3">{user?.full_name}</p>
              <p className="text-sm text-muted">{user?.email}</p>
              <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-info-bg text-ring capitalize">
                {user?.role}
              </span>
            </div>
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label" htmlFor="p_name">Full Name</label>
                <input id="p_name" className="input" value={form.full_name} onChange={set('full_name')} required />
              </div>
              <div>
                <label className="label" htmlFor="p_inst">Institution</label>
                <input id="p_inst" className="input" value={form.institution} onChange={set('institution')} placeholder="Your university or college" />
              </div>
              <div>
                <label className="label" htmlFor="p_bio">Bio</label>
                <textarea id="p_bio" className="input resize-none" rows={3} value={form.bio} onChange={set('bio')} placeholder="Tell the community about yourself…" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary" disabled={saving}>
                  <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              {[
                { label: 'Institution', value: user?.institution || '—' },
                { label: 'Bio',         value: user?.bio         || '—' },
                { label: 'Member since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="label mb-1">{label}</p>
                  <p className="text-sm text-ink">{value}</p>
                </div>
              ))}
              <div className="pt-2 border-t border-border">
                <button onClick={() => setEditing(true)} className="btn-primary">
                  <User className="w-4 h-4" /> Edit Profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
