
import React, { useState, useMemo } from 'react';
import { AppData, EvolutionRecord, EvolutionRole, Resident } from '../types';
import { FileText, Calendar, Upload, CheckCircle2, AlertCircle, Eye, Trash2, Send, Filter, Check, X, User, MessageCircle, Loader2, Search, ClipboardPaste, AlignLeft, ListFilter } from 'lucide-react';
import { PROFESSIONAL_AREAS } from '../constants';

interface EvolutionsProps {
  data: AppData;
  onSaveEvolution: (records: EvolutionRecord[]) => void;
  onDeleteEvolution: (id: string) => void;
}

const ROLES_DAILY: { label: string, value: EvolutionRole }[] = [
  { label: 'Técnico de Enfermagem', value: 'TEC_ENFERMAGEM' },
  { label: 'Enfermeira Chefe', value: 'ENFERMEIRA' }
];

const ROLES_MONTHLY = PROFESSIONAL_AREAS.map(area => ({
  label: area.replace('_', ' '),
  value: area
}));

export const Evolutions: React.FC<EvolutionsProps> = ({ data, onSaveEvolution, onDeleteEvolution }) => {
  const [activeTab, setActiveTab] = useState<'DIARIO' | 'MENSAL'>('DIARIO');
  
  // State for Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedArea, setSelectedArea] = useState<EvolutionRole>(ROLES_MONTHLY[0].value);
  const [hideCompleted, setHideCompleted] = useState(false);

  // State for Input Modal
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [uploadTargetRole, setUploadTargetRole] = useState<EvolutionRole>('TEC_ENFERMAGEM');
  const [selectedResidentsForSave, setSelectedResidentsForSave] = useState<string[]>([]);
  const [residentsFoundCount, setResidentsFoundCount] = useState<number | null>(null);

  // State for Notification Modal
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);

  // State for Viewing Content
  const [viewingContent, setViewingContent] = useState<{ type: 'TEXT' | 'PDF', content: string, title: string } | null>(null);

  // Computed Data
  const activeResidents = useMemo(() => 
    (data.residents || []).filter(r => r.active).sort((a, b) => a.name.localeCompare(b.name)), 
  [data.residents]);

  const evolutions = useMemo(() => data.evolutions || [], [data.evolutions]);

  // --- HELPERS ---

  const getStatus = (residentId: string, role: EvolutionRole, dateKey: string) => {
    // dateKey is either YYYY-MM-DD (daily) or YYYY-MM (monthly)
    return evolutions.find(e => 
      e.residentId === residentId && 
      e.role === role && 
      e.date.startsWith(dateKey)
    );
  };

  // Normaliza string para comparação (remove acentos, espaços extras, lower case)
  const normalizeText = (text: string) => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, ' ') // Substitui múltiplos espaços por um único
      .replace(/[^\w\s]/g, '') // Remove caracteres não alfanuméricos
      .trim();
  };

  const handleProcessText = () => {
    if (!pastedText) return;

    setResidentsFoundCount(null);
    setSelectedResidentsForSave([]);

    const normalizedContent = normalizeText(pastedText);
    const foundResidentIds: string[] = [];
    const dateKey = activeTab === 'DIARIO' ? selectedDate : selectedMonth;

    activeResidents.forEach(res => {
        const normalizedName = normalizeText(res.name);
        
        // Proteção: Nomes muito curtos podem gerar falso positivo
        // Usamos Regex com boundary (\b) para garantir que é a palavra inteira ou parte significativa
        const safeName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${safeName}\\b`, 'i');

        // Estratégia de fallback: Se o nome completo não for encontrado, tenta primeiro nome + último nome
        let match = regex.test(normalizedContent);
        
        if (!match) {
           const parts = normalizedName.split(' ');
           if (parts.length > 2) {
              const shortName = `${parts[0]} ${parts[parts.length-1]}`;
              const shortRegex = new RegExp(`\\b${shortName}\\b`, 'i');
              match = shortRegex.test(normalizedContent);
           }
        }

        if (match) {
          // Lógica de Filtro: Só adiciona se estiver PENDENTE
          const isAlreadyDone = getStatus(res.id, uploadTargetRole, dateKey);
          if (!isAlreadyDone) {
             foundResidentIds.push(res.id);
          }
        }
    });

    setSelectedResidentsForSave(foundResidentIds);
    setResidentsFoundCount(foundResidentIds.length);
  };

  const handleConfirmSave = () => {
    if (!pastedText && selectedResidentsForSave.length === 0) return;
    
    // Check duplication warning
    const duplicates = selectedResidentsForSave.filter(id => {
       const dateKey = activeTab === 'DIARIO' ? selectedDate : selectedMonth;
       return getStatus(id, uploadTargetRole, dateKey);
    });

    if (duplicates.length > 0) {
       if(!confirm(`Atenção: ${duplicates.length} residentes já possuem evolução registrada para esta data/cargo. Deseja sobrescrever?`)) {
         return;
       }
    }

    const records: EvolutionRecord[] = selectedResidentsForSave.map(resId => ({
      id: crypto.randomUUID(),
      residentId: resId,
      date: activeTab === 'DIARIO' ? selectedDate : `${selectedMonth}-01`,
      type: activeTab === 'DIARIO' ? 'DIARIA' : 'MENSAL',
      role: uploadTargetRole,
      filePdfBase64: undefined, // ALTERADO: O texto é descartado para não pesar o backup
      fileName: 'Processado via Texto (Conteúdo descartado)', 
      createdAt: new Date().toISOString()
    }));

    onSaveEvolution(records);
    setIsInputModalOpen(false);
    setPastedText('');
    setUploadTargetRole('TEC_ENFERMAGEM');
    setResidentsFoundCount(null);
  };

  const toggleResidentSelection = (id: string) => {
    setSelectedResidentsForSave(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // --- ACTIONS ---
  
  const handleClearMonthRole = (role: EvolutionRole) => {
    const recordsToDelete = evolutions.filter(e => 
      e.role === role && 
      e.date.startsWith(selectedMonth)
    );

    if (recordsToDelete.length === 0) {
        alert("Não há registros para limpar neste mês/categoria.");
        return;
    }

    if (confirm(`ATENÇÃO: Deseja apagar TODAS as ${recordsToDelete.length} evoluções de ${role.replace('_', ' ')} referentes a ${selectedMonth}?`)) {
       recordsToDelete.forEach(r => onDeleteEvolution(r.id));
    }
  };

  // --- NOTIFICATION LOGIC (IMPROVED) ---
  const notificationsList = useMemo(() => {
    const list: { profName: string; phone: string; area: string; missingNames: string[] }[] = [];
    
    // CASO 1: NOTIFICAÇÃO DIÁRIA (Focado na Equipe Interna / Plantão)
    if (activeTab === 'DIARIO') {
        // --- PARTE A: TÉCNICOS DE ENFERMAGEM ---
        const missingResidentsTec = activeResidents.filter(res => !getStatus(res.id, 'TEC_ENFERMAGEM', selectedDate)).map(r => r.name);

        if (missingResidentsTec.length > 0) {
            const techEmployees = (data.employees || []).filter(emp => emp.active && emp.role === 'TEC ENFERMAGEM');
            const onDutyTechs = techEmployees.filter(tech => 
                (data.timeSheets || []).some(ts => ts.date === selectedDate && ts.employeeId === tech.id && ts.present)
            );
            const targetTechs = onDutyTechs.length > 0 ? onDutyTechs : techEmployees;
            const statusLabel = onDutyTechs.length > 0 ? 'NO PLANTÃO' : 'CADASTRO GERAL';

            targetTechs.forEach(tech => {
                list.push({
                    profName: tech.name,
                    phone: tech.phone || '',
                    area: `TÉCNICO (${statusLabel})`,
                    missingNames: missingResidentsTec
                });
            });
        }

        // --- PARTE B: ENFERMEIRA (NOVA LÓGICA) ---
        const missingResidentsEnf = activeResidents.filter(res => !getStatus(res.id, 'ENFERMEIRA', selectedDate)).map(r => r.name);

        if (missingResidentsEnf.length > 0) {
            // Identificar Funcionários com cargo "ENFERMEIRA"
            const nurseEmployees = (data.employees || []).filter(emp => emp.active && emp.role === 'ENFERMEIRA');
            
            // Filtrar quem está DE PLANTÃO
            const onDutyNurses = nurseEmployees.filter(nurse => 
                (data.timeSheets || []).some(ts => ts.date === selectedDate && ts.employeeId === nurse.id && ts.present)
            );

            // Fallback
            const targetNurses = onDutyNurses.length > 0 ? onDutyNurses : nurseEmployees;
            const statusLabel = onDutyNurses.length > 0 ? 'NO PLANTÃO' : 'CADASTRO GERAL';

            targetNurses.forEach(nurse => {
                list.push({
                    profName: nurse.name,
                    phone: nurse.phone || '',
                    area: `ENFERMEIRA (${statusLabel})`,
                    missingNames: missingResidentsEnf
                });
            });
        }
    } 
    
    // CASO 2: NOTIFICAÇÃO MENSAL (Focado nos Profissionais Externos / Demandas)
    else {
        const missingByArea: Record<string, Set<string>> = {};
        
        ROLES_MONTHLY.forEach(role => {
            activeResidents.forEach(res => {
                const isDone = getStatus(res.id, role.value, selectedMonth);
                if (!isDone) {
                    if (!missingByArea[role.value]) missingByArea[role.value] = new Set();
                    missingByArea[role.value].add(res.name);
                }
            });
        });

        (data.professionals || []).forEach(prof => {
            const missingSet = missingByArea[prof.area];
            if (missingSet && missingSet.size > 0) {
                list.push({
                    profName: prof.name,
                    phone: prof.phone,
                    area: prof.area,
                    missingNames: Array.from(missingSet)
                });
            }
        });
    }

    return list;
  }, [activeTab, selectedDate, selectedMonth, activeResidents, evolutions, data.professionals, data.employees, data.timeSheets]);

  const generateWhatsAppLink = (item: { profName: string; phone: string; area: string; missingNames: string[] }) => {
      const phone = item.phone.replace(/\D/g, '');
      if (!phone) return null;
      const fullPhone = phone.length <= 11 ? `55${phone}` : phone;
      
      let message = '';

      if (activeTab === 'DIARIO') {
          // Mensagem Específica para Plantonistas
          const formattedDate = selectedDate.split('-').reverse().join('/');
          message = `Olá *${item.profName}*, aqui é da administração.\n\n`;
          message += `Estamos verificando as *evoluções do plantão de hoje (${formattedDate})*.\n\n`;
          message += `Notamos pendências na categoria *${item.area.split('(')[0].trim()}*.\n`;
          message += `Os seguintes residentes ainda não possuem evolução registrada:\n`;
      } else {
          // Mensagem para Profissionais Multidisciplinares (Mensal)
          const formattedDate = selectedMonth.split('-').reverse().join('/');
          const areaName = item.area.replace('_', ' ');
          message = `Olá *${item.profName}* (${areaName}), tudo bem?\n\n`;
          message += `Notamos pendências nas *evoluções mensais de ${formattedDate}*.\n\n`;
          message += `Residentes aguardando registro:\n`;
      }
      
      // SHOW ALL NAMES (No limit)
      item.missingNames.forEach(name => {
          message += `- ${name}\n`;
      });

      message += `\nPor favor, regularize assim que possível.\nObrigado!`;
      
      return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleViewContent = (record: EvolutionRecord) => {
     if (!record.filePdfBase64) return;
     
     const isPdf = record.filePdfBase64.startsWith('data:application/pdf');
     const resident = activeResidents.find(r => r.id === record.residentId);
     
     setViewingContent({
        type: isPdf ? 'PDF' : 'TEXT',
        content: record.filePdfBase64,
        title: `Evolução - ${resident?.name || 'Residente'} (${new Date(record.date).toLocaleDateString('pt-BR')})`
     });
  };

  // --- RENDERERS ---

  const renderDaily = () => {
    // Filtra residentes se o botão "Ocultar Concluídos" estiver ativo
    const residentsToShow = activeResidents.filter(res => {
       if (!hideCompleted) return true;
       const tecRecord = getStatus(res.id, 'TEC_ENFERMAGEM', selectedDate);
       const enfRecord = getStatus(res.id, 'ENFERMEIRA', selectedDate);
       return !tecRecord || !enfRecord; // Mostra se tiver ALGUMA pendência
    });

    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2">
            <Calendar className="text-primary-600" />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)}
              className="font-bold text-slate-700 bg-transparent outline-none border-b border-slate-300 focus:border-primary-500"
            />
          </div>
          
          <div className="flex-1 w-full flex flex-wrap gap-2 justify-end items-center">
             <button
                onClick={() => setHideCompleted(!hideCompleted)}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${hideCompleted ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`}
             >
                <ListFilter size={16} /> 
                {hideCompleted ? 'Mostrando Apenas Pendentes' : 'Ocultar Concluídos'}
             </button>

             <button 
               onClick={() => { setUploadTargetRole('TEC_ENFERMAGEM'); setIsInputModalOpen(true); }}
               className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-bold flex items-center gap-2 shadow-sm"
             >
               <ClipboardPaste size={16} /> Colar Texto (Téc.)
             </button>
             <button 
               onClick={() => { setUploadTargetRole('ENFERMEIRA'); setIsInputModalOpen(true); }}
               className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-bold flex items-center gap-2 shadow-sm"
             >
               <ClipboardPaste size={16} /> Colar Texto (Enf.)
             </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700">
                 <tr>
                   <th className="p-4 border-b">Residente</th>
                   <th className="p-4 border-b text-center w-40">Téc. Enfermagem</th>
                   <th className="p-4 border-b text-center w-40">Enfermeira</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {residentsToShow.map(res => {
                    const tecRecord = getStatus(res.id, 'TEC_ENFERMAGEM', selectedDate);
                    const enfRecord = getStatus(res.id, 'ENFERMEIRA', selectedDate);

                    return (
                      <tr key={res.id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-700 flex items-center gap-3">
                           <div className="w-8 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                              {res.photo ? <img src={res.photo} className="w-full h-full object-cover"/> : <User size={16} className="m-auto mt-2 text-slate-300"/>}
                           </div>
                           {res.name}
                        </td>
                        
                        {/* Tec Enfermagem Column */}
                        <td className="p-3 text-center border-l border-slate-100">
                           {tecRecord ? (
                             <div className="group relative inline-block">
                               <button onClick={() => handleViewContent(tecRecord)} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 mx-auto hover:bg-green-200">
                                 <CheckCircle2 size={14}/> OK
                               </button>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); onDeleteEvolution(tecRecord.id); }}
                                 className="absolute -right-8 top-1/2 -translate-y-1/2 bg-white text-red-500 border border-red-200 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all z-10"
                                 title="Limpar evolução"
                               >
                                 <X size={14}/>
                               </button>
                             </div>
                           ) : (
                             <span className="text-red-300 text-xs font-bold flex items-center justify-center gap-1"><X size={14}/> Pendente</span>
                           )}
                        </td>

                        {/* Enfermeira Column */}
                        <td className="p-3 text-center border-l border-slate-100">
                           {enfRecord ? (
                             <div className="group relative inline-block">
                               <button onClick={() => handleViewContent(enfRecord)} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 mx-auto hover:bg-green-200">
                                 <CheckCircle2 size={14}/> OK
                               </button>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); onDeleteEvolution(enfRecord.id); }}
                                 className="absolute -right-8 top-1/2 -translate-y-1/2 bg-white text-red-500 border border-red-200 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all z-10"
                                 title="Limpar evolução"
                               >
                                 <X size={14}/>
                               </button>
                             </div>
                           ) : (
                             <span className="text-red-300 text-xs font-bold flex items-center justify-center gap-1"><X size={14}/> Pendente</span>
                           )}
                        </td>
                      </tr>
                    );
                 })}
                 {residentsToShow.length === 0 && (
                    <tr>
                       <td colSpan={3} className="p-8 text-center text-slate-400">
                          {hideCompleted ? 'Todos os residentes estão com as evoluções em dia!' : 'Nenhum residente encontrado.'}
                       </td>
                    </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>
    );
  };

  const renderMonthly = () => {
    // Filtra residentes na aba Mensal
    const residentsToShow = activeResidents.filter(res => {
       if (!hideCompleted) return true;
       // Se estiver filtrando, verifica se o residente tem pendência na ÁREA SELECIONADA
       const record = getStatus(res.id, selectedArea, selectedMonth);
       return !record;
    });

    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-2">
            <Calendar className="text-primary-600" />
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)}
              className="font-bold text-slate-700 bg-transparent outline-none border-b border-slate-300 focus:border-primary-500"
            />
          </div>

          <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

          <div className="flex items-center gap-2 flex-1">
             <Filter size={16} className="text-slate-400" />
             <select 
               value={selectedArea}
               onChange={e => setSelectedArea(e.target.value as EvolutionRole)}
               className="p-1 text-sm bg-transparent font-medium text-slate-700 outline-none w-full md:w-auto"
             >
                {ROLES_MONTHLY.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
             </select>
          </div>

          <div className="flex gap-2">
             <button
                onClick={() => setHideCompleted(!hideCompleted)}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${hideCompleted ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`}
             >
                <ListFilter size={16} /> 
                {hideCompleted ? 'Apenas Pendentes' : 'Ocultar Concluídos'}
             </button>

             <button 
                onClick={() => { setUploadTargetRole(selectedArea); setIsInputModalOpen(true); }}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm font-bold flex items-center gap-2 shadow-sm w-full md:w-auto justify-center"
             >
                <ClipboardPaste size={16} /> Colar Texto
             </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700">
                 <tr>
                   <th className="p-4 border-b">Residente</th>
                   {ROLES_MONTHLY.map(role => (
                     <th key={role.value} className={`p-4 border-b text-center text-xs uppercase ${selectedArea === role.value ? 'bg-primary-50 text-primary-700 border-primary-100' : ''}`}>
                       <div className="flex flex-col items-center gap-1">
                         <span>{role.label.split(' ')[0]}</span>
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleClearMonthRole(role.value as EvolutionRole); }}
                           className="text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-all"
                           title={`Limpar todas de ${role.label}`}
                         >
                           <X size={12} />
                         </button>
                       </div>
                     </th>
                   ))}
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {residentsToShow.map(res => (
                   <tr key={res.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-700 flex items-center gap-3 border-r border-slate-100">
                          <div className="w-8 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                              {res.photo ? <img src={res.photo} className="w-full h-full object-cover"/> : <User size={16} className="m-auto mt-2 text-slate-300"/>}
                           </div>
                           {res.name}
                      </td>
                      {ROLES_MONTHLY.map(role => {
                        const record = getStatus(res.id, role.value, selectedMonth);
                        const isSelectedCol = selectedArea === role.value;
                        
                        return (
                          <td key={role.value} className={`p-2 text-center border-r border-slate-50 ${isSelectedCol ? 'bg-slate-50' : ''}`}>
                             {record ? (
                               <div className="group relative inline-block">
                                 <button onClick={() => handleViewContent(record)} className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center hover:bg-green-200 mx-auto">
                                    <Check size={16} />
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); onDeleteEvolution(record.id); }}
                                   className="absolute -top-1 -right-1 bg-white text-red-500 rounded-full shadow border border-red-100 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                 >
                                    <X size={10} />
                                 </button>
                               </div>
                             ) : (
                               <div className="w-2 h-2 bg-red-200 rounded-full mx-auto" title="Pendente"></div>
                             )}
                          </td>
                        );
                      })}
                   </tr>
                 ))}
                 {residentsToShow.length === 0 && (
                    <tr>
                       <td colSpan={ROLES_MONTHLY.length + 1} className="p-8 text-center text-slate-400">
                          {hideCompleted ? 'Todos os residentes estão em dia nesta categoria!' : 'Nenhum residente encontrado.'}
                       </td>
                    </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-primary-600" />
            Controle de Evoluções
          </h2>
          <p className="text-slate-500 text-sm">Monitore se todas as evoluções clínicas foram registradas no sistema.</p>
        </div>
        
        {/* WhatsApp Notification Button - Opens Modal */}
        <button 
          onClick={() => setIsNotifyModalOpen(true)}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center gap-2 shadow-sm font-bold text-sm"
        >
            <MessageCircle size={18} /> Notificar {activeTab === 'DIARIO' ? 'Plantão' : 'Profissionais'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'DIARIO' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('DIARIO')}><div className="flex items-center gap-2"><Calendar size={18} /> Diário (Enfermagem)</div></button>
        <button className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'MENSAL' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('MENSAL')}><div className="flex items-center gap-2"><CheckCircle2 size={18} /> Mensal (Multidisciplinar)</div></button>
      </div>

      {activeTab === 'DIARIO' ? renderDaily() : renderMonthly()}

      {/* Notification Modal (WhatsApp Individual) */}
      {isNotifyModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                 <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                       <MessageCircle className="text-green-500"/>
                       Notificar Pendências ({activeTab === 'DIARIO' ? 'Plantão do Dia' : 'Equipe Multidisciplinar'})
                    </h3>
                    <p className="text-sm text-slate-500">
                        {activeTab === 'DIARIO' 
                          ? 'Lista baseada na Equipe de Enfermagem (Técnicos e Enfermeiras) presente no plantão.' 
                          : 'Lista baseada nos profissionais cadastrados na Central de Demandas.'}
                    </p>
                 </div>
                 <button onClick={() => setIsNotifyModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>

              <div className="overflow-y-auto flex-1">
                 {notificationsList.length > 0 ? (
                    <div className="space-y-4">
                       {notificationsList.map((item, idx) => {
                          const link = generateWhatsAppLink(item);
                          const isNurse = item.area.includes('ENFERMEIRA');
                          return (
                             <div key={idx} className="flex flex-col md:flex-row items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-4">
                                <div className="flex-1">
                                   <div className="flex justify-between">
                                      <h4 className="font-bold text-slate-800 text-lg">{item.profName}</h4>
                                      <span className={`text-xs font-bold px-2 py-1 rounded border uppercase ${activeTab === 'DIARIO' ? (isNurse ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-red-50 text-red-700 border-red-100') : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                          {item.area}
                                      </span>
                                   </div>
                                   <div className="text-sm text-slate-600 mt-2">
                                      <p>Pendências: <strong>{item.missingNames.length} residentes</strong></p>
                                   </div>
                                   <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic">
                                      {item.missingNames.join(', ')}
                                   </p>
                                </div>
                                
                                {link ? (
                                   <a 
                                     href={link}
                                     target="_blank" 
                                     rel="noopener noreferrer"
                                     className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors shrink-0"
                                   >
                                      <Send size={16} /> Enviar Cobrança
                                   </a>
                                ) : (
                                   <button disabled className="bg-slate-200 text-slate-400 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shrink-0 cursor-not-allowed">
                                      <AlertCircle size={16} /> Sem WhatsApp
                                   </button>
                                )}
                             </div>
                          );
                       })}
                    </div>
                 ) : (
                    <div className="text-center py-12 text-slate-400">
                       <CheckCircle2 size={48} className="mx-auto mb-3 text-green-200" />
                       <p className="font-bold text-lg text-slate-600">Tudo em dia!</p>
                       <p>Não há pendências para os profissionais neste contexto.</p>
                       {activeTab === 'DIARIO' && (data.employees || []).filter(e => e.role === 'TEC ENFERMAGEM' || e.role === 'ENFERMEIRA').length === 0 && (
                           <p className="text-xs text-red-400 mt-2">Dica: Cadastre a equipe com cargo 'TEC ENFERMAGEM' ou 'ENFERMEIRA' em "Equipe".</p>
                       )}
                    </div>
                 )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                 <button onClick={() => setIsNotifyModalOpen(false)} className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">Fechar</button>
              </div>
           </div>
        </div>
      )}

      {/* Input Modal (Text Paste) */}
      {isInputModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <ClipboardPaste className="text-primary-600"/>
                    Colar Relatório / Evolução
                 </h3>
                 <button onClick={() => { setIsInputModalOpen(false); setPastedText(''); setResidentsFoundCount(null); }} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4 text-sm text-blue-800">
                 Copie o texto do PDF ou documento e cole abaixo. <strong>O sistema selecionará automaticamente apenas os residentes que ainda estão PENDENTES.</strong>
              </div>

              <textarea 
                className="w-full h-48 p-3 border border-slate-300 rounded-lg bg-slate-50 text-sm focus:ring-2 focus:ring-primary-500 mb-3"
                placeholder="Cole o texto aqui (Ex: Hóspede: JOAO SILVA... Evolução...)"
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
              ></textarea>

              <div className="flex gap-2 mb-4">
                 <button 
                   onClick={handleProcessText}
                   disabled={!pastedText}
                   className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 text-sm font-bold shadow-sm disabled:opacity-50"
                 >
                   Processar Texto
                 </button>
              </div>
              
              {residentsFoundCount !== null && (
                <div className={`mb-3 p-2 rounded text-sm font-bold flex items-center gap-2 ${residentsFoundCount > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                   <Search size={16}/> 
                   {residentsFoundCount > 0 
                     ? `${residentsFoundCount} nomes pendentes identificados no texto.` 
                     : 'Nenhum residente pendente identificado automaticamente.'}
                </div>
              )}
              
              <div className="flex-1 overflow-hidden flex flex-col">
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-700">Residentes identificados para registro:</label>
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => setSelectedResidentsForSave(activeResidents.map(r=>r.id))} className="text-primary-600 hover:underline">Selecionar Todos</button>
                      <button onClick={() => setSelectedResidentsForSave([])} className="text-slate-400 hover:underline">Nenhum</button>
                    </div>
                 </div>
                 
                 <div className="overflow-y-auto border border-slate-200 rounded-lg flex-1 p-2 space-y-1">
                    {activeResidents.map(res => (
                       <label key={res.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-slate-50 ${selectedResidentsForSave.includes(res.id) ? 'bg-blue-50' : ''}`}>
                          <input 
                            type="checkbox" 
                            checked={selectedResidentsForSave.includes(res.id)}
                            onChange={() => toggleResidentSelection(res.id)}
                            className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm font-medium text-slate-700">{res.name}</span>
                          {selectedResidentsForSave.includes(res.id) && <Check size={14} className="text-blue-500 ml-auto"/>}
                       </label>
                    ))}
                 </div>
              </div>

              <button 
                onClick={handleConfirmSave}
                disabled={selectedResidentsForSave.length === 0}
                className="mt-4 w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> Confirmar Registros ({selectedResidentsForSave.length})
              </button>
           </div>
        </div>
      )}

      {/* Content Viewer Modal */}
      {viewingContent && (
         <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
            <div className="bg-white w-full h-full max-w-4xl max-h-[90vh] rounded-xl flex flex-col shadow-2xl">
               <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <FileText className="text-primary-600"/>
                     {viewingContent.title}
                  </h3>
                  <button onClick={() => setViewingContent(null)} className="text-slate-500 hover:text-slate-700"><X size={24}/></button>
               </div>
               
               <div className="flex-1 overflow-auto p-0 bg-slate-100 relative">
                  {viewingContent.type === 'PDF' ? (
                     <iframe 
                       src={viewingContent.content} 
                       className="w-full h-full border-none"
                       title="Documento PDF"
                     ></iframe>
                  ) : (
                     <div className="w-full h-full p-8 bg-white overflow-auto">
                        <div className="max-w-2xl mx-auto bg-white p-8 border border-slate-200 shadow-sm min-h-full">
                           <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                              {viewingContent.content}
                           </pre>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
