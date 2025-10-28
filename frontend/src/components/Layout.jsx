import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, ClipboardCheck, Phone, AlertCircle, Glasses, Menu, X, Mail, FileBarChart } from 'lucide-react';

const Layout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/programmes', icon: FileText, label: 'Programmes' },
    { path: '/partenaires', icon: Users, label: 'Partenaires' },
    { path: '/tests-site', icon: ClipboardCheck, label: 'Tests Site' },
    { path: '/tests-ligne', icon: Phone, label: 'Tests Ligne' },
    { path: '/incidents', icon: AlertCircle, label: 'Incidents' },
    { path: '/messagerie', icon: Mail, label: 'Messagerie' },
    { path: '/bilan-partenaire', icon: FileBarChart, label: 'Bilan Partenaire' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const closeSidebar = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-red-600 p-2 rounded-lg">
                <Glasses className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-red-600" style={{ fontFamily: 'Work Sans' }}>
                  QWERTYS
                </h1>
                <p className="text-xs font-medium text-gray-700">HUB BLIND TESTS</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={closeSidebar}
                    data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      active
                        ? 'bg-red-50 text-red-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-700 hover:text-red-600"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-red-600 p-1.5 rounded">
                <Glasses className="text-white" size={18} />
              </div>
              <span className="text-lg font-bold text-red-600" style={{ fontFamily: 'Work Sans' }}>
                QWERTYS
              </span>
            </div>
            <div className="w-6" />
          </div>
        </div>
        
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;