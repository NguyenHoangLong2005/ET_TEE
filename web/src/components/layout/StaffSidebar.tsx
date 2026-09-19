import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { STAFF_NAV_CONFIG } from '@/lib/staffNavConfig';

export default function StaffSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  
  // Try to find exact role match, fallback to STAFF if not found, or empty array if STAFF isn't defined
  const navItems = STAFF_NAV_CONFIG[role] || STAFF_NAV_CONFIG['STAFF'] || [];

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 hidden md:block">
      <div className="h-full flex flex-col pt-6 pb-4">
        <div className="px-6 mb-6">
          <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-gray-500">
            {role.replace('_', ' ')} PORTAL
          </h2>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/staff/dashboard' && pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive
                    ? 'bg-red-50 text-red-600 border border-red-100 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'text-gray-400'}`} />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
