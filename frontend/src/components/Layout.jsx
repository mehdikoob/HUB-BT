import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, ClipboardCheck, Phone, AlertCircle, Glasses, Menu, X, Mail, FileBarChart, Settings, BarChart3, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Tableau de bord', allowedRoles: ['admin', 'agent', 'programme', 'partenaire'] },
    { path: '/programmes', icon: FileText, label: 'Programmes', allowedRoles: ['admin', 'agent', 'programme'] },
    { path: '/partenaires', icon: Users, label: 'Partenaires', allowedRoles: ['admin', 'agent', 'partenaire'] },
    { path: '/tests-site', icon: ClipboardCheck, label: 'Tests Site', allowedRoles: ['admin', 'agent', 'programme', 'partenaire'] },
    { path: '/tests-ligne', icon: Phone, label: 'Tests Ligne', allowedRoles: ['admin', 'agent', 'programme', 'partenaire'] },
    { path: '/incidents', icon: AlertCircle, label: 'Incidents', allowedRoles: ['admin'] },
    { path: '/messagerie', icon: Mail, label: 'Messagerie', allowedRoles: ['admin'] },
    { path: '/bilan-partenaire', icon: FileBarChart, label: 'Bilan Partenaire', allowedRoles: ['admin', 'agent'] },
    { path: '/statistiques', icon: BarChart3, label: 'Statistiques', allowedRoles: ['admin'] },
    { path: '/parametres', icon: Settings, label: 'Paramètres', allowedRoles: ['admin'] },
  ];

  const visibleMenuItems = menuItems.filter(item => 
    item.allowedRoles.includes(user?.role)
  );

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
        
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {visibleMenuItems.map((item) => {
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

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <User size={16} className="text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              logout();
              navigate('/login');
              closeSidebar();
            }}
          >
            <LogOut size={16} className="mr-2" />
            Déconnexion
          </Button>
        </div>
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