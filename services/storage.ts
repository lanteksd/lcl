
import { AppData, Product, Resident, Transaction, Prescription, MedicalAppointment, Demand, Professional, Employee, TimeSheetEntry, TechnicalSession, EvolutionRecord, ResidentDocument, Pharmacy, StaffDocument, HouseDocument } from "../types";
import { INITIAL_DATA as CONST_INITIAL_DATA, INITIAL_EMPLOYEE_ROLES } from "../constants";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Extendendo INITIAL_DATA do constants para incluir o novo campo vazio
const INITIAL_DATA_EXTENDED = {
  ...CONST_INITIAL_DATA,
  houseDocuments: []
};

// Prefixo base para dados locais (Fallback)
const BASE_STORAGE_KEY = 'careflow_db_'; 

// --- SAFE ID GENERATOR ---
const generateSafeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback
    }
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// --- MIGRATION HELPERS (Mantidos para integridade) ---
const migrateDocument = (d: any): ResidentDocument => ({
  id: d.id || generateSafeId(),
  type: d.type || 'OUTRO',
  name: d.name || 'Documento',
  date: d.date || new Date().toISOString().split('T')[0],
  base64: d.base64 || '',
  linkUrl: d.linkUrl || '',
  issueDate: d.issueDate || ''
});

const migrateStaffDocument = (d: any): StaffDocument => ({
  id: d.id || generateSafeId(),
  type: d.type || 'OUTRO',
  name: d.name || 'Documento',
  linkUrl: d.linkUrl || '',
  date: d.date || new Date().toISOString().split('T')[0]
});

const migrateHouseDocument = (d: any): HouseDocument => ({
  id: d.id || generateSafeId(),
  type: d.type || 'OUTRO',
  name: d.name || 'Documento da Casa',
  linkUrl: d.linkUrl || '',
  expirationDate: d.expirationDate || '',
  issueDate: d.issueDate || ''
});

const migratePharmacy = (p: any): Pharmacy => ({
  id: p.id || generateSafeId(),
  name: p.name || 'Farmácia',
  phone: p.phone || ''
});

const migrateResident = (r: any): Resident => ({
  id: r.id || generateSafeId(),
  name: r.name || 'Nome Desconhecido',
  cpf: r.cpf || '',
  birthDate: r.birthDate || '',
  admissionDate: r.admissionDate || '',
  room: r.room || 'A definir',
  photo: r.photo || '',
  dailyExchangeEstimate: typeof r.dailyExchangeEstimate === 'number' ? r.dailyExchangeEstimate : 5,
  absorbentDailyExchangeEstimate: typeof r.absorbentDailyExchangeEstimate === 'number' ? r.absorbentDailyExchangeEstimate : 0,
  observations: r.observations || '',
  active: r.active !== undefined ? r.active : true,
  pharmacyPhone: r.pharmacyPhone || '', 
  pharmacies: Array.isArray(r.pharmacies) ? r.pharmacies.map(migratePharmacy) : [],
  responsible: {
    name: r.responsible?.name || '',
    relation: r.responsible?.relation || '',
    phone1: r.responsible?.phone1 || '',
    phone2: r.responsible?.phone2 || '',
    email: r.responsible?.email || ''
  },
  documents: Array.isArray(r.documents) ? r.documents.map(migrateDocument) : []
});

const migrateProduct = (p: any): Product => ({
  id: p.id || generateSafeId(),
  name: p.name || 'Produto Sem Nome',
  brand: p.brand || '',
  category: p.category || 'Outros',
  currentStock: typeof p.currentStock === 'number' ? p.currentStock : 0,
  minStock: typeof p.minStock === 'number' ? p.minStock : 5,
  unit: p.unit || 'Unidade'
});

const migratePrescription = (p: any): Prescription => ({
  id: p.id || generateSafeId(),
  residentId: p.residentId || '',
  productId: p.productId || '',
  productName: p.productName || 'Medicamento',
  dosage: p.dosage || '',
  frequency: p.frequency || '',
  times: p.times || '',
  pdfBase64: p.pdfBase64 || '',
  linkUrl: p.linkUrl || '', 
  active: p.active !== undefined ? p.active : true,
  isTreatment: p.isTreatment !== undefined ? p.isTreatment : false 
});

