import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Globe, Menu, X, BookOpen, User, LogOut, LayoutDashboard, Shield, ChevronDown } from 'lucide-react'
import useAuthStore from '../../store/authStore'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef  = useRef(null)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on route change
  function handleNavClick() {
    setDropdownOpen(false)
    setMobileOpen(false)
  }

  function handleLogout() {
    logout()
    setDropdownOpen(false)
    setMobileOpen(false)
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-50 bg-surface border-b border-border shadow-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link
          to="/"
          onClick={handleNavClick}
          className="flex items-center gap-2 font-bold text-ring text-base tracking-tight flex-shrink-0"
        >
          <Globe className="w-5 h-5" />
          <span>GeoPsy</span>
          <span className="hidden sm:inline text-ink/50 font-normal text-sm">Learning Platform</span>
        </Link>

        {/* Desktop centre nav */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {[
            { to: '/courses', label: 'Courses' },
            { to: '/forums',  label: 'Forums' },
            { to: '/about',   label: 'About' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? 'nav-link-active px-3 py-2 rounded-lg bg-ring-light' : 'nav-link px-3 py-2 rounded-lg hover:bg-surface-raised'
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {user ? (
            <div className="flex items-center gap-1">
              {user.role === 'admin' && (
                <Link to="/admin" onClick={handleNavClick} className="btn-ghost text-ring text-xs">
                  <Shield className="w-3.5 h-3.5" /> Admin
                </Link>
              )}
              <Link to="/dashboard" onClick={handleNavClick} className="btn-ghost text-xs">
                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
              </Link>

              {/* Profile dropdown — React-controlled, NOT CSS group-hover */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(prev => !prev)}
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                  className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg hover:bg-surface-raised transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      className="w-7 h-7 rounded-full object-cover border border-border"
                      alt={user.full_name}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-ring-light text-ring flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {user.full_name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-medium text-ink max-w-[80px] truncate hidden lg:block">
                    {user.full_name?.split(' ')[0]}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown panel */}
                {dropdownOpen && (
                  <div className="dropdown-panel right-0 top-10 w-52">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-ink truncate">{user.full_name}</p>
                      <p className="text-xs text-muted truncate mt-0.5">{user.email}</p>
                    </div>

                    <Link to="/profile"   onClick={handleNavClick} className="dropdown-item">
                      <User className="w-4 h-4 text-muted flex-shrink-0" /> Profile
                    </Link>
                    <Link to="/bookmarks" onClick={handleNavClick} className="dropdown-item">
                      <BookOpen className="w-4 h-4 text-muted flex-shrink-0" /> Bookmarks
                    </Link>
                    <Link to="/progress"  onClick={handleNavClick} className="dropdown-item">
                      <LayoutDashboard className="w-4 h-4 text-muted flex-shrink-0" /> Progress
                    </Link>

                    <div className="border-t border-border mt-1 pt-1">
                      <button onClick={handleLogout} className="dropdown-item-danger w-full">
                        <LogOut className="w-4 h-4 flex-shrink-0" /> Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login"    className="btn-ghost text-sm">Log in</Link>
              <Link to="/register" className="btn-primary text-sm">Get Started</Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-surface-raised transition-colors"
          onClick={() => setMobileOpen(prev => !prev)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5 text-ink" /> : <Menu className="w-5 h-5 text-ink" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-surface px-4 py-3 space-y-1">
          {[
            { to: '/courses', label: 'Courses' },
            { to: '/forums',  label: 'Forums' },
            { to: '/about',   label: 'About' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-ring-light text-ring' : 'text-muted hover:bg-surface-raised hover:text-ink'
                }`
              }
            >
              {label}
            </NavLink>
          ))}

          {user ? (
            <>
              <div className="border-t border-border my-2" />
              {/* User info */}
              <div className="flex items-center gap-3 px-3 py-2">
                {user.avatar_url ? (
                  <img src={user.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-ring-light text-ring flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {user.full_name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{user.full_name}</p>
                  <p className="text-xs text-muted truncate">{user.email}</p>
                </div>
              </div>

              <NavLink to="/dashboard" onClick={handleNavClick} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:bg-surface-raised hover:text-ink transition-colors">Dashboard</NavLink>
              <NavLink to="/profile"   onClick={handleNavClick} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:bg-surface-raised hover:text-ink transition-colors">Profile</NavLink>
              <NavLink to="/bookmarks" onClick={handleNavClick} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:bg-surface-raised hover:text-ink transition-colors">Bookmarks</NavLink>
              <NavLink to="/progress"  onClick={handleNavClick} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:bg-surface-raised hover:text-ink transition-colors">Progress</NavLink>
              {user.role === 'admin' && (
                <NavLink to="/admin" onClick={handleNavClick} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-ring hover:bg-ring-light transition-colors">Admin Panel</NavLink>
              )}
              <div className="border-t border-border pt-2 mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-danger-bg transition-colors"
                >
                  <span className="flex items-center gap-2"><LogOut className="w-4 h-4" /> Log out</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-2 pt-2 border-t border-border mt-2">
              <Link to="/login"    onClick={handleNavClick} className="btn-secondary flex-1 text-sm">Log in</Link>
              <Link to="/register" onClick={handleNavClick} className="btn-primary flex-1 text-sm">Register</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
