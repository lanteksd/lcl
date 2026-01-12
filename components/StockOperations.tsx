

import React, { useState, useMemo } from 'react';
import { AppData, Product, Transaction, Resident } from '../types';
import { PRODUCT_CATEGORIES } from '../constants';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Search, 
  User, 
  Package, 
  Calendar, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Smile,
  Zap,
  Coffee,
  Heart,
  Activity,
  Clock,
  Edit2,
  Trash2,
  X,
  Save,
  Filter,
  ArrowRightLeft
} from 'lucide-react';

interface StockOperationsProps {
  data: AppData;
  onTransaction: (transaction: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onUpdateTransaction?: (transaction: Transaction) => void;
}

// Helper to map categories to icons
const getCategoryIcon = (category: string) => {
  if (category.includes('Incontinência')) return <Package size={24} />;
  if (category.includes('Higiene')) return <Smile size={24} />;
  if (category.includes('Pele')) return <User size={24} />;
  if (category.includes('Medicamentos')) return <Activity size={24} />;
  if (category.includes('Alimentação')) return <Coffee size={24} />;
  if (category.includes('Conforto')) return <Heart size={24} />;
  return <Zap size={24} />;
};

export const StockOperations: React.FC<StockOperationsProps> = ({ data, onTransaction, onDeleteTransaction, onUpdateTransaction }) => {
  // State for Navigation Steps: 1-Context, 2-Category, 3-Product, 4-Confirm
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'OUT' | 'IN'>('OUT');

  // Selection State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isPersonalStockEntry, setIsPersonalStockEntry] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // Product Search
  const [residentSearch, setResidentSearch] = useState(''); // Resident Search (Step 1)
  
  // History Filter State
  const [historySearch, setHistorySearch] = useState('');
  const [historyType, setHistoryType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [historyResidentFilter, setHistoryResidentFilter] = useState('');

  // Edit Transaction State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Derived Objects
  const selectedResident = data.residents.find(r => r.id === selectedResidentId);
  const selectedProduct = data.products.find(p => p.id === selectedProductId);

  // Recent Transactions (Global with Filters)
  const filteredHistory = useMemo(() => {
    return data.transactions
      .filter(t => {
        const matchesSearch = t.productName.toLowerCase().includes(historySearch.toLowerCase()) || 
                              (t.notes || '').toLowerCase().includes(historySearch.toLowerCase());
        const matchesType = historyType === 'ALL' || t.type === historyType;
        const matchesResident = !historyResidentFilter || t.residentId === historyResidentFilter;
        return matchesSearch && matchesType && matchesResident;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id))
      .slice(0, 100); // Increased limit to 100 for better auditability
  }, [data.transactions, historySearch, historyType, historyResidentFilter]);

  // --- Helpers ---
  
  const getResidentStockBalance = (residentId: string, productId: string) => {
    const txs = data.transactions.filter(t => t.residentId === residentId && t.productId === productId);
    const totalIn = txs.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.quantity, 0);
    const totalOut = txs.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.quantity, 0);
    return totalIn - totalOut;
  };

  const filteredProducts = useMemo(() => {
    let prods = data.products;

    // Filter by Category
    if (selectedCategory) {
      prods = prods.filter(p => p.category === selectedCategory);
    }

    // Filter by Search
    if (searchTerm) {
      prods = prods.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Attach Personal Balance for Sorting
    const prodsWithBalance = prods.map(p => {
      const balance = selectedResidentId ? getResidentStockBalance(selectedResidentId, p.id) : 0;
      return { ...p, personalBalance: balance };
    });

    // SORTING LOGIC:
    // 1. Personal Stock > 0 (High Priority)
    // 2. Alphabetical Name
    return prodsWithBalance.sort((a, b) => {
      if (activeTab === 'OUT') {
        if (a.personalBalance > 0 && b.personalBalance <= 0) return -1;
        if (a.personalBalance <= 0 && b.personalBalance > 0) return 1;
      }
      return a.name.localeCompare(b.name);
    });

  }, [data.products, selectedCategory, searchTerm, selectedResidentId, activeTab, data.transactions]);


  // --- Handlers ---

  const handleNext = () => {
    if (step === 1 && !selectedResidentId) return alert("Selecione um residente para continuar.");
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
    setSearchTerm('');
  };

  const handleReset = () => {
    setStep(1);
    setSelectedProductId('');
    setQuantity(1);
    setNotes('');
    setSearchTerm('');
    setResidentSearch('');
    // Keep Resident and Date selected for easier sequential entry
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProductId) return;

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      type: activeTab,
      date,
      productId: selectedProductId,
      productName: selectedProduct?.name || '',
      residentId: selectedResidentId,
      residentName: selectedResident?.name,
      quantity: Number(quantity),
      notes: activeTab === 'IN' && isPersonalStockEntry ? `(Família/Pessoal) ${notes}` : notes
    };

