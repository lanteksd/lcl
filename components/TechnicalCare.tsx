
import React, { useState, useMemo } from 'react';
import { AppData, TechnicalSession, ProfessionalArea, Professional } from '../types';
import { HeartPulse, CheckCircle2, Circle, Calendar, Plus, X, User, Save, Filter, Printer, ClipboardList } from 'lucide-react';

interface TechnicalCareProps {
  data: AppData;
  onSaveSession: (session: TechnicalSession) => void;
  onDeleteSession: (id: string) => void;
}

const TECHNICAL_AREAS: ProfessionalArea[] = [
  'PSICOLOGIA',
  'PEDAGOGIA',
  'ASSISTENTE_SOCIAL',
  'NUTRICIONISTA',
  'FISIOTERAPIA'
];

const getAreaColor = (area: ProfessionalArea) => {
    const colors: Record<ProfessionalArea, string> = {
        'PSICOLOGIA': 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200',
        'PEDAGOGIA': 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200',
        'ASSISTENTE_SOCIAL': 'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200',
        'NUTRICIONISTA': 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
        'FISIOTERAPIA': 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
        'ENFERMAGEM': 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
    };
    return colors[area] || 'bg-slate-100 text-slate-700';
};

export const TechnicalCare: React.FC<TechnicalCareProps> = ({ data, onSaveSession, onDeleteSession }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingPendingArea, setViewingPendingArea] = useState<ProfessionalArea | null>(null);
  
  // State for new session modal
  const [newSessionData, setNewSessionData] = useState<Partial<TechnicalSession>>({
    date: new Date().toISOString().split('T')[0],
    status: 'CONCLUIDO'
  });

  const activeResidents = useMemo(() => 
    data.residents.filter(r => r.active).sort((a, b) => a.name.localeCompare(b.name)),
  [data.residents]);

  const monthSessions = useMemo(() => 
    (data.technicalSessions || []).filter(s => s.date.startsWith(selectedMonth)),
  [data.technicalSessions, selectedMonth]);

  // Statistics
  const stats = useMemo(() => {
    const totalExpected = activeResidents.length;
    const result: Record<string, number> = {};
    
    TECHNICAL_AREAS.forEach(area => {
      // Count unique residents seen in this area for this month
      const seenResidents = new Set(
        monthSessions
          .filter(s => s.area === area && s.status === 'CONCLUIDO')
          .map(s => s.residentId)
      );
      result[area] = seenResidents.size;
    });
    return { result, totalExpected };
  }, [activeResidents, monthSessions]);

  // Pending List Logic
  const pendingResidents = useMemo(() => {
    if (!viewingPendingArea) return [];
    return activeResidents.filter(resident => {
       const hasSession = monthSessions.some(s => s.residentId === resident.id && s.area === viewingPendingArea && s.status === 'CONCLUIDO');
       return !hasSession;
    });
  }, [activeResidents, monthSessions, viewingPendingArea]);


  const handleOpenModal = (residentId: string, area: ProfessionalArea) => {
    // Check if professional exists for this area
    const professionals = (data.professionals || []).filter(p => p.area === area);
    
    setNewSessionData({
      residentId,
      area,
      date: new Date().toISOString().split('T')[0],
      status: 'CONCLUIDO',
      professionalId: professionals.length > 0 ? professionals[0].id : '',
      professionalName: professionals.length > 0 ? professionals[0].name : '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSessionData.residentId && newSessionData.area && newSessionData.date) {
      const professional = (data.professionals || []).find(p => p.id === newSessionData.professionalId);
      
      const session: TechnicalSession = {
        id: crypto.randomUUID(),
        residentId: newSessionData.residentId,
        area: newSessionData.area,
        date: newSessionData.date,
        status: 'CONCLUIDO',
        professionalId: newSessionData.professionalId || '',
        professionalName: professional?.name || newSessionData.professionalName || 'Não Informado',
        notes: newSessionData.notes || ''
      };
      
      onSaveSession(session);
      setIsModalOpen(false);
    }
  };

  const handleDelete = (sessionId: string) => {
    if (confirm("Deseja remover este registro de atendimento?")) {
      onDeleteSession(sessionId);
    }
  };

  const handlePrintPending = () => {
    if (!viewingPendingArea) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Por favor, permita pop-ups.");

    const [year, month] = selectedMonth.split('-');
    const formattedDate = `${month}/${year}`;
    const areaName = viewingPendingArea.replace('_', ' ');

    let html = `
      <html>
      <head>
        <title>Lista de Pendências - ${areaName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          h1 { margin: 0; font-size: 20px; }
          h2 { margin: 5px 0 0; font-size: 16px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: bold; }
          .check-col { width: 50px; text-align: center; }
          .sign-col { width: 150px; }
          .footer { margin-top: 30px; font-size: 10px; text-align: right; color: #999; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório de Atendimentos Pendentes</h1>
          <h2>Especialidade: ${areaName} | Referência: ${formattedDate}</h2>
        </div>
        
        <p>Profissional Responsável: _________________________________________________</p>

        <table>
          <thead>
            <tr>
              <th class="check-col">OK</th>
              <th>Residente</th>
              <th>Quarto</th>
              <th>Data Atendimento</th>
              <th class="sign-col">Assinatura / Obs</th>
            </tr>
          </thead>
          <tbody>
    `;

    pendingResidents.forEach(res => {
      html += `
        <tr>
          <td class="check-col"></td>
          <td>${res.name}</td>
          <td>${res.room}</td>
          <td>____/____/____</td>
          <td></td>
        </tr>
      `;
    });

    if (pendingResidents.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center; padding: 20px;">Todos os residentes já foram atendidos neste mês.</td></tr>`;
    }

    html += `
          </tbody>
        </table>
        <div class="footer">Gerado por LifeCare em ${new Date().toLocaleDateString()}</div>
        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <HeartPulse className="text-pink-600" />
            Atendimento Técnico Multidisciplinar
          </h2>
          <p className="text-slate-500 text-sm">Controle mensal de atendimentos (1 sessão/mês por especialidade).</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
           <Calendar size={18} className="text-slate-400" />
           <input 
             type="month" 
             value={selectedMonth}
             onChange={e => setSelectedMonth(e.target.value)}
             className="text-slate-700 font-bold bg-transparent outline-none"
           />
        </div>
      </div>

      {/* Stats Cards (Interactive) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {TECHNICAL_AREAS.map(area => {
          const completed = stats.result[area] || 0;
          const total = stats.totalExpected;
          const percentage = Math.round((completed / total) * 100) || 0;
          const isComplete = completed === total;
          
          return (
            <button 
                key={area} 
                onClick={() => setViewingPendingArea(area)}
                className={`p-4 rounded-xl border ${getAreaColor(area)} bg-opacity-30 relative overflow-hidden text-left transition-transform hover:scale-[1.02] hover:shadow-md cursor-pointer group`}
                title="Clique para ver lista de pendências"
            >
               <div className="flex justify-between items-start mb-2 relative z-10">
                  <h3 className="text-xs font-bold uppercase tracking-wider opacity-80">{area.replace('_', ' ')}</h3>
                  <span className="text-lg font-bold">{completed}/{total}</span>
               </div>
               <div className="w-full bg-white/50 h-2 rounded-full overflow-hidden relative z-10">
                  <div className="h-full bg-current opacity-60 transition-all duration-500" style={{ width: `${percentage}%` }}></div>
               </div>
               {isComplete ? (
                   <div className="absolute top-2 right-2 text-green-600 opacity-20 group-hover:opacity-100 transition-opacity">
                       <CheckCircle2 size={16} />
                   </div>
               ) : (
                   <div className="absolute top-2 right-2 text-current opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold bg-white/50 px-1.5 rounded">
                       Ver Pendentes
                   </div>
               )}
            </button>
          );
        })}
      </div>

      {/* Main Matrix Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="p-4 border-b border-r border-slate-200 min-w-[200px] sticky left-0 bg-slate-50 z-10">Residente</th>
                {TECHNICAL_AREAS.map(area => (
                  <th key={area} className="p-4 border-b border-slate-200 text-center font-bold text-xs uppercase tracking-wider min-w-[120px]">
                    {area.replace('_', ' ').split(' ')[0]} {/* Short name */}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeResidents.map(resident => (
                <tr key={resident.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 border-r border-slate-100 sticky left-0 bg-white font-medium text-slate-800 z-10 flex items-center gap-3">
                     <div className="w-8 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                       {resident.photo ? <img src={resident.photo} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-2 text-slate-300" />}
                     </div>
                     <span className="truncate">{resident.name}</span>
                  </td>
                  {TECHNICAL_AREAS.map(area => {
                    const session = monthSessions.find(s => s.residentId === resident.id && s.area === area && s.status === 'CONCLUIDO');
                    
                    if (session) {
                      return (
                        <td key={area} className="p-2 text-center">
                          <div className="group relative">
                            <button 
                              onClick={() => handleDelete(session.id)}
                              className="w-full py-2 px-1 bg-green-50 text-green-700 rounded-lg border border-green-200 flex flex-col items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                            >
                              <CheckCircle2 size={16} className="mb-1" />
                              <span className="text-[10px] font-bold group-hover:hidden">{session.date.split('-').slice(1).reverse().join('/')}</span>
                              <span className="text-[10px] font-bold hidden group-hover:block">Remover</span>
                            </button>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 pointer-events-none z-20 transition-opacity">
                               <p>Prof: {session.professionalName}</p>
                               <p className="italic mt-1">"{session.notes || 'Sem obs'}"</p>
                            </div>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={area} className="p-2 text-center">
                        <button 
                          onClick={() => handleOpenModal(resident.id, area)}
                          className="w-full py-2 bg-slate-50 text-slate-300 rounded-lg border border-dashed border-slate-200 hover:border-primary-300 hover:text-primary-500 hover:bg-primary-50 transition-all flex justify-center"
                        >
                          <Circle size={16} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {activeResidents.length === 0 && <div className="p-10 text-center text-slate-400">Nenhum residente ativo.</div>}
        </div>
      </div>

      {/* Modal for New Session */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <form onSubmit={handleSave} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <div>
                   <h3 className="font-bold text-lg text-slate-800">Registrar Atendimento</h3>
                   <p className="text-sm text-slate-500">
                     {data.residents.find(r => r.id === newSessionData.residentId)?.name} • {newSessionData.area?.replace('_', ' ')}
                   </p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data do Atendimento</label>
                    <input 
                      type="date" 
                      required
                      className="w-full p-2 border border-slate-300 rounded-md"
                      value={newSessionData.date}
                      onChange={e => setNewSessionData({...newSessionData, date: e.target.value})}
                    />
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Profissional Responsável</label>
                    <select 
                      required
                      className="w-full p-2 border border-slate-300 rounded-md bg-white"
                      value={newSessionData.professionalId}
                      onChange={e => {
                        const prof = data.professionals?.find(p => p.id === e.target.value);
                        setNewSessionData({...newSessionData, professionalId: e.target.value, professionalName: prof?.name});
                      }}
                    >
                       <option value="">Selecione...</option>
                       {(data.professionals || [])
                          .filter(p => p.area === newSessionData.area)
                          .map(p => (
                             <option key={p.id} value={p.id}>{p.name}</option>
                          ))
                       }
                    </select>
                    {(data.professionals || []).filter(p => p.area === newSessionData.area).length === 0 && (
                       <p className="text-xs text-red-500 mt-1">Nenhum profissional cadastrado nesta área. Cadastre na aba "Demandas / Profissionais".</p>
                    )}
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Observações (Opcional)</label>
                    <textarea 
                      rows={3}
                      className="w-full p-2 border border-slate-300 rounded-md"
                      placeholder="Evolução do paciente..."
                      value={newSessionData.notes}
                      onChange={e => setNewSessionData({...newSessionData, notes: e.target.value})}
                    />
                 </div>
              </div>

              <div className="flex gap-3 justify-end pt-6 mt-2 border-t border-slate-100">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                 <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 font-bold shadow-sm"><Save size={18}/> Salvar Registro</button>
              </div>
           </form>
        </div>
      )}

      {/* Modal for Pending List (Printable) */}
      {viewingPendingArea && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingPendingArea(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xl text-slate-800">Pendências: {viewingPendingArea.replace('_', ' ')}</h3>
                    <p className="text-sm text-slate-500">Residentes aguardando atendimento em {selectedMonth.split('-').reverse().join('/')}</p>
                  </div>
                  <button onClick={() => setViewingPendingArea(null)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                  {pendingResidents.length > 0 ? (
                    <div className="space-y-2">
                       {pendingResidents.map(r => (
                         <div key={r.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                            <div className="w-10 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold shrink-0">
                               {r.photo ? <img src={r.photo} className="w-full h-full object-cover rounded-lg"/> : <User size={20}/>}
                            </div>
                            <div className="flex-1">
                               <h4 className="font-bold text-slate-700">{r.name}</h4>
                               <p className="text-xs text-slate-500">Quarto: {r.room}</p>
                            </div>
                            <button 
                               onClick={() => { setViewingPendingArea(null); handleOpenModal(r.id, viewingPendingArea); }}
                               className="px-3 py-1 bg-primary-50 text-primary-600 rounded-lg text-xs font-bold hover:bg-primary-100"
                            >
                               Registrar Agora
                            </button>
                         </div>
                       ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-green-600 bg-green-50 rounded-xl border border-green-200">
                        <CheckCircle2 size={48} className="mx-auto mb-2" />
                        <h4 className="font-bold text-lg">Tudo em dia!</h4>
                        <p className="text-sm">Todos os residentes já foram atendidos nesta especialidade.</p>
                    </div>
                  )}
               </div>

               <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white rounded-b-xl">
                  <button onClick={() => setViewingPendingArea(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Fechar</button>
                  <button 
                    onClick={handlePrintPending}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-2 font-bold shadow-sm"
                  >
                    <Printer size={18}/> Imprimir Lista para o Técnico
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
