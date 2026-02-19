import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Headphones, ArrowRightLeft, LayoutDashboard, Download, 
  LogOut, CheckCircle2, CloudOff, AlertCircle, Database, UserPlus, 
  History, Settings, BarChart3, Printer, X, Plus, Save, Briefcase, 
  Wrench, FileText, Camera, Edit2, Trash2, RefreshCw, Upload, Globe, 
  ChevronLeft, ChevronRight, Menu, Hammer, Settings2, ShieldCheck,
  Timer, Scan, Phone, Mail, UserCheck, Calendar, Search, ListChecks,
  SortAsc, SortDesc, Filter, MoreHorizontal, QrCode
} from 'lucide-react';

// --- INTERFACES PARA TYPESCRIPT (VERCEL COMPATIBILITY) ---
interface MaintLog { id: number; date: string; notes: string; statusAtTime: string; }
interface Equipment { id: string; model: string; status: string; barcode: string; maintenanceLogs: MaintLog[]; currentVisitId?: string; }
interface Person { id: string; name: string; document: string; country: string; age: number; email: string; phone: string; type: 'visitor' | 'guide'; code?: string; }
interface Visit { 
  id: string; 
  personId: string; 
  equipmentIds: string[]; 
  startTime: string; 
  endTime?: string; 
  status: 'active' | 'finished';
  guideId?: string; 
  date: string;
}

// --- DATOS INICIALES (MOCKS) ---
const INITIAL_DATA = {
  settings: { logo: "https://via.placeholder.com/100?text=LOGO", terms: "Contrato de responsabilidad por equipos...", appName: "AudioPro Admin" },
  syncMetadata: { lastSync: null, status: 'synced' },
  people: [
    { id: "P-101", name: "Carlos Perez", document: "12345678", country: "España", age: 34, email: "carlos@mail.com", phone: "600000000", type: 'visitor', code: "V001" }
  ],
  inventory: Array.from({ length: 45 }, (_, i) => ({
    id: `AG-${100 + i}`, model: i % 5 === 0 ? "Premium" : "Standard", status: "available", barcode: `${20000 + i}`, maintenanceLogs: [] 
  })),
  visits: [],
  guides: [
    { id: "G-101", name: "Elena Guía", license: "LIC-9988", phone: "555-0102", daysWorked: 12, type: 'guide' }
  ],
};

const APP_STORAGE_KEY = "AUDIOGUIDE_PRO_V11_UX";

// --- SERVICIO DE PERSISTENCIA ---
const StorageService = {
  saveLocal(data: any) { localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data)); },
  loadLocal() {
    const saved = localStorage.getItem(APP_STORAGE_KEY);
    try { return saved ? JSON.parse(saved) : INITIAL_DATA; } catch { return INITIAL_DATA; }
  },
  async syncToCloud(data: any) { 
    return new Promise((res) => setTimeout(() => res(new Date().toISOString()), 600)); 
  }
};

// --- SUBCOMPONENTES DE UI ---

