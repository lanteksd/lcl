
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppData, Product, Transaction, Prescription, Resident, Pharmacy } from '../types';
import { UNITS } from '../constants';
import { Search, Plus, Edit2, Trash2, Pill, Activity, CheckCircle2, FileText, Upload, Calendar, Clock, User, AlertCircle, Eye, Users, X, Save, ArrowLeft, MessageCircle, ShoppingBag, Package, ListChecks, DollarSign, Copy, Clipboard, XCircle, ChevronDown, EyeOff, Link, Building2 } from 'lucide-react';

interface MedicationsProps {
  data: AppData;
  onSave: (product: Product) => void;
  onDelete: (id: string) => void;
  onTransaction: (transaction: Transaction) => void;
  onSavePrescription: (prescription: Prescription) => void;
  onDeletePrescription: (id: string) => void;
  onDeleteTransaction?: (id: string) => void;
  onUpdateTransaction?: (transaction: Transaction) => void;
}

const CATEGORY_MEDS = 'Medicamentos e Cuidados Clínicos';

const EmptyProduct: Product = {
  id: '',
  name: '',
  brand: '',
  category: CATEGORY_MEDS,
  currentStock: 0,
  minStock: 5,
  unit: 'Caixa'
};

const EmptyPrescription: Prescription = {
  id: '',
  residentId: '',
  productId: '',
  productName: '',
  dosage: '',
  frequency: '',
  times: '',
  active: true,
  pdfBase64: '',
  linkUrl: '',
  isTreatment: false
};

// Helper for Safe ID Generation
const generateSafeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Helper for Local Date (Fix Timezone Bug)
const getLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000; // Offset in milliseconds
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

