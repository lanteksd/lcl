
import React, { useState, useMemo } from 'react';
import { AppData, Employee, Professional, StaffDocument, HouseDocument, Demand, ProfessionalArea } from '../types';
import { PROFESSIONAL_AREAS } from '../constants';
import { Shield, Search, User, FileText, Plus, Link, Trash2, ExternalLink, Briefcase, Contact, X, Check, ClipboardCheck, AlertCircle, AlertTriangle, Users, Home, Settings, Printer, Activity, CheckSquare, ListTodo, Pill, Baby, Send, Circle, UserCheck, FileWarning } from 'lucide-react';

interface AdminPanelProps {
  data: AppData;
  onUpdateEmployee: (employee: Employee) => void;
  onUpdateProfessional: (professional: Professional) => void;
  onSaveHouseDocument: (doc: HouseDocument) => void;
  onDeleteHouseDocument: (id: string) => void;
  onSaveDemand: (demand: Demand) => void; // New prop for updating demand status
}

// Unified interface for display
interface UnifiedStaffMember {
  id: string;
  name: string;
  roleOrArea: string;
  type: 'INTERNAL' | 'EXTERNAL';
  originalRef: Employee | Professional;
  documents: StaffDocument[];
  photo?: string;
  active?: boolean;
}

const DOCUMENT_TYPES = [
  { value: 'RG_CNH', label: 'RG ou CNH' },
  { value: 'CPF', label: 'CPF' },
  { value: 'CTPS', label: 'Carteira de Trabalho (CTPS – digital)' },
  { value: 'COMPROVANTE_RESIDENCIA', label: 'Comprovante de residência atualizado' },
  { value: 'TITULO_ELEITOR', label: 'Título de eleitor' },
  { value: 'RESERVISTA', label: 'Certificado de reservista (se aplicável)' },
  { value: 'CERTIDAO_NASC_CASAMENTO', label: 'Certidão de nascimento ou casamento' },
  { value: 'ESCOLARIDADE', label: 'Comprovante de escolaridade' },
  { value: 'PIS', label: 'Número do PIS' },
  { value: 'ASO', label: 'ASO – Exame Admissional (Apto)' },
  { value: 'CERTIDAO_FILHOS', label: 'Certidão de nascimento dos filhos (se houver)' },
  { value: 'VACINA_FILHOS', label: 'Carteira de vacinação dos filhos menores de 7 anos (se houver)' },
  { value: 'ESCOLA_FILHOS', label: 'Comprovante de frequência escolar dos filhos entre 7 e 14 anos (se houver)' },
  { value: 'COREN', label: 'Carteira do COREN' },
  { value: 'CONTRATO', label: 'Contrato de Trabalho' },
  { value: 'OUTRO', label: 'Outros Documentos' },
];

const HOUSE_DOC_TYPES = [
  { value: 'ALVARA_SANITARIO', label: 'Alvará Sanitário (Vigilância)' },
  { value: 'ALVARA_FUNCIONAMENTO', label: 'Alvará de Funcionamento (Prefeitura)' },
  { value: 'AVCB', label: 'AVCB / CLCB (Bombeiros)' },
  { value: 'CMI', label: 'Inscrição Cons. Municipal do Idoso (CMI)' },
  { value: 'CNES', label: 'Cadastro Nac. Estab. Saúde (CNES)' },
  { value: 'CNPJ', label: 'Cartão CNPJ' },
  { value: 'REGIMENTO', label: 'Regimento Interno' },
  { value: 'ESTATUTO', label: 'Estatuto Social / Contrato Social' },
  { value: 'PLANO_TRABALHO', label: 'Plano de Trabalho' },
  { value: 'CONTRATO_PRESTACAO', label: 'Modelo Contrato Prestação Serviços' },
  { value: 'MANUAL_BOAS_PRATICAS', label: 'Manual de Boas Práticas e POPs' },
  { value: 'PGRSS', label: 'Plano Gerenc. Resíduos (PGRSS)' },
  { value: 'CERTIFICADOS_TREINAMENTO', label: 'Certificados de Treinamento Equipe' },
  { value: 'RELACAO_FUNCIONARIOS', label: 'Relação Nominal de Funcionários' },
  { value: 'DEDETIZACAO', label: 'Certificado de Dedetização' },
  { value: 'LIMPEZA_CAIXA', label: 'Limpeza Caixa d\'Água' },
  { value: 'LIXO', label: 'Contrato Coleta de Lixo' },
  { value: 'OUTRO', label: 'Outros Documentos' }
];

