
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppData, Product, Resident, Transaction } from '../types';
import { Search, User, Plus, Minus, X, Save, PackagePlus, Info, ShoppingBag, Clock, Trash2, MessageCircle, ChevronDown, ChevronRight, Calendar, ListChecks, Box, CheckCircle2, AlertCircle } from 'lucide-react';

interface PersonalItemsProps {
  data: AppData;
  onTransaction: (transaction: Transaction) => void;
}

interface ModalState {
  isOpen: boolean;
  type: 'IN' | 'OUT';
  resident: Resident | null;
  product: Product | null;
}

interface AddItemModalState {
  isOpen: boolean;
  resident: Resident | null;
  productSearch: string;
}

// Helper to get local date string
const getLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

export const PersonalItems: React.FC<PersonalItemsProps> = ({ data, onTransaction }) => {
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'DAILY'>('INVENTORY');

  // Inventory Tab State
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [residentSearch, setResidentSearch] = useState('');
  const [itemSearch, setItemSearch] = useState(''); // Novo estado para busca de itens
  
  // Daily Tab State
  const [dailySearchTerm, setDailySearchTerm] = useState('');
  const [hideZeroBalanceResidents, setHideZeroBalanceResidents] = useState(true);

  // Modals
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, type: 'IN', resident: null, product: null });
  const [addItemModalState, setAddItemModalState] = useState<AddItemModalState>({ isOpen: false, resident: null, productSearch: '' });
  
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // State for History Accordion
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // Reset item search when resident changes
  useEffect(() => {
    setItemSearch('');
  }, [selectedResidentId]);

  // --- Common Helpers ---
  const getResidentStockBalance = useCallback((residentId: string, productId: string) => {
    const txs = (data.transactions || []).filter(t => t.residentId === residentId && t.productId === productId);
    const totalIn = txs.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.quantity, 0);
    const totalOut = txs.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.quantity, 0);
    return totalIn - totalOut;
  }, [data.transactions]);

  // --- Inventory Tab Logic ---
  const filteredResidents = useMemo(() => {
    return (data.residents || [])
      .filter(r => r.active && r.name.toLowerCase().includes(residentSearch.toLowerCase()))
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [data.residents, residentSearch]);

  const selectedResident = useMemo(() => {
    return (data.residents || []).find(r => r.id === selectedResidentId) || null;
  }, [data.residents, selectedResidentId]);

  const personalInventory = useMemo(() => {
    if (!selectedResidentId) return [];
    
    // Get all products that have ever been associated with this resident
    const residentProductIds = new Set(
        (data.transactions || [])
        .filter(t => t.residentId === selectedResidentId)
        .map(t => t.productId)
    );

    const inventory: { product: Product, balance: number }[] = [];

    residentProductIds.forEach(pid => {
        const product = data.products.find(p => p.id === pid);
        if (product) {
            const balance = getResidentStockBalance(selectedResidentId, pid);
            if (balance > 0) {
                inventory.push({ product, balance });
            }
        }
    });

    return inventory.sort((a, b) => a.product.name.localeCompare(b.product.name));
  }, [selectedResidentId, data.transactions, data.products, getResidentStockBalance]);

  // Inventory filtered by the search bar
  const filteredPersonalInventory = useMemo(() => {
    if (!itemSearch) return personalInventory;
    return personalInventory.filter(item => 
      item.product.name.toLowerCase().includes(itemSearch.toLowerCase())
    );
  }, [personalInventory, itemSearch]);

  // Grouped History Logic with Aggregation
  const groupedHistory = useMemo(() => {
    if (!selectedResidentId) return [];
    
    // 1. Get raw transactions
    const rawTransactions = (data.transactions || [])
      .filter(t => t.residentId === selectedResidentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 2. Group by Month
    const groups: Record<string, Transaction[]> = {};
    rawTransactions.forEach(t => {
        const monthKey = t.date.substring(0, 7); // YYYY-MM
        if (!groups[monthKey]) groups[monthKey] = [];
        groups[monthKey].push(t);
    });

    // 3. Process Aggregation per Month (Combine identical OUTs)
    const processedGroups: Record<string, (Transaction & { count?: number })[]> = {};
    
    Object.keys(groups).forEach(monthKey => {
        const txs = groups[monthKey];
        const aggregated: (Transaction & { count?: number })[] = [];
        // Map key: date + productId to aggregate OUT transactions
        const outMap = new Map<string, (Transaction & { count?: number })>();

        txs.forEach(t => {
            if (t.type === 'OUT') {
                const key = `${t.date}_${t.productId}`;
                const existing = outMap.get(key);
                if (existing) {
                    existing.quantity += t.quantity;
                    existing.count = (existing.count || 1) + 1;
                } else {
                    const newItem = { ...t, count: 1 };
                    outMap.set(key, newItem);
                    aggregated.push(newItem);
                }
            } else {
                aggregated.push({ ...t, count: 1 });
            }
        });
        processedGroups[monthKey] = aggregated;
    });

    // Convert to array of entries [key, transactions] sorted by key desc
    return Object.entries(processedGroups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [selectedResidentId, data.transactions]);

  // Expand newest month by default when resident changes
  useEffect(() => {
    if (groupedHistory.length > 0) {
        setExpandedMonths({ [groupedHistory[0][0]]: true });
    } else {
        setExpandedMonths({});
    }
  }, [selectedResidentId, groupedHistory.length]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  const getMonthLabel = (dateKey: string) => {
    const [year, month] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
  };

  const lowStockItems = useMemo(() => {
    return personalInventory.filter(item => item.balance <= 10);
  }, [personalInventory]);

  const getWhatsAppLink = (resident: Resident, item: { name: string, balance: number }) => {
    const phone = resident.responsible.phone1.replace(/\D/g, '');
    if (!phone) return null;
    const fullPhone = phone.length <= 11 ? `55${phone}` : phone;
    const message = `Olá ${resident.responsible.name}, aqui é da casa de repouso. \n\nEstamos entrando em contato referente ao(à) residente ${resident.name}. \n\nO estoque do item *${item.name}* está baixo (restam apenas ${item.balance} unidades). \n\nPoderia providenciar a reposição? \n\nObrigado!`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  };
  
  const getBulkWhatsAppLink = (resident: Resident, items: { product: Product, balance: number }[]) => {
    const phone = resident.responsible.phone1.replace(/\D/g, '');
    if (!phone || items.length === 0) return null;
    const fullPhone = phone.length <= 11 ? `55${phone}` : phone;

    const itemsList = items.map(item => `- *${item.product.name}* (restam ${item.balance})`).join('\n');

    const message = `Olá ${resident.responsible.name}, aqui é da casa de repouso. \n\nEstamos entrando em contato referente ao(à) residente ${resident.name}. \n\nOs seguintes itens estão com estoque baixo e precisam de reposição:\n\n${itemsList}\n\nPoderia providenciar, por favor?\n\nObrigado!`;

    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  };

  // --- Transactions Handlers ---

  const handleDeleteItem = (product: Product, balance: number) => {
    if (!selectedResident) return;
    if (window.confirm(`Tem certeza que deseja remover "${product.name}" do estoque de ${selectedResident.name}? Uma saída de ${balance} unidade(s) será registrada para zerar o saldo.`)) {
        const zeroingTransaction: Transaction = {
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            type: 'OUT',
            productId: product.id,
            productName: product.name,
            residentId: selectedResident.id,
            residentName: selectedResident.name,
            quantity: balance,
            notes: 'Item removido do estoque pessoal',
        };
        onTransaction(zeroingTransaction);
    }
  };

  const handleOpenModal = (type: 'IN' | 'OUT', product: Product) => {
    if (!selectedResident) return;
    setQuantity(1);
    setNotes('');
    setModalState({ isOpen: true, type, resident: selectedResident, product });
  };
  
  const handleOpenAddItemModal = () => {
    if (!selectedResident) return;
    setAddItemModalState({ isOpen: true, resident: selectedResident, productSearch: '' });
  };
  
  const handleProductSelectForNewItem = (product: Product) => {
    setAddItemModalState({ isOpen: false, resident: null, productSearch: '' });
    handleOpenModal('IN', product);
  };

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { type, resident, product } = modalState;
    if (!resident || !product || quantity <= 0) return;

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      type,
      productId: product.id,
      productName: product.name,
      residentId: resident.id,
      residentName: resident.name,
      quantity: Number(quantity),
      notes: `Item Pessoal - ${notes}`,
    };
    
    onTransaction(newTransaction);
    setModalState({ isOpen: false, type: 'IN', resident: null, product: null });
  };

  const productsAvailableToAdd = useMemo(() => {
    const personalProductIds = new Set(personalInventory.map(item => item.product.id));
    return (data.products || [])
      .filter(p => !personalProductIds.has(p.id))
      .filter(p => p.name.toLowerCase().includes(addItemModalState.productSearch.toLowerCase()))
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [data.products, personalInventory, addItemModalState.productSearch]);
  
  // --- Daily Admin Logic ---
  const handleQuickUsage = (resident: Resident, product: Product) => {
      const transaction: Transaction = {
          id: crypto.randomUUID(),
          date: getLocalDate(),
          type: 'OUT',
          productId: product.id,
          productName: product.name,
          residentId: resident.id,
          residentName: resident.name,
          quantity: 1,
          notes: 'Uso Rápido (Diário)'
      };
      onTransaction(transaction);
  };

  // --- RENDERERS ---

  const renderInventoryTab = () => {
    const bulkWaLink = selectedResident ? getBulkWhatsAppLink(selectedResident, lowStockItems) : null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)] animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar residente..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200" value={residentSearch} onChange={e => setResidentSearch(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredResidents.map(r => (
              <button key={r.id} onClick={() => setSelectedResidentId(r.id)} className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors border-2 ${selectedResidentId === r.id ? 'bg-primary-50 border-primary-300' : 'border-transparent hover:bg-slate-50'}`}>
                <div className="w-10 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                    {r.photo ? <img src={r.photo} className="w-full h-full object-cover" /> : <User size={24} className="text-slate-300 mx-auto mt-3" />}
                </div>
                <div><p className="font-bold text-slate-700 text-sm leading-tight">{r.name}</p><p className="text-xs text-slate-400">Quarto {r.room}</p></div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          {!selectedResident ? (
            <div className="m-auto text-center text-slate-400"><Info size={32} className="mx-auto mb-2" /><p className="font-medium">Selecione um residente à esquerda</p><p className="text-sm">para visualizar e gerenciar seus itens pessoais.</p></div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3 shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-16 rounded-lg bg-slate-100 overflow-hidden">
                        {selectedResident.photo ? <img src={selectedResident.photo} className="w-full h-full object-cover" /> : <User size={32} className="text-slate-300 mx-auto mt-3" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{selectedResident.name}</h3>
                        <p className="text-sm text-slate-500">Estoque Pessoal</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                  {lowStockItems.length > 0 && bulkWaLink && (
                    <a 
                      href={bulkWaLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 text-sm font-bold shadow-sm"
                    >
                      <MessageCircle size={16} /> Pedir Itens em Falta ({lowStockItems.length})
                    </a>
                  )}
                  <button onClick={handleOpenAddItemModal} className="flex items-center gap-2 bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 text-sm font-bold shadow-sm"><PackagePlus size={16} /> Adicionar Item</button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 scroll-smooth">
                <div className="space-y-3">
                  <div className="sticky top-0 bg-white z-10 space-y-2 pb-2 border-b border-slate-50">
                    <h3 className="text-md font-bold text-slate-700">Saldo Atual</h3>
                    {/* CAMPO DE BUSCA DE ITENS ADICIONADO */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Buscar item neste estoque..." 
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 bg-slate-50 focus:bg-white transition-colors" 
                        value={itemSearch} 
                        onChange={e => setItemSearch(e.target.value)} 
                      />
                      {itemSearch && (
                        <button onClick={() => setItemSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {filteredPersonalInventory.map(({ product, balance }) => {
                    const isLow = balance <= 10;
                    const waLink = isLow && selectedResident ? getWhatsAppLink(selectedResident, { name: product.name, balance }) : null;

                    return (
                      <div key={product.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="w-full sm:w-auto"><p className="font-bold text-slate-700">{product.name}</p><p className="text-sm text-slate-500">Saldo atual: <span className="font-bold">{balance} {product.unit}(s)</span></p></div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          
                          <button 
                            onClick={() => handleOpenModal('IN', product)}
                            className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Adicionar mais (Entrada)"
                          >
                            <Plus size={20} />
                          </button>

                          {waLink && (
                            <a href={waLink} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors" title="Notificar família via WhatsApp">
                              <MessageCircle size={20} />
                            </a>
                          )}
                          <button onClick={() => handleDeleteItem(product, balance)} className="w-10 h-10 flex items-center justify-center bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors" title="Remover item (zerar estoque)">
                            <Trash2 size={20} />
                          </button>
                          <button 
                            onClick={() => handleOpenModal('OUT', product)} 
                            className="h-10 bg-primary-600 text-white px-4 rounded-lg hover:bg-primary-700 text-sm font-bold shadow-sm flex items-center justify-center transition-colors"
                          >
                            Usar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {filteredPersonalInventory.length === 0 && (<div className="text-center py-8 text-slate-400"><p>{itemSearch ? 'Nenhum item encontrado com este nome.' : 'Nenhum item com saldo positivo.'}</p></div>)}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200">
                  <h3 className="text-md font-bold text-slate-700 mb-3 sticky top-0 bg-white py-2 flex items-center gap-2 z-10"><Clock size={16} /> Histórico de Movimentações</h3>
                  
                  <div className="space-y-4 pb-4">
                    {groupedHistory.map(([monthKey, transactions]) => (
                        <div key={monthKey} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <button 
                                onClick={() => toggleMonth(monthKey)}
                                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-primary-600" />
                                    <span className="font-bold text-slate-700">{getMonthLabel(monthKey)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500 text-xs">
                                    <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                                        {transactions.length} registros
                                    </span>
                                    {expandedMonths[monthKey] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                </div>
                            </button>
                            
                            {expandedMonths[monthKey] && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th className="p-3 pl-4">Dia</th>
                                                <th className="p-3">Produto</th>
                                                <th className="p-3">Ação</th>
                                                <th className="p-3 text-right pr-4">Qtd</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {transactions.map(t => (
                                                <tr key={t.id} className="hover:bg-slate-50">
                                                    <td className="p-3 pl-4 text-slate-500">{t.date.split('-')[2]}</td>
                                                    <td className="p-3 font-medium text-slate-700">{t.productName}</td>
                                                    <td className="p-3">
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${t.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
                                                            {t.type === 'IN' ? 'ENTRADA' : 'SAÍDA'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right pr-4 font-bold">
                                                      {t.quantity}
                                                      {t.count && t.count > 1 && (
                                                          <span className="text-[10px] font-normal text-slate-400 ml-1" title={`${t.count} registros agrupados`}>
                                                              ({t.count}x)
                                                          </span>
                                                      )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                    {groupedHistory.length === 0 && <p className="text-center py-8 text-slate-400">Nenhuma movimentação para este residente.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDailyTab = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
            <ListChecks className="text-blue-600 shrink-0 mt-0.5" />
            <div>
            <h3 className="font-bold text-blue-800">Administração Diária de Itens</h3>
            <p className="text-sm text-blue-700">Registre rapidamente o uso de itens de higiene e outros cuidados pessoais (Exceto Medicamentos e Fraldas).</p>
            </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
            <button
                onClick={() => setHideZeroBalanceResidents(!hideZeroBalanceResidents)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm ${hideZeroBalanceResidents ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-100'}`}
            >
                {hideZeroBalanceResidents ? 'Mostrando Disponíveis' : 'Ocultar Sem Saldo'}
            </button>

            <div className="relative w-full md:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar residente..." 
                    className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={dailySearchTerm}
                    onChange={e => setDailySearchTerm(e.target.value)}
                />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         {data.residents
            .filter(r => r.active)
            .filter(r => r.name.toLowerCase().includes(dailySearchTerm.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(resident => {
                // Determine active inventory for this resident
                const residentProductIds = new Set(
                    (data.transactions || [])
                    .filter(t => t.residentId === resident.id)
                    .map(t => t.productId)
                );

                const activeItems: { product: Product, balance: number }[] = [];
                residentProductIds.forEach(pid => {
                    const product = data.products.find(p => p.id === pid);
                    
                    // FILTRO: Remove categorias gerenciadas em outros módulos (Fraldas/Absorventes e Medicamentos)
                    if (product && 
                        product.category !== 'Incontinência Urinária e Fecal' && 
                        product.category !== 'Medicamentos e Cuidados Clínicos'
                    ) {
                        const balance = getResidentStockBalance(resident.id, pid);
                        if (balance > 0) activeItems.push({ product, balance });
                    }
                });

                if (hideZeroBalanceResidents && activeItems.length === 0) return null;

                return (
                    <div key={resident.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                            <div className="w-12 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                                {resident.photo ? <img src={resident.photo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-slate-300" />}
                            </div>
                            <h3 className="font-bold text-slate-800 leading-tight">{resident.name}</h3>
                        </div>
                        
                        <div className="p-4 flex-1">
                            {activeItems.length > 0 ? (
                                <div className="space-y-3">
                                    {activeItems.map(({ product, balance }) => {
                                        const stockColor = balance > 10 ? 'text-green-600 bg-green-50' : 'text-orange-600 bg-orange-50';
                                        
                                        return (
                                            <div key={product.id} className="flex justify-between items-center gap-2">
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm text-slate-700 truncate" title={product.name}>{product.name}</div>
                                                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${stockColor}`}>
                                                        Saldo: {balance}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleQuickUsage(resident, product)}
                                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm active:scale-95 transition-all whitespace-nowrap"
                                                >
                                                    Usar 1
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-slate-400 text-sm">
                                    <AlertCircle size={24} className="mx-auto mb-2 opacity-50"/>
                                    {hideZeroBalanceResidents ? 'Nenhum item desta categoria em estoque.' : 'Sem itens em estoque.'}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="text-primary-600" />
            Gestão de Itens Pessoais
          </h2>
          <p className="text-slate-500 text-sm">Controle de estoque individual e administração de uso.</p>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button 
            className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'INVENTORY' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} 
            onClick={() => setActiveTab('INVENTORY')}
        >
            <div className="flex items-center gap-2"><Box size={18} /> Estoque Individual</div>
        </button>
        <button 
            className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'DAILY' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} 
            onClick={() => setActiveTab('DAILY')}
        >
            <div className="flex items-center gap-2"><ListChecks size={18} /> Administração Diária</div>
        </button>
      </div>

      {activeTab === 'INVENTORY' && renderInventoryTab()}
      {activeTab === 'DAILY' && renderDailyTab()}

      {/* Transaction Modal (Inventory Tab) */}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalState({ ...modalState, isOpen: false })}>
          <form onSubmit={handleTransactionSubmit} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center"><h3 className="font-bold text-lg text-slate-800">{modalState.type === 'IN' ? 'Registrar Entrada' : 'Registrar Uso'} de {modalState.product?.name}</h3><button type="button" onClick={() => setModalState({ ...modalState, isOpen: false })} className="text-slate-400 hover:text-slate-600"><X size={20}/></button></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label><input type="number" required min="1" className="w-full p-2 border border-slate-300 rounded-md" value={quantity} onChange={e => setQuantity(Number(e.target.value))}/></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Observações</label><input type="text" className="w-full p-2 border border-slate-300 rounded-md" value={notes} onChange={e => setNotes(e.target.value)}/></div>
            <div className="flex gap-3 justify-end pt-4 border-t"><button type="button" onClick={() => setModalState({ ...modalState, isOpen: false })} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${modalState.type === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'}`}><Save size={16}/> Confirmar</button></div>
          </form>
        </div>
      )}
      
      {/* Add Item Modal (Inventory Tab) */}
      {addItemModalState.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAddItemModalState({ ...addItemModalState, isOpen: false })}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg flex flex-col h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-slate-800">Adicionar Item ao Estoque de {addItemModalState.resident?.name}</h3><button type="button" onClick={() => setAddItemModalState({ ...addItemModalState, isOpen: false })} className="text-slate-400 hover:text-slate-600"><X size={20}/></button></div>
            <div className="relative mb-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Buscar no catálogo geral..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200" value={addItemModalState.productSearch} onChange={e => setAddItemModalState({...addItemModalState, productSearch: e.target.value})}/></div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {productsAvailableToAdd.map(p => (
                <button key={p.id} onClick={() => handleProductSelectForNewItem(p)} className="w-full p-3 bg-slate-50 hover:bg-primary-50 rounded-lg border border-slate-200 text-left">
                  <p className="font-bold text-slate-700">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.category}</p>
                </button>
              ))}
              {productsAvailableToAdd.length === 0 && <p className="text-center text-slate-400 pt-8">Nenhum item novo para adicionar.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
