
import { DiaperSize, ProfessionalArea } from "./types";

export const DIAPER_SIZES: DiaperSize[] = ['P', 'M', 'G', 'EG', 'XXG'];

export const PRODUCT_CATEGORIES = [
  'Incontinência Urinária e Fecal',
  'Higiene Pessoal',
  'Cuidados com a Pele',
  'Medicamentos e Cuidados Clínicos',
  'Alimentação Especial',
  'Conforto e Mobilidade',
  'Cuidados Orais e Odontológicos',
  'Outros Itens de Rotina'
];

export const UNITS = [
  'Unidade',
  'Pacote',
  'Caixa',
  'Frasco',
  'Tubo',
  'Lata',
  'Par',
  'Litro',
  'Kit',
  'Rolo'
];

export const MEDICAL_SPECIALTIES = [
  'Clínico Geral',
  'Geriatra',
  'Cardiologista',
  'Neurologista',
  'Psiquiatra',
  'Dermatologista',
  'Ortopedista',
  'Urologista',
  'Oftalmologista',
  'Fisioterapeuta',
  'Nutricionista',
  'Fonoaudiólogo',
  'Dentista',
  'Outro'
];

export const PROFESSIONAL_AREAS: ProfessionalArea[] = [
  'PSICOLOGIA',
  'PEDAGOGIA',
  'ASSISTENTE_SOCIAL',
  'NUTRICIONISTA',
  'FISIOTERAPIA',
  'ENFERMAGEM'
];

export const INITIAL_EMPLOYEE_ROLES = [
  'CUIDADOR(A)',
  'COZINHEIRO(A)',
  'MANUTENÇÃO',
  'LIMPEZA',
  'TEC ENFERMAGEM',
  'ENFERMEIRA'
];

