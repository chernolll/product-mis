import { FolderTree, Image as ImageIcon, LogOut, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Toaster } from '@/components/ui/sonner';
export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen bg-zinc-950 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {!isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(true)} />}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 h-screen bg-zinc-900 border-r border-zinc-800 w-64 flex flex-col transition-transform duration-300 z-30 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'lg:hidden'}`}>
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="font-semibold text-zinc-100 truncate">管理系统</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavLink
            to="/admin/catalog"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isActive ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`
            }
          >
            <FolderTree className="w-5 h-5 shrink-0" />
            <span className={`${!isSidebarOpen && 'lg:hidden'}`}>目录管理</span>
          </NavLink>

          <NavLink
            to="/admin/process"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isActive ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`
            }
          >
            <ImageIcon className="w-5 h-5 shrink-0" />
            <span className={`${!isSidebarOpen && 'lg:hidden'}`}>步骤管理</span>
          </NavLink>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={`${!isSidebarOpen && 'lg:hidden'}`}>退出登录</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 lg:hidden sticky top-0 z-10">
          <button type="button" onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400">
            <Menu className="w-5 h-5" />
          </button>
          <span className="ml-4 font-semibold text-zinc-100">管理系统</span>
        </header> */}
        <div className="flex-1 p-6 overflow-hidden">
          <Outlet />
        </div>
      </main>

      <Toaster position='top-center' />
    </div>
  );
}