const ADMISSION_CHECKLIST = [
  { key: 'RG_CNH', label: 'RG ou CNH', conditional: false },
  { key: 'CPF', label: 'CPF', conditional: false },
  { key: 'CTPS', label: 'Carteira de Trabalho (Digital)', conditional: false },
  { key: 'COMPROVANTE_RESIDENCIA', label: 'Comprovante de Residência', conditional: false },
  { key: 'TITULO_ELEITOR', label: 'Título de Eleitor', conditional: false },
  { key: 'RESERVISTA', label: 'Certificado de Reservista', conditional: true },
  { key: 'CERTIDAO_NASC_CASAMENTO', label: 'Certidão Nasc./Casamento', conditional: false },
  { key: 'ESCOLARIDADE', label: 'Comprovante de Escolaridade', conditional: false },
  { key: 'PIS', label: 'Número do PIS', conditional: false },
  { key: 'ASO', label: 'ASO (Admissional)', conditional: false },
  { key: 'CERTIDAO_FILHOS', label: 'Certidão Nasc. Filhos', conditional: true },
  { key: 'VACINA_FILHOS', label: 'Vacinação Filhos (< 7 anos)', conditional: true },
  { key: 'ESCOLA_FILHOS', label: 'Escola Filhos (7 a 14 anos)', conditional: true },
];