function NavItem({ icon, label, active, collapsed, onClick, color = "text-slate-400 hover:bg-white/5" }: any) {
  return (
    <button onClick={onClick} title={label} className={`w-full flex items-center ${collapsed ? 'justify-center' : 'px-3'} py-2 rounded transition-all font-bold text-[10px] uppercase tracking-wider ${active ? 'bg-indigo-600 text-white shadow-lg' : color}`}>
      {icon} {!collapsed && <span className="ml-2 truncate">{label}</span>}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: any = {
    available: { label: 'Libre', class: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    in_use: { label: 'En Uso', class: 'text-amber-600 bg-amber-50 border-amber-100' },
    maint_repair: { label: 'Taller', class: 'text-red-600 bg-red-50 border-red-100' },
    maint_qc: { label: 'Calidad', class: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    maint_pending: { label: 'Cola', class: 'text-slate-500 bg-slate-50 border-slate-200' }
  };
  const c = cfg[status] || cfg.available;
  return <span className={`px-1.5 py-0.5 rounded-[3px] text-[8px] font-black border uppercase tracking-widest ${c.class}`}>{c.label}</span>;
}

function InputField({ label, ...props }: any) {
  return (
    <div className="w-full text-left">
      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{label}</label>
      <input className="input-base" {...props} />
    </div>
  );
}

function Pagination({ total, current, perPage, onChange }: any) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-1 justify-end mt-2 p-1">
      <button disabled={current === 1} onClick={() => onChange(current - 1)} className="p-1 border rounded disabled:opacity-30"><ChevronLeft size={10}/></button>
      <span className="text-[9px] font-bold text-slate-400 uppercase">Pág {current} de {pages}</span>
      <button disabled={current === pages} onClick={() => onChange(current + 1)} className="p-1 border rounded disabled:opacity-30"><ChevronRight size={10}/></button>
    </div>
  );
}

// --- FORMULARIOS Y FLUJOS ---

function UnifiedPersonForm({ item, onSubmit, peopleList, title }: any) {
  const [formData, setFormData] = useState({
    code: item?.code || '', document: item?.document || '',
    name: item?.name || '', country: item?.country || 'Colombia',
    age: item?.age || '', phone: item?.phone || '',
    email: item?.email || '', type: 'visitor'
  });
  const [qrValue, setQrValue] = useState('');

  const handleDocBlur = () => {
    if (!formData.document || item) return;
    const existing = peopleList.find((p: any) => p.document === formData.document);
    if (existing) {
      setFormData({ ...formData, ...existing });
    }
  };

  const handleQrInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrValue) return;
    // Simulación de lectura QR de cédula (toma los primeros 10 como DOC y el resto como nombre si existe)
    const doc = qrValue.slice(0, 10).replace(/\D/g, '');
    const existing = peopleList.find((p: any) => p.document === doc);
    if (existing) {
      setFormData({ ...formData, ...existing });
    } else {
      setFormData({ ...formData, document: doc });
    }
    setQrValue('');
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-indigo-50 rounded border border-indigo-100 flex items-center gap-2">
        <QrCode size={18} className="text-indigo-600" />
        <form onSubmit={handleQrInput} className="flex-1">
          <input 
            placeholder="Escanear QR / Código Barras Cédula..." 
            value={qrValue}
            onChange={(e) => setQrValue(e.target.value)}
            className="w-full bg-transparent border-none text-[10px] font-bold outline-none uppercase"
          />
        </form>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <InputField label="Cédula / Pasaporte" value={formData.document} onBlur={handleDocBlur} onChange={(e: any) => setFormData({...formData, document: e.target.value})} required />
          <InputField label="Código Interno" value={formData.code} onChange={(e: any) => setFormData({...formData, code: e.target.value})} />
        </div>
        
        <InputField label="Nombre Completo" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} required />
        
        <div className="grid grid-cols-2 gap-2">
          <InputField label="País" value={formData.country} onChange={(e: any) => setFormData({...formData, country: e.target.value})} />
          <InputField label="Edad" type="number" value={formData.age} onChange={(e: any) => setFormData({...formData, age: e.target.value})} />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <InputField label="Teléfono" value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} />
          <InputField label="Email" type="email" value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} />
        </div>

        <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded font-black text-[10px] uppercase mt-4 tracking-widest hover:bg-indigo-600 transition-colors">
          {title || "Registrar Ingreso"}
        </button>
      </form>
    </div>
  );
}

