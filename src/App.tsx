import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Headphones, ArrowRightLeft, LayoutDashboard, Download, 
  LogOut, CheckCircle2, CloudOff, AlertCircle, Database, UserPlus, 
  History, Settings, BarChart3, Printer, X, Plus, Save, Briefcase, 
  Wrench, FileText, Camera, Edit2, Trash2, RefreshCw, Upload, Globe, 
  ChevronLeft, ChevronRight, Menu, Hammer, Settings2, ShieldCheck,
  Timer, Scan, Phone, Mail, UserCheck, Calendar, Search, ListChecks
} from 'lucide-react';

// --- INTERFACES PARA TYPESCRIPT (REQUERIDO PARA VERCEL) ---
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
  settings: { logo: "https://via.placeholder.com/100?text=LOGO", terms: "El titular se compromete a devolver el equipo en perfecto estado...", appName: "AudioPro Admin" },
  syncMetadata: { lastSync: null, status: 'synced' },
  people: [
    { id: "P-101", name: "Carlos Perez", document: "12345678", country: "España", age: 34, email: "carlos@mail.com", phone: "600000000", type: 'visitor', code: "V001" }
  ],
  inventory: Array.from({ length: 25 }, (_, i) => ({
    id: `AG-${100 + i}`, model: i % 5 === 0 ? "Premium" : "Standard", status: "available", barcode: `${20000 + i}`, maintenanceLogs: [] 
  })),
  visits: [],
  guides: [
    { id: "G-101", name: "Elena Guía", license: "LIC-9988", phone: "555-0102", daysWorked: 12, type: 'guide' }
  ],
};

const APP_STORAGE_KEY = "AUDIOGUIDE_PRO_V7";

// --- SERVICIO DE PERSISTENCIA ---
const StorageService = {
  saveLocal(data: any) { localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data)); },
  loadLocal() {
    const saved = localStorage.getItem(APP_STORAGE_KEY);
    try {
      return saved ? JSON.parse(saved) : INITIAL_DATA;
    } catch {
      return INITIAL_DATA;
    }
  },
  async syncToCloud(data: any) { 
    return new Promise((res) => setTimeout(() => res(new Date().toISOString()), 600)); 
  }
};

// --- SUBCOMPONENTES DE UI ---

function NavItem({ icon, label, active, collapsed, onClick, color = "text-slate-400 hover:bg-white/5" }: any) {
  return (
    <button onClick={onClick} title={label} className={`w-full flex items-center ${collapsed ? 'justify-center' : 'px-4'} py-2 rounded transition-all font-bold text-[10px] uppercase tracking-wider ${active ? 'bg-indigo-600 text-white shadow-lg' : color}`}>
      {icon} {!collapsed && <span className="ml-3 truncate">{label}</span>}
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
  return <span className={`px-2 py-0.5 rounded-[3px] text-[8px] font-black border uppercase tracking-widest ${c.class}`}>{c.label}</span>;
}

function InputField({ label, ...props }: any) {
  return (
    <div className="w-full text-left">
      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{label}</label>
      <input className="input-base" {...props} />
    </div>
  );
}

function StatCard({ label, val, color, icon }: any) {
  return (
    <div className="bg-white p-3 card-base flex items-center justify-between border-slate-200 shadow-none">
      <div>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className={`text-xl font-black ${color.replace('bg-', 'text-')} leading-none`}>{val}</p>
      </div>
      <div className="opacity-10">{icon}</div>
    </div>
  );
}

function MaintBar({ label, val, max, color }: any) {
  const pct = max > 0 ? (val / max) * 100 : 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-2">
       <div className="w-full h-full bg-slate-50 rounded border relative flex items-end overflow-hidden">
         <div className={`w-full transition-all duration-700 ${color}`} style={{ height: `${pct}%` }} />
       </div>
       <span className="text-[8px] font-bold text-slate-400 uppercase text-center">{label}<br/>({val})</span>
    </div>
  );
}

// --- FORMULARIOS ESPECIALIZADOS ---

