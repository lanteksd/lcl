
import React, { useState, useMemo } from 'react';
import { AppData, Demand, Professional, ProfessionalArea, Resident } from '../types';
import { PROFESSIONAL_AREAS } from '../constants';
import { ClipboardList, Plus, User, Calendar, Edit2, Trash2, Save, X, Users, CheckCircle2, Clock, RotateCw, MessageCircle, Contact, Send, ArrowRight, Search, Zap, Filter, FileText, Brain, BookOpen, HandHeart, Apple, Activity, HeartPulse, Layers, Camera } from 'lucide-react';

interface DemandsProps {
  data: AppData;
  onSave: (demand: Demand) => void;
  onDelete: (id: string) => void;
  onSaveProfessional: (professional: Professional) => void;
  onDeleteProfessional: (id: string) => void;
}

const EmptyDemand: Demand = {
  id: '',
  professionalAreas: [],
  title: '',
  description: '',
  residentIds: [],
  status: 'PENDENTE',
  creationDate: new Date().toISOString().split('T')[0],
  dueDate: ''
};

const EmptyProfessional: Professional = {
  id: '',
  name: '',
  area: 'ENFERMAGEM',
  phone: '',
  photo: ''
};

// --- PRESETS PARA AÇÕES RÁPIDAS ---
const QUICK_ACTIONS = [
  { label: 'Pesagem', title: 'Pesagem dos Residentes', areas: ['NUTRICIONISTA', 'ENFERMAGEM'] as ProfessionalArea[], icon: <Zap size={14}/> },
  { label: 'Altura', title: 'Verificar Altura dos Residentes', areas: ['NUTRICIONISTA', 'ENFERMAGEM'] as ProfessionalArea[], icon: <Zap size={14}/> },
  { label: 'P.A.I.S.I.', title: 'Elaboração do P.A.I.S.I.', areas: ['ENFERMAGEM', 'ASSISTENTE_SOCIAL'] as ProfessionalArea[], icon: <FileText size={14}/> },
  { label: 'PIA', title: 'Elaboração do PIA', areas: ['PSICOLOGIA', 'PEDAGOGIA', 'ASSISTENTE_SOCIAL', 'NUTRICIONISTA', 'FISIOTERAPIA', 'ENFERMAGEM'] as ProfessionalArea[], icon: <FileText size={14}/> },
  { label: 'Relatórios', title: 'Relatório Psicossocial', areas: ['PSICOLOGIA', 'ASSISTENTE_SOCIAL'] as ProfessionalArea[], icon: <FileText size={14}/> },
];

