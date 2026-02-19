import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Headphones, ArrowRightLeft, LayoutDashboard, Download, 
  LogOut, CheckCircle2, CloudOff, AlertCircle, Database, UserPlus, 
  History, Settings, BarChart3, Printer, X, Plus, Save, Briefcase, 
  Wrench, FileText, Camera, Edit2, Trash2, RefreshCw, Upload, Globe, User,
  Clock, Hammer, Settings2, ShieldCheck
} from 'lucide-react';

// --- ESTILOS GLOBALES ---
const GlobalStyles = () => (
  <style>{`
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #e2e8f0;
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #cbd5e1;
    }
  `}</style>
);

// --- CONFIGURACIÓN Y MOCKS ---
const APP_STORAGE_KEY = "AUDIOGUIDE_PRO_V4";
const MOCK_API_URL = "https://api-sync-mock.com/v1"; 

const INITIAL_DATA = {
  settings: {
    logo: "https://via.placeholder.com/150?text=LOGO",
    terms: "El titular se compromete a devolver el equipo en perfecto estado. En caso de pérdida, se cobrará el valor total.",
    appName: "Audioguía Pro"
  },
  syncMetadata: {
    lastSync: null,
    status: 'synced'
  },
  inventory: [
    { id: "AG-001", model: "Standard", status: "available", barcode: "10001", maintenanceLogs: [{ id: 1, date: "2024-01-10", notes: "Cambio de batería", statusAtTime: "maint_repair" }] },
    { id: "AG-002", model: "Standard", status: "in_use", barcode: "10002", visitorId: "V-101", maintenanceLogs: [] },
    { id: "AG-003", model: "Premium", status: "maint_pending", barcode: "20001", maintenanceLogs: [] },
    { id: "AG-004", model: "Premium", status: "maint_waiting", barcode: "20002", maintenanceLogs: [{ id: 2, date: "2024-05-20", notes: "Falla en puerto Jack 3.5mm", statusAtTime: "maint_repair" }] },
  ],
  visitors: [
    { id: "V-101", name: "Carlos Perez", document: "12345678", email: "carlos@mail.com", country: "España", age: 34 }
  ],
  guides: [
    { id: "G-01", name: "Elena Guía", license: "LIC-9988", phone: "555-0102", assignedVisitors: [], daysWorked: 12 }
  ],
  loans: [
    { id: "L-501", entityId: "V-101", entityType: "visitor", equipmentId: "AG-002", timestamp: new Date().toISOString(), returned: false, barcodeUsed: "10002" }
  ]
};

const StorageService = {
  saveLocal(data) {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
  },
  loadLocal() {
    const saved = localStorage.getItem(APP_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  },
  async syncToCloud(data) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.85) reject("Error de Red");
        else resolve(new Date().toISOString());
      }, 1200);
    });
  }
};

// --- COMPONENTES AUXILIARES ---

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
    <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-white/20">
      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-black text-slate-800 uppercase tracking-tight text-xl">{title}</h3>
        <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full transition-all text-slate-400"><X size={24}/></button>
      </div>
      <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">{children}</div>
    </div>
  </div>
);

// --- APP PRINCIPAL ---