const getAreaHeaderStyle = (area: ProfessionalArea) => {
    const styles: Record<ProfessionalArea, string> = {
        'PSICOLOGIA': 'bg-pink-50 text-pink-700 border-pink-200',
        'PEDAGOGIA': 'bg-indigo-50 text-indigo-700 border-indigo-200',
        'ASSISTENTE_SOCIAL': 'bg-cyan-50 text-cyan-700 border-cyan-200',
        'NUTRICIONISTA': 'bg-green-50 text-green-700 border-green-200',
        'FISIOTERAPIA': 'bg-blue-50 text-blue-700 border-blue-200',
        'ENFERMAGEM': 'bg-red-50 text-red-700 border-red-200',
    };
    return styles[area] || 'bg-slate-50 text-slate-700 border-slate-200';
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ data, onUpdateEmployee, onUpdateProfessional, onSaveHouseDocument, onDeleteHouseDocument, onSaveDemand }) => {
  const [activeTab, setActiveTab] = useState<'TEAM' | 'HOUSE' | 'ADMIN'>('TEAM');
  
  // Team Logic State
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INTERNAL' | 'EXTERNAL'>('ALL');
  
  // House Logic State
  const [houseDocSearch, setHouseDocSearch] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false); 
  const [isHouseModalOpen, setIsHouseModalOpen] = useState(false);
  
  // Forms State
  const [newDocType, setNewDocType] = useState<string>('RG_CNH'); 
  const [newDocLink, setNewDocLink] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [newHouseDocDate, setNewHouseDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [newHouseDocExpiration, setNewHouseDocExpiration] = useState('');

  // Combine lists for Team
  const unifiedList: UnifiedStaffMember[] = useMemo(() => {
    const list: UnifiedStaffMember[] = [];
    (data.employees || []).forEach(emp => {
      list.push({
        id: emp.id,
        name: emp.name,
        roleOrArea: emp.role,
        type: 'INTERNAL',
        originalRef: emp,
        documents: emp.documents || [],
        photo: emp.photo,
        active: emp.active
      });
    });
    (data.professionals || []).forEach(prof => {
      list.push({
        id: prof.id,
        name: prof.name,
        roleOrArea: prof.area.replace('_', ' '),
        type: 'EXTERNAL',
        originalRef: prof,
        documents: prof.documents || [],
        photo: prof.photo
      });
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [data.employees, data.professionals]);

  const filteredList = useMemo(() => {
    return unifiedList.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || member.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [unifiedList, searchTerm, filterType]);

  const selectedMember = useMemo(() => 
    unifiedList.find(m => m.id === selectedStaffId), 
  [unifiedList, selectedStaffId]);

  // --- Handlers ---

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !newDocLink) return;

    const newDoc: StaffDocument = {
      id: crypto.randomUUID(),
      type: newDocType as any,
      name: newDocName || DOCUMENT_TYPES.find(t => t.value === newDocType)?.label || 'Documento',
      linkUrl: newDocLink,
      date: new Date().toISOString().split('T')[0]
    };

    if (selectedMember.type === 'INTERNAL') {
      const updatedEmp = { 
        ...(selectedMember.originalRef as Employee), 
        documents: [...(selectedMember.documents), newDoc] 
      };
      onUpdateEmployee(updatedEmp);
    } else {
      const updatedProf = { 
        ...(selectedMember.originalRef as Professional), 
        documents: [...(selectedMember.documents), newDoc] 
      };
      onUpdateProfessional(updatedProf);
    }

    setIsModalOpen(false);
    setNewDocLink('');
    setNewDocName('');
    setNewDocType('RG_CNH');
  };

  const handleDeleteDocument = (docId: string) => {
    if (!selectedMember || !confirm("Remover este documento?")) return;
    const updatedDocs = selectedMember.documents.filter(d => d.id !== docId);
    if (selectedMember.type === 'INTERNAL') {
      const updatedEmp = { ...(selectedMember.originalRef as Employee), documents: updatedDocs };
      onUpdateEmployee(updatedEmp);
    } else {
      const updatedProf = { ...(selectedMember.originalRef as Professional), documents: updatedDocs };
      onUpdateProfessional(updatedProf);
    }
  };

  const handleSaveHouseDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocLink) return;
    const doc: HouseDocument = {
      id: crypto.randomUUID(),
      type: newDocType as any,
      name: newDocName || HOUSE_DOC_TYPES.find(t => t.value === newDocType)?.label || 'Documento',
      linkUrl: newDocLink,
      issueDate: newHouseDocDate,
      expirationDate: newHouseDocExpiration
    };
    onSaveHouseDocument(doc);
    setIsHouseModalOpen(false);
    setNewDocLink('');
    setNewDocName('');
    setNewDocType('ALVARA_SANITARIO');
    setNewHouseDocExpiration('');
  };

  const handlePrintVitalSigns = () => {
    const activeResidents = data.residents.filter(r => r.active).sort((a, b) => a.name.localeCompare(b.name));
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Permita pop-ups para imprimir.");

    const rowsHtml = activeResidents.map((r, index) => `
        <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="text-align: left; padding-left: 8px;">${r.name}</td>
            <td></td><td></td><td></td><td></td><td></td><td></td>
        </tr>
    `).join('');

    const html = `
      <html>
        <head>
            <title>Controle de Sinais Vitais - Lista Única</title>
            <style>
                @page { size: A4; margin: 10mm; }
                body { font-family: 'Helvetica', Arial, sans-serif; -webkit-print-color-adjust: exact; padding: 0; margin: 0; }
                .header-title { text-align: center; margin-bottom: 10px; font-size: 16px; font-weight: bold; text-transform: uppercase; border: 2px solid black; padding: 8px; background-color: #f0f0f0; }
                .meta { margin-bottom: 15px; font-size: 11px; display: flex; justify-content: space-between; font-weight: bold; border: 1px solid #ccc; padding: 8px; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th, td { border: 1px solid black; height: 24px; padding: 0 4px; vertical-align: middle; }
                th { background-color: #fbceb1; font-weight: bold; text-align: center; text-transform: uppercase; font-size: 10px; }
                .col-num { width: 30px; } .col-name { width: auto; } .col-data { width: 50px; text-align: center; } .col-obs { width: 150px; text-align: center; }
                tr:nth-child(even) { background-color: #fafafa; }
            </style>
        </head>
        <body>
            <div class="header-title">Controle Diário de Sinais Vitais</div>
            <div class="meta"><span>DATA: ____/____/________</span><span>TURNO: ( ) MANHÃ &nbsp; ( ) TARDE &nbsp; ( ) NOITE</span><span>RESP: _____________________________</span></div>
            <table><thead><tr><th class="col-num">Nº</th><th class="col-name">NOME COMPLETO</th><th class="col-data">PA</th><th class="col-data">PULSO</th><th class="col-data">TEMP</th><th class="col-data">SAT</th><th class="col-data">HGT</th><th class="col-obs">OBSERVAÇÕES</th></tr></thead><tbody>${rowsHtml}</tbody></table>
            <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintLaudoReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Permita pop-ups para imprimir.");

    const today = new Date();
    const activeResidents = data.residents.filter(r => r.active).sort((a, b) => a.name.localeCompare(b.name));

    // Processamento de dados
    const criticalList: any[] = [];
    const validList: any[] = [];

    activeResidents.forEach(res => {
        const laudo = res.documents?.find(d => d.type === 'LAUDO');
        
        if (!laudo) {
            criticalList.push({
                name: res.name,
                room: res.room,
                status: 'SEM LAUDO',
                daysLeft: -999,
                date: null
            });
        } else {
            // Usa issueDate se disponível, senão usa date (data de upload) como fallback
            const baseDateStr = laudo.issueDate || laudo.date;
            const issueDate = new Date(baseDateStr);
            const expirationDate = new Date(issueDate);
            expirationDate.setDate(expirationDate.getDate() + 180); // 180 dias de validade

            // Zerar horas para cálculo correto de dias
            const todayZero = new Date(today);
            todayZero.setHours(0,0,0,0);
            const expZero = new Date(expirationDate);
            expZero.setHours(0,0,0,0);

            const diffTime = expZero.getTime() - todayZero.getTime();
            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (daysLeft < 0) {
                criticalList.push({
                    name: res.name,
                    room: res.room,
                    status: 'VENCIDO',
                    daysLeft: daysLeft,
                    date: baseDateStr
                });
            } else {
                validList.push({
                    name: res.name,
                    room: res.room,
                    status: 'VIGENTE',
                    daysLeft: daysLeft,
                    date: baseDateStr,
                    expiration: expirationDate.toISOString().split('T')[0]
                });
            }
        }
    });

    // Ordenação
    // Críticos: Sem Laudo primeiro, depois Vencidos por mais tempo
    criticalList.sort((a, b) => a.daysLeft - b.daysLeft); 
    
    // Válidos: Os que vencem antes aparecem primeiro
    validList.sort((a, b) => a.daysLeft - b.daysLeft);

    const html = `
      <html>
      <head>
        <title>Relatório de Controle de Laudos</title>
        <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Helvetica', Arial, sans-serif; font-size: 10px; color: #000; padding: 0; margin: 0; -webkit-print-color-adjust: exact; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; }
            h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
            h2 { margin: 15px 0 5px 0; font-size: 12px; background-color: #eee; padding: 4px; border-left: 5px solid #666; }
            p { margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th, td { border: 1px solid #999; padding: 4px; text-align: left; height: 18px; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            .status-critical { color: red; font-weight: bold; }
            .status-warning { color: orange; font-weight: bold; }
            .status-ok { color: green; font-weight: bold; }
            .center { text-align: center; }
            .right { text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
            <h1>Relatório de Controle de Laudos Médicos</h1>
            <p>Data de Emissão: ${today.toLocaleDateString('pt-BR')}</p>
            <p>Validade Padrão: 180 dias da emissão</p>
        </div>

        ${criticalList.length > 0 ? `
        <h2>⚠️ PENDÊNCIAS (Sem Laudo ou Vencidos)</h2>
        <table>
            <thead>
                <tr>
                    <th>Residente</th>
                    <th width="60">Quarto</th>
                    <th width="100">Situação</th>
                    <th width="80">Data Base</th>
                    <th width="80">Dias Vencido</th>
                </tr>
            </thead>
            <tbody>
                ${criticalList.map(item => `
                    <tr>
                        <td><strong>${item.name}</strong></td>
                        <td class="center">${item.room}</td>
                        <td class="center status-critical">${item.status}</td>
                        <td class="center">${item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '-'}</td>
                        <td class="center status-critical">${item.status === 'SEM LAUDO' ? '-' : Math.abs(item.daysLeft) + ' dias'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}

        <h2>✅ LAUDOS VIGENTES</h2>
        <table>
            <thead>
                <tr>
                    <th>Residente</th>
                    <th width="60">Quarto</th>
                    <th width="80">Emissão</th>
                    <th width="80">Vencimento</th>
                    <th width="100">Dias Restantes</th>
                </tr>
            </thead>
            <tbody>
                ${validList.map(item => {
                    const isWarning = item.daysLeft <= 30;
                    return `
                    <tr>
                        <td>${item.name}</td>
                        <td class="center">${item.room}</td>
                        <td class="center">${new Date(item.date).toLocaleDateString('pt-BR')}</td>
                        <td class="center">${new Date(item.expiration).toLocaleDateString('pt-BR')}</td>
                        <td class="center ${isWarning ? 'status-warning' : 'status-ok'}">${item.daysLeft} dias</td>
                    </tr>
                    `;
                }).join('')}
                ${validList.length === 0 ? '<tr><td colspan="5" class="center">Nenhum laudo vigente encontrado.</td></tr>' : ''}
            </tbody>
        </table>

        <div style="margin-top: 20px; font-size: 9px; text-align: center; color: #666;">
            Gerado automaticamente pelo sistema LifeCare
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // --- Helper to calculate balance locally for AdminPanel usage ---
  const getPersonalStock = (residentId: string, productId: string) => {
    const txs = data.transactions.filter(t => t.residentId === residentId && t.productId === productId);
    const totalIn = txs.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.quantity, 0);
    const totalOut = txs.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.quantity, 0);
    return totalIn - totalOut;
  };

  const getDocTypeLabel = (type: string) => DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  const getHouseDocTypeLabel = (type: string) => HOUSE_DOC_TYPES.find(t => t.value === type)?.label || type;

  // --- Send Demand Handler ---
  const handleSendDemand = (demand: Demand) => {
    const residentsNames = demand.residentIds.map(rid => data.residents.find(r => r.id === rid)?.name).filter(Boolean).join(', ');
    const areas = demand.professionalAreas.join(', ');
    
    // Replace "RP" with "Relatório Psicossocial"
    const displayTitle = demand.title.replace(/\bRP\b/g, 'Relatório Psicossocial');

    let message = `Olá, nova demanda atribuída:\n\n`;
    message += `*Título:* ${displayTitle}\n`;
    message += `*Áreas:* ${areas}\n`;
    message += `*Para:* ${residentsNames}\n`;
    if(demand.description) message += `*Detalhes:* ${demand.description}\n`;
    message += `\nPor favor, verificar no sistema.`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    onSaveDemand({ ...demand, status: 'EM_ANDAMENTO' });
  };

  // --- RENDERERS ---

  const renderTeamManagement = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
      <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
         <div className="space-y-3 mb-4">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Buscar nome..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
               <button onClick={() => setFilterType('ALL')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${filterType === 'ALL' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Todos</button>
               <button onClick={() => setFilterType('INTERNAL')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${filterType === 'INTERNAL' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Internos</button>
               <button onClick={() => setFilterType('EXTERNAL')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${filterType === 'EXTERNAL' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}>Externos</button>
            </div>
         </div>
         <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredList.map(member => (
              <button key={member.id} onClick={() => setSelectedStaffId(member.id)} className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors border-2 ${selectedStaffId === member.id ? 'bg-primary-50 border-primary-300' : 'border-transparent hover:bg-slate-50'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${member.type === 'INTERNAL' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                    {member.photo ? <img src={member.photo} className="w-full h-full object-cover" /> : (member.type === 'INTERNAL' ? <Briefcase size={20} /> : <Contact size={20} />)}
                </div>
                <div className="flex-1 min-w-0"><p className="font-bold text-slate-700 text-sm truncate">{member.name}</p><p className="text-xs text-slate-400 truncate uppercase">{member.roleOrArea}</p></div>
                {member.documents.length > 0 && (<div className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{member.documents.length} Docs</div>)}
              </button>
            ))}
            {filteredList.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">Ninguém encontrado.</p>}
         </div>
      </div>
      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
         {!selectedMember ? (
           <div className="m-auto text-center text-slate-400"><Shield size={48} className="mx-auto mb-4 opacity-20" /><p className="font-medium">Selecione um membro da equipe</p><p className="text-sm">para gerenciar seus documentos.</p></div>
         ) : (
           <div className="flex flex-col h-full animate-in fade-in">
              <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between border-b border-slate-100 pb-6 mb-4 gap-4">
                 <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold shadow-sm overflow-hidden ${selectedMember.type === 'INTERNAL' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                       {selectedMember.photo ? <img src={selectedMember.photo} className="w-full h-full object-cover" /> : (selectedMember.name.charAt(0))}
                    </div>
                    <div><h2 className="text-xl font-bold text-slate-800">{selectedMember.name}</h2><div className="flex items-center gap-2"><span className={`text-xs px-2 py-1 rounded-md font-bold uppercase ${selectedMember.type === 'INTERNAL' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{selectedMember.roleOrArea}</span>{selectedMember.type === 'INTERNAL' && (<span className={`text-xs px-2 py-1 rounded-md font-bold ${selectedMember.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{selectedMember.active ? 'Ativo' : 'Inativo'}</span>)}</div></div>
                 </div>
                 <div className="flex gap-2 w-full xl:w-auto">
                    <button onClick={() => setIsChecklistModalOpen(true)} className="flex-1 xl:flex-none bg-amber-50 text-amber-700 hover:bg-amber-100 px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm text-sm border border-amber-200 transition-colors"><ClipboardCheck size={16} /> Pendências</button>
                    <button onClick={() => { setNewDocType('RG_CNH'); setNewDocName(''); setNewDocLink(''); setIsModalOpen(true); }} className="flex-1 xl:flex-none bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2 font-bold shadow-sm text-sm transition-colors"><Plus size={16} /> Adicionar Link</button>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3">
                 <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><FileText size={18} /> Documentação Arquivada</h3>
                 {selectedMember.documents.length > 0 ? (
                    selectedMember.documents.map(doc => (
                       <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-primary-200 transition-colors group">
                          <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${doc.type === 'COREN' ? 'bg-green-100 text-green-600' : doc.type === 'RG' || doc.type === 'CPF' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}><Link size={20} /></div>
                             <div><p className="font-bold text-slate-700 text-sm">{doc.name || getDocTypeLabel(doc.type)}</p><p className="text-xs text-slate-500 uppercase font-bold tracking-wide">{getDocTypeLabel(doc.type)} • {new Date(doc.date).toLocaleDateString('pt-BR')}</p></div>
                          </div>
                          <div className="flex items-center gap-2"><a href={doc.linkUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-white text-blue-600 border border-slate-200 rounded-lg hover:bg-blue-50 transition-colors font-bold text-xs flex items-center gap-1"><ExternalLink size={14} /> Abrir</a><button onClick={() => handleDeleteDocument(doc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remover"><Trash2 size={16} /></button></div>
                       </div>
                    ))
                 ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300"><FileText size={32} className="mx-auto mb-2 text-slate-300" /><p className="text-slate-500">Nenhum documento vinculado.</p><p className="text-xs text-slate-400 mt-1">Clique em "Adicionar Link" para incluir RG, CPF, COREN, etc.</p></div>
                 )}
              </div>
           </div>
         )}
      </div>
    </div>
  );

  const renderHouseManagement = () => (
    <div className="space-y-6 animate-in fade-in">
         <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="relative w-full md:w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Buscar documento da casa..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500" value={houseDocSearch} onChange={e => setHouseDocSearch(e.target.value)} /></div>
            <button onClick={() => { setNewDocType('ALVARA_SANITARIO'); setNewDocName(''); setNewDocLink(''); setNewHouseDocExpiration(''); setIsHouseModalOpen(true); }} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 font-bold shadow-sm w-full md:w-auto justify-center"><Plus size={18} /> Novo Documento</button>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(data.houseDocuments || []).filter(d => d.name.toLowerCase().includes(houseDocSearch.toLowerCase()) || d.type.toLowerCase().includes(houseDocSearch.toLowerCase())).sort((a,b) => a.name.localeCompare(b.name)).map(doc => (
               <div key={doc.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center"><FileText size={20} /></div>
                        <div><h4 className="font-bold text-slate-800 line-clamp-1">{doc.name}</h4><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase font-bold">{getHouseDocTypeLabel(doc.type)}</span></div>
                     </div>
                  </div>
                  <div className="flex-1 text-sm text-slate-600 space-y-1 mb-4">
                     <div className="flex justify-between"><span className="text-slate-400">Emissão:</span><span className="font-medium">{doc.issueDate ? new Date(doc.issueDate).toLocaleDateString('pt-BR') : '-'}</span></div>
                     <div className="flex justify-between"><span className="text-slate-400">Validade:</span><span className={`font-medium ${doc.expirationDate && new Date(doc.expirationDate) < new Date() ? 'text-red-600' : (doc.expirationDate ? 'text-green-600' : 'text-slate-600')}`}>{doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString('pt-BR') : 'Indefinida'}</span></div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                     <a href={doc.linkUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-slate-50 hover:bg-blue-50 text-blue-600 border border-slate-200 rounded-lg py-2 flex items-center justify-center gap-2 font-bold text-sm transition-colors"><ExternalLink size={16} /> Abrir</a>
                     <button onClick={() => { if(confirm("Remover este documento?")) onDeleteHouseDocument(doc.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"><Trash2 size={18} /></button>
                  </div>
               </div>
            ))}
            {(data.houseDocuments || []).length === 0 && <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200"><Home size={32} className="mx-auto mb-2 opacity-50" /><p>Nenhum documento da casa cadastrado.</p></div>}
         </div>
      </div>
  );

  const renderAdminManagement = () => {
    const today = new Date().toISOString().split('T')[0];
    const activeResidents = data.residents.filter(r => r.active).sort((a,b) => a.name.localeCompare(b.name));

    // --- CHECKLIST 1: FRALDAS/ABSORVENTES ---
    // Show only residents who have balance > 0
    const diaperList = activeResidents.filter(resident => {
        const hasBalance = data.products
            .filter(p => p.category === 'Incontinência Urinária e Fecal')
            .some(p => getPersonalStock(resident.id, p.id) > 0);
        return hasBalance;
    }).map(resident => {
        const hasOutToday = data.transactions.some(t => {
            const prod = data.products.find(p => p.id === t.productId);
            return t.residentId === resident.id && t.date === today && t.type === 'OUT' && prod?.category === 'Incontinência Urinária e Fecal';
        });
        return { name: resident.name, done: hasOutToday, id: resident.id };
    });

    // --- CHECKLIST 2: MEDICAMENTOS ---
    // Show only residents who have active prescriptions AND stock > 0
    const medsList = activeResidents.filter(resident => {
        const activePrescriptions = data.prescriptions.filter(p => p.residentId === resident.id && p.active);
        const hasStock = activePrescriptions.some(p => getPersonalStock(resident.id, p.productId) > 0);
        return hasStock;
    }).map(resident => {
        const hasAdministeredToday = data.transactions.some(t => 
            t.residentId === resident.id && t.date === today && t.notes?.includes('Administração')
        );
        return { name: resident.name, done: hasAdministeredToday, id: resident.id };
    });

    // --- CHECKLIST 3: DEMANDAS ---
    // Safe access here (Fix for TS18048)
    const pendingDemands = (data.demands || []).filter(d => d.status === 'PENDENTE');

    // --- CHECKLIST 4: ESCALA DE EQUIPE OBRIGATÓRIA ---
    const staffPresentIds = (data.timeSheets || [])
        .filter(ts => ts.date === today && ts.present)
        .map(ts => ts.employeeId);

    const requiredRoles = [
        { label: 'Cozinha', role: 'COZINHEIRO(A)' },
        { label: 'Cuidador(a)', role: 'CUIDADOR(A)' },
        { label: 'Téc. Enfermagem', role: 'TEC ENFERMAGEM' },
        { label: 'Enfermeira', role: 'ENFERMEIRA' }
    ];

    const staffingChecklist = requiredRoles.map(item => {
        const count = (data.employees || []).filter(emp => {
            const isActiveAndPresent = emp.active && staffPresentIds.includes(emp.id);
            if (!isActiveAndPresent) return false;

            // Flexibilização para Cozinha (aceita COZINHEIRA, COZINHEIRO, COZINHEIRO(A))
            if (item.label === 'Cozinha') {
                return emp.role.toUpperCase().includes('COZIN');
            }

            return emp.role === item.role;
        }).length;
        return { ...item, count, filled: count > 0 };
    });

    return (
    <div className="space-y-6 animate-in fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            
            {/* COLUMN 1: FRALDAS CHECKLIST */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
                <div className="bg-blue-50 p-3 border-b border-blue-100 flex items-center gap-2">
                    <Baby className="text-blue-600" size={20} />
                    <h3 className="font-bold text-blue-800">Fraldas / Absorventes</h3>
                </div>
                <div className="p-2 bg-slate-50 text-xs text-slate-500 border-b border-slate-100 text-center">
                    Residentes com saldo em estoque
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {diaperList.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100">
                            <span className="text-sm font-medium text-slate-700 truncate">{item.name}</span>
                            {item.done ? (
                                <CheckSquare className="text-emerald-500" size={20} />
                            ) : (
                                <div className="w-5 h-5 rounded border-2 border-slate-300"></div>
                            )}
                        </div>
                    ))}
                    {diaperList.length === 0 && <p className="text-center text-slate-400 py-4 text-xs">Nenhum residente com estoque.</p>}
                </div>
            </div>

            {/* COLUMN 2: MEDICAMENTOS CHECKLIST */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
                <div className="bg-purple-50 p-3 border-b border-purple-100 flex items-center gap-2">
                    <Pill className="text-purple-600" size={20} />
                    <h3 className="font-bold text-purple-800">Medicamentos</h3>
                </div>
                <div className="p-2 bg-slate-50 text-xs text-slate-500 border-b border-slate-100 text-center">
                    Residentes com prescrição e saldo
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {medsList.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100">
                            <span className="text-sm font-medium text-slate-700 truncate">{item.name}</span>
                            {item.done ? (
                                <CheckSquare className="text-emerald-500" size={20} />
                            ) : (
                                <div className="w-5 h-5 rounded border-2 border-slate-300"></div>
                            )}
                        </div>
                    ))}
                    {medsList.length === 0 && <p className="text-center text-slate-400 py-4 text-xs">Nenhum residente com estoque.</p>}
                </div>
            </div>

            {/* COLUMN 3: DEMANDAS CHECKLIST (GROUPED BY AREA) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
                <div className="bg-amber-50 p-3 border-b border-amber-100 flex items-center gap-2">
                    <ListTodo className="text-amber-600" size={20} />
                    <h3 className="font-bold text-amber-800">Demandas Pendentes</h3>
                </div>
                <div className="p-2 bg-slate-50 text-xs text-slate-500 border-b border-slate-100 text-center">
                    Lista de Títulos
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-3">
                    {PROFESSIONAL_AREAS.map(area => {
                        const areaDemands = pendingDemands.filter(d => d.professionalAreas.includes(area));
                        if (areaDemands.length === 0) return null;

                        return (
                            <div key={area} className="mb-2">
                                <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-t ${getAreaHeaderStyle(area)}`}>
                                    {area.replace('_', ' ')}
                                </div>
                                <div className="border border-slate-100 rounded-b bg-white divide-y divide-slate-50">
                                    {areaDemands.map(demand => (
                                        <div key={demand.id} className="p-2 flex items-center justify-between gap-2 hover:bg-slate-50 group">
                                            <span className="text-xs font-medium text-slate-700 leading-tight line-clamp-2" title={demand.title}>
                                                {demand.title}
                                            </span>
                                            <button 
                                                onClick={() => handleSendDemand(demand)}
                                                className="text-green-600 hover:bg-green-50 p-1.5 rounded transition-colors flex-shrink-0"
                                                title="Enviar via WhatsApp"
                                            >
                                                <Send size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    {pendingDemands.length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                            <CheckSquare size={32} className="mx-auto mb-2 opacity-30 text-green-500"/>
                            <p className="text-xs">Todas as demandas encaminhadas!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* COLUMN 4: ESCALA CHECKLIST */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
                <div className="bg-teal-50 p-3 border-b border-teal-100 flex items-center gap-2">
                    <UserCheck className="text-teal-600" size={20} />
                    <h3 className="font-bold text-teal-800">Escala Obrigatória</h3>
                </div>
                <div className="p-2 bg-slate-50 text-xs text-slate-500 border-b border-slate-100 text-center">
                    Presença confirmada hoje
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {staffingChecklist.map((item, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${item.filled ? 'bg-white border-slate-100' : 'bg-red-50 border-red-100'}`}>
                            <div>
                                <span className={`text-sm font-bold ${item.filled ? 'text-slate-700' : 'text-red-700'}`}>{item.label}</span>
                                <p className="text-xs text-slate-500">{item.count} presente(s)</p>
                            </div>
                            {item.filled ? (
                                <CheckSquare className="text-emerald-500" size={24} />
                            ) : (
                                <AlertTriangle className="text-red-500" size={24} />
                            )}
                        </div>
                    ))}
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-100 text-center">
                       <p>A escala é verificada automaticamente com base no "Plantão Diário" da aba Equipe.</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                    <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center mb-4 text-rose-600"><Activity size={24} /></div>
                    <h3 className="font-bold text-lg text-slate-800">Folha de Sinais Vitais</h3>
                    <p className="text-sm text-slate-500 mt-2">Gera a planilha diária para registro de PA, BMP, Temperatura, Saturação e HGT.</p>
                </div>
                <button onClick={handlePrintVitalSigns} className="mt-6 w-full bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"><Printer size={18} /> Imprimir Planilha</button>
            </div>
            
            {/* NOVO CARD: RELATÓRIO DE LAUDOS */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600"><FileWarning size={24} /></div>
                    <h3 className="font-bold text-lg text-slate-800">Controle de Laudos</h3>
                    <p className="text-sm text-slate-500 mt-2">Relatório de residentes sem laudo, com laudo vencido e dias restantes para vencimento (180 dias).</p>
                </div>
                <button onClick={handlePrintLaudoReport} className="mt-6 w-full bg-blue-700 text-white py-2 rounded-lg font-bold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"><Printer size={18} /> Imprimir Relatório</button>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center opacity-70">
                <Settings size={32} className="text-slate-300 mb-3" />
                <h3 className="font-bold text-slate-500">Em Breve</h3>
                <p className="text-xs text-slate-400 mt-1">Controle Financeiro e Contratos</p>
            </div>
        </div>
    </div>
  );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="text-primary-600" />
            Painel Administrativo
          </h2>
          <p className="text-slate-500 text-sm">Gestão de documentos da equipe e da instituição.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-w-full">
           <button onClick={() => setActiveTab('TEAM')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'TEAM' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Users size={16} /> GESTÃO EQUIPE</button>
           <button onClick={() => setActiveTab('HOUSE')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'HOUSE' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Home size={16} /> GESTÃO CASA</button>
           <button onClick={() => setActiveTab('ADMIN')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'ADMIN' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Settings size={16} /> GESTÃO ADM</button>
        </div>
      </div>

      {activeTab === 'TEAM' && renderTeamManagement()}
      {activeTab === 'HOUSE' && renderHouseManagement()}
      {activeTab === 'ADMIN' && renderAdminManagement()}

      {/* Add Document Modal (Team) */}
      {isModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-slate-800">Adicionar Link de Documento</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button></div>
               <form onSubmit={handleSaveDocument} className="space-y-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Documento</label><select className="w-full p-2 border border-slate-300 rounded-md bg-white" value={newDocType} onChange={e => setNewDocType(e.target.value)}>{DOCUMENT_TYPES.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}</select></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome (Opcional)</label><input type="text" placeholder="Ex: RG Frente e Verso" className="w-full p-2 border border-slate-300 rounded-md" value={newDocName} onChange={e => setNewDocName(e.target.value)}/></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Link do Arquivo (URL) *</label><div className="relative"><Link className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input required type="url" placeholder="https://drive.google.com/..." className="w-full pl-9 p-2 border border-slate-300 rounded-md" value={newDocLink} onChange={e => setNewDocLink(e.target.value)}/></div><p className="text-xs text-slate-500 mt-1">Cole o link compartilhado do Google Drive, Dropbox, etc.</p></div>
                  <div className="flex gap-3 justify-end pt-4 border-t"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 font-bold"><Check size={16}/> Salvar Link</button></div>
               </form>
            </div>
         </div>
      )}

      {/* Add House Document Modal */}
      {isHouseModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-slate-800">Novo Documento da Casa</h3><button onClick={() => setIsHouseModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button></div>
               <form onSubmit={handleSaveHouseDoc} className="space-y-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label><select className="w-full p-2 border border-slate-300 rounded-md bg-white" value={newDocType} onChange={e => setNewDocType(e.target.value)}>{HOUSE_DOC_TYPES.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}</select></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome / Descrição (Opcional)</label><input type="text" placeholder="Ex: Alvará 2024" className="w-full p-2 border border-slate-300 rounded-md" value={newDocName} onChange={e => setNewDocName(e.target.value)}/></div>
                  <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Emissão</label><input type="date" className="w-full p-2 border border-slate-300 rounded-md" value={newHouseDocDate} onChange={e => setNewHouseDocDate(e.target.value)}/></div><div><label className="block text-sm font-medium text-slate-700 mb-1 text-orange-600 font-bold">Vencimento</label><input type="date" className="w-full p-2 border border-slate-300 rounded-md font-bold text-slate-700" value={newHouseDocExpiration} onChange={e => setNewHouseDocExpiration(e.target.value)}/></div></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Link do Arquivo (URL) *</label><div className="relative"><Link className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input required type="url" placeholder="https://drive.google.com/..." className="w-full p-9 p-2 border border-slate-300 rounded-md pl-9" value={newDocLink} onChange={e => setNewDocLink(e.target.value)}/></div></div>
                  <div className="flex gap-3 justify-end pt-4 border-t"><button type="button" onClick={() => setIsHouseModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 font-bold"><Check size={16}/> Salvar</button></div>
               </form>
            </div>
         </div>
      )}

      {/* Checklist Modal */}
      {isChecklistModalOpen && selectedMember && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg animate-in zoom-in-95 flex flex-col max-h-[90vh]">
               <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4"><div><h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><ClipboardCheck className="text-amber-600"/>Checklist de Admissão</h3><p className="text-sm text-slate-500">Conferência de documentos para {selectedMember.name}</p></div><button onClick={() => setIsChecklistModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button></div>
               <div className="overflow-y-auto flex-1 pr-1"><div className="space-y-2">{ADMISSION_CHECKLIST.map((item) => { const isPresent = selectedMember.documents.some(d => d.type === item.key); let statusIcon = <AlertCircle size={20} />; let statusColor = "bg-red-50 text-red-700 border-red-200"; if (isPresent) { statusIcon = <Check size={20} />; statusColor = "bg-green-50 text-green-700 border-green-200"; } else if (item.conditional) { statusIcon = <AlertTriangle size={20} />; statusColor = "bg-amber-50 text-amber-700 border-amber-200"; } return ( <div key={item.key} className={`flex items-center justify-between p-3 rounded-lg border ${statusColor}`}><span className="font-medium text-sm">{item.label}</span><div className="flex items-center gap-2">{item.conditional && !isPresent && <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Se houver</span>}{statusIcon}</div></div> ); })}</div></div>
               <div className="mt-4 pt-4 border-t border-slate-100 text-center"><button onClick={() => setIsChecklistModalOpen(false)} className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-bold w-full">Fechar</button></div>
            </div>
         </div>
      )}
    </div>
  );
};