function PersonForm({ item, onSubmit, peopleList }: any) {
  const [formData, setFormData] = useState({
    code: item?.code || '',
    document: item?.document || '',
    name: item?.name || '',
    country: item?.country || 'Colombia',
    age: item?.age || '',
    phone: item?.phone || '',
    email: item?.email || '',
    type: 'visitor'
  });
  const [matches, setMatches] = useState<Person[]>([]);

  const handleDocBlur = () => {
    if (!formData.document) return;
    const found = peopleList.filter((p: Person) => p.document.includes(formData.document));
    if (found.length > 0 && !item) {
      setMatches(found);
    }
  };

  const selectPerson = (p: Person) => {
    setFormData({ ...formData, ...p });
    setMatches([]);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-3">
        <div className="bg-slate-50 p-3 rounded border border-indigo-100">
           <InputField 
              label="Código de Referencia" 
              value={formData.code} 
              onChange={(e: any) => setFormData({...formData, code: e.target.value})} 
              placeholder="Ej: SCAN-001"
           />
        </div>
        
        <div className="relative">
           <InputField 
              label="Cédula / Documento" 
              value={formData.document} 
              onBlur={handleDocBlur}
              onChange={(e: any) => setFormData({...formData, document: e.target.value})} 
              required 
           />
           {matches.length > 0 && (
             <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-indigo-200 shadow-xl rounded-md max-h-40 overflow-y-auto">
               <p className="p-2 text-[8px] font-black uppercase text-indigo-400 bg-indigo-50">Coincidencias encontradas:</p>
               {matches.map(p => (
                 <button key={p.id} type="button" onClick={() => selectPerson(p)} className="w-full text-left p-2 hover:bg-indigo-50 border-b last:border-0">
                    <p className="font-bold text-[10px]">{p.name}</p>
                    <p className="text-[9px] opacity-40 uppercase">{p.document}</p>
                 </button>
               ))}
               <button type="button" onClick={() => setMatches([])} className="w-full p-1 text-[8px] font-bold text-center text-slate-400">Cerrar sugerencias</button>
             </div>
           )}
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
          Guardar Registro
        </button>
      </form>
    </div>
  );
}

function GenericForm({ type, item, onSubmit }: any) {
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      const data: any = {};
      formData.forEach((value, key) => data[key] = value);
      onSubmit(data);
    }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {type === 'inventory' && (
          <>
            <div><label className="text-[8px] font-black uppercase text-slate-400">ID Equipo</label><input name="id" defaultValue={item?.id} disabled={!!item} className="input-base" required /></div>
            <div><label className="text-[8px] font-black uppercase text-slate-400">Barcode</label><input name="barcode" defaultValue={item?.barcode} className="input-base" required /></div>
            <div className="col-span-2"><label className="text-[8px] font-black uppercase text-slate-400">Modelo</label><input name="model" defaultValue={item?.model || 'Standard'} className="input-base" required /></div>
          </>
        )}
        {type === 'guide' && (
          <>
            <div className="col-span-2"><label className="text-[8px] font-black uppercase text-slate-400">Nombre del Guía</label><input name="name" defaultValue={item?.name} className="input-base" required /></div>
            <div><label className="text-[8px] font-black uppercase text-slate-400">Licencia</label><input name="license" defaultValue={item?.license} className="input-base" required /></div>
            <div><label className="text-[8px] font-black uppercase text-slate-400">Teléfono</label><input name="phone" defaultValue={item?.phone} className="input-base" required /></div>
            <div><label className="text-[8px] font-black uppercase text-slate-400">Días Laborados</label><input name="daysWorked" type="number" defaultValue={item?.daysWorked || 0} className="input-base" required /></div>
          </>
        )}
      </div>
      <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded font-black text-[10px] uppercase mt-4 tracking-widest hover:bg-indigo-600 transition-colors">Guardar Datos</button>
    </form>
  );
}

// --- VISTAS PRINCIPALES ---

