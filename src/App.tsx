import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Headphones, ArrowRightLeft, LayoutDashboard, Download, 
  LogOut, CheckCircle2, CloudOff, AlertCircle, Database, UserPlus, 
  History, Settings, BarChart3, Printer, X, Plus, Save, Briefcase, 
  Wrench, FileText, Camera, Edit2, Trash2, RefreshCw, Upload, Globe, 
  ChevronLeft, ChevronRight, Menu, Hammer, Settings2, ShieldCheck,
  Timer, Scan, Phone, Mail, UserCheck, Calendar, Search, ListChecks,
  SortAsc, SortDesc, Filter, MoreHorizontal
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

// --- SUBCOMPONENTES DE UI (DEFINIDOS ARRIBA PARA EVITAR ERRORES DE HOISTING) ---

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
  return <span className={`px-1.5 py-0.5 rounded-[3px] text-[7px] font-black border uppercase tracking-widest ${c.class}`}>{c.label}</span>;
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
       <span className="text-[8px] font-bold text-slate-400 uppercase text-center leading-none">{label}<br/>({val})</span>
    </div>
  );
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

const APP_STORAGE_KEY = "AUDIOGUIDE_PRO_V9";

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
  const [now, setNow] = useState(new Date());

  // Estados de Tabla (Búsqueda, Orden, Paginación)
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
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

  // --- LÓGICA DE NEGOCIO ---

  const handleEntityCRUD = (e: React.FormEvent, type: string, id: string | null = null) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const obj: any = { id: id || `${type.charAt(0).toUpperCase()}-${Date.now()}` };
    formData.forEach((value, key) => { obj[key] = value; });

    let newCollection;
    if (id) {
      newCollection = data[type].map((v: any) => v.id === id ? { ...v, ...obj } : v);
    } else {
      if (type === 'inventory') { obj.status = 'available'; obj.maintenanceLogs = []; }
      newCollection = [...data[type], obj];
    }
    updateData({ ...data, [type]: newCollection });
    setModal(null);
    triggerNotif("Guardado");
  };

  const handleCreateVisit = (person: any, barcodes: string[], guideId?: string) => {
    let updatedPeople = [...data.people];
    const pIdx = updatedPeople.findIndex(p => p.document === person.document);
    let finalPersonId = "";

    if (pIdx > -1) {
      updatedPeople[pIdx] = { ...updatedPeople[pIdx], ...person };
      finalPersonId = updatedPeople[pIdx].id;
    } else {
      const newPerson = { ...person, id: `P-${Date.now()}`, type: 'visitor' };
      updatedPeople.push(newPerson);
      finalPersonId = newPerson.id;
    }

    const newVisit: Visit = {
      id: `VIS-${Date.now()}`,
      personId: finalPersonId,
      equipmentIds: barcodes.map(bc => data.inventory.find((i:any)=>i.barcode === bc).id),
      startTime: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      status: 'active',
      guideId
    };

    const newInventory = data.inventory.map((i: any) => 
      barcodes.includes(i.barcode) ? { ...i, status: 'in_use', currentVisitId: newVisit.id } : i
    );
    
    updateData({ ...data, people: updatedPeople, visits: [...data.visits, newVisit], inventory: newInventory });
    setModal(null);
    triggerNotif("Visita registrada");
  };

  const handleFinishVisit = (visitId: string) => {
    const visit = data.visits.find((v: any) => v.id === visitId);
    if (!visit) return;
    const newInventory = data.inventory.map((i: any) => visit.equipmentIds.includes(i.id) ? { ...i, status: 'available', currentVisitId: null } : i);
    const newVisits = data.visits.map((v: any) => v.id === visitId ? { ...v, status: 'finished', endTime: new Date().toISOString() } : v);
    updateData({ ...data, inventory: newInventory, visits: newVisits });
    triggerNotif("Equipos recibidos");
  };

  const handleDelete = (type: string, id: string) => {
    if (!window.confirm("¿Seguro de eliminar definitivamente?")) return;
    updateData({ ...data, [type]: data[type].filter((item: any) => item.id !== id) });
  };

  // --- LÓGICA DE TABLAS ---
  const filteredData = useMemo(() => {
    let result = [...(data[view === 'visits' ? 'visits' : view] || [])];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item: any) => JSON.stringify(item).toLowerCase().includes(q));
    }
    result.sort((a: any, b: any) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [data, view, searchQuery, sortConfig]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const requestSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  if (!userRole) return <LoginView onLogin={setUserRole} />;

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-100 font-sans text-slate-900 selection:bg-indigo-100">
      {/* Sidebar */}
      <aside className={`${isMenuCollapsed ? 'w-12' : 'w-48'} bg-slate-900 text-white flex flex-col transition-all duration-200 border-r border-slate-800 shrink-0`}>
        <div className="p-3 flex items-center justify-between border-b border-white/5">
          {!isMenuCollapsed && <span className="font-black text-[10px] uppercase truncate opacity-50 tracking-widest leading-none">{data.settings.appName}</span>}
          <button onClick={() => setIsMenuCollapsed(!isMenuCollapsed)} className="p-1 hover:bg-white/10 rounded mx-auto"><Menu size={14}/></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
          <NavItem icon={<UserCheck size={14}/>} label="Visitas" active={view==='visits'} collapsed={isMenuCollapsed} onClick={() => setView('visits')} />
          <NavItem icon={<Headphones size={14}/>} label="Inventario" active={view==='inventory'} collapsed={isMenuCollapsed} onClick={() => setView('inventory')} />
          <NavItem icon={<Users size={14}/>} label="Personas" active={view==='people'} collapsed={isMenuCollapsed} onClick={() => setView('people')} />
          <NavItem icon={<Briefcase size={14}/>} label="Guías" active={view==='guides'} collapsed={isMenuCollapsed} onClick={() => setView('guides')} />
          {userRole === 'admin' && (
            <div className="pt-3 border-t border-white/5 mt-2 space-y-0.5">
              <NavItem icon={<BarChart3 size={14}/>} label="Métricas" active={view==='stats'} collapsed={isMenuCollapsed} onClick={() => setView('stats')} />
              <NavItem icon={<Settings size={14}/>} label="Ajustes" active={view==='settings'} collapsed={isMenuCollapsed} onClick={() => setView('settings')} />
            </div>
          )}
        </div>
        <div className="mt-auto p-1.5 border-t border-white/5 bg-black/20">
           <NavItem icon={<LogOut size={14}/>} label="Salir" collapsed={isMenuCollapsed} onClick={() => setUserRole(null)} color="text-red-400 hover:bg-red-500/10" />
           {!isMenuCollapsed && (
             <div className="px-2 py-1 flex items-center justify-between mt-1 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${data.syncMetadata.status === 'synced' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                  <span className="text-[7px] font-black opacity-30 uppercase">Sinc: OK</span>
                </div>
                <button onClick={() => handleSync()} className="text-slate-500 hover:text-white"><RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''}/></button>
             </div>
           )}
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 h-screen overflow-y-auto custom-scrollbar flex flex-col bg-slate-50/50">
        <header className="h-10 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-widest">
            {userRole} <ChevronRight size={10}/> <span className="text-slate-900">{view}</span>
          </div>
          <div className="flex gap-2">
             <div className="relative flex items-center mr-2">
                <Search size={10} className="absolute left-2 text-slate-400"/>
                <input type="text" placeholder="Búsqueda rápida..." value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="pl-6 pr-2 py-1 border rounded bg-slate-50 text-[9px] w-32 outline-none focus:border-indigo-400 focus:bg-white" />
             </div>
             {view === 'inventory' && userRole === 'admin' && <button onClick={() => setModal({ type: 'inventory_crud' })} className="btn-compact bg-slate-900 text-white shadow-sm"><Plus size={10}/> Equipo</button>}
             {view === 'guides' && userRole === 'admin' && <button onClick={() => setModal({ type: 'guide_crud' })} className="btn-compact bg-slate-900 text-white shadow-sm"><Plus size={10}/> Guía</button>}
             <button onClick={() => setModal({ type: 'register_flow' })} className="btn-compact bg-indigo-600 text-white shadow-md"><Plus size={10}/> Nueva Visita</button>
          </div>
        </header>

        <div className="p-3">
          {notif && (
            <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-2xl flex items-center gap-2 z-[100] text-[9px] font-black animate-in fade-in border border-white/10">
              <CheckCircle2 size={12} className="text-emerald-400" /> {notif}
            </div>
          )}

          {view === 'status' && <StatusDashboard data={data} />}

          {view === 'visits' && (
            <div className="space-y-4">
               <div className="flex items-center justify-between bg-white p-2 rounded border shadow-sm">
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeDate(-1)} className="p-1 hover:bg-slate-100 rounded border"><ChevronLeft size={12}/></button>
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded border font-black text-[10px]">
                      <Calendar size={10} className="text-indigo-600"/> {selectedDate}
                    </div>
                    <button onClick={() => changeDate(1)} className="p-1 hover:bg-slate-100 rounded border"><ChevronRight size={12}/></button>
                  </div>
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Día Actual: {data.visits.filter((v:any)=>v.date === selectedDate).length} registros</span>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {paginatedData.map((visit: any) => {
                    const person = data.people.find((p:any)=>p.id === visit.personId);
                    const minutes = Math.floor((now.getTime() - new Date(visit.startTime).getTime()) / 60000);
                    return (
                      <div key={visit.id} className={`card-base p-2.5 flex flex-col gap-3 transition-all ${visit.status === 'finished' ? 'opacity-40 grayscale bg-slate-50' : 'hover:border-indigo-400 bg-white shadow-sm'}`}>
                        <div className="flex justify-between items-start">
                          <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded flex items-center justify-center font-bold border text-[9px] uppercase">{person?.name?.charAt(0) || '?'}</div>
                          {visit.status === 'active' && <div className="text-right text-indigo-600 font-black text-[9px] flex items-center gap-1 leading-none"><Timer size={10}/> {minutes}m</div>}
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-[10px] truncate leading-tight uppercase">{person?.name || 'Cargando...'}</p>
                          <p className="text-[7px] opacity-40 font-bold uppercase">{person?.document}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                             {visit.equipmentIds.map((eid: string) => <span key={eid} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[7px] font-black border border-indigo-100 flex items-center gap-1 leading-none"><Headphones size={8}/> {eid}</span>)}
                          </div>
                        </div>
                        {visit.status === 'active' && <button onClick={() => handleFinishVisit(visit.id)} className="w-full bg-slate-900 text-white py-1.5 rounded text-[8px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors">Recibir</button>}
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
                <thead>
                  <tr>
                    <th className="table-header w-1/3" onClick={() => requestSort('id')}>Audioguía {sortConfig.key==='id' && (sortConfig.direction==='asc'?<SortAsc size={8}/>:<SortDesc size={8}/>)}</th>
                    <th className="table-header" onClick={() => requestSort('barcode')}>Barcode</th>
                    <th className="table-header" onClick={() => requestSort('status')}>Estado</th>
                    <th className="table-header text-right">Ficha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-cell"><div className="flex items-center gap-2 py-0.5 font-bold leading-none"><Headphones size={12} className="opacity-30"/> {item.id} <span className="text-[8px] opacity-20 uppercase font-black">{item.model}</span></div></td>
                      <td className="table-cell font-mono text-slate-400 text-[9px]">{item.barcode}</td>
                      <td className="table-cell"><StatusBadge status={item.status} /></td>
                      <td className="table-cell text-right"><button onClick={() => setModal({ type: 'equipment_sheet', item })} className="p-1 hover:text-indigo-600"><FileText size={14}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination total={filteredData.length} current={currentPage} perPage={itemsPerPage} onChange={setCurrentPage} />
            </div>
          )}

          {view === 'people' && (
            <div className="card-base">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="table-header">Visitante</th>
                    <th className="table-header text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.filter((p:any)=>p.type==='visitor').map((p: any) => (
                    <tr key={p.id}>
                      <td className="table-cell font-black uppercase">{p.name} <span className="opacity-30 ml-2 font-bold">{p.document}</span></td>
                      <td className="table-cell text-right space-x-1">
                        <button onClick={() => setModal({ type: 'person_crud', item: p })} className="p-1 border rounded hover:bg-slate-50"><Edit2 size={12}/></button>
                        <button onClick={() => handleDelete('people', p.id)} className="p-1 border rounded text-red-300 hover:text-red-500"><Trash2 size={12}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* --- MODALES DINÁMICOS --- */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-300 animate-in zoom-in duration-150">
            <div className="px-3 py-2 bg-slate-900 text-white flex justify-between items-center">
              <span className="text-[8px] font-black uppercase tracking-widest leading-none">{modal.type.replace('_', ' ')}</span>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-white/10 rounded"><X size={14}/></button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
               {modal.type === 'person_crud' && <PersonForm item={modal.item} peopleList={data.people} onSubmit={handleSavePerson} />}
               {modal.type === 'register_flow' && <RegisterFlow onComplete={handleCreateVisit} data={data} triggerNotif={triggerNotif} />}
               {modal.type === 'inventory_crud' && <GenericForm type="inventory" item={modal.item} onSubmit={handleSaveInventory} />}
               {modal.type === 'guide_crud' && <GenericForm type="guide" item={modal.item} onSubmit={handleSaveGuide} />}
               {modal.type === 'equipment_sheet' && <EquipmentSheet item={modal.item} data={data} updateData={updateData} refreshModal={(i:any)=>setModal({...modal, item:i})} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // --- HANDLERS INTERNOS ---

  function handleSavePerson(person: any) {
    let updatedPeople = [...data.people];
    const pIdx = updatedPeople.findIndex(p => p.document === person.document);
    if (pIdx > -1) updatedPeople[pIdx] = { ...updatedPeople[pIdx], ...person };
    else updatedPeople.push({ ...person, id: `P-${Date.now()}`, type: 'visitor' });
    updateData({ ...data, people: updatedPeople });
    setModal(null);
  }

  function handleSaveGuide(guide: any) {
    let updatedGuides = [...data.guides];
    const gIdx = updatedGuides.findIndex(g => g.id === guide.id);
    if (gIdx > -1) updatedGuides[gIdx] = { ...updatedGuides[gIdx], ...guide };
    else updatedGuides.push({ ...guide, id: `G-${Date.now()}`, type: 'guide' });
    updateData({ ...data, guides: updatedGuides });
    setModal(null);
  }

  function handleSaveInventory(item: any) {
    let updatedInv = [...data.inventory];
    const iIdx = updatedInv.findIndex(i => i.id === item.id);
    if (iIdx > -1) updatedInv[iIdx] = { ...updatedInv[iIdx], ...item };
    else updatedInv.push({ ...item, status: 'available', maintenanceLogs: [] });
    updateData({ ...data, inventory: updatedInv });
    setModal(null);
  }
}

// --- COMPONENTES AUXILIARES ---

function PersonForm({ item, onSubmit, peopleList }: any) {
  const [formData, setFormData] = useState({
    code: item?.code || '', document: item?.document || '',
    name: item?.name || '', country: item?.country || 'Colombia',
    age: item?.age || '', phone: item?.phone || '',
    email: item?.email || '', type: 'visitor'
  });
  const [matches, setMatches] = useState<Person[]>([]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-3">
      <InputField label="Código Referencia" value={formData.code} onChange={(e: any) => setFormData({...formData, code: e.target.value})} />
      <div className="relative">
        <InputField label="Documento / Cédula" value={formData.document} required 
          onBlur={() => {
            if(!formData.document) return;
            const found = peopleList.filter((p: any) => p.document.includes(formData.document));
            if(found.length && !item) setMatches(found);
          }}
          onChange={(e: any) => setFormData({...formData, document: e.target.value})} />
        {matches.length > 0 && (
          <div className="absolute z-50 left-0 right-0 bg-white border border-indigo-200 shadow-xl rounded mt-1 max-h-32 overflow-y-auto">
             {matches.map(p => <button key={p.id} type="button" onClick={() => { setFormData({...formData, ...p}); setMatches([]); }} className="w-full text-left p-1.5 hover:bg-indigo-50 border-b text-[9px] font-bold uppercase">{p.name}</button>)}
             <button type="button" onClick={() => setMatches([])} className="w-full py-1 bg-slate-100 text-[7px] font-black uppercase">Cerrar sugerencias</button>
          </div>
        )}
      </div>
      <InputField label="Nombre Completo" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} required />
      <div className="grid grid-cols-2 gap-2">
        <InputField label="País" value={formData.country} onChange={(e: any) => setFormData({...formData, country: e.target.value})} />
        <InputField label="Edad" type="number" value={formData.age} onChange={(e: any) => setFormData({...formData, age: e.target.value})} />
      </div>
      <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded font-black text-[9px] uppercase mt-4">Guardar Persona</button>
    </form>
  );
}

function RegisterFlow({ onComplete, data, triggerNotif }: any) {
  const [step, setStep] = useState(1);
  const [person, setPerson] = useState<any>(null);
  const [scanValue, setScanValue] = useState('');
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanValue) return;
    const matches = data.people.filter((p:any) => p.name.toLowerCase().includes(scanValue.toLowerCase()) || p.document.includes(scanValue));
    if (matches.length === 1 && scanValue.length > 4) { setPerson(matches[0]); setStep(2); }
    else if (matches.length > 1) { /* multiple match logic placeholder */ }
    else { setPerson({ document: scanValue, name: '', phone: '', email: '', country: 'Colombia', age: 25, type: 'visitor' }); setStep(1.5); }
    setScanValue('');
  };

  const addBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    const bcInput = (e.target as any).bcInput;
    const bc = bcInput.value;
    if(!bc) return;
    const eq = data.inventory.find((i:any)=>i.barcode === bc);
    if(!eq) return triggerNotif("No existe");
    if(eq.status !== 'available') return triggerNotif("No libre");
    if(!selectedBarcodes.includes(bc)) setSelectedBarcodes([...selectedBarcodes, bc]);
    bcInput.value = "";
  };

  if (step === 1) return (
    <div className="p-6 border-2 border-dashed rounded bg-slate-50 flex flex-col items-center gap-3 border-indigo-100">
       <Scan size={24} className="text-indigo-400"/>
       <p className="text-[10px] font-black uppercase text-indigo-900 text-center">Escanear Documento o Nombre</p>
       <form onSubmit={handleLookup} className="w-full"><input autoFocus className="input-base text-center h-10 text-lg font-black uppercase" placeholder="BUSCAR..." /></form>
    </div>
  );

  if (step === 1.5) return (
    <form onSubmit={(e: any) => { e.preventDefault(); setStep(2); }} className="space-y-2 text-left">
       <InputField label="Nombre Completo" value={person.name} onChange={(e:any)=>setPerson({...person, name:e.target.value})} required />
       <InputField label="Documento" value={person.document} onChange={(e:any)=>setPerson({...person, document:e.target.value})} required />
       <button type="submit" className="w-full bg-slate-900 text-white py-2 rounded text-[9px] font-black uppercase mt-3">Continuar Equipos</button>
    </form>
  );

  return (
    <div className="space-y-4">
       <div className="bg-slate-50 p-2 rounded border border-indigo-100 flex justify-between items-center">
          <div className="font-black text-[9px] uppercase leading-none">{person.name} <p className="opacity-30 text-[7px] font-bold mt-0.5">{person.document}</p></div>
          <button onClick={()=>setStep(1)} className="text-indigo-600 font-black text-[8px] uppercase px-2 py-1 bg-white border rounded">Cambiar</button>
       </div>
       <form onSubmit={addBarcode} className="space-y-2">
          <p className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1"><Headphones size={10}/> Escanee Audioguías</p>
          <input name="bcInput" autoFocus className="input-base text-center font-mono text-xl font-black h-10" placeholder="00000" />
       </form>
       <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
          {selectedBarcodes.map(bc => <div key={bc} className="px-2 py-1 bg-indigo-600 text-white rounded text-[8px] font-black flex items-center gap-1 uppercase leading-none">{bc} <button onClick={()=>setSelectedBarcodes(selectedBarcodes.filter(x=>x!==bc))}><X size={10}/></button></div>)}
       </div>
       <div className="pt-2 border-t mt-2">
          <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Asignar Guía (Opcional)</label>
          <select id="guide-select" className="input-base text-[9px]">
             <option value="">Individual</option>
             {data.guides.map((g:any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
       </div>
       <button onClick={() => {
         const gId = (document.getElementById('guide-select') as HTMLSelectElement).value;
         onComplete(person, selectedBarcodes, gId);
       }} className="w-full bg-emerald-600 text-white py-3 rounded font-black text-[10px] uppercase shadow-lg mt-2">Registrar Visita ({selectedBarcodes.length})</button>
    </div>
  );
}

function EquipmentSheet({ item, data, updateData, refreshModal }: any) {
  const changeStatus = (st: string) => {
    const newInv = data.inventory.map((i: any) => i.id === item.id ? { ...i, status: st } : i);
    updateData({ ...data, inventory: newInv });
    refreshModal(newInv.find((i:any)=>i.id===item.id));
  };
  return (
    <div className="space-y-4 text-left">
       <div className="bg-slate-50 p-3 rounded border">
          <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Cambiar Estado</p>
          <div className="grid grid-cols-2 gap-2">
            {['available', 'maint_repair', 'maint_qc'].map(s => (
              <button key={s} onClick={() => changeStatus(s)} className={`px-2 py-1 rounded border text-[8px] font-black uppercase ${item.status === s ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-white'}`}>{s.replace('maint_', '')}</button>
            ))}
          </div>
       </div>
       <div className="max-h-32 overflow-y-auto custom-scrollbar border p-2 rounded text-[9px] bg-slate-50/50">
          <p className="font-black uppercase opacity-30 text-[7px] mb-2">Logs Técnicos</p>
          {item.maintenanceLogs.map((l:any) => <div key={l.id} className="mb-2 border-l-2 border-indigo-400 pl-2"><strong>{l.date}</strong>: {l.notes}</div>)}
          {item.maintenanceLogs.length === 0 && <p className="text-center opacity-30 py-4 italic">Sin historial técnico</p>}
       </div>
    </div>
  );
}

function GenericForm({ type, item, onSubmit }: any) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target as any); const d:any={}; fd.forEach((v,k)=>d[k]=v); onSubmit(d); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {type === 'inventory' && (
          <>
            <div><label className="text-[8px] font-black text-slate-400 uppercase">ID</label><input name="id" defaultValue={item?.id} className="input-base" required /></div>
            <div><label className="text-[8px] font-black text-slate-400 uppercase">Barcode</label><input name="barcode" defaultValue={item?.barcode} className="input-base" required /></div>
            <div className="col-span-2"><label className="text-[8px] font-black text-slate-400 uppercase">Modelo</label><input name="model" defaultValue={item?.model} className="input-base" /></div>
          </>
        )}
        {type === 'guide' && (
          <>
            <div className="col-span-2"><label className="text-[8px] font-black text-slate-400 uppercase">Nombre</label><input name="name" defaultValue={item?.name} className="input-base" required /></div>
            <div><label className="text-[8px] font-black text-slate-400 uppercase">LIC</label><input name="license" defaultValue={item?.license} className="input-base" required /></div>
            <div><label className="text-[8px] font-black text-slate-400 uppercase">TEL</label><input name="phone" defaultValue={item?.phone} className="input-base" /></div>
            <div className="col-span-2"><label className="text-[8px] font-black text-slate-400 uppercase">Días Laborados</label><input name="daysWorked" type="number" defaultValue={item?.daysWorked} className="input-base" /></div>
          </>
        )}
      </div>
      <button type="submit" className="w-full bg-slate-900 text-white py-2.5 rounded font-black text-[9px] uppercase mt-4 tracking-widest shadow-lg">Guardar Registro</button>
    </form>
  );
}

function AddEquipmentToVisit({ visit, inventory, onAdd }: any) {
   const [bc, setBc] = useState('');
   return (
      <div className="space-y-3">
         <div className="p-2 bg-indigo-50 border border-indigo-100 rounded text-[9px] font-black uppercase text-indigo-700">Añadiendo a Visita: {visit.id.slice(-6)}</div>
         <form onSubmit={(e:any) => { e.preventDefault(); onAdd(bc); setBc(''); }} className="space-y-3">
            <InputField label="Escanear Audioguía Adicional" autoFocus value={bc} onChange={(e:any)=>setBc(e.target.value)} placeholder="00000" />
            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded text-[9px] font-black uppercase shadow-lg">Vincular Equipo</button>
         </form>
      </div>
   );
}

function LoginView({ onLogin }: any) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-xs w-full card-base p-10 text-center bg-white/5 border-white/10 backdrop-blur-xl">
        <div className="p-4 bg-white rounded-xl inline-flex text-slate-900 mb-6 shadow-2xl scale-125"><Headphones size={32}/></div>
        <h1 className="text-white font-black uppercase tracking-tighter text-2xl mb-8 leading-none">AudioPro Admin</h1>
        <div className="space-y-3">
          <button onClick={() => onLogin('admin')} className="w-full p-3.5 border border-white/10 rounded hover:bg-white hover:text-slate-900 text-white font-black uppercase text-[10px] tracking-widest transition-all">Administrador</button>
          <button onClick={() => onLogin('operator')} className="w-full p-3.5 border border-indigo-500/30 rounded bg-indigo-500/10 text-indigo-400 font-black uppercase text-[10px] tracking-widest transition-all hover:bg-indigo-500 hover:text-white">Operario</button>
        </div>
      </div>
    </div>
  );
}

function PrintView({ data, settings, onBack }: any) {
  return (
    <div className="min-h-screen bg-slate-100 p-8 flex flex-col items-center">
      <div className="w-64 bg-white border-2 border-slate-300 p-6 text-center font-mono text-[9px] shadow-2xl uppercase">
        <img src={settings.logo} className="h-8 mx-auto mb-2" />
        <p className="font-black mb-4">{settings.appName}</p>
        <div className="text-left border-y border-slate-100 py-2 space-y-1 mb-4">
          <p><strong>OP:</strong> {data.type}</p>
          <p><strong>NOMBRE:</strong> {data.person?.name}</p>
          <p><strong>EQUIPO:</strong> {data.equipment?.id}</p>
          <p className="opacity-40">{new Date(data.timestamp).toLocaleString()}</p>
        </div>
        <p className="text-[7px] opacity-40 leading-none italic mb-4 normal-case">{settings.terms}</p>
        <div className="h-10 border border-slate-100 flex items-center justify-center text-slate-200">FIRMA</div>
      </div>
      <div className="mt-8 flex gap-2 no-print"><button onClick={() => window.print()} className="btn-compact bg-slate-900 text-white px-8">Imprimir</button><button onClick={onBack} className="btn-compact border px-8">Regresar</button></div>
    </div>
  );
}