function VisitDetails({ visit, data, updateData, triggerNotif, guides }: any) {
  const person = data.people.find((p: any) => p.id === visit.personId);
  const [bc, setBc] = useState('');

  const addEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bc) return;
    const eq = data.inventory.find((i: any) => i.barcode === bc && i.status === 'available');
    if (!eq) return triggerNotif("No disponible o no existe");
    
    const newInv = data.inventory.map((i: any) => i.id === eq.id ? { ...i, status: 'in_use', currentVisitId: visit.id } : i);
    const newVisits = data.visits.map((v: any) => v.id === visit.id ? { ...v, equipmentIds: [...v.equipmentIds, eq.id] } : v);
    
    updateData({ ...data, inventory: newInv, visits: newVisits });
    setBc('');
    triggerNotif("Equipo vinculado");
  };

  const changeGuide = (gId: string) => {
    const newVisits = data.visits.map((v: any) => v.id === visit.id ? { ...v, guideId: gId } : v);
    updateData({ ...data, visits: newVisits });
    triggerNotif("Guía actualizado");
  };

  const removeEquipment = (eqId: string) => {
    const newInv = data.inventory.map((i: any) => i.id === eqId ? { ...i, status: 'available', currentVisitId: null } : i);
    const newVisits = data.visits.map((v: any) => v.id === visit.id ? { ...v, equipmentIds: v.equipmentIds.filter((id: string) => id !== eqId) } : v);
    updateData({ ...data, inventory: newInv, visits: newVisits });
    triggerNotif("Equipo desvinculado");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start border-b pb-4">
        <div>
          <h3 className="font-black text-sm uppercase">{person?.name}</h3>
          <p className="text-[9px] opacity-40 font-bold uppercase">{person?.document} • {person?.country}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black text-indigo-600 uppercase">Inicio</p>
          <p className="text-[10px] font-bold">{new Date(visit.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Guía Responsable</label>
          <select 
            value={visit.guideId || ''} 
            onChange={(e) => changeGuide(e.target.value)}
            className="input-base text-[10px] font-bold"
          >
            <option value="">Individual (Sin Guía)</option>
            {guides.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Audioguías Vinculadas</label>
          <div className="space-y-2 mb-3 max-h-32 overflow-y-auto custom-scrollbar">
            {visit.equipmentIds.map((id: string) => (
              <div key={id} className="flex justify-between items-center p-2 bg-slate-50 rounded border">
                <span className="font-black text-[10px] uppercase flex items-center gap-2"><Headphones size={12}/> {id}</span>
                <button onClick={() => removeEquipment(id)} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
              </div>
            ))}
            {visit.equipmentIds.length === 0 && <p className="text-[10px] opacity-30 italic text-center py-2">Ningún equipo asignado</p>}
          </div>

          <form onSubmit={addEquipment} className="flex gap-1">
            <div className="relative flex-1">
              <Camera size={12} className="absolute left-2 top-2 text-indigo-400" />
              <input 
                placeholder="Escanear Código..." 
                value={bc}
                onChange={(e) => setBc(e.target.value)}
                autoFocus
                className="w-full pl-7 pr-2 py-1.5 rounded border text-[10px] font-black outline-none bg-indigo-50/20 focus:bg-white"
              />
            </div>
            <button type="submit" className="p-2 bg-indigo-600 text-white rounded"><Plus size={14}/></button>
          </form>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL APP ---

export default function App() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [data, setData] = useState<any>(INITIAL_DATA);
  const [view, setView] = useState('visits');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [notif, setNotif] = useState<string | null>(null);
  const [modal, setModal] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [now, setNow] = useState(new Date());

  // Estados de Tabla
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'startTime', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setData(StorageService.loadLocal()); }, []);

  const triggerNotif = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 2500);
  };

  const updateData = (newData: any) => {
    setData(newData);
    StorageService.saveLocal(newData);
    handleSync(newData);
  };

  const handleSync = async (currentData = data) => {
    setIsSyncing(true);
    try {
      const time: any = await StorageService.syncToCloud(currentData);
      setData({ ...currentData, syncMetadata: { lastSync: time, status: 'synced' } });
    } catch {
      setData({ ...currentData, syncMetadata: { ...currentData.syncMetadata, status: 'error' } });
    } finally { setIsSyncing(false); }
  };

  // --- HANDLERS ---

  const handleSaveVisitFlow = (personData: any) => {
    let updatedPeople = [...data.people];
    const pIdx = updatedPeople.findIndex(p => p.document === personData.document);
    let finalPersonId = "";

    if (pIdx > -1) {
      updatedPeople[pIdx] = { ...updatedPeople[pIdx], ...personData };
      finalPersonId = updatedPeople[pIdx].id;
    } else {
      const newPerson = { ...personData, id: `P-${Date.now()}`, type: 'visitor' };
      updatedPeople.push(newPerson);
      finalPersonId = newPerson.id;
    }

    const newVisit: Visit = {
      id: `VIS-${Date.now()}`,
      personId: finalPersonId,
      equipmentIds: [],
      startTime: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      status: 'active'
    };

    updateData({ ...data, people: updatedPeople, visits: [...data.visits, newVisit] });
    setModal({ type: 'visit_details', visit: newVisit });
    triggerNotif("Visita abierta. Asigne equipos.");
  };

  const handleFinishVisit = (visitId: string) => {
    const visit = data.visits.find((v: any) => v.id === visitId);
    if (!visit) return;
    const newInventory = data.inventory.map((i: any) => visit.equipmentIds.includes(i.id) ? { ...i, status: 'available', currentVisitId: null } : i);
    const newVisits = data.visits.map((v: any) => v.id === visitId ? { ...v, status: 'finished', endTime: new Date().toISOString() } : v);
    updateData({ ...data, inventory: newInventory, visits: newVisits });
    triggerNotif("Equipos recibidos con éxito");
    if (modal?.visit?.id === visitId) setModal(null);
  };

  const handleSaveEntity = (type: string, itemData: any, id: string | null = null) => {
    let collection = [...data[type]];
    if (id) {
      const idx = collection.findIndex(i => i.id === id);
      collection[idx] = { ...collection[idx], ...itemData };
    } else {
      collection.push({ ...itemData, id: `${type.charAt(0).toUpperCase()}-${Date.now()}`, maintenanceLogs: type === 'inventory' ? [] : undefined });
    }
    updateData({ ...data, [type]: collection });
    setModal(null);
    triggerNotif("Guardado");
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // --- FILTRADO ---
  const filteredData = useMemo(() => {
    const target = view === 'visits' ? 'visits' : view;
    let result = [...(data[target] || [])];
    if (view === 'visits') result = result.filter(v => v.date === selectedDate);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item: any) => JSON.stringify(item).toLowerCase().includes(q));
    }
    return result;
  }, [data, view, searchQuery, selectedDate]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  if (!userRole) return <LoginView onLogin={setUserRole} />;

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-100 font-sans text-slate-900 selection:bg-indigo-100">
      {/* Sidebar */}
      <aside className={`${isMenuCollapsed ? 'w-12' : 'w-48'} bg-slate-900 text-white flex flex-col transition-all duration-200 border-r border-slate-800 shrink-0`}>
        <div className="p-3 flex items-center justify-between border-b border-white/5">
          {!isMenuCollapsed && <span className="font-black text-[9px] uppercase truncate opacity-50 tracking-widest leading-none">{data.settings.appName}</span>}
          <button onClick={() => setIsMenuCollapsed(!isMenuCollapsed)} className="p-1 hover:bg-white/10 rounded mx-auto"><Menu size={14}/></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
          <NavItem icon={<UserCheck size={16}/>} label="Visitas" active={view==='visits'} collapsed={isMenuCollapsed} onClick={() => setView('visits')} />
          <NavItem icon={<Headphones size={16}/>} label="Inventario" active={view==='inventory'} collapsed={isMenuCollapsed} onClick={() => setView('inventory')} />
          <NavItem icon={<Users size={16}/>} label="Personas" active={view==='people'} collapsed={isMenuCollapsed} onClick={() => setView('people')} />
          <NavItem icon={<Briefcase size={16}/>} label="Guías" active={view==='guides'} collapsed={isMenuCollapsed} onClick={() => setView('guides')} />
          {userRole === 'admin' && (
            <div className="pt-3 border-t border-white/5 mt-2 space-y-1">
              <NavItem icon={<BarChart3 size={16}/>} label="Métricas" active={view==='stats'} collapsed={isMenuCollapsed} onClick={() => setView('stats')} />
              <NavItem icon={<Settings size={16}/>} label="Ajustes" active={view==='settings'} collapsed={isMenuCollapsed} onClick={() => setView('settings')} />
            </div>
          )}
        </div>
        <div className="mt-auto p-1.5 border-t border-white/5 bg-black/20">
           <NavItem icon={<LogOut size={16}/>} label="Salir" collapsed={isMenuCollapsed} onClick={() => setUserRole(null)} color="text-red-400 hover:bg-red-500/10" />
           {!isMenuCollapsed && (
             <div className="px-2 py-1 flex items-center justify-between mt-1 pt-2 border-t border-white/5 opacity-50">
                <div className={`w-1.5 h-1.5 rounded-full ${data.syncMetadata.status === 'synced' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                <button onClick={() => handleSync()} className="text-white"><RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''}/></button>
             </div>
           )}
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto custom-scrollbar flex flex-col bg-slate-50/50">
        <header className="h-10 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-widest">
            {userRole} <ChevronRight size={10}/> <span className="text-slate-900">{view}</span>
          </div>
          <div className="flex gap-2">
             <div className="relative flex items-center mr-2">
                <Search size={10} className="absolute left-2 text-slate-400"/>
                <input type="text" placeholder="Búsqueda..." value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="pl-6 pr-2 py-1 border rounded bg-slate-50 text-[9px] w-32 outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-inner" />
             </div>
             {view === 'inventory' && userRole === 'admin' && <button onClick={() => setModal({ type: 'inventory_crud' })} className="btn-compact bg-slate-900 text-white shadow-md"><Plus size={12}/> Equipo</button>}
             {view === 'guides' && userRole === 'admin' && <button onClick={() => setModal({ type: 'guide_crud' })} className="btn-compact bg-slate-900 text-white shadow-md"><Plus size={12}/> Guía</button>}
             <button onClick={() => setModal({ type: 'register_flow' })} className="btn-compact bg-indigo-600 text-white shadow-lg"><Plus size={12}/> Nueva Visita</button>
          </div>
        </header>

        <div className="p-3 w-full">
          {notif && (
            <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-2xl flex items-center gap-2 z-[100] text-[10px] font-black animate-in fade-in border border-white/10">
              <CheckCircle2 size={14} className="text-emerald-400" /> {notif}
            </div>
          )}

          {view === 'visits' && (
            <div className="space-y-4">
               <div className="flex items-center justify-between bg-white p-2 rounded border shadow-sm">
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-slate-100 rounded border"><ChevronLeft size={12}/></button>
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded border font-black text-[10px]">
                      <Calendar size={10} className="text-indigo-600"/> {selectedDate}
                    </div>
                    <button onClick={() => changeDate(1)} className="p-1.5 hover:bg-slate-100 rounded border"><ChevronRight size={12}/></button>
                  </div>
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{filteredData.length} registros encontrados</span>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {paginatedData.map((visit: any) => {
                    const person = data.people.find((p:any)=>p.id === visit.personId);
                    const minutes = Math.floor((now.getTime() - new Date(visit.startTime).getTime()) / 60000);
                    return (
                      <div 
                        key={visit.id} 
                        onClick={() => setModal({ type: 'visit_details', visit })}
                        className={`card-base p-3 flex flex-col gap-3 cursor-pointer transition-all ${visit.status === 'finished' ? 'opacity-50 grayscale bg-slate-50' : 'hover:border-indigo-400 bg-white shadow-sm'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded flex items-center justify-center font-bold border text-[9px] uppercase">{person?.name?.charAt(0) || '?'}</div>
                          {visit.status === 'active' && <div className="text-right text-indigo-600 font-black text-[9px] flex items-center gap-1"><Timer size={10}/> {minutes}m</div>}
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-[10px] truncate leading-tight uppercase">{person?.name || 'Cargando...'}</p>
                          <p className="text-[7px] opacity-40 font-bold uppercase">{person?.document}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                             {visit.equipmentIds.map((eid: string) => <span key={eid} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[7px] font-black border border-indigo-100 flex items-center gap-1 uppercase leading-none">{eid}</span>)}
                             {visit.equipmentIds.length === 0 && <span className="text-[7px] opacity-30 uppercase font-black tracking-tighter">Sin equipos vinculados</span>}
                          </div>
                        </div>
                        {visit.status === 'active' && (
                          <div className="text-[8px] font-black uppercase text-center text-slate-400 py-1 bg-slate-50 rounded">Click para Gestionar</div>
                        )}
                      </div>
                    );
                  })}
               </div>
               <Pagination total={filteredData.length} current={currentPage} perPage={itemsPerPage} onChange={setCurrentPage} />
            </div>
          )}

          {view === 'inventory' && (
            <div className="card-base">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="table-header w-1/3">Audioguía</th>
                    <th className="table-header">Barcode</th>
                    <th className="table-header">Estado</th>
                    <th className="table-header text-right">Ficha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedData.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-2 font-black">
                           <Headphones size={14} className={item.status === 'in_use' ? 'text-amber-500' : 'text-slate-300'}/>
                           <div><p className="leading-none">{item.id}</p><p className="text-[8px] opacity-40 uppercase">{item.model}</p></div>
                        </div>
                      </td>
                      <td className="table-cell font-mono text-slate-400">{item.barcode}</td>
                      <td className="table-cell"><StatusBadge status={item.status} /></td>
                      <td className="table-cell text-right">
                         <button onClick={() => setModal({ type: 'equipment_details', item })} className="p-1 text-slate-400 hover:text-indigo-600"><FileText size={14}/></button>
                         {userRole === 'admin' && <button onClick={() => setModal({ type: 'inventory_crud', item })} className="p-1 ml-1 text-slate-200 hover:text-slate-600"><Edit2 size={12}/></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination total={filteredData.length} current={currentPage} perPage={itemsPerPage} onChange={setCurrentPage} />
            </div>
          )}
          {/* Secciones de personas y guías simplificadas para este Canvas */}
        </div>
      </main>

      {/* --- MODALES DINÁMICOS --- */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-300 animate-in zoom-in duration-150">
            <div className="px-3 py-2 bg-slate-900 text-white flex justify-between items-center shadow-md">
              <span className="text-[9px] font-black uppercase tracking-widest">{modal.type.replace('_', ' ')}</span>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-white/10 rounded"><X size={14}/></button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
               {modal.type === 'register_flow' && <UnifiedPersonForm peopleList={data.people} onSubmit={handleSaveVisitFlow} />}
               {modal.type === 'person_crud' && <UnifiedPersonForm item={modal.item} peopleList={data.people} title="Actualizar Persona" onSubmit={(fd:any) => handleSaveEntity('people', fd, modal.item?.id)} />}
               {modal.type === 'visit_details' && (
                 <div className="space-y-6">
                    <VisitDetails visit={modal.visit} data={data} updateData={updateData} triggerNotif={triggerNotif} guides={data.guides} />
                    <button onClick={() => handleFinishVisit(modal.visit.id)} className="w-full bg-slate-900 text-white py-3 rounded font-black text-[10px] uppercase shadow-lg hover:bg-red-600 transition-colors">Cerrar Visita y Recibir Todo</button>
                 </div>
               )}
               {modal.type === 'equipment_details' && <EquipmentSheet item={modal.item} data={data} updateData={updateData} refreshModal={(i:any)=>setModal({...modal, item:i})} />}
               {modal.type === 'inventory_crud' && <GenericForm type="inventory" item={modal.item} onSubmit={(fd:any) => handleSaveEntity('inventory', fd, modal.item?.id)} />}
               {modal.type === 'guide_crud' && <GenericForm type="guide" item={modal.item} onSubmit={(fd:any) => handleSaveEntity('guides', fd, modal.item?.id)} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- VISTAS DE SOPORTE ---

function LoginView({ onLogin }: any) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-xs w-full card-base p-10 text-center bg-white/5 border-white/10 backdrop-blur-xl">
        <div className="p-6 bg-white rounded-xl inline-flex text-slate-900 mb-8 shadow-2xl scale-125"><Headphones size={40}/></div>
        <h1 className="text-white font-black uppercase tracking-tighter text-3xl mb-10 leading-none">AudioPro Admin</h1>
        <div className="space-y-3">
          <button onClick={() => onLogin('admin')} className="w-full p-4 border border-white/10 rounded hover:bg-white hover:text-slate-900 text-white font-black uppercase text-[10px] tracking-widest transition-all">Administrador</button>
          <button onClick={() => onLogin('operator')} className="w-full p-4 border border-indigo-500/30 rounded bg-indigo-500/10 text-indigo-400 font-black uppercase text-[10px] tracking-widest transition-all hover:bg-indigo-500 hover:text-white">Operario</button>
        </div>
      </div>
    </div>
  );
}