// --- Helper Functions ---
const getAreaColor = (area: ProfessionalArea) => {
    const colors: Record<ProfessionalArea, string> = {
        'PSICOLOGIA': 'bg-pink-100 text-pink-700 border-pink-200',
        'PEDAGOGIA': 'bg-indigo-100 text-indigo-700 border-indigo-200',
        'ASSISTENTE_SOCIAL': 'bg-cyan-100 text-cyan-700 border-cyan-200',
        'NUTRICIONISTA': 'bg-green-100 text-green-700 border-green-200',
        'FISIOTERAPIA': 'bg-blue-100 text-blue-700 border-blue-200',
        'ENFERMAGEM': 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[area] || 'bg-slate-100 text-slate-700 border-slate-200';
};

const getAreaConfig = (area: ProfessionalArea | 'TODAS') => {
  switch (area) {
    case 'TODAS': return { label: 'Todas', icon: <Layers size={14} /> };
    case 'PSICOLOGIA': return { label: 'Psicologia', icon: <Brain size={14} /> };
    case 'PEDAGOGIA': return { label: 'Pedagogia', icon: <BookOpen size={14} /> };
    case 'ASSISTENTE_SOCIAL': return { label: 'Serv. Social', icon: <HandHeart size={14} /> };
    case 'NUTRICIONISTA': return { label: 'Nutrição', icon: <Apple size={14} /> };
    case 'FISIOTERAPIA': return { label: 'Fisio', icon: <Activity size={14} /> };
    case 'ENFERMAGEM': return { label: 'Enfermagem', icon: <HeartPulse size={14} /> };
    default: return { label: area, icon: null };
  }
};

const getConsolidatedWhatsAppLink = (professional: Professional, allDemands: Demand[], allResidents: Resident[]) => {
    const phone = professional.phone.replace(/\D/g, '');
    if (!phone) return '#';
    const fullPhone = phone.length <= 11 ? `55${phone}` : phone;

    // 1. Filtrar demandas do profissional
    const professionalDemands = allDemands
        .filter(d => d.professionalAreas.includes(professional.area) && d.status !== 'CONCLUIDA')
        .sort((a, b) => new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime());

    if (professionalDemands.length === 0) return null;

    // 2. Agrupar demandas por título (removendo sufixo de nome se existir)
    // Ex: "Elaboração de PIA - JOAO" e "Elaboração de PIA - MARIA" viram chave "Elaboração de PIA"
    const groupedDemands: Record<string, Set<string>> = {};

    professionalDemands.forEach(demand => {
        let baseTitle = demand.title;

        // Tenta detectar se o título tem o formato "Tarefa - NomeResidente" (gerado pelo botão rápido)
        // Se tiver, removemos o nome para agrupar
        const hyphenIndex = baseTitle.lastIndexOf(' - ');
        if (hyphenIndex !== -1) {
            // Verifica se o que vem depois do hífen parece um nome (opcional, mas o split simples costuma funcionar bem)
            baseTitle = baseTitle.substring(0, hyphenIndex).trim();
        }

        if (!groupedDemands[baseTitle]) {
            groupedDemands[baseTitle] = new Set();
        }

        // Adiciona os nomes dos residentes dessa demanda ao grupo
        demand.residentIds.forEach(id => {
            const res = allResidents.find(r => r.id === id);
            if (res) {
                groupedDemands[baseTitle].add(res.name);
            }
        });
    });

    // 3. Construir a mensagem formatada
    let message = `Olá ${professional.name}, segue um resumo das suas demandas ativas.\n\n`;

    Object.entries(groupedDemands).forEach(([title, residentSet], index) => {
        const residents = Array.from(residentSet).sort(); // Ordena nomes alfabeticamente
        
        // Substitui "RP" por "Relatório Psicossocial" apenas na mensagem visual
        const displayTitle = title.replace(/\bRP\b/g, 'Relatório Psicossocial');

        message += `*${index + 1}. ${displayTitle} para residentes:*\n`;
        residents.forEach(name => {
            message += `   • ${name}\n`;
        });
        message += `---\n`;
    });

    message += `\nObrigado.`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
};

interface DemandCardProps {
  demand: Demand;
  onUpdateStatus: (demand: Demand, newStatus: Demand['status']) => void;
  onEdit: (demand: Demand) => void;
  onViewResidents: (demand: Demand) => void;
}

const DemandCard: React.FC<DemandCardProps> = ({ demand, onUpdateStatus, onEdit, onViewResidents }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-primary-400 hover:shadow-md transition-all flex flex-col h-full group">
    <div className="flex justify-between items-start mb-2">
       <h4 className="font-bold text-slate-800 leading-tight pr-2">{demand.title}</h4>
       {demand.dueDate && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap ${new Date(demand.dueDate) < new Date() && demand.status !== 'CONCLUIDA' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
          <Calendar size={10} />
          {demand.dueDate.split('-').reverse().join('/').slice(0, 5)}
        </span>
       )}
    </div>
    
    <div className="flex flex-wrap gap-1.5 mb-3">
      {demand.professionalAreas.map(area => (
          <span key={area} className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wide ${getAreaColor(area)}`}>
              {area.replace('_', ' ')}
          </span>
      ))}
    </div>

    {demand.description && (
      <p className="text-xs text-slate-500 line-clamp-2 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
        "{demand.description}"
      </p>
    )}
    
    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
      <button 
        onClick={() => onViewResidents(demand)}
        className="flex items-center gap-1 text-xs text-slate-500 font-medium hover:text-primary-600 bg-slate-50 px-2 py-1 rounded-lg transition-colors"
        title="Ver residentes envolvidos">
        <Users size={14} />
        {demand.residentIds.length} residente(s)
      </button>

      <div className="flex gap-1">
        <button onClick={() => onEdit(demand)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar"><Edit2 size={16}/></button>
        
        {demand.status === 'PENDENTE' && (
          <button onClick={() => onUpdateStatus(demand, 'EM_ANDAMENTO')} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors font-bold flex items-center gap-1 text-xs px-3">
            Iniciar <ArrowRight size={14}/>
          </button>
        )}
        {demand.status === 'EM_ANDAMENTO' && (
          <button onClick={() => onUpdateStatus(demand, 'CONCLUIDA')} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded transition-colors font-bold flex items-center gap-1 text-xs px-3">
            Concluir <CheckCircle2 size={14}/>
          </button>
        )}
      </div>
    </div>
  </div>
);


export const Demands: React.FC<DemandsProps> = ({ data, onSave, onDelete, onSaveProfessional, onDeleteProfessional }) => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [activeTab, setActiveTab] = useState<'DEMANDS' | 'PROFESSIONALS' | 'CONCLUIDAS'>('DEMANDS');
  
  // Filters
  const [filterArea, setFilterArea] = useState<ProfessionalArea | 'TODAS'>('TODAS');
  const [searchBoard, setSearchBoard] = useState('');

  const [currentDemand, setCurrentDemand] = useState<Demand>(EmptyDemand);
  const [viewingResidentsForDemand, setViewingResidentsForDemand] = useState<Demand | null>(null);
  const [completedSearchTerm, setCompletedSearchTerm] = useState('');
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);

  // Filter Logic for Board
  const filterDemands = (demands: Demand[]) => {
    return demands.filter(d => {
      const matchesArea = filterArea === 'TODAS' || d.professionalAreas.includes(filterArea);
      const matchesSearch = d.title.toLowerCase().includes(searchBoard.toLowerCase()) || 
                            d.residentIds.some(rid => data.residents.find(r=>r.id===rid)?.name.toLowerCase().includes(searchBoard.toLowerCase()));
      return matchesArea && matchesSearch;
    });
  };

  const pendingDemands = useMemo(() =>
      filterDemands(data.demands || []).filter(d => d.status === 'PENDENTE').sort((a, b) => new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime()),
      [data.demands, filterArea, searchBoard, data.residents]
  );

  const inProgressDemands = useMemo(() =>
      filterDemands(data.demands || []).filter(d => d.status === 'EM_ANDAMENTO').sort((a, b) => new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime()),
      [data.demands, filterArea, searchBoard, data.residents]
  );

  const completedDemands = useMemo(() => {
    return (data.demands || [])
      .filter(d => d.status === 'CONCLUIDA')
      .filter(d => {
        if (!completedSearchTerm) return true;
        const residentNames = d.residentIds.map(id => data.residents.find(r => r.id === id)?.name || '').join(' ');
        const searchTermLower = completedSearchTerm.toLowerCase();
        return (
          d.title.toLowerCase().includes(searchTermLower) ||
          residentNames.toLowerCase().includes(searchTermLower)
        );
      })
      .sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
  }, [data.demands, completedSearchTerm, data.residents]);


  const handleSaveDemand = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentDemand.title && currentDemand.residentIds.length > 0 && currentDemand.professionalAreas.length > 0) {
      onSave({
        ...currentDemand,
        id: currentDemand.id || crypto.randomUUID()
      });
      setView('LIST');
      setCurrentDemand(EmptyDemand);
    } else {
      alert("Por favor, preencha o título, selecione ao menos um residente e uma área profissional.");
    }
  };

  const handleQuickAction = (title: string, areas: ProfessionalArea[]) => {
    setCurrentDemand({
      ...EmptyDemand,
      title,
      professionalAreas: areas
    });
    setView('FORM');
  };

  const handleUpdateStatus = (demand: Demand, newStatus: Demand['status']) => {
    onSave({ ...demand, status: newStatus });
  };

  const handleEditDemand = (demand: Demand) => {
    setCurrentDemand(demand);
    setView('FORM');
  };

  const handleDeleteDemand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir esta demanda?")) {
      onDelete(id);
    }
  };

  const handleReopenDemand = (demand: Demand) => {
    if (confirm(`Deseja reabrir a demanda "${demand.title}"? O status será alterado para PENDENTE.`)) {
      onSave({ ...demand, status: 'PENDENTE' });
    }
  };

  const handleSaveProfessional = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProfessional && editingProfessional.name && editingProfessional.phone) {
      onSaveProfessional({
        ...editingProfessional,
        id: editingProfessional.id || crypto.randomUUID()
      });
      setEditingProfessional(null);
    } else {
      alert("Nome e Telefone são obrigatórios.");
    }
  };
  
  const handleDeleteProfessional = (id: string | number) => {
    if (confirm("Excluir este profissional?")) {
      onDeleteProfessional(String(id));
    }
  };

  const handleProfessionalPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingProfessional) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxWidth = 300;
          const scaleFactor = maxWidth / img.width;
          const newHeight = img.height * scaleFactor;
          canvas.width = maxWidth;
          canvas.height = newHeight;
          ctx?.drawImage(img, 0, 0, maxWidth, newHeight);
          setEditingProfessional(prev => prev ? ({ ...prev, photo: canvas.toDataURL('image/jpeg', 0.7) }) : null);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleResident = (residentId: string) => {
    setCurrentDemand(prev => {
      const residentIds = prev.residentIds.includes(residentId)
        ? prev.residentIds.filter(id => id !== residentId)
        : [...prev.residentIds, residentId];
      return { ...prev, residentIds };
    });
  };

  const toggleArea = (area: ProfessionalArea) => {
    setCurrentDemand(prev => {
      const professionalAreas = prev.professionalAreas.includes(area)
        ? prev.professionalAreas.filter(a => a !== area)
        : [...prev.professionalAreas, area];
      return { ...prev, professionalAreas };
    });
  };

  const selectAllResidents = () => {
    const allIds = data.residents.filter(r => r.active).map(r => r.id);
    setCurrentDemand(prev => ({ ...prev, residentIds: allIds }));
  };

  if (view === 'FORM') {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="text-primary-600" />
            {currentDemand.id ? 'Editar Demanda' : 'Nova Demanda'}
          </h2>
          <button onClick={() => setView('LIST')} className="text-slate-500 hover:text-slate-800">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSaveDemand} className="space-y-6">
          <div className="grid grid-cols-1">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Título da Tarefa *</label>
              <input 
                required
                type="text"
                placeholder="Ex: Pesagem mensal"
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500"
                value={currentDemand.title}
                onChange={e => setCurrentDemand({ ...currentDemand, title: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Áreas Envolvidas *</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PROFESSIONAL_AREAS.map(area => (
                <label key={area} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border-2 transition-colors ${currentDemand.professionalAreas.includes(area) ? 'bg-primary-50 border-primary-300' : 'bg-white border-slate-100 hover:border-primary-200'}`}>
                  <input
                    type="checkbox"
                    checked={currentDemand.professionalAreas.includes(area)}
                    onChange={() => toggleArea(area)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs font-medium text-slate-700">{area.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição / Detalhes</label>
            <textarea
              rows={3}
              placeholder="Descreva o que precisa ser feito..."
              className="w-full p-2 border border-slate-300 rounded-md"
              value={currentDemand.description}
              onChange={e => setCurrentDemand({ ...currentDemand, description: e.target.value })}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
               <label className="block text-sm font-medium text-slate-700">Residentes Envolvidos *</label>
               <button type="button" onClick={selectAllResidents} className="text-xs text-primary-600 hover:underline font-bold">Selecionar Todos (Ativos)</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-lg">
              {data.residents.filter(r => r.active).sort((a, b) => a.name.localeCompare(b.name)).map(resident => (
                <label key={resident.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${currentDemand.residentIds.includes(resident.id) ? 'bg-white border-primary-300 shadow-sm' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'}`}>
                  <input
                    type="checkbox"
                    checked={currentDemand.residentIds.includes(resident.id)}
                    onChange={() => toggleResident(resident.id)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700 truncate">{resident.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prazo (Opcional)</label>
              <input
                type="date"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={currentDemand.dueDate || ''}
                onChange={e => setCurrentDemand({ ...currentDemand, dueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status Inicial</label>
              <select
                className="w-full p-2 border border-slate-300 rounded-md bg-white"
                value={currentDemand.status}
                onChange={e => setCurrentDemand({ ...currentDemand, status: e.target.value as any })}
              >
                <option value="PENDENTE">Pendente</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="CONCLUIDA">Concluída</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4 justify-end pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setView('LIST')} className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Cancelar</button>
            <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"><Save size={16}/> Salvar Tarefa</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {viewingResidentsForDemand && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Users size={20} />
                Residentes Envolvidos
              </h3>
              <button onClick={() => setViewingResidentsForDemand(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="text-sm text-slate-600 mb-4 bg-slate-50 p-2 rounded border border-slate-100">
              <strong>Demanda:</strong> {viewingResidentsForDemand.title}
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {viewingResidentsForDemand.residentIds.map(residentId => {
                const resident = data.residents.find(r => r.id === residentId);
                if (!resident) return null;
                return (
                  <div key={resident.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <div className="w-8 h-10 rounded bg-slate-100 overflow-hidden shrink-0">
                      {resident.photo ? (
                        <img src={resident.photo} alt={resident.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="m-auto mt-2 text-slate-400" size={16} />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-sm">{resident.name}</p>
                      <p className="text-xs text-slate-500">Quarto: {resident.room}</p>
                    </div>
                  </div>
                );
              })}
              {viewingResidentsForDemand.residentIds.length === 0 && (
                 <p className="text-slate-400 text-center py-4">Nenhum residente associado a esta demanda.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {editingProfessional && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveProfessional} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">{editingProfessional.id ? 'Editar' : 'Novo'} Profissional</h3>
              <button type="button" onClick={() => setEditingProfessional(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            {/* Foto Upload */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative group">
                <div className="w-24 h-32 rounded-xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden">
                  {editingProfessional.photo ? (
                    <img src={editingProfessional.photo} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-slate-400" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 shadow-sm transition-colors">
                  <Camera size={16} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleProfessionalPhotoUpload} />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
              <input required className="w-full p-2 border border-slate-300 rounded-md" value={editingProfessional.name} onChange={e => setEditingProfessional({...editingProfessional, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Área *</label>
              <select required className="w-full p-2 border border-slate-300 rounded-md" value={editingProfessional.area} onChange={e => setEditingProfessional({...editingProfessional, area: e.target.value as ProfessionalArea})}>
                {PROFESSIONAL_AREAS.map(area => <option key={area} value={area}>{area.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp (com DDD) *</label>
              <input required placeholder="Ex: 11999998888" className="w-full p-2 border border-slate-300 rounded-md" value={editingProfessional.phone} onChange={e => setEditingProfessional({...editingProfessional, phone: e.target.value})} />
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <button type="button" onClick={() => setEditingProfessional(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"><Save size={16}/> Salvar</button>
            </div>
          </form>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="text-primary-600" />
            Central de Demandas
          </h2>
          <p className="text-slate-500 text-sm">Painel de tarefas e solicitações multidisciplinares.</p>
        </div>
        <div className="flex gap-2">
            {activeTab === 'DEMANDS' && (
            <button onClick={() => setView('FORM')} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 shadow-sm font-medium">
                <Plus size={20} /> Nova Demanda
            </button>
            )}
            {activeTab === 'PROFESSIONALS' && (
            <button onClick={() => setEditingProfessional(EmptyProfessional)} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 shadow-sm font-medium">
                <Plus size={20} /> Novo Profissional
            </button>
            )}
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'DEMANDS' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('DEMANDS')}>
          <div className="flex items-center gap-2"><ClipboardList size={18} /> Painel de Tarefas</div>
        </button>
        <button className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'PROFESSIONALS' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('PROFESSIONALS')}>
          <div className="flex items-center gap-2"><Contact size={18} /> Profissionais</div>
        </button>
        <button className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'CONCLUIDAS' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('CONCLUIDAS')}>
          <div className="flex items-center gap-2"><CheckCircle2 size={18} /> Histórico</div>
        </button>
      </div>

      {/* --- TASK BOARD TAB --- */}
      {activeTab === 'DEMANDS' && (
        <div className="space-y-6">
            
            {/* QUICK ACTIONS BAR */}
            <div className="flex flex-wrap gap-2 pb-2">
                <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-2 bg-slate-50 px-2 py-1 rounded">
                    <Zap size={14} className="mr-1"/> Acesso Rápido:
                </div>
                {QUICK_ACTIONS.map(action => (
                    <button 
                        key={action.label}
                        onClick={() => handleQuickAction(action.title, action.areas)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors shadow-sm shrink-0 text-sm text-slate-600 font-medium"
                    >
                        {action.icon} {action.label}
                    </button>
                ))}
            </div>

            {/* FILTERS & SEARCH BAR */}
            <div className="flex flex-col md:flex-row gap-4 items-start bg-white p-3 rounded-xl shadow-sm border border-slate-100">
               <div className="flex items-center gap-2 px-2 text-slate-500 shrink-0 mt-1.5">
                  <Filter size={18} /> <span className="text-sm font-bold">Filtrar:</span>
               </div>
               
               <div className="flex flex-1 flex-wrap gap-2 w-full">
                  <button 
                    onClick={() => setFilterArea('TODAS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${filterArea === 'TODAS' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                  >
                    <Layers size={14} /> TODAS
                  </button>
                  {PROFESSIONAL_AREAS.map(area => {
                    const config = getAreaConfig(area);
                    return (
                        <button 
                            key={area}
                            onClick={() => setFilterArea(area)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border flex items-center gap-2 ${filterArea === area ? getAreaColor(area) + ' shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                            {config.icon}
                            {config.label}
                        </button>
                    )
                  })}
               </div>

               <div className="relative w-full md:w-64 shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar tarefa..." 
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    value={searchBoard}
                    onChange={e => setSearchBoard(e.target.value)}
                  />
               </div>
            </div>

            {/* BOARD COLUMNS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start h-[calc(100vh-320px)]">
                {/* PENDING COLUMN */}
                <div className="flex flex-col h-full bg-slate-100/50 rounded-xl border border-slate-200/60 overflow-hidden">
                    <div className="p-3 bg-amber-50/80 border-b border-amber-100 flex justify-between items-center backdrop-blur-sm sticky top-0 z-10">
                        <span className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                            <Clock size={16} /> PENDENTE
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-amber-800 border border-amber-100 shadow-sm">{pendingDemands.length}</span>
                    </div>
                    <div className="p-3 overflow-y-auto flex-1 space-y-3">
                        {pendingDemands.map(demand => (
                            <DemandCard key={demand.id} demand={demand} onUpdateStatus={handleUpdateStatus} onEdit={handleEditDemand} onViewResidents={setViewingResidentsForDemand} />
                        ))}
                        {pendingDemands.length === 0 && (
                            <div className="text-center py-10 text-slate-400 text-sm italic">
                                Nenhuma tarefa pendente.
                            </div>
                        )}
                    </div>
                </div>

                {/* IN PROGRESS COLUMN */}
                <div className="flex flex-col h-full bg-slate-100/50 rounded-xl border border-slate-200/60 overflow-hidden">
                    <div className="p-3 bg-blue-50/80 border-b border-blue-100 flex justify-between items-center backdrop-blur-sm sticky top-0 z-10">
                        <span className="flex items-center gap-2 font-bold text-blue-800 text-sm">
                            <RotateCw size={16} /> EM ANDAMENTO
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-blue-800 border border-blue-100 shadow-sm">{inProgressDemands.length}</span>
                    </div>
                    <div className="p-3 overflow-y-auto flex-1 space-y-3">
                        {inProgressDemands.map(demand => (
                            <DemandCard key={demand.id} demand={demand} onUpdateStatus={handleUpdateStatus} onEdit={handleEditDemand} onViewResidents={setViewingResidentsForDemand} />
                        ))}
                        {inProgressDemands.length === 0 && (
                            <div className="text-center py-10 text-slate-400 text-sm italic">
                                Nenhuma tarefa em andamento.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
      
      {/* --- PROFESSIONALS TAB --- */}
      {activeTab === 'PROFESSIONALS' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold">
                <tr>
                  <th className="p-4">Nome</th>
                  <th className="p-4">Área</th>
                  <th className="p-4">WhatsApp</th>
                  <th className="p-4 text-center">Demandas Ativas</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data.professionals || []).map(prof => {
                  const activeDemandsCount = (data.demands || []).filter(d => d.professionalAreas.includes(prof.area) && d.status !== 'CONCLUIDA').length;
                  const waLink = getConsolidatedWhatsAppLink(prof, data.demands || [], data.residents || []);

                  return (
                    <tr key={prof.id}>
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-10 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                           {prof.photo ? (
                             <img src={prof.photo} alt={prof.name} className="w-full h-full object-cover" />
                           ) : (
                             <User size={18} className="text-slate-400" />
                           )}
                        </div>
                        <span className="font-medium text-slate-800">{prof.name}</span>
                      </td>
                      <td className="p-4">
                          <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${getAreaColor(prof.area)}`}>
                            {prof.area.replace('_', ' ')}
                          </span>
                      </td>
                      <td className="p-4">{prof.phone}</td>
                      <td className="p-4 text-center font-bold">{activeDemandsCount}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {waLink ? (
                              <a href={waLink} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 flex items-center gap-2 text-xs font-bold shadow-sm">
                                  <Send size={14}/> Notificar
                              </a>
                          ) : (
                              <button disabled className="bg-slate-200 text-slate-500 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold cursor-not-allowed">
                                  <Send size={14}/> Notificar
                              </button>
                          )}
                          <button onClick={() => setEditingProfessional(prof)} className="text-primary-600 hover:bg-primary-50 p-2 rounded-full"><Edit2 size={18} /></button>
                          <button onClick={() => handleDeleteProfessional(prof.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(data.professionals || []).length === 0 && <div className="p-12 text-center text-slate-400">Nenhum profissional cadastrado.</div>}
          </div>
        </div>
      )}

      {/* --- COMPLETED TAB --- */}
      {activeTab === 'CONCLUIDAS' && (
        <div className="animate-in fade-in space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar em demandas concluídas..."
              value={completedSearchTerm}
              onChange={(e) => setCompletedSearchTerm(e.target.value)}
              className="w-full p-3 pl-10 border border-slate-200 rounded-lg shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          </div>
    
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-4">Título</th>
                    <th className="p-4">Áreas</th>
                    <th className="p-4">Residentes</th>
                    <th className="p-4">Data Criação</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {completedDemands.map(demand => (
                    <tr key={demand.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-800">{demand.title}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {demand.professionalAreas.map(area => (
                            <span key={area} className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getAreaColor(area)}`}>
                              {area.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => setViewingResidentsForDemand(demand)}
                          className="flex items-center gap-1.5 hover:bg-slate-100 p-1 rounded-md"
                        >
                          <Users size={14} className="text-slate-400" />
                          <span className="font-medium">{demand.residentIds.length}</span>
                        </button>
                      </td>
                      <td className="p-4 text-slate-500">{new Date(demand.creationDate).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReopenDemand(demand)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 text-xs font-bold"
                          >
                            <RotateCw size={14} /> Reabrir
                          </button>
                          <button
                            onClick={(e) => handleDeleteDemand(e, demand.id)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 text-xs font-bold"
                          >
                            <Trash2 size={14} /> Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {completedDemands.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  {completedSearchTerm ? 'Nenhuma demanda concluída encontrada.' : 'Nenhuma demanda foi concluída ainda.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