    onTransaction(transaction);
    alert("Movimentação registrada com sucesso!");
    handleReset();
  };

  // Edit/Delete Handlers
  const handleDeleteTx = (id: string) => {
    if(confirm("Deseja excluir esta movimentação? O estoque será revertido automaticamente.")) {
      if(onDeleteTransaction) onDeleteTransaction(id);
    }
  };

  const handleSaveTxEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if(editingTransaction && onUpdateTransaction) {
      onUpdateTransaction(editingTransaction);
      setEditingTransaction(null);
    }
  };

  // --- Render Steps ---

  // STEP 1: CONTEXT (Tab, Resident, Date) + HISTORY
  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button 
          onClick={() => { setActiveTab('OUT'); setIsPersonalStockEntry(false); }}
          className={`flex-1 py-4 px-6 rounded-lg flex items-center justify-center gap-2 font-bold transition-all text-lg ${
            activeTab === 'OUT' 
              ? 'bg-orange-500 text-white shadow-md' 
              : 'text-slate-500 hover:bg-slate-200'
          }`}
        >
          <ArrowDownCircle size={24} />
          REGISTRAR SAÍDA (USO)
        </button>
        <button 
          onClick={() => { setActiveTab('IN'); setIsPersonalStockEntry(true); }}
          className={`flex-1 py-4 px-6 rounded-lg flex items-center justify-center gap-2 font-bold transition-all text-lg ${
            activeTab === 'IN' 
              ? 'bg-emerald-600 text-white shadow-md' 
              : 'text-slate-500 hover:bg-slate-200'
          }`}
        >
          <ArrowUpCircle size={24} />
          REGISTRAR ENTRADA
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="text-primary-600" /> Detalhes Iniciais
          </h3>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data da Movimentação</label>
              <input 
                type="date" 
                className="w-full p-3 border border-slate-300 rounded-lg text-lg"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {activeTab === 'OUT' ? 'Selecione o Residente (Quem usou?)' : 'Selecione o Residente (Para quem chegou?)'}
              </label>
              
              {/* Resident Search Field */}
              <div className="relative mb-3">
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                   type="text"
                   placeholder="Buscar residente..."
                   className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                   value={residentSearch}
                   onChange={e => setResidentSearch(e.target.value)}
                 />
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                {data.residents
                  .filter(r => r.active)
                  .filter(r => r.name.toLowerCase().includes(residentSearch.toLowerCase()))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedResidentId(r.id)}
                    className={`flex items-center gap-4 p-3 rounded-xl border-2 transition-all text-left ${
                      selectedResidentId === r.id 
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' 
                        : 'border-slate-100 hover:border-primary-300 bg-white'
                    }`}
                  >
                    <div className="w-12 h-16 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                        {r.photo ? <img src={r.photo} className="w-full h-full object-cover" /> : <User className="m-auto mt-4 text-slate-400" size={24} />}
                    </div>
                    <div>
                      <span className="block font-bold text-slate-700">{r.name}</span>
                      <span className="text-xs text-slate-500">Quarto {r.room}</span>
                    </div>
                    {selectedResidentId === r.id && <Check className="ml-auto text-primary-600" />}
                  </button>
                ))}
                {data.residents.filter(r => r.active && r.name.toLowerCase().includes(residentSearch.toLowerCase())).length === 0 && (
                  <div className="text-center py-4 text-slate-400 text-sm">Nenhum residente encontrado.</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button 
              onClick={handleNext}
              disabled={!selectedResidentId}
              className={`w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all ${
                selectedResidentId 
                  ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-lg transform active:scale-[0.99]' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Continuar para Categorias <ArrowRight />
            </button>
          </div>
        </div>

        {/* History Panel with Filters */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
           <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
             <Clock className="text-slate-500" /> Histórico de Movimentações
           </h3>
           
           {/* Filters */}
           <div className="space-y-3 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
             <div className="flex gap-2">
               <div className="flex-1 relative">
                 <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input 
                    type="text" 
                    placeholder="Buscar produto ou obs..." 
                    className="w-full pl-8 p-2 text-sm border border-slate-200 rounded-md"
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                 />
               </div>
               <select 
                 className="p-2 text-sm border border-slate-200 rounded-md w-32"
                 value={historyType}
                 onChange={e => setHistoryType(e.target.value as any)}
               >
                 <option value="ALL">Todas</option>
                 <option value="IN">Entradas</option>
                 <option value="OUT">Saídas</option>
               </select>
             </div>
             <select 
               className="w-full p-2 text-sm border border-slate-200 rounded-md"
               value={historyResidentFilter}
               onChange={e => setHistoryResidentFilter(e.target.value)}
             >
               <option value="">Filtrar por Residente (Todos)</option>
               {data.residents.filter(r => r.active).sort((a, b) => a.name.localeCompare(b.name)).map(r => (
                 <option key={r.id} value={r.id}>{r.name}</option>
               ))}
             </select>
           </div>

           <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0">
                   <tr>
                     <th className="p-2">Data</th>
                     <th className="p-2">Produto</th>
                     <th className="p-2 text-right">Qtd</th>
                     <th className="p-2 text-right">Ações</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {filteredHistory.map(t => (
                     <tr key={t.id} className="hover:bg-slate-50 group">
                       <td className="p-2">
                         <div className="text-xs text-slate-500">{t.date.split('-').reverse().join('/')}</div>
                         <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
                            {t.type === 'IN' ? 'ENT' : 'SAÍ'}
                         </span>
                       </td>
                       <td className="p-2">
                         <div className="font-medium text-slate-700 max-w-[150px] truncate" title={t.productName}>{t.productName}</div>
                         <div className="text-xs text-slate-500 truncate max-w-[150px]" title={t.residentName}>{t.residentName || '-'}</div>
                       </td>
                       <td className="p-2 text-right font-bold">{t.quantity}</td>
                       <td className="p-2 text-right">
                         <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEditingTransaction(t); }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteTx(t.id); }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                         </div>
                       </td>
                     </tr>
                   ))}
                   {filteredHistory.length === 0 && (
                     <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                   )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );

  // STEP 2: CATEGORY SELECTION
  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between">
        <button onClick={handleBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium">
          <ArrowLeft size={20} /> Voltar
        </button>
        <span className="text-slate-400 text-sm font-medium">Passo 2 de 4</span>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">O que será {activeTab === 'OUT' ? 'utilizado' : 'abastecido'}?</h3>
         
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
           {PRODUCT_CATEGORIES.map(cat => (
             <button
               key={cat}
               onClick={() => { setSelectedCategory(cat); handleNext(); }}
               className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border-2 border-slate-100 hover:border-primary-400 hover:bg-primary-50 transition-all text-center group h-40"
             >
               <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-white flex items-center justify-center text-primary-600 transition-colors">
                 {getCategoryIcon(cat)}
               </div>
               <span className="font-bold text-slate-700 group-hover:text-primary-700 text-sm leading-tight">
                 {cat}
               </span>
             </button>
           ))}
         </div>
      </div>
    </div>
  );

  // STEP 3: PRODUCT SELECTION
  const renderStep3 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
       <div className="flex items-center justify-between">
        <button onClick={handleBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium">
          <ArrowLeft size={20} /> Voltar para Categorias
        </button>
        <span className="text-slate-400 text-sm font-medium">Passo 3 de 4</span>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
         <div className="mb-4">
           <h3 className="text-lg font-bold text-slate-800 mb-1">{selectedCategory}</h3>
           <p className="text-sm text-slate-500">Selecione o item na lista abaixo.</p>
         </div>

         <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar produto pelo nome..."
              className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>

         <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {filteredProducts.map(p => {
              const hasPersonalStock = p.personalBalance > 0;
              const isSelected = selectedProductId === p.id;
              
              // Logic to visually separate Personal Stock vs House Stock
              let borderClass = 'border-slate-200';
              let bgClass = 'bg-white';
              let badge = null;

              if (activeTab === 'OUT') {
                if (hasPersonalStock) {
                  borderClass = isSelected ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-emerald-200';
                  bgClass = isSelected ? 'bg-emerald-50' : 'bg-emerald-50/30';
                  badge = <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1"><User size={12}/> Estoque Próprio: {p.personalBalance}</span>;
                } else {
                  borderClass = isSelected ? 'border-slate-400 ring-2 ring-slate-200' : 'border-slate-200';
                  badge = <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1"><Package size={12}/> Estoque Casa: {p.currentStock}</span>;
                }
              } else {
                 // IN Tab
                 borderClass = isSelected ? 'border-primary-500 ring-2 ring-primary-200' : 'border-slate-200';
                 badge = <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Atual: {p.currentStock}</span>;
              }

              return (
                <div 
                  key={p.id}
                  onClick={() => { setSelectedProductId(p.id); handleNext(); }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center group ${borderClass} ${bgClass} hover:shadow-md`}
                >
                   <div>
                     <h4 className="font-bold text-slate-800 group-hover:text-primary-700">{p.name}</h4>
                     <p className="text-xs text-slate-500 mb-1">{p.brand || 'Sem marca'}</p>
                     {badge}
                   </div>
                   <div className="text-slate-400 group-hover:text-primary-500">
                     <ArrowRight size={20} />
                   </div>
                </div>
              );
            })}
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <p>Nenhum produto encontrado.</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );

  // STEP 4: QUANTITY & CONFIRM
  const renderStep4 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
       <div className="flex items-center justify-between">
        <button onClick={handleBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium">
          <ArrowLeft size={20} /> Voltar para Produtos
        </button>
        <span className="text-slate-400 text-sm font-medium">Passo 4 de 4</span>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedProduct?.name}</h2>
          <div className="inline-block bg-slate-100 px-3 py-1 rounded-full text-sm text-slate-600 font-medium">
            {selectedCategory}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-center text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">
              Quantidade (Unidades)
            </label>
            <div className="flex items-center justify-center gap-4">
               <button 
                 type="button" 
                 onClick={() => setQuantity(Math.max(1, quantity - 1))}
                 className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 font-bold text-xl hover:bg-slate-200"
               >-</button>
               <input 
                 type="number" 
                 required
                 min="1"
                 className="w-24 text-center p-2 text-3xl font-bold border-b-2 border-primary-500 focus:outline-none"
                 value={quantity}
                 onChange={e => setQuantity(parseInt(e.target.value) || 0)}
               />
               <button 
                 type="button" 
                 onClick={() => setQuantity(quantity + 1)}
                 className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 font-bold text-xl hover:bg-slate-200"
               >+</button>
            </div>
            
            {activeTab === 'OUT' && selectedResident && (
              <div className="text-center mt-3">
                 <button 
                   type="button"
                   onClick={() => setQuantity(selectedResident.dailyExchangeEstimate || 1)}
                   className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-full"
                 >
                   Usar Padrão do Residente ({selectedResident.dailyExchangeEstimate})
                 </button>
              </div>
            )}
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">
               {activeTab === 'IN' ? 'Origem / Fornecedor (Opcional)' : 'Observações (Opcional)'}
             </label>
             <input 
               type="text" 
               className="w-full p-3 border border-slate-300 rounded-lg"
               placeholder={activeTab === 'IN' ? 'Ex: Farmácia X ou Trazido pela Filha' : 'Alguma observação sobre o uso?'}
               value={notes}
               onChange={e => setNotes(e.target.value)}
             />
          </div>

          <div className="pt-4">
             <button 
               type="submit"
               className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-transform active:scale-[0.99] flex justify-center items-center gap-3 ${
                 activeTab === 'OUT' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-emerald-600 hover:bg-emerald-700'
               }`}
             >
               <Check size={28} />
               CONFIRMAR {activeTab === 'OUT' ? 'SAÍDA' : 'ENTRADA'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto min-h-[600px] relative">
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

      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {step === 1 ? (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ArrowRightLeft className="text-primary-600" />
              Central de Movimentações
            </h2>
            <p className="text-slate-500 text-sm mt-1">Registre entradas e saídas de produtos do estoque pessoal.</p>
          </div>
        ) : (
          <h2 className="text-2xl font-bold text-slate-800">
            {activeTab === 'OUT' ? 'Registrar Uso' : 'Registrar Abastecimento'}
          </h2>
        )}
        
        {selectedResident && (
           <div className="flex w-full sm:w-auto items-center justify-center sm:justify-start gap-2 bg-slate-800 text-white px-3 py-1 rounded-full text-sm shrink-0">
             <User size={14} /> {selectedResident.name}
           </div>
        )}
      </div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </div>
  );
};
