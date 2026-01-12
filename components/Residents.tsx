
import React, { useState, useMemo } from 'react';
import { AppData, Resident, Responsible, Transaction, ResidentDocument, Pharmacy, Demand, ProfessionalArea } from '../types';
import { Search, Plus, Edit2, Trash2, Phone, Mail, User, Eye, EyeOff, ArrowLeft, Package, Clock, Calendar, Camera, Upload, MessageCircle, Save, X, FileText, CheckCircle2, Users, Link, ExternalLink, Building2, AlertTriangle, FileCheck, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ResidentsProps {
  data: AppData;
  onSave: (resident: Resident) => void;
  onDelete: (id: string) => void;
  onDeleteTransaction?: (id: string) => void;
  onUpdateTransaction?: (transaction: Transaction) => void;
  onSaveDemand: (demand: Demand) => void;
}

const EmptyResponsible: Responsible = { name: '', relation: '', phone1: '', phone2: '', email: '' };
const EmptyResident: Resident = {
  id: '',
  name: '',
  birthDate: '',
  room: '',
  cpf: '',
  admissionDate: '',
  photo: '',
  dailyExchangeEstimate: 5,
  absorbentDailyExchangeEstimate: 0,
  observations: '',
  responsible: { ...EmptyResponsible },
  pharmacyPhone: '',
  pharmacies: [],
  active: true,
  documents: []
};

export const Residents: React.FC<ResidentsProps> = ({ data, onSave, onDelete, onDeleteTransaction, onUpdateTransaction, onSaveDemand }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'details'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentResident, setCurrentResident] = useState<Resident>(EmptyResident);
  const [activeFormTab, setActiveFormTab] = useState<'PERSONAL' | 'CONTACT' | 'DOCS'>('PERSONAL');
  
  // Link Modal State
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkIssueDate, setLinkIssueDate] = useState(''); // Novo: Data de emissão do documento
  const [linkType, setLinkType] = useState<ResidentDocument['type']>('OUTRO');

  // New Pharmacy State
  const [newPharmacyName, setNewPharmacyName] = useState('');
  const [newPharmacyPhone, setNewPharmacyPhone] = useState('');

  // Edit Transaction State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Toggle para mostrar inativos na lista (opcional, mas bom para gestão)
  const [showInactive, setShowInactive] = useState(true);

  const filteredResidents = data.residents
    .filter(r => {
      // Filtro de busca
      const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.room.toLowerCase().includes(searchTerm.toLowerCase());
      // Filtro de inativos (se quisermos esconder totalmente da lista principal, mas o pedido foi sobre o ícone)
      // Mantendo todos visíveis na lista de residentes para poder reativar, mas ordenando ativos primeiro
      return matchesSearch;
    })
    .sort((a, b) => {
       // Ativos primeiro
       if (a.active && !b.active) return -1;
       if (!a.active && b.active) return 1;
       return a.name.localeCompare(b.name);
    });

  // --- WhatsApp Helper ---
  const getWhatsAppLink = (resident: Resident, item: { name: string, balance: number, unit: string }) => {
    const phone = resident.responsible.phone1.replace(/\D/g, ''); // Numbers only
    if (!phone) return null;
    const fullPhone = phone.length <= 11 ? `55${phone}` : phone;
    const message = `Olá ${resident.responsible.name}, aqui é da casa de repouso. \n\nEstamos entrando em contato referente ao(à) residente ${resident.name}. \n\nO estoque do item *${item.name}* está acabando (restam apenas ${item.balance} unidades). \n\nPoderia providenciar a reposição? \n\nObrigado!`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  };

  // --- Helper: Check Document Validity (180 days) ---
  const getExpirationInfo = (issueDate?: string) => {
    if (!issueDate) return null;
    
    const issue = new Date(issueDate);
    // Adiciona 180 dias
    const expirationDate = new Date(issue);
    expirationDate.setDate(expirationDate.getDate() + 180);
    
    const today = new Date();
    // Zera horas para comparar apenas datas
    today.setHours(0,0,0,0);
    expirationDate.setHours(0,0,0,0);

    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    return {
        expirationDate,
        daysRemaining: diffDays,
        isExpired: diffDays < 0
    };
  };

  // --- Image Handling ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          setCurrentResident(prev => ({ ...prev, photo: base64 }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setCurrentResident(prev => ({ ...prev, photo: '' }));
  };

  // --- CPF Helper ---
  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    
    setCurrentResident(prev => ({ ...prev, cpf: value }));
  };

  // --- Document Link Handling ---
  const handleOpenLinkModal = (type: ResidentDocument['type']) => {
    setLinkType(type);
    setLinkUrl('');
    setLinkIssueDate(''); // Reset date
    setLinkModalOpen(true);
  };

  const handleSaveDocumentLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl) return;

    const newDoc: ResidentDocument = {
      id: crypto.randomUUID(),
      name: `Link - ${linkType.replace('_', ' ')}`,
      type: linkType,
      date: new Date().toISOString().split('T')[0],
      linkUrl: linkUrl,
      issueDate: linkIssueDate // Salva a data de emissão se fornecida
    };

    setCurrentResident(prev => ({
      ...prev,
      documents: [...(prev.documents || []), newDoc]
    }));
    
    setLinkModalOpen(false);
  };

  const removeDocument = (docId: string) => {
    setCurrentResident(prev => ({
      ...prev,
      documents: (prev.documents || []).filter(d => d.id !== docId)
    }));
  };

  // --- Pharmacy Handling ---
  const handleAddPharmacy = () => {
    if (!newPharmacyName || !newPharmacyPhone) {
      alert("Preencha nome e telefone da farmácia.");
      return;
    }
    const newPharmacy: Pharmacy = {
      id: crypto.randomUUID(),
      name: newPharmacyName,
      phone: newPharmacyPhone
    };
    setCurrentResident(prev => ({
      ...prev,
      pharmacies: [...(prev.pharmacies || []), newPharmacy]
    }));
    setNewPharmacyName('');
    setNewPharmacyPhone('');
  };

  const handleRemovePharmacy = (id: string) => {
    if(confirm("Remover esta farmácia?")) {
      setCurrentResident(prev => ({
        ...prev,
        pharmacies: (prev.pharmacies || []).filter(p => p.id !== id)
      }));
    }
  };

  // --- CRUD Logic ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const residentToSave = {
      ...currentResident,
      id: currentResident.id || crypto.randomUUID()
    };
    onSave(residentToSave);
    setViewMode('list');
    setCurrentResident(EmptyResident);
    setActiveFormTab('PERSONAL');
  };

  const handleEdit = (e: React.MouseEvent | null, resident: Resident) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentResident(resident);
    setViewMode('form');
    setActiveFormTab('PERSONAL');
  };

  const handleViewDetails = (e: React.MouseEvent | null, resident: Resident) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentResident(resident);
    setViewMode('details');
  };

  // NOVA FUNÇÃO PARA ALTERNAR STATUS ATIVO/INATIVO
  const handleToggleActive = (e: React.MouseEvent, resident: Resident) => {
    e.preventDefault();
    e.stopPropagation();
    const newStatus = !resident.active;
    // Salva diretamente
    onSave({ ...resident, active: newStatus });
  };

  const handleDelete = (e: React.MouseEvent | null, id: string) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (window.confirm('ATENÇÃO: Tem certeza que deseja excluir este residente?\nIsso removerá o cadastro do sistema.')) {
      onDelete(id);
      if (viewMode === 'details') setViewMode('list');
    }
  };

  // --- Transaction Management (Edit/Delete) ---
  const handleDeleteTx = (id: string) => {
    if(confirm("Deseja excluir esta movimentação? O estoque será revertido automaticamente.")) {
      if(onDeleteTransaction) onDeleteTransaction(id);
    }
  };

  const handleSaveTxEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if(editingTransaction && onUpdateTransaction) {
      onUpdateTransaction(editingTransaction);
      setEditingTransaction(null); // Close modal
    }
  };

  // --- Document Button Handler ---
  const handleDocAction = (e: React.MouseEvent, resident: Resident, docType: string, label: string, areas: ProfessionalArea[]) => {
    e.stopPropagation(); // Stop card click
    
    const doc = resident.documents?.find(d => d.type === docType);
    
    if (doc && doc.linkUrl) {
        window.open(doc.linkUrl, '_blank');
    } else {
        if(confirm(`O documento ${label} não consta no cadastro de ${resident.name}.\n\nDeseja criar uma demanda automática para elaboração deste documento?`)) {
            const newDemand: Demand = {
               id: crypto.randomUUID(),
               title: `Elaboração de ${label} - ${resident.name}`,
               description: `Solicitado via botão de acesso rápido na tela de Residentes. Documento pendente: ${label}.`,
               residentIds: [resident.id],
               professionalAreas: areas,
               status: 'PENDENTE',
               creationDate: new Date().toISOString().split('T')[0]
            };
            onSaveDemand(newDemand);
            alert('Demanda criada e enviada para o painel da equipe!');
        }
    }
  };

  const getAge = (dateString: string) => {
    if (!dateString) return '-';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // --- Details Dashboard Logic ---
  const residentStats = useMemo(() => {
    if (!currentResident.id) return null;
    const transactions = data.transactions.filter(t => t.residentId === currentResident.id);
    const stockBalance: Record<string, { name: string, in: number, out: number, balance: number, unit: string }> = {};
    
    transactions.forEach(t => {
       if (!stockBalance[t.productId]) {
         const product = data.products.find(p => p.id === t.productId);
         stockBalance[t.productId] = { 
           name: t.productName, 
           in: 0, 
           out: 0, 
           balance: 0,
           unit: 'Unidades'
         };
       }
       if (t.type === 'IN') {
         stockBalance[t.productId].in += t.quantity;
         stockBalance[t.productId].balance += t.quantity;
       } else {
         stockBalance[t.productId].out += t.quantity;
         stockBalance[t.productId].balance -= t.quantity;
       }
    });

    const last30Days = new Array(30).fill(0).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });

    const chartData = last30Days.map(date => {
      const dayTotal = transactions
        .filter(t => t.type === 'OUT' && t.date === date)
        .reduce((acc, t) => acc + t.quantity, 0);
      return { date: date.split('-').slice(1).join('/'), total: dayTotal };
    });

    return {
       stockBalance: Object.values(stockBalance).sort((a, b) => a.name.localeCompare(b.name)),
       chartData,
       history: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50)
    };
  }, [currentResident.id, data.transactions, data.products]);


  // --- Render Views ---

  if (viewMode === 'details' && residentStats) {
    return (
      <div className="space-y-6 relative">
         {/* EDIT TRANSACTION MODAL */}
         {editingTransaction && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-lg text-slate-800">Editar Movimentação</h3>
                     <button onClick={() => setEditingTransaction(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleSaveTxEdit} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                        <input 
                          type="date" 
                          required
                          className="w-full p-2 border border-slate-300 rounded-md"
                          value={editingTransaction.date}
                          onChange={e => setEditingTransaction({...editingTransaction, date: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Produto</label>
                        <input 
                          type="text" 
                          disabled
                          className="w-full p-2 bg-slate-100 border border-slate-300 rounded-md text-slate-500"
                          value={editingTransaction.productName}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
                        <input 
                          type="number" 
                          required
                          min="1"
                          className="w-full p-2 border border-slate-300 rounded-md font-bold"
                          value={editingTransaction.quantity}
                          onChange={e => setEditingTransaction({...editingTransaction, quantity: parseInt(e.target.value) || 0})}
                        />
                        <p className="text-xs text-slate-400 mt-1">O estoque será recalculado automaticamente.</p>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                        <input 
                          type="text" 
                          className="w-full p-2 border border-slate-300 rounded-md"
                          value={editingTransaction.notes || ''}
                          onChange={e => setEditingTransaction({...editingTransaction, notes: e.target.value})}
                        />
                     </div>
                     <div className="flex gap-3 justify-end pt-4 border-t">
                        <button type="button" onClick={() => setEditingTransaction(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"><Save size={16}/> Salvar</button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         <button onClick={() => setViewMode('list')} className="flex items-center gap-2 text-slate-500 hover:text-primary-600 mb-2">
            <ArrowLeft size={20} /> Voltar para Lista
         </button>

         {/* Header */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
               <div className="w-24 h-32 rounded-xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {currentResident.photo ? (
                    <img src={currentResident.photo} alt={currentResident.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-slate-400" />
                  )}
               </div>
               <div>
                 <h1 className="text-2xl font-bold text-slate-800">{currentResident.name}</h1>
                 <p className="text-slate-500 text-lg">Quarto: {currentResident.room} | {getAge(currentResident.birthDate)} anos</p>
                 <div className="mt-2 text-sm text-slate-400 flex flex-col gap-1">
                    <span>CPF: {currentResident.cpf || 'Não informado'}</span>
                    <span>Admissão: {currentResident.admissionDate ? currentResident.admissionDate.split('-').reverse().join('/') : '-'}</span>
                 </div>
               </div>
            </div>
            <div className="flex gap-2">
               <button onClick={(e) => handleEdit(e, currentResident)} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600">
                 <Edit2 size={18} /> Editar
               </button>
               <button 
                 onClick={(e) => handleDelete(e, currentResident.id)} 
                 className="flex items-center gap-2 px-4 py-2 border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 cursor-pointer"
                 type="button"
               >
                 <Trash2 size={18} className="pointer-events-none" /> Excluir
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Inventory Balance */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Package className="text-primary-500" /> 
                  Saldo de Estoque Pessoal
               </h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-600 font-semibold">
                     <tr>
                       <th className="p-3 rounded-l-lg">Produto</th>
                       <th className="p-3 text-right">Saldo</th>
                       <th className="p-3 text-right rounded-r-lg">Ações</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {residentStats.stockBalance.length > 0 ? residentStats.stockBalance.map((item) => {
                       const isLow = item.balance <= 5; // Warning Threshold
                       const waLink = getWhatsAppLink(currentResident, item);
                       
                       return (
                         <tr key={item.name}>
                           <td className="p-3">
                              <div className="font-medium text-slate-700">{item.name}</div>
                              <div className="text-xs text-slate-400">In: {item.in} | Out: {item.out}</div>
                           </td>
                           <td className="p-3 text-right">
                             <span className={`px-2 py-1 rounded font-bold ${item.balance <= 0 ? 'bg-red-100 text-red-700' : (isLow ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}`}>
                               {item.balance} Unidades
                             </span>
                           </td>
                           <td className="p-3 text-right">
                             {isLow && waLink && (
                               <a 
                                 href={waLink}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="inline-flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-green-600 transition-colors"
                                 title="Solicitar reposição via WhatsApp"
                               >
                                 <MessageCircle size={14} />
                                 Pedir
                               </a>
                             )}
                           </td>
                         </tr>
                       );
                     }) : (
                       <tr><td colSpan={3} className="p-4 text-center text-slate-400">Sem movimentações registradas.</td></tr>
                     )}
                   </tbody>
                 </table>
                 <p className="text-xs text-slate-400 mt-3">* Saldo baixo (≤5) habilita botão de contato.</p>
               </div>
            </div>

             {/* Consumption Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Calendar className="text-primary-500" /> 
                  Consumo Diário (30 dias)
               </h3>
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={residentStats.chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{fontSize: 10}} interval={4} stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none'}} />
                      <Bar dataKey="total" fill="#f97316" radius={[2, 2, 0, 0]} name="Itens Usados" />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         {/* History with Edit/Delete */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="text-primary-500" /> 
                Histórico de Movimentações
             </h3>
             <div className="overflow-y-auto max-h-96">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10">
                     <tr>
                       <th className="p-3">Data</th>
                       <th className="p-3">Ação</th>
                       <th className="p-3">Produto</th>
                       <th className="p-3 text-right">Qtd</th>
                       <th className="p-3">Obs</th>
                       <th className="p-3 text-right">Ações</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {residentStats.history.map(t => (
                       <tr key={t.id} className="hover:bg-slate-50 group">
                         <td className="p-3">{t.date.split('-').reverse().join('/')}</td>
                         <td className="p-3">
                           <span className={`text-xs font-bold px-2 py-1 rounded ${t.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
                             {t.type === 'IN' ? 'ENTRADA' : 'SAÍDA'}
                           </span>
                         </td>
                         <td className="p-3 font-medium">{t.productName}</td>
                         <td className="p-3 text-right font-bold">{t.quantity}</td>
                         <td className="p-3 text-slate-500 truncate max-w-xs">{t.notes || '-'}</td>
                         <td className="p-3 text-right">
                           <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setEditingTransaction(t)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteTx(t.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Excluir"
                              >
                                <Trash2 size={14} />
                              </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
             </div>
         </div>
      </div>
    );
  }

  if (viewMode === 'form') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">
            {currentResident.id ? 'Editar Residente' : 'Novo Residente'}
          </h2>
          <button 
            onClick={() => { setViewMode('list'); setCurrentResident(EmptyResident); }}
            className="text-slate-500 hover:text-slate-700"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="flex border-b border-slate-200">
           <button 
             onClick={() => setActiveFormTab('PERSONAL')}
             className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeFormTab === 'PERSONAL' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
             Dados Pessoais
           </button>
           <button 
             onClick={() => setActiveFormTab('CONTACT')}
             className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeFormTab === 'CONTACT' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
             Contatos & Responsável
           </button>
           <button 
             onClick={() => setActiveFormTab('DOCS')}
             className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeFormTab === 'DOCS' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
             Documentos & Laudos
           </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
            {/* TAB: PERSONAL */}
            {activeFormTab === 'PERSONAL' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-24 h-32 rounded-xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden relative group shadow-sm">
                    {currentResident.photo ? (
                      <img src={currentResident.photo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={24} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors">
                      <Upload size={16} />
                      {currentResident.photo ? 'Trocar Foto' : 'Enviar Foto'}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    {currentResident.photo && (
                      <button 
                        type="button" 
                        onClick={handleRemovePhoto}
                        className="text-sm text-red-500 hover:text-red-700 text-left px-1"
                      >
                        Remover foto
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
                  <input 
                    required
                    type="text" 
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={currentResident.name}
                    onChange={e => setCurrentResident({...currentResident, name: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                    <input 
                      type="text" 
                      placeholder="000.000.000-00"
                      className="w-full p-2 border border-slate-300 rounded-md"
                      value={currentResident.cpf || ''}
                      onChange={handleCPFChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Nasc.</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-slate-300 rounded-md"
                      value={currentResident.birthDate}
                      onChange={e => setCurrentResident({...currentResident, birthDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data de Admissão</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-slate-300 rounded-md"
                      value={currentResident.admissionDate || ''}
                      onChange={e => setCurrentResident({...currentResident, admissionDate: e.target.value})}
                    />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quarto/Apto</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-slate-300 rounded-md"
                      value={currentResident.room}
                      onChange={e => setCurrentResident({...currentResident, room: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                  <h3 className="font-bold text-blue-800 mb-3 text-sm">Estimativas de Uso Diário</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Trocas de Fraldas (Estimativa)</label>
                      <input 
                        type="number" 
                        min="0"
                        className="w-full p-2 border border-slate-300 rounded-md"
                        value={currentResident.dailyExchangeEstimate}
                        onChange={e => setCurrentResident({...currentResident, dailyExchangeEstimate: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Trocas de Absorventes (Estimativa)</label>
                      <input 
                        type="number" 
                        min="0"
                        className="w-full p-2 border border-slate-300 rounded-md"
                        value={currentResident.absorbentDailyExchangeEstimate || 0}
                        onChange={e => setCurrentResident({...currentResident, absorbentDailyExchangeEstimate: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observações Médicas/Gerais</label>
                  <textarea 
                    className="w-full p-2 border border-slate-300 rounded-md"
                    rows={3}
                    value={currentResident.observations}
                    onChange={e => setCurrentResident({...currentResident, observations: e.target.value})}
                  />
                </div>
              </div>
            )}

            {/* TAB: CONTACT */}
            {activeFormTab === 'CONTACT' && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Responsável</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-slate-300 rounded-md"
                    value={currentResident.responsible.name}
                    onChange={e => setCurrentResident({
                      ...currentResident, 
                      responsible: {...currentResident.responsible, name: e.target.value}
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Parentesco</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-slate-300 rounded-md"
                    value={currentResident.responsible.relation}
                    onChange={e => setCurrentResident({
                      ...currentResident, 
                      responsible: {...currentResident.responsible, relation: e.target.value}
                    })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefone 1 *</label>
                    <input 
                      required
                      type="tel" 
                      placeholder="Com DDD"
                      className="w-full p-2 border border-slate-300 rounded-md"
                      value={currentResident.responsible.phone1}
                      onChange={e => setCurrentResident({
                        ...currentResident, 
                        responsible: {...currentResident.responsible, phone1: e.target.value}
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefone 2</label>
                    <input 
                      type="tel" 
                      className="w-full p-2 border border-slate-300 rounded-md"
                      value={currentResident.responsible.phone2}
                      onChange={e => setCurrentResident({
                        ...currentResident, 
                        responsible: {...currentResident.responsible, phone2: e.target.value}
                      })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                  <input 
                    type="email" 
                    className="w-full p-2 border border-slate-300 rounded-md"
                    value={currentResident.responsible.email}
                    onChange={e => setCurrentResident({
                      ...currentResident, 
                      responsible: {...currentResident.responsible, email: e.target.value}
                    })}
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 mb-3">Farmácia Preferencial</h3>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Telefone da Farmácia (Principal/Padrao)</label>
                      <input 
                        type="tel" 
                        placeholder="Ex: 11999999999 (Whatsapp)"
                        className="w-full p-2 border border-slate-300 rounded-md"
                        value={currentResident.pharmacyPhone || ''}
                        onChange={e => setCurrentResident({...currentResident, pharmacyPhone: e.target.value})}
                      />
                      <p className="text-xs text-slate-400 mt-1">Número usado como padrão.</p>
                    </div>

                    <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                       <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase flex items-center gap-1">
                          <Building2 size={14}/> Outras Farmácias / Contatos de Orçamento
                       </h4>
                       <p className="text-xs text-blue-600 mb-2 font-medium">Nota: As farmácias cadastradas aqui ficarão disponíveis para orçamentos de todos os residentes.</p>
                       <div className="flex gap-2 mb-2">
                          <input 
                            type="text" 
                            placeholder="Nome (ex: Drogasil)" 
                            className="flex-1 p-2 border border-slate-300 rounded text-sm"
                            value={newPharmacyName}
                            onChange={(e) => setNewPharmacyName(e.target.value)}
                          />
                          <input 
                            type="tel" 
                            placeholder="Telefone (Whatsapp)" 
                            className="w-40 p-2 border border-slate-300 rounded text-sm"
                            value={newPharmacyPhone}
                            onChange={(e) => setNewPharmacyPhone(e.target.value)}
                          />
                          <button 
                            type="button" 
                            onClick={handleAddPharmacy}
                            className="bg-green-600 text-white px-3 rounded font-bold hover:bg-green-700 text-sm"
                          >
                             Adicionar
                          </button>
                       </div>
                       
                       <div className="space-y-1">
                          {(currentResident.pharmacies || []).map((pharmacy) => (
                             <div key={pharmacy.id} className="flex justify-between items-center bg-white p-2 border border-slate-200 rounded text-sm">
                                <span className="font-medium text-slate-700">{pharmacy.name} - {pharmacy.phone}</span>
                                <button 
                                  type="button" 
                                  onClick={() => handleRemovePharmacy(pharmacy.id)}
                                  className="text-red-400 hover:text-red-600"
                                >
                                   <Trash2 size={14}/>
                                </button>
                             </div>
                          ))}
                          {(currentResident.pharmacies || []).length === 0 && (
                             <p className="text-xs text-slate-400 italic">Nenhuma outra farmácia cadastrada.</p>
                          )}
                       </div>
                    </div>
                </div>
              </div>
            )}

            {/* TAB: DOCS */}
            {activeFormTab === 'DOCS' && (
              <div className="space-y-6 animate-in fade-in">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div 
                      onClick={() => handleOpenLinkModal('LAUDO')}
                      className="bg-slate-50 border-2 border-dashed border-slate-300 hover:border-blue-400 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors text-center group"
                    >
                       <Link className="text-slate-400 group-hover:text-blue-500 mb-2" />
                       <span className="text-sm font-bold text-slate-600">Vincular Laudo</span>
                       <span className="text-xs text-slate-400">Google Drive / Nuvem</span>
                    </div>
                    
                    <div 
                      onClick={() => handleOpenLinkModal('VACINA')}
                      className="bg-slate-50 border-2 border-dashed border-slate-300 hover:border-green-400 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors text-center group"
                    >
                       <Link className="text-slate-400 group-hover:text-green-500 mb-2" />
                       <span className="text-sm font-bold text-slate-600">Cartão de Vacina</span>
                       <span className="text-xs text-slate-400">Google Drive / Nuvem</span>
                    </div>

                    <div 
                      onClick={() => handleOpenLinkModal('RECEITA')}
                      className="bg-slate-50 border-2 border-dashed border-slate-300 hover:border-purple-400 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors text-center group"
                    >
                       <Link className="text-slate-400 group-hover:text-purple-500 mb-2" />
                       <span className="text-sm font-bold text-slate-600">Vincular Receita</span>
                       <span className="text-xs text-slate-400">Google Drive / Nuvem</span>
                    </div>

                    <div 
                      onClick={() => handleOpenLinkModal('RG')}
                      className="bg-slate-50 border-2 border-dashed border-slate-300 hover:border-indigo-400 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors text-center group"
                    >
                       <Link className="text-slate-400 group-hover:text-indigo-500 mb-2" />
                       <span className="text-sm font-bold text-slate-600">Vincular RG</span>
                       <span className="text-xs text-slate-400">Google Drive / Nuvem</span>
                    </div>

                    <div 
                      onClick={() => handleOpenLinkModal('COMPROVANTE')}
                      className="bg-slate-50 border-2 border-dashed border-slate-300 hover:border-amber-400 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors text-center group"
                    >
                       <Link className="text-slate-400 group-hover:text-amber-500 mb-2" />
                       <span className="text-sm font-bold text-slate-600">Comprovante Resid.</span>
                       <span className="text-xs text-slate-400">Google Drive / Nuvem</span>
                    </div>

                    {/* NOVOS CARDS ADICIONADOS */}
                    <div 
                      onClick={() => handleOpenLinkModal('PIA')}
                      className="bg-slate-50 border-2 border-dashed border-slate-300 hover:border-teal-400 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors text-center group"
                    >
                       <Link className="text-slate-400 group-hover:text-teal-500 mb-2" />
                       <span className="text-sm font-bold text-slate-600">Vincular PIA</span>
                       <span className="text-xs text-slate-400">Google Drive / Nuvem</span>
                    </div>

                    <div 
                      onClick={() => handleOpenLinkModal('PAISI')}
                      className="bg-slate-50 border-2 border-dashed border-slate-300 hover:border-orange-400 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors text-center group"
                    >
                       <Link className="text-slate-400 group-hover:text-orange-500 mb-2" />
                       <span className="text-sm font-bold text-slate-600">Vincular P.A.I.S.I.</span>
                       <span className="text-xs text-slate-400">Google Drive / Nuvem</span>
                    </div>

                    <div 
                      onClick={() => handleOpenLinkModal('RELATORIO_PSICOSSOCIAL')}
                      className="bg-slate-50 border-2 border-dashed border-slate-300 hover:border-pink-400 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors text-center group"
                    >
                       <Link className="text-slate-400 group-hover:text-pink-500 mb-2" />
                       <span className="text-sm font-bold text-slate-600">Relatório Psicossocial</span>
                       <span className="text-xs text-slate-400">Google Drive / Nuvem</span>
                    </div>
                 </div>

                 {/* Link Input Modal */}
                 {linkModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                       <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-in zoom-in-95">
                          <h3 className="font-bold text-lg mb-4 text-slate-800">Inserir Link ({linkType.replace('_', ' ')})</h3>
                          <p className="text-sm text-slate-500 mb-4">Cole o link do documento (Google Drive, Dropbox, etc).</p>
                          <div className="space-y-4">
                            <input 
                              autoFocus
                              type="url" 
                              placeholder="https://..." 
                              className="w-full p-2 border border-slate-300 rounded-md"
                              value={linkUrl}
                              onChange={(e) => setLinkUrl(e.target.value)}
                            />
                            
                            {/* CAMPO DE DATA DE EMISSÃO (ÚTIL PARA LAUDO) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Emissão (Opcional)</label>
                                <input 
                                  type="date" 
                                  className="w-full p-2 border border-slate-300 rounded-md"
                                  value={linkIssueDate}
                                  onChange={(e) => setLinkIssueDate(e.target.value)}
                                />
                                <p className="text-xs text-slate-400 mt-1">Para laudos, a validade é calculada automaticamente (180 dias).</p>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 mt-6">
                             <button type="button" onClick={() => setLinkModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                             <button type="button" onClick={handleSaveDocumentLink} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">Salvar Link</button>
                          </div>
                       </div>
                    </div>
                 )}

                 <div className="space-y-3">
                   <h3 className="font-bold text-slate-800 text-sm border-b pb-2">Documentos Vinculados</h3>
                   {currentResident.documents && currentResident.documents.length > 0 ? (
                     currentResident.documents.map(doc => {
                       let badgeColor = 'bg-gray-100 text-gray-600';
                       if (doc.type === 'LAUDO') badgeColor = 'bg-blue-100 text-blue-600';
                       else if (doc.type === 'VACINA') badgeColor = 'bg-green-100 text-green-600';
                       else if (doc.type === 'RECEITA') badgeColor = 'bg-purple-100 text-purple-600';
                       else if (doc.type === 'RG') badgeColor = 'bg-indigo-100 text-indigo-600';
                       else if (doc.type === 'COMPROVANTE') badgeColor = 'bg-amber-100 text-amber-600';
                       // NOVAS CORES
                       else if (doc.type === 'PIA') badgeColor = 'bg-teal-100 text-teal-600';
                       else if (doc.type === 'PAISI') badgeColor = 'bg-orange-100 text-orange-600';
                       else if (doc.type === 'RELATORIO_PSICOSSOCIAL') badgeColor = 'bg-pink-100 text-pink-600';

                       // Verificação de Validade (180 dias)
                       const expiration = getExpirationInfo(doc.issueDate);

                       return (
                         <div key={doc.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3">
                               <div className={`p-2 rounded-lg ${badgeColor}`}>
                                  <FileText size={20} />
                               </div>
                               <div>
                                  <p className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                    {doc.type.replace('_', ' ')}
                                    {expiration && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide ${expiration.isExpired ? 'bg-red-100 text-red-700 border-red-200' : (expiration.daysRemaining <= 30 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200')}`}>
                                            {expiration.isExpired ? 'VENCIDO' : `${expiration.daysRemaining} dias`}
                                        </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-500">{doc.name} • {doc.date.split('-').reverse().join('/')}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {doc.linkUrl && (
                                  <a 
                                    href={doc.linkUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"
                                    title="Abrir Link"
                                  >
                                     <ExternalLink size={18} />
                                  </a>
                                )}
                                <button 
                                  type="button"
                                  onClick={() => removeDocument(doc.id)} 
                                  className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full"
                                  title="Remover"
                                >
                                   <Trash2 size={18} />
                                </button>
                            </div>
                         </div>
                       );
                     })
                   ) : (
                     <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg">
                        Nenhum documento vinculado.
                     </div>
                   )}
                 </div>
              </div>
            )}
          
          <div className="flex gap-4 justify-end pt-6 border-t mt-4">
            <button 
              type="button"
              onClick={() => { setViewMode('list'); setCurrentResident(EmptyResident); }}
              className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-sm flex items-center gap-2"
            >
              <Save size={18} /> Salvar Cadastro
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- List View ---

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-primary-600" />
            Residentes Cadastrados
          </h2>
          <p className="text-slate-500 text-sm">Gerencie fichas, contatos e histórico individual.</p>
        </div>
        <button 
          onClick={() => { setCurrentResident(EmptyResident); setViewMode('form'); }}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 shadow-sm w-full md:w-auto justify-center"
        >
          <Plus size={20} />
          Novo Residente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Buscar por nome ou quarto..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredResidents.map(resident => (
          <div key={resident.id} className={`bg-white p-5 rounded-xl shadow-sm border ${resident.active ? 'border-slate-200' : 'border-red-200 bg-red-50/50'} hover:shadow-md transition-shadow group flex flex-col h-full`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-4 cursor-pointer" onClick={(e) => handleViewDetails(e, resident)}>
                <div className="w-16 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:border-primary-200 border border-slate-200 overflow-hidden shrink-0">
                  {resident.photo ? (
                    <img src={resident.photo} alt={resident.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} />
                  )}
                </div>
                <div>
                  <h3 className={`font-bold group-hover:text-primary-600 flex items-center gap-2 ${resident.active ? 'text-slate-800' : 'text-red-700'}`}>
                    {resident.name}
                    {resident.photo && (
                      <span title="Foto cadastrada" className="inline-flex items-center justify-center bg-blue-100 text-blue-600 rounded-full w-5 h-5">
                         <Camera size={12} />
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-slate-500">Quarto: {resident.room} | {getAge(resident.birthDate)} anos</p>
                  {!resident.active && <p className="text-xs text-red-600 font-bold mt-1">INATIVO</p>}
                </div>
              </div>
              <div className="flex gap-1 relative z-10">
                 {/* BOTÃO OLHO MODIFICADO */}
                 <button 
                  onClick={(e) => handleToggleActive(e, resident)}
                  className={`p-2 rounded-full transition-colors ${resident.active ? 'text-blue-600 hover:bg-blue-50' : 'text-red-600 hover:bg-red-50'}`}
                  title={resident.active ? "Residente Ativo (Clique para inativar)" : "Residente Inativo (Clique para ativar)"}
                  type="button"
                >
                  {resident.active ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                
                <button 
                  onClick={(e) => handleEdit(e, resident)}
                  className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-full"
                  type="button"
                >
                  <Edit2 size={18} className="pointer-events-none" />
                </button>
                <button 
                  onClick={(e) => handleDelete(e, resident.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full z-20"
                  type="button"
                >
                  <Trash2 size={18} className="pointer-events-none" />
                </button>
              </div>
            </div>
            
            <div className="flex gap-2 mb-4">
               <div className="flex-1 bg-blue-50 p-2 rounded text-blue-700 text-xs text-center border border-blue-100">
                <span className="font-bold">{resident.dailyExchangeEstimate}</span> fraldas/dia
              </div>
              <div className="flex-1 bg-purple-50 p-2 rounded text-purple-700 text-xs text-center border border-purple-100">
                <span className="font-bold">{resident.absorbentDailyExchangeEstimate || 0}</span> absorv./dia
              </div>
            </div>

            <div className="border-t pt-3 mt-auto space-y-2 text-sm text-slate-600 mb-3">
              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-400" />
                <span className="truncate">Resp: {resident.responsible.name} ({resident.responsible.relation})</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-slate-400" />
                <span>{resident.responsible.phone1}</span>
              </div>
            </div>
            
            {/* Quick Access Document Buttons */}
            <div className="grid grid-cols-4 gap-2 mt-2">
               {[
                 { type: 'PIA', label: 'PIA', area: ['PSICOLOGIA', 'PEDAGOGIA', 'ASSISTENTE_SOCIAL', 'NUTRICIONISTA', 'FISIOTERAPIA', 'ENFERMAGEM'], activeColor: 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200' },
                 { type: 'PAISI', label: 'PAISI', area: ['ENFERMAGEM', 'ASSISTENTE_SOCIAL'], activeColor: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' },
                 { type: 'RELATORIO_PSICOSSOCIAL', label: 'RP', area: ['PSICOLOGIA', 'ASSISTENTE_SOCIAL'], activeColor: 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200' },
                 { type: 'LAUDO', label: 'LAUDO', area: ['ENFERMAGEM'], activeColor: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
               ].map((docItem) => {
                 const hasDoc = resident.documents?.some(d => d.type === docItem.type);
                 return (
                   <button 
                     key={docItem.type}
                     onClick={(e) => handleDocAction(e, resident, docItem.type, docItem.label, docItem.area as ProfessionalArea[])}
                     className={`py-2 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center ${
                       hasDoc 
                         ? docItem.activeColor
                         : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white hover:border-slate-300'
                     }`}
                     title={hasDoc ? `Abrir ${docItem.label}` : `Criar demanda para ${docItem.label}`}
                   >
                     {docItem.label}
                   </button>
                 );
               })}
            </div>
          </div>
        ))}
      </div>
      {filteredResidents.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          Nenhum residente encontrado.
        </div>
      )}
    </div>
  );
};