function StatusDashboard({ data }: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="En Uso" val={data.inventory.filter((i:any)=>i.status==='in_use').length} color="bg-amber-500" icon={<History size={16}/>} />
        <StatCard label="Libres" val={data.inventory.filter((i:any)=>i.status==='available').length} color="bg-emerald-500" icon={<CheckCircle2 size={16}/>} />
        <StatCard label="Taller" val={data.inventory.filter((i:any)=>i.status.includes('maint')).length} color="bg-slate-400" icon={<Wrench size={16}/>} />
        <StatCard label="Total Hoy" val={data.loans.length} color="bg-indigo-600" icon={<Database size={16}/>} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[280px]">
         <div className="card-base p-6 flex flex-col h-full">
            <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-6">Estado Inventario</h4>
            <div className="flex-1 flex items-end gap-6">
               <MaintBar label="Cola" val={data.inventory.filter((i:any)=>i.status==='maint_pending').length} max={data.inventory.length} color="bg-slate-200" />
               <MaintBar label="Taller" val={data.inventory.filter((i:any)=>i.status==='maint_repair').length} max={data.inventory.length} color="bg-red-400" />
               <MaintBar label="Calidad" val={data.inventory.filter((i:any)=>i.status==='maint_qc').length} max={data.inventory.length} color="bg-indigo-400" />
            </div>
         </div>
         <div className="bg-slate-900 p-6 rounded text-white h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><LayoutDashboard size={80}/></div>
            <h4 className="text-indigo-400 font-black text-[9px] uppercase tracking-widest mb-4">Última Actividad</h4>
            <div className="space-y-2 overflow-y-auto max-h-40 custom-scrollbar pr-2">
              {data.visits.slice(-8).reverse().map((l:any)=>(
                <div key={l.id} className="text-[10px] flex justify-between p-2 border-b border-white/5 last:border-0">
                  <span className="font-bold">{l.equipmentIds?.[0] || 'N/A'}</span>
                  <span className="opacity-40">{l.startTime?.slice(11, 16) || '--:--'}</span>
                </div>
              ))}
              {data.visits.length === 0 && <p className="text-[10px] opacity-30 italic">Sin actividad reciente</p>}
            </div>
         </div>
      </div>
    </div>
  );
}

// --- COMPONENTE APP ---

