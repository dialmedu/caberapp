import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Headphones, ArrowRightLeft, LayoutDashboard, Download, 
  LogOut, CheckCircle2, CloudOff, AlertCircle, Database, UserPlus, 
  History, Settings, BarChart3, Printer, X, Plus, Save, Briefcase, 
  Wrench, FileText, Camera, Edit2, Trash2, RefreshCw, Upload, Globe, 
  ChevronLeft, ChevronRight, Menu, Hammer, Settings2, ShieldCheck,
  Timer, Scan, Phone, Mail, UserCheck, Calendar, Search, ListChecks,
  SortAsc, SortDesc, Filter, MoreHorizontal, QrCode, Map, Play, CheckSquare,
  ClipboardList, AlertTriangle, Archive, PackagePlus, ArrowDownLeft
} from 'lucide-react';

// --- INTERFACES PARA TYPESCRIPT (VERCEL COMPATIBILITY) ---
interface MaintLog { id: number; date: string; notes: string; statusAtTime: string; }
interface KardexEntry { id: number; date: string; type: 'entry' | 'exit' | 'return'; qty: number; note: string; }
interface Equipment { 
  id: string; 
  model: string; 
  status: string; 
  barcode: string; 
  maintenanceLogs: MaintLog[]; 
  kardex: KardexEntry[];
  stockTotal: number;
  stockAvailable: number;
  stockInUse: number;
}
interface Person { id: string; name: string; document: string; country: string; age: number; email: string; phone: string; type: 'visitor' | 'guide'; code?: string; }
interface Visit { 
  id: string; 
  personId: string; 
  equipmentIds: string[]; // Aquí guardamos los IDs de los modelos/códigos asignados
  equipmentQty: { [key: string]: number }; // Mapa de ID de equipo a cantidad asignada
  startTime: string; 
  endTime?: string; 
  status: 'active' | 'finished';
  guideId?: string; 
  date: string;
  tourId?: string;
}
interface Tour {
  id: string;
  guideId: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'finished';
  name: string;
}

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
    available: { label: 'En Stock', class: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    in_use: { label: 'En Uso', class: 'text-amber-600 bg-amber-50 border-amber-100' },
    maint_repair: { label: 'Taller', class: 'text-red-600 bg-red-50 border-red-100' },
    active: { label: 'Activo', class: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    finished: { label: 'Cerrado', class: 'text-slate-400 bg-slate-50 border-slate-200' }
  };
  const c = cfg[status] || { label: status, class: 'bg-slate-100' };
  return <span className={`px-1.5 py-0.5 rounded text-[7px] font-black border uppercase tracking-tighter ${c.class}`}>{c.label}</span>;
}

function InputField({ label, ...props }: any) {
  return (
    <div className="w-full text-left">
      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{label}</label>
      {props.type === 'select' ? (
        <select className="input-base" {...props}>{props.children}</select>
      ) : (
        <input className="input-base" {...props} />
      )}
    </div>
  );
}

function VisitTimer({ startTime, thresholds, showLabel = true }: { startTime: string, thresholds: any, showLabel?: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const calculate = () => setElapsed(Math.floor((new Date().getTime() - new Date(startTime).getTime()) / 60000));
    calculate();
    const interval = setInterval(calculate, 30000);
    return () => clearInterval(interval);
  }, [startTime]);
  let colorClass = "text-emerald-600 bg-emerald-50 border-emerald-100";
  if (elapsed >= (thresholds.yellow || 10)) colorClass = "text-amber-600 bg-amber-50 border-amber-100";
  if (elapsed >= (thresholds.red || 15)) colorClass = "text-red-600 bg-red-50 border-red-100 animate-pulse";
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded border font-black text-[9px] ${colorClass}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${elapsed >= (thresholds.red || 15) ? 'bg-red-500' : elapsed >= (thresholds.yellow || 10) ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      {elapsed}m {showLabel && <span className="opacity-50">TRANS.</span>}
    </div>
  );
}

// --- COMPONENTES DE LÓGICA Y VISTAS ---

