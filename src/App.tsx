import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Headphones, ArrowRightLeft, LayoutDashboard, Download, 
  LogOut, CheckCircle2, CloudOff, AlertCircle, Database, UserPlus, 
  History, Settings, BarChart3, Printer, X, Plus, Save, Briefcase, 
  Wrench, FileText, Camera, Edit2, Trash2, RefreshCw, Upload, Globe, 
  ChevronLeft, ChevronRight, Menu, Hammer, Settings2, ShieldCheck
} from 'lucide-react';

// --- INTERFACES PARA TYPESCRIPT ---
interface MaintLog { id: number; date: string; notes: string; statusAtTime: string; }
interface Equipment { id: string; model: string; status: string; barcode: string; maintenanceLogs: MaintLog[]; visitorId?: string; }
interface Visitor { id: string; name: string; document: string; country: string; age: number; email?: string; }
interface Guide { id: string; name: string; license: string; phone: string; daysWorked: number; }

// --- CONFIGURACIÓN ---
const APP_STORAGE_KEY = "AUDIOGUIDE_PRO_V6";
const INITIAL_DATA = {
  settings: { logo: "https://via.placeholder.com/100?text=LOGO", terms: "Contrato de responsabilidad de equipo...", appName: "AudioPro Admin" },
  syncMetadata: { lastSync: null, status: 'synced' },
  inventory: Array.from({ length: 35 }, (_, i) => ({
    id: `AG-${100 + i}`, model: i % 3 === 0 ? "Premium" : "Standard", status: i === 5 ? "maint_repair" : "available", 
    barcode: `${20000 + i}`, maintenanceLogs: [] 
  })),
  visitors: [ { id: "V-101", name: "Carlos Perez", document: "12345678", country: "España", age: 34 } ],
  guides: [ { id: "G-01", name: "Elena Guía", license: "LIC-9988", phone: "555-0102", daysWorked: 12 } ],
  loans: []
};

const StorageService = {
  saveLocal(data: any) { localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data)); },
  loadLocal() {
    const saved = localStorage.getItem(APP_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  },
  async syncToCloud(data: any) { return new Promise((res) => setTimeout(() => res(new Date().toISOString()), 800)); }
};