export default function App() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [data, setData] = useState<any>(INITIAL_DATA);
  const [view, setView] = useState('visits');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [notif, setNotif] = useState<string | null>(null);
  const [modal, setModal] = useState<any>(null);
  const [printData, setPrintData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [now, setNow] = useState(new Date());

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

  const handleSavePerson = (person: any) => {
    let updatedPeople = [...data.people];
    const pIdx = updatedPeople.findIndex(p => p.id === person.id || p.document === person.document);
    if (pIdx > -1) updatedPeople[pIdx] = { ...updatedPeople[pIdx], ...person };
    else updatedPeople.push({ ...person, id: person.id || `P-${Date.now()}`, type: 'visitor' });
    
    updateData({ ...data, people: updatedPeople });
    setModal(null);
    triggerNotif("Persona guardada");
  };

  const handleSaveGuide = (guide: any) => {
    let updatedGuides = [...data.guides];
    const gIdx = updatedGuides.findIndex(g => g.id === guide.id);
    if (gIdx > -1) updatedGuides[gIdx] = { ...updatedGuides[gIdx], ...guide };
    else updatedGuides.push({ ...guide, id: `G-${Date.now()}`, type: 'guide' });
    
    updateData({ ...data, guides: updatedGuides });
    setModal(null);
    triggerNotif("Guía registrado");
  };

  const handleSaveInventory = (item: any) => {
    let updatedInv = [...data.inventory];
    const iIdx = updatedInv.findIndex(i => i.id === item.id);
    if (iIdx > -1) updatedInv[iIdx] = { ...updatedInv[iIdx], ...item };
    else updatedInv.push({ ...item, status: 'available', maintenanceLogs: [] });
    
    updateData({ ...data, inventory: updatedInv });
    setModal(null);
    triggerNotif("Equipo actualizado");
  };

  const handleDelete = (type: string, id: string) => {
    if (!window.confirm("¿Confirmas la eliminación definitiva?")) return;
    updateData({ ...data, [type]: data[type].filter((item: any) => item.id !== id) });
    triggerNotif("Eliminado");
  };

  const handleFinishVisit = (visitId: string) => {
    const visit = data.visits.find((v: any) => v.id === visitId);
    if (!visit) return;
    const newInventory = data.inventory.map((i: any) => visit.equipmentIds.includes(i.id) ? { ...i, status: 'available', currentVisitId: null } : i);
    const newVisits = data.visits.map((v: any) => v.id === visitId ? { ...v, status: 'finished', endTime: new Date().toISOString() } : v);
    updateData({ ...data, inventory: newInventory, visits: newVisits });
    triggerNotif("Visita Finalizada");
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  if (!userRole) return <LoginView onLogin={setUserRole} />;

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-100 font-sans text-slate-900">
      <aside className={`${isMenuCollapsed ? 'w-14' : 'w-52'} bg-slate-900 text-white flex flex-col transition-all duration-300 border-r border-slate-800 shrink-0`}>
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          {!isMenuCollapsed && <span className="font-black text-[10px] uppercase truncate opacity-60 tracking-widest">{data.settings.appName}</span>}
          <button onClick={() => setIsMenuCollapsed(!isMenuCollapsed)} className="p-1 hover:bg-white/10 rounded mx-auto"><ChevronLeft size={14} className={isMenuCollapsed ? 'rotate-180' : ''}/></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          <NavItem icon={<UserCheck size={16}/>} label="Visitas" active={view==='visits'} collapsed={isMenuCollapsed} onClick={() => setView('visits')} />
          <NavItem icon={<Headphones size={16}/>} label="Inventario" active={view==='inventory'} collapsed={isMenuCollapsed} onClick={() => setView('inventory')} />
          <NavItem icon={<Users size={16}/>} label="Personas" active={view==='people'} collapsed={isMenuCollapsed} onClick={() => setView('people')} />
          <NavItem icon={<Briefcase size={16}/>} label="Guías" active={view==='guides'} collapsed={isMenuCollapsed} onClick={() => setView('guides')} />
          {userRole === 'admin' && (
            <div className="pt-4 border-t border-white/5 mt-2">
              <NavItem icon={<BarChart3 size={16}/>} label="Métricas" active={view==='stats'} collapsed={isMenuCollapsed} onClick={() => setView('stats')} />
              <NavItem icon={<Settings size={16}/>} label="Ajustes" active={view==='settings'} collapsed={isMenuCollapsed} onClick={() => setView('settings')} />
            </div>
          )}
        </div>
        <div className="p-2 border-t border-white/5 bg-black/20">
           <NavItem icon={<LogOut size={16}/>} label="Salir" collapsed={isMenuCollapsed} onClick={() => setUserRole(null)} color="text-red-400 hover:bg-red-500/10" />
           {!isMenuCollapsed && (
             <div className="px-2 py-1 flex items-center justify-between mt-1 border-t border-white/5 pt-2">
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${data.syncMetadata.status === 'synced' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                  <span className="text-[7px] font-black opacity-30 uppercase tracking-tighter">Sync</span>
                </div>
                <button onClick={() => handleSync()} className="text-slate-500 hover:text-white"><RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''}/></button>
             </div>
           )}
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto custom-scrollbar flex flex-col bg-slate-50/50">
        <header className="h-12 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {userRole} <ChevronRight size={10}/> <span className="text-slate-900">{view}</span>
          </div>
          <div className="flex gap-2">
             {view === 'inventory' && userRole === 'admin' && <button onClick={() => setModal({ type: 'inventory_crud' })} className="btn-compact bg-slate-900 text-white shadow-md shadow-slate-200"><Plus size={12}/> Equipo</button>}
             {view === 'guides' && userRole === 'admin' && <button onClick={() => setModal({ type: 'guide_crud' })} className="btn-compact bg-slate-900 text-white shadow-md shadow-slate-200"><Plus size={12}/> Guía</button>}
             {view === 'people' && <button onClick={() => setModal({ type: 'person_crud' })} className="btn-compact bg-indigo-600 text-white shadow-md shadow-indigo-200"><Plus size={12}/> Persona</button>}
          </div>
        </header>

        <div className="p-4 w-full">
          {notif && (
            <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-2xl flex items-center gap-2 z-50 text-[10px] font-black animate-in fade-in border border-white/10">
              <CheckCircle2 size={14} className="text-emerald-400" /> {notif}
            </div>
          )}

          {view === 'status' && <StatusDashboard data={data} />}

          {view === 'visits' && (
            <div className="space-y-4">
               <div className="flex items-center justify-between bg-white p-2 rounded-lg border shadow-sm">
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-slate-100 rounded border"><ChevronLeft size={14}/></button>
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded border font-black text-xs">
                      <Calendar size={12} className="text-indigo-600"/> {selectedDate}
                    </div>
                    <button onClick={() => changeDate(1)} className="p-1.5 hover:bg-slate-100 rounded border"><ChevronRight size={14}/></button>
                  </div>
                  <div className="flex gap-4 text-[9px] font-black uppercase text-slate-400">
                     <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-600"/> Activas: {data.visits.filter((v:any)=>v.date === selectedDate && v.status==='active').length}</span>
                  </div>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {data.visits.filter((v:any)=>v.date === selectedDate).sort((a:any, b:any) => b.startTime.localeCompare(a.startTime)).map((visit: any) => {
                    const person = data.people.find((p:any)=>p.id === visit.personId);
                    const minutes = Math.floor((now.getTime() - new Date(visit.startTime).getTime()) / 60000);
                    return (
                      <div key={visit.id} className={`card-base p-3 flex flex-col gap-3 transition-all ${visit.status === 'finished' ? 'opacity-50 grayscale bg-slate-50' : 'hover:border-indigo-400 bg-white'}`}>
                        <div className="flex justify-between items-start">
                          <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded flex items-center justify-center font-bold border text-[10px]">{person?.name?.charAt(0) || '?'}</div>
                          {visit.status === 'active' && <div className="text-right text-indigo-600 font-black text-[9px] flex items-center gap-1"><Timer size={12}/> {minutes}m</div>}
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-[11px] truncate mb-0.5 leading-tight">{person?.name || 'Cargando...'}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                             {visit.equipmentIds.map((eid: string) => (
                               <span key={eid} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[8px] font-black border border-indigo-100 flex items-center gap-1 uppercase leading-none"><Headphones size={8}/> {eid}</span>
                             ))}
                          </div>
                        </div>
                        {visit.status === 'active' && (
                          <button onClick={() => handleFinishVisit(visit.id)} className="w-full bg-indigo-600 text-white py-1.5 rounded text-[9px] font-black uppercase hover:bg-red-600 transition-colors">Finalizar</button>
                        )}
                      </div>
                    );
                  })}
               </div>
            </div>
          )}

          {view === 'inventory' && (
            <div className="card-base">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="table-header w-1/3">Audioguía</th>
                    <th className="table-header">Barcode</th>
                    <th className="table-header">Estado</th>
                    <th className="table-header text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.inventory.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                           <Headphones size={14} className={item.status === 'in_use' ? 'text-amber-500' : 'text-slate-300'}/>
                           <div><p className="font-bold leading-none">{item.id}</p><p className="text-[9px] opacity-40 uppercase font-black">{item.model}</p></div>
                        </div>
                      </td>
                      <td className="table-cell font-mono text-slate-400">{item.barcode}</td>
                      <td className="table-cell"><StatusBadge status={item.status} /></td>
                      <td className="table-cell text-right">
                         <button onClick={() => setModal({ type: 'equipment_details', item })} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"><FileText size={14}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === 'people' && (
            <div className="card-base">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="table-header">Visitante</th>
                    <th className="table-header">Doc / Cédula</th>
                    <th className="table-header text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.people.filter((p:any)=>p.type==='visitor').map((p: any) => (
                    <tr key={p.id}>
                      <td className="table-cell font-black">{p.name}</td>
                      <td className="table-cell text-slate-400">{p.document}</td>
                      <td className="table-cell text-right space-x-1">
                        <button onClick={() => setModal({ type: 'person_crud', item: p })} className="p-1 border rounded hover:bg-slate-100"><Edit2 size={12}/></button>
                        <button onClick={() => handleDelete('people', p.id)} className="p-1 border rounded hover:bg-red-50 text-red-400"><Trash2 size={12}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === 'guides' && (
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
               {data.guides.map((g: any) => (
                  <div key={g.id} className="card-base p-4 border-l-4 border-l-amber-500 flex flex-col gap-4">
                     <div>
                        <h3 className="font-black text-xs uppercase mb-1 leading-none">{g.name}</h3>
                        <p className="text-[9px] opacity-40 font-bold uppercase">{g.license}</p>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => setModal({ type: 'guide_crud', item: g })} className="flex-1 btn-compact bg-slate-100 border">Editar</button>
                        <button onClick={() => handleDelete('guides', g.id)} className="btn-compact border text-red-400 hover:bg-red-50"><Trash2 size={12}/></button>
                     </div>
                  </div>
               ))}
            </div>
          )}
        </div>
      </main>

      {/* --- MODALES DINÁMICOS --- */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-300 animate-in zoom-in duration-150">
            <div className="px-4 py-2 bg-slate-900 text-white flex justify-between items-center">
              <span className="text-[9px] font-black uppercase tracking-widest">{modal.type.replace('_', ' ')}</span>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-white/10 rounded"><X size={14}/></button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-white">
               {modal.type === 'person_crud' && <PersonForm item={modal.item} peopleList={data.people} onSubmit={handleSavePerson} />}
               {modal.type === 'guide_crud' && <GenericForm type="guide" item={modal.item} onSubmit={handleSaveGuide} />}
               {modal.type === 'inventory_crud' && <GenericForm type="inventory" item={modal.item} onSubmit={handleSaveInventory} />}
               {modal.type === 'equipment_details' && <EquipmentSheet item={modal.item} data={data} updateData={updateData} refreshModal={(i:any)=>setModal({...modal, item:i})} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- VISTAS DE SOPORTE ---

function EquipmentSheet({ item, data, updateData, refreshModal }: any) {
  const changeStatus = (st: string) => {
    const newInv = data.inventory.map((i: any) => i.id === item.id ? { ...i, status: st } : i);
    updateData({ ...data, inventory: newInv });
    refreshModal(newInv.find((i:any)=>i.id===item.id));
  };
  return (
    <div className="space-y-4">
       <div className="bg-slate-50 p-3 rounded border">
          <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Estado</p>
          <div className="grid grid-cols-3 gap-2">
            {['available', 'maint_repair', 'maint_qc'].map(s => (
              <button key={s} onClick={() => changeStatus(s)} className={`px-2 py-1 rounded border text-[8px] font-black uppercase ${item.status === s ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>{s.replace('maint_', '')}</button>
            ))}
          </div>
       </div>
       <div className="max-h-32 overflow-y-auto custom-scrollbar border p-2 rounded text-[10px]">
          <p className="font-black uppercase opacity-30 text-[8px] mb-2">Logs Técnicos</p>
          {item.maintenanceLogs.map((l:any) => <div key={l.id} className="mb-2 border-l-2 border-indigo-400 pl-2"><strong>{l.date}</strong>: {l.notes}</div>)}
       </div>
    </div>
  );
}

function LoginView({ onLogin }: any) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-xs w-full card-base p-10 text-center bg-white/5 border-white/10 backdrop-blur-xl">
        <div className="p-6 bg-white rounded-2xl inline-flex text-slate-900 mb-8 shadow-2xl scale-125"><Headphones size={40}/></div>
        <h1 className="text-white font-black uppercase tracking-tighter text-2xl mb-8 leading-none">AudioPro Admin</h1>
        <div className="space-y-3">
          <button onClick={() => onLogin('admin')} className="w-full p-3.5 border border-white/10 rounded hover:bg-white hover:text-slate-900 text-white font-black uppercase text-[10px] tracking-widest transition-all">Administrador</button>
          <button onClick={() => onLogin('operator')} className="w-full p-3.5 border border-indigo-500/30 rounded bg-indigo-500/10 text-indigo-400 font-black uppercase text-[10px] tracking-widest transition-all hover:bg-indigo-500 hover:text-white">Operario</button>
        </div>
      </div>
    </div>
  );
}