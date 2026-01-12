
import React, { useState, useMemo } from 'react';
import { AppData, Employee, TimeSheetEntry } from '../types';
import { Briefcase, Plus, Search, Edit2, Trash2, User, Save, X, Calendar, CheckCircle2, Clock, Settings, Printer, Camera } from 'lucide-react';

interface EmployeesProps {
  data: AppData;
  onSaveEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onSaveRoles: (roles: string[]) => void;
  onSaveTimeSheet: (entry: TimeSheetEntry) => void;
  onDeleteTimeSheet: (date: string, employeeId: string) => void;
}

const EmptyEmployee: Employee = {
  id: '',
  name: '',
  role: '',
  phone: '',
  cpf: '',
  admissionDate: '',
  active: true,
  photo: ''
};

export const Employees: React.FC<EmployeesProps> = ({ 
  data, onSaveEmployee, onDeleteEmployee, onSaveRoles, onSaveTimeSheet, onDeleteTimeSheet 
}) => {
  const [activeTab, setActiveTab] = useState<'CADASTRO' | 'PLANTAO' | 'RELATORIO'>('CADASTRO');
  
  // States for CRUD
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [currentEmployee, setCurrentEmployee] = useState<Employee>(EmptyEmployee);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for Roles Management
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [tempRoles, setTempRoles] = useState<string[]>([]);
  const [newRoleInput, setNewRoleInput] = useState('');

  // State for Inline Role Add
  const [isAddingRoleInline, setIsAddingRoleInline] = useState(false);
  const [inlineRoleName, setInlineRoleName] = useState('');

  // State for TimeSheet (Plantão)
  const [dutyDate, setDutyDate] = useState(new Date().toISOString().split('T')[0]);
  const [plantaoSearchTerm, setPlantaoSearchTerm] = useState('');

  // State for Report
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // --- HELPERS ---

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
          setCurrentEmployee(prev => ({ ...prev, photo: canvas.toDataURL('image/jpeg', 0.7) }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    
    setCurrentEmployee(prev => ({ ...prev, cpf: value }));
  };

  const filteredEmployees = useMemo(() => {
    return (data.employees || [])
      .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.role.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.employees, searchTerm]);

  const activeEmployees = useMemo(() => {
    return (data.employees || []).filter(e => e.active).sort((a, b) => a.name.localeCompare(b.name));
  }, [data.employees]);

  // --- HANDLERS ---

  const handleEdit = (employee: Employee) => {
    setCurrentEmployee(employee);
    setViewMode('FORM');
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este membro da equipe?")) {
      onDeleteEmployee(id);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee.role) {
      alert("Selecione um cargo.");
      return;
    }
    onSaveEmployee({ ...currentEmployee, id: currentEmployee.id || crypto.randomUUID() });
    setViewMode('LIST');
    setCurrentEmployee(EmptyEmployee);
  };

  // Roles Management
  const openRolesModal = () => {
    setTempRoles([...(data.employeeRoles || [])]);
    setIsRolesModalOpen(true);
  };

  const addRole = () => {
    if (newRoleInput && !tempRoles.includes(newRoleInput.toUpperCase())) {
      setTempRoles([...tempRoles, newRoleInput.toUpperCase()]);
      setNewRoleInput('');
    }
  };

  const removeRole = (role: string) => {
    if (confirm(`Remover cargo "${role}" da lista?`)) {
      setTempRoles(tempRoles.filter(r => r !== role));
    }
  };

  const saveRoles = () => {
    onSaveRoles(tempRoles);
    setIsRolesModalOpen(false);
  };

  const handleAddInlineRole = () => {
    if (inlineRoleName && !(data.employeeRoles || []).includes(inlineRoleName.toUpperCase())) {
      const newRole = inlineRoleName.toUpperCase();
      const updatedRoles = [...(data.employeeRoles || []), newRole];
      onSaveRoles(updatedRoles);
      setCurrentEmployee({ ...currentEmployee, role: newRole });
      setIsAddingRoleInline(false);
      setInlineRoleName('');
    } else if (!inlineRoleName) {
      setIsAddingRoleInline(false);
    } else {
      alert("Cargo já existe.");
    }
  };

  // TimeSheet Logic
  const togglePresence = (employeeId: string) => {
    const existingEntry = (data.timeSheets || []).find(ts => ts.date === dutyDate && ts.employeeId === employeeId);
    
    if (existingEntry) {
      // If present, remove (toggle off)
      onDeleteTimeSheet(dutyDate, employeeId);
    } else {
      // If absent, add (toggle on)
      onSaveTimeSheet({
        id: crypto.randomUUID(),
        date: dutyDate,
        employeeId: employeeId,
        present: true
      });
    }
  };

  const getPresenceStatus = (employeeId: string, date: string) => {
    return (data.timeSheets || []).some(ts => ts.date === date && ts.employeeId === employeeId);
  };

  // Report Logic
  const getDaysInMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const date = new Date(year, month, 0);
    const days = [];
    for (let i = 1; i <= date.getDate(); i++) {
      days.push(i);
    }
    return days;
  };

  const daysInReportMonth = getDaysInMonth(reportMonth);

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Por favor, permita pop-ups para imprimir.");

    const [year, month] = reportMonth.split('-').map(Number);
    const formattedMonth = `${String(month).padStart(2, '0')}/${year}`;

    let html = `
      <html>
      <head>
        <title>Folha de Ponto - ${formattedMonth}</title>
        <style>
          @page { size: landscape; }
          body { font-family: Arial, sans-serif; font-size: 10px; color: #333; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          h1 { margin: 0; font-size: 18px; }
          p { margin: 5px 0 0; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ccc; padding: 4px; text-align: center; }
          th { background-color: #f3f4f6; font-weight: bold; }
          
          /* Estilo Ajustado: white-space nowrap impede quebra de linha */
          .name-col { 
            text-align: left; 
            white-space: nowrap; 
            padding-left: 8px;
            padding-right: 8px;
            font-weight: bold; 
            width: auto;
            min-width: 150px;
          }
          
          .total-col { background-color: #f3f4f6; font-weight: bold; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 10px; color: #666; }
          .signature-box { margin-top: 40px; display: flex; justify-content: space-around; }
          .signature-line { width: 200px; border-top: 1px solid #000; text-align: center; padding-top: 5px; }
          
          /* Estilo da Bolinha Verde */
          .present-dot {
            height: 10px;
            width: 10px;
            background-color: #22c55e;
            border-radius: 50%;
            display: block;
            margin: 0 auto;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Folha de Ponto - LifeCare</h1>
          <p>Mês de Referência: ${formattedMonth}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th class="name-col">Membro da Equipe</th>
              ${daysInReportMonth.map(d => {
                const date = new Date(year, month - 1, d);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6; // 0 = Domingo, 6 = Sábado
                const bgStyle = isWeekend ? 'background-color: #cbd5e1;' : '';
                return `<th style="${bgStyle}">${d}</th>`;
              }).join('')}
              <th class="total-col">Total</th>
            </tr>
          </thead>
          <tbody>
    `;

    activeEmployees.forEach(emp => {
      let total = 0;
      let cells = '';
      daysInReportMonth.forEach(day => {
        const date = new Date(year, month - 1, day);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const cellStyle = isWeekend ? 'background-color: #f1f5f9;' : '';

        const dateStr = `${reportMonth}-${String(day).padStart(2, '0')}`;
        const isPresent = getPresenceStatus(emp.id, dateStr);
        if (isPresent) total++;
        // Alterado de 'P' para a div com a classe present-dot
        cells += `<td style="${cellStyle}">${isPresent ? '<div class="present-dot"></div>' : ''}</td>`;
      });
      
      html += `
        <tr>
          <td class="name-col">${emp.name}</td>
          ${cells}
          <td class="total-col">${total}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        
        <div class="signature-box">
           <div class="signature-line">Responsável Administrativo</div>
           <div class="signature-line">Enfermeiro(a) Chefe</div>
        </div>

        <div class="footer">
           <span>Gerado automaticamente pelo sistema LifeCare</span>
           <span>Data de impressão: ${new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    // Pequeno timeout para garantir que os estilos carreguem antes de imprimir
    setTimeout(() => {
        printWindow.print();
    }, 500);
  };

  // --- RENDERERS ---

  const renderCadastro = () => {
    if (viewMode === 'FORM') {
      return (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Briefcase className="text-primary-600" /> 
              {currentEmployee.id ? 'Editar Membro' : 'Novo Membro'}
            </h2>
            <button onClick={() => setViewMode('LIST')} className="text-slate-500 hover:text-slate-800"><X size={24}/></button>
          </div>

          <form onSubmit={handleSaveForm} className="space-y-6">
            <div className="flex items-center gap-4 mb-4 justify-center">
              <div className="w-28 h-36 rounded-xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden relative group">
                {currentEmployee.photo ? (
                  <img src={currentEmployee.photo} className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-slate-400" />
                )}
                <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera className="text-white" size={24} />
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
              <input required type="text" className="w-full p-2 border border-slate-300 rounded-md" value={currentEmployee.name} onChange={e => setCurrentEmployee({...currentEmployee, name: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Cargo *</label>
                 {!isAddingRoleInline ? (
                    <div className="flex gap-2">
                       <select required className="w-full p-2 border border-slate-300 rounded-md bg-white" value={currentEmployee.role} onChange={e => setCurrentEmployee({...currentEmployee, role: e.target.value})}>
                         <option value="">Selecione...</option>
                         {(data.employeeRoles || []).map(role => <option key={role} value={role}>{role}</option>)}
                       </select>
                       <button 
                         type="button" 
                         onClick={() => setIsAddingRoleInline(true)}
                         className="bg-slate-100 px-3 rounded-md text-slate-500 hover:bg-slate-200 hover:text-primary-600 transition-colors"
                         title="Adicionar Novo Cargo"
                       >
                         <Plus size={20} />
                       </button>
                    </div>
                 ) : (
                    <div className="flex gap-2">
                       <input 
                         type="text" 
                         placeholder="NOVO CARGO" 
                         className="w-full p-2 border border-primary-300 rounded-md uppercase focus:ring-2 focus:ring-primary-500"
                         value={inlineRoleName}
                         onChange={e => setInlineRoleName(e.target.value)}
                         autoFocus
                       />
                       <button 
                         type="button" 
                         onClick={handleAddInlineRole}
                         className="bg-green-100 px-3 rounded-md text-green-600 hover:bg-green-200 transition-colors"
                         title="Salvar Cargo"
                       >
                         <CheckCircle2 size={20} />
                       </button>
                       <button 
                         type="button" 
                         onClick={() => { setIsAddingRoleInline(false); setInlineRoleName(''); }}
                         className="bg-red-100 px-3 rounded-md text-red-600 hover:bg-red-200 transition-colors"
                         title="Cancelar"
                       >
                         <X size={20} />
                       </button>
                    </div>
                 )}
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                 <input type="tel" className="w-full p-2 border border-slate-300 rounded-md" value={currentEmployee.phone || ''} onChange={e => setCurrentEmployee({...currentEmployee, phone: e.target.value})} />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                 <input 
                   type="text" 
                   className="w-full p-2 border border-slate-300 rounded-md" 
                   value={currentEmployee.cpf || ''} 
                   onChange={handleCPFChange} 
                   placeholder="000.000.000-00"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Data Admissão</label>
                 <input type="date" className="w-full p-2 border border-slate-300 rounded-md" value={currentEmployee.admissionDate || ''} onChange={e => setCurrentEmployee({...currentEmployee, admissionDate: e.target.value})} />
               </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input 
                type="checkbox" 
                id="active" 
                className="w-4 h-4 text-primary-600 rounded"
                checked={currentEmployee.active} 
                onChange={e => setCurrentEmployee({...currentEmployee, active: e.target.checked})} 
              />
              <label htmlFor="active" className="text-sm font-medium text-slate-700">Membro Ativo</label>
            </div>

            <div className="flex gap-4 justify-end pt-4 border-t">
              <button type="button" onClick={() => setViewMode('LIST')} className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2"><Save size={18} /> Salvar</button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div className="space-y-4 animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Buscar membro..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
           </div>
           <div className="flex gap-2 w-full md:w-auto">
             <button onClick={openRolesModal} className="flex-1 md:flex-none px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2 text-sm font-bold">
               <Settings size={18} /> Gerenciar Cargos
             </button>
             <button onClick={() => { setCurrentEmployee(EmptyEmployee); setViewMode('FORM'); }} className="flex-1 md:flex-none px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2 shadow-sm font-bold">
               <Plus size={18} /> Novo Membro
             </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map(emp => (
            <div key={emp.id} className={`bg-white p-4 rounded-xl shadow-sm border ${emp.active ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-70'} hover:shadow-md transition-shadow`}>
               <div className="flex justify-between items-start mb-3">
                 <div className="flex items-center gap-3">
                    <div className="w-16 h-20 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                      {emp.photo ? <img src={emp.photo} className="w-full h-full object-cover" /> : <User size={32} className="m-auto mt-4 text-slate-300" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 leading-tight">{emp.name}</h3>
                      <p className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">{emp.role}</p>
                    </div>
                 </div>
               </div>
               <div className="flex justify-between items-center mt-4 border-t pt-3">
                 <span className={`text-xs font-bold px-2 py-1 rounded-full ${emp.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                   {emp.active ? 'ATIVO' : 'INATIVO'}
                 </span>
                 <div className="flex gap-2">
                   <button onClick={() => handleEdit(emp)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                   <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                 </div>
               </div>
            </div>
          ))}
          {filteredEmployees.length === 0 && <div className="col-span-full py-10 text-center text-slate-400">Nenhum membro encontrado.</div>}
        </div>

        {/* Roles Modal */}
        {isRolesModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-lg text-slate-800">Gerenciar Cargos</h3>
                   <button onClick={() => setIsRolesModalOpen(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    placeholder="Novo Cargo..." 
                    className="flex-1 p-2 border border-slate-300 rounded-md uppercase"
                    value={newRoleInput}
                    onChange={e => setNewRoleInput(e.target.value)}
                  />
                  <button onClick={addRole} className="bg-primary-600 text-white px-3 rounded-md hover:bg-primary-700"><Plus /></button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                   {tempRoles.map(role => (
                     <div key={role} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-200">
                        <span className="text-sm font-medium">{role}</span>
                        <button onClick={() => removeRole(role)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                     </div>
                   ))}
                </div>
                <button onClick={saveRoles} className="w-full py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700">Salvar Alterações</button>
             </div>
          </div>
        )}
      </div>
    );
  };

  const renderPlantao = () => {
    // Filter logic
    const filteredPlantaoEmployees = activeEmployees.filter(emp => 
        emp.name.toLowerCase().includes(plantaoSearchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(plantaoSearchTerm.toLowerCase())
    );

    return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
           <div>
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <Clock className="text-orange-500" /> Plantão do Dia
             </h3>
             <p className="text-sm text-slate-500">Marque quem está presente na casa hoje.</p>
           </div>
           
           <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
               <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar no plantão..." 
                    className="w-full pl-10 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    value={plantaoSearchTerm}
                    onChange={e => setPlantaoSearchTerm(e.target.value)}
                  />
                  {plantaoSearchTerm && (
                    <button onClick={() => setPlantaoSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                    </button>
                  )}
               </div>
               <input 
                 type="date" 
                 className="p-2 border border-slate-300 rounded-lg font-medium text-slate-700 bg-slate-50 outline-none focus:border-orange-500"
                 value={dutyDate}
                 onChange={e => setDutyDate(e.target.value)}
               />
           </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlantaoEmployees.map(emp => {
               const isPresent = getPresenceStatus(emp.id, dutyDate);
               return (
                 <div 
                   key={emp.id} 
                   onClick={() => togglePresence(emp.id)}
                   className={`
                     cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center justify-between group
                     ${isPresent ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white hover:border-slate-300'}
                   `}
                 >
                    <div className="flex items-center gap-3">
                       <div className={`w-12 h-16 rounded-lg flex items-center justify-center border-2 overflow-hidden ${isPresent ? 'border-green-500' : 'border-slate-200'}`}>
                         {emp.photo ? <img src={emp.photo} className="w-full h-full object-cover" /> : <User className={isPresent ? 'text-green-600' : 'text-slate-300'} />}
                       </div>
                       <div>
                          <h4 className={`font-bold ${isPresent ? 'text-green-800' : 'text-slate-700'}`}>{emp.name}</h4>
                          <span className="text-xs text-slate-500">{emp.role}</span>
                       </div>
                    </div>
                    <div>
                       {isPresent ? (
                         <CheckCircle2 size={28} className="text-green-500 fill-green-100" />
                       ) : (
                         <div className="w-7 h-7 rounded-full border-2 border-slate-300 group-hover:border-slate-400"></div>
                       )}
                    </div>
                 </div>
               );
            })}
            {filteredPlantaoEmployees.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <User size={32} className="mx-auto mb-2 opacity-50"/>
                    <p>Nenhum membro encontrado.</p>
                </div>
            )}
         </div>
       </div>
    </div>
    );
  };

  const renderRelatorio = () => {
    // Parse year/month from state to reuse in render logic
    const [yearStr, monthStr] = reportMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    return (
    <div className="space-y-6 animate-in fade-in">
       <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
          <div className="flex items-center gap-4">
             <label className="font-bold text-slate-700">Mês de Referência:</label>
             <input 
               type="month" 
               className="p-2 border border-slate-300 rounded-lg"
               value={reportMonth}
               onChange={e => setReportMonth(e.target.value)}
             />
          </div>
          <button 
            onClick={handlePrintReport}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 shadow-sm font-bold"
          >
            <Printer size={18} /> Imprimir Folha
          </button>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto w-full">
          <table className="w-full text-sm text-left border-collapse">
             <thead className="bg-slate-50 text-slate-700">
               <tr>
                 <th className="p-3 border-b border-r border-slate-200 min-w-[200px] sticky left-0 bg-slate-50 z-10 whitespace-nowrap">Membro da Equipe</th>
                 {daysInReportMonth.map(day => {
                   const date = new Date(year, month - 1, day);
                   const isWeekend = date.getDay() === 0 || date.getDay() === 6; // 0=Dom, 6=Sab
                   
                   return (
                     <th key={day} className={`p-2 border-b border-slate-200 text-center min-w-[30px] font-normal text-xs ${isWeekend ? 'bg-slate-200 text-slate-600 font-bold' : ''}`}>
                       {day}
                     </th>
                   );
                 })}
                 <th className="p-3 border-b border-l border-slate-200 text-center font-bold">Total</th>
               </tr>
             </thead>
             <tbody>
               {activeEmployees.map(emp => {
                 let totalDays = 0;
                 return (
                   <tr key={emp.id} className="hover:bg-slate-50">
                     <td className="p-3 border-b border-r border-slate-200 sticky left-0 bg-white font-medium text-slate-800 truncate z-10">{emp.name}</td>
                     {daysInReportMonth.map(day => {
                        const date = new Date(year, month - 1, day);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                        const dateStr = `${reportMonth}-${String(day).padStart(2, '0')}`;
                        const isPresent = getPresenceStatus(emp.id, dateStr);
                        if (isPresent) totalDays++;
                        return (
                          <td key={day} className={`p-1 border-b border-slate-100 text-center ${isWeekend ? 'bg-slate-100' : ''}`}>
                             {isPresent ? <div className="w-3 h-3 bg-green-500 rounded-full mx-auto" title="Presente"></div> : <span className="text-slate-200">·</span>}
                          </td>
                        );
                     })}
                     <td className="p-3 border-b border-l border-slate-200 text-center font-bold text-primary-700">{totalDays}</td>
                   </tr>
                 );
               })}
             </tbody>
          </table>
          {activeEmployees.length === 0 && <div className="p-10 text-center text-slate-400">Sem dados para exibir.</div>}
       </div>
    </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="text-primary-600" />
            Gestão de Equipe
          </h2>
          <p className="text-slate-500 text-sm">Controle de equipe, cargos e folha de ponto.</p>
        </div>
      </div>

      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'CADASTRO' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('CADASTRO')}><div className="flex items-center gap-2"><User size={18} /> Cadastro & Equipe</div></button>
        <button className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'PLANTAO' ? 'border-orange-600 text-orange-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('PLANTAO')}><div className="flex items-center gap-2"><Clock size={18} /> Plantão Diário</div></button>
        <button className={`px-6 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'RELATORIO' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('RELATORIO')}><div className="flex items-center gap-2"><Calendar size={18} /> Folha de Ponto</div></button>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'CADASTRO' && renderCadastro()}
        {activeTab === 'PLANTAO' && renderPlantao()}
        {activeTab === 'RELATORIO' && renderRelatorio()}
      </div>
    </div>
  );
};
