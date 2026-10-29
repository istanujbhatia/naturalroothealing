import { useEffect, useState } from 'react';
import { ChevronDown, LogOut, Moon, Sun, UserRound } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { apiFetch } from './api';

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:4000`}/api/v1`;
const fetch = apiFetch;
const csrf = () => decodeURIComponent(document.cookie.split('; ').find((item) => item.startsWith('nrh_csrf='))?.split('=').slice(1).join('=') || '');

export default function AdminNav() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [brandLogo, setBrandLogo] = useState(`${import.meta.env.BASE_URL}assets/brand-logo.png`);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nrh-theme') === 'dark');
  const [profileOpen, setProfileOpen] = useState(false);
  const loadAdmin = () => fetch(`${API_BASE}/admin/auth/me`, { credentials: 'include' }).then((response) => response.ok ? response.json() : null).then((payload) => setAdmin(payload?.data?.user || null)).catch(() => setAdmin(null));
  useEffect(() => { loadAdmin(); fetch(`${API_BASE}/catalog/site-images`).then((response) => response.ok ? response.json() : null).then((payload) => { const logo = payload?.data?.images?.find((image) => image.key === 'brand-logo.png')?.reference; if (logo) setBrandLogo(logo); }).catch(() => undefined); window.addEventListener('admin-session-changed', loadAdmin); return () => window.removeEventListener('admin-session-changed', loadAdmin); }, []);
  const signOut = async () => { await fetch(`${API_BASE}/admin/auth/logout`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf() } }); setAdmin(null); setProfileOpen(false); window.dispatchEvent(new Event('admin-session-changed')); navigate('/admin/catalog'); };
  const toggleTheme = () => { const next = !darkMode; const update = () => { document.documentElement.dataset.theme = next ? 'dark' : 'light'; document.documentElement.classList.toggle('dark', next); localStorage.setItem('nrh-theme', next ? 'dark' : 'light'); setDarkMode(next); window.dispatchEvent(new Event('nrh-theme-change')); }; if (typeof document.startViewTransition === 'function') document.startViewTransition(update); else update(); };
  return <aside className="admin-sidebar">
    <div className="admin-brand" aria-label="Natural Root Healing admin portal"><img src={brandLogo} alt="Natural Root Healing" /><span><b>Admin portal</b></span></div>
    <nav className="admin-nav" aria-label="Admin sections"><span className="admin-nav__label">Workspace</span><NavLink to="/admin/catalog" className={({ isActive }) => isActive ? 'is-active' : ''}><span>▦</span> Products</NavLink><NavLink to="/admin/orders" className={({ isActive }) => isActive ? 'is-active' : ''}><span>◫</span> Order</NavLink><NavLink to="/admin/catalog/assets" className={({ isActive }) => isActive ? 'is-active' : ''}><span>▧</span> Image assets</NavLink><NavLink to="/admin/catalog/site-images" className={({ isActive }) => isActive ? 'is-active' : ''}><span>◈</span> Site images</NavLink><NavLink to="/admin/reviews" className={({ isActive }) => isActive ? 'is-active' : ''}><span>☆</span> Reviews</NavLink><NavLink to="/admin/users" className={({ isActive }) => isActive ? 'is-active' : ''}><span>♙</span> Users</NavLink><NavLink to="/admin/contact" className={({ isActive }) => isActive ? 'is-active' : ''}><span>✉</span> Contact</NavLink><NavLink to="/admin/contacts" className={({ isActive }) => isActive ? 'is-active' : ''}><span>◎</span> Contacts</NavLink></nav>
    <Link to="/" className="admin-nav__link admin-storefront-link"><span>↗</span> View storefront</Link><div className="admin-sidebar__footer"><button type="button" className="admin-theme-toggle" onClick={toggleTheme} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}><span>{darkMode ? <Sun size={16} /> : <Moon size={16} />}</span>{darkMode ? 'Light mode' : 'Dark mode'}</button><div className={`admin-profile ${profileOpen ? 'is-open' : ''}`} onMouseEnter={() => setProfileOpen(true)} onMouseLeave={() => setProfileOpen(false)}><button type="button" className="admin-profile__trigger" onClick={() => setProfileOpen(true)} aria-expanded={profileOpen}><span className="admin-profile__avatar"><UserRound size={16} /></span><span><b>{admin?.name || 'Admin'}</b><small>{admin?.email || 'Administrator'}</small></span><ChevronDown size={15} /></button>{profileOpen && <div className="admin-profile__menu"><button type="button" onClick={signOut}><LogOut size={15} /> Sign out</button></div>}</div></div>
  </aside>;
}
