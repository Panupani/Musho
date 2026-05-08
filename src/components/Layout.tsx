import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, List, Sprout, ChartLine } from 'lucide-react';

const nav = [
  { to: '/',        label: 'หน้าหลัก', icon: LayoutDashboard },
  { to: '/add',     label: 'บันทึก',   icon: PlusCircle },
  { to: '/grow',    label: 'ปลูก',     icon: Sprout },
  { to: '/history', label: 'ประวัติ',  icon: List },
  { to: '/prices',  label: 'ราคา',     icon: ChartLine },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f0]">
      {/* Top Header */}
      <header className="bg-mushroom-700 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-3">
          <span className="text-4xl leading-none">🍄</span>
          <div>
            <h1 className="text-xl font-bold leading-tight tracking-wide">มัชโช ฟาร์ม</h1>
            <p className="text-mushroom-200 text-sm font-medium">บันทึกรายรับ-รายจ่าย</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-5">
        <Outlet />
      </main>

      {/* Bottom Nav — large touch targets */}
      <nav className="sticky bottom-0 bg-white border-t-2 border-gray-200 shadow-xl">
        <div className="max-w-4xl mx-auto flex">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1.5 py-3.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'text-mushroom-700 border-t-4 border-mushroom-600 bg-mushroom-50 -mt-px'
                    : 'text-gray-500 border-t-4 border-transparent hover:text-mushroom-600 hover:bg-mushroom-50'
                }`
              }
            >
              <Icon size={26} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
