import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, ClipboardCheck, Phone, AlertCircle, Glasses, Menu, X, Mail, FileBarChart, Settings, BarChart3, LogOut, User, Shield, UserSearch } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import NotificationCenter from './NotificationCenter';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, isAdmin, logout } = useAuth();

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Tableau de bord', allowedRoles: ['super_admin', 'admin', 'chef_projet', 'agent', 'programme', 'partenaire'] },
    { path: '/programmes', icon: FileText, label: 'Programmes', allowedRoles: ['super_admin', 'admin', 'chef_projet', 'agent', 'programme'] },
    { path: '/partenaires', icon: Users, label: 'Partenaires', allowedRoles: ['super_admin', 'admin', 'chef_projet', 'agent', 'partenaire'] },
    { path: '/identifiants', icon: UserSearch, label: 'Identifiants', allowedRoles: ['super_admin', 'admin', 'chef_projet', 'agent'] },
    { path: '/tests-site', icon: ClipboardCheck, label: 'Tests Site', allowedRoles: ['super_admin', 'admin', 'chef_projet', 'agent', 'programme', 'partenaire'] },
    { path: '/tests-ligne', icon: Phone, label: 'Tests Ligne', allowedRoles: ['super_admin', 'admin', 'chef_projet', 'agent', 'programme', 'partenaire'] },
    { path: '/alertes', icon: AlertCircle, label: 'Alertes', allowedRoles: ['super_admin', 'admin', 'chef_projet'] },
    { path: '/messagerie', icon: Mail, label: 'Messagerie', allowedRoles: ['super_admin', 'admin', 'chef_projet'], wip: true },
    { path: '/bilan-partenaire', icon: FileBarChart, label: 'Bilan Partenaire', allowedRoles: ['super_admin', 'admin', 'chef_projet', 'agent'], wip: true },
    { path: '/statistiques', icon: BarChart3, label: 'Statistiques', allowedRoles: ['super_admin', 'admin', 'chef_projet'] },
    { path: '/parametres', icon: Settings, label: 'Paramètres', allowedRoles: ['super_admin', 'admin', 'chef_projet'] },
    { path: '/connection-logs', icon: Shield, label: 'Logs Connexion', allowedRoles: ['super_admin'], superAdminOnly: true },
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
        bg-white border-r border-gray-200 flex flex-col
        transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'}
        w-64
      `}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-2">
                {/* Logo cliquable pour replier/déplier */}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="bg-red-600 p-2 rounded-lg hover:bg-red-700 transition-all hover:scale-110 active:scale-95 cursor-pointer group"
                  title="Replier le menu"
                >
                  <Glasses className="text-white transition-transform group-hover:rotate-12" size={24} />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-red-600" style={{ fontFamily: 'Work Sans' }}>
                    QWERTYS
                  </h1>
                  <p className="text-xs font-medium text-gray-700">HUB BLIND TESTS</p>
                </div>
              </div>
            ) : (
              /* Logo cliquable en mode replié */
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="bg-red-600 p-2 rounded-lg mx-auto hover:bg-red-700 transition-all hover:scale-110 active:scale-95 cursor-pointer group"
                title="Déplier le menu"
              >
                <Glasses className="text-white transition-transform group-hover:rotate-12" size={24} />
              </button>
            )}
            
            {/* Bouton fermer (mobile uniquement) */}
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
                    title={sidebarCollapsed ? item.label : ''}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                      active
                        ? 'bg-red-50 text-red-600 font-medium scale-105 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50 hover:scale-105 hover:translate-x-1'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  >
                    <Icon size={20} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.wip && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">
                            WIP
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-gray-200">
          {!sidebarCollapsed && (
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
          )}
          <Button
            variant="outline"
            className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'}`}
            title={sidebarCollapsed ? 'Déconnexion' : ''}
            onClick={() => {
              logout();
              navigate('/login');
              closeSidebar();
            }}
          >
            <LogOut size={16} className={sidebarCollapsed ? '' : 'mr-2'} />
            {!sidebarCollapsed && 'Déconnexion'}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        {/* Header (Mobile & Desktop) */}
        <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-700 hover:text-red-600"
            >
              <Menu size={24} />
            </button>
            
            {/* Logo (mobile only) */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="bg-red-600 p-1.5 rounded">
                <Glasses className="text-white" size={18} />
              </div>
              <span className="text-lg font-bold text-red-600" style={{ fontFamily: 'Work Sans' }}>
                QWERTYS
              </span>
            </div>
            
            {/* Spacer for desktop */}
            <div className="hidden md:block flex-1" />
            
            {/* Notification Center (visible pour admin et chef_projet uniquement) */}
            <div className="flex items-center gap-3">
              {(user?.role === 'admin' || user?.role === 'chef_projet') && (
                <NotificationCenter />
              )}
            </div>
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