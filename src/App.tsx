import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Headphones, ArrowRightLeft, LayoutDashboard, Download, 
  LogOut, CheckCircle2, CloudOff, AlertCircle, Database, UserPlus, 
  History, Settings, BarChart3, Printer, X, Plus, Save, Briefcase, 
  Wrench, FileText, Camera, Edit2, Trash2, RefreshCw, Upload, Globe, 
  ChevronLeft, ChevronRight, Menu, Hammer, Settings2, ShieldCheck,
  Timer, Scan, Phone, Mail, UserCheck, Calendar, Search, ListChecks
} from 'lucide-react';

// --- INTERFACES ---
interface MaintLog { id: number; date: string; notes: string; statusAtTime: string; }
interface Equipment { id: string; model: string; status: string; barcode: string; maintenanceLogs: MaintLog[]; currentVisitId?: string; }
interface Person { id: string; name: string; document: string; country: string; age: number; email: string; phone: string; type: 'visitor' | 'guide'; }
interface Visit { 
  id: string; 
  personId: string; 
  equipmentIds: string[]; 
  startTime: string; 
  endTime?: string; 
  status: 'active' | 'finished';
  guideId?: string; 
  date: string; // ISO Date YYYY-MM-DD para filtrado rápido
}

// --- CONFIGURACIÓN ---
const APP_STORAGE_KEY = "AUDIOGUIDE_RELATIONAL_V7";
const INITIAL_DATA = {
  settings: { logo: "https://via.placeholder.com/100?text=LOGO", terms: "Responsabilidad por equipos...", appName: "AudioPro Admin" },
  syncMetadata: { lastSync: null, status: 'synced' },
  people: [
    { id: "P-101", name: "Carlos Perez", document: "12345678", country: "España", age: 34, email: "carlos@mail.com", phone: "600000000", type: 'visitor' }
  ],
  inventory: Array.from({ length: 25 }, (_, i) => ({
    id: `AG-${100 + i}`, model: i % 5 === 0 ? "Premium" : "Standard", status: "available", barcode: `${20000 + i}`, maintenanceLogs: [] 
  })),
  visits: [],
  guides: [
    { id: "G-101", name: "Elena Guía", license: "LIC-9988", phone: "555-0102", daysWorked: 12, type: 'guide' }
  ],
};

