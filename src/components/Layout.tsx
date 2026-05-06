import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, List, Sprout, ChartLine } from 'lucide-react';

const nav = [
  { to: '/',        label: 'Dashboard', icon: LayoutDashboard },
  { to: '/add',     label: 'Add',       icon: PlusCircle },
  { to: '/grow',    label: 'Grow',      icon: Sprout },
  { to: '/history', label: 'History',   icon: List },
  { to: '/prices',  label: 'Prices',    icon: ChartLine },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f0]">
      {/* Top Header */}
      <header className="bg-mushroom-700 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-3xl">🍄</span>
          <div>
            <h1 className="text-xl font-bold leading-tight">Musho Farm</h1>
            <p className="text-mushroom-200 text-sm">Income & Expense Tracker</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom Nav (mobile-friendly big tabs) */}
      <nav className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto flex">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-mushroom-600 border-t-2 border-mushroom-600 bg-mushroom-50'
                    : 'text-gray-500 hover:text-mushroom-600'
                }`
              }
            >
              <Icon size={22} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