function EquipmentKardexView({ item, data, updateData, triggerNotif, refreshModal }: any) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const addInventory = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: KardexEntry = { id: Date.now(), date: new Date().toLocaleString(), type: 'entry', qty: Number(qty), note };
    const newInv = data.inventory.map((i: Equipment) => i.id === item.id ? {
      ...i, 
      stockTotal: i.stockTotal + Number(qty), 
      stockAvailable: i.stockAvailable + Number(qty),
      kardex: [...(i.kardex || []), newEntry]
    } : i);
    updateData({ ...data, inventory: newInv });
    refreshModal(newInv.find((i: any) => i.id === item.id));
    setQty(1); setNote('');
    triggerNotif("Stock actualizado");
  };

  return (
    <div className="space-y-4 text-left">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Total" val={item.stockTotal} color="text-slate-900" />
        <StatCard label="Libres" val={item.stockAvailable} color="text-emerald-600" />
        <StatCard label="En Uso" val={item.stockInUse} color="text-amber-600" />
      </div>

      <div className="bg-slate-50 p-3 rounded border">
        <p className="text-[8px] font-black uppercase text-slate-400 mb-2">Ajuste de Entrada (Kardex)</p>
        <form onSubmit={addInventory} className="flex gap-1">
          <input type="number" value={qty} onChange={(e)=>setQty(parseInt(e.target.value))} className="input-base w-16" min="1" />
          <input placeholder="Motivo..." value={note} onChange={(e)=>setNote(e.target.value)} className="input-base flex-1" />
          <button type="submit" className="p-2 bg-slate-900 text-white rounded hover:bg-indigo-600 transition-colors"><PackagePlus size={14}/></button>
        </form>
      </div>

      <div className="max-h-40 overflow-y-auto custom-scrollbar border rounded p-2 text-[9px]">
         <p className="font-black uppercase opacity-30 text-[7px] mb-2 tracking-widest">Historial de Trazabilidad</p>
         {item.kardex?.slice().reverse().map((k: KardexEntry) => (
           <div key={k.id} className="flex justify-between border-b last:border-0 py-1.5 border-slate-100">
              <div>
                 <span className={`font-black uppercase px-1 rounded ${k.type === 'entry' ? 'text-emerald-600 bg-emerald-50' : k.type === 'exit' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'}`}>{k.type}</span>
                 <span className="ml-2 font-bold">{k.note || 'Sin nota'}</span>
              </div>
              <div className="text-right">
                 <p className="font-black">{k.type === 'entry' || k.type === 'return' ? '+' : '-'}{k.qty}</p>
                 <p className="opacity-40 text-[7px]">{k.date.split(',')[0]}</p>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}

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
    if (existing) setFormData({ ...formData, ...existing });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="p-3 bg-indigo-50 rounded border border-indigo-100 flex items-center gap-2 shadow-inner">
        <QrCode size={18} className="text-indigo-600" />
        <input 
          placeholder="Scan QR de Cédula..." 
          value={qrValue} 
          onChange={(e) => setQrValue(e.target.value)} 
          className="w-full bg-transparent border-none text-[10px] font-bold outline-none uppercase" 
        />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <InputField label="Cédula / Documento" value={formData.document} onBlur={handleDocBlur} onChange={(e: any) => setFormData({...formData, document: e.target.value})} required />
          <InputField label="Código Referencia" value={formData.code} onChange={(e: any) => setFormData({...formData, code: e.target.value})} />
        </div>
        <InputField label="Nombre Completo" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} required />
        <div className="grid grid-cols-2 gap-2">
          <InputField label="País" value={formData.country} onChange={(e: any) => setFormData({...formData, country: e.target.value})} />
          <InputField label="Edad" type="number" value={formData.age} onChange={(e: any) => setFormData({...formData, age: e.target.value})} />
        </div>
        <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded font-black text-[10px] uppercase mt-4 tracking-widest hover:bg-indigo-600 transition-colors shadow-lg">
          {title || "Registrar e Iniciar Visita"}
        </button>
      </form>
    </div>
  );
}

function VisitDetailsView({ visit, data, updateData, triggerNotif, guides, thresholds }: any) {
  const person = data.people.find((p: any) => p.id === visit.personId);
  const [bc, setBc] = useState('');
  const [qty, setQty] = useState(1);

  const addEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    const eq = data.inventory.find((i: Equipment) => i.barcode === bc);
    if (!eq || eq.stockAvailable < qty) return triggerNotif("Stock insuficiente");
    
    const newInv = data.inventory.map((i: Equipment) => i.id === eq.id ? { 
      ...i, 
      stockAvailable: i.stockAvailable - Number(qty), 
      stockInUse: i.stockInUse + Number(qty),
      kardex: [...(i.kardex || []), { id: Date.now(), date: new Date().toLocaleString(), type: 'exit', qty: Number(qty), note: `Salida Visita ${visit.id.slice(-4)}` }]
    } : i);
    
    const currentQty = visit.equipmentQty?.[eq.id] || 0;
    const newVisits = data.visits.map((v: any) => v.id === visit.id ? { 
      ...v, 
      equipmentIds: Array.from(new Set([...v.equipmentIds, eq.id])),
      equipmentQty: { ...v.equipmentQty, [eq.id]: currentQty + Number(qty) }
    } : v);

    updateData({ ...data, inventory: newInv, visits: newVisits });
    setBc('');
    setQty(1);
    triggerNotif("Unidades vinculadas");
  };

  const removeUnits = (eqId: string) => {
    const qtyInVisit = visit.equipmentQty?.[eqId] || 0;
    if (qtyInVisit <= 0) return;

    const newInv = data.inventory.map((i: Equipment) => i.id === eqId ? { 
      ...i, 
      stockAvailable: i.stockAvailable + 1, 
      stockInUse: i.stockInUse - 1,
      kardex: [...(i.kardex || []), { id: Date.now(), date: new Date().toLocaleString(), type: 'return', qty: 1, note: `Retorno Parcial Visita ${visit.id.slice(-4)}` }]
    } : i);

    const newVisits = data.visits.map((v: any) => {
      if (v.id === visit.id) {
        const remaining = qtyInVisit - 1;
        const newQtyMap = { ...v.equipmentQty, [eqId]: remaining };
        if (remaining === 0) delete newQtyMap[eqId];
        return { 
          ...v, 
          equipmentQty: newQtyMap,
          equipmentIds: remaining === 0 ? v.equipmentIds.filter((id: string) => id !== eqId) : v.equipmentIds
        };
      }
      return v;
    });

    updateData({ ...data, inventory: newInv, visits: newVisits });
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300">
      <div className="border-b pb-4 flex justify-between items-start">
        <div><h3 className="font-black text-sm uppercase text-indigo-600 leading-none mb-1">{person?.name}</h3><p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">{person?.document}</p></div>
        {visit.status === 'active' && <VisitTimer startTime={visit.startTime} thresholds={thresholds} />}
      </div>
      <div className="space-y-4">
        <InputField label="Guía Asignado" type="select" value={visit.guideId || ''} onChange={(e: any) => {
            const newVisits = data.visits.map((v: any) => v.id === visit.id ? { ...v, guideId: e.target.value } : v);
            updateData({ ...data, visits: newVisits });
        }}>
          <option value="">Individual</option>
          {guides.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </InputField>
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase text-slate-400">Equipos en uso</p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
            {visit.equipmentIds.map((id: string) => (
              <div key={id} className="p-2 bg-slate-50 border rounded flex justify-between items-center text-[10px] font-black uppercase">
                 <span className="flex items-center gap-2"><Headphones size={12}/> {id} <span className="text-indigo-600">x{visit.equipmentQty?.[id] || 1}</span></span>
                 <button onClick={() => removeUnits(id)} title="Devolver 1 unidad" className="text-red-400 p-1 hover:text-red-600 transition-colors"><X size={12}/></button>
              </div>
            ))}
            {visit.equipmentIds.length === 0 && <p className="text-[10px] opacity-30 italic text-center py-2">Sin equipos asignados</p>}
          </div>
          <form onSubmit={addEquipment} className="flex gap-1 pt-2 border-t mt-2">
             <input type="number" value={qty} onChange={(e)=>setQty(parseInt(e.target.value))} className="input-base w-12 text-center font-black" min="1" />
             <input value={bc} onChange={(e) => setBc(e.target.value)} autoFocus placeholder="Scan para entrega..." className="input-base flex-1 h-9 font-bold" />
             <button type="submit" className="px-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-md"><Plus size={16}/></button>
          </form>
        </div>
      </div>
    </div>
  );
}

function TourManagerView({ data, onComplete, triggerNotif }: any) {
  const [guideId, setGuideId] = useState('');
  const [tourName, setTourName] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [scanValue, setScanValue] = useState('');

  const addMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanValue) return;
    const person = data.people.find((p: any) => p.document === scanValue || p.name.toLowerCase().includes(scanValue.toLowerCase()));
    setMembers([...members, person ? { ...person, qty: 1, bc: '' } : { id: `TMP-${Date.now()}`, document: scanValue, name: 'Nuevo Visitante', qty: 1, bc: '', type: 'visitor' }]);
    setScanValue('');
  };

  const updateMemberData = (idx: number, key: string, val: any) => {
    const updated = [...members];
    updated[idx][key] = val;
    setMembers(updated);
  };

  return (
    <div className="space-y-4 text-left animate-in fade-in">
      <div className="grid grid-cols-2 gap-2">
        <InputField label="Nombre del Grupo" value={tourName} onChange={(e:any)=>setTourName(e.target.value)} />
        <InputField label="Guía" type="select" value={guideId} onChange={(e:any)=>setGuideId(e.target.value)}>
          <option value="">Seleccionar...</option>
          {data.guides.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </InputField>
      </div>
      <div className="pt-2 border-t">
        <form onSubmit={addMember} className="flex gap-2 mb-2">
           <input placeholder="Scan DOC integrante..." value={scanValue} onChange={(e)=>setScanValue(e.target.value)} className="input-base h-9" />
           <button type="submit" className="p-2 bg-slate-900 text-white rounded shadow-sm"><UserPlus size={16}/></button>
        </form>
        <div className="card-base max-h-48 overflow-y-auto border-indigo-100">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50 border-b font-black text-slate-400 uppercase sticky top-0">
              <tr><th className="p-2">Persona</th><th className="p-2 w-16">Cant</th><th className="p-2">Barcode</th><th className="p-2"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {members.map((m, i) => (
                <tr key={i}>
                  <td className="p-2 font-bold uppercase truncate max-w-[100px]">{m.name}</td>
                  <td className="p-2"><input type="number" value={m.qty} onChange={(e)=>updateMemberData(i, 'qty', parseInt(e.target.value))} className="w-full bg-slate-50 border rounded p-1 text-center" min="1" /></td>
                  <td className="p-2"><input placeholder="Scan..." className="w-full bg-slate-50 border rounded p-1 font-black" onBlur={(e)=>updateMemberData(i, 'bc', e.target.value)} /></td>
                  <td className="p-2 text-right"><button onClick={()=>setMembers(members.filter((_,idx)=>idx!==i))} className="text-red-300"><X size={12}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <button onClick={()=>onComplete({ name: tourName, guideId, members })} disabled={!guideId || members.length===0} className="w-full bg-indigo-600 text-white py-3 rounded font-black text-[10px] uppercase shadow-lg">Iniciar Tour Grupal</button>
    </div>
  );
}

function TourDetailsView({ tour, data, onFinishTour, onFinishVisit, thresholds }: any) {
  const guide = data.guides.find((g: any) => g.id === tour.guideId);
  const tourVisits = data.visits.filter((v: any) => v.tourId === tour.id);

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300">
      <div className="flex justify-between items-start border-b pb-4">
        <div>
          <h3 className="font-black text-sm uppercase text-indigo-600 leading-none mb-1">{tour.name || tour.id}</h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Briefcase size={10}/> Guía: {guide?.name || 'N/A'}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={tour.status} />
          {tour.status === 'active' && <VisitTimer startTime={tour.startTime} thresholds={thresholds} />}
        </div>
      </div>

      <div className="space-y-2">
        <div className="card-base overflow-hidden border-slate-100 shadow-none">
          <table className="w-full text-[10px]">
             <thead className="bg-slate-50/50 border-b">
                <tr className="text-left opacity-40 uppercase font-black">
                  <th className="p-2">Persona</th>
                  <th className="p-2">Unidades</th>
                  <th className="p-2 text-right">Acción</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {tourVisits.map((v: any) => {
                  const p = data.people.find((pers: any) => pers.id === v.personId);
                  const active = v.status === 'active';
                  const totalQty = Object.values(v.equipmentQty || {}).reduce((acc: any, curr: any) => acc + curr, 0);
                  return (
                    <tr key={v.id} className={!active ? 'opacity-40 grayscale bg-slate-50/50' : 'hover:bg-slate-50/20'}>
                       <td className="p-2 font-bold uppercase">{p?.name}</td>
                       <td className="p-2 font-black">{totalQty} und</td>
                       <td className="p-2 text-right">
                          {active ? (
                            <button onClick={() => onFinishVisit(v.id)} className="text-indigo-600 font-black text-[8px] uppercase border border-indigo-100 px-2 py-0.5 rounded hover:bg-indigo-50 transition-colors">Recibir</button>
                          ) : (
                            <CheckSquare size={12} className="text-emerald-500 ml-auto"/>
                          )}
                       </td>
                    </tr>
                  );
                })}
             </tbody>
          </table>
        </div>
      </div>

      {tour.status === 'active' && (
        <button onClick={() => onFinishTour(tour.id)} className="w-full bg-slate-900 text-white py-3 rounded font-black text-[10px] uppercase shadow-xl hover:bg-red-600 transition-colors">Finalizar y Recibir Todo</button>
      )}
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
       <div className="bg-slate-50 p-3 rounded border shadow-inner">
          <p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">Estado Técnico</p>
          <div className="grid grid-cols-2 gap-2">
            {['available', 'maint_repair', 'maint_qc', 'maint_pending'].map(s => (
              <button key={s} onClick={() => changeStatus(s)} className={`px-2 py-1.5 rounded border text-[8px] font-black uppercase transition-all ${item.status === s ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-white text-slate-400 hover:border-slate-300'}`}>{s.replace('maint_', '')}</button>
            ))}
          </div>
       </div>
       <div className="max-h-32 overflow-y-auto custom-scrollbar border p-2 rounded text-[9px] bg-slate-50/50">
          <p className="font-black uppercase opacity-30 text-[7px] mb-2 tracking-widest">Registros de Mantenimiento</p>
          {item.maintenanceLogs.map((l:any) => <div key={l.id} className="mb-2 border-l-2 border-indigo-400 pl-2"><strong>{l.date}</strong>: {l.notes}</div>)}
       </div>
       <div className="flex gap-1 pt-2 border-t mt-2">
          <textarea id="m-note" className="input-base h-12" placeholder="Nota técnica..." />
          <button onClick={()=>{
             const noteEl = document.getElementById('m-note') as HTMLTextAreaElement;
             if(!noteEl.value) return;
             const nl = [...item.maintenanceLogs, { id: Date.now(), date: new Date().toLocaleDateString(), notes: noteEl.value, statusAtTime: item.status }];
             const ni = data.inventory.map((i:any)=>i.id===item.id?{...i, maintenanceLogs: nl}:i);
             updateData({...data, inventory: ni});
             refreshModal(ni.find((i:any)=>i.id===item.id));
             noteEl.value = "";
          }} className="px-3 bg-slate-900 text-white rounded hover:bg-indigo-600 transition-colors shadow-lg"><Save size={14}/></button>
       </div>
    </div>
  );
}

function GenericCRUDForm({ type, item, onSubmit }: any) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target as any); const d:any={}; fd.forEach((v,k)=>d[k]=v); onSubmit(d); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {type === 'inventory' && (
          <>
            <div><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ID / Código</label><input name="id" defaultValue={item?.id} disabled={!!item} className="input-base" required /></div>
            <div><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Barcode</label><input name="barcode" defaultValue={item?.barcode} className="input-base" required /></div>
            <div><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cant. Inicial</label><input name="stockTotal" type="number" defaultValue={item?.stockTotal || 0} className="input-base" /></div>
            <div><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Modelo</label><input name="model" defaultValue={item?.model} className="input-base" /></div>
          </>
        )}
        {type === 'guide' && (
          <>
            <div className="col-span-2"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nombre</label><input name="name" defaultValue={item?.name} className="input-base" required /></div>
            <div><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Licencia</label><input name="license" defaultValue={item?.license} className="input-base" required /></div>
            <div><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Teléfono</label><input name="phone" defaultValue={item?.phone} className="input-base" /></div>
          </>
        )}
      </div>
      <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded font-black text-[10px] uppercase mt-4 shadow-lg">Guardar Registro</button>
    </form>
  );
}

