import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Headphones, ArrowRightLeft, LayoutDashboard, Download, 
  LogOut, CheckCircle2, CloudOff, AlertCircle, Database, UserPlus, 
  History, Settings, BarChart3, Printer, X, Plus, Save, Briefcase, 
  Wrench, FileText, Camera, Edit2, Trash2, RefreshCw, Upload, Globe, 
  ChevronLeft, ChevronRight, Menu, Hammer, Settings2, ShieldCheck,
  Timer, Scan, Phone, Mail, UserCheck
} from 'lucide-react';

// --- INTERFACES ---
interface MaintLog { id: number; date: string; notes: string; statusAtTime: string; }
interface Equipment { id: string; model: string; status: string; barcode: string; maintenanceLogs: MaintLog[]; currentVisitId?: string; }
interface Person { id: string; name: string; document: string; country: string; age: number; email: string; phone: string; }
interface Visit { id: string; personId: string; equipmentIds: string[]; startTime: string; endTime?: string; status: 'active' | 'finished'; }
interface Guide { id: string; name: string; license: string; phone: string; daysWorked: number; }

// --- CONFIGURACIÓN ---
const APP_STORAGE_KEY = "AUDIOGUIDE_RELATIONAL_V1";
const INITIAL_DATA = {
  settings: { logo: "https://via.placeholder.com/100?text=LOGO", terms: "Contrato de responsabilidad civil por equipos...", appName: "AudioPro Admin" },
  syncMetadata: { lastSync: null, status: 'synced' },
  people: [
    { id: "12345678", name: "Carlos Perez", document: "12345678", country: "España", age: 34, email: "carlos@mail.com", phone: "+34 600 000 000" }
  ],
  inventory: Array.from({ length: 30 }, (_, i) => ({
    id: `AG-${100 + i}`, model: i % 5 === 0 ? "Premium" : "Standard", status: "available", barcode: `${20000 + i}`, maintenanceLogs: [] 
  })),
  visits: [],
  guides: [ { id: "G-01", name: "Elena Guía", license: "LIC-9988", phone: "555-0102", daysWorked: 12 } ],
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
  const [view, setView] = useState('visits'); // Vista por defecto cambiada a Visitas Activas
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [notif, setNotif] = useState<string | null>(null);
  const [modal, setModal] = useState<any>(null);
  const [printData, setPrintData] = useState<any>(null);
  const [now, setNow] = useState(new Date());

  // Timer global para refrescar tiempos de visita
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
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
      const updated = { ...currentData, syncMetadata: { lastSync: time, status: 'synced' } };
      setData(updated);
      StorageService.saveLocal(updated);
    } catch {
      setData({ ...currentData, syncMetadata: { ...currentData.syncMetadata, status: 'error' } });
    } finally { setIsSyncing(false); }
  };

  const triggerNotif = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 2500);
  };

  // --- LÓGICA DE NEGOCIO ---

  const handleCreateVisit = (person: Person, barcode: string) => {
    const equipment = data.inventory.find((i: any) => i.barcode === barcode);
    if (!equipment || equipment.status !== 'available') return triggerNotif("Equipo no disponible");

    const newVisit: Visit = {
      id: `VIS-${Date.now()}`,
      personId: person.id,
      equipmentIds: [equipment.id],
      startTime: new Date().toISOString(),
      status: 'active'
    };

    const newInventory = data.inventory.map((i: any) => i.id === equipment.id ? { ...i, status: 'in_use', currentVisitId: newVisit.id } : i);
    const newPeople = data.people.some((p: any) => p.id === person.id) ? data.people : [...data.people, person];

    updateData({ 
      ...data, 
      people: newPeople, 
      visits: [...data.visits, newVisit],
      inventory: newInventory
    });
    setModal(null);
    setPrintData({ type: 'ingreso', person, equipment, timestamp: newVisit.startTime });
  };

  const handleFinishVisit = (visitId: string) => {
    const visit = data.visits.find((v: any) => v.id === visitId);
    const newInventory = data.inventory.map((i: any) => visit.equipmentIds.includes(i.id) ? { ...i, status: 'available', currentVisitId: null } : i);
    const newVisits = data.visits.map((v: any) => v.id === visitId ? { ...v, status: 'finished', endTime: new Date().toISOString() } : v);
    
    updateData({ ...data, inventory: newInventory, visits: newVisits });
    triggerNotif("Visita finalizada");
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
          <NavItem icon={<UserCheck size={16}/>} label="Visitas Activas" active={view==='visits'} collapsed={isMenuCollapsed} onClick={() => setView('visits')} />
          <NavItem icon={<Headphones size={16}/>} label="Inventario" active={view==='inventory'} collapsed={isMenuCollapsed} onClick={() => setView('inventory')} />
          <NavItem icon={<Users size={16}/>} label="Personas" active={view==='people'} collapsed={isMenuCollapsed} onClick={() => setView('people')} />
          <NavItem icon={<Briefcase size={16}/>} label="Guías" active={view==='guides'} collapsed={isMenuCollapsed} onClick={() => setView('guides')} />
          
          {userRole === 'admin' && (
            <>
              <div className="my-2 border-t border-white/5" />
              <NavItem icon={<BarChart3 size={16}/>} label="Métricas" active={view==='stats'} collapsed={isMenuCollapsed} onClick={() => setView('stats')} />
              <NavItem icon={<Settings size={16}/>} label="Configuración" active={view==='settings'} collapsed={isMenuCollapsed} onClick={() => setView('settings')} />
            </>
          )}
        </div>

        <div className="mt-auto p-2 border-t border-white/5">
           <NavItem icon={<LogOut size={16}/>} label="Salir" collapsed={isMenuCollapsed} onClick={() => setUserRole(null)} color="text-red-400 hover:bg-red-500/10" />
           <div className="mt-2 bg-black/20 p-2 rounded flex items-center justify-between">
              <div className={`w-1.5 h-1.5 rounded-full ${data.syncMetadata.status === 'synced' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
              {!isMenuCollapsed && <span className="text-[8px] font-black opacity-30">SYNC OK</span>}
              <button onClick={() => handleSync()} className="text-slate-500 hover:text-white"><RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''}/></button>
           </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 h-screen overflow-y-auto custom-scrollbar flex flex-col">
        <header className="h-12 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {userRole} <ChevronRight size={10}/> <span className="text-slate-900">{view}</span>
          </div>
          <div className="flex gap-2">
             <button onClick={() => setModal({ type: 'register_flow' })} className="btn-compact bg-indigo-600 text-white shadow-lg shadow-indigo-100"><Plus size={12}/> Nueva Visita</button>
          </div>
        </header>

        <div className="p-4 max-w-[1600px]">
          {notif && (
            <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2 rounded shadow-2xl flex items-center gap-2 z-50 text-[10px] font-black border border-white/10 animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle2 size={14} className="text-emerald-400" /> {notif}
            </div>
          )}

          {view === 'visits' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
               {data.visits.filter((v:any)=>v.status==='active').map((visit: any) => {
                 const person = data.people.find((p:any)=>p.id === visit.personId);
                 const minutes = Math.floor((now.getTime() - new Date(visit.startTime).getTime()) / 60000);
                 return (
                   <div key={visit.id} className="card-base p-3 flex flex-col gap-3 hover:border-indigo-400 transition-all group">
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center font-black text-sm border">{person?.name.charAt(0)}</div>
                        <div className="text-right">
                           <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600"><Timer size={12}/> {minutes}m</div>
                           <p className="text-[8px] text-slate-400 font-bold uppercase">{visit.id}</p>
                        </div>
                      </div>
                      <div>
                        <p className="font-black text-xs truncate leading-none mb-1">{person?.name}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                           {visit.equipmentIds.map((eid: string) => (
                             <span key={eid} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black border border-slate-200 flex items-center gap-1"><Headphones size={10}/> {eid}</span>
                           ))}
                        </div>
                      </div>
                      <button onClick={() => handleFinishVisit(visit.id)} className="w-full bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 py-2 rounded text-[9px] font-black uppercase tracking-widest border border-transparent hover:border-red-100 transition-all">Finalizar Visita</button>
                   </div>
                 );
               })}
               {data.visits.filter((v:any)=>v.status==='active').length === 0 && (
                 <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded">
                    <Users className="mx-auto text-slate-300 mb-2" size={32}/>
                    <p className="text-slate-400 font-bold">No hay visitas activas en este momento</p>
                 </div>
               )}
            </div>
          )}

          {view === 'inventory' && (
            <div className="card-base">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="table-header w-1/3">Activo</th>
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
                           <div><p className="font-bold leading-none">{item.id}</p><p className="text-[9px] opacity-40 uppercase">{item.model}</p></div>
                        </div>
                      </td>
                      <td className="table-cell font-mono text-slate-400">{item.barcode}</td>
                      <td className="table-cell"><StatusBadge status={item.status} /></td>
                      <td className="table-cell text-right">
                         <button onClick={() => setModal({ type: 'equipment_details', item })} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 size={12}/></button>
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
                    <th className="table-header">Persona</th>
                    <th className="table-header">Documento</th>
                    <th className="table-header">Contacto</th>
                    <th className="table-header text-right">Historial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.people.map((p: any) => (
                    <tr key={p.id}>
                      <td className="table-cell font-bold">{p.name}</td>
                      <td className="table-cell text-slate-500">{p.document}</td>
                      <td className="table-cell">
                        <div className="flex flex-col gap-0.5 text-[9px] text-slate-400">
                           <span className="flex items-center gap-1"><Mail size={10}/> {p.email}</span>
                           <span className="flex items-center gap-1"><Phone size={10}/> {p.phone}</span>
                        </div>
                      </td>
                      <td className="table-cell text-right">
                        <button className="btn-compact border text-slate-500 justify-end"><History size={12}/> {data.visits.filter((v:any)=>v.personId===p.id).length} Visitas</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* --- MODALES --- */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 py-2 bg-slate-900 text-white flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest">{modal.type.replace('_', ' ')}</span>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-white/10 rounded"><X size={14}/></button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
               {modal.type === 'register_flow' && <RegisterFlow onComplete={handleCreateVisit} data={data} />}
               {modal.type === 'equipment_details' && <EquipmentSheet item={modal.item} data={data} updateData={updateData} refreshModal={(i:any)=>setModal({...modal, item:i})} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES ---

const NavItem = ({ icon, label, active, collapsed, onClick, color = "text-slate-400 hover:bg-white/5" }: any) => (
  <button onClick={onClick} className={`w-full flex items-center ${collapsed ? 'justify-center' : 'px-4'} py-2 rounded transition-all font-bold text-[10px] uppercase tracking-wider ${active ? 'bg-indigo-600 text-white shadow-lg' : color}`}>
    {icon} {!collapsed && <span className="ml-3 truncate">{label}</span>}
  </button>
);

const RegisterFlow = ({ onComplete, data }: any) => {
  const [step, setStep] = useState(1);
  const [person, setPerson] = useState<any>(null);
  const [scanValue, setScanValue] = useState('');

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanValue) return;

    // Lógica Cédula 20 cifras vs Texto plano
    if (scanValue.length === 20 && /^\d+$/.test(scanValue)) {
      const doc = scanValue.slice(0, 10); // Simulación extracción
      const existing = data.people.find((p:any)=>p.document === doc);
      if (existing) {
        setPerson(existing);
        setStep(2);
      } else {
        setPerson({ document: doc, name: '', phone: '', email: '', country: 'España', age: 25 });
        setStep(1.5); // Ir a completar datos
      }
    } else {
      // Texto plano - Simular extracción
      setPerson({ document: '88776655', name: scanValue.split(' ')[0] || 'Nuevo Usuario', phone: '', email: '', country: 'Extranjero', age: 30 });
      setStep(1.5);
    }
    setScanValue('');
  };

  if (step === 1) return (
    <div className="space-y-4">
       <div className="p-8 border-2 border-dashed rounded bg-slate-50 flex flex-col items-center gap-4 text-center">
          <Scan size={32} className="text-indigo-400"/>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Escanear Documento o Ingresar Nombre</p>
            <form onSubmit={handleScan}>
              <input value={scanValue} onChange={(e)=>setScanValue(e.target.value)} autoFocus className="input-base text-center text-lg font-black tracking-widest h-12" placeholder="SENSE BARCODE..." />
            </form>
          </div>
       </div>
       <p className="text-[9px] text-slate-400 italic text-center">Si el sistema detecta 20 dígitos numéricos, procesará como cédula automatizada.</p>
    </div>
  );

  if (step === 1.5) return (
    <form onSubmit={(e: any) => { e.preventDefault(); setStep(2); }} className="space-y-3">
       <InputField label="Nombre Completo" value={person.name} onChange={(e:any)=>setPerson({...person, name: e.target.value})} required />
       <InputField label="Cédula / Documento" value={person.document} readOnly />
       <div className="grid grid-cols-2 gap-3">
          <InputField label="Teléfono" type="tel" value={person.phone} onChange={(e:any)=>setPerson({...person, phone: e.target.value})} required />
          <InputField label="Correo" type="email" value={person.email} onChange={(e:any)=>setPerson({...person, email: e.target.value})} required />
       </div>
       <div className="grid grid-cols-2 gap-3">
          <InputField label="País" value={person.country} onChange={(e:any)=>setPerson({...person, country: e.target.value})} required />
          <InputField label="Edad" type="number" value={person.age} onChange={(e:any)=>setPerson({...person, age: e.target.value})} required />
       </div>
       <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded font-black text-[10px] uppercase mt-4">Siguiente: Asignar Equipo</button>
    </form>
  );

  return (
    <form onSubmit={(e:any) => { e.preventDefault(); onComplete(person, e.target.barcode.value); }} className="space-y-4">
       <div className="bg-indigo-50 p-4 rounded border border-indigo-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 text-white rounded flex items-center justify-center font-bold">{person.name.charAt(0)}</div>
          <div><p className="text-xs font-black leading-none">{person.name}</p><p className="text-[9px] opacity-50 uppercase">{person.document}</p></div>
       </div>
       <div className="p-6 border-2 border-dashed border-indigo-200 rounded text-center space-y-2">
          <p className="text-[10px] font-black uppercase text-indigo-400">Escanee Código de Audioguía</p>
          <input name="barcode" autoFocus className="w-full bg-transparent text-center font-mono text-3xl font-black outline-none" placeholder="00000" required />
       </div>
       <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded font-black text-[10px] uppercase shadow-lg shadow-indigo-100">Registrar Ingreso</button>
    </form>
  );
};

const EquipmentSheet = ({ item, data, updateData, refreshModal }: any) => {
  const changeStatus = (st: string) => {
    const newInv = data.inventory.map((i: any) => i.id === item.id ? { ...i, status: st } : i);
    updateData({ ...data, inventory: newInv });
    refreshModal(newInv.find((i:any)=>i.id===item.id));
  };

  return (
    <div className="space-y-6">
       <div className="bg-slate-50 p-4 rounded border">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-3">Estados Disponibles</p>
          <div className="grid grid-cols-2 gap-2">
            {['available', 'maint_repair', 'maint_qc'].map(s => (
              <button key={s} onClick={() => changeStatus(s)} className={`px-2 py-1.5 rounded border text-[9px] font-black uppercase ${item.status === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>{s.replace('maint_', '')}</button>
            ))}
          </div>
       </div>
       <div>
         <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Historial de Asignaciones</p>
         <div className="space-y-2 max-h-32 overflow-y-auto p-2 border rounded custom-scrollbar bg-slate-50/30">
            {data.visits.filter((v:any)=>v.equipmentIds.includes(item.id)).reverse().map((v:any)=>(
              <div key={v.id} className="text-[9px] flex justify-between items-center opacity-70">
                <span className="font-bold">{v.id}</span>
                <span>{new Date(v.startTime).toLocaleDateString()}</span>
              </div>
            ))}
         </div>
       </div>
       <div>
         <textarea id="maint-text" placeholder="Nueva anotación técnica..." className="input-base h-16 mb-2"></textarea>
         <button onClick={()=>{
           const t = (document.getElementById('maint-text') as any).value;
           if (!t) return;
           const newLogs = [...item.maintenanceLogs, { id: Date.now(), date: new Date().toLocaleDateString(), notes: t, statusAtTime: item.status }];
           const newInv = data.inventory.map((i:any)=>i.id===item.id ? {...i, maintenanceLogs: newLogs} : i);
           updateData({...data, inventory: newInv});
           refreshModal(newInv.find((i:any)=>i.id===item.id));
           (document.getElementById('maint-text') as any).value = "";
         }} className="w-full btn-compact bg-slate-100 justify-center">Añadir Nota</button>
       </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: any = {
    available: { label: 'Libre', class: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    in_use: { label: 'En Uso', class: 'text-amber-600 bg-amber-50 border-amber-100' },
    maint_repair: { label: 'Taller', class: 'text-red-600 bg-red-50 border-red-100' },
    maint_qc: { label: 'QC', class: 'text-indigo-600 bg-indigo-50 border-indigo-100' }
  };
  const c = cfg[status] || cfg.available;
  return <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black border uppercase tracking-widest ${c.class}`}>{c.label}</span>;
};

const PrintView = ({ data, settings, onBack }: any) => (
  <div className="min-h-screen bg-slate-100 p-10 flex flex-col items-center">
    <div className="w-64 bg-white border-2 border-slate-300 p-6 text-center font-mono text-[10px] shadow-xl">
      <img src={settings.logo} className="h-10 mx-auto mb-2" />
      <p className="font-black mb-4 uppercase">{settings.appName}</p>
      <div className="text-left border-y border-slate-100 py-2 space-y-1 mb-4">
        <p><strong>VISITA:</strong> {data.timestamp.slice(0,10)}</p>
        <p><strong>TITULAR:</strong> {data.person.name}</p>
        <p><strong>EQUIPO:</strong> {data.equipment.id}</p>
      </div>
      <p className="text-[8px] opacity-40 leading-tight italic mb-4">{settings.terms}</p>
      <div className="h-10 border border-slate-100 flex items-center justify-center text-slate-200">FIRMA</div>
    </div>
    <div className="mt-6 flex gap-2 no-print">
      <button onClick={() => window.print()} className="btn-compact bg-slate-900 text-white px-8 py-3">IMPRIMIR</button>
      <button onClick={onBack} className="btn-compact border px-8 py-3">REGRESAR</button>
    </div>
  </div>
);

const LoginView = ({ onLogin }: any) => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <div className="max-w-xs w-full card-base p-8 text-center bg-white/5 border-white/10 backdrop-blur-lg">
      <div className="p-4 bg-white rounded-xl inline-flex text-slate-900 mb-6 shadow-2xl scale-125"><Headphones size={32}/></div>
      <h1 className="text-white font-black uppercase tracking-tighter text-2xl mb-8">AudioPro Admin</h1>
      <div className="space-y-3">
        <button onClick={() => onLogin('admin')} className="w-full p-4 border border-white/10 rounded hover:bg-white hover:text-slate-900 text-white font-black uppercase text-[10px] tracking-widest transition-all">Administrador</button>
        <button onClick={() => onLogin('operator')} className="w-full p-4 border border-indigo-500/30 rounded bg-indigo-500/10 text-indigo-400 font-black uppercase text-[10px] tracking-widest transition-all hover:bg-indigo-500 hover:text-white">Operario Taller</button>
      </div>
    </div>
  </div>
);

const InputField = ({ label, ...props }: any) => (
  <div className="w-full text-left">
    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>
    <input className="input-base" {...props} />
  </div>
);