const migrateTransaction = (t: any): Transaction => ({
  id: t.id || generateSafeId(),
  date: t.date || new Date().toISOString().split('T')[0],
  type: t.type || 'OUT',
  productId: t.productId || '',
  productName: t.productName || 'Item Removido',
  residentId: t.residentId || '',
  residentName: t.residentName || '',
  quantity: typeof t.quantity === 'number' ? t.quantity : 1,
  notes: t.notes || ''
});

const migrateAppointment = (a: any): MedicalAppointment => ({
  id: a.id || generateSafeId(),
  residentId: a.residentId || '',
  type: a.type || 'CONSULTA',
  specialty: a.specialty || 'Clínico Geral',
  doctorName: a.doctorName || '',
  date: a.date || '',
  time: a.time || '',
  location: a.location || '',
  status: a.status || 'AGENDADO',
  notes: a.notes || '',
  diagnosis: a.diagnosis || '',
  accompanyingPerson: a.accompanyingPerson || '',
  outcomeNotes: a.outcomeNotes || '',
  attachmentBase64: a.attachmentBase64 || '',
  linkUrl: a.linkUrl || ''
});

const migrateDemand = (d: any): Demand => ({
    id: d.id || generateSafeId(),
    professionalAreas: d.professionalAreas || (d.professionalArea ? [d.professionalArea] : []),
    title: d.title || 'Demanda sem título',
    description: d.description || '',
    residentIds: Array.isArray(d.residentIds) ? d.residentIds : [],
    status: d.status || 'PENDENTE',
    creationDate: d.creationDate || new Date().toISOString().split('T')[0],
    dueDate: d.dueDate || ''
});

const migrateProfessional = (prof: any): Professional => ({
    id: prof.id || generateSafeId(),
    name: prof.name || 'Profissional Sem Nome',
    area: prof.area || 'ENFERMAGEM',
    phone: prof.phone || '',
    photo: prof.photo || '',
    documents: Array.isArray(prof.documents) ? prof.documents.map(migrateStaffDocument) : []
});

const migrateEmployee = (emp: any): Employee => ({
  id: emp.id || generateSafeId(),
  name: emp.name || 'Funcionário',
  role: emp.role || 'CUIDADOR(A)',
  phone: emp.phone || '',
  cpf: emp.cpf || '',
  admissionDate: emp.admissionDate || '',
  active: emp.active !== undefined ? emp.active : true,
  photo: emp.photo || '',
  documents: Array.isArray(emp.documents) ? emp.documents.map(migrateStaffDocument) : []
});

const migrateTimeSheet = (ts: any): TimeSheetEntry => ({
  id: ts.id || generateSafeId(),
  date: ts.date || new Date().toISOString().split('T')[0],
  employeeId: ts.employeeId || '',
  present: ts.present !== undefined ? ts.present : false,
  notes: ts.notes || ''
});

const migrateTechnicalSession = (ts: any): TechnicalSession => ({
  id: ts.id || generateSafeId(),
  residentId: ts.residentId || '',
  professionalId: ts.professionalId || '',
  professionalName: ts.professionalName || '',
  area: ts.area || 'PSICOLOGIA',
  date: ts.date || new Date().toISOString().split('T')[0],
  status: ts.status || 'CONCLUIDO',
  notes: ts.notes || ''
});

const migrateEvolution = (ev: any): EvolutionRecord => ({
  id: ev.id || generateSafeId(),
  residentId: ev.residentId || '',
  date: ev.date || new Date().toISOString().split('T')[0],
  type: ev.type || 'DIARIA',
  role: ev.role || 'TEC_ENFERMAGEM',
  filePdfBase64: ev.filePdfBase64 || undefined,
  fileName: ev.fileName || undefined,
  createdAt: ev.createdAt || new Date().toISOString()
});

// Helper para processar objeto cru (JSON) e transformar em AppData tipado
const processRawData = (parsed: any): AppData => {
    if (!parsed || typeof parsed !== 'object') return INITIAL_DATA_EXTENDED as AppData;

    return {
      residents: Array.isArray(parsed.residents) ? parsed.residents.map(migrateResident) : [],
      products: Array.isArray(parsed.products) ? parsed.products.map(migrateProduct) : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions.map(migrateTransaction) : [],
      prescriptions: Array.isArray(parsed.prescriptions) ? parsed.prescriptions.map(migratePrescription) : [],
      medicalAppointments: Array.isArray(parsed.medicalAppointments) ? parsed.medicalAppointments.map(migrateAppointment) : [],
      demands: Array.isArray(parsed.demands) ? parsed.demands.map(migrateDemand) : [],
      professionals: Array.isArray(parsed.professionals) ? parsed.professionals.map(migrateProfessional) : [],
      employees: Array.isArray(parsed.employees) ? parsed.employees.map(migrateEmployee) : [],
      employeeRoles: Array.isArray(parsed.employeeRoles) ? parsed.employeeRoles : INITIAL_EMPLOYEE_ROLES,
      timeSheets: Array.isArray(parsed.timeSheets) ? parsed.timeSheets.map(migrateTimeSheet) : [],
      technicalSessions: Array.isArray(parsed.technicalSessions) ? parsed.technicalSessions.map(migrateTechnicalSession) : [],
      evolutions: Array.isArray(parsed.evolutions) ? parsed.evolutions.map(migrateEvolution) : [],
      houseDocuments: Array.isArray(parsed.houseDocuments) ? parsed.houseDocuments.map(migrateHouseDocument) : [],
    };
};

// --- CARREGAMENTO DE DADOS (CLOUD FIRST) ---
export const loadRemoteData = async (userEmail: string): Promise<AppData> => {
  const safeEmail = userEmail.trim().toLowerCase();
  const localKey = `${BASE_STORAGE_KEY}${safeEmail}`;
  const docRef = doc(db, "institutions", safeEmail);

  try {
    // 1. Tentar buscar do Firestore (Nuvem)
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log(`Dados carregados da nuvem para ${safeEmail}`);
      const cloudData = docSnap.data();
      return processRawData(cloudData);
    } else {
      console.log("Nenhum dado na nuvem. Verificando dados locais para migração...");
      
      // 2. Fallback / Migração: Tentar buscar do LocalStorage
      const localStored = localStorage.getItem(localKey);
      
      if (localStored) {
        console.log("Dados locais encontrados. Migrando para nuvem...");
        const localData = JSON.parse(localStored);
        const processedLocal = processRawData(localData);
        
        // Salva na nuvem para a próxima vez
        await setDoc(docRef, processedLocal);
        return processedLocal;
      }
      
      // 3. Nova conta (Limpa)
      console.log("Conta totalmente nova. Inicializando.");
      return JSON.parse(JSON.stringify(INITIAL_DATA_EXTENDED));
    }

  } catch (e) {
    console.error("ERRO CRÍTICO AO CARREGAR DADOS:", e);
    // Em caso de ERRO (sem internet, erro de permissão), 
    // verificamos se há dados locais para trabalhar offline.
    const localStored = localStorage.getItem(localKey);
    if (localStored) {
       console.warn("Usando modo offline.");
       return processRawData(JSON.parse(localStored));
    }
    
    // Se não há dados locais e a rede falhou, NÃO retorne dados vazios 
    // para evitar sobrescrever a nuvem quando a conexão voltar.
    throw new Error("Falha de conexão e sem dados locais. Não é possível inicializar.");
  }
};

// --- SALVAMENTO DE DADOS (CLOUD) ---
export const saveRemoteData = async (data: AppData, userEmail: string) => {
  const safeEmail = userEmail.trim().toLowerCase();
  
  try {
    // 1. Salvar na Nuvem
    await setDoc(doc(db, "institutions", safeEmail), data);
    
    // 2. Backup Local (Opcional, para redundância e fallback offline)
    const key = `${BASE_STORAGE_KEY}${safeEmail}`;
    localStorage.setItem(key, JSON.stringify(data));
    console.log("Dados salvos na nuvem e localmente.");
    
  } catch (e: any) {
    console.error("Falha ao salvar na nuvem:", e);
    
    // Tenta salvar pelo menos localmente se a nuvem falhar
    try {
        const key = `${BASE_STORAGE_KEY}${safeEmail}`;
        localStorage.setItem(key, JSON.stringify(data));
        console.warn("Salvo apenas localmente (erro na nuvem).");
    } catch (localError) {
        console.error("Falha fatal de salvamento (Nuvem e Local falharam).");
    }
  }
};

export const exportData = (data: AppData, userEmail: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = userEmail.split('@')[0];
  a.download = `lifecare_backup_${safeName}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
