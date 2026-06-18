import { NavLink, useNavigate } from 'react-router-dom'
import {
  Globe, LayoutDashboard, BookOpen, Upload,
  MessageSquare, BarChart2, LogOut, ExternalLink, Map
} from 'lucide-react'
import useAuthStore from '../../store/authStore'

const LINKS = [
  { to: '/admin',           label: 'Dashboard',  icon: LayoutDashboard, exact: true },
  { to: '/admin/courses',   label: 'Courses',    icon: BookOpen },
  { to: '/admin/upload',    label: 'Upload',     icon: Upload },
  { to: '/admin/maps',      label: 'Maps',       icon: Map },
  { to: '/admin/forums',    label: 'Forums',     icon: MessageSquare },
  { to: '/admin/analytics', label: 'Analytics',  icon: BarChart2 },
]

export default function AdminLayout({ children, title }) {
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()
  function handleLogout() { logout(); navigate('/') }

  return (
    <div className="min-h-screen flex bg-canvas">

      {/* Sidebar */}
      <aside className="w-56 bg-surface border-r border-border flex-col fixed inset-y-0 z-30 hidden md:flex">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 h-14 border-b border-border">
          <Globe className="w-4 h-4 text-ring flex-shrink-0" />
          <span className="font-bold text-ring text-sm tracking-tight">GeoPsy</span>
          <span className="text-xs text-muted font-normal">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {LINKS.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => isActive ? 'sidebar-item-active' : 'sidebar-item'}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 border-t border-border pt-3 space-y-0.5">
          {/* User info */}
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-ring-light text-ring flex items-center justify-center text-xs font-bold flex-shrink-0">
                {user.full_name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink truncate">{user.full_name?.split(' ')[0]}</p>
                <p className="text-2xs text-muted truncate">Administrator</p>
              </div>
            </div>
          )}
          <NavLink to="/" className="sidebar-item text-xs">
            <ExternalLink className="w-4 h-4 flex-shrink-0" /> View Site
          </NavLink>
          <button onClick={handleLogout} className="sidebar-item text-xs text-danger hover:bg-danger-bg w-full">
            <LogOut className="w-4 h-4 flex-shrink-0" /> Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <header className="h-14 bg-surface border-b border-border flex items-center px-4 md:px-6 sticky top-0 z-20 shadow-card">
          <h1 className="heading-4 text-ink">{title}</h1>
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