const StorageService = {
  saveLocal(data: any) { localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data)); },
  loadLocal() {
    const saved = localStorage.getItem(APP_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  },
  async syncToCloud(data: any) { return new Promise((res) => setTimeout(() => res(new Date().toISOString()), 600)); }
};

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

  const triggerNotif = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 2500);
  };

  // --- LÓGICA DE NEGOCIO ---

  const handleCreateVisit = (person: any, barcode: string, guideId?: string) => {
    const equipment = data.inventory.find((i: any) => i.barcode === barcode);
    if (!equipment || equipment.status !== 'available') return triggerNotif("Equipo no disponible");

    // Guardar o actualizar persona
    let updatedPeople = [...data.people];
    const pIdx = updatedPeople.findIndex(p => p.id === person.id || p.document === person.document);
    if (pIdx > -1) {
      updatedPeople[pIdx] = { ...updatedPeople[pIdx], ...person };
    } else {
      updatedPeople.push({ ...person, id: person.id || `P-${Date.now()}` });
    }

    const newVisit: Visit = {
      id: `VIS-${Date.now()}`,
      personId: person.id || updatedPeople[updatedPeople.length-1].id,
      equipmentIds: [equipment.id],
      startTime: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      status: 'active',
      guideId
    };

    const newInventory = data.inventory.map((i: any) => i.id === equipment.id ? { ...i, status: 'in_use', currentVisitId: newVisit.id } : i);
    
    updateData({ 
      ...data, 
      people: updatedPeople, 
      visits: [...data.visits, newVisit],
      inventory: newInventory
    });
    setModal(null);
    setPrintData({ type: 'ingreso', person, equipment, timestamp: newVisit.startTime });
  };

  const handleBulkReturn = (barcodes: string[]) => {
    const foundEquipments = data.inventory.filter((i: any) => barcodes.includes(i.barcode) && i.status === 'in_use');
    if (foundEquipments.length === 0) return triggerNotif("No se encontraron equipos activos");

    const visitIdsToFinish = foundEquipments.map((i: any) => i.currentVisitId);
    
    const newInventory = data.inventory.map((i: any) => 
      barcodes.includes(i.barcode) ? { ...i, status: 'available', currentVisitId: null } : i
    );

    const newVisits = data.visits.map((v: any) => 
      visitIdsToFinish.includes(v.id) ? { ...v, status: 'finished', endTime: new Date().toISOString() } : v
    );

    updateData({ ...data, inventory: newInventory, visits: newVisits });
    triggerNotif(`Procesados ${foundEquipments.length} equipos exitosamente`);
    setModal(null);
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  if (printData) return <PrintView data={printData} settings={data.settings} onBack={() => setPrintData(null)} />;
  if (!userRole) return <LoginView onLogin={setUserRole} />;

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-100 font-sans">
      {/* Sidebar Colapsable */}
      <aside className={`${isMenuCollapsed ? 'w-14' : 'w-52'} bg-slate-900 text-white flex flex-col transition-all duration-300 border-r border-slate-800 shrink-0`}>
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          {!isMenuCollapsed && <span className="font-black text-[10px] uppercase tracking-tighter truncate opacity-60">{data.settings.appName}</span>}
          <button onClick={() => setIsMenuCollapsed(!isMenuCollapsed)} className="p-1 hover:bg-white/10 rounded mx-auto">
            {isMenuCollapsed ? <Menu size={14}/> : <ChevronLeft size={14}/>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
          <NavItem icon={<UserCheck size={16}/>} label="Visitas" active={view==='visits'} collapsed={isMenuCollapsed} onClick={() => setView('visits')} />
          <NavItem icon={<Headphones size={16}/>} label="Inventario" active={view==='inventory'} collapsed={isMenuCollapsed} onClick={() => setView('inventory')} />
          <NavItem icon={<Users size={16}/>} label="Personas" active={view==='people'} collapsed={isMenuCollapsed} onClick={() => setView('people')} />
          <NavItem icon={<Briefcase size={16}/>} label="Guías" active={view==='guides'} collapsed={isMenuCollapsed} onClick={() => setView('guides')} />
          
          {userRole === 'admin' && (
            <>
              <div className="my-2 border-t border-white/5" />
              <NavItem icon={<BarChart3 size={16}/>} label="Métricas" active={view==='stats'} collapsed={isMenuCollapsed} onClick={() => setView('stats')} />
              <NavItem icon={<Settings size={16}/>} label="Ajustes" active={view==='settings'} collapsed={isMenuCollapsed} onClick={() => setView('settings')} />
            </>
          )}
        </div>

        <div className="mt-auto p-2 border-t border-white/5 bg-black/20">
           <NavItem icon={<LogOut size={16}/>} label="Salir" collapsed={isMenuCollapsed} onClick={() => setUserRole(null)} color="text-red-400 hover:bg-red-500/10" />
           {!isMenuCollapsed && (
             <div className="px-2 py-1 flex items-center justify-between mt-1">
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${data.syncMetadata.status === 'synced' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                  <span className="text-[7px] font-black opacity-30 uppercase">Sincronizado</span>
                </div>
                <button onClick={() => handleSync()} className="text-slate-500 hover:text-white"><RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''}/></button>
             </div>
           )}
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 h-screen overflow-y-auto custom-scrollbar flex flex-col">
        <header className="h-12 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {userRole} <ChevronRight size={10}/> <span className="text-slate-900">{view}</span>
          </div>
          <div className="flex gap-2">
             {view === 'inventory' && userRole === 'admin' && <button onClick={() => setModal({ type: 'inventory_crud' })} className="btn-compact bg-slate-900 text-white"><Plus size={12}/> Nuevo Equipo</button>}
             {view === 'guides' && userRole === 'admin' && <button onClick={() => setModal({ type: 'guide_crud' })} className="btn-compact bg-slate-900 text-white"><Plus size={12}/> Nuevo Guía</button>}
             <button onClick={() => setModal({ type: 'bulk_return' })} className="btn-compact border border-emerald-200 text-emerald-600 bg-emerald-50"><ListChecks size={12}/> Recibo Rápido</button>
             <button onClick={() => setModal({ type: 'register_flow' })} className="btn-compact bg-indigo-600 text-white shadow-lg shadow-indigo-100"><Plus size={12}/> Nueva Visita</button>
          </div>
        </header>

        <div className="p-4">
          {notif && (
            <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2 rounded shadow-2xl flex items-center gap-2 z-50 text-[10px] font-black animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle2 size={14} className="text-emerald-400" /> {notif}
            </div>
          )}

          {view === 'visits' && (
            <div className="space-y-4">
               {/* Date Navigator */}
               <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-slate-100 rounded border"><ChevronLeft size={14}/></button>
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded border font-black text-xs">
                      <Calendar size={14} className="text-indigo-600"/> {selectedDate}
                    </div>
                    <button onClick={() => changeDate(1)} className="p-1.5 hover:bg-slate-100 rounded border"><ChevronRight size={14}/></button>
                  </div>
                  <div className="flex gap-4 text-[10px] font-black uppercase">
                     <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-600"/> Activas: {data.visits.filter((v:any)=>v.date === selectedDate && v.status==='active').length}</span>
                     <span className="flex items-center gap-1 opacity-40"><div className="w-2 h-2 rounded-full bg-slate-300"/> Finalizadas: {data.visits.filter((v:any)=>v.date === selectedDate && v.status==='finished').length}</span>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {data.visits.filter((v:any)=>v.date === selectedDate).sort((a:any, b:any) => b.startTime.localeCompare(a.startTime)).map((visit: any) => {
                    const person = data.people.find((p:any)=>p.id === visit.personId);
                    const minutes = Math.floor((now.getTime() - new Date(visit.startTime).getTime()) / 60000);
                    return (
                      <div key={visit.id} className={`card-base p-3 flex flex-col gap-3 transition-all group ${visit.status === 'finished' ? 'opacity-50 grayscale' : 'hover:border-indigo-400 shadow-sm'}`}>
                        <div className="flex justify-between items-start">
                          <div className="w-9 h-9 bg-slate-100 text-slate-500 rounded flex items-center justify-center font-bold border">{person?.name.charAt(0)}</div>
                          {visit.status === 'active' && <div className="text-right text-indigo-600 font-black text-[10px] flex items-center gap-1"><Timer size={12}/> {minutes}m</div>}
                        </div>
                        <div className="flex-1 min-h-[40px]">
                          <p className="font-black text-xs truncate leading-none mb-1">{person?.name || 'Cargando...'}</p>
                          <p className="text-[9px] opacity-40 uppercase font-bold">{person?.document}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                             {visit.equipmentIds.map((eid: string) => (
                               <span key={eid} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[8px] font-black border border-indigo-100 flex items-center gap-1 uppercase"><Headphones size={8}/> {eid}</span>
                             ))}
                          </div>
                        </div>
                        {visit.status === 'active' ? (
                          <button onClick={() => handleFinishVisit(visit.id)} className="w-full bg-indigo-600 text-white py-1.5 rounded text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors">Recibir / Finalizar</button>
                        ) : (
                          <div className="text-center py-1.5 bg-slate-50 rounded text-[8px] font-black uppercase text-slate-400">Visita Finalizada</div>
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
                    <th className="table-header">Estado Actual</th>
                    <th className="table-header text-right">Detalle Técnico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.inventory.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                           <div className={`p-1.5 rounded ${item.status === 'in_use' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}><Headphones size={14}/></div>
                           <div><p className="font-bold leading-none">{item.id}</p><p className="text-[9px] opacity-40 uppercase">{item.model}</p></div>
                        </div>
                      </td>
                      <td className="table-cell font-mono text-slate-400">{item.barcode}</td>
                      <td className="table-cell"><StatusBadge status={item.status} /></td>
                      <td className="table-cell text-right">
                         <button onClick={() => setModal({ type: 'equipment_details', item })} className="p-1.5 border rounded hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all"><FileText size={14}/></button>
                         {userRole === 'admin' && <button onClick={() => setModal({ type: 'inventory_crud', item })} className="p-1.5 ml-1 text-slate-300 hover:text-slate-600"><Edit2 size={12}/></button>}
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
                    <th className="table-header">Persona / Visitante</th>
                    <th className="table-header">Contacto</th>
                    <th className="table-header">Resumen</th>
                    <th className="table-header text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.people.filter((p:any)=>p.type==='visitor').map((p: any) => (
                    <tr key={p.id}>
                      <td className="table-cell">
                        <div className="font-black">{p.name}</div>
                        <div className="text-[9px] opacity-40 uppercase font-bold">{p.document} • {p.country}</div>
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-col gap-0.5 text-[9px] text-slate-500">
                           <span className="flex items-center gap-1 font-medium"><Mail size={10}/> {p.email}</span>
                           <span className="flex items-center gap-1 font-medium"><Phone size={10}/> {p.phone}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <button onClick={() => setModal({ type: 'person_history', person: p })} className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">
                           {data.visits.filter((v:any)=>v.personId === p.id).length} Visitas Registradas
                        </button>
                      </td>
                      <td className="table-cell text-right">
                        <button onClick={() => setModal({ type: 'person_crud', item: p })} className="p-1.5 border rounded hover:bg-slate-100"><Edit2 size={12}/></button>
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
                     <div className="flex justify-between items-start">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><Briefcase size={20}/></div>
                        <div className="text-right">
                           <p className="text-[10px] font-black uppercase text-amber-600">{g.license}</p>
                           <p className="text-[8px] opacity-40 font-bold uppercase">{g.id}</p>
                        </div>
                     </div>
                     <div>
                        <h3 className="font-black text-sm uppercase leading-none mb-1">{g.name}</h3>
                        <p className="text-[9px] text-slate-400 flex items-center gap-1"><Phone size={10}/> {g.phone}</p>
                     </div>
                     <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-slate-50 p-2 rounded border"><strong>{g.daysWorked}</strong> Días Laborados</div>
                        <div className="bg-slate-50 p-2 rounded border font-bold text-indigo-600"><strong>{data.visits.filter((v:any)=>v.guideId===g.id && v.status==='active').length}</strong> Tours Activos</div>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => setModal({ type: 'guide_crud', item: g })} className="flex-1 btn-compact bg-slate-900 text-white">Editar</button>
                        <button className="btn-compact border border-slate-200 text-slate-400"><History size={12}/></button>
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
          <div className="bg-white rounded w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-300">
            <div className="px-4 py-2 bg-slate-900 text-white flex justify-between items-center shadow-lg">
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">{modal.type.replace('_', ' ')}</span>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-white/10 rounded"><X size={14}/></button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-white">
               {modal.type === 'register_flow' && <RegisterFlow onComplete={handleCreateVisit} data={data} />}
               {modal.type === 'equipment_details' && <EquipmentSheet item={modal.item} data={data} updateData={updateData} refreshModal={(i:any)=>setModal({...modal, item:i})} />}
               {modal.type === 'bulk_return' && <BulkReturnModule onComplete={handleBulkReturn} inventory={data.inventory} />}
               {modal.type === 'person_history' && <PersonHistoryView person={modal.person} visits={data.visits} inventory={data.inventory} />}
               {(modal.type === 'inventory_crud' || modal.type === 'guide_crud' || modal.type === 'person_crud') && (
                 <GenericForm 
                    type={modal.type.split('_')[0]} 
                    item={modal.item} 
                    onSubmit={(e:any) => handleEntityCRUD(e, modal.type === 'person_crud' ? 'people' : modal.type === 'guide_crud' ? 'guides' : 'inventory', modal.item?.id)} 
                 />
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES ---

const NavItem = ({ icon, label, active, collapsed, onClick, color = "text-slate-400 hover:bg-white/5" }: any) => (
  <button onClick={onClick} title={label} className={`w-full flex items-center ${collapsed ? 'justify-center' : 'px-4'} py-2 rounded transition-all font-bold text-[10px] uppercase tracking-wider ${active ? 'bg-indigo-600 text-white shadow-lg' : color}`}>
    {icon} {!collapsed && <span className="ml-3 truncate">{label}</span>}
  </button>
);

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: any = {
    available: { label: 'Libre', class: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    in_use: { label: 'En Uso', class: 'text-amber-600 bg-amber-50 border-amber-100' },
    maint_repair: { label: 'Taller', class: 'text-red-600 bg-red-50 border-red-100' },
    maint_qc: { label: 'Calidad', class: 'text-indigo-600 bg-indigo-50 border-indigo-100' }
  };
  const c = cfg[status] || cfg.available;
  return <span className={`px-2 py-0.5 rounded-[3px] text-[8px] font-black border uppercase tracking-widest ${c.class}`}>{c.label}</span>;
};

// --- FLUJO REGISTRO INTELIGENTE ---
const RegisterFlow = ({ onComplete, data }: any) => {
  const [step, setStep] = useState(1);
  const [person, setPerson] = useState<any>(null);
  const [scanValue, setScanValue] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanValue) return;

    // Si son 20 dígitos es escaneo estricto
    if (scanValue.length === 20 && /^\d+$/.test(scanValue)) {
       const doc = scanValue.slice(0, 10);
       const existing = data.people.find((p:any) => p.document === doc);
       if (existing) { setPerson(existing); setStep(2); }
       else { setPerson({ document: doc, name: '', phone: '', email: '', country: 'Colombia', age: 25, type: 'visitor' }); setStep(1.5); }
    } else {
       // Búsqueda por texto (Nombre o Documento parcial)
       const matches = data.people.filter((p:any) => 
         p.name.toLowerCase().includes(scanValue.toLowerCase()) || p.document.includes(scanValue)
       );
       if (matches.length > 0) {
         setSearchResults(matches);
       } else {
         setPerson({ document: '', name: scanValue, phone: '', email: '', country: '', age: '', type: 'visitor' });
         setStep(1.5);
       }
    }
  };

  if (step === 1) return (
    <div className="space-y-4">
       <div className="p-6 border-2 border-dashed rounded bg-slate-50 flex flex-col items-center gap-3 text-center border-indigo-200">
          <Scan size={32} className="text-indigo-400"/>
          <div className="w-full">
            <p className="text-[10px] font-black uppercase text-indigo-900 mb-2">Escanear o Buscar Persona</p>
            <form onSubmit={handleLookup} onBlur={() => !scanValue && triggerNotif("Esperando escaneo...")}>
              <input value={scanValue} onChange={(e)=>setScanValue(e.target.value)} autoFocus className="input-base text-center text-lg font-black tracking-widest h-12" placeholder="DOC / NOMBRE" />
            </form>
          </div>
       </div>
       {searchResults.length > 0 && (
         <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase">Coincidencias encontradas:</p>
            {searchResults.map(p => (
              <button key={p.id} onClick={() => { setPerson(p); setStep(2); }} className="w-full p-2 border rounded flex justify-between items-center hover:bg-indigo-50 transition-all">
                <div className="text-left"><p className="font-black text-xs">{p.name}</p><p className="text-[9px] opacity-40 uppercase">{p.document}</p></div>
                <ChevronRight size={14} className="text-indigo-600"/>
              </button>
            ))}
            <button onClick={() => { setPerson({ document: scanValue, name: '', phone: '', email: '', country: '', age: '', type: 'visitor' }); setStep(1.5); }} className="w-full py-2 text-[9px] font-black uppercase text-indigo-600 border border-indigo-100 rounded">Ninguna, Crear Nueva</button>
         </div>
       )}
    </div>
  );

  if (step === 1.5) return (
    <form onSubmit={(e: any) => { e.preventDefault(); setStep(2); }} className="space-y-3">
       <InputField label="Nombre Completo" value={person.name} onChange={(e:any)=>setPerson({...person, name: e.target.value})} required />
       <InputField label="Cédula / Pasaporte" value={person.document} onChange={(e:any)=>setPerson({...person, document: e.target.value})} required />
       <div className="grid grid-cols-2 gap-3">
          <InputField label="Teléfono" value={person.phone} onChange={(e:any)=>setPerson({...person, phone: e.target.value})} required />
          <InputField label="Email" type="email" value={person.email} onChange={(e:any)=>setPerson({...person, email: e.target.value})} required />
       </div>
       <div className="grid grid-cols-2 gap-3">
          <InputField label="País" value={person.country} onChange={(e:any)=>setPerson({...person, country: e.target.value})} required />
          <InputField label="Edad" type="number" value={person.age} onChange={(e:any)=>setPerson({...person, age: e.target.value})} required />
       </div>
       <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded font-black text-[10px] uppercase mt-4">Asignar Equipo</button>
    </form>
  );

  return (
    <form onSubmit={(e:any) => { e.preventDefault(); onComplete(person, e.target.barcode.value, e.target.guideId.value); }} className="space-y-4">
       <div className="bg-indigo-50 p-3 rounded border border-indigo-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-7 h-7 bg-indigo-600 text-white rounded flex items-center justify-center font-bold text-xs">{person.name.charAt(0)}</div>
             <p className="text-xs font-black truncate max-w-[150px]">{person.name}</p>
          </div>
          <button type="button" onClick={() => setStep(1.5)} className="text-[9px] font-black text-indigo-600 uppercase">Editar</button>
       </div>
       <div>
         <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Responsable (Guía Opcional)</label>
         <select name="guideId" className="input-base">
            <option value="">Individual (Sin Guía)</option>
            {data.guides.map((g:any) => <option key={g.id} value={g.id}>{g.name}</option>)}
         </select>
       </div>
       <div className="p-6 border-2 border-dashed border-indigo-200 rounded text-center space-y-2 bg-indigo-50/20">
          <p className="text-[10px] font-black uppercase text-indigo-600 flex items-center justify-center gap-2"><Headphones size={14}/> Escanee Código Equipo</p>
          <input name="barcode" autoFocus className="w-full bg-transparent text-center font-mono text-3xl font-black outline-none" placeholder="00000" required />
       </div>
       <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded font-black text-[10px] uppercase shadow-lg shadow-indigo-100">Registrar Ingreso</button>
    </form>
  );
};

// --- MÓDULO RECIBO RÁPIDO ---
const BulkReturnModule = ({ onComplete, inventory }: any) => {
  const [list, setList] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;
    const eq = inventory.find((i:any)=>i.barcode === input);
    if (!eq) return setInput('');
    if (!list.includes(input)) setList([...list, input]);
    setInput('');
  };

  return (
    <div className="space-y-4">
       <div className="p-4 bg-emerald-50 rounded border border-emerald-100 flex flex-col items-center gap-2">
          <Scan className="text-emerald-600" size={24}/>
          <p className="text-[10px] font-black uppercase text-emerald-800">Escaneo Masivo de Devolución</p>
          <form onSubmit={add} className="w-full">
            <input value={input} onChange={(e)=>setInput(e.target.value)} autoFocus className="input-base text-center text-xl font-black" placeholder="SCAN..." />
          </form>
       </div>
       <div className="max-h-40 overflow-y-auto custom-scrollbar border rounded">
          <table className="w-full text-[10px]">
             <thead className="bg-slate-50 sticky top-0">
                <tr><th className="px-3 py-1.5 text-left uppercase opacity-40">Equipo</th><th className="px-3 py-1.5 text-right"><button onClick={()=>setList([])} className="text-red-500 uppercase">Limpiar</button></th></tr>
             </thead>
             <tbody className="divide-y">
                {list.map(b => (
                  <tr key={b}><td className="px-3 py-1.5 font-bold">{inventory.find((i:any)=>i.barcode===b)?.id || b}</td><td className="px-3 py-1.5 text-right"><button onClick={()=>setList(list.filter(x=>x!==b))}><Trash2 size={10} className="text-slate-300 hover:text-red-500"/></button></td></tr>
                ))}
                {list.length === 0 && <tr><td colSpan={2} className="p-4 text-center opacity-30 italic">Sin equipos en lista</td></tr>}
             </tbody>
          </table>
       </div>
       <button onClick={() => onComplete(list)} disabled={list.length===0} className="w-full bg-emerald-600 text-white py-3 rounded font-black text-[10px] uppercase shadow-lg shadow-emerald-100 disabled:opacity-50">Procesar Devolución Masiva ({list.length})</button>
    </div>
  );
};

// --- OTROS COMPONENTES ---
const PersonHistoryView = ({ person, visits, inventory }: any) => {
   const myVisits = visits.filter((v:any) => v.personId === person.id);
   return (
     <div className="space-y-4">
        <div className="border-b pb-2">
           <h3 className="font-black text-xs uppercase">{person.name}</h3>
           <p className="text-[10px] opacity-40 uppercase">{person.document} • {person.country}</p>
        </div>
        <div className="space-y-2">
           {myVisits.map((v:any) => (
             <div key={v.id} className="p-2 border rounded bg-slate-50 flex justify-between items-center">
                <div className="text-[10px]">
                   <p className="font-black uppercase tracking-tighter">{v.date}</p>
                   <p className="opacity-60">{v.equipmentIds.join(', ')}</p>
                </div>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${v.status==='active' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>{v.status}</span>
             </div>
           ))}
        </div>
     </div>
   );
};

const GenericForm = ({ type, item, onSubmit }: any) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      {type === 'inventory' && (
        <>
          <div><label className="text-[9px] font-black uppercase text-slate-400">ID Equipo</label><input name="id" defaultValue={item?.id} disabled={!!item} className="input-base" required /></div>
          <div><label className="text-[9px] font-black uppercase text-slate-400">Barcode</label><input name="barcode" defaultValue={item?.barcode} className="input-base" required /></div>
          <div className="col-span-2"><label className="text-[9px] font-black uppercase text-slate-400">Modelo</label><input name="model" defaultValue={item?.model || 'Standard'} className="input-base" required /></div>
        </>
      )}
      {type === 'guide' && (
        <>
          <div className="col-span-2"><label className="text-[9px] font-black uppercase text-slate-400">Nombre del Guía</label><input name="name" defaultValue={item?.name} className="input-base" required /></div>
          <div><label className="text-[9px] font-black uppercase text-slate-400">Licencia</label><input name="license" defaultValue={item?.license} className="input-base" required /></div>
          <div><label className="text-[9px] font-black uppercase text-slate-400">Teléfono</label><input name="phone" defaultValue={item?.phone} className="input-base" required /></div>
        </>
      )}
      {type === 'person' && (
        <>
          <div className="col-span-2"><label className="text-[9px] font-black uppercase text-slate-400">Nombre</label><input name="name" defaultValue={item?.name} className="input-base" required /></div>
          <div><label className="text-[9px] font-black uppercase text-slate-400">Doc</label><input name="document" defaultValue={item?.document} className="input-base" required /></div>
          <div><label className="text-[9px] font-black uppercase text-slate-400">País</label><input name="country" defaultValue={item?.country} className="input-base" required /></div>
          <div><label className="text-[9px] font-black uppercase text-slate-400">Tel</label><input name="phone" defaultValue={item?.phone} className="input-base" /></div>
          <div><label className="text-[9px] font-black uppercase text-slate-400">Mail</label><input name="email" type="email" defaultValue={item?.email} className="input-base" /></div>
        </>
      )}
    </div>
    <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded font-black text-[10px] uppercase mt-4">Guardar Registro</button>
  </form>
);

const EquipmentSheet = ({ item, data, updateData, refreshModal }: any) => {
  const changeStatus = (st: string) => {
    const newInv = data.inventory.map((i: any) => i.id === item.id ? { ...i, status: st } : i);
    updateData({ ...data, inventory: newInv });
    refreshModal(newInv.find((i:any)=>i.id===item.id));
  };
  return (
    <div className="space-y-4">
       <div className="bg-slate-50 p-3 rounded border">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Estado</p>
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
       <div className="flex gap-1">
          <input id="m-note" className="input-base" placeholder="Nueva nota..." />
          <button onClick={()=>{
             const n = (document.getElementById('m-note') as any).value;
             if(!n) return;
             const nl = [...item.maintenanceLogs, { id: Date.now(), date: new Date().toLocaleDateString(), notes: n, statusAtTime: item.status }];
             const ni = data.inventory.map((i:any)=>i.id===item.id?{...i, maintenanceLogs: nl}:i);
             updateData({...data, inventory: ni});
             refreshModal(ni.find((i:any)=>i.id===item.id));
             (document.getElementById('m-note') as any).value = "";
          }} className="p-1.5 bg-slate-900 text-white rounded"><Save size={14}/></button>
       </div>
    </div>
  );
};

const PrintView = ({ data, settings, onBack }: any) => (
  <div className="min-h-screen bg-slate-100 p-10 flex flex-col items-center">
    <div className="w-64 bg-white border-2 border-slate-300 p-6 text-center font-mono text-[10px] shadow-xl">
      <img src={settings.logo} className="h-10 mx-auto mb-2" />
      <p className="font-black mb-4 uppercase">{settings.appName}</p>
      <div className="text-left border-y border-slate-100 py-2 space-y-1 mb-4">
        <p><strong>OP:</strong> {data.type.toUpperCase()}</p>
        <p><strong>NOMBRE:</strong> {data.person?.name}</p>
        <p><strong>EQUIPO:</strong> {data.equipment?.id}</p>
      </div>
      <p className="text-[8px] opacity-40 italic mb-4">{settings.terms}</p>
      <div className="h-10 border border-slate-100 flex items-center justify-center text-slate-200 uppercase">Firma</div>
    </div>
    <div className="mt-6 flex gap-2 no-print"><button onClick={() => window.print()} className="btn-compact bg-slate-900 text-white px-6">Imprimir</button><button onClick={onBack} className="btn-compact border px-6">Regresar</button></div>
  </div>
);

const LoginView = ({ onLogin }: any) => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <div className="max-w-xs w-full card-base p-8 text-center bg-white/5 border-white/10 backdrop-blur-lg">
      <div className="p-4 bg-white rounded-xl inline-flex text-slate-900 mb-6 shadow-2xl scale-125"><Headphones size={32}/></div>
      <h1 className="text-white font-black uppercase tracking-tighter text-2xl mb-8">AudioPro Admin</h1>
      <div className="space-y-3">
        <button onClick={() => onLogin('admin')} className="w-full p-4 border border-white/10 rounded hover:bg-white hover:text-slate-900 text-white font-black uppercase text-[10px] tracking-widest transition-all">Administrador</button>
        <button onClick={() => onLogin('operator')} className="w-full p-4 border border-indigo-500/30 rounded bg-indigo-500/10 text-indigo-400 font-black uppercase text-[10px] tracking-widest transition-all hover:bg-indigo-500 hover:text-white">Operario</button>
      </div>
    </div>
  </div>
);

const InputField = ({ label, ...props }: any) => (
  <div className="w-full text-left">
    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{label}</label>
    <input className="input-base" {...props} />
  </div>
);