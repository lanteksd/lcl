
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Package, ArrowRightLeft, 
  BarChart3, Settings, Menu, X, Pill, HeartHandshake, 
  Stethoscope, ClipboardList, ShoppingBag, Briefcase, 
  HeartPulse, FileText, Shield, UserCircle, LogOut, Building2
} from 'lucide-react';
import { ViewName } from '../types';

interface LayoutProps {
  currentView: ViewName;
  onNavigate: (view: ViewName) => void;
  children: React.ReactNode;
  institutionName?: string; // Novo Prop
  onLogout?: () => void; // Novo Prop
}

export const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, children, institutionName = 'LifeCare System', onLogout }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuItems: { id: ViewName; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
    { id: 'evolutions', label: 'Evoluções', icon: <FileText size={20} /> },
    { id: 'residents', label: 'Residentes', icon: <Users size={20} /> },
    { id: 'employees', label: 'Equipe', icon: <Briefcase size={20} /> },
    { id: 'demands', label: 'Demandas', icon: <ClipboardList size={20} /> },
    { id: 'admin-panel', label: 'Painel Adm', icon: <Shield size={20} /> },
    { id: 'medications', label: 'Medicamentos', icon: <Pill size={20} /> },
    { id: 'medical-care', label: 'Atend. Médico', icon: <Stethoscope size={20} /> },
    { id: 'technical-care', label: 'Atend. Técnico', icon: <HeartPulse size={20} /> },
    { id: 'inventory', label: 'Estoque Geral', icon: <Package size={20} /> },
    { id: 'operations', label: 'Movimentações', icon: <ArrowRightLeft size={20} /> },
    { id: 'personal-items', label: 'Itens Pessoais', icon: <ShoppingBag size={20} /> },
    { id: 'reports', label: 'Relatórios', icon: <BarChart3 size={20} /> },
    { id: 'settings', label: 'Configurações', icon: <Settings size={20} /> },
  ];

  const handleNav = (view: ViewName) => {
    onNavigate(view);
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden">
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-slate-200 flex flex-col
          transition-transform duration-300 ease-in-out shadow-xl md:shadow-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header - Instituição */}
        <div className="p-6 border-b border-slate-100 flex flex-col justify-center shrink-0 min-h-[90px]">
          <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-2">
                <div className="bg-primary-600 p-1.5 rounded-lg text-white">
                   <HeartHandshake size={20} />
                </div>
                <h1 className="text-lg font-bold text-slate-800 tracking-tight">LifeCare</h1>
             </div>
             {/* Mobile Close */}
             <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
               <X size={20} />
             </button>
          </div>
          
          {/* Institution Badge */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 flex items-center gap-2">
             <Building2 size={16} className="text-indigo-600 shrink-0" />
             <span className="text-xs font-bold text-indigo-900 leading-tight line-clamp-2" title={institutionName}>
                {institutionName}
             </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm
                ${currentView === item.id 
                  ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
           <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                 <UserCircle size={24} />
              </div>
              <div className="min-w-0">
                 <p className="text-sm font-bold text-slate-800 truncate">Administrador</p>
                 <p className="text-xs text-slate-500 truncate">Acesso Total</p>
              </div>
           </div>
           
           {onLogout && (
             <button 
               onClick={onLogout}
               className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 py-2 rounded-lg transition-colors"
             >
                <LogOut size={14} /> Trocar Conta / Sair
             </button>
           )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50 relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-white text-slate-800 p-4 flex justify-between items-center shadow-sm z-30 h-16 shrink-0 border-b border-slate-200">
          <div className="flex items-center gap-2">
             <div className="bg-primary-600 p-1.5 rounded text-white">
                <HeartHandshake size={20} />
             </div>
             <div className="flex flex-col">
                <h1 className="text-sm font-bold text-slate-800 leading-none">LifeCare</h1>
                <span className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">{institutionName}</span>
             </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto w-full pb-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