export const Medications: React.FC<MedicationsProps> = ({ 
  data, onSave, onDelete, onTransaction, onSavePrescription, onDeletePrescription, onDeleteTransaction, onUpdateTransaction
}) => {
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'PRESCRIPTIONS' | 'DAILY' | 'ORDERS'>('PRESCRIPTIONS');
  
  // Inventory State
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hideZeroStock, setHideZeroStock] = useState(false); // Novo Estado
  const [currentProduct, setCurrentProduct] = useState<Product>(EmptyProduct);
  const [viewingLinkedResidents, setViewingLinkedResidents] = useState<Product | null>(null);
  
  // Linking State (For creating prescriptions from Product Form)
  const [linkedResidents, setLinkedResidents] = useState<string[]>([]);
  const [linkDosage, setLinkDosage] = useState('');
  const [linkFrequency, setLinkFrequency] = useState('');
  const [linkResidentSearch, setLinkResidentSearch] = useState(''); // NEW: Search for linking residents
  
  // Prescription State
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [isEditingPrescription, setIsEditingPrescription] = useState(false);
  const [currentPrescription, setCurrentPrescription] = useState<Prescription>(EmptyPrescription);
  
  // --- NEW STATE: Resident Search in Prescriptions Tab ---
  const [residentTabSearch, setResidentTabSearch] = useState('');
  const [showResidentTabDropdown, setShowResidentTabDropdown] = useState(false);

  // State to handle multiple pharmacies dropdown
  const [openPharmacyDropdown, setOpenPharmacyDropdown] = useState<string | null>(null); // residentID of open dropdown

  // Sync effect: When selectedResidentId changes externally or is set, ensure the input text matches
  useEffect(() => {
    if (selectedResidentId) {
        const found = data.residents.find(r => r.id === selectedResidentId);
        if (found) setResidentTabSearch(found.name);
    } else {
        // Only clear if the dropdown is closed to avoid clearing while typing
        if (!showResidentTabDropdown) {
             setResidentTabSearch('');
        }
    }
  }, [selectedResidentId, data.residents, showResidentTabDropdown]);
  
  // Search State for Prescription Form
  const [prescriptionSearch, setPrescriptionSearch] = useState('');
  const [showMedDropdown, setShowMedDropdown] = useState(false);

  // Search State for Daily Administration
  const [dailySearchTerm, setDailySearchTerm] = useState('');
  const [hideZeroBalanceResidents, setHideZeroBalanceResidents] = useState(false);

  // Orders State
  const [orderQuantities, setOrderQuantities] = useState<Record<string, string>>({});
  const [orderView, setOrderView] = useState<'BY_MEDICATION' | 'BY_RESIDENT'>('BY_MEDICATION');
  const [ordersSearchTerm, setOrdersSearchTerm] = useState(''); // NEW: Search for Orders Tab
  const [shoppingListModalOpen, setShoppingListModalOpen] = useState(false);
  const [shoppingListContent, setShoppingListContent] = useState('');


  // Edit Transaction State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const meds = useMemo(() => (data.products || []).filter(p => 
    p.category === CATEGORY_MEDS && 
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.brand || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!hideZeroStock || p.currentStock > 0) // Filtro de Estoque Zero
  ).sort((a, b) => a.name.localeCompare(b.name)), [data.products, searchTerm, hideZeroStock]);

  // Filtered meds specifically for the prescription search input
  const filteredMedsForPrescription = useMemo(() => {
    return (data.products || []).filter(p => 
      p.category === CATEGORY_MEDS && 
      (p.name.toLowerCase().includes(prescriptionSearch.toLowerCase()) || 
       (p.brand || '').toLowerCase().includes(prescriptionSearch.toLowerCase()))
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [data.products, prescriptionSearch]);

  // --- NEW MEMO: Filtered Residents for the Dropdown ---
  const filteredResidentsForTab = useMemo(() => {
     return data.residents
       .filter(r => r.active)
       .filter(r => r.name.toLowerCase().includes(residentTabSearch.toLowerCase()))
       .sort((a,b) => a.name.localeCompare(b.name));
  }, [data.residents, residentTabSearch]);

  const safePrescriptions = useMemo(() => data.prescriptions || [], [data.prescriptions]);

  // --- GLOBAL PHARMACIES MEMO ---
  // Compila uma lista única de todas as farmácias cadastradas em todos os residentes
  const globalPharmacies = useMemo(() => {
    const map = new Map<string, Pharmacy>();
    data.residents.forEach(r => {
        // 1. Lista de farmácias do residente
        (r.pharmacies || []).forEach(p => {
            const cleanPhone = p.phone.replace(/\D/g, '');
            if (cleanPhone && !map.has(cleanPhone)) {
                map.set(cleanPhone, p);
            }
        });
        // 2. Telefone principal legado (se não estiver na lista acima)
        if (r.pharmacyPhone) {
            const cleanPhone = r.pharmacyPhone.replace(/\D/g, '');
            if (cleanPhone && !map.has(cleanPhone)) {
                // Criamos um objeto Pharmacy temporário para o telefone legado
                map.set(cleanPhone, { 
                    id: `legacy_${r.id}`, 
                    name: `Farmácia (Ref. ${r.name.split(' ')[0]})`, 
                    phone: r.pharmacyPhone 
                });
            }
        }
    });
    return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [data.residents]);

  const getPersonalStock = useCallback((residentId: string, productId: string) => {
    const txs = (data.transactions || []).filter(t => t.residentId === residentId && t.productId === productId);
    const totalIn = txs.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.quantity, 0);
    const totalOut = txs.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.quantity, 0);
    return totalIn - totalOut;
  }, [data.transactions]);

  const calculateSuggestedOrderQuantity = useCallback((prescription: Prescription): number => {
    const dosage = prescription.dosage.toLowerCase();
    const frequency = prescription.frequency.toLowerCase();

    // Rule 1: Prioritize "Xcp por dia"
    const combinedText = `${dosage} ${frequency}`;
    const cpPerDayMatch = combinedText.match(/(\d+)\s*c(p|omprimido)s?\s*por\s*dia/);
    if (cpPerDayMatch) {
        const pillsPerDay = parseInt(cpPerDayMatch[1], 10);
        if (!isNaN(pillsPerDay) && pillsPerDay > 0) {
            return pillsPerDay * 30;
        }
    }

    // Rule 2: General parsing
    const doseMatch = dosage.replace(',', '.').match(/(\d+(\.\d+)?)/);
    const quantityPerDose = doseMatch ? parseFloat(doseMatch[1]) : 1;

    let dosesPerDay = 0;

    if (frequency.includes('12 em 12') || frequency.includes('12/12')) dosesPerDay = 2;
    else if (frequency.includes('8 em 8') || frequency.includes('8/8')) dosesPerDay = 3;
    else if (frequency.includes('6 em 6') || frequency.includes('6/6')) dosesPerDay = 4;
    else if (frequency.includes('4 em 4') || frequency.includes('4/4')) dosesPerDay = 6;
    else {
      const perDayMatch = frequency.match(/(\d+)\s*(vezes|x)\s*ao?\s*dia/);
      if (perDayMatch) {
          dosesPerDay = parseInt(perDayMatch[1], 10);
      } else if (frequency.includes('uma vez') || frequency.includes('1x') || frequency.includes('diariamente')) {
          dosesPerDay = 1;
      } else if (frequency.includes('duas vezes') || frequency.includes('2x')) {
          dosesPerDay = 2;
      } else if (frequency.includes('três vezes') || frequency.includes('3x')) {
          dosesPerDay = 3;
      }
    }
    
    if (dosesPerDay > 0 && !isNaN(quantityPerDose)) {
        return Math.ceil(quantityPerDose * dosesPerDay * 30);
    }

    return 30;
  }, []);


  useEffect(() => {
    if (activeTab === 'ORDERS') {
      const newQuantities: Record<string, string> = {};
      data.residents.filter(r => r.active).forEach(resident => {
        (data.prescriptions || [])
          .filter(p => p.residentId === resident.id && p.active)
          .forEach(prescription => {
            const personalStock = getPersonalStock(resident.id, prescription.productId);
            if (personalStock <= 5) {
              const suggestedQty = calculateSuggestedOrderQuantity(prescription);
              const key = `${resident.id}_${prescription.productId}`;
              newQuantities[key] = String(suggestedQty);
            }
          });
      });
      setOrderQuantities(newQuantities);
    }
  }, [activeTab, data.residents, data.prescriptions, getPersonalStock, calculateSuggestedOrderQuantity]);


  // --- Helpers ---
  
  const getWhatsAppBulkOrderLink = (resident: Resident, products: Product[]) => {
    const phone = resident.responsible.phone1.replace(/\D/g, ''); 
    if (!phone) return null;
    
    const medsList = products.map(p => {
      const key = `${resident.id}_${p.id}`;
      const qty = orderQuantities[key];
      const qtyString = qty ? ` (${qty} ${p.unit}s)` : ' (Reposição)';
      return `- *${p.name}*${qtyString}`;
    }).join('\n');
    
    const message = `Olá ${resident.responsible.name}. \n\nEstamos entrando em contato referente ao(à) residente ${resident.name}. \n\nPrecisamos da reposição dos seguintes medicamentos que estão com estoque baixo:\n\n${medsList}\n\nPor favor, providencie assim que possível.\nObrigado!`;
    return `https://wa.me/${phone.length <= 11 ? '55' + phone : phone}?text=${encodeURIComponent(message)}`;
  };

  const generateQuoteMessage = (resident: Resident, products: Product[]) => {
    const medsList = products.map(p => {
       const key = `${resident.id}_${p.id}`;
       const qty = orderQuantities[key];
       const qtyString = qty ? ` - ${qty} ${p.unit}s` : '';
       return `- ${p.name}${qtyString}`;
    }).join('\n');

    return `Olá, gostaria de um orçamento para o(a) residente *${resident.name}* referente aos seguintes medicamentos:\n\n${medsList}\n\nFico no aguardo.`;
  };

  const getWhatsAppQuoteLink = (resident: Resident, products: Product[], targetPhone?: string) => {
    const phone = targetPhone || resident.pharmacyPhone?.replace(/\D/g, '');
    if (!phone) return null;
    
    const fullPhone = phone.length <= 11 ? `55${phone}` : phone;
    const message = generateQuoteMessage(resident, products);
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  };


  // --- Data Calculations for Orders (REFACTORED LOGIC) ---
  const medicationOrders = useMemo(() => {
    const orders = new Map<string, { product: Product, totalSuggested: number, residents: { resident: Resident, prescription: Prescription, suggestedQty: number, personalStock: number }[] }>();
    const activeResidentsMap = new Map<string, Resident>(
        (data.residents || []).filter(r => r.active).map(r => [r.id, r])
    );
    const productsMap = new Map<string, Product>(
        (data.products || []).map(p => [p.id, p])
    );

    (safePrescriptions).filter(p => p.active && activeResidentsMap.has(p.residentId))
      .forEach(prescription => {
        const personalStock = getPersonalStock(prescription.residentId, prescription.productId);
        
        if (personalStock <= 5) {
          const product = productsMap.get(prescription.productId);
          const resident = activeResidentsMap.get(prescription.residentId);

          if (product && resident) {
            if (!orders.has(product.id)) {
                orders.set(product.id, { product, totalSuggested: 0, residents: [] });
            }

            const orderEntry = orders.get(product.id)!;
            const key = `${resident.id}_${product.id}`;
            const suggestedQty = parseInt(orderQuantities[key] || String(calculateSuggestedOrderQuantity(prescription)), 10);
            
            orderEntry.totalSuggested += suggestedQty;
            orderEntry.residents.push({
                resident,
                prescription,
                suggestedQty,
                personalStock: personalStock
            });
          }
        }
      });

    let result = Array.from(orders.values()).sort((a, b) => a.product.name.localeCompare(b.product.name));

    // Filter by search term
    if (ordersSearchTerm) {
      const lowerTerm = ordersSearchTerm.toLowerCase();
      result = result.filter(item => 
        item.product.name.toLowerCase().includes(lowerTerm)
      );
    }

    return result;
  }, [data.products, data.residents, safePrescriptions, orderQuantities, getPersonalStock, calculateSuggestedOrderQuantity, ordersSearchTerm]);

  const residentOrders = useMemo(() => {
      const ordersByResident = new Map<string, { resident: Resident, meds: Product[] }>();
      const productsMap = new Map<string, Product>((data.products || []).map(p => [p.id, p]));
      const activeResidentsMap = new Map<string, Resident>((data.residents || []).filter(r => r.active).map(r => [r.id, r]));

      (safePrescriptions).filter(p => p.active && activeResidentsMap.has(p.residentId))
          .forEach(prescription => {
              const personalStock = getPersonalStock(prescription.residentId, prescription.productId);

              if (personalStock <= 5) {
                  const resident = activeResidentsMap.get(prescription.residentId);
                  const product = productsMap.get(prescription.productId);

                  if (resident && product) {
                      if (!ordersByResident.has(resident.id)) {
                          ordersByResident.set(resident.id, { resident, meds: [] });
                      }
                      const entry = ordersByResident.get(resident.id)!;
                      if (!entry.meds.some(m => m.id === product.id)) {
                          entry.meds.push(product);
                      }
                  }
              }
          });

      let result = Array.from(ordersByResident.values()).sort((a, b) => a.resident.name.localeCompare(b.resident.name));

      // Filter by search term
      if (ordersSearchTerm) {
        const lowerTerm = ordersSearchTerm.toLowerCase();
        result = result.filter(item => 
          item.resident.name.toLowerCase().includes(lowerTerm)
        );
      }

      return result;
  }, [data.products, data.residents, safePrescriptions, getPersonalStock, ordersSearchTerm]);


  // --- Inventory Handlers ---

  const handleEdit = (product: Product) => {
    setCurrentProduct(product);
    const existingLinks = safePrescriptions
      .filter(p => p.productId === product.id)
      .map(p => p.residentId);
    
    setLinkedResidents(existingLinks);
    setLinkDosage(''); 
    setLinkFrequency('');
    setLinkResidentSearch(''); // Reset Search
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja remover este medicamento do sistema?')) {
      onDelete(id);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const productId = currentProduct.id || generateSafeId();
    
    const productToSave = {
      ...currentProduct,
      category: CATEGORY_MEDS,
      id: productId
    };
    
    onSave(productToSave);

    linkedResidents.forEach(residentId => {
       const exists = safePrescriptions.find(p => p.productId === productId && p.residentId === residentId);
       
       if (!exists) {
         const newPrescription: Prescription = {
           id: generateSafeId(),
           residentId: residentId,
           productId: productId,
           productName: productToSave.name,
           dosage: linkDosage || 'A definir',
           frequency: linkFrequency || 'A definir',
           active: true
         };
         onSavePrescription(newPrescription);
       }
    });

    setIsEditing(false);
    setCurrentProduct(EmptyProduct);
    setLinkedResidents([]);
    setLinkDosage('');
    setLinkFrequency('');
    setLinkResidentSearch(''); // Reset
  };

  const toggleResidentLink = (residentId: string) => {
    setLinkedResidents(prev => 
      prev.includes(residentId) 
        ? prev.filter(id => id !== residentId)
        : [...prev, residentId]
    );
  };

  // --- Prescription Handlers ---

  const handleEditPrescription = (pres: Prescription) => {
    setCurrentPrescription(pres);
    // Initialize search field with current product name
    const prod = data.products.find(p => p.id === pres.productId);
    setPrescriptionSearch(prod ? prod.name : pres.productName || '');
    setIsEditingPrescription(true);
  };

  const handleDeletePrescriptionHandler = (id: string) => {
    // Remoção direta sem confirmação para facilitar a gestão
    onDeletePrescription(id);
  };

  const handleSavePrescriptionForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPrescription.productId) {
        alert("Por favor, selecione um medicamento da lista.");
        return;
    }
    const product = (data.products || []).find(p => p.id === currentPrescription.productId);
    const prescriptionToSave = {
      ...currentPrescription,
      residentId: selectedResidentId || currentPrescription.residentId,
      productName: product?.name || currentPrescription.productName,
      id: currentPrescription.id || generateSafeId()
    };
    onSavePrescription(prescriptionToSave);
    setIsEditingPrescription(false);
    setCurrentPrescription(EmptyPrescription);
    setPrescriptionSearch('');
  };

  // --- ADMINISTER HANDLER (UPDATED LOGIC WITH TREATMENT AUTO-CLOSE) ---
  const handleQuickAdminister = (prescription: Prescription) => {
    const resident = (data.residents || []).find(r => r.id === prescription.residentId);
    const residentName = resident ? resident.name : 'Residente (Sistema)';

    // Extracts the leading number from the dosage string (e.g., "2cp", "1 comprimido", "10ml").
    const parsedQuantity = parseInt(prescription.dosage, 10);

    // If parsing fails (e.g., dosage is "A critério médico") or is zero, default to 1.
    const quantityToAdminister = !isNaN(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;

    // 1. Transaction (Logs History)
    const transaction: Transaction = {
      id: generateSafeId(),
      date: getLocalDate(),
      type: 'OUT',
      productId: prescription.productId,
      productName: prescription.productName,
      residentId: prescription.residentId,
      residentName: residentName,
      quantity: quantityToAdminister,
      notes: `Administração Diária: ${prescription.dosage}`
    };
    
    onTransaction(transaction);

    // 2. Logic to Close Prescription if Treatment (Non-Continuous) and Stock Hits Zero
    if (prescription.isTreatment) {
        const currentStock = getPersonalStock(prescription.residentId, prescription.productId);
        const remaining = currentStock - quantityToAdminister;

        if (remaining <= 0) {
            // Deactivate prescription automatically
            onSavePrescription({ ...prescription, active: false });
            alert(`O estoque de ${prescription.productName} acabou. \n\nComo é um tratamento temporário, a prescrição foi encerrada automaticamente.`);
        }
    }
  };

  const openDocument = (p: Prescription) => {
    if (p.linkUrl) {
      window.open(p.linkUrl, '_blank');
    } else if (p.pdfBase64) {
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${p.pdfBase64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
    } else {
        alert("Nenhum documento anexado ou link configurado.");
    }
  };

  // --- Orders Logic ---
  const handleOrderQuantityChange = (residentId: string, productId: string, val: string) => {
    const key = `${residentId}_${productId}`;
    setOrderQuantities(prev => ({ ...prev, [key]: val }));
  };

  // --- Transaction Edit Handlers ---
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


  // --- Render Functions ---

  // 1. INVENTORY FORM
  if (isEditing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto border-t-4 border-t-cyan-500">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Pill className="text-cyan-500" />
          {currentProduct.id ? 'Editar Medicamento' : 'Novo Medicamento'}
        </h2>
        
        <form onSubmit={handleSaveProduct} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Medicamento *</label>
              <input 
                required
                type="text" 
                placeholder="Ex: Losartana 50mg"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={currentProduct.name}
                onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Laboratório / Marca</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-300 rounded-md"
                  value={currentProduct.brand || ''}
                  onChange={e => setCurrentProduct({...currentProduct, brand: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded-md"
                  value={currentProduct.unit}
                  onChange={e => setCurrentProduct({...currentProduct, unit: e.target.value})}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Atual</label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full p-2 border border-slate-300 rounded-md"
                  value={currentProduct.currentStock}
                  onChange={e => setCurrentProduct({...currentProduct, currentStock: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Mínimo (Alerta)</label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full p-2 border border-slate-300 rounded-md"
                  value={currentProduct.minStock}
                  onChange={e => setCurrentProduct({...currentProduct, minStock: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-6">
             <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Users size={18} className="text-purple-600" />
                  Quem utiliza este medicamento?
                </h3>
             </div>
             <p className="text-sm text-slate-500 mb-4">Selecione os residentes abaixo para criar automaticamente as prescrições.</p>
             
             {/* NEW SEARCH FIELD */}
             <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar residente..." 
                  className="w-full pl-9 p-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                  value={linkResidentSearch}
                  onChange={e => setLinkResidentSearch(e.target.value)}
                />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto mb-4 border p-2 rounded-lg bg-slate-50">
               {data.residents
                 .filter(r => r.active && r.name.toLowerCase().includes(linkResidentSearch.toLowerCase()))
                 .sort((a, b) => a.name.localeCompare(b.name))
                 .map(resident => (
                 <label key={resident.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer border transition-colors ${linkedResidents.includes(resident.id) ? 'bg-purple-50 border-purple-300' : 'bg-white border-slate-200 hover:bg-slate-100'}`}>
                    <input 
                      type="checkbox"
                      checked={linkedResidents.includes(resident.id)}
                      onChange={() => toggleResidentLink(resident.id)}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div className="w-8 h-10 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                      {resident.photo ? (
                        <img src={resident.photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className="m-auto mt-2 text-slate-400" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-700 truncate">{resident.name}</span>
                 </label>
               ))}
               {data.residents.filter(r => r.active && r.name.toLowerCase().includes(linkResidentSearch.toLowerCase())).length === 0 && (
                  <p className="text-sm text-slate-400 p-2 col-span-2 text-center">Nenhum residente encontrado.</p>
               )}
             </div>
          </div>
          <div className="flex gap-4 justify-end pt-4 border-t border-slate-100">
            <button 
              type="button"
              onClick={() => { setIsEditing(false); setLinkResidentSearch(''); }}
              className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium shadow-sm"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    );
  }

  // 2. PRESCRIPTION FORM
  if (isEditingPrescription) {
    const residentName = data.residents.find(r => r.id === (selectedResidentId || currentPrescription.residentId))?.name;
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto border-t-4 border-t-purple-500">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <FileText className="text-purple-500" />
          {currentPrescription.id ? 'Editar Prescrição' : `Nova Prescrição para ${residentName}`}
        </h2>
        <form onSubmit={handleSavePrescriptionForm} className="space-y-5">
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Medicamento (do Estoque) *</label>
              
              <div className="relative">
                <div className="flex items-center border border-slate-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500 overflow-hidden">
                    <div className="pl-3 text-slate-400">
                        <Search size={18} />
                    </div>
                    <input 
                        type="text" 
                        required={!currentPrescription.productId}
                        placeholder="Digite para buscar o medicamento..." 
                        className="w-full p-2.5 outline-none text-slate-700 placeholder:text-slate-400"
                        value={prescriptionSearch}
                        onChange={(e) => {
                            setPrescriptionSearch(e.target.value);
                            setShowMedDropdown(true);
                            // If user types, we keep searching. If selection was made, typing will filter again.
                        }}
                        onFocus={() => setShowMedDropdown(true)}
                        // Delay blur to allow click on option
                        onBlur={() => setTimeout(() => setShowMedDropdown(false), 200)}
                    />
                    {prescriptionSearch && (
                        <button 
                            type="button" 
                            onClick={() => { setPrescriptionSearch(''); setCurrentPrescription({...currentPrescription, productId: ''}); }}
                            className="pr-3 text-slate-400 hover:text-slate-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {showMedDropdown && (
                   <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-md shadow-xl max-h-60 overflow-y-auto mt-1 animate-in fade-in zoom-in-95 duration-100">
                      {filteredMedsForPrescription.map(m => (
                         <div 
                           key={m.id} 
                           className="p-3 hover:bg-purple-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center group"
                           onClick={() => {
                              setCurrentPrescription({...currentPrescription, productId: m.id, productName: m.name});
                              setPrescriptionSearch(m.name);
                              setShowMedDropdown(false);
                           }}
                         >
                            <div>
                                <div className="font-bold text-sm text-slate-800 group-hover:text-purple-700">{m.name}</div>
                                <div className="text-xs text-slate-500">{m.brand}</div>
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full font-bold ${m.currentStock > m.minStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {m.currentStock} un
                            </div>
                         </div>
                      ))}
                      {filteredMedsForPrescription.length === 0 && (
                          <div className="p-4 text-center text-sm text-slate-400">
                              Nenhum medicamento encontrado.
                              <br/>
                              <button 
                                type="button" 
                                onClick={() => { setIsEditingPrescription(false); setActiveTab('INVENTORY'); setIsEditing(true); setCurrentProduct({...EmptyProduct, name: prescriptionSearch}); }}
                                className="text-purple-600 font-bold hover:underline mt-1"
                              >
                                  Cadastrar Novo?
                              </button>
                          </div>
                      )}
                   </div>
                )}
              </div>
              
              {currentPrescription.productId && (
                 <div className="mt-2 text-xs bg-green-50 text-green-700 p-2 rounded-lg border border-green-100 flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 size={14} />
                    <span>Medicamento selecionado: <strong>{data.products.find(p=>p.id===currentPrescription.productId)?.name}</strong></span>
                 </div>
              )}
           </div>
           
           {/* Treatment Toggle Box */}
           <div className="p-4 rounded-lg border flex flex-col gap-2 transition-colors cursor-pointer bg-amber-50 border-amber-200">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                        type="checkbox"
                        checked={currentPrescription.isTreatment}
                        onChange={(e) => setCurrentPrescription({...currentPrescription, isTreatment: e.target.checked})}
                        className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <div>
                        <span className="font-bold text-amber-800 text-sm block">Medicamento de Tratamento (Temporário)</span>
                        <span className="text-xs text-amber-700 block">Se marcado, a prescrição será removida automaticamente quando o estoque zerar.</span>
                    </div>
                </label>
           </div>

           <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dosagem *</label>
                <input 
                  required
                  type="text" 
                  placeholder="Ex: 1 cp"
                  className="w-full p-2 border border-slate-300 rounded-md"
                  value={currentPrescription.dosage}
                  onChange={e => setCurrentPrescription({...currentPrescription, dosage: e.target.value})}
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Frequência *</label>
                <input 
                  required
                  type="text" 
                  placeholder="Ex: 8/8h"
                  className="w-full p-2 border border-slate-300 rounded-md"
                  value={currentPrescription.frequency}
                  onChange={e => setCurrentPrescription({...currentPrescription, frequency: e.target.value})}
                />
             </div>
           </div>
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Horários</label>
              <input 
                type="text" 
                placeholder="Ex: 08:00, 16:00"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={currentPrescription.times || ''}
                onChange={e => setCurrentPrescription({...currentPrescription, times: e.target.value})}
              />
           </div>
           <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
             <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
               <Link size={16} /> Link da Receita (Drive/Cloud)
             </label>
             <input 
               type="url" 
               placeholder="Ex: https://drive.google.com/..."
               value={currentPrescription.linkUrl || ''}
               onChange={e => setCurrentPrescription({ ...currentPrescription, linkUrl: e.target.value })}
               className="w-full p-2 border border-slate-300 rounded-md"
             />
             <p className="text-xs text-slate-500 mt-2">
               * Recomenda-se usar links para evitar ocupar espaço no dispositivo.
             </p>
           </div>
           <div className="flex gap-4 justify-end pt-4">
            <button 
              type="button"
              onClick={() => setIsEditingPrescription(false)}
              className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium shadow-sm"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    );
  }

  // 3. DAILY ADMIN TAB
  const renderDailyTab = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
            <ListChecks className="text-blue-600 shrink-0 mt-0.5" />
            <div>
            <h3 className="font-bold text-blue-800">Administração Diária</h3>
            <p className="text-sm text-blue-700">Visualize abaixo os medicamentos ativos de cada residente e registre o uso rapidamente.</p>
            </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Toggle Button for Zero Balance */}
            <button
                onClick={() => setHideZeroBalanceResidents(!hideZeroBalanceResidents)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm ${hideZeroBalanceResidents ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-100'}`}
                title={hideZeroBalanceResidents ? "Mostrar residentes sem estoque" : "Ocultar residentes sem estoque"}
            >
                {hideZeroBalanceResidents ? <EyeOff size={18} /> : <Eye size={18} />}
                <span className="hidden md:inline">{hideZeroBalanceResidents ? 'Mostrando Disponíveis' : 'Ocultar Sem Saldo'}</span>
            </button>

            {/* Search Input */}
            <div className="relative w-full md:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar residente..." 
                    className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={dailySearchTerm}
                    onChange={e => setDailySearchTerm(e.target.value)}
                />
                {dailySearchTerm && (
                    <button onClick={() => setDailySearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600">
                    <X size={14} />
                    </button>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
         {data.residents
            .filter(r => r.active)
            .filter(r => r.name.toLowerCase().includes(dailySearchTerm.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name)) // Order residents alphabetically
            .map(resident => {
            const residentPrescriptions = safePrescriptions
                .filter(p => p.residentId === resident.id && p.active)
                .sort((a, b) => a.productName.localeCompare(b.productName)); // Order medications alphabetically

            if(residentPrescriptions.length === 0) return null;

            // Logic to check if resident has ANY stock > 0
            const hasAnyStock = residentPrescriptions.some(p => getPersonalStock(resident.id, p.productId) > 0);

            // Filter out residents with zero stock if toggle is active
            if (hideZeroBalanceResidents && !hasAnyStock) return null;

            const today = getLocalDate();
            const residentDailyTransactions = (data.transactions || []).filter(
              tx => tx.date === today && tx.residentId === resident.id && tx.notes?.startsWith('Administração Diária')
            );

            return (
              <div key={resident.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-12 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                      {resident.photo ? <img src={resident.photo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-slate-300" />}
                    </div>
                    <h3 className="font-bold text-slate-800">{resident.name}</h3>
                 </div>
                 <div className="divide-y divide-slate-100">
                    {residentPrescriptions.map(p => {
                       const personalStock = getPersonalStock(resident.id, p.productId);
                       const stockColor = personalStock > 5 ? 'text-green-600 bg-green-50' : personalStock > 0 ? 'text-orange-600 bg-orange-50' : 'text-red-600 bg-red-50';
                       const alreadyAdministeredToday = residentDailyTransactions.some(tx => tx.productId === p.productId);

                       return (
                         <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50">
                            <div>
                               <div className="font-bold text-slate-700 text-lg flex items-center gap-2">
                                   {p.productName}
                                   {p.isTreatment && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Tratamento</span>}
                               </div>
                               <div className="text-sm text-slate-500 flex flex-wrap gap-3 mt-1">
                                  <span className="flex items-center gap-1"><Pill size={14}/> {p.dosage}</span>
                                  <span className="flex items-center gap-1"><Clock size={14}/> {p.frequency}</span>
                                  {p.times && <span className="text-slate-400">({p.times})</span>}
                               </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                               <div className={`text-xs font-bold px-3 py-1 rounded-full border border-transparent ${stockColor}`}>
                                  Saldo: {personalStock}
                                </div>
                               {alreadyAdministeredToday ? (
                                  <button 
                                    disabled
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm cursor-not-allowed"
                                  >
                                    <CheckCircle2 size={18} /> Administrado
                                  </button>
                               ) : personalStock <= 0 ? (
                                <button 
                                    disabled
                                    className="bg-slate-200 text-slate-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm cursor-not-allowed"
                                  >
                                    <XCircle size={18} /> Administrar
                                  </button>
                               ) : (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleQuickAdminister(p); }}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                                  >
                                    <CheckCircle2 size={18} /> Administrar
                                  </button>
                               )}
                            </div>
                         </div>
                       );
                    })}
                 </div>
              </div>
            );
         })}
      </div>
    </div>
  );

  // 4. ORDERS TAB (REFACTORED)
  const renderOrdersTab = () => {
    
    const handleGenerateShoppingList = () => {
        let content = `LISTA DE COMPRAS DE MEDICAMENTOS - ${new Date().toLocaleDateString('pt-BR')}\n\n`;
        content += "--- \n\n";

        medicationOrders.forEach(({ product, totalSuggested, residents }) => {
            if (totalSuggested > 0) {
                content += `**${product.name} (Total: ${totalSuggested} ${product.unit}s)**\n`;
                residents.forEach(({ resident, suggestedQty }) => {
                    if (suggestedQty > 0) {
                        content += `- Para ${resident.name}: ${suggestedQty} ${product.unit}s\n`;
                    }
                });
                content += "\n";
            }
        });
        
        setShoppingListContent(content.replace(/\*\*/g, '')); // Remove markdown for textarea
        setShoppingListModalOpen(true);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shoppingListContent).then(() => {
            alert("Lista copiada para a área de transferência!");
        }, () => {
            alert("Falha ao copiar. Tente manualmente.");
        });
    };

    const renderByMedication = () => (
      <div className="space-y-4">
        {medicationOrders.map(({ product, totalSuggested, residents }) => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-800">{product.name}</h4>
                <p className="text-xs text-slate-500">Estoque Geral: {product.currentStock} | Mínimo: {product.minStock}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Total Sugerido</p>
                <p className="font-bold text-lg text-red-600">{totalSuggested} {product.unit}s</p>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {residents.map(({ resident, prescription, suggestedQty, personalStock }) => (
                <div key={resident.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                      {resident.photo ? <img src={resident.photo} className="w-full h-full object-cover" /> : <User size={20} className="m-auto mt-2 text-slate-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{resident.name}</p>
                      <p className="text-xs text-slate-400">Estoque Pessoal: {personalStock}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={orderQuantities[`${resident.id}_${product.id}`] || ''}
                      onChange={e => handleOrderQuantityChange(resident.id, product.id, e.target.value)}
                      className="w-20 p-1 border rounded text-center font-bold"
                    />
                    <span className="text-sm text-slate-500">{product.unit}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {medicationOrders.length === 0 && <div className="text-center py-10 text-slate-400">Nenhum medicamento com estoque baixo encontrado.</div>}
      </div>
    );

    const renderByResident = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {residentOrders.map(({ resident, meds }) => {
          // --- LOGICA DE FARMÁCIAS GLOBAL (UNIFICADA) ---
          const uniquePharmaciesMap = new Map<string, Pharmacy>();

          // 1. Add All Global Pharmacies found in the system
          globalPharmacies.forEach(p => {
             const clean = p.phone.replace(/\D/g, '');
             if(clean) uniquePharmaciesMap.set(clean, p);
          });

          // 2. Ensure current resident's "Preferred/Default" pharmacy is in there (legacy field)
          if (resident.pharmacyPhone) {
             const clean = resident.pharmacyPhone.replace(/\D/g, '');
             if (clean && !uniquePharmaciesMap.has(clean)) {
                uniquePharmaciesMap.set(clean, {
                   id: `def_${resident.id}`,
                   name: 'Farmácia Padrão (Deste Residente)',
                   phone: resident.pharmacyPhone
                });
             }
          }

          // Convert to array and sort
          const allOptions = Array.from(uniquePharmaciesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
          
          const showDropdown = allOptions.length > 0;

          return (
          <div key={resident.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                  {resident.photo ? <img src={resident.photo} className="w-full h-full object-cover" /> : <User size={24} className="m-auto mt-3 text-slate-400" />}
                </div>
                <h4 className="font-bold">{resident.name}</h4>
              </div>
              
              <div className="flex gap-2">
                  <div className="relative">
                      {/* Quote Button (Orçamento) */}
                      <button 
                        onClick={() => {
                           if (showDropdown) {
                              setOpenPharmacyDropdown(openPharmacyDropdown === resident.id ? null : resident.id);
                           } else if (allOptions.length === 1) {
                              // If only one, open it directly
                              const link = getWhatsAppQuoteLink(resident, meds, allOptions[0].phone);
                              if (link) window.open(link, '_blank');
                           }
                        }}
                        className={`p-2 rounded-lg text-sm font-bold flex items-center gap-1 ${allOptions.length === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`} 
                        title={allOptions.length === 0 ? 'Nenhuma farmácia cadastrada no sistema' : 'Pedir Orçamento'}
                        disabled={allOptions.length === 0}
                      >
                          <DollarSign size={14}/>
                          {showDropdown && allOptions.length > 1 && <ChevronDown size={12} />}
                      </button>

                      {/* Dropdown for multiple pharmacies */}
                      {openPharmacyDropdown === resident.id && (
                         <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                            
                            <div className="text-xs font-bold text-slate-500 bg-slate-50 p-2 border-b uppercase flex items-center gap-1">
                               <Building2 size={12}/> Farmácias Disponíveis:
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                {allOptions.map(p => (
                                   <a 
                                     key={p.id}
                                     href={getWhatsAppQuoteLink(resident, meds, p.phone) || '#'}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 border-b border-slate-50 last:border-0"
                                     onClick={() => setOpenPharmacyDropdown(null)}
                                   >
                                      <div className="font-bold truncate">{p.name}</div>
                                      <div className="text-xs text-slate-400">{p.phone}</div>
                                   </a>
                                ))}
                            </div>
                         </div>
                      )}
                  </div>

                  {/* Close dropdown if clicking outside (simple overlay) */}
                  {openPharmacyDropdown === resident.id && (
                     <div className="fixed inset-0 z-40" onClick={() => setOpenPharmacyDropdown(null)}></div>
                  )}

                  <a href={getWhatsAppBulkOrderLink(resident, meds) || '#'} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-sm font-bold flex items-center gap-1 bg-green-500 text-white hover:bg-green-600 shadow-sm">
                      <MessageCircle size={14}/> Pedir
                  </a>
              </div>
            </div>
            <div className="space-y-1">
              {meds.map(med => (
                <div key={med.id} className="flex justify-between text-sm p-2 rounded hover:bg-slate-50">
                  <span>{med.name}</span>
                  <span className="font-bold">{orderQuantities[`${resident.id}_${med.id}`]} {med.unit}s</span>
                </div>
              ))}
            </div>
          </div>
        )})}
        {residentOrders.length === 0 && <div className="md:col-span-2 text-center py-10 text-slate-400">Nenhum residente precisa de reposição encontrada.</div>}
      </div>
    );

    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
        {shoppingListModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-slate-800">Lista de Compras Gerada</h3>
                  <button onClick={() => setShoppingListModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <textarea
                  readOnly
                  className="w-full h-64 p-3 border border-slate-300 rounded-md bg-slate-50 font-mono text-sm"
                  value={shoppingListContent}
                />
                <div className="flex gap-3 justify-end pt-4 mt-2">
                  <button onClick={copyToClipboard} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                    <Clipboard size={16}/> Copiar Lista
                  </button>
                </div>
              </div>
            </div>
        )}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-lg text-slate-800">Pedidos e Reposição</h3>
              <p className="text-sm text-slate-500">Gere listas de compra e notifique responsáveis sobre medicamentos em falta.</p>
            </div>
            
            {/* SEARCH FIELD REPLACING BUTTON */}
            <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar medicamento ou residente..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    value={ordersSearchTerm}
                    onChange={e => setOrdersSearchTerm(e.target.value)}
                />
                {ordersSearchTerm && (
                    <button onClick={() => setOrdersSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                    </button>
                )}
            </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit mx-auto">
            <button onClick={() => setOrderView('BY_MEDICATION')} className={`px-4 py-2 rounded-lg text-sm font-bold ${orderView === 'BY_MEDICATION' ? 'bg-white shadow' : 'text-slate-500'}`}>Ver por Medicamento</button>
            <button onClick={() => setOrderView('BY_RESIDENT')} className={`px-4 py-2 rounded-lg text-sm font-bold ${orderView === 'BY_RESIDENT' ? 'bg-white shadow' : 'text-slate-500'}`}>Ver por Residente</button>
        </div>
        
        {orderView === 'BY_MEDICATION' ? renderByMedication() : renderByResident()}
      </div>
    );
  };
  
  const renderInventoryTab = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-1 gap-2 w-full">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="Buscar medicamento..." className="w-full pl-10 p-2 border border-slate-200 rounded-lg" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <button
                    onClick={() => setHideZeroStock(!hideZeroStock)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm border ${hideZeroStock ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    title={hideZeroStock ? "Mostrar itens zerados" : "Ocultar itens zerados"}
                >
                    {hideZeroStock ? <EyeOff size={18} /> : <Eye size={18} />}
                    <span className="hidden md:inline">{hideZeroStock ? 'Exibindo Disponíveis' : 'Ocultar Zerados'}</span>
                </button>
            </div>
            <button onClick={() => { setCurrentProduct(EmptyProduct); setIsEditing(true); }} className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 flex items-center gap-2 shadow-sm w-full md:w-auto justify-center">
                <Plus size={20} /> Novo Medicamento
            </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold">
                        <tr>
                            <th className="p-4">Medicamento</th>
                            <th className="p-4 text-center">Estoque Atual</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {meds.map(med => (
                            <tr key={med.id} className="hover:bg-slate-50">
                                <td className="p-4"><div className="font-medium text-slate-900">{med.name}</div><div className="text-xs text-slate-400">{med.brand}</div></td>
                                <td className="p-4 text-center font-bold text-lg">{med.currentStock}</td>
                                <td className="p-4 text-center">{med.currentStock <= med.minStock ? <span className="text-xs font-medium bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Baixo</span> : <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-full">OK</span>}</td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setViewingLinkedResidents(med)} className="text-slate-500 hover:bg-slate-100 p-2 rounded-full" title="Ver residentes que usam"><Users size={18} /></button>
                                        <button onClick={() => handleEdit(med)} className="text-primary-600 hover:bg-primary-50 p-2 rounded-full"><Edit2 size={18} /></button>
                                        <button onClick={() => handleDelete(med.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        {viewingLinkedResidents && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-slate-800">Residentes usando {viewingLinkedResidents.name}</h3>
                        <button onClick={() => setViewingLinkedResidents(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {safePrescriptions.filter(p => p.productId === viewingLinkedResidents.id).map(p => {
                        const resident = data.residents.find(r => r.id === p.residentId);
                        if (!resident) return null;
                        const balance = getPersonalStock(resident.id, viewingLinkedResidents.id);
                        return (
                            <div key={p.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-200">
                                <span className="font-medium text-slate-700">{resident.name}</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${balance > 5 ? 'bg-green-100 text-green-700' : balance > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                    {balance} {viewingLinkedResidents.unit}s
                                </span>
                            </div>
                        );
                      })}
                      {safePrescriptions.filter(p => p.productId === viewingLinkedResidents.id).length === 0 && (
                          <p className="text-center text-slate-400 py-4">Nenhum residente vinculado.</p>
                      )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
  
  const renderPrescriptionsTab = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <label className="font-bold text-slate-700 whitespace-nowrap">Ver prescrições de:</label>
            {/* --- REPLACED SELECT WITH COMBOBOX --- */}
            <div className="relative flex-1 w-full md:w-auto">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="-- Selecione ou Digite o Nome --"
                        className="w-full p-2 pl-10 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                        value={residentTabSearch}
                        onChange={(e) => {
                           setResidentTabSearch(e.target.value);
                           setShowResidentTabDropdown(true);
                           if (e.target.value === '') setSelectedResidentId('');
                        }}
                        onFocus={() => setShowResidentTabDropdown(true)}
                        onBlur={() => setTimeout(() => setShowResidentTabDropdown(false), 200)}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    {residentTabSearch ? (
                       <button
                         onClick={() => { setResidentTabSearch(''); setSelectedResidentId(''); }}
                         className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                       >
                         <X size={16} />
                       </button>
                    ) : (
                       <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    )}
                </div>
                {showResidentTabDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                       {filteredResidentsForTab.map(r => (
                          <div
                            key={r.id}
                            className="p-3 hover:bg-purple-50 cursor-pointer border-b border-slate-50 last:border-0 flex items-center gap-3"
                            onClick={() => {
                               setSelectedResidentId(r.id);
                               setResidentTabSearch(r.name);
                               setShowResidentTabDropdown(false);
                            }}
                          >
                             <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                                {r.photo ? <img src={r.photo} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-2 text-slate-400"/>}
                             </div>
                             <span className="text-slate-700 font-medium">{r.name}</span>
                          </div>
                       ))}
                       {filteredResidentsForTab.length === 0 && (
                          <div className="p-4 text-center text-slate-400 text-sm">Nenhum residente encontrado.</div>
                       )}
                    </div>
                )}
            </div>
            {/* --- END COMBOBOX --- */}

            {selectedResidentId && (
                <button onClick={() => { setCurrentPrescription(EmptyPrescription); setPrescriptionSearch(''); setIsEditingPrescription(true); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 shadow-sm w-full md:w-auto justify-center">
                    <Plus size={18} /> Nova Prescrição
                </button>
            )}
        </div>
        {selectedResidentId && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 font-semibold text-slate-600">
                        <tr>
                          <th className="p-3">Medicamento</th>
                          <th className="p-3">Posologia</th>
                          <th className="p-3 text-center">Tipo</th>
                          <th className="p-3 text-center">Receita</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {safePrescriptions.filter(p => p.residentId === selectedResidentId).map(p => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="p-3 font-bold">{p.productName}</td>
                              <td className="p-3 text-slate-600">{p.dosage} - {p.frequency} ({p.times || 'N/A'})</td>
                              <td className="p-3 text-center">
                                {p.isTreatment ? (
                                    <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold uppercase">Tratamento</span>
                                ) : (
                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase">Contínuo</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {p.linkUrl || p.pdfBase64 ? (
                                  <button onClick={() => openDocument(p)} className="text-blue-500 hover:underline">
                                    <Eye size={16} />
                                  </button>
                                ) : '-'}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => handleEditPrescription(p)} className="text-primary-600 hover:bg-primary-50 p-2 rounded-full"><Edit2 size={16} /></button>
                                  <button onClick={() => handleDeletePrescriptionHandler(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><Trash2 size={16} /></button>
                                </div>
                              </td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
  );


  return (
    <div className="space-y-6">
      {/* Edit Transaction Modal */}
      {editingTransaction && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-slate-800">Editar Movimentação</h3>
                  <button onClick={() => setEditingTransaction(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
               </div>
               <form onSubmit={handleSaveTxEdit} className="space-y-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Data</label><input type="date" required className="w-full p-2 border border-slate-300 rounded-md" value={editingTransaction.date} onChange={e => setEditingTransaction({...editingTransaction, date: e.target.value})}/></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Produto</label><input type="text" disabled className="w-full p-2 bg-slate-100 border border-slate-300 rounded-md text-slate-500" value={editingTransaction.productName}/></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label><input type="number" required min="1" className="w-full p-2 border border-slate-300 rounded-md font-bold" value={editingTransaction.quantity} onChange={e => setEditingTransaction({...editingTransaction, quantity: parseInt(e.target.value) || 0})}/><p className="text-xs text-slate-400 mt-1">O estoque será recalculado.</p></div>
                  <div className="flex gap-3 justify-end pt-4 border-t"><button type="button" onClick={() => setEditingTransaction(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"><Save size={16}/> Salvar</button></div>
               </form>
            </div>
         </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Pill className="text-primary-600" />
            Gestão de Medicamentos
          </h2>
          <p className="text-slate-500 text-sm">Controle de prescrições, estoque e administração diária.</p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'PRESCRIPTIONS' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('PRESCRIPTIONS')}><div className="flex items-center gap-2"><FileText size={18} /> Prescrições</div></button>
        <button className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'DAILY' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('DAILY')}><div className="flex items-center gap-2"><ListChecks size={18} /> Administração Diária</div></button>
        <button className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'ORDERS' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('ORDERS')}><div className="flex items-center gap-2"><DollarSign size={18} /> Pedidos & Reposição</div></button>
        <button className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'INVENTORY' ? 'border-cyan-600 text-cyan-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('INVENTORY')}><div className="flex items-center gap-2"><Package size={18} /> Estoque de Medicamentos</div></button>
      </div>
      
      {/* Content */}
      <div>
        {activeTab === 'INVENTORY' && renderInventoryTab()}
        {activeTab === 'PRESCRIPTIONS' && renderPrescriptionsTab()}
        {activeTab === 'DAILY' && renderDailyTab()}
        {activeTab === 'ORDERS' && renderOrdersTab()}
      </div>
    </div>
  );
};
