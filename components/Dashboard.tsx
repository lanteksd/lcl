
import React, { useMemo, useRef } from 'react';
import { AppData } from '../types';
import { 
  AlertTriangle, 
  Package, 
  Users, 
  TrendingUp, 
  Clock, 
  HeartHandshake, 
  Activity,
  ArrowRightLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  Cake,
  Stethoscope,
  Calendar,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  User,
  HeartPulse,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Bell,
  MapPin,
  FileWarning,
  UserX,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardProps {
  data: AppData;
  onNavigate: (view: any) => void;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export const Dashboard: React.FC<DashboardProps> = ({ data, onNavigate }) => {
  const { products, residents, transactions, prescriptions, medicalAppointments, employees, timeSheets, technicalSessions, demands, houseDocuments } = data;
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const alertsScrollRef = useRef<HTMLDivElement>(null);

  // Staff Scroll
  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Alerts Scroll
  const scrollAlertsLeft = () => {
    if (alertsScrollRef.current) {
      alertsScrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollAlertsRight = () => {
    if (alertsScrollRef.current) {
      alertsScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // --- STATS CALCULATIONS ---

  const today = new Date().toISOString().split('T')[0];
  const currentDayNumber = new Date().getDate();
  const currentMonth = new Date().getMonth() + 1;
  const currentMonthISO = new Date().toISOString().slice(0, 7);

  // 1. Critical Metrics
  const lowStockItems = products.filter(p => p.currentStock < 20 || p.currentStock <= p.minStock);
  
  // Resident Counts
  const activeResidentsCount = residents.filter(r => r.active).length;
  const inactiveResidentsCount = residents.filter(r => !r.active).length;
  const totalResidentsCount = residents.length;

  const activePrescriptions = prescriptions?.filter(p => p.active).length || 0;
  
  // 2. Today's Activity
  const todayTransactions = transactions.filter(t => t.date === today);
  const itemsUsedToday = todayTransactions.filter(t => t.type === 'OUT').length;
  const itemsRestockedToday = todayTransactions.filter(t => t.type === 'IN').length;

  // 3. Staff on Duty (Plantão de Hoje)
  const staffOnDuty = useMemo(() => {
    return (employees || []).filter(emp => 
      emp.active && (timeSheets || []).some(ts => ts.date === today && ts.employeeId === emp.id && ts.present)
    );
  }, [employees, timeSheets, today]);

  // 4. Technical Care Progress (Meta Mensal)
  const technicalProgress = useMemo(() => {
     // 5 áreas técnicas principais
     const totalExpectedSessions = activeResidentsCount * 5; 
     const completedSessions = (technicalSessions || []).filter(s => 
        s.date.startsWith(currentMonthISO) && s.status === 'CONCLUIDO'
     ).length;
     
     const percentage = totalExpectedSessions > 0 ? Math.round((completedSessions / totalExpectedSessions) * 100) : 0;
     return { completed: completedSessions, total: totalExpectedSessions, percentage };
  }, [activeResidentsCount, technicalSessions, currentMonthISO]);

  // 5. Pending Demands
  const pendingDemandsCount = (demands || []).filter(d => d.status === 'PENDENTE').length;
  const inProgressDemandsCount = (demands || []).filter(d => d.status === 'EM_ANDAMENTO').length;

  // 6. Last 5 Activity Feed
  const recentActivity = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id))
    .slice(0, 5);

  // 7. Consumption by Category
  const categoryStats = useMemo(() => {
     const stats: Record<string, number> = {};
     transactions.filter(t => t.type === 'OUT').forEach(t => {
        const prod = products.find(p => p.id === t.productId);
        const cat = prod?.category || 'Outros';
        stats[cat] = (stats[cat] || 0) + t.quantity;
     });
     
     return Object.entries(stats)
       .map(([name, value]) => ({ name: name.split(' ')[0], fullName: name, value }))
       .sort((a, b) => b.value - a.value)
       .slice(0, 5);
  }, [transactions, products]);

  // 8. Weekly Trend
  const weeklyTrend = useMemo(() => {
    const last7Days = new Array(7).fill(0).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const count = transactions.filter(t => t.type === 'OUT' && t.date === date).reduce((acc, t) => acc + t.quantity, 0);
      return { date: date.split('-').slice(1).join('/'), count };
    });
  }, [transactions]);

  // 9. Birthdays
  const birthdayResidents = useMemo(() => {
    const currentYear = new Date().getFullYear();
    
    return residents
      .filter(r => r.active && r.birthDate)
      .filter(r => {
        const [, month] = r.birthDate.split('-').map(Number);
        return month === currentMonth;
      })
      .map(r => {
        const [year, , day] = r.birthDate.split('-').map(Number);
        const ageTurning = currentYear - year;
        return { ...r, day, ageTurning };
      })
      .sort((a, b) => a.day - b.day);
  }, [residents, currentMonth]);

  // 10. Appointments
  const pendingAppointments = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return (medicalAppointments || [])
      .filter(a => a.status === 'AGENDADO' && new Date(a.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [medicalAppointments]);

  // --- NEW: DAILY ALERT BOARD LOGIC ---
  const todaysAlerts = useMemo(() => {
    const alerts: Array<{ type: 'BIRTHDAY' | 'APPOINTMENT' | 'DOC_EXPIRATION' | 'RESIDENT_DOC', title: string, subtitle: string, time?: string, id: string, icon: any, color: string }> = [];

    // 1. Today's Birthdays
    birthdayResidents.forEach(r => {
      if (r.day === currentDayNumber) {
        alerts.push({
          id: `bd_${r.id}`,
          type: 'BIRTHDAY',
          title: `Aniversário: ${r.name.split(' ')[0]}`,
          subtitle: `Completando ${r.ageTurning} anos hoje!`,
          icon: Cake,
          color: 'text-pink-600 bg-pink-100'
        });
      }
    });

    // 2. Today's Appointments
    (medicalAppointments || []).forEach(app => {
      if (app.date === today && app.status === 'AGENDADO') {
        const resident = residents.find(r => r.id === app.residentId);
        alerts.push({
          id: `app_${app.id}`,
          type: 'APPOINTMENT',
          title: `${app.time} - ${getResidentFirstName(resident?.name || 'Residente')}`,
          subtitle: `${app.type}: ${app.specialty} ${app.location ? `(${app.location})` : ''}`,
          time: app.time,
          icon: Stethoscope,
          color: app.type === 'URGENCIA' ? 'text-red-600 bg-red-100' : 'text-blue-600 bg-blue-100'
        });
      }
    });

    // 3. Document Expirations (Alvará, AVCB, etc.) - Alert 30 days before
    (houseDocuments || []).forEach(doc => {
        if (!doc.expirationDate) return;
        const expDate = new Date(doc.expirationDate);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0); // Start of today

        // Difference in time
        const diffTime = expDate.getTime() - todayDate.getTime();
        // Difference in days
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) {
            let title = '';
            let subtitle = '';
            let color = '';

            if (diffDays < 0) {
                title = `VENCEU: ${doc.name}`;
                subtitle = `Documento vencido há ${Math.abs(diffDays)} dias!`;
                color = 'text-red-600 bg-red-100 border-red-200';
            } else if (diffDays === 0) {
                title = `VENCE HOJE: ${doc.name}`;
                subtitle = `Renove agora mesmo!`;
                color = 'text-red-600 bg-red-100 border-red-200 animate-pulse';
            } else {
                title = `Vence em breve: ${doc.name}`;
                subtitle = `Faltam ${diffDays} dias para o vencimento.`;
                color = 'text-orange-600 bg-orange-100 border-orange-200';
            }

            alerts.push({
                id: `doc_${doc.id}`,
                type: 'DOC_EXPIRATION',
                title: title,
                subtitle: subtitle,
                icon: FileWarning,
                color: color
            });
        }
    });

    // 4. RESIDENT DOCUMENTS (LAUDO) EXPIRATION
    // Check active residents for Laudo validity (180 days)
    residents.forEach(resident => {
        if (!resident.active) return;

        const laudo = resident.documents?.find(d => d.type === 'LAUDO');
        
        if (laudo) {
            // Uses issueDate if available, otherwise fallback to date (upload date)
            const dateStr = laudo.issueDate || laudo.date;
            if (dateStr) {
                const issueDate = new Date(dateStr);
                const expirationDate = new Date(issueDate);
                expirationDate.setDate(expirationDate.getDate() + 180); // Validity 180 days

                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);
                expirationDate.setHours(0, 0, 0, 0);

                const diffTime = expirationDate.getTime() - todayDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 30) {
                    let title = '';
                    let subtitle = '';
                    let color = '';

                    if (diffDays < 0) {
                        title = `LAUDO VENCIDO: ${getResidentFirstName(resident.name)}`;
                        subtitle = `Venceu há ${Math.abs(diffDays)} dias. Renovar urgente!`;
                        color = 'text-red-700 bg-red-100 border-red-300';
                    } else if (diffDays === 0) {
                        title = `LAUDO VENCE HOJE: ${getResidentFirstName(resident.name)}`;
                        subtitle = `O laudo médico expira hoje.`;
                        color = 'text-red-600 bg-red-100 border-red-200 animate-pulse';
                    } else {
                        title = `Laudo vence em ${diffDays} dias`;
                        subtitle = `Residente: ${getResidentFirstName(resident.name)}. Providenciar renovação.`;
                        color = 'text-amber-700 bg-amber-100 border-amber-200';
                    }

                    alerts.push({
                        id: `res_doc_${resident.id}`,
                        type: 'RESIDENT_DOC',
                        title: title,
                        subtitle: subtitle,
                        icon: FileText,
                        color: color
                    });
                }
            }
        }
    });

    // Sort priority: Resident Docs/House Docs (Critical) > Birthdays > Appointments
    return alerts.sort((a, b) => {
      const isDocA = a.type === 'DOC_EXPIRATION' || a.type === 'RESIDENT_DOC';
      const isDocB = b.type === 'DOC_EXPIRATION' || b.type === 'RESIDENT_DOC';
      
      if (isDocA && !isDocB) return -1;
      if (isDocB && !isDocA) return 1;
      
      if (a.type === 'BIRTHDAY') return -1;
      if (b.type === 'BIRTHDAY') return 1;
      
      return (a.time || '').localeCompare(b.time || '');
    });
  }, [birthdayResidents, medicalAppointments, today, residents, currentDayNumber, houseDocuments]);

  function getResidentFirstName(fullName: string) {
    return fullName.split(' ')[0];
  }

  const monthName = new Date().toLocaleString('pt-BR', { month: 'long' });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);


  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header Section with Alert Board */}
      <div className="flex flex-col xl:flex-row justify-between items-stretch gap-6 mb-6">
         {/* Greeting */}
         <div className="shrink-0 flex flex-col justify-center">
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
               <HeartHandshake className="text-primary-600" size={32} />
               Bom dia, Equipe
            </h1>
            <p className="text-slate-500 mt-1">Visão geral operacional e de cuidados.</p>
         </div>

         {/* --- QUADRO DE ALERTA (NEW ALERT BOARD) --- */}
         <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[90px]">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-orange-400 to-pink-500"></div>
            
            {todaysAlerts.length > 0 ? (
              <div className="flex items-center h-full px-4 py-2">
                 <div className="mr-4 pr-4 border-r border-slate-100 hidden sm:flex flex-col items-center justify-center text-orange-500 shrink-0">
                    <Bell className="animate-pulse" size={24} />
                    <span className="text-[10px] font-bold uppercase mt-1">Avisos</span>
                 </div>
                 
                 <div className="flex-1 relative group flex items-center overflow-hidden">
                    {/* Alert Navigation Arrows */}
                    {todaysAlerts.length > 2 && (
                       <>
                         <button 
                           onClick={scrollAlertsLeft}
                           className="absolute left-0 z-20 bg-white/90 border border-slate-200 rounded-full p-1.5 shadow-sm text-slate-500 hover:text-primary-600 hidden md:flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-white"
                         >
                            <ChevronLeft size={16} />
                         </button>
                         <button 
                           onClick={scrollAlertsRight}
                           className="absolute right-0 z-20 bg-white/90 border border-slate-200 rounded-full p-1.5 shadow-sm text-slate-500 hover:text-primary-600 hidden md:flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-white"
                         >
                            <ChevronRight size={16} />
                         </button>
                       </>
                    )}

                    <div 
                        ref={alertsScrollRef}
                        className="flex-1 overflow-x-auto hide-scrollbar flex gap-3 items-center scroll-smooth px-1"
                    >
                        {todaysAlerts.map(alert => (
                           <div key={alert.id} className="flex items-center gap-3 bg-slate-50 p-2 pr-4 rounded-lg border border-slate-100 shrink-0 min-w-[200px] hover:shadow-md transition-shadow">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${alert.color}`}>
                                 <alert.icon size={18} />
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-slate-800 leading-tight">{alert.title}</p>
                                 <p className="text-xs text-slate-500 truncate max-w-[180px]" title={alert.subtitle}>{alert.subtitle}</p>
                              </div>
                           </div>
                        ))}
                    </div>
                 </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 h-full px-6 py-4 text-slate-400 bg-slate-50/50">
                 <CheckCircle2 size={24} className="text-green-400" />
                 <div>
                    <p className="font-bold text-slate-600">Dia Tranquilo</p>
                    <p className="text-xs">Nenhum aniversário, consulta ou documento a vencer.</p>
                 </div>
              </div>
            )}
         </div>

         {/* Date Display */}
         <div className="text-right hidden xl:flex flex-col justify-center shrink-0 min-w-[150px]">
            <p className="text-2xl font-bold text-slate-700 capitalize">{new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
            <p className="text-slate-400">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
         </div>
      </div>

      {/* Main Stats Grid - KPIs - COMPACT SIZE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Residents */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-200 cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => onNavigate('residents')}>
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-blue-100 text-sm font-medium mb-1">Residentes Ativos</p>
                 <h3 className="text-3xl font-bold">{activeResidentsCount}</h3>
              </div>
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm h-fit">
                 <Users size={24} className="text-white" />
              </div>
           </div>
           
           {/* Seção Inativos / Total */}
           <div className="flex gap-4 mt-2 border-t border-blue-400/30 pt-2">
              <div>
                 <span className="text-xs text-blue-200 block uppercase font-bold flex items-center gap-1"><UserX size={10}/> Inativos</span>
                 <span className="text-lg font-bold">{inactiveResidentsCount}</span>
              </div>
              <div className="border-l border-blue-400/30 pl-4">
                 <span className="text-xs text-blue-200 block uppercase font-bold">Total Geral</span>
                 <span className="text-lg font-bold">{totalResidentsCount}</span>
              </div>
           </div>

           <div className="mt-1 text-xs text-blue-200 flex items-center gap-1 opacity-80">
              <Activity size={12} /> {activePrescriptions} prescrições ativas
           </div>
        </div>

        {/* Inventory Alert */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-lg shadow-slate-100 cursor-pointer hover:border-red-200 transition-all hover:scale-[1.02]" onClick={() => onNavigate('inventory')}>
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-slate-500 text-sm font-medium mb-1">Alertas de Estoque</p>
                 <h3 className={`text-3xl font-bold ${lowStockItems.length > 0 ? 'text-red-500' : 'text-slate-800'}`}>{lowStockItems.length}</h3>
              </div>
              <div className={`p-2 rounded-lg ${lowStockItems.length > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                 <AlertTriangle size={24} />
              </div>
           </div>
           <p className="mt-2 text-sm text-slate-400">Produtos abaixo do mínimo</p>
        </div>

        {/* Demandas Alert */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-lg shadow-slate-100 cursor-pointer hover:border-amber-200 transition-all hover:scale-[1.02]" onClick={() => onNavigate('demands')}>
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-slate-500 text-sm font-medium mb-1">Demandas Pendentes</p>
                 <h3 className={`text-3xl font-bold ${pendingDemandsCount > 0 ? 'text-amber-500' : 'text-slate-800'}`}>{pendingDemandsCount}</h3>
              </div>
              <div className={`p-2 rounded-lg ${pendingDemandsCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                 <ClipboardList size={24} />
              </div>
           </div>
           <p className="mt-2 text-sm text-slate-500 flex items-center gap-1">
             <Clock size={14} className="text-blue-500"/> {inProgressDemandsCount} em andamento
           </p>
        </div>

        {/* Appointments Alert */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-lg shadow-slate-100 cursor-pointer hover:border-pink-200 transition-all hover:scale-[1.02]" onClick={() => onNavigate('medical-care')}>
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-slate-500 text-sm font-medium mb-1">Agendamentos</p>
                 <h3 className={`text-3xl font-bold ${pendingAppointments.length > 0 ? 'text-pink-600' : 'text-slate-800'}`}>{pendingAppointments.length}</h3>
              </div>
              <div className={`p-2 rounded-lg ${pendingAppointments.length > 0 ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-400'}`}>
                 <Stethoscope size={24} />
              </div>
           </div>
           <p className="mt-2 text-sm text-slate-400">Consultas/Exames futuros</p>
        </div>
      </div>

      {/* --- OPERATIONAL STATUS SECTION (NEW) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Staff on Duty */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:col-span-2 relative">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <Briefcase size={20} className="text-primary-600" />
                   Equipe no Plantão (Hoje)
                </h3>
                <button onClick={() => onNavigate('employees')} className="text-sm text-primary-600 font-bold hover:underline">
                   Gerenciar Escala
                </button>
             </div>
             {staffOnDuty.length > 0 ? (
                <div className="relative group px-1">
                   <button 
                     onClick={scrollLeft}
                     className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 z-10 bg-white border border-slate-200 rounded-full p-1.5 shadow-md text-slate-500 hover:text-primary-600 hover:border-primary-300 hidden md:flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                   >
                      <ChevronLeft size={18} />
                   </button>

                   <div 
                     ref={scrollRef}
                     className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar scroll-smooth"
                   >
                      {staffOnDuty.map(emp => (
                         <div key={emp.id} className="flex items-center gap-3 bg-slate-50 p-2 pr-4 rounded-xl border border-slate-100 shrink-0 select-none">
                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 overflow-hidden">
                               {emp.photo ? <img src={emp.photo} className="w-full h-full object-cover" /> : <User size={20} className="m-auto mt-2 text-slate-300" />}
                            </div>
                            <div>
                               <p className="text-sm font-bold text-slate-700">{emp.name.split(' ')[0]}</p>
                               <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">{emp.role}</p>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                         </div>
                      ))}
                   </div>

                   <button 
                     onClick={scrollRight}
                     className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 z-10 bg-white border border-slate-200 rounded-full p-1.5 shadow-md text-slate-500 hover:text-primary-600 hover:border-primary-300 hidden md:flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                   >
                      <ChevronRight size={18} />
                   </button>
                </div>
             ) : (
                <div className="bg-orange-50 text-orange-700 p-4 rounded-xl text-sm flex items-center gap-2">
                   <AlertTriangle size={18} />
                   Nenhum membro da equipe marcou presença hoje ainda.
                </div>
             )}
          </div>

          {/* Technical Progress */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
             <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <HeartPulse size={20} className="text-pink-600" />
                   Meta Técnica ({monthName})
                </h3>
                <span className="text-xs font-bold text-slate-500">{technicalProgress.completed}/{technicalProgress.total}</span>
             </div>
             
             <div className="relative pt-1">
               <div className="flex mb-2 items-center justify-between">
                 <div>
                   <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-pink-600 bg-pink-200">
                     Progresso
                   </span>
                 </div>
                 <div className="text-right">
                   <span className="text-xs font-semibold inline-block text-pink-600">
                     {technicalProgress.percentage}%
                   </span>
                 </div>
               </div>
               <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-pink-100">
                 <div style={{ width: `${technicalProgress.percentage}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-pink-500 transition-all duration-1000"></div>
               </div>
             </div>
             <p className="text-xs text-slate-400 mt-auto">Atendimentos multidisciplinares realizados vs esperados.</p>
          </div>
      </div>

      {/* Charts & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Left Column: Charts */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* Weekly Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                  <Activity className="text-primary-500" /> Fluxo de Consumo (7 Dias)
               </h3>
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={weeklyTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Category Pie Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="font-bold text-lg text-slate-800 mb-4">Top Categorias de Consumo</h3>
               <div className="flex flex-col md:flex-row items-center">
                  <div className="h-48 w-48 shrink-0">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                              data={categoryStats}
                              innerRadius={40}
                              outerRadius={70}
                              paddingAngle={5}
                              dataKey="value"
                           >
                              {categoryStats.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                           </Pie>
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="flex-1 w-full pl-0 md:pl-8 space-y-3">
                     {categoryStats.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                              <span className="text-sm font-medium text-slate-600 truncate max-w-[150px]">{entry.fullName}</span>
                           </div>
                           <span className="font-bold text-slate-800">{entry.value} un.</span>
                        </div>
                     ))}
                     {categoryStats.length === 0 && <p className="text-slate-400 italic">Sem dados suficientes.</p>}
                  </div>
               </div>
            </div>
         </div>

         {/* Right Column: Birthdays & Appointments & Activity */}
         <div className="flex flex-col gap-6 h-full">
            
            {/* Upcoming Appointments */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                  <Calendar className="text-pink-500" /> Próximos Agendamentos
               </h3>
               <div className="space-y-3 max-h-60 overflow-y-auto">
                  {pendingAppointments.slice(0, 5).map(app => {
                    const resident = residents.find(r => r.id === app.residentId);
                    return (
                      <div key={app.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-slate-700 text-sm">{resident?.name.split(' ')[0]}</span>
                            <span className="text-[10px] font-bold bg-white border px-1.5 rounded text-slate-500">{app.date.split('-').reverse().join('/').slice(0,5)}</span>
                         </div>
                         <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock size={10} /> {app.time} • {app.type}
                         </div>
                         <div className="text-xs font-medium text-pink-600 mt-1 flex items-center gap-1">
                            {app.location && <MapPin size={10} />}
                            {app.specialty}
                         </div>
                      </div>
                    );
                  })}
                  {pendingAppointments.length === 0 && (
                     <div className="text-center py-6 text-slate-400">
                        <p>Nenhum agendamento futuro.</p>
                     </div>
                  )}
               </div>
               <button onClick={() => onNavigate('medical-care')} className="mt-3 w-full py-2 text-xs font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors">
                  Ver Agenda Completa
               </button>
            </div>

            {/* Birthday Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                <Cake className="text-pink-500" /> Aniversariantes de {capitalizedMonth}
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                 {birthdayResidents.map(r => {
                   const isToday = r.day === currentDayNumber;
                   return (
                     <div 
                       key={r.id} 
                       className={`flex items-center gap-3 p-2 rounded-lg transition-all border ${
                         isToday 
                           ? 'bg-pink-50 border-pink-200 shadow-sm transform scale-[1.02]' 
                           : 'hover:bg-slate-50 border-transparent hover:border-slate-100'
                       }`}
                     >
                        <div className="w-10 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                           {r.photo ? (
                             <img src={r.photo} className="w-full h-full object-cover" />
                           ) : (
                             <Users size={16} className="m-auto mt-3 text-slate-300" />
                           )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold leading-tight flex items-center gap-1 ${isToday ? 'text-pink-700' : 'text-slate-700'}`}>
                             {r.name.split(' ')[0]} {r.name.split(' ')[1]?.charAt(0)}.
                             {isToday && <PartyPopper size={14} className="text-pink-500 animate-bounce" />}
                          </p>
                          <p className={`text-xs font-medium ${isToday ? 'text-pink-600' : 'text-pink-600'}`}>
                             {r.ageTurning} anos
                          </p>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded-lg flex flex-col items-center ${isToday ? 'bg-pink-500 text-white shadow-sm' : 'bg-pink-50 text-pink-600'}`}>
                          <span>{r.day}/{new Date().getMonth()+1}</span>
                          {isToday && <span className="text-[8px] uppercase tracking-wider leading-none mt-0.5">Hoje</span>}
                        </div>
                     </div>
                   );
                 })}
                 {birthdayResidents.length === 0 && (
                   <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                     <p>Nenhum aniversariante em {capitalizedMonth.toLowerCase()}.</p>
                   </div>
                 )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1">
               <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                  <Clock className="text-slate-400" /> Atividade Recente
               </h3>
               
               <div className="flex-1 space-y-6">
                  {recentActivity.map((t, i) => (
                     <div key={i} className="flex gap-4 relative">
                        {i !== recentActivity.length - 1 && (
                           <div className="absolute left-[19px] top-8 bottom-[-24px] w-0.5 bg-slate-100"></div>
                        )}
                        
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${t.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                           {t.type === 'IN' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                        </div>
                        <div>
                           <p className="text-sm font-bold text-slate-800">{t.productName}</p>
                           <p className="text-xs text-slate-500 mt-0.5">
                              {t.type === 'IN' ? 'Entrada de' : 'Uso de'} <span className="font-bold">{t.quantity}</span> • {t.residentName || 'Geral'}
                           </p>
                           <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{t.date}</p>
                        </div>
                     </div>
                  ))}
                  
                  {recentActivity.length === 0 && (
                     <div className="text-center py-12 text-slate-400">
                        <p>Nenhuma atividade registrada.</p>
                     </div>
                  )}
               </div>

               <button onClick={() => onNavigate('operations')} className="mt-6 w-full py-2 bg-slate-50 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 border border-slate-100 transition-colors">
                  Nova Movimentação
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};