// Helper to generate IDs for meds
const createMed = (name: string) => ({
  id: `med_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
  name: name,
  category: 'Medicamentos e Cuidados Clínicos',
  currentStock: 0,
  minStock: 10,
  unit: 'Unidade' // Padronizado conforme solicitado
});

const NEW_MEDICATIONS = [
  'AAS 100mg', 'ACETILCISTEINA 600mg', 'ACIDO VALPROICO 250mg', 'ADDERA 5000UI', 'ADDERA D3 1000ui',
  'AKINETON (BIPERIDENO) 2mg', 'ALPRAZOLAM 1mg', 'AMANTADINA 100mg', 'AMISSULPRIDA 5mg', 'AMITRIPITILINA 25mg',
  'ANLODIPINO 10mg', 'ANLODIPINO 2,5mg', 'ANLODIPINO 5mg', 'APROSOLAN 2mg', 'ATENOLOL 25mg',
  'ATENOLOL 50mg', 'BISOPROLOL 1,25mg', 'BROMOPIDA 100mg', 'BUPROPIONA XL 150mg', 'CALCIODEX 625mg',
  'CANABIDIOL 23,5', 'CANABIDIOL 23,75mg', 'CAPTOPRIL 25mg', 'CARBAMAZEPINA 200mg', 'CARBAMAZEPINA 400mg',
  'CARBONATO DE LITIO 300mg', 'CARVEDILOL 3,125mg', 'CILOSTAZOL 50mg', 'CITALOPRAM 20mg', 'CLONAZEPAM 2,5mg',
  'CLONAZEPAM 2mg', 'CLOPIDOGREL 75mg', 'CLOREXIDINA 45ml', 'CLORPROMAZINA 25mg', 'CLORTALIDONA 25mg',
  'CLOZAPINA 100mg', 'COMBODART 0,4 mg', 'DEPAKENE 250mg', 'DIAZEPAM 10mg', 'DIVALPROATO DE SÓDIO ER 500mg',
  'DOMPERIDONA 10mg', 'DONEPEZILA 10mg', 'DONEPEZILA 5mg', 'DONILA 10mg', 'DOXAZOSINA + FINASTERIDA 5mg + 2mg',
  'ENALAPRIL 10mg', 'ESCITALOPRAM 20mg', 'ESPIRONOLACTONA 25mg', 'FENOBARBITAL 100mg', 'FERNEGAN 25mg',
  'FINASTERIDA 5mg', 'FLUNARIZINA 6mg', 'FLUOXETINA 20mg', 'FLUXON 25mg', 'FUROSEMIDA 40mg',
  'GARDENAL 100mg', 'GINKGO BILOBA 80mg', 'GLIBENCLAMIDA 5mg', 'GLICAZIDA 30mg', 'GLIFAGE 500mg',
  'GLIFAGE XR 500mg', 'HALDOL 5mg', 'HALOPERIDOL 5mg', 'HIDROCLOROTIAZIDA 25mg', 'INDAPAMIDA 1.5mg',
  'INSULINA 100ml', 'INSULINA HPN', 'KILLIDON 2mg', 'LACTULOSE 667mg', 'LEVOFLOXACINO 750mg',
  'LEVOMEPROMAZINE 25mg', 'LEVOTIROXINA 100mg', 'LEVOTIROXINA 25mg', 'LEVOZINE 100mg', 'LEVOZINE 25mg',
  'LORATADINA 10mg', 'LOSARTANA 50mg', 'LUBRIS COLIRIO', 'MEMANTINA 10mg', 'MEMANTINA 50mg',
  'MEMANTINA MANIPULADO 10mg', 'METFORMINA 500mg', 'METFORMINA 850mg', 'MIRTAZAPINA 15mg', 'MIRTAZAPINA 30mg',
  'NÃO FAZ USO DE MEDICAMENTOS', 'NEOZINE 100mg', 'NEOZINE 4%mg', 'NEULEPTIL 10mg', 'NIFEDIPINO 20mg',
  'OLANZAPINA 10mg', 'OLANZAPina 5mg', 'OMEPRAZOL 20mg', 'OMEPRAZOL 40mg', 'ORA PRO-NOBIS 500mg',
  'OXIBUTIAZIDA 25mg', 'PANTOPRAZOL 20mg', 'PANTOPRAZOL 40mg', 'PERMUT', 'PREGABALINA 75mg',
  'PROFERGAN 25mg', 'PROMETAZINA 25mg', 'PURAM 25mg', 'QUETIAPINA 100mg', 'QUETIAPINA 25mg',
  'QUETIAPina 50mg', 'RISPERIDONA 1mg', 'RISPERIDONA 2mg', 'RIVAROXABANA 20mg', 'RIVOTRIL 2mg',
  'SALICETIL 100mg', 'SERTRALINA 50mg', 'SINVASTATINA 20mg', 'SINVASTATINA 40mg', 'SOSSEG 260mg',
  'SULFATO FERROSO 300mg', 'SULFATO FERROSO 40mg', 'TIAMINA 300mg', 'TRAZADONA 100mg', 'TRAZADONA 50mg',
  'VENODOPA + BENSERAZIDA 100/25mg', 'VENOLOT - 15/90mg', 'VICOG 5mg', 'VITAMINA B1 300mg', 'VITAMINA B12 50mg',
  'VITAMINA B2 50mg', 'VITAMINA B6 50mg', 'ZOLPIDEM 10mg'
].map(createMed);

// Lista de residentes inicial vazia para novos usuários
const residentsList: any[] = [];

export const INITIAL_DATA = {
  residents: residentsList,
  prescriptions: [],
  medicalAppointments: [],
  demands: [],
  professionals: [],
  employees: [], // Novo
  employeeRoles: INITIAL_EMPLOYEE_ROLES, // Novo
  timeSheets: [], // Novo
  products: [
    // 1. Incontinência Urinária e Fecal
    { id: 'p1', name: 'Fralda Geriátrica P', category: 'Incontinência Urinária e Fecal', currentStock: 0, minStock: 20, unit: 'Pacote' },
    { id: 'p2', name: 'Fralda Geriátrica M', category: 'Incontinência Urinária e Fecal', currentStock: 0, minStock: 20, unit: 'Pacote' },
    { id: 'p3', name: 'Fralda Geriátrica G', category: 'Incontinência Urinária e Fecal', currentStock: 0, minStock: 20, unit: 'Pacote' },
    { id: 'p4', name: 'Fralda Geriátrica EG', category: 'Incontinência Urinária e Fecal', currentStock: 0, minStock: 20, unit: 'Pacote' },
    { id: 'p5', name: 'Fralda Geriátrica XXG', category: 'Incontinência Urinária e Fecal', currentStock: 0, minStock: 20, unit: 'Pacote' },
    { id: 'p6', name: 'Fralda Tipo Pants (Puxa)', category: 'Incontinência Urinária e Fecal', currentStock: 0, minStock: 10, unit: 'Pacote' },
    { id: 'p7', name: 'Absorvente Geriátrico Moderado', category: 'Incontinência Urinária e Fecal', currentStock: 0, minStock: 15, unit: 'Pacote' },
    { id: 'p8', name: 'Absorvente Geriátrico Intenso', category: 'Incontinência Urinária e Fecal', currentStock: 0, minStock: 15, unit: 'Pacote' },
    { id: 'p9', name: 'Absorvente Geriátrico Noturno', category: 'Incontinência Urinária e Fecal', currentStock: 0, minStock: 15, unit: 'Pacote' },
    { id: 'p10', name: 'Coletor Urinário Masc. (Pato)', category: 'Incontinência Urinária e Fecal', currentStock: 0, minStock: 2, unit: 'Unidade' },
    { id: 'p11', name: 'Bolsa Coletora', category: 'Incontinência Urinária e Fecal', currentStock: 0, minStock: 5, unit: 'Unidade' },
    { id: 'p12', name: 'Protetor de Cama Descartável', category: 'Incontinência Urinária e Fecal', currentStock: 0, minStock: 10, unit: 'Pacote' },
    { id: 'p13', name: 'Protetor de Colchão Reutilizável', category: 'Incontinência Urinária e Fecal', currentStock: 0, minStock: 5, unit: 'Unidade' },

    // 2. Higiene Pessoal
    { id: 'p20', name: 'Lenço Umedecido c/ Aloe Vera', category: 'Higiene Pessoal', currentStock: 0, minStock: 20, unit: 'Pacote' },
    { id: 'p21', name: 'Lenço Umedecido s/ Aloe Vera', category: 'Higiene Pessoal', currentStock: 0, minStock: 20, unit: 'Pacote' },
    { id: 'p22', name: 'Sabonete Líquido Neutro', category: 'Higiene Pessoal', currentStock: 0, minStock: 5, unit: 'Frasco' },
    { id: 'p23', name: 'Sabonete Líquido Geriátrico', category: 'Higiene Pessoal', currentStock: 0, minStock: 5, unit: 'Frasco' },
    { id: 'p24', name: 'Shampoo sem Enxágue', category: 'Higiene Pessoal', currentStock: 0, minStock: 3, unit: 'Frasco' },
    { id: 'p25', name: 'Creme Barreira (Óxido de Zinco)', category: 'Higiene Pessoal', currentStock: 0, minStock: 5, unit: 'Tubo' },
    { id: 'p26', name: 'Pomada para Assadura', category: 'Higiene Pessoal', currentStock: 0, minStock: 5, unit: 'Tubo' },
    { id: 'p27', name: 'Talco Líquido', category: 'Higiene Pessoal', currentStock: 0, minStock: 2, unit: 'Frasco' },
    { id: 'p28', name: 'Talco em Pó', category: 'Higiene Pessoal', currentStock: 0, minStock: 2, unit: 'Frasco' },
    { id: 'p29', name: 'Pasta de Dentes para Prótese', category: 'Higiene Pessoal', currentStock: 0, minStock: 3, unit: 'Tubo' },
    { id: 'p30', name: 'Escova de Dentes Elétrica', category: 'Higiene Pessoal', currentStock: 0, minStock: 1, unit: 'Unidade' },
    { id: 'p31', name: 'Escova de Dentes Adaptada', category: 'Higiene Pessoal', currentStock: 0, minStock: 2, unit: 'Unidade' },
    { id: 'p32', name: 'Fio Dental com Cabo', category: 'Higiene Pessoal', currentStock: 0, minStock: 5, unit: 'Caixa' },

    // 3. Cuidados com a Pele
    { id: 'p40', name: 'Hidratante Corporal (Ureia)', category: 'Cuidados com a Pele', currentStock: 0, minStock: 5, unit: 'Frasco' },
    { id: 'p41', name: 'Hidratante Corporal (Ceramidas)', category: 'Cuidados com a Pele', currentStock: 0, minStock: 5, unit: 'Frasco' },
    { id: 'p42', name: 'Hidratante Óleo de Amêndoas', category: 'Cuidados com a Pele', currentStock: 0, minStock: 5, unit: 'Frasco' },
    { id: 'p43', name: 'Loção de Limpeza sem Enxágue', category: 'Cuidados com a Pele', currentStock: 0, minStock: 3, unit: 'Frasco' },
    { id: 'p44', name: 'Óleo de Girassol / AGE', category: 'Cuidados com a Pele', currentStock: 0, minStock: 5, unit: 'Frasco' },
    { id: 'p45', name: 'Antisséptico (Clorexidina)', category: 'Cuidados com a Pele', currentStock: 0, minStock: 3, unit: 'Frasco' },
    { id: 'p46', name: 'Antisséptico (PVPI Tópico)', category: 'Cuidados com a Pele', currentStock: 0, minStock: 3, unit: 'Frasco' },

    // 4. Medicamentos e Cuidados Clínicos
    { id: 'p50', name: 'Seringas Descartáveis', category: 'Medicamentos e Cuidados Clínicos', currentStock: 0, minStock: 50, unit: 'Unidade' },
    { id: 'p51', name: 'Agulhas Descartáveis', category: 'Medicamentos e Cuidados Clínicos', currentStock: 0, minStock: 50, unit: 'Unidade' },
    { id: 'p52', name: 'Equipos', category: 'Medicamentos e Cuidados Clínicos', currentStock: 0, minStock: 10, unit: 'Unidade' },
    { id: 'p53', name: 'Gaze', category: 'Medicamentos e Cuidados Clínicos', currentStock: 0, minStock: 20, unit: 'Pacote' },
    { id: 'p54', name: 'Esparadrapo', category: 'Medicamentos e Cuidados Clínicos', currentStock: 0, minStock: 5, unit: 'Rolo' },
    { id: 'p55', name: 'Micropore', category: 'Medicamentos e Cuidados Clínicos', currentStock: 0, minStock: 5, unit: 'Rolo' },
    { id: 'p56', name: 'Algodão', category: 'Medicamentos e Cuidados Clínicos', currentStock: 0, minStock: 5, unit: 'Pacote' },
    { id: 'p57', name: 'Álcool 70%', category: 'Medicamentos e Cuidados Clínicos', currentStock: 0, minStock: 5, unit: 'Frasco' },
    { id: 'p58', name: 'Luvas de Procedimento c/ Pó', category: 'Medicamentos e Cuidados Clínicos', currentStock: 0, minStock: 10, unit: 'Caixa' },
    { id: 'p59', name: 'Luvas de Procedimento s/ Pó', category: 'Medicamentos e Cuidados Clínicos', currentStock: 0, minStock: 10, unit: 'Caixa' },
    { id: 'p60', name: 'Máscaras Descartáveis', category: 'Medicamentos e Cuidados Clínicos', currentStock: 0, minStock: 5, unit: 'Caixa' },
    { id: 'p61', name: 'Termômetro Digital', category: 'Medicamentos e Cuidados Clínicos', currentStock: 0, minStock: 2, unit: 'Unidade' },
    // NEW MEDS
    ...NEW_MEDICATIONS,

    // 5. Alimentação Especial
    { id: 'p70', name: 'Espessante para Líquidos', category: 'Alimentação Especial', currentStock: 0, minStock: 3, unit: 'Lata' },
    { id: 'p71', name: 'Suplemento (Ensure/Similar)', category: 'Alimentação Especial', currentStock: 0, minStock: 5, unit: 'Lata' },
    { id: 'p72', name: 'Suplemento (Nutren/Similar)', category: 'Alimentação Especial', currentStock: 0, minStock: 5, unit: 'Lata' },
    { id: 'p73', name: 'Papinha Industrializada', category: 'Alimentação Especial', currentStock: 0, minStock: 5, unit: 'Frasco' },
    { id: 'p74', name: 'Soro Fisiológico', category: 'Alimentação Especial', currentStock: 0, minStock: 5, unit: 'Frasco' },

    // 6. Conforto e Mobilidade
    { id: 'p80', name: 'Travesseiro Antirrefluxo', category: 'Conforto e Mobilidade', currentStock: 0, minStock: 2, unit: 'Unidade' },
    { id: 'p81', name: 'Almofada Anti-escaras (Gel)', category: 'Conforto e Mobilidade', currentStock: 0, minStock: 2, unit: 'Unidade' },
    { id: 'p82', name: 'Almofada Anti-escaras (Ovo)', category: 'Conforto e Mobilidade', currentStock: 0, minStock: 2, unit: 'Unidade' },
    { id: 'p83', name: 'Lençol Hospitalar Descartável', category: 'Conforto e Mobilidade', currentStock: 0, minStock: 5, unit: 'Rolo' },
    { id: 'p84', name: 'Toalha Geriátrica', category: 'Conforto e Mobilidade', currentStock: 0, minStock: 10, unit: 'Unidade' },
    { id: 'p85', name: 'Roupa Descartável (Camiseta)', category: 'Conforto e Mobilidade', currentStock: 0, minStock: 10, unit: 'Unidade' },
    { id: 'p86', name: 'Roupa Descartável (Short)', category: 'Conforto e Mobilidade', currentStock: 0, minStock: 10, unit: 'Unidade' },

    // 7. Cuidados Orais e Odontológicos
    { id: 'p90', name: 'Gel Umidificante Bucal', category: 'Cuidados Orais e Odontológicos', currentStock: 0, minStock: 2, unit: 'Tubo' },
    { id: 'p91', name: 'Solução Limpeza Prótese', category: 'Cuidados Orais e Odontológicos', currentStock: 0, minStock: 2, unit: 'Frasco' },
    { id: 'p92', name: 'Escova Interdental', category: 'Cuidados Orais e Odontológicos', currentStock: 0, minStock: 5, unit: 'Pacote' },

    // 8. Outros Itens de Rotina
    { id: 'p100', name: 'Fita Métrica', category: 'Outros Itens de Rotina', currentStock: 0, minStock: 1, unit: 'Unidade' },
    { id: 'p101', name: 'Saco para Descarte de Fraldas', category: 'Outros Itens de Rotina', currentStock: 0, minStock: 5, unit: 'Rolo' },
    { id: 'p102', name: 'Avental Descartável', category: 'Outros Itens de Rotina', currentStock: 0, minStock: 20, unit: 'Pacote' },
    { id: 'p103', name: 'Sacos Coleta Roupa Suja', category: 'Outros Itens de Rotina', currentStock: 0, minStock: 5, unit: 'Pacote' },
  ],
  transactions: []
};
