
export type DiaperSize = 'P' | 'M' | 'G' | 'EG' | 'XXG';

export interface Responsible {
  name: string;
  relation: string;
  phone1: string;
  phone2?: string;
  email?: string;
}

export interface ResidentDocument {
  id: string;
  type: 'LAUDO' | 'VACINA' | 'RECEITA' | 'RG' | 'COMPROVANTE' | 'PIA' | 'PAISI' | 'RELATORIO_PSICOSSOCIAL' | 'OUTRO';
  name: string;
  date: string;
  base64?: string; // Mantido para legado, mas opcional agora
  linkUrl?: string; // Novo campo principal
  issueDate?: string; // Novo: Data de emissão do documento (para cálculo de validade)
}

export interface StaffDocument {
  id: string;
  type: 'RG' | 'CPF' | 'COMPROVANTE' | 'COREN' | 'CONTRATO' | 'OUTRO' | 'RG_CNH' | 'CTPS' | 'COMPROVANTE_RESIDENCIA' | 'TITULO_ELEITOR' | 'RESERVISTA' | 'CERTIDAO_NASC_CASAMENTO' | 'ESCOLARIDADE' | 'PIS' | 'ASO' | 'CERTIDAO_FILHOS' | 'VACINA_FILHOS' | 'ESCOLA_FILHOS';
  name: string; // Ex: "Link do RG"
  linkUrl: string;
  date: string;
}

// --- NOVO TIPO PARA DOCUMENTOS DA CASA ---
export interface HouseDocument {
  id: string;
  type: 'ALVARA_SANITARIO' | 'ALVARA_FUNCIONAMENTO' | 'AVCB' | 'CMI' | 'CNES' | 'REGIMENTO' | 'ESTATUTO' | 'PLANO_TRABALHO' | 'CONTRATO_PRESTACAO' | 'MANUAL_BOAS_PRATICAS' | 'PGRSS' | 'CERTIFICADOS_TREINAMENTO' | 'RELACAO_FUNCIONARIOS' | 'DEDETIZACAO' | 'LIMPEZA_CAIXA' | 'LIXO' | 'CNPJ' | 'OUTRO';
  name: string;
  linkUrl: string;
  expirationDate?: string; // Data de validade/vencimento
  issueDate?: string; // Data de emissão
}

export interface Pharmacy {
  id: string;
  name: string;
  phone: string;
}

export interface Resident {
  id: string;
  name: string;
  cpf?: string;
  birthDate: string; // ISO YYYY-MM-DD
  admissionDate?: string; // ISO YYYY-MM-DD
  room: string;
  photo?: string; // Base64 string
  dailyExchangeEstimate: number; // Para Fraldas
  absorbentDailyExchangeEstimate?: number; // Novo: Para Absorventes
  observations?: string;
  responsible: Responsible;
  pharmacyPhone?: string; // Legacy: Telefone principal
  pharmacies?: Pharmacy[]; // Novo: Lista de farmácias
  documents?: ResidentDocument[];
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  category: string;
  currentStock: number;
  minStock: number;
  unit: string;
}

export interface Prescription {
  id: string;
  residentId: string;
  productId: string;
  productName: string; // Denormalized for display
  dosage: string; // e.g. "1 comprimido", "5ml"
  frequency: string; // e.g. "8 em 8 horas", "Após almoço"
  times?: string; // e.g. "08:00, 16:00, 00:00"
  pdfBase64?: string; // Legacy: Base64 string of the PDF
  linkUrl?: string; // New: External link to file
  active: boolean;
  isTreatment?: boolean; // Novo: Se true, desativa a prescrição quando o estoque zerar
}

export interface MedicalAppointment {
  id: string;
  residentId: string;
  type: 'CONSULTA' | 'EXAME' | 'RETORNO' | 'URGENCIA'; // Adicionado URGENCIA
  specialty: string; // Cardiologista, Geriatra, etc.
  doctorName?: string;
  date: string;
  time: string;
  location?: string;
  status: 'AGENDADO' | 'CONCLUIDO' | 'CANCELADO';
  notes?: string;
  // Novos Campos
  accompanyingPerson?: string; // Quem acompanhou (Cuidadora X)
  diagnosis?: string; // CID ou nome da doença/motivo
  outcomeNotes?: string; // Instruções de retorno/cuidados
  attachmentBase64?: string; // Legacy: Foto da receita/laudo
  linkUrl?: string; // New: External link to file
}

export type TransactionType = 'IN' | 'OUT';

export interface Transaction {
  id: string;
  date: string; // ISO Date string
  type: TransactionType;
  productId: string;
  productName: string; // Denormalized for easier history
  residentId?: string; // Required if OUT
  residentName?: string; // Denormalized
  quantity: number;
  notes?: string; // Supplier/Invoice for IN, or notes for OUT
}

export const PROFESSIONAL_AREAS = [
  'PSICOLOGIA',
  'PEDAGOGIA',
  'ASSISTENTE_SOCIAL',
  'NUTRICIONISTA',
  'FISIOTERAPIA',
  'ENFERMAGEM'
] as const;

export type ProfessionalArea = typeof PROFESSIONAL_AREAS[number];

export interface Professional {
  id: string;
  name: string;
  area: ProfessionalArea;
  phone: string;
  photo?: string; // Novo: Foto do profissional
  documents?: StaffDocument[]; // Novo: Documentos do profissional externo
}

export interface Demand {
  id: string;
  professionalAreas: ProfessionalArea[];
  title: string;
  description: string;
  residentIds: string[];
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA';
  creationDate: string; // ISO Date
  dueDate?: string; // ISO Date
}

// --- NOVOS TIPOS PARA FUNCIONÁRIOS ---

export interface Employee {
  id: string;
  name: string;
  role: string;
  phone?: string;
  cpf?: string;
  admissionDate?: string;
  active: boolean;
  photo?: string;
  documents?: StaffDocument[]; // Novo: Documentos do funcionário
}

export interface TimeSheetEntry {
  id: string;
  date: string; // ISO YYYY-MM-DD
  employeeId: string;
  present: boolean;
  notes?: string;
}

// --- NOVO TIPO PARA ATENDIMENTO TÉCNICO ---
export interface TechnicalSession {
  id: string;
  residentId: string;
  professionalId: string;
  professionalName: string; // Denormalized
  area: ProfessionalArea;
  date: string; // ISO YYYY-MM-DD
  status: 'AGENDADO' | 'CONCLUIDO' | 'CANCELADO';
  notes?: string;
}

// --- NOVO TIPO PARA EVOLUÇÕES ---
export type EvolutionRole = 'TEC_ENFERMAGEM' | 'ENFERMEIRA' | ProfessionalArea;

export interface EvolutionRecord {
  id: string;
  residentId: string;
  date: string; // ISO YYYY-MM-DD
  type: 'DIARIA' | 'MENSAL';
  role: EvolutionRole; 
  filePdfBase64?: string; // Opcional: Se veio de um upload
  fileName?: string;
  createdAt: string;
}

export interface AppData {
  residents: Resident[];
  products: Product[];
  transactions: Transaction[];
  prescriptions: Prescription[];
  medicalAppointments?: MedicalAppointment[];
  demands?: Demand[];
  professionals?: Professional[];
  employees?: Employee[];
  employeeRoles?: string[];
  timeSheets?: TimeSheetEntry[];
  technicalSessions?: TechnicalSession[];
  evolutions?: EvolutionRecord[]; // Novo campo
  houseDocuments?: HouseDocument[]; // Novo campo para gestão da casa
}

export type ViewName = 'dashboard' | 'residents' | 'medications' | 'medical-care' | 'technical-care' | 'demands' | 'inventory' | 'operations' | 'personal-items' | 'reports' | 'settings' | 'employees' | 'evolutions' | 'admin-panel';