export default function App() {
  const [userRole, setUserRole] = useState(null);
  const [data, setData] = useState(INITIAL_DATA);
  const [view, setView] = useState('status');
  const [isSyncing, setIsSyncing] = useState(false);
  const [notif, setNotif] = useState(null);
  const [modal, setModal] = useState(null);
  const [printData, setPrintData] = useState(null);

  useEffect(() => {
    setData(StorageService.loadLocal());
  }, []);

  const updateData = (newData) => {
    setData(newData);
    StorageService.saveLocal(newData);
    handleManualSync(newData);
  };

  const handleManualSync = async (currentData = data) => {
    setIsSyncing(true);
    try {
      const syncTime = await StorageService.syncToCloud(currentData);
      const updated = { ...currentData, syncMetadata: { lastSync: syncTime, status: 'synced' } };
      setData(updated);
      StorageService.saveLocal(updated);
      triggerNotif("Sincronizado con la Nube");
    } catch (err) {
      const updated = { ...currentData, syncMetadata: { ...currentData.syncMetadata, status: 'error' } };
      setData(updated);
      StorageService.saveLocal(updated);
      triggerNotif("Error de Red: Trabajando en Local");
    } finally {
      setIsSyncing(false);
    }
  };

  const triggerNotif = (msg) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 4000);
  };

  // --- LOGICA CRUD ---

  const handleEntityCRUD = (e, type, id = null) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const obj = { id: id || `${type.charAt(0).toUpperCase()}-${Date.now()}` };
    formData.forEach((value, key) => { obj[key] = value; });

    let newCollection;
    if (id) {
      newCollection = data[type].map(v => v.id === id ? { ...v, ...obj } : v);
    } else {
      if (type === 'inventory') {
        obj.status = 'available';
        obj.maintenanceLogs = [];
      }
      newCollection = [...data[type], obj];
    }

    updateData({ ...data, [type]: newCollection });
    setModal(null);
    triggerNotif("Registro procesado correctamente");
  };

  const handleDelete = (type, id) => {
    if (!window.confirm("¿Confirmas la eliminación definitiva?")) return;
    updateData({ ...data, [type]: data[type].filter(item => item.id !== id) });
    triggerNotif("Eliminado correctamente");
  };

  // --- LOGICA OPERATIVA ---

  const handleAssignLoan = (e, entity, entityType) => {
    e.preventDefault();
    const barcode = new FormData(e.target).get('barcode');
    const equipment = data.inventory.find(i => i.barcode === barcode);

    if (!equipment) return triggerNotif("Error: El código no existe");
    if (equipment.status !== 'available') return triggerNotif("Equipo no disponible");

    const newInventory = data.inventory.map(item => 
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

  const handleReceive = (equipmentId) => {
    const equipment = data.inventory.find(i => i.id === equipmentId);
    const newInventory = data.inventory.map(item => 
      item.id === equipmentId ? { ...item, status: 'available', visitorId: null } : item
    );
    const newLoans = data.loans.map(loan => 
      (loan.equipmentId === equipmentId && !loan.returned) ? { ...loan, returned: true } : loan
    );
    updateData({ ...data, inventory: newInventory, loans: newLoans });
    setPrintData({ type: 'return', equipment, timestamp: new Date().toISOString() });
    triggerNotif("Retorno registrado");
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        updateData(imported);
        triggerNotif("Base de datos restaurada");
      } catch {
        triggerNotif("Error en archivo");
      }
    };
    reader.readAsText(file);
  };

  // --- RENDERIZADO ---

  if (printData) {
    return (
      <div className="min-h-screen bg-white p-12 flex flex-col items-center animate-in fade-in duration-500">
        <div className="w-full max-w-sm border-8 border-double border-slate-200 p-10 rounded-3xl text-center font-mono shadow-2xl">
          <img src={data.settings.logo} alt="Logo" className="h-24 mx-auto mb-6" />
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{data.settings.appName}</h2>
          <div className="my-8 border-y-4 border-slate-50 py-8 text-left text-sm space-y-3">
            <p className="flex justify-between"><strong>TICKET:</strong> <span className="font-black text-indigo-600">#{Date.now().toString().slice(-6)}</span></p>
            <p className="flex justify-between"><strong>OPERACIÓN:</strong> <span className="font-black">{printData.type === 'loan' ? 'ENTREGA' : 'DEVOLUCIÓN'}</span></p>
            <p className="flex justify-between"><strong>EQUIPO:</strong> <span>{printData.equipment.id}</span></p>
            {printData.entity && <p className="flex justify-between"><strong>TITULAR:</strong> <span className="uppercase">{printData.entity.name}</span></p>}
            <p className="flex justify-between"><strong>FECHA:</strong> <span className="text-[10px]">{new Date(printData.timestamp).toLocaleString()}</span></p>
          </div>
          <p className="text-[10px] text-slate-400 text-left mb-10 italic leading-relaxed">{data.settings.terms}</p>
          <div className="h-28 border-2 border-slate-50 rounded-2xl flex items-center justify-center text-slate-200 uppercase font-black tracking-widest text-xs">Firma Autorizada</div>
        </div>
        <div className="mt-12 flex gap-6 no-print">
          <button onClick={() => window.print()} className="bg-slate-900 text-white px-10 py-4 rounded-[2rem] font-black flex items-center gap-3 hover:scale-105 transition-all shadow-2xl shadow-slate-200"><Printer size={24}/> Imprimir</button>
          <button onClick={() => setPrintData(null)} className="bg-slate-100 text-slate-500 px-10 py-4 rounded-[2rem] font-black hover:bg-slate-200 transition-all">Regresar</button>
        </div>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 overflow-hidden">
        <GlobalStyles />
        <div className="absolute inset-0 opacity-20">
           <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-500 rounded-full blur-[120px]" />
           <div className="absolute bottom-0 -right-20 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-[4rem] shadow-2xl p-14 border border-white/20 relative z-10">
          <div className="flex justify-center mb-10">
            <div className="p-8 bg-white rounded-[2.5rem] text-slate-900 shadow-2xl scale-110">
              <Headphones size={56} strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-4xl font-black text-center text-white mb-2 uppercase tracking-tighter">AudioPro</h1>
          <p className="text-center text-indigo-300 font-bold mb-12 text-sm tracking-widest uppercase opacity-80">v4 • Taller & Control</p>
          <div className="space-y-5">
            <RoleButton onClick={() => setUserRole('admin')} icon={<Database/>} label="Administración" desc="Control total del sistema" color="hover:bg-white hover:text-slate-900 border-white/10 text-white" />
            <RoleButton onClick={() => setUserRole('operator')} icon={<ArrowRightLeft/>} label="Operador" desc="Gestión de flujo diario" color="hover:bg-indigo-500 hover:text-white border-white/10 text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden font-sans text-slate-800">
      <GlobalStyles />
      
      {/* Sidebar - FIXED HEIGHT, NO SCROLL */}
      <nav className="w-80 bg-slate-900 text-white flex flex-col shrink-0 h-screen overflow-hidden border-r border-slate-800">
        <div className="p-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-xl">
             <Headphones size={24}/>
          </div>
          <span className="font-black tracking-tighter text-2xl uppercase italic leading-none">{data.settings.appName}</span>
        </div>
        
        <div className="flex-1 px-6 space-y-1 overflow-hidden">
          <NavItem icon={<LayoutDashboard/>} label="Dashboard" active={view==='status'} onClick={() => setView('status')} />
          <NavItem icon={<Headphones/>} label="Inventario" active={view==='inventory'} onClick={() => setView('inventory')} />
          <NavItem icon={<Users/>} label="Visitantes" active={view==='visitors'} onClick={() => setView('visitors')} />
          <NavItem icon={<Briefcase/>} label="Guías" active={view==='guides'} onClick={() => setView('guides')} />
          
          {userRole === 'admin' && (
            <div className="pt-10 pb-4">
              <p className="px-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Ajustes Admin</p>
              <NavItem icon={<BarChart3/>} label="Estadísticas" active={view==='stats'} onClick={() => setView('stats')} />
              <NavItem icon={<Settings/>} label="Configuración" active={view==='settings'} onClick={() => setView('settings')} />
            </div>
          )}
        </div>

        <div className="p-8 border-t border-white/5 space-y-6 shrink-0 bg-slate-900">
          <div className="bg-white/5 p-5 rounded-3xl border border-white/10">
             <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Nube</span>
                <button onClick={() => handleManualSync()} disabled={isSyncing} className={`p-2 rounded-xl transition-all ${isSyncing ? 'animate-spin bg-white/10' : 'hover:bg-white text-slate-900 bg-indigo-500 text-white'}`}><RefreshCw size={14}/></button>
             </div>
             <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${data.syncMetadata.status === 'synced' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                <p className="text-[11px] font-bold text-slate-300">{data.syncMetadata.lastSync ? `Sinc: ${new Date(data.syncMetadata.lastSync).toLocaleTimeString()}` : 'Modo Offline'}</p>
             </div>
          </div>
          <button onClick={() => setUserRole(null)} className="w-full flex items-center gap-3 p-5 rounded-3xl text-red-400 hover:bg-red-500/10 transition-all font-black text-sm uppercase tracking-[0.2em]"><LogOut size={20}/> Salir</button>
        </div>
      </nav>

      {/* Main Content Area - SINGLE SCROLLBAR */}
      <main className="flex-1 h-screen overflow-y-auto custom-scrollbar flex flex-col bg-slate-50/50">
        
        {/* Header - NOT FIXED, SCROLLS WITH CONTENT */}
        <header className="h-28 bg-white/80 backdrop-blur-md border-b border-slate-100 px-12 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1">{userRole} PANEL</h2>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{view}</h1>
          </div>
          <div className="flex gap-4">
            {view === 'inventory' && userRole === 'admin' && (
              <button onClick={() => setModal({ type: 'inventory_crud' })} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-2xl text-xs font-black hover:scale-105 transition-all shadow-xl shadow-slate-200"><Plus size={18} /> Nuevo Equipo</button>
            )}
            {view === 'visitors' && (
              <button onClick={() => setModal({ type: 'visitors_crud' })} className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black hover:scale-105 transition-all shadow-xl shadow-indigo-100"><UserPlus size={18} /> Registrar</button>
            )}
            {view === 'guides' && userRole === 'admin' && (
              <button onClick={() => setModal({ type: 'guides_crud' })} className="flex items-center gap-2 bg-amber-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black hover:scale-105 transition-all shadow-xl shadow-amber-100"><Plus size={18} /> Nuevo Guía</button>
            )}
          </div>
        </header>

        {/* Dynamic Content Container */}
        <div className="p-12 pb-24">
          {notif && (
            <div className="fixed top-32 right-12 bg-slate-900 text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-right-8 z-[100] border border-white/10 font-bold text-sm">
              <CheckCircle2 size={20} className="text-emerald-400" /> {notif}
            </div>
          )}

          {view === 'status' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard label="En Uso" val={data.inventory.filter(i => i.status === 'in_use').length} color="bg-amber-500" icon={<History/>} />
                <StatCard label="Libres" val={data.inventory.filter(i => i.status === 'available').length} color="bg-emerald-500" icon={<CheckCircle2/>} />
                <StatCard label="En Taller" val={data.inventory.filter(i => i.status?.includes('maint')).length} color="bg-slate-400" icon={<Wrench/>} />
                <StatCard label="Visitas" val={data.loans.length} color="bg-indigo-600" icon={<Users/>} />
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                 <div className="xl:col-span-2 bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col h-[500px]">
                    <h4 className="text-slate-300 font-black text-xs uppercase tracking-widest mb-10">Estado del Taller de Mantenimiento</h4>
                    <div className="flex-1 flex items-end gap-10">
                       <MaintBar label="Pendientes" val={data.inventory.filter(i=>i.status==='maint_pending').length} max={data.inventory.length} color="bg-slate-200" />
                       <MaintBar label="Reparación" val={data.inventory.filter(i=>i.status==='maint_repair').length} max={data.inventory.length} color="bg-red-400" />
                       <MaintBar label="Repuestos" val={data.inventory.filter(i=>i.status==='maint_waiting').length} max={data.inventory.length} color="bg-amber-400" />
                       <MaintBar label="Control QC" val={data.inventory.filter(i=>i.status==='maint_qc').length} max={data.inventory.length} color="bg-indigo-400" />
                    </div>
                 </div>
                 <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white flex flex-col shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><BarChart3 size={120}/></div>
                    <h4 className="text-indigo-400 font-black text-xs uppercase tracking-widest mb-8">Últimas Visitas</h4>
                    <div className="flex-1 space-y-5 relative">
                      {data.loans.slice(-4).reverse().map(l => (
                        <div key={l.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                          <div>
                            <p className="text-sm font-black">{l.equipmentId}</p>
                            <p className="text-[10px] text-slate-500 uppercase">{l.entityType}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${l.returned ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                            {l.returned ? 'Devuelto' : 'Activo'}
                          </span>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {view === 'inventory' && (
            <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-sm animate-in fade-in duration-500">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Activo</th>
                      <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Barcode</th>
                      <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                      <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Panel de Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.inventory.map(item => (
                      <tr key={item.id} className="group hover:bg-slate-50 transition-all">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-3xl ${item.status === 'in_use' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                              <Headphones size={24}/>
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-lg leading-none mb-1">{item.id}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.model}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8 font-mono text-sm text-slate-500 font-bold">{item.barcode}</td>
                        <td className="px-10 py-8"><StatusBadge status={item.status} /></td>
                        <td className="px-10 py-8 text-right space-x-3">
                          <button onClick={() => setModal({ type: 'equipment_details', item })} className="p-4 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all" title="Ver Detalles/Mantenimiento">
                            <FileText size={20}/>
                          </button>
                          {item.status === 'available' ? (
                            <button onClick={() => setModal({ type: 'assign_choice', item })} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-100">Entregar</button>
                          ) : item.status === 'in_use' ? (
                            <button onClick={() => handleReceive(item.id)} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-emerald-100">Recibir</button>
                          ) : (
                             <button onClick={() => setModal({ type: 'equipment_details', item })} className="bg-slate-800 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">En Taller</button>
                          )}
                          {userRole === 'admin' && (
                            <button onClick={() => setModal({ type: 'inventory_crud', item })} className="p-4 text-slate-300 hover:text-indigo-600 transition-colors"><Edit2 size={18}/></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'visitors' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
              {data.visitors.map(v => (
                <div key={v.id} className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all flex flex-col gap-8 group">
                  <div className="flex items-center justify-between">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center font-black text-3xl border-4 border-white shadow-inner">
                      {v.name.charAt(0)}
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => setModal({ type: 'visitors_crud', item: v })} className="p-3 text-slate-300 hover:text-indigo-600 transition-colors"><Edit2 size={20}/></button>
                       <button onClick={() => handleDelete('visitors', v.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                    </div>
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-2xl tracking-tighter mb-1 group-hover:text-indigo-600 transition-colors leading-none">{v.name}</p>
                    <div className="flex items-center gap-3 text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                       <Globe size={14}/> {v.country} • {v.age} AÑOS
                    </div>
                  </div>
                  <button onClick={() => setModal({ type: 'assign_flow', visitor: v })} className="w-full bg-slate-900 text-white py-5 rounded-3xl transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-600 shadow-xl shadow-slate-200">
                    <Plus size={20}/> Entregar Equipo
                  </button>
                </div>
              ))}
            </div>
          )}

          {view === 'guides' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {data.guides.map(g => (
                <div key={g.id} className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col gap-8 group relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 text-slate-50 opacity-0 group-hover:opacity-100 transition-opacity"><Briefcase size={120}/></div>
                  <div className="flex items-center justify-between relative">
                    <div className="p-5 bg-amber-50 text-amber-600 rounded-[2rem]"><Briefcase size={32}/></div>
                    {userRole === 'admin' && (
                       <div className="flex gap-1">
                          <button onClick={() => setModal({ type: 'guides_crud', item: g })} className="p-2 text-slate-300 hover:text-amber-600"><Edit2 size={16}/></button>
                          <button onClick={() => handleDelete('guides', g.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                       </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tighter text-slate-900 leading-none mb-2 uppercase">{g.name}</h3>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{g.license}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-slate-50 p-5 rounded-3xl">
                        <p className="text-3xl font-black text-slate-900 leading-none mb-1">{g.daysWorked}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Días Trabajados</p>
                     </div>
                     <div className="bg-slate-50 p-5 rounded-3xl">
                        <p className="text-3xl font-black text-slate-900 leading-none mb-1">{data.loans.filter(l => l.entityId === g.id && !l.returned).length}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Equipos Activos</p>
                     </div>
                  </div>
                  <button onClick={() => setModal({ type: 'assign_flow_guide', guide: g })} className="w-full bg-amber-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-100 hover:bg-amber-700 transition-all flex items-center justify-center gap-3">
                    <Plus size={20}/> Asignar Equipos
                  </button>
                </div>
              ))}
            </div>
          )}

          {view === 'settings' && (
             <div className="max-w-3xl bg-white rounded-[4rem] p-12 shadow-sm border border-slate-100 animate-in fade-in duration-500 mx-auto">
                <h3 className="text-2xl font-black mb-10 tracking-tighter uppercase text-slate-900 flex items-center gap-4"><Settings2 className="text-indigo-600"/> Configuración del Sistema</h3>
                <div className="space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div>
                         <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Logo Corporativo</label>
                         <div className="p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100 flex items-center justify-center mb-4">
                            <img src={data.settings.logo} className="h-24 object-contain" />
                         </div>
                         <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-mono" value={data.settings.logo} onChange={(e)=>updateData({...data, settings:{...data.settings, logo: e.target.value}})} />
                      </div>
                      <div className="space-y-6">
                         <InputField label="Nombre de Aplicación" value={data.settings.appName} onChange={(e)=>updateData({...data, settings:{...data.settings, appName: e.target.value}})} />
                         <div className="pt-4">
                            <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Mantenimiento de Datos</label>
                            <button onClick={()=>{
                               const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                               const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='audiopro_v4_full_backup.json'; a.click();
                            }} className="w-full flex items-center justify-between p-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all">
                               Descargar Backup <Download size={18}/>
                            </button>
                         </div>
                      </div>
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Términos del Contrato (Recibos)</label>
                      <textarea className="w-full h-40 p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-sm leading-relaxed outline-none focus:border-indigo-600 transition-all" value={data.settings.terms} onChange={(e)=>updateData({...data, settings:{...data.settings, terms: e.target.value}})} />
                   </div>
                   <button onClick={()=>triggerNotif("Configuración Global Guardada")} className="w-full bg-emerald-500 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-emerald-100 hover:bg-emerald-600 transition-all">Guardar Cambios</button>
                </div>
             </div>
          )}

          {view === 'stats' && (
             <div className="space-y-12 animate-in fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-10">Demografía de Visitantes</h4>
                      <div className="space-y-8">
                         <StatBarMini label="Nacionales (España)" val={data.visitors.filter(v=>v.country==='España').length} total={data.visitors.length} color="bg-indigo-600" />
                         <StatBarMini label="Internacionales" val={data.visitors.filter(v=>v.country!=='España').length} total={data.visitors.length} color="bg-emerald-500" />
                         <StatBarMini label="Visitantes Adultos (>18)" val={data.visitors.filter(v=>v.age>=18).length} total={data.visitors.length} color="bg-amber-500" />
                      </div>
                   </div>
                   <div className="bg-slate-900 p-12 rounded-[4rem] text-white flex flex-col justify-center items-center text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 to-transparent" />
                      <div className="p-6 bg-white/10 rounded-[2.5rem] mb-6"><ShieldCheck size={48} className="text-emerald-400"/></div>
                      <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Seguridad de Activos</h3>
                      <p className="text-slate-400 text-sm max-w-xs font-bold">Tienes un total de {data.inventory.length} equipos bajo control estricto.</p>
                      <div className="mt-8 text-6xl font-black tracking-tighter">{((data.inventory.filter(i=>i.status==='available').length / data.inventory.length)*100).toFixed(0)}%</div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2">Disponibilidad de Flota</p>
                   </div>
                </div>
             </div>
          )}
        </div>
      </main>

      {/* --- MODALES DINÁMICOS --- */}

      {(modal?.type === 'visitors_crud' || modal?.type === 'guides_crud' || modal?.type === 'inventory_crud') && (
        <Modal title={modal.item ? "Editar Registro" : "Nuevo Registro"} onClose={() => setModal(null)}>
          <form onSubmit={(e) => handleEntityCRUD(e, modal.type.split('_')[0], modal.item?.id)} className="grid grid-cols-2 gap-6">
            {modal.type === 'visitors_crud' && (
              <>
                <div className="col-span-2"><InputField label="Nombre Completo" name="name" defaultValue={modal.item?.name} required /></div>
                <InputField label="Documento" name="document" defaultValue={modal.item?.document} required />
                <InputField label="País" name="country" defaultValue={modal.item?.country || 'España'} required />
                <InputField label="Edad" name="age" type="number" defaultValue={modal.item?.age || 25} required />
                <InputField label="Email" name="email" type="email" defaultValue={modal.item?.email} />
              </>
            )}
            {modal.type === 'guides_crud' && (
              <>
                <div className="col-span-2"><InputField label="Nombre del Guía" name="name" defaultValue={modal.item?.name} required /></div>
                <InputField label="Licencia" name="license" defaultValue={modal.item?.license} required />
                <InputField label="Teléfono" name="phone" defaultValue={modal.item?.phone} required />
                <InputField label="Días Laborados" name="daysWorked" type="number" defaultValue={modal.item?.daysWorked || 0} required />
              </>
            )}
            {modal.type === 'inventory_crud' && (
              <>
                <InputField label="ID de Equipo (Ej: AG-00X)" name="id" defaultValue={modal.item?.id} disabled={!!modal.item} required />
                <InputField label="Código de Barras" name="barcode" defaultValue={modal.item?.barcode} required />
                <div className="col-span-2"><InputField label="Modelo / Tipo" name="model" defaultValue={modal.item?.model || 'Standard'} required /></div>
              </>
            )}
            <div className="col-span-2 pt-8">
              <button className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-200">Guardar Información</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === 'equipment_details' && (
        <Modal title={`Hoja de Vida: ${modal.item.id}`} onClose={() => setModal(null)}>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-8">
                 <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 shadow-inner">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Settings size={16}/> Cambiar Estado Operativo</p>
                    <div className="grid grid-cols-2 gap-3">
                       <MaintStateBtn active={modal.item.status === 'available'} color="bg-emerald-500" label="Disponible" onClick={()=> {
                          const newInv = data.inventory.map(i=>i.id===modal.item.id ? {...i, status:'available'} : i);
                          updateData({...data, inventory: newInv});
                          setModal({...modal, item: newInv.find(i=>i.id===modal.item.id)});
                       }} />
                       <MaintStateBtn active={modal.item.status === 'maint_pending'} color="bg-slate-400" label="En Cola" onClick={()=> {
                          const newInv = data.inventory.map(i=>i.id===modal.item.id ? {...i, status:'maint_pending'} : i);
                          updateData({...data, inventory: newInv});
                          setModal({...modal, item: newInv.find(i=>i.id===modal.item.id)});
                       }} />
                       <MaintStateBtn active={modal.item.status === 'maint_repair'} color="bg-red-500" label="Reparando" onClick={()=> {
                          const newInv = data.inventory.map(i=>i.id===modal.item.id ? {...i, status:'maint_repair'} : i);
                          updateData({...data, inventory: newInv});
                          setModal({...modal, item: newInv.find(i=>i.id===modal.item.id)});
                       }} />
                       <MaintStateBtn active={modal.item.status === 'maint_waiting'} color="bg-amber-500" label="Repuestos" onClick={()=> {
                          const newInv = data.inventory.map(i=>i.id===modal.item.id ? {...i, status:'maint_waiting'} : i);
                          updateData({...data, inventory: newInv});
                          setModal({...modal, item: newInv.find(i=>i.id===modal.item.id)});
                       }} />
                       <MaintStateBtn active={modal.item.status === 'maint_qc'} color="bg-indigo-500" label="Control QC" onClick={()=> {
                          const newInv = data.inventory.map(i=>i.id===modal.item.id ? {...i, status:'maint_qc'} : i);
                          updateData({...data, inventory: newInv});
                          setModal({...modal, item: newInv.find(i=>i.id===modal.item.id)});
                       }} />
                    </div>
                 </div>

                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><History size={16}/> Historial de Préstamos</p>
                    <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar pr-2 text-left">
                       {data.loans.filter(l => l.equipmentId === modal.item.id).length === 0 ? <p className="text-xs text-slate-300 italic">Sin actividad registrada.</p> : 
                         data.loans.filter(l => l.equipmentId === modal.item.id).reverse().map(l => (
                           <div key={l.id} className="text-[11px] font-bold p-4 bg-slate-50 rounded-2xl flex justify-between">
                              <span className="text-slate-800">{l.entityType === 'visitor' ? 'VIS' : 'GUÍA'}: {data[l.entityType === 'visitor' ? 'visitors' : 'guides'].find(e => e.id === l.entityId)?.name || 'N/A'}</span>
                              <span className="text-slate-400">{new Date(l.timestamp).toLocaleDateString()}</span>
                           </div>
                         ))
                       }
                    </div>
                 </div>
              </div>

              <div className="flex flex-col h-full">
                 <div className="flex-1 bg-white p-10 rounded-[3rem] border-2 border-slate-100 flex flex-col">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-8 tracking-widest flex items-center gap-2"><Hammer size={16}/> Registro Técnico de Taller</p>
                    <div className="flex-1 space-y-4 mb-8 overflow-y-auto custom-scrollbar pr-2">
                       {modal.item.maintenanceLogs.map((log) => (
                         <div key={log.id} className="text-xs bg-slate-50 p-5 rounded-2xl border border-slate-100 relative text-left">
                            <span className="absolute -top-2 left-4 px-2 bg-white text-[9px] font-black text-slate-300 rounded border border-slate-50">{log.date}</span>
                            <p className="font-bold text-slate-700 leading-relaxed">{log.notes}</p>
                         </div>
                       ))}
                       {modal.item.maintenanceLogs.length === 0 && <p className="text-xs text-slate-300 text-center py-10">Sin reportes técnicos.</p>}
                    </div>
                    <div className="flex gap-3">
                       <textarea id="maint-input" placeholder="Nueva anotación técnica..." className="flex-1 p-5 bg-slate-50 rounded-3xl border border-slate-100 text-sm outline-none focus:border-indigo-600 transition-all" />
                       <button onClick={() => {
                         const note = document.getElementById('maint-input').value;
                         if (!note) return;
                         const newInv = data.inventory.map(item => item.id === modal.item.id ? { ...item, maintenanceLogs: [...item.maintenanceLogs, { id: Date.now(), date: new Date().toISOString().split('T')[0], notes: note, statusAtTime: item.status }] } : item);
                         updateData({ ...data, inventory: newInv });
                         setModal({ ...modal, item: newInv.find(i => i.id === modal.item.id) });
                         document.getElementById('maint-input').value = "";
                       }} className="bg-slate-900 text-white p-5 rounded-3xl hover:bg-indigo-600 transition-all shadow-lg"><Plus size={24}/></button>
                    </div>
                 </div>
              </div>
           </div>
        </Modal>
      )}

      {modal?.type === 'assign_flow' && (
        <Modal title={`Entrega a ${modal.visitor.name}`} onClose={() => setModal(null)}>
          <form onSubmit={(e) => handleAssignLoan(e, modal.visitor, 'visitor')} className="space-y-8">
            <div className="p-12 bg-indigo-50 rounded-[4rem] border-4 border-white shadow-2xl flex flex-col items-center gap-10">
              <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-indigo-600 shadow-xl scale-125"><Camera size={48} /></div>
              <div className="w-full text-center">
                <p className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Ingresar Código de Audioguía</p>
                <input name="barcode" autoFocus className="w-full bg-transparent text-center font-mono text-6xl font-black text-indigo-900 outline-none placeholder:opacity-10 uppercase tracking-tighter" placeholder="00000" required />
              </div>
            </div>
            <button className="w-full bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95">Confirmar y Emitir Ticket</button>
          </form>
        </Modal>
      )}

      {modal?.type === 'assign_flow_guide' && (
        <Modal title={`Asignar a Guía: ${modal.guide.name}`} onClose={() => setModal(null)}>
          <form onSubmit={(e) => handleAssignLoan(e, modal.guide, 'guide')} className="space-y-8">
            <div className="p-12 bg-amber-50 rounded-[4rem] border-4 border-white shadow-2xl flex flex-col items-center gap-10">
              <div className="p-6 bg-white rounded-3xl text-amber-600 shadow-xl"><Headphones size={48} /></div>
              <div className="w-full text-center">
                <p className="text-[12px] font-black text-amber-500 uppercase tracking-[0.3em] mb-4">Escaneo de Equipo para Grupo</p>
                <input name="barcode" autoFocus className="w-full bg-transparent text-center font-mono text-6xl font-black text-amber-900 outline-none placeholder:opacity-10 uppercase tracking-tighter" placeholder="00000" required />
              </div>
            </div>
            <button className="w-full bg-amber-600 text-white py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-amber-200 transition-all hover:scale-105">Vincular a Responsabilidad de Guía</button>
          </form>
        </Modal>
      )}

      {modal?.type === 'assign_choice' && (
        <Modal title="Seleccione Tipo de Préstamo" onClose={() => setModal(null)}>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <button onClick={() => { setView('visitors'); setModal(null); }} className="p-14 rounded-[4rem] border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 flex flex-col items-center gap-6 transition-all group shadow-sm hover:shadow-xl">
                <div className="p-8 bg-slate-50 rounded-[2.5rem] group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors shadow-sm"><Users size={64}/></div>
                <span className="font-black text-sm text-slate-800 uppercase tracking-widest">A Visitante Individual</span>
              </button>
              <button onClick={() => { setView('guides'); setModal(null); }} className="p-14 rounded-[4rem] border-2 border-slate-100 hover:border-amber-500 hover:bg-amber-50 flex flex-col items-center gap-6 transition-all group shadow-sm hover:shadow-xl">
                <div className="p-8 bg-slate-50 rounded-[2.5rem] group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors shadow-sm"><Briefcase size={64}/></div>
                <span className="font-black text-sm text-slate-800 uppercase tracking-widest">A Guía Autorizado</span>
              </button>
           </div>
        </Modal>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES ESTILO ---

const NavItem = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-5 rounded-[1.5rem] transition-all font-black text-xs uppercase tracking-[0.15em] ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-900/40 translate-x-2' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
    {React.cloneElement(icon, { size: 20, strokeWidth: 2.5 })} {label}
  </button>
);

const StatCard = ({ label, val, color, icon }) => (
  <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all">
    <div className={`absolute -top-4 -right-4 p-10 opacity-5 group-hover:opacity-10 transition-all ${color.replace('bg-', 'text-')}`}>{icon}</div>
    <p className="text-6xl font-black text-slate-900 mb-2 tracking-tighter">{val}</p>
    <div className="flex items-center gap-3">
       <div className={`w-2 h-2 rounded-full ${color} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
       <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{label}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const cfg = {
    available: { label: 'Disponible', class: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    in_use: { label: 'En Uso', class: 'bg-amber-50 text-amber-700 border-amber-100' },
    maint_pending: { label: 'Cola Taller', class: 'bg-slate-100 text-slate-500 border-slate-200' },
    maint_repair: { label: 'Reparando', class: 'bg-red-50 text-red-600 border-red-100' },
    maint_waiting: { label: 'Repuestos', class: 'bg-orange-50 text-orange-600 border-orange-100' },
    maint_qc: { label: 'Control QC', class: 'bg-indigo-50 text-indigo-700 border-indigo-100' }
  };
  const c = cfg[status] || cfg.available;
  return (
    <span className={`px-5 py-2 rounded-2xl text-[9px] font-black border uppercase tracking-[0.15em] shadow-sm ${c.class}`}>
      {c.label}
    </span>
  );
};

const RoleButton = ({ onClick, icon, label, desc, color }) => (
  <button onClick={onClick} className={`w-full p-8 rounded-[2.5rem] border-2 flex items-center gap-8 transition-all group shadow-sm hover:shadow-2xl hover:-translate-y-1 ${color}`}>
    <div className="p-5 bg-white/10 rounded-3xl transition-all group-hover:scale-110">
       {React.cloneElement(icon, { size: 32 })}
    </div>
    <div className="text-left">
       <p className="font-black text-xl tracking-tight uppercase leading-none mb-1">{label}</p>
       <p className="text-xs font-bold opacity-60 italic">{desc}</p>
    </div>
  </button>
);

const InputField = ({ label, ...props }) => (
  <div className="w-full">
    <label className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3 ml-3">{label}</label>
    <input 
      className="w-full p-6 rounded-3xl border border-slate-100 bg-slate-50/50 text-sm font-bold text-slate-700 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner" 
      {...props} 
    />
  </div>
);

const MaintBar = ({ label, val, max, color }) => {
  const pct = max > 0 ? (val / max) * 100 : 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-4 group">
       <div className="w-full h-full bg-slate-50 rounded-[2.5rem] relative flex items-end overflow-hidden border border-slate-100">
          <div className={`w-full transition-all duration-1000 ease-out ${color} border-t border-white/20`} style={{ height: `${pct}%` }}>
             <div className="absolute top-2 w-full text-center text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity">
                {val}
             </div>
          </div>
       </div>
       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center leading-tight">{label}</span>
    </div>
  );
};

const StatBarMini = ({ label, val, total, color }) => {
  const pct = total > 0 ? (val / total) * 100 : 0;
  return (
    <div className="space-y-3">
       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span>{label}</span>
          <span className="text-slate-900">{val} / {total}</span>
       </div>
       <div className="w-full h-3.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
          <div className={`h-full transition-all duration-1000 shadow-inner ${color}`} style={{ width: `${pct}%` }} />
       </div>
    </div>
  );
};

const MaintStateBtn = ({ active, color, label, onClick }) => (
  <button onClick={onClick} className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-1 ${active ? `${color} text-white border-transparent shadow-lg shadow-slate-200` : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
     <span className={`w-3 h-3 rounded-full ${active ? 'bg-white' : color} mb-2`} />
     <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
  </button>
);