export default function App() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [data, setData] = useState<any>(INITIAL_DATA);
  const [view, setView] = useState('status');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [notif, setNotif] = useState<string | null>(null);
  const [modal, setModal] = useState<any>(null);
  const [printData, setPrintData] = useState<any>(null);

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

  // --- CRUD HANDLERS ---
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
    triggerNotif("Guardado con éxito");
  };

  const handleDelete = (type: string, id: string) => {
    if (!window.confirm("¿Confirmas la eliminación definitiva?")) return;
    updateData({ ...data, [type]: data[type].filter((item: any) => item.id !== id) });
    triggerNotif("Eliminado correctamente");
  };

  const handleAssignLoan = (e: React.FormEvent, entity: any, entityType: string) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const barcode = formData.get('barcode');
    const equipment = data.inventory.find((i: any) => i.barcode === barcode);

    if (!equipment) return triggerNotif("Error: El código no existe");
    if (equipment.status !== 'available') return triggerNotif("Equipo no disponible");

    const newInventory = data.inventory.map((item: any) => 
      item.id === equipment.id ? { ...item, status: 'in_use', visitorId: entity.id } : item
    );
    const newLoan = {
      id: `L-${Date.now()}`,
      entityId: entity.id,
      entityType,
      equipmentId: equipment.id,
      barcodeUsed: barcode,
      timestamp: new Date().toISOString(),
      returned: false
    };

    updateData({ ...data, inventory: newInventory, loans: [...data.loans, newLoan] });
    setModal(null);
    setPrintData({ type: 'loan', entity, equipment, timestamp: newLoan.timestamp });
  };

  const handleReceive = (equipmentId: string) => {
    const newInventory = data.inventory.map((item: any) => item.id === equipmentId ? { ...item, status: 'available', visitorId: null } : item);
    const newLoans = data.loans.map((loan: any) => (loan.equipmentId === equipmentId && !loan.returned) ? { ...loan, returned: true } : loan);
    updateData({ ...data, inventory: newInventory, loans: newLoans });
    triggerNotif("Equipo recibido");
  };

  // --- RENDERING HELPERS ---
  if (printData) return <PrintView data={printData} settings={data.settings} onBack={() => setPrintData(null)} />;

  if (!userRole) return <LoginView onLogin={setUserRole} />;

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-100">
      {/* Sidebar Colapsable */}
      <aside className={`${isMenuCollapsed ? 'w-16' : 'w-56'} bg-slate-900 text-white flex flex-col transition-all duration-300 border-r border-slate-800 shrink-0`}>
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          {!isMenuCollapsed && <span className="font-black text-xs uppercase tracking-tighter truncate">{data.settings.appName}</span>}
          <button onClick={() => setIsMenuCollapsed(!isMenuCollapsed)} className="p-1 hover:bg-white/10 rounded">
            {isMenuCollapsed ? <Menu size={16}/> : <ChevronLeft size={16}/>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          <NavItem icon={<LayoutDashboard size={16}/>} label="Dashboard" active={view==='status'} collapsed={isMenuCollapsed} onClick={() => setView('status')} />
          <NavItem icon={<Headphones size={16}/>} label="Inventario" active={view==='inventory'} collapsed={isMenuCollapsed} onClick={() => setView('inventory')} />
          <NavItem icon={<Users size={16}/>} label="Visitantes" active={view==='visitors'} collapsed={isMenuCollapsed} onClick={() => setView('visitors')} />
          <NavItem icon={<Briefcase size={16}/>} label="Guías" active={view==='guides'} collapsed={isMenuCollapsed} onClick={() => setView('guides')} />
          
          {userRole === 'admin' && (
            <>
              <div className="my-2 border-t border-white/5" />
              <NavItem icon={<BarChart3 size={16}/>} label="Estadísticas" active={view==='stats'} collapsed={isMenuCollapsed} onClick={() => setView('stats')} />
              <NavItem icon={<Settings size={16}/>} label="Ajustes" active={view==='settings'} collapsed={isMenuCollapsed} onClick={() => setView('settings')} />
            </>
          )}
          <div className="mt-auto pt-4">
            <NavItem icon={<LogOut size={16}/>} label="Cerrar Sesión" active={false} collapsed={isMenuCollapsed} onClick={() => setUserRole(null)} color="text-red-400 hover:bg-red-500/10" />
          </div>
        </div>

        {/* Sync Status Compacto */}
        <div className="p-2 border-t border-white/5 bg-black/20 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${data.syncMetadata.status === 'synced' ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`} />
            {!isMenuCollapsed && <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Sinc: {data.syncMetadata.lastSync ? 'OK' : 'OFF'}</span>}
          </div>
          <button onClick={() => handleSync()} disabled={isSyncing} className={`text-slate-500 hover:text-white ${isSyncing ? 'animate-spin' : ''}`}>
            <RefreshCw size={10}/>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 h-screen overflow-y-auto custom-scrollbar flex flex-col">
        {/* Header con Breadcrumbs */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
              Panel {userRole} <ChevronRight size={10}/> <span className="text-slate-900">{view}</span>
            </div>
          </div>
          <div className="flex gap-2">
             {view === 'inventory' && userRole === 'admin' && <button onClick={() => setModal({ type: 'inventory_crud' })} className="btn-compact bg-slate-900 text-white"><Plus size={14}/> Equipo</button>}
             {view === 'visitors' && <button onClick={() => setModal({ type: 'visitors_crud' })} className="btn-compact bg-indigo-600 text-white"><UserPlus size={14}/> Visitante</button>}
          </div>
        </header>

        <div className="p-6">
          {notif && (
            <div className="fixed top-16 right-6 bg-slate-900 text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 z-50 text-xs font-bold border border-white/10 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={14} className="text-emerald-400" /> {notif}
            </div>
          )}

          {view === 'status' && <StatusDashboard data={data} />}

          {view === 'inventory' && (
            <div className="card-base">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-tighter">Activo / ID</th>
                    <th className="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-tighter">Barcode</th>
                    <th className="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-tighter">Estado</th>
                    <th className="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-tighter text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.inventory.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-1.5 flex items-center gap-2">
                        <Headphones size={14} className={item.status==='in_use' ? 'text-amber-500' : 'text-slate-300'}/>
                        <div><span className="font-bold">{item.id}</span> <span className="text-[10px] opacity-40">({item.model})</span></div>
                      </td>
                      <td className="px-4 py-1.5 font-mono text-slate-400">{item.barcode}</td>
                      <td className="px-4 py-1.5"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-1.5 text-right space-x-1">
                        <button onClick={() => setModal({ type: 'equipment_details', item })} className="p-1.5 border rounded hover:bg-slate-100"><FileText size={14}/></button>
                        {item.status === 'available' ? (
                          <button onClick={() => setModal({ type: 'assign_choice', item })} className="btn-compact border border-indigo-200 text-indigo-600 hover:bg-indigo-50">Entregar</button>
                        ) : item.status === 'in_use' ? (
                          <button onClick={() => handleReceive(item.id)} className="btn-compact border border-emerald-200 text-emerald-600 hover:bg-emerald-50">Recibir</button>
                        ) : <button onClick={() => setModal({ type: 'equipment_details', item })} className="btn-compact bg-slate-100">Taller</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === 'visitors' && (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {data.visitors.map((v: any) => (
                   <div key={v.id} className="card-base p-3 flex flex-col gap-2 relative group border-slate-200 shadow-none hover:border-indigo-400 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start">
                        <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center font-bold text-sm border">{v.name.charAt(0)}</div>
                        <button onClick={() => handleDelete('visitors', v.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12}/></button>
                      </div>
                      <div>
                        <p className="font-black text-xs truncate leading-none mb-1">{v.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{v.country} • {v.age}A</p>
                      </div>
                      <button onClick={() => setModal({ type: 'assign_flow', visitor: v })} className="w-full bg-slate-900 text-white py-1.5 rounded text-[9px] font-black uppercase tracking-widest mt-1">Asignar</button>
                   </div>
                ))}
             </div>
          )}

          {view === 'settings' && <SettingsView data={data} onUpdate={updateData} onSync={handleSync} />}
          
          {view === 'stats' && <StatsView data={data} />}
          
          {view === 'guides' && (
             <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.guides.map((g: any) => (
                   <div key={g.id} className="card-base p-4 border-l-4 border-l-amber-500">
                      <h3 className="font-black text-xs uppercase mb-3">{g.name}</h3>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-slate-50 p-2 rounded"><strong>{g.daysWorked}</strong> Días</div>
                        <div className="bg-slate-50 p-2 rounded"><strong>{data.loans.filter((l: any)=>l.entityId===g.id && !l.returned).length}</strong> Activos</div>
                      </div>
                      <button onClick={() => setModal({ type: 'guides_crud', item: g })} className="w-full mt-3 btn-compact bg-slate-100 justify-center">Editar Perfil</button>
                   </div>
                ))}
             </div>
          )}
        </div>
      </main>

      {/* --- MODALES OPTIMIZADOS --- */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-4 py-3 border-b flex justify-between items-center bg-slate-50">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{modal.type.replace('_', ' ')}</span>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-slate-200 rounded"><X size={14}/></button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              {modal.type === 'visitors_crud' && <VisitorForm item={modal.item} onSubmit={(e: React.FormEvent) => handleEntityCRUD(e, 'visitors', modal.item?.id)} />}
              {modal.type === 'inventory_crud' && <InventoryForm item={modal.item} onSubmit={(e: React.FormEvent) => handleEntityCRUD(e, 'inventory', modal.item?.id)} />}
              {modal.type === 'equipment_details' && <EquipmentSheet item={modal.item} data={data} updateData={updateData} refreshModal={(i: any) => setModal({ ...modal, item: i })} />}
              {modal.type === 'assign_flow' && <AssignFlow visitor={modal.visitor} onAssign={(e: React.FormEvent) => handleAssignLoan(e, modal.visitor, 'visitor')} />}
              {modal.type === 'assign_choice' && (
                <div className="grid grid-cols-2 gap-3 p-4">
                  <button onClick={() => { setView('visitors'); setModal(null); }} className="p-8 border rounded hover:border-indigo-500 hover:bg-indigo-50 flex flex-col items-center gap-2"><Users/><span className="text-[10px] font-bold">VISITANTE</span></button>
                  <button onClick={() => { setView('guides'); setModal(null); }} className="p-8 border rounded hover:border-amber-500 hover:bg-amber-50 flex flex-col items-center gap-2"><Briefcase/><span className="text-[10px] font-bold">GUÍA</span></button>
                </div>
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
  <button onClick={onClick} className={`w-full flex items-center ${collapsed ? 'justify-center' : 'px-4'} py-2.5 rounded transition-all font-bold text-[11px] uppercase tracking-wider ${active ? 'bg-indigo-600 text-white shadow-md' : color}`}>
    {icon} {!collapsed && <span className="ml-3 truncate">{label}</span>}
  </button>
);

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: any = {
    available: { label: 'Libre', class: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    in_use: { label: 'En Uso', class: 'text-amber-600 bg-amber-50 border-amber-100' },
    maint_pending: { label: 'Taller', class: 'text-slate-500 bg-slate-50 border-slate-200' },
    maint_repair: { label: 'Reparando', class: 'text-red-600 bg-red-50 border-red-100' },
    maint_qc: { label: 'QC', class: 'text-indigo-600 bg-indigo-50 border-indigo-100' }
  };
  const c = cfg[status] || cfg.available;
  return <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-widest ${c.class}`}>{c.label}</span>;
};

const StatCard = ({ label, val, color, icon }: any) => (
  <div className="bg-white p-4 card-base flex items-center justify-between border-slate-200 shadow-none">
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className={`text-2xl font-black ${color.replace('bg-', 'text-')} leading-none`}>{val}</p>
    </div>
    <div className="opacity-10">{icon}</div>
  </div>
);

const MaintBar = ({ label, val, max, color }: any) => {
  const pct = max > 0 ? (val / max) * 100 : 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-2">
       <div className="w-full h-full bg-slate-50 rounded border relative flex items-end overflow-hidden"><div className={`w-full transition-all duration-700 ${color}`} style={{ height: `${pct}%` }} /></div>
       <span className="text-[8px] font-bold text-slate-400 uppercase text-center">{label}<br/>({val})</span>
    </div>
  );
};

// --- FORMS ---
const VisitorForm = ({ item, onSubmit }: any) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><label className="text-[9px] font-black uppercase text-slate-400">Nombre Completo</label><input name="name" defaultValue={item?.name} className="input-base" required /></div>
      <div><label className="text-[9px] font-black uppercase text-slate-400">País</label><input name="country" defaultValue={item?.country || 'España'} className="input-base" required /></div>
      <div><label className="text-[9px] font-black uppercase text-slate-400">Edad</label><input name="age" type="number" defaultValue={item?.age || 25} className="input-base" required /></div>
    </div>
    <button type="submit" className="w-full bg-slate-900 text-white py-2.5 rounded font-black text-[10px] uppercase tracking-widest mt-4">Guardar Registro</button>
  </form>
);

const InventoryForm = ({ item, onSubmit }: any) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <div><label className="text-[9px] font-black uppercase text-slate-400">ID Equipo</label><input name="id" defaultValue={item?.id} disabled={!!item} className="input-base" required /></div>
      <div><label className="text-[9px] font-black uppercase text-slate-400">Código de Barras</label><input name="barcode" defaultValue={item?.barcode} className="input-base" required /></div>
      <div className="col-span-2"><label className="text-[9px] font-black uppercase text-slate-400">Modelo / Versión</label><input name="model" defaultValue={item?.model || 'Standard'} className="input-base" required /></div>
    </div>
    <button type="submit" className="w-full bg-slate-900 text-white py-2.5 rounded font-black text-[10px] uppercase tracking-widest mt-4">Actualizar Inventario</button>
  </form>
);

const EquipmentSheet = ({ item, data, updateData, refreshModal }: any) => {
  const changeStatus = (st: string) => {
    const newInv = data.inventory.map((i: any) => i.id === item.id ? { ...i, status: st } : i);
    const updatedItem = newInv.find((i: any) => i.id === item.id);
    updateData({ ...data, inventory: newInv });
    refreshModal(updatedItem);
  };

  return (
    <div className="space-y-6">
       <div className="bg-slate-50 p-4 rounded border">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-3">Estados Técnicos</p>
          <div className="grid grid-cols-2 gap-2">
            {['available', 'maint_pending', 'maint_repair', 'maint_qc'].map(s => (
              <button key={s} onClick={() => changeStatus(s)} className={`px-2 py-1.5 rounded border text-[9px] font-black uppercase tracking-tighter ${item.status === s ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white hover:bg-slate-100 text-slate-500'}`}>
                {s.replace('maint_', '')}
              </button>
            ))}
          </div>
       </div>
       <div>
         <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Logs de Taller</p>
         <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded custom-scrollbar">
            {item.maintenanceLogs.map((l: any) => (
              <div key={l.id} className="text-[10px] bg-slate-50 p-2 rounded border-l-2 border-l-slate-400 leading-tight">
                <span className="font-bold opacity-30 block text-[8px] mb-1">{l.date}</span> {l.notes}
              </div>
            ))}
         </div>
       </div>
       <div className="pt-2">
         <textarea id="maint-text" placeholder="Nueva anotación..." className="input-base h-16 mb-2"></textarea>
         <button onClick={() => {
           const noteEl = document.getElementById('maint-text') as HTMLTextAreaElement;
           if (!noteEl.value) return;
           const newLogs = [...item.maintenanceLogs, { id: Date.now(), date: new Date().toLocaleDateString(), notes: noteEl.value, statusAtTime: item.status }];
           const newInv = data.inventory.map((i: any) => i.id === item.id ? { ...i, maintenanceLogs: newLogs } : i);
           updateData({ ...data, inventory: newInv });
           refreshModal(newInv.find((i: any) => i.id === item.id));
           noteEl.value = "";
         }} className="w-full btn-compact bg-slate-900 text-white justify-center uppercase tracking-widest text-[9px]">Añadir Registro Técnico</button>
       </div>
    </div>
  );
};

const AssignFlow = ({ visitor, onAssign }: any) => (
  <form onSubmit={onAssign} className="space-y-4">
     <div className="p-6 bg-slate-50 rounded border-2 border-dashed border-slate-200 text-center flex flex-col items-center gap-4">
        <Camera size={24} className="text-slate-300"/>
        <div className="w-full">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Escanee Código</p>
          <input name="barcode" autoFocus className="w-full bg-transparent text-center font-mono text-2xl font-black outline-none placeholder:opacity-10" placeholder="00000" required />
        </div>
     </div>
     <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100">Confirmar Entrega a {visitor.name}</button>
  </form>
);

// --- VIEWS ---
const StatusDashboard = ({ data }: any) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="En Uso" val={data.inventory.filter((i:any)=>i.status==='in_use').length} color="bg-amber-500" icon={<History size={20}/>} />
      <StatCard label="Libres" val={data.inventory.filter((i:any)=>i.status==='available').length} color="bg-emerald-500" icon={<CheckCircle2 size={20}/>} />
      <StatCard label="Taller" val={data.inventory.filter((i:any)=>i.status.includes('maint')).length} color="bg-slate-400" icon={<Wrench size={20}/>} />
      <StatCard label="Total Hoy" val={data.loans.length} color="bg-indigo-600" icon={<Database size={20}/>} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[300px]">
       <div className="card-base p-6 flex flex-col h-full border-slate-100 shadow-none">
          <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-6">Estado Inventario</h4>
          <div className="flex-1 flex items-end gap-6">
             <MaintBar label="Cola" val={data.inventory.filter((i:any)=>i.status==='maint_pending').length} max={data.inventory.length} color="bg-slate-200" />
             <MaintBar label="Reparando" val={data.inventory.filter((i:any)=>i.status==='maint_repair').length} max={data.inventory.length} color="bg-red-400" />
             <MaintBar label="Control" val={data.inventory.filter((i:any)=>i.status==='maint_qc').length} max={data.inventory.length} color="bg-indigo-400" />
          </div>
       </div>
       <div className="bg-slate-900 p-6 rounded-md text-white h-full relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5"><LayoutDashboard size={100}/></div>
          <h4 className="text-indigo-400 font-black text-[9px] uppercase tracking-widest mb-4">Última Actividad</h4>
          <div className="space-y-2 overflow-y-auto max-h-48 custom-scrollbar">
            {data.loans.slice(-10).reverse().map((l:any)=>(
              <div key={l.id} className="text-[10px] flex justify-between p-2 border-b border-white/5 last:border-0">
                <span className="font-bold">{l.equipmentId}</span>
                <span className="opacity-40">{l.timestamp.slice(11, 16)}</span>
              </div>
            ))}
          </div>
       </div>
    </div>
  </div>
);

const StatsView = ({ data }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="card-base p-4">
      <h4 className="text-[9px] font-black text-slate-400 uppercase mb-4">Edad Promedio</h4>
      <div className="text-3xl font-black text-slate-900">28.4 <span className="text-[10px] opacity-40">AÑOS</span></div>
    </div>
    <div className="card-base p-4 col-span-2">
      <h4 className="text-[9px] font-black text-slate-400 uppercase mb-4">Origen Destacado</h4>
      <div className="flex gap-4">
        {['España', 'Francia', 'Italia', 'Alemania'].map(c => (
           <div key={c} className="text-[10px] font-bold px-3 py-1 bg-slate-100 rounded border uppercase tracking-tighter">{c}</div>
        ))}
      </div>
    </div>
  </div>
);

const SettingsView = ({ data, onUpdate, onSync }: any) => (
  <div className="max-w-md mx-auto card-base p-6">
     <h3 className="font-black text-xs uppercase mb-6 border-b pb-2 flex justify-between items-center">Ajustes del Sistema <Settings2 size={12}/></h3>
     <div className="space-y-4">
        <InputField label="Nombre de la Institución" value={data.settings.appName} onChange={(e:any)=>onUpdate({...data, settings:{...data.settings, appName: e.target.value}})} />
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border rounded bg-slate-50 flex items-center justify-center p-1"><img src={data.settings.logo} className="h-full object-contain" /></div>
          <InputField label="URL del Logo" value={data.settings.logo} onChange={(e:any)=>onUpdate({...data, settings:{...data.settings, logo: e.target.value}})} />
        </div>
        <button onClick={()=>onSync()} className="w-full bg-slate-900 text-white py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">Forzar Sincronización <RefreshCw size={12}/></button>
     </div>
  </div>
);

const PrintView = ({ data, settings, onBack }: any) => (
  <div className="min-h-screen bg-white p-10 flex flex-col items-center">
    <div className="w-64 border-4 border-double border-slate-200 p-6 text-center font-mono text-[10px]">
      <img src={settings.logo} className="h-10 mx-auto mb-2" />
      <p className="font-black mb-4">{settings.appName}</p>
      <div className="text-left border-y border-slate-100 py-2 space-y-1 mb-4">
        <p><strong>OP:</strong> {data.type.toUpperCase()}</p>
        <p><strong>EQUIPO:</strong> {data.equipment.id}</p>
        {data.entity && <p className="truncate"><strong>TIT:</strong> {data.entity.name}</p>}
        <p className="opacity-40">{new Date(data.timestamp).toLocaleString()}</p>
      </div>
      <p className="text-[8px] opacity-40 leading-none italic mb-4">{settings.terms}</p>
      <div className="h-10 border border-slate-100 flex items-center justify-center text-slate-200">FIRMA</div>
    </div>
    <div className="mt-6 flex gap-2 no-print">
      <button onClick={() => window.print()} className="btn-compact bg-slate-900 text-white">IMPRIMIR</button>
      <button onClick={onBack} className="btn-compact border">REGRESAR</button>
    </div>
  </div>
);

const LoginView = ({ onLogin }: any) => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <div className="max-w-xs w-full card-base p-8 text-center bg-white/5 border-white/10 backdrop-blur-md">
      <div className="p-4 bg-white rounded-lg inline-flex text-slate-900 mb-6 shadow-xl"><Headphones size={32}/></div>
      <h1 className="text-white font-black uppercase tracking-tighter mb-8">AudioPro Access</h1>
      <div className="space-y-2">
        <button onClick={() => onLogin('admin')} className="w-full p-4 border border-white/10 rounded hover:bg-white hover:text-slate-900 text-white font-black uppercase text-[10px] tracking-widest transition-all">Admin Principal</button>
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