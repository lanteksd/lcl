
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { Residents } from './components/Residents';
import { Inventory } from './components/Inventory';
import { Medications } from './components/Medications';
import { StockOperations } from './components/StockOperations';
import { Reports } from './components/Reports';
import { MedicalCare } from './components/MedicalCare';
import { TechnicalCare } from './components/TechnicalCare'; 
import { Demands } from './components/Demands';
import { PersonalItems } from './components/PersonalItems';
import { Employees } from './components/Employees';
import { Evolutions } from './components/Evolutions';
import { AdminPanel } from './components/AdminPanel';
import { AppData, Product, Resident, Transaction, ViewName, Prescription, MedicalAppointment, Demand, Professional, Employee, TimeSheetEntry, TechnicalSession, EvolutionRecord, HouseDocument } from './types';
import { loadRemoteData, saveRemoteData, exportData } from './services/storage';
import { Upload, FileJson, AlertTriangle, RefreshCw, WifiOff, Cloud, Check } from 'lucide-react';

// Helper for Safe ID Generation
const generateSafeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch (e) {}
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState(''); // Guarda o email do usuário logado
  const [institutionName, setInstitutionName] = useState('');
  const [loginLoading, setLoginLoading] = useState(true); // Start loading to check firebase status
  
  // App State
  const [view, setView] = useState<ViewName>('dashboard');
  const [data, setData] = useState<AppData | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false); // Prevent auto-save before load
  const [loadError, setLoadError] = useState(false); // Error state for UI
  
  // Sync Status UI
  const [syncState, setSyncState] = useState<'SAVED' | 'SAVING' | 'ERROR'>('SAVED');
  
  // Backup Logic
  const [backupHandle, setBackupHandle] = useState<any>(null);
  const [backupStatus, setBackupStatus] = useState<'IDLE' | 'PENDING' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setUserEmail(user.email);
        setIsAuthenticated(true);
        
        // Extract Institution Name from Email
        const domain = user.email.split('@')[1];
        const cleanName = domain ? domain.split('.')[0].toUpperCase() : 'INSTITUIÇÃO';
        setInstitutionName(cleanName === 'GMAIL' || cleanName === 'HOTMAIL' ? `CONTA DE ${user.email.split('@')[0].toUpperCase()}` : cleanName);
      } else {
        setIsAuthenticated(false);
        setUserEmail('');
        setData(null);
        setIsDataLoaded(false);
      }
      if (!user) setLoginLoading(false); 
    });

    return () => unsubscribe();
  }, []);

  // Load Cloud Data when Authenticated
  useEffect(() => {
    async function fetchData() {
        if (isAuthenticated && userEmail) {
            setLoginLoading(true); 
            setLoadError(false);
            try {
                const cloudData = await loadRemoteData(userEmail);
                setData(cloudData);
                setIsDataLoaded(true); // Enable saving only after successful load
            } catch (error) {
                console.error("Failed to load data", error);
                setLoadError(true);
            } finally {
                setLoginLoading(false);
            }
        }
    }
    if (isAuthenticated && userEmail && !isDataLoaded) {
        fetchData();
    }
  }, [isAuthenticated, userEmail, isDataLoaded]);

  // Persist Data whenever it changes (Auto-save to Cloud Firestore)
  useEffect(() => {
    // CRITICAL FIX: Only save if authenticated, data exists, AND data was successfully loaded initially.
    // This prevents overwriting cloud data with an empty state during initialization on a new device.
    if (isAuthenticated && data && userEmail && isDataLoaded) {
      setSyncState('SAVING');
      
      const saveToCloud = async () => {
        try {
            await saveRemoteData(data, userEmail);
            setSyncState('SAVED');
        } catch (error) {
            setSyncState('ERROR');
        }
      };
      
      // Debounce save slightly to avoid thrashing
      const timeoutId = setTimeout(saveToCloud, 500);

      // Auto-backup to File Handle if connected (Local)
      if (backupHandle) {
        setBackupStatus('PENDING');
        setTimeout(async () => {
          setBackupStatus('SAVING');
          try {
            // @ts-ignore
            const fileHandle = await backupHandle.getFileHandle(`lifecare_auto_backup_${userEmail.split('@')[0]}.json`, { create: true });
            // @ts-ignore
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
            setBackupStatus('SUCCESS');
          } catch (e) {
            console.error("Auto-backup failed", e);
            setBackupStatus('ERROR');
          }
        }, 2000);
      }
      
      return () => clearTimeout(timeoutId);
    }
  }, [data, isAuthenticated, backupHandle, userEmail, isDataLoaded]);

  // --- AUTH HANDLERS ---

  const handleRestore = (file: File) => {
    if (!isAuthenticated) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const json = JSON.parse(jsonContent);

        if (Array.isArray(json.residents) && Array.isArray(json.products)) {
             // 1. Update State
             setData(json);
             // 2. Persist immediately to Cloud (Force save even if not 'loaded' logic triggers, as this is manual)
             saveRemoteData(json, userEmail);
             setIsDataLoaded(true); // Ensure auto-save continues from here
             alert("Backup restaurado com sucesso! Os dados foram sincronizados com a nuvem.");
        } else {
          alert("Arquivo inválido. Por favor, use um backup oficial do LifeCare (.json).");
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao ler o arquivo.");
      }
    };
    reader.readAsText(file);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setBackupHandle(null);
      setView('dashboard');
      setIsDataLoaded(false);
      setLoadError(false);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const handleManualSync = async () => {
      setLoginLoading(true);
      try {
          const cloudData = await loadRemoteData(userEmail);
          setData(cloudData);
          setIsDataLoaded(true);
          setLoadError(false);
          alert("Dados sincronizados com a nuvem.");
      } catch (e) {
          alert("Erro ao sincronizar.");
          setLoadError(true);
      } finally {
          setLoginLoading(false);
      }
  };

  // --- CRUD HANDLERS (Wrappers to update 'data' state) ---

  const handleSaveResident = (r: Resident) => setData(prev => !prev ? prev : ({ ...prev, residents: [...prev.residents.filter(x => x.id !== r.id), { ...r, id: r.id || generateSafeId() }] }));
  const handleDeleteResident = (id: string) => setData(prev => !prev ? prev : ({ ...prev, residents: prev.residents.filter(r => r.id !== id) }));
  
  const handleSaveProduct = (p: Product) => setData(prev => !prev ? prev : ({ ...prev, products: [...prev.products.filter(x => x.id !== p.id), { ...p, id: p.id || generateSafeId() }] }));
  const handleDeleteProduct = (id: string) => setData(prev => !prev ? prev : ({ ...prev, products: prev.products.filter(p => p.id !== id) }));

  const handleTransaction = (t: Transaction) => {
    setData(prev => {
        if (!prev) return null;
        const products = [...prev.products];
        const pIdx = products.findIndex(p => p.id === t.productId);
        if (pIdx >= 0) {
            const prod = { ...products[pIdx] };
            prod.currentStock += (t.type === 'IN' ? t.quantity : -t.quantity);
            products[pIdx] = prod;
        }
        return { ...prev, products, transactions: [...prev.transactions, { ...t, id: t.id || generateSafeId() }] };
    });
  };

  const handleDeleteTransaction = (id: string) => {
      setData(prev => {
          if (!prev) return null;
          const tx = prev.transactions.find(t => t.id === id);
          if (!tx) return prev;
          
          const products = [...prev.products];
          const pIdx = products.findIndex(p => p.id === tx.productId);
          if (pIdx >= 0) {
              const prod = { ...products[pIdx] };
              prod.currentStock += (tx.type === 'IN' ? -tx.quantity : tx.quantity);
              products[pIdx] = prod;
          }
          return { ...prev, products, transactions: prev.transactions.filter(t => t.id !== id) };
      });
  };

  const handleUpdateTransaction = (t: Transaction) => {
      setData(prev => {
          if(!prev) return null;
          const oldTx = prev.transactions.find(x => x.id === t.id);
          if (!oldTx) return prev;

          const products = [...prev.products];
          const pIdx = products.findIndex(p => p.id === t.productId);
          if (pIdx >= 0) {
              const prod = { ...products[pIdx] };
              prod.currentStock += (oldTx.type === 'IN' ? -oldTx.quantity : oldTx.quantity);
              prod.currentStock += (t.type === 'IN' ? t.quantity : -t.quantity);
              products[pIdx] = prod;
          }
          
          return { 
              ...prev, 
              products, 
              transactions: prev.transactions.map(x => x.id === t.id ? t : x) 
          };
      });
  };

  const handleSavePrescription = (p: Prescription) => setData(prev => !prev ? prev : ({ ...prev, prescriptions: [...prev.prescriptions.filter(x => x.id !== p.id), { ...p, id: p.id || generateSafeId() }] }));
  const handleDeletePrescription = (id: string) => setData(prev => !prev ? prev : ({ ...prev, prescriptions: prev.prescriptions.filter(x => x.id !== id) }));
  
  const handleSaveAppointment = (a: MedicalAppointment) => setData(prev => !prev ? prev : ({ ...prev, medicalAppointments: [...(prev.medicalAppointments || []).filter(x => x.id !== a.id), { ...a, id: a.id || generateSafeId() }] }));
  const handleDeleteAppointment = (id: string) => setData(prev => !prev ? prev : ({ ...prev, medicalAppointments: (prev.medicalAppointments || []).filter(x => x.id !== id) }));

  const handleSaveDemand = (d: Demand) => setData(prev => !prev ? prev : ({ ...prev, demands: [...(prev.demands || []).filter(x => x.id !== d.id), { ...d, id: d.id || generateSafeId() }] }));
  const handleDeleteDemand = (id: string) => setData(prev => !prev ? prev : ({ ...prev, demands: (prev.demands || []).filter(x => x.id !== id) }));

  const handleSaveEmployee = (e: Employee) => setData(prev => !prev ? prev : ({ ...prev, employees: [...(prev.employees || []).filter(x => x.id !== e.id), { ...e, id: e.id || generateSafeId() }] }));
  const handleDeleteEmployee = (id: string) => setData(prev => !prev ? prev : ({ ...prev, employees: (prev.employees || []).filter(x => x.id !== id) }));
  const handleSaveRoles = (roles: string[]) => setData(prev => !prev ? prev : ({ ...prev, employeeRoles: roles }));
  const handleSaveTimeSheet = (ts: TimeSheetEntry) => setData(prev => !prev ? prev : ({ ...prev, timeSheets: [...(prev.timeSheets || []), ts] }));
  const handleDeleteTimeSheet = (date: string, empId: string) => setData(prev => !prev ? prev : ({ ...prev, timeSheets: (prev.timeSheets || []).filter(t => !(t.date === date && t.employeeId === empId)) }));

  const handleSaveTechnicalSession = (s: TechnicalSession) => setData(prev => !prev ? prev : ({ ...prev, technicalSessions: [...(prev.technicalSessions || []).filter(x => x.id !== s.id), { ...s, id: s.id || generateSafeId() }] }));
  const handleDeleteTechnicalSession = (id: string) => setData(prev => !prev ? prev : ({ ...prev, technicalSessions: (prev.technicalSessions || []).filter(x => x.id !== id) }));

  const handleSaveEvolution = (recs: EvolutionRecord[]) => setData(prev => {
      if(!prev) return null;
      const current = [...(prev.evolutions || [])];
      recs.forEach(r => { current.push(r); });
      return { ...prev, evolutions: current };
  });
  const handleDeleteEvolution = (id: string) => setData(prev => !prev ? prev : ({ ...prev, evolutions: (prev.evolutions || []).filter(x => x.id !== id) }));

  const handleSaveProfessional = (p: Professional) => setData(prev => !prev ? prev : ({ ...prev, professionals: [...(prev.professionals || []).filter(x => x.id !== p.id), { ...p, id: p.id || generateSafeId() }] }));
  const handleDeleteProfessional = (id: string) => setData(prev => !prev ? prev : ({ ...prev, professionals: (prev.professionals || []).filter(x => x.id !== id) }));

  const handleSaveHouseDocument = (d: HouseDocument) => setData(prev => !prev ? prev : ({ ...prev, houseDocuments: [...(prev.houseDocuments || []).filter(x => x.id !== d.id), { ...d, id: d.id || generateSafeId() }] }));
  const handleDeleteHouseDocument = (id: string) => setData(prev => !prev ? prev : ({ ...prev, houseDocuments: (prev.houseDocuments || []).filter(x => x.id !== id) }));

  // --- RENDER ---

  if (loginLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
         <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium">Sincronizando dados...</p>
         </div>
      </div>
    );
  }

  // New Error State Screen
  if (loadError) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
              <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center border border-slate-200">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                      <WifiOff size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Erro de Conexão</h2>
                  <p className="text-slate-500 mb-6">Não foi possível carregar os dados da nuvem. Verifique sua internet e tente novamente.</p>
                  
                  <button onClick={() => window.location.reload()} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm mb-3">
                      Tentar Novamente
                  </button>
                  
                  <button onClick={handleLogout} className="w-full bg-slate-100 text-slate-600 py-3 rounded-lg font-bold hover:bg-slate-200 transition-colors">
                      Sair / Trocar Conta
                  </button>
              </div>
          </div>
      );
  }

  if (!isAuthenticated || !data) {
    return (
        <Login />
    );
  }

  return (
    <>
      <Layout currentView={view} onNavigate={setView} institutionName={institutionName} onLogout={handleLogout}>
        {view === 'dashboard' && <Dashboard data={data} onNavigate={setView} />}
        {view === 'residents' && <Residents data={data} onSave={handleSaveResident} onDelete={handleDeleteResident} onDeleteTransaction={handleDeleteTransaction} onUpdateTransaction={handleUpdateTransaction} onSaveDemand={handleSaveDemand}/>}
        {view === 'inventory' && <Inventory data={data} onSave={handleSaveProduct} onDelete={handleDeleteProduct} />}
        {view === 'operations' && <StockOperations data={data} onTransaction={handleTransaction} onDeleteTransaction={handleDeleteTransaction} onUpdateTransaction={handleUpdateTransaction} />}
        {view === 'medications' && <Medications data={data} onSave={handleSaveProduct} onDelete={handleDeleteProduct} onTransaction={handleTransaction} onSavePrescription={handleSavePrescription} onDeletePrescription={handleDeletePrescription} onDeleteTransaction={handleDeleteTransaction} onUpdateTransaction={handleUpdateTransaction}/>}
        {view === 'medical-care' && <MedicalCare data={data} onSave={handleSaveAppointment} onDelete={handleDeleteAppointment} />}
        {view === 'technical-care' && <TechnicalCare data={data} onSaveSession={handleSaveTechnicalSession} onDeleteSession={handleDeleteTechnicalSession} />}
        {view === 'demands' && <Demands data={data} onSave={handleSaveDemand} onDelete={handleDeleteDemand} onSaveProfessional={handleSaveProfessional} onDeleteProfessional={handleDeleteProfessional}/>}
        {view === 'personal-items' && <PersonalItems data={data} onTransaction={handleTransaction} />}
        {view === 'employees' && <Employees data={data} onSaveEmployee={handleSaveEmployee} onDeleteEmployee={handleDeleteEmployee} onSaveRoles={handleSaveRoles} onSaveTimeSheet={handleSaveTimeSheet} onDeleteTimeSheet={handleDeleteTimeSheet}/>}
        {view === 'evolutions' && <Evolutions data={data} onSaveEvolution={handleSaveEvolution} onDeleteEvolution={handleDeleteEvolution}/>}
        {view === 'reports' && <Reports data={data} onTransaction={handleTransaction} />}
        {view === 'admin-panel' && <AdminPanel data={data} onUpdateEmployee={handleSaveEmployee} onUpdateProfessional={handleSaveProfessional} onSaveHouseDocument={handleSaveHouseDocument} onDeleteHouseDocument={handleDeleteHouseDocument} onSaveDemand={handleSaveDemand} />}
        {view === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Configurações e Dados</h2>
                <button onClick={handleManualSync} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-100 flex items-center gap-1 font-bold">
                  <RefreshCw size={14} /> Forçar Sincronização
                </button>
            </div>
            
            {/* Cloud Sync Status */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg mb-4 text-slate-800">Conta e Sincronização</h3>
                <div className="flex items-center gap-3 bg-emerald-50 text-emerald-800 p-4 rounded-lg border border-emerald-100">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <div>
                      <p className="text-sm font-bold">Conectado como: {userEmail}</p>
                      <p className="text-xs">Sincronização em nuvem ativa. Seus dados estão acessíveis em qualquer dispositivo.</p>
                  </div>
                </div>
            </div>

            {/* Manual Backup & Restore */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg mb-4 text-slate-800">Backup e Restauração</h3>
                <p className="text-slate-600 mb-6 text-sm">Gerencie os dados da sua instituição.</p>
                
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => exportData(data, userEmail)}
                    className="bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 shadow-sm flex items-center justify-center gap-2"
                  >
                    <FileJson size={20} /> Baixar Backup Completo
                  </button>

                  <div className="relative border-t pt-4 mt-2">
                      <p className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                          <AlertTriangle size={16} className="text-amber-500"/> Área de Perigo: Restaurar Backup
                      </p>
                      <p className="text-xs text-slate-500 mb-3">Isso substituirá todos os dados atuais desta conta (na nuvem) pelo arquivo enviado.</p>
                      <label className="flex items-center justify-center gap-2 w-full bg-slate-100 text-slate-600 px-6 py-3 rounded-lg font-bold hover:bg-slate-200 cursor-pointer border-2 border-dashed border-slate-300 hover:border-slate-400 transition-all">
                          <Upload size={20} />
                          Selecionar Arquivo de Backup
                          <input 
                              type="file" 
                              accept=".json" 
                              className="hidden" 
                              onChange={(e) => e.target.files && handleRestore(e.target.files[0])}
                          />
                      </label>
                  </div>
                </div>
            </div>
          </div>
        )}
      </Layout>
      
      {/* Floating Sync Indicator */}
      <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg text-xs font-bold transition-all duration-300 ${syncState === 'SAVING' ? 'bg-blue-600 text-white translate-y-0 opacity-100' : (syncState === 'ERROR' ? 'bg-red-600 text-white translate-y-0 opacity-100' : 'bg-green-600 text-white translate-y-10 opacity-0')}`}>
         {syncState === 'SAVING' ? (
           <>
             <RefreshCw size={12} className="animate-spin" /> Salvando na Nuvem...
           </>
         ) : syncState === 'ERROR' ? (
           <>
             <WifiOff size={12} /> Erro ao Salvar
           </>
         ) : (
           <>
             <Check size={12} /> Salvo
           </>
         )}
      </div>
    </>
  );
};

export default App;