function PersonHistoryView({ person, visits }: any) {
  const myVisits = visits.filter((v: any) => v.personId === person.id);
  return (
    <div className="space-y-4 text-left">
      <div className="border-b pb-2 flex justify-between items-end">
        <div><h3 className="font-black text-xs uppercase text-indigo-600 leading-none mb-1">{person.name}</h3><p className="text-[8px] opacity-40 uppercase font-bold">{person.document}</p></div>
        <span className="text-[10px] font-black text-indigo-600 uppercase">{myVisits.length} Visitas</span>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        {myVisits.reverse().map((v: any) => (
          <div key={v.id} className="p-2 border rounded bg-slate-50 flex justify-between items-center text-[10px]">
            <div><p className="font-black uppercase text-slate-400 tracking-tighter">{v.date}</p><p className="font-bold opacity-60">EQ: {v.equipmentIds.join(', ')}</p></div>
            <StatusBadge status={v.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- CONSTANTES Y DATOS INICIALES ---

const INITIAL_DATA = {
  settings: { 
    logo: "https://via.placeholder.com/100?text=LOGO", 
    terms: "Contrato de equipos...", 
    appName: "AudioPro Admin",
    timerThresholds: { green: 5, yellow: 10, red: 15 }
  },
  syncMetadata: { lastSync: null, status: 'synced' },
  people: [{ id: "P-101", name: "Carlos Perez", document: "12345678", country: "España", age: 34, email: "carlos@mail.com", phone: "600000000", type: 'visitor' }],
  inventory: [{ 
    id: "ST-01", model: "Premium V4", status: "available", barcode: "1001", 
    maintenanceLogs: [], kardex: [], stockTotal: 10, stockAvailable: 10, stockInUse: 0 
  }],
  visits: [],
  tours: [],
  guides: [{ id: "G-101", name: "Elena Guía", license: "LIC-9988", phone: "555-0102", daysWorked: 12, type: 'guide' }],
  loans: [] 
};

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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => { setData(StorageService.loadLocal()); }, []);

  const triggerNotif = (msg: string) => { setNotif(msg); setTimeout(() => setNotif(null), 2500); };
  const updateData = (newData: any) => { setData(newData); StorageService.saveLocal(newData); handleSync(newData); };

  const handleSync = async (currentData = data) => {
    setIsSyncing(true);
    try {
      const time: any = await StorageService.syncToCloud(currentData);
      setData({ ...currentData, syncMetadata: { lastSync: time, status: 'synced' } });
    } catch {
      setData({ ...currentData, syncMetadata: { ...currentData.syncMetadata, status: 'error' } });
    } finally { setIsSyncing(false); }
  };

  // --- HANDLERS LÓGICA ---

  const handleDelete = (type: string, id: string) => {
    if (!window.confirm("¿Confirmas la eliminación definitiva?")) return;
    const newData = { ...data, [type]: data[type].filter((item: any) => item.id !== id) };
    if (type === 'guides') {
      newData.visits = newData.visits.map((v: any) => v.guideId === id ? { ...v, guideId: undefined } : v);
      newData.tours = newData.tours.map((t: any) => t.guideId === id ? { ...t, guideId: '' } : t);
    }
    updateData(newData);
    triggerNotif("Registro eliminado");
  };

  const handleFinishVisit = (visitId: string) => {
    const visit = data.visits.find((v: any) => v.id === visitId);
    if (!visit) return;
    
    let newInventory = [...data.inventory];
    Object.keys(visit.equipmentQty || {}).forEach(eqId => {
       const qty = visit.equipmentQty[eqId];
       newInventory = newInventory.map(i => i.id === eqId ? {
          ...i,
          stockAvailable: i.stockAvailable + qty,
          stockInUse: i.stockInUse - qty,
          kardex: [...(i.kardex || []), { id: Date.now(), date: new Date().toLocaleString(), type: 'return', qty: qty, note: `Cierre Visita ${visit.id.slice(-4)}` }]
       } : i);
    });

    const newVisits = data.visits.map((v: any) => v.id === visitId ? { ...v, status: 'finished', endTime: new Date().toISOString() } : v);
    updateData({ ...data, inventory: newInventory, visits: newVisits });
    triggerNotif("Retorno exitoso");
    if (modal?.type === 'visit_details') setModal(null);
    if (modal?.type === 'tour_details') {
       const tour = data.tours.find((t:any)=>t.id === modal.tour.id);
       setModal({ type: 'tour_details', tour });
    }
  };

  const handleCreateTour = ({ name, guideId, members }: any) => {
    const tourId = `TOUR-${Date.now()}`;
    const newTour: Tour = { id: tourId, name, guideId, startTime: new Date().toISOString(), status: 'active' };
    let newVisits = [...data.visits];
    let newInventory = [...data.inventory];
    let newPeople = [...data.people];

    members.forEach((m: any) => {
       const pIdx = newPeople.findIndex(p => p.document === m.document);
       let personId = pIdx > -1 ? newPeople[pIdx].id : `P-${Math.random().toString(36).slice(2, 7)}`;
       if (pIdx === -1) newPeople.push({ ...m, id: personId });

       if (m.bc) {
          const eq = newInventory.find(i => i.barcode === m.bc);
          if (eq && eq.stockAvailable >= m.qty) {
             const vId = `VIS-${Math.random().toString(36).slice(2, 7)}`;
             newVisits.push({ id: vId, personId, equipmentIds: [eq.id], equipmentQty: { [eq.id]: m.qty }, tourId, guideId, startTime: new Date().toISOString(), date: new Date().toISOString().split('T')[0], status: 'active' });
             newInventory = newInventory.map(inv => inv.id === eq.id ? { 
                ...inv, 
                stockAvailable: inv.stockAvailable - m.qty, 
                stockInUse: inv.stockInUse + m.qty,
                kardex: [...(inv.kardex || []), { id: Date.now(), date: new Date().toLocaleString(), type: 'exit', qty: m.qty, note: `Salida Tour ${tourId.slice(-4)}` }]
             } : inv);
          }
       }
    });

    updateData({ ...data, tours: [...data.tours, newTour], visits: newVisits, inventory: newInventory, people: newPeople });
    setModal(null);
    triggerNotif("Tour Iniciado");
  };

  const handleFinishTour = (tourId: string) => {
    const tourVisits = data.visits.filter((v: any) => v.tourId === tourId && v.status === 'active');
    let newInventory = [...data.inventory];
    
    tourVisits.forEach((v: any) => {
       Object.keys(v.equipmentQty || {}).forEach(eqId => {
          const qty = v.equipmentQty[eqId];
          newInventory = newInventory.map(i => i.id === eqId ? {
             ...i,
             stockAvailable: i.stockAvailable + qty,
             stockInUse: i.stockInUse - qty,
             kardex: [...(i.kardex || []), { id: Date.now(), date: new Date().toLocaleString(), type: 'return', qty: qty, note: `Cierre Tour ${tourId.slice(-4)}` }]
          } : i);
       });
    });

    const newVisits = data.visits.map((v: any) => v.tourId === tourId ? { ...v, status: 'finished', endTime: new Date().toISOString() } : v);
    const newTours = data.tours.map((t: any) => t.id === tourId ? { ...t, status: 'finished', endTime: new Date().toISOString() } : t);
    updateData({ ...data, tours: newTours, visits: newVisits, inventory: newInventory });
    setModal(null);
    triggerNotif("Tour Finalizado");
  };

  const handleSaveVisitFlow = (personData: any) => {
    let updatedPeople = [...data.people];
    const pIdx = updatedPeople.findIndex(p => p.document === personData.document);
    let finalPersonId = pIdx > -1 ? updatedPeople[pIdx].id : `P-${Date.now()}`;
    if (pIdx > -1) updatedPeople[pIdx] = { ...updatedPeople[pIdx], ...personData };
    else updatedPeople.push({ ...personData, id: finalPersonId, type: 'visitor' });

    const newVisit: Visit = {
      id: `VIS-${Date.now()}`, personId: finalPersonId, equipmentIds: [], equipmentQty: {},
      startTime: new Date().toISOString(), date: new Date().toISOString().split('T')[0], status: 'active'
    };
    updateData({ ...data, people: updatedPeople, visits: [...data.visits, newVisit] });
    setModal({ type: 'visit_details', visit: newVisit });
  };

  const handleScanQuickReturn = (barcode: string) => {
    const eq = data.inventory.find((i: Equipment) => i.barcode === barcode);
    if (!eq) return triggerNotif("Código no registrado");
    if (eq.stockInUse <= 0) return triggerNotif("Sin unidades en uso");

    const newInv = data.inventory.map((i: Equipment) => i.barcode === barcode ? {
      ...i,
      stockAvailable: i.stockAvailable + 1,
      stockInUse: i.stockInUse - 1,
      kardex: [...(i.kardex || []), { id: Date.now(), date: new Date().toLocaleString(), type: 'return', qty: 1, note: "Scan Rápido" }]
    } : i);
    updateData({ ...data, inventory: newInv });
    triggerNotif(`Unidad recibida`);
  };

  const handleSaveEntity = (type: string, itemData: any, id: string | null = null) => {
    let collection = [...data[type]];
    if (id) {
      const idx = collection.findIndex(i => i.id === id);
      collection[idx] = { ...collection[idx], ...itemData };
    } else {
      collection.push({ 
        ...itemData, 
        id: `${type.charAt(0).toUpperCase()}-${Date.now()}`, 
        maintenanceLogs: [], 
        kardex: [], 
        stockTotal: parseInt(itemData.stockTotal || 0),
        stockAvailable: parseInt(itemData.stockTotal || 0),
        stockInUse: 0
      });
    }
    updateData({ ...data, [type]: collection });
    setModal(null);
  };

  const filteredData = useMemo(() => {
    const target = view === 'visits' ? 'visits' : view;
    let result = [...(data[target] || [])];
    if (view === 'visits') result = result.filter((v:any) => v.date === selectedDate);
    if (searchQuery) result = result.filter((item: any) => JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase()));
    return result;
  }, [data, view, searchQuery, selectedDate]);

  const paginatedData = useMemo(() => filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredData, currentPage]);

  if (!userRole) return <LoginView onLogin={setUserRole} />;

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-100 font-sans text-slate-900 selection:bg-indigo-100">
      <aside className={`${isMenuCollapsed ? 'w-12' : 'w-48'} bg-slate-900 text-white flex flex-col transition-all duration-200 border-r border-slate-800 shrink-0`}>
        <div className="p-3 flex items-center justify-between border-b border-white/5">
          {!isMenuCollapsed && <span className="font-black text-[10px] uppercase truncate opacity-50 tracking-widest leading-none">{data.settings.appName}</span>}
          <button onClick={() => setIsMenuCollapsed(!isMenuCollapsed)} className="p-1 hover:bg-white/10 rounded mx-auto transition-transform"><Menu size={14}/></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
          <NavItem icon={<UserCheck size={16}/>} label="Visitas" active={view==='visits'} collapsed={isMenuCollapsed} onClick={() => setView('visits')} />
          <NavItem icon={<ArrowDownLeft size={16}/>} label="Recibo Rápido" active={view==='returns'} collapsed={isMenuCollapsed} onClick={() => setView('returns')} />
          <NavItem icon={<Archive size={16}/>} label="Kardex / Equipos" active={view==='inventory'} collapsed={isMenuCollapsed} onClick={() => setView('inventory')} />
          <NavItem icon={<Map size={16}/>} label="Tours" active={view==='tours'} collapsed={isMenuCollapsed} onClick={() => setView('tours')} />
          <NavItem icon={<Users size={16}/>} label="Personas" active={view==='people'} collapsed={isMenuCollapsed} onClick={() => setView('people')} />
          <NavItem icon={<Briefcase size={16}/>} label="Guías" active={view==='guides'} collapsed={isMenuCollapsed} onClick={() => setView('guides')} />
          {userRole === 'admin' && (
            <div className="pt-3 border-t border-white/5 mt-2 space-y-1">
              <NavItem icon={<BarChart3 size={16}/>} label="Métricas" active={view==='stats'} collapsed={isMenuCollapsed} onClick={() => setView('stats')} />
              <NavItem icon={<Settings size={16}/>} label="Ajustes" active={view==='settings'} collapsed={isMenuCollapsed} onClick={() => setView('settings')} />
            </div>
          )}
        </div>
        <div className="p-1.5 border-t border-white/5 bg-black/20">
           <NavItem icon={<LogOut size={16}/>} label="Salir" collapsed={isMenuCollapsed} onClick={() => setUserRole(null)} color="text-red-400 hover:bg-red-500/10" />
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto custom-scrollbar flex flex-col bg-slate-50/50">
        <header className="h-10 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {userRole} <ChevronRight size={10}/> <span className="text-slate-900 font-black">{view}</span>
          </div>
          <div className="flex gap-2">
             <div className="relative flex items-center mr-2">
                <Search size={10} className="absolute left-2 text-slate-400"/>
                <input placeholder="Buscar..." value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="pl-6 pr-2 py-1.5 border rounded bg-slate-50 text-[9px] w-32 outline-none focus:border-indigo-400 transition-all shadow-inner" />
             </div>
             {view === 'tours' && <button onClick={() => setModal({ type: 'create_tour' })} className="btn-compact bg-indigo-600 text-white shadow-lg"><Plus size={12}/> Iniciar Tour</button>}
             {view === 'inventory' && userRole === 'admin' && <button onClick={() => setModal({ type: 'inventory_crud' })} className="btn-compact bg-slate-900 text-white shadow-md"><Plus size={12}/> Nuevo Item</button>}
             {view === 'guides' && userRole === 'admin' && <button onClick={() => setModal({ type: 'guide_crud' })} className="btn-compact bg-slate-900 text-white shadow-md"><Plus size={12}/> Guía</button>}
             {view === 'people' && <button onClick={() => setModal({ type: 'person_crud' })} className="btn-compact bg-indigo-600 text-white shadow-md"><Plus size={12}/> Persona</button>}
             <button onClick={() => setModal({ type: 'register_flow' })} className="btn-compact bg-indigo-600 text-white shadow-lg"><Plus size={12}/> Visita</button>
          </div>
        </header>

        <div className="p-3 w-full">
          {notif && (
            <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-2xl flex items-center gap-2 z-[100] text-[10px] font-black animate-in fade-in border border-white/10">
              <CheckCircle2 size={14} className="text-emerald-400" /> {notif}
            </div>
          )}

          {view === 'returns' && (
            <div className="max-w-md mx-auto space-y-6 pt-10 text-center animate-in zoom-in">
              <div className="p-10 border-2 border-dashed border-indigo-200 bg-white rounded-xl flex flex-col items-center gap-4">
                 <Scan size={48} className="text-indigo-600"/>
                 <h2 className="text-lg font-black uppercase text-indigo-900">Retorno de Equipos al Kardex</h2>
                 <p className="text-[10px] font-bold text-slate-400">Escanee el código de barras para habilitar el equipo nuevamente</p>
                 <form onSubmit={(e: any) => { e.preventDefault(); handleScanQuickReturn(e.target.bc.value); e.target.bc.value = ''; }} className="w-full">
                    <input name="bc" autoFocus className="input-base text-center text-2xl font-black h-12 tracking-[0.2em]" placeholder="00000" />
                 </form>
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 p-2 rounded">
                 Operación: Re-Habilitar unidades y sumar a existencias libres.
              </div>
            </div>
          )}

          {view === 'visits' && (
            <div className="space-y-3">
               <div className="flex items-center justify-between bg-white p-2 rounded border shadow-sm">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedDate(new Date(new Date(selectedDate).getTime() - 86400000).toISOString().split('T')[0])} className="p-1 border rounded"><ChevronLeft size={12}/></button>
                    <div className="px-3 py-1.5 bg-slate-50 border rounded font-black text-[10px] uppercase text-indigo-600">{selectedDate}</div>
                    <button onClick={() => setSelectedDate(new Date(new Date(selectedDate).getTime() + 86400000).toISOString().split('T')[0])} className="p-1 border rounded"><ChevronRight size={12}/></button>
                  </div>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {paginatedData.map((visit: any) => {
                    const person = data.people.find((p:any)=>p.id === visit.personId);
                    return (
                      <div key={visit.id} onClick={() => setModal({ type: 'visit_details', visit })} className={`card-base p-3 flex flex-col gap-3 cursor-pointer transition-all hover:border-indigo-400 ${visit.status === 'finished' ? 'opacity-40 grayscale bg-slate-50' : 'bg-white shadow-sm'}`}>
                        <div className="flex justify-between items-start">
                          <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded flex items-center justify-center font-bold border text-[9px] uppercase">{person?.name?.charAt(0) || '?'}</div>
                          {visit.status === 'active' ? <VisitTimer startTime={visit.startTime} thresholds={data.settings.timerThresholds} /> : <StatusBadge status="finished" />}
                        </div>
                        <div className="flex-1 min-h-[40px]"><p className="font-black text-[10px] truncate uppercase">{person?.name || 'Cargando...'}</p><div className="flex flex-wrap gap-1 mt-1.5">{visit.equipmentIds.map((eid: string, idx: number) => <span key={idx} className="px-1.5 py-0.5 bg-slate-900 text-white rounded text-[7px] font-black border uppercase">{eid} x{visit.equipmentQty?.[eid] || 1}</span>)}</div></div>
                        <div className="text-[7px] font-black uppercase text-center text-slate-400 py-1 bg-slate-50 rounded">Gestión Detallada</div>
                      </div>
                    );
                  })}
               </div>
            </div>
          )}

          {view === 'tours' && (
            <div className="card-base animate-in fade-in">
               <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-50/50 border-b">
                     <tr><th className="table-header">Tour / Nombre</th><th className="table-header">Guía Responsable</th><th className="table-header">Estado</th><th className="table-header text-right">Ficha</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {paginatedData.map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                           <td className="table-cell font-black uppercase text-slate-800">{t.name || t.id}</td>
                           <td className="table-cell font-bold text-indigo-600 uppercase">{data.guides.find((g:any)=>g.id === t.guideId)?.name || 'N/A'}</td>
                           <td className="table-cell"><StatusBadge status={t.status} /></td>
                           <td className="table-cell text-right">
                              <button onClick={() => setModal({ type: 'tour_details', tour: t })} className="p-1 border rounded hover:bg-white hover:shadow-sm"><ClipboardList size={14}/></button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          )}

          {view === 'inventory' && (
            <div className="card-base animate-in fade-in">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50/50 border-b text-slate-400 uppercase">
                  <tr><th className="table-header w-1/4">Equipo / Código</th><th className="table-header">En Stock</th><th className="table-header">En Uso</th><th className="table-header text-right">Existencias</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedData.map((item: Equipment) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-cell font-black uppercase flex items-center gap-2 py-2"><Headphones size={12} className="opacity-30"/> {item.id}</td>
                      <td className="table-cell">{item.stockTotal} und</td>
                      <td className="table-cell"><span className="text-amber-600 font-black">{item.stockInUse}</span></td>
                      <td className="table-cell text-right space-x-1">
                         <button onClick={() => setModal({ type: 'equipment_sheet', item })} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" title="Kardex Detallado"><Archive size={14}/></button>
                         <button onClick={() => setModal({ type: 'equipment_details', item })} className="p-1 text-slate-300 hover:text-indigo-600 transition-colors" title="Taller Técnico"><Hammer size={14}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === 'people' && (
            <div className="card-base animate-in fade-in">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50/50 border-b text-slate-400 uppercase">
                   <tr><th className="table-header w-1/3">Nombre</th><th className="table-header">Documento</th><th className="table-header">Historial</th><th className="table-header text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {paginatedData.map((p: any) => (
                      <tr key={p.id}>
                         <td className="table-cell font-black uppercase text-slate-800">{p.name}</td>
                         <td className="table-cell text-slate-400 font-bold">{p.document}</td>
                         <td className="table-cell"><button onClick={() => setModal({ type: 'person_history', person: p })} className="btn-compact bg-slate-100">Ver Visitas</button></td>
                         <td className="table-cell text-right space-x-1">
                            <button onClick={() => setModal({ type: 'person_crud', item: p })} className="p-1 border rounded hover:bg-slate-50"><Edit2 size={12}/></button>
                            <button onClick={() => handleDelete('people', p.id)} className="p-1 border rounded hover:bg-red-50 text-red-400 transition-colors"><Trash2 size={12}/></button>
                         </td>
                      </tr>
                   ))}
                </tbody>
              </table>
            </div>
          )}

          {view === 'guides' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
               {data.guides.map((g: any) => (
                  <div key={g.id} className="card-base p-4 border-l-4 border-l-amber-500 flex flex-col gap-3 shadow-md">
                     <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg shadow-inner"><Briefcase size={22}/></div>
                        <p className="text-[10px] font-black uppercase text-amber-600 tracking-tighter">{g.license}</p>
                     </div>
                     <div><h3 className="font-black text-xs uppercase mb-0.5 leading-none">{g.name}</h3><p className="text-[9px] opacity-40 font-bold uppercase">{g.id}</p></div>
                     <div className="flex gap-2 border-t pt-3 mt-1">
                        <button onClick={() => setModal({ type: 'guide_crud', item: g })} className="flex-1 btn-compact bg-slate-100 border hover:bg-white transition-all shadow-sm">Editar Perfil</button>
                        <button onClick={() => handleDelete('guides', g.id)} className="px-3 border border-red-100 text-red-300 hover:text-red-500 transition-all rounded"><Trash2 size={12}/></button>
                     </div>
                  </div>
               ))}
            </div>
          )}

          {view === 'settings' && (
            <div className="max-w-md mx-auto card-base p-6 animate-in zoom-in">
               <h3 className="font-black text-xs uppercase mb-6 border-b pb-2 flex items-center gap-2 text-indigo-600"><Settings2 size={14}/> Configuración de Tiempos</h3>
               <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <InputField 
                        label="Umbral Amarillo (Minutos)" 
                        type="number" 
                        value={data.settings.timerThresholds.yellow} 
                        onChange={(e:any) => updateData({...data, settings: {...data.settings, timerThresholds: {...data.settings.timerThresholds, yellow: parseInt(e.target.value)}}})}
                     />
                     <InputField 
                        label="Umbral Rojo (Minutos)" 
                        type="number" 
                        value={data.settings.timerThresholds.red} 
                        onChange={(e:any) => updateData({...data, settings: {...data.settings, timerThresholds: {...data.settings.timerThresholds, red: parseInt(e.target.value)}}})}
                     />
                  </div>
                  <button onClick={()=>triggerNotif("Ajustes Guardados")} className="w-full bg-slate-900 text-white py-3 rounded font-black text-[10px] uppercase shadow-lg">Guardar Configuración</button>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* --- MODALES CENTRALIZADOS --- */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-300 animate-in zoom-in duration-150">
            <div className="px-3 py-2 bg-slate-900 text-white flex justify-between items-center shadow-md">
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">{modal.type.replace('_', ' ')}</span>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-white/10 rounded transition-colors"><X size={14}/></button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-white">
               {modal.type === 'register_flow' && <UnifiedPersonForm peopleList={data.people} onSubmit={handleSaveVisitFlow} />}
               {modal.type === 'create_tour' && <TourManagerView data={data} onComplete={handleCreateTour} triggerNotif={triggerNotif} />}
               {modal.type === 'tour_details' && <TourDetailsView tour={modal.tour} data={data} onFinishTour={handleFinishTour} onFinishVisit={handleFinishVisit} thresholds={data.settings.timerThresholds} />}
               {modal.type === 'visit_details' && (
                 <div className="space-y-6 text-left">
                    <VisitDetailsView visit={modal.visit} data={data} updateData={updateData} triggerNotif={triggerNotif} guides={data.guides} thresholds={data.settings.timerThresholds} />
                    <button onClick={() => handleFinishVisit(modal.visit.id)} className="w-full bg-slate-900 text-white py-3 rounded font-black text-[10px] uppercase shadow-lg hover:bg-red-600 transition-colors">Finalizar y Liberar</button>
                 </div>
               )}
               {modal.type === 'equipment_sheet' && <EquipmentKardexView item={modal.item} data={data} updateData={updateData} triggerNotif={triggerNotif} refreshModal={(i:any)=>setModal({...modal, item:i})} />}
               {modal.type === 'equipment_details' && <EquipmentSheet item={modal.item} data={data} updateData={updateData} refreshModal={(i:any)=>setModal({...modal, item:i})} />}
               {modal.type === 'inventory_crud' && <GenericCRUDForm type="inventory" item={modal.item} onSubmit={(fd:any) => handleSaveEntity('inventory', fd, modal.item?.id)} />}
               {modal.type === 'person_crud' && <UnifiedPersonForm item={modal.item} peopleList={data.people} title="Actualizar Datos" onSubmit={(fd:any) => handleSaveEntity('people', fd, modal.item?.id)} />}
               {modal.type === 'guide_crud' && <GenericCRUDForm type="guide" item={modal.item} onSubmit={(fd:any) => handleSaveEntity('guides', fd, modal.item?.id)} />}
               {modal.type === 'person_history' && <PersonHistoryView person={modal.person} visits={data.visits} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SOPORTE LOGIN ---

function LoginView({ onLogin }: any) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-xs w-full card-base p-10 text-center bg-white/5 border-white/10 backdrop-blur-xl">
        <div className="p-4 bg-white rounded-xl inline-flex text-slate-900 mb-6 shadow-2xl scale-125"><Headphones size={32}/></div>
        <h1 className="text-white font-black uppercase tracking-tighter text-2xl mb-8 leading-none">AudioPro Admin</h1>
        <div className="space-y-3">
          <button onClick={() => onLogin('admin')} className="w-full p-3.5 border border-white/10 rounded hover:bg-white hover:text-slate-900 text-white font-black uppercase text-[10px] tracking-widest transition-all shadow-lg">Administrador</button>
          <button onClick={() => onLogin('operator')} className="w-full p-3.5 border border-indigo-500/30 rounded bg-indigo-500/10 text-indigo-400 font-black uppercase text-[10px] tracking-widest transition-all hover:bg-indigo-500 hover:text-white shadow-lg">Operario</button>
        </div>
      </div>
    </div>
  );
}