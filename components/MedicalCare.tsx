
import React, { useState, useMemo } from 'react';
import { AppData, MedicalAppointment, Resident } from '../types';
import { MEDICAL_SPECIALTIES } from '../constants';
import { Calendar, Plus, User, Stethoscope, Clock, MapPin, Search, CheckCircle2, XCircle, Trash2, ArrowLeft, MessageCircle, Edit2, X, AlertTriangle, FileText, Upload, Paperclip, BarChart3, List, History, Siren, Save, Link, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MedicalCareProps {
  data: AppData;
  onSave: (appointment: MedicalAppointment) => void;
  onDelete: (id: string) => void;
}

const EmptyAppointment: MedicalAppointment = {
  id: '',
  residentId: '',
  type: 'CONSULTA',
  specialty: 'Clínico Geral',
  doctorName: '',
  date: '',
  time: '',
  location: '',
  status: 'AGENDADO',
  notes: '',
  diagnosis: '',
  accompanyingPerson: '',
  outcomeNotes: '',
  attachmentBase64: '',
  linkUrl: ''
};

// Helper for Safe ID Generation
const generateSafeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch(e) {}
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export const MedicalCare: React.FC<MedicalCareProps> = ({ data, onSave, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'AGENDA' | 'HISTORY' | 'ANALYTICS'>('AGENDA');
  const [view, setView] = useState<'LIST' | 'FORM' | 'SELECT_RESIDENT'>('LIST');
  const [currentAppointment, setCurrentAppointment] = useState<MedicalAppointment>(EmptyAppointment);
  
  // States for Completion Modal
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState<MedicalAppointment | null>(null);
  const [completionData, setCompletionData] = useState({ diagnosis: '', outcomeNotes: '', linkUrl: '' });
  
  // State for Diagnosis Autocomplete
  const [showDiagnosisSuggestions, setShowDiagnosisSuggestions] = useState(false);

  // Filters
  const [filterResident, setFilterResident] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [residentSearch, setResidentSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const appointments = (data.medicalAppointments || [])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const upcomingAppointments = appointments.filter(a => a.status === 'AGENDADO' || new Date(a.date) >= new Date());
  const historyAppointments = appointments.filter(a => {
      const matchesSearch = historySearch.toLowerCase() === '' || 
                            a.diagnosis?.toLowerCase().includes(historySearch.toLowerCase()) ||
                            a.specialty.toLowerCase().includes(historySearch.toLowerCase());
      const matchesResident = filterResident === '' || a.residentId === filterResident;
      return matchesSearch && matchesResident;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Analytics Data
  const diagnosisStats = useMemo(() => {
      const stats: Record<string, number> = {};
      appointments.forEach(app => {
          if (app.diagnosis) {
              const diag = app.diagnosis.trim().toUpperCase();
              stats[diag] = (stats[diag] || 0) + 1;
          }
      });
      return Object.entries(stats)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);
  }, [appointments]);

  // Unique Diagnoses for Autocomplete
  const uniqueDiagnoses = useMemo(() => {
    const uniqueSet = new Set<string>();
    appointments.forEach(app => {
      if (app.diagnosis) uniqueSet.add(app.diagnosis.trim());
    });
    return Array.from(uniqueSet).sort();
  }, [appointments]);

  const filteredDiagnoses = useMemo(() => {
    const input = completionData.diagnosis.toLowerCase();
    return uniqueDiagnoses.filter(d => 
      d.toLowerCase().includes(input) && d.toLowerCase() !== input
    ).slice(0, 5); // Limit to 5 suggestions
  }, [uniqueDiagnoses, completionData.diagnosis]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...currentAppointment, id: currentAppointment.id || generateSafeId() });
    setView('LIST');
    setCurrentAppointment(EmptyAppointment);
  };

  const handleEdit = (appointment: MedicalAppointment) => {
    setCurrentAppointment(appointment);
    setView('FORM');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Confirmar exclusão do agendamento?')) {
      onDelete(id);
    }
  };

  const handleSelectResident = (residentId: string) => {
    setCurrentAppointment({ ...EmptyAppointment, residentId });
    setView('FORM');
  };

  // Completion Logic
  const openCompletionModal = (app: MedicalAppointment) => {
      setCompletingAppointment(app);
      setCompletionData({ 
          diagnosis: app.diagnosis || '', 
          outcomeNotes: app.outcomeNotes || '', 
          linkUrl: app.linkUrl || '' 
      });
      setIsCompletionModalOpen(true);
  };

  const handleConfirmCompletion = (e: React.FormEvent) => {
      e.preventDefault();
      if (completingAppointment) {
          onSave({
              ...completingAppointment,
              status: 'CONCLUIDO',
              diagnosis: completionData.diagnosis,
              outcomeNotes: completionData.outcomeNotes,
              linkUrl: completionData.linkUrl
          });
          setIsCompletionModalOpen(false);
          setCompletingAppointment(null);
      }
  };

  const openAttachment = (appointment: MedicalAppointment) => {
    if (appointment.linkUrl) {
      window.open(appointment.linkUrl, '_blank');
    } else if (appointment.attachmentBase64) {
      const win = window.open();
      if (win) {
         const base64 = appointment.attachmentBase64;
         if (base64.startsWith('data:image')) {
             win.document.write(`<img src="${base64}" style="max-width:100%"/>`);
         } else {
             win.document.write(`<iframe src="${base64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
         }
      }
    } else {
        alert("Nenhum arquivo anexado.");
    }
  };

  const getResidentName = (id: string) => data.residents.find(r => r.id === id)?.name || 'Desconhecido';
  const getResidentPhoto = (id: string) => data.residents.find(r => r.id === id)?.photo;

  // Helper function to create WhatsApp link
  const getNotificationLink = (appointment: MedicalAppointment) => {
    const resident = data.residents.find(r => r.id === appointment.residentId);
    if (!resident || !resident.responsible.phone1) return null;
    
    const phone = resident.responsible.phone1.replace(/\D/g, '');
    const fullPhone = phone.length <= 11 ? `55${phone}` : phone;
    
    const dateFormatted = appointment.date.split('-').reverse().join('/');
    
    const message = `Olá ${resident.responsible.name}. \n\nInformamos que o residente ${resident.name} tem um(a) ${appointment.type} agendado(a).\n\n📅 Data: ${dateFormatted}\n⏰ Horário: ${appointment.time}\n👨‍⚕️ Especialidade: ${appointment.specialty}\n📍 Local: ${appointment.location || 'Não informado'}\n\nQualquer dúvida, estamos à disposição.`;
    
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  };

  // --- VIEWS ---

  if (view === 'SELECT_RESIDENT') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between">
          <button onClick={() => setView('LIST')} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium">
            <ArrowLeft size={20} /> Cancelar
          </button>
          <span className="text-slate-400 text-sm font-medium">Selecionar Residente</span>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
           <h3 className="font-bold text-slate-800 text-lg">Para quem é o atendimento?</h3>
           <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Buscar residente..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-pink-500"
                value={residentSearch}
                onChange={e => setResidentSearch(e.target.value)}
              />
              {residentSearch && (
                 <button onClick={() => setResidentSearch('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                   <X size={14}/>
                 </button>
               )}
           </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {data.residents
              .filter(r => r.active)
              .filter(r => r.name.toLowerCase().includes(residentSearch.toLowerCase()))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(resident => (
                <div 
                  key={resident.id}
                  onClick={() => handleSelectResident(resident.id)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-pink-500 cursor-pointer transition-all hover:shadow-md flex flex-col items-center text-center group"
                >
                    <div className="w-24 h-32 rounded-xl bg-slate-100 mb-3 overflow-hidden border-2 border-slate-100 group-hover:border-pink-200">
                      {resident.photo ? (
                        <img src={resident.photo} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-full h-full p-4 text-slate-300" />
                      )}
                    </div>
                    <h4 className="font-bold text-slate-700 group-hover:text-pink-600 leading-tight">{resident.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">Quarto {resident.room}</p>
                </div>
              ))}
        </div>
      </div>
    );
  }

  if (view === 'FORM') {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Stethoscope className="text-pink-600" />
            {currentAppointment.id ? 'Editar Atendimento' : 'Novo Atendimento'}
          </h2>
          <button onClick={() => setView('LIST')} className="text-slate-500 hover:text-slate-800">
            <ArrowLeft size={24} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Residente *</label>
            <select 
              required
              className="w-full p-2 border border-slate-300 rounded-md bg-slate-50"
              value={currentAppointment.residentId}
              onChange={e => setCurrentAppointment({ ...currentAppointment, residentId: e.target.value })}
            >
              <option value="">Selecione...</option>
              {data.residents.filter(r => r.active).sort((a, b) => a.name.localeCompare(b.name)).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
               <select 
                 className="w-full p-2 border border-slate-300 rounded-md"
                 value={currentAppointment.type}
                 onChange={e => setCurrentAppointment({ ...currentAppointment, type: e.target.value as any })}
               >
                 <option value="CONSULTA">Consulta</option>
                 <option value="EXAME">Exame</option>
                 <option value="RETORNO">Retorno</option>
                 <option value="URGENCIA">Urgência / PS</option>
               </select>
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Especialidade</label>
               <select 
                 className="w-full p-2 border border-slate-300 rounded-md"
                 value={currentAppointment.specialty}
                 onChange={e => setCurrentAppointment({ ...currentAppointment, specialty: e.target.value })}
               >
                 {MEDICAL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
               </select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data *</label>
              <input 
                required
                type="date"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={currentAppointment.date}
                onChange={e => setCurrentAppointment({ ...currentAppointment, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hora *</label>
              <input 
                required
                type="time"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={currentAppointment.time}
                onChange={e => setCurrentAppointment({ ...currentAppointment, time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Local / Hospital</label>
            <input 
              type="text"
              placeholder="Clínica X, Hospital Y"
              className="w-full p-2 border border-slate-300 rounded-md"
              value={currentAppointment.location || ''}
              onChange={e => setCurrentAppointment({ ...currentAppointment, location: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Médico (Opcional)</label>
                <input 
                  type="text"
                  placeholder="Dr. João Silva"
                  className="w-full p-2 border border-slate-300 rounded-md"
                  value={currentAppointment.doctorName || ''}
                  onChange={e => setCurrentAppointment({ ...currentAppointment, doctorName: e.target.value })}
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Acompanhante (Cuidador)</label>
                <input 
                  type="text"
                  placeholder="Nome do acompanhante"
                  className="w-full p-2 border border-slate-300 rounded-md"
                  value={currentAppointment.accompanyingPerson || ''}
                  onChange={e => setCurrentAppointment({ ...currentAppointment, accompanyingPerson: e.target.value })}
                />
             </div>
          </div>
          
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Observações Prévias</label>
             <textarea 
               rows={3}
               placeholder="Sintomas, motivo da consulta..."
               className="w-full p-2 border border-slate-300 rounded-md"
               value={currentAppointment.notes || ''}
               onChange={e => setCurrentAppointment({ ...currentAppointment, notes: e.target.value })}
             />
          </div>

          <div className="flex gap-4 justify-end pt-4">
             <button type="button" onClick={() => setView('LIST')} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
             <button type="submit" className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">Salvar Agendamento</button>
          </div>
        </form>
      </div>
    );
  }

  // --- RENDER TABS ---

  const renderAgenda = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in">
        {upcomingAppointments.map(app => {
          const isUrgency = app.type === 'URGENCIA';
          const notificationLink = getNotificationLink(app);
          
          return (
            <div key={app.id} className={`bg-white p-5 rounded-xl shadow-sm border border-l-4 relative group hover:shadow-md transition-shadow ${isUrgency ? 'border-l-red-500 border-slate-200' : 'border-l-pink-500 border-slate-200'}`}>
               {/* Header Card */}
               <div className="flex justify-between items-start mb-3">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-16 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                       {getResidentPhoto(app.residentId) ? (
                         <img src={getResidentPhoto(app.residentId)} className="w-full h-full object-cover" />
                       ) : (
                         <User size={24} className="m-auto mt-5 text-slate-300" />
                       )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 leading-tight">{getResidentName(app.residentId)}</h3>
                      <p className="text-xs text-slate-500">{app.specialty}</p>
                    </div>
                 </div>
                 
                 {/* Top Right Actions */}
                 <div className="flex flex-col items-end gap-1 relative z-10">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isUrgency ? 'bg-red-100 text-red-700' : 'bg-pink-100 text-pink-700'}`}>
                        {app.type}
                    </span>
                    <div className="flex gap-1 mt-1">
                         <button 
                            onClick={() => openCompletionModal(app)}
                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 flex items-center gap-1 text-[10px] font-bold pr-2 transition-colors"
                            title="Registrar Retorno/Conclusão"
                         >
                            <CheckCircle2 size={14} /> Concluir
                         </button>
                         <button onClick={() => handleEdit(app)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                         <button onClick={(e) => handleDelete(e, app.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                    </div>
                 </div>
               </div>
               
               {/* Details */}
               <div className="space-y-2 text-sm text-slate-600 mb-4">
                  <div className="flex items-center gap-2">
                     <Calendar size={16} className="text-slate-400" />
                     <span className="font-medium text-slate-800">{app.date.split('-').reverse().join('/')}</span>
                     <span className="text-slate-400">|</span>
                     <Clock size={16} className="text-slate-400" />
                     <span>{app.time}</span>
                  </div>
                  {app.location && (
                    <div className="flex items-center gap-2">
                       <MapPin size={16} className="text-slate-400" />
                       <span className="truncate">{app.location}</span>
                    </div>
                  )}
                  {app.accompanyingPerson && (
                    <div className="flex items-center gap-2 text-xs bg-slate-50 p-1 rounded w-fit">
                       <User size={12} className="text-slate-400" />
                       <span>Acomp: {app.accompanyingPerson}</span>
                    </div>
                  )}
               </div>

               {app.notes && (
                 <div className="bg-slate-50 p-2 rounded text-xs text-slate-500 mb-3 italic border border-slate-100">
                   "{app.notes}"
                 </div>
               )}

               <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
                  {notificationLink && (
                    <a 
                      href={notificationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-emerald-500 text-white hover:bg-emerald-600 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold shadow-sm transition-colors"
                    >
                      <MessageCircle size={18} /> Informar Família
                    </a>
                  )}
               </div>
            </div>
          );
        })}
        {upcomingAppointments.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
             <Calendar className="mx-auto mb-2 opacity-20" size={48} />
             <p>Nenhum agendamento futuro encontrado.</p>
          </div>
        )}
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4 animate-in fade-in">
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por diagnóstico ou especialidade..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                />
            </div>
            <div className="w-full md:w-64">
                <select 
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    value={filterResident}
                    onChange={e => setFilterResident(e.target.value)}
                >
                    <option value="">Todos os Residentes</option>
                    {data.residents.filter(r => r.active).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700">
                    <tr>
                        <th className="p-3">Data</th>
                        <th className="p-3">Residente</th>
                        <th className="p-3">Tipo/Especialidade</th>
                        <th className="p-3">Diagnóstico</th>
                        <th className="p-3 text-center">Anexos</th>
                        <th className="p-3 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {historyAppointments.map(app => (
                        <tr key={app.id} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-600">{app.date.split('-').reverse().join('/')}</td>
                            <td className="p-3 font-medium">{getResidentName(app.residentId)}</td>
                            <td className="p-3">
                                <div className="font-medium text-slate-700">{app.type}</div>
                                <div className="text-xs text-slate-500">{app.specialty}</div>
                            </td>
                            <td className="p-3">
                                {app.diagnosis ? (
                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{app.diagnosis}</span>
                                ) : <span className="text-slate-400">-</span>}
                            </td>
                            <td className="p-3 text-center">
                                {app.linkUrl || app.attachmentBase64 ? (
                                    <button onClick={() => openAttachment(app)} className="text-blue-500 hover:underline flex items-center justify-center gap-1 mx-auto text-xs font-bold">
                                        <Paperclip size={14}/> Ver Receita
                                    </button>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="p-3 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => handleEdit(app)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                                    <button onClick={(e) => handleDelete(e, app.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {historyAppointments.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6 animate-in fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="text-purple-600" /> Diagnósticos Recorrentes (Top 10)
                </h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={diagnosisStats} layout="vertical" margin={{left: 40}}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11}} />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20}>
                                {diagnosisStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">Frequência de diagnósticos registrados nas conclusões de atendimento.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="text-orange-500" /> Foco de Prevenção
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                    Com base nos diagnósticos registrados, considere ações preventivas para as condições mais frequentes.
                </p>
                <div className="space-y-3">
                    {diagnosisStats.slice(0, 5).map((stat, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="font-bold text-slate-700">{idx + 1}. {stat.name}</span>
                            <span className="text-xs font-bold bg-white border px-2 py-1 rounded">{stat.value} casos</span>
                        </div>
                    ))}
                    {diagnosisStats.length === 0 && <p className="text-slate-400 italic">Sem dados suficientes para análise.</p>}
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Stethoscope className="text-pink-600" /> Atendimento Médico
          </h2>
          <p className="text-slate-500 text-sm">Gestão de consultas, exames e histórico clínico.</p>
        </div>
        <button 
          onClick={() => { setCurrentAppointment(EmptyAppointment); setView('SELECT_RESIDENT'); }}
          className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 flex items-center gap-2 shadow-sm font-bold"
        >
          <Plus size={20} /> Novo Atendimento
        </button>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'AGENDA' ? 'border-pink-600 text-pink-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('AGENDA')}><div className="flex items-center gap-2"><List size={18} /> Agenda Atual</div></button>
        <button className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'HISTORY' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('HISTORY')}><div className="flex items-center gap-2"><History size={18} /> Histórico Completo</div></button>
        <button className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'ANALYTICS' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('ANALYTICS')}><div className="flex items-center gap-2"><BarChart3 size={18} /> Análise Clínica</div></button>
      </div>

      <div className="min-h-[400px]">
          {activeTab === 'AGENDA' && renderAgenda()}
          {activeTab === 'HISTORY' && renderHistory()}
          {activeTab === 'ANALYTICS' && renderAnalytics()}
      </div>

      {/* COMPLETION MODAL */}
      {isCompletionModalOpen && completingAppointment && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                      <div>
                          <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                              <CheckCircle2 className="text-emerald-500" /> Registrar Retorno
                          </h3>
                          <p className="text-sm text-slate-500">Conclusão do atendimento de {getResidentName(completingAppointment.residentId)}</p>
                      </div>
                      <button onClick={() => setIsCompletionModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>

                  <form onSubmit={handleConfirmCompletion} className="space-y-5">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Diagnóstico / Motivo *</label>
                          <div className="relative">
                            <input 
                                required
                                type="text" 
                                placeholder="Ex: Infecção Urinária, Queda, Rotina"
                                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500"
                                value={completionData.diagnosis}
                                onChange={e => {
                                  setCompletionData({...completionData, diagnosis: e.target.value});
                                  setShowDiagnosisSuggestions(true);
                                }}
                                onFocus={() => setShowDiagnosisSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowDiagnosisSuggestions(false), 200)}
                                autoComplete="off"
                            />
                            {showDiagnosisSuggestions && filteredDiagnoses.length > 0 && (
                              <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-b-md shadow-lg max-h-40 overflow-y-auto top-full left-0 mt-1">
                                {filteredDiagnoses.map((diag, idx) => (
                                  <li 
                                    key={idx}
                                    className="p-2 hover:bg-emerald-50 cursor-pointer text-sm text-slate-700"
                                    onClick={() => {
                                      setCompletionData({...completionData, diagnosis: diag});
                                      setShowDiagnosisSuggestions(false);
                                    }}
                                  >
                                    {diag}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">Essencial para o relatório de prevenção. Sugestões aparecem ao digitar.</p>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Instruções de Retorno / Cuidados</label>
                          <textarea 
                              rows={3}
                              placeholder="Ex: Repouso por 3 dias, iniciar antibiótico..."
                              className="w-full p-2 border border-slate-300 rounded-md"
                              value={completionData.outcomeNotes}
                              onChange={e => setCompletionData({...completionData, outcomeNotes: e.target.value})}
                          />
                      </div>

                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                              <Link size={16} /> Link da Receita / Laudo (Drive/Cloud)
                          </label>
                          <input 
                              type="url" 
                              placeholder="Ex: https://drive.google.com/..."
                              className="w-full p-2 border border-slate-300 rounded-md"
                              value={completionData.linkUrl}
                              onChange={e => setCompletionData({...completionData, linkUrl: e.target.value})}
                          />
                          <p className="text-xs text-slate-500 mt-2">* Use links para manter o sistema leve.</p>
                      </div>

                      <div className="flex gap-3 justify-end pt-4">
                          <button type="button" onClick={() => setIsCompletionModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                          <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-sm flex items-center gap-2">
                              <Save size={18} /> Salvar e Concluir
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
