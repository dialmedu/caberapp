import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, EyeOff, Layers, Home, Lock,
  Share2, Menu, X, Palette, Sparkles, Trash2, Settings,
  Edit3, GripVertical, Monitor, Tv, FileText, ExternalLink, FileCode, Check, AlertCircle, Smartphone
} from 'lucide-react';

// --- INTERFACES ---
interface Block {
  id: string;
  type: string;
  content: string;
  actionType: string;
  clueLink: string;
  options: { scale: number };
}

interface Page {
  id: string;
  title: string;
  theme: string;
  publishDate: string;
  blocks: Block[];
  no_pc?: boolean;     // Nuevo: Ocultar en PC
  no_mobile?: boolean; // Nuevo: Ocultar en Móvil
}

interface Config {
  pages: { [key: string]: Page };
  pageOrder: string[]; 
  homePageId: string;
}

const INITIAL_DATA: Config = {
  pages: {
    'inicio': {
      id: 'inicio',
      title: 'Nueva Historia',
      theme: 'default',
      publishDate: new Date().toISOString(),
      blocks: [
        {
          id: 'def-1',
          type: 'text',
          content: 'Escribe aquí tu primera pista...',
          actionType: 'none',
          clueLink: '',
          options: { scale: 100 }
        }
      ]
    }
  },
  pageOrder: ['inicio'],
  homePageId: 'inicio'
};

const themeStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime&family=Inter:wght@400;900&display=swap');
  .theme-journal { font-family: 'Special Elite', cursive; background-color: #f4e4bc; background-image: url('https://www.transparenttextures.com/patterns/old-map.png'); color: #2c1e11; box-shadow: inset 0 0 100px rgba(0,0,0,0.1); }
  .theme-tv { background-color: #0a0a0a; color: #10b981; text-shadow: 0 0 8px rgba(16, 185, 129, 0.6); font-family: 'Courier Prime', monospace; }
  .scanlines { position: absolute; inset: 0; pointer-events: none; z-index: 10; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%); background-size: 100% 4px; }
  @keyframes flicker { 0% { opacity: 0.1; } 100% { opacity: 0.12; } }
  .flicker { animation: flicker 0.1s infinite; position: absolute; inset: 0; pointer-events: none; z-index: 11; background: white; opacity: 0.03; }
  .custom-scroll::-webkit-scrollbar { width: 6px; }
  .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 10px; }
`;

export default function App() {
  const [config, setConfig] = useState<Config>(INITIAL_DATA);
  const [currentPageId, setCurrentPageId] = useState("");
  const [isDev, setIsDev] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pages');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [devClicks, setDevClicks] = useState(0);
  const [devMsg, setDevMsg] = useState("");
  const [isMobileEnv, setIsMobileEnv] = useState(false);
  
  const [rawJson, setRawJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    const checkEnv = () => {
      setIsMobileEnv(window.innerWidth < 768);
    };
    checkEnv();
    window.addEventListener('resize', checkEnv);
    
    const loadData = async () => {
      const saved = localStorage.getItem('enigma_v9_env');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        setCurrentPageId(parsed.homePageId);
        setRawJson(JSON.stringify(parsed, null, 2));
      } else {
        try {
          const response = await fetch('/config.json');
          if (response.ok) {
            const data = await response.json();
            setConfig(data);
            setCurrentPageId(data.homePageId);
            setRawJson(JSON.stringify(data, null, 2));
          }
        } catch (e) {
          setConfig(INITIAL_DATA);
          setCurrentPageId(INITIAL_DATA.homePageId);
          setRawJson(JSON.stringify(INITIAL_DATA, null, 2));
        }
      }
    };
    loadData();

    const style = document.createElement('style');
    style.textContent = themeStyles;
    document.head.append(style);
    return () => {
      style.remove();
      window.removeEventListener('resize', checkEnv);
    };
  }, []);

  useEffect(() => {
    if (config !== INITIAL_DATA) {
      localStorage.setItem('enigma_v9_env', JSON.stringify(config));
    }
  }, [config]);

  // --- EXPORTAR A NUEVA VENTANA ---
  const exportToNewWindow = () => {
    const jsonStr = JSON.stringify(config, null, 2);
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>Export - Enigma</title></head>
          <body style="background:#1a1a1a;color:#0f0;font-family:monospace;padding:20px;">
            <pre>${jsonStr}</pre>
          </body>
        </html>
      `);
    }
  };

  // --- APLICAR JSON ---
  const applyRawJson = () => {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed.pages || !parsed.homePageId) throw new Error("Estructura inválida");
      setConfig(parsed);
      setCurrentPageId(parsed.homePageId);
      setJsonError(null);
      alert("Configuración aplicada");
    } catch (e: any) { setJsonError(e.message); }
  };

  // --- DRAG & DROP ---
  const handleDragStart = (e: React.DragEvent, id: string, type: 'page' | 'block') => {
    e.dataTransfer.setData('id', id);
    e.dataTransfer.setData('type', type);
  };

  const handleDrop = (e: React.DragEvent, targetId: string, type: 'page' | 'block') => {
    const draggedId = e.dataTransfer.getData('id');
    const draggedType = e.dataTransfer.getData('type');
    if (draggedType !== type || draggedId === targetId) return;

    if (type === 'page') {
      const newOrder = [...config.pageOrder];
      const fromIdx = newOrder.indexOf(draggedId);
      const toIdx = newOrder.indexOf(targetId);
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, draggedId);
      setConfig({ ...config, pageOrder: newOrder });
    } else {
      const blocks = [...config.pages[currentPageId].blocks];
      const fromIdx = blocks.findIndex(b => b.id === draggedId);
      const toIdx = blocks.findIndex(b => b.id === targetId);
      const [draggedBlock] = blocks.splice(fromIdx, 1);
      blocks.splice(toIdx, 0, draggedBlock);
      setConfig({ ...config, pages: { ...config.pages, [currentPageId]: { ...config.pages[currentPageId], blocks } } });
    }
  };

  const addBlock = () => {
    const id = 'b' + Date.now();
    const pg = config.pages[currentPageId];
    if (!pg) return;
    const newBlock: Block = { id, type: 'text', content: 'Nuevo fragmento...', actionType: 'none', clueLink: '', options: { scale: 100 } };
    setConfig(prev => ({...prev, pages: {...prev.pages, [currentPageId]: {...pg, blocks: [...pg.blocks, newBlock]}}}));
    setEditingId(id); setActiveTab('blocks');
  };

  const handleLogin = () => {
    if (password === "Daniela") {
      setIsDev(true); setShowLogin(false); setSidebarOpen(true); setPassword("");
    } else alert("Clave incorrecta");
  };

  const currentPage = config.pages[currentPageId] || config.pages[config.homePageId];

  return (
    <div className={`flex h-screen w-full transition-colors duration-500 overflow-hidden ${isDev ? 'bg-zinc-900' : 'bg-white'}`}>
      
      {/* LOGIN MODAL */}
      {showLogin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
          <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center">
            <Lock className="mx-auto text-blue-500 mb-6" size={56} />
            <input type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="w-full bg-zinc-800 border border-zinc-700 p-5 rounded-2xl text-white text-center text-3xl mb-6 outline-none" placeholder="••••" />
            <button onClick={handleLogin} className="w-full bg-blue-600 p-5 rounded-2xl text-white font-black uppercase tracking-widest shadow-lg">ENTRAR</button>
            <button onClick={() => setShowLogin(false)} className="mt-6 text-zinc-500 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* PANEL DE EDITOR */}
      {isDev && (
        <aside className={`h-full bg-zinc-950 border-r border-zinc-800 flex flex-col z-[100] transition-all duration-300 ${sidebarOpen ? 'w-[90vw] md:w-96' : 'w-0 overflow-hidden'}`}>
          <div className="p-4 border-b border-zinc-900 flex justify-between items-center shrink-0">
            <span className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2"><Sparkles size={16} className="text-blue-400" /> CMS MULTI-ENV</span>
            <button onClick={() => setSidebarOpen(false)} className="text-zinc-500"><X size={20}/></button>
          </div>

          <div className="flex border-b border-zinc-900 shrink-0">
            {[
              { id: 'pages', icon: Home, label: 'Páginas' },
              { id: 'design', icon: Palette, label: 'Diseño' },
              { id: 'blocks', icon: Layers, label: 'Bloques' },
              { id: 'json', icon: FileCode, label: 'JSON' }
            ].map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'json') setRawJson(JSON.stringify(config, null, 2)); }}
                className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'text-blue-400 bg-blue-400/5' : 'text-zinc-600'}`}
              >
                <tab.icon size={16} />
                <span className="text-[9px] font-black uppercase tracking-tighter">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scroll">
            {activeTab === 'json' && (
              <div className="h-full flex flex-col space-y-4 animate-in fade-in">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Editor Raw</h4>
                  <button onClick={exportToNewWindow} className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300"><ExternalLink size={12} /> Nueva Ventana</button>
                </div>
                <textarea value={rawJson} onChange={(e) => setRawJson(e.target.value)} spellCheck={false} className="w-full h-[60vh] bg-zinc-900 text-emerald-500 font-mono text-[11px] p-4 rounded-xl border border-zinc-800 outline-none focus:border-blue-500 resize-none custom-scroll" />
                <button onClick={applyRawJson} className="w-full p-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg"><Check size={14} /> Aplicar</button>
              </div>
            )}

            {activeTab === 'pages' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex justify-between items-center text-white">
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Navegación</h4>
                  <button onClick={() => {const id='pg'+Date.now(); setConfig(prev=>({...prev, pages:{...prev.pages, [id]:{id, title:'Nueva', theme:'default', publishDate:new Date().toISOString(), blocks:[]}}, pageOrder:[...prev.pageOrder, id]})); setCurrentPageId(id);}} className="text-blue-500"><Plus size={18}/></button>
                </div>
                <div className="space-y-2">
                  {config.pageOrder.map((pid) => (
                    <div 
                      key={pid} draggable onDragStart={(e) => handleDragStart(e, pid, 'page')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, pid, 'page')}
                      className={`p-3 rounded-2xl border flex items-center gap-3 cursor-grab transition-all ${currentPageId === pid ? 'bg-blue-600 border-blue-500 text-white shadow-md' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                    >
                      <GripVertical size={14} className="opacity-40" />
                      <span onClick={() => setCurrentPageId(pid)} className="flex-1 text-xs font-bold uppercase truncate">{config.pages[pid]?.title || pid}</span>
                      <button onClick={() => {if(config.pageOrder.length > 1){ const {[pid]:_, ...rest} = config.pages; setConfig(p=>({...p, pages:rest, pageOrder:p.pageOrder.filter(id=>id!==pid)})); setCurrentPageId(config.pageOrder[0]); }}}><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'design' && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-600 block mb-2">Nombre de Página</label>
                  <input value={currentPage?.title || ""} onChange={e => setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, title: e.target.value}}})} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs text-white outline-none focus:border-blue-500" />
                </div>
                
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-zinc-600 block mb-2">Visibilidad de Entorno</label>
                   <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800 cursor-pointer transition-all hover:bg-zinc-800">
                        <input type="checkbox" checked={!currentPage.no_pc} onChange={e => setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, no_pc: !e.target.checked}}})} className="w-4 h-4 rounded accent-blue-500" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white uppercase">Mostrar en PC</span>
                          <span className="text-[9px] text-zinc-500">Pantalla grande</span>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800 cursor-pointer transition-all hover:bg-zinc-800">
                        <input type="checkbox" checked={!currentPage.no_mobile} onChange={e => setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, no_mobile: !e.target.checked}}})} className="w-4 h-4 rounded accent-blue-500" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white uppercase">Mostrar en Móvil</span>
                          <span className="text-[9px] text-zinc-500">Celulares</span>
                        </div>
                      </label>
                   </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-600 block mb-2">Plantilla Visual</label>
                  <div className="grid gap-2">
                    {[
                      {id: 'default', label: 'Mundo Real', icon: Monitor},
                      {id: 'journal', label: 'Diario Antiguo', icon: FileText},
                      {id: 'retro-tv', label: 'Televisor Retro', icon: Tv}
                    ].map(t => (
                      <button key={t.id} onClick={() => setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, theme: t.id}}})} className={`p-4 rounded-2xl border text-[10px] font-black uppercase text-left flex items-center gap-3 transition-all ${currentPage?.theme === t.id ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}>
                        <t.icon size={16} /> {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'blocks' && (
              <div className="space-y-4 pb-20 animate-in fade-in text-white">
                <div className="flex justify-between items-center mb-2"><h4 className="text-[10px] font-black uppercase tracking-widest">Contenido</h4><button onClick={addBlock} className="bg-blue-600 p-1 rounded-lg"><Plus size={18}/></button></div>
                {currentPage?.blocks.map((b: Block, idx: number) => (
                  <div key={b.id} draggable onDragStart={(e) => handleDragStart(e, b.id, 'block')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, b.id, 'block')} className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-all ${editingId === b.id ? 'border-blue-500 shadow-xl' : 'border-slate-800'}`}>
                    <div className="p-3 flex items-center justify-between cursor-grab">
                      <div className="flex items-center gap-2">
                         <GripVertical size={12} className="opacity-30" />
                         <span onClick={() => setEditingId(editingId === b.id ? null : b.id)} className="text-[9px] font-black uppercase text-zinc-500 truncate max-w-[150px]">{b.type}: {b.content.substring(0,10)}...</span>
                      </div>
                      <Settings onClick={() => setEditingId(editingId === b.id ? null : b.id)} size={12} className="text-zinc-600 cursor-pointer" />
                    </div>
                    {editingId === b.id && (
                      <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-4">
                         <select value={b.type} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].type = e.target.value; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-[10px] text-white">
                            <option value="text">Texto</option><option value="image">Imagen</option><option value="video">Video</option><option value="html">HTML</option>
                         </select>
                         <textarea value={b.content} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].content = e.target.value; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-[10px] text-white min-h-[60px] outline-none" />
                         <div className="grid grid-cols-2 gap-2">
                           <select value={b.actionType} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].actionType = e.target.value; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full bg-zinc-900 p-2 rounded text-[9px] text-slate-500 outline-none">
                             <option value="none">Sin Pista</option><option value="hover">Hover</option><option value="long-hover">3s</option><option value="triple-click">3 Clics</option>
                           </select>
                           <select value={b.clueLink} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].clueLink = e.target.value; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full bg-zinc-900 p-2 rounded text-[9px] text-slate-500 outline-none">
                             <option value="">Destino...</option>
                             {config.pageOrder.map(pid => <option key={pid} value={pid}>{config.pages[pid]?.title || pid}</option>)}
                           </select>
                         </div>
                         <button onClick={() => { const blocks = currentPage.blocks.filter(block => block.id !== b.id); setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full p-2 bg-red-600/10 text-red-500 text-[9px] font-black uppercase rounded-lg">Borrar</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ÁREA DE PREVISUALIZACIÓN */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {isDev && (
          <div className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 shrink-0 z-50 shadow-sm transition-all duration-300">
            <div className="flex items-center gap-4">
               <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2.5 bg-zinc-100 rounded-2xl text-zinc-900 hover:bg-zinc-200 transition-all">{sidebarOpen ? <X size={20}/> : <Menu size={20}/>}</button>
               <div className="flex gap-2 items-center text-zinc-400">
                  <Monitor size={14} className={!isMobileEnv ? 'text-blue-500' : ''} />
                  <div className="w-[1px] h-4 bg-zinc-200"></div>
                  <Smartphone size={14} className={isMobileEnv ? 'text-blue-500' : ''} />
               </div>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Modo Edición</div>
            <button onClick={() => setIsDev(false)} className="px-5 py-2 bg-zinc-950 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all"><EyeOff size={14} className="inline mr-2"/> Finalizar</button>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto scroll-smooth transition-all duration-700 custom-scroll ${isDev ? 'p-6 md:p-12 bg-slate-100' : 'p-0 bg-white'}`}>
          <div className={`mx-auto transition-all duration-700 ${isDev ? 'bg-white shadow-2xl rounded-[3rem] border-[14px] border-zinc-900 max-w-[420px] md:max-w-4xl relative overflow-hidden min-h-[600px]' : 'w-full min-h-screen'}`}>
             <PageRenderer 
                page={currentPage} 
                isDev={isDev} 
                isMobileEnv={isMobileEnv}
                onNavigate={(id: string) => { setCurrentPageId(id); window.scrollTo(0,0); }} 
                onFooterClick={() => {
                  const n = devClicks + 1; setDevClicks(n);
                  if (n >= 5 && n < 10) setDevMsg(`Activando editor en ${10 - n}...`);
                  if (n >= 10) { setShowLogin(true); setDevClicks(0); setDevMsg(""); }
                  setTimeout(() => { setDevClicks(0); setDevMsg(""); }, 5000);
                }} 
                onSelectBlock={(id: string) => { setEditingId(id); setActiveTab('blocks'); setSidebarOpen(true); }} 
                msg={devMsg} 
             />
          </div>
        </div>

        {isDev && (
          <button onClick={addBlock} className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[110] hover:scale-110 active:scale-90 transition-all ring-4 ring-white lg:hidden">
            <Plus size={32}/>
          </button>
        )}
      </main>
    </div>
  );
}

function PageRenderer({ page, isDev, onNavigate, onFooterClick, onSelectBlock, msg, isMobileEnv }: any) {
  const themes: any = {
    default: "bg-white text-zinc-900 p-8 md:p-24 flex flex-col items-center",
    journal: "theme-journal text-[#2c1e11] p-10 md:p-32 flex flex-col items-center min-h-full relative",
    'retro-tv': "theme-tv p-8 md:p-24 flex flex-col items-center min-h-full relative overflow-hidden"
  };

  const isHidden = !isDev && ((isMobileEnv && page?.no_mobile) || (!isMobileEnv && page?.no_pc));
  if (isHidden) return <div className="p-20 text-center text-zinc-400 italic bg-white h-screen flex items-center justify-center">Este fragmento no es visible desde tu dispositivo actual.</div>;

  return (
    <div className={`${themes[page?.theme] || themes.default} w-full transition-all duration-1000 select-none relative min-h-screen`}>
      {page?.theme === 'retro-tv' && <><div className="scanlines"></div><div className="flicker"></div></>}
      
      {isDev && ((isMobileEnv && page?.no_mobile) || (!isMobileEnv && page?.no_pc)) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase z-[100] flex items-center gap-2">
           <AlertCircle size={12}/> Oculto en este entorno
        </div>
      )}

      <div className="w-full max-w-5xl space-y-20 pb-40 z-20 relative mx-auto">
        <header className="border-b-4 border-current pb-10 mb-20 animate-in slide-in-from-top duration-700">
          <h1 className="text-4xl md:text-9xl font-black uppercase tracking-tighter leading-[0.85]">{page?.title || "Sin Título"}</h1>
          <div className="text-[10px] font-bold opacity-30 uppercase tracking-[0.5em]">{page?.id || "N/A"}</div>
        </header>
        <div className="space-y-24">
          {page?.blocks.map((b: Block) => (
            <div key={b.id} onClick={e => { if(isDev) { e.stopPropagation(); onSelectBlock(b.id); } }} className={isDev ? 'cursor-edit hover:ring-2 hover:ring-blue-500 rounded-2xl p-2 transition-all relative group' : ''}>
              {isDev && <Edit3 size={16} className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-blue-500" />}
              <HiddenWrapper block={b} onNavigate={onNavigate} isDev={isDev}>
                <BlockRenderer block={b} />
              </HiddenWrapper>
            </div>
          ))}
        </div>
        <footer onClick={onFooterClick} className="mt-60 py-24 border-t-2 border-current/10 text-center opacity-20 hover:opacity-100 transition-all cursor-pointer relative">
          <div className="text-[10px] font-black uppercase tracking-[0.6em] select-none">© DANIELA • LOS DOS MUNDOS</div>
          {msg && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-blue-600 text-white px-8 py-3 rounded-full text-[10px] font-black animate-bounce shadow-2xl border-2 border-white/20 whitespace-nowrap">{msg}</div>}
        </footer>
      </div>
    </div>
  );
}

function HiddenWrapper({ block, children, onNavigate, isDev }: any) {
  const [revealed, setRevealed] = useState(false);
  const [clicks, setClicks] = useState(0);
  const timer = useRef<any>(null);

  const onEnter = () => { if(!isDev) { if(block.actionType === 'hover') setRevealed(true); if(block.actionType === 'long-hover') timer.current = setTimeout(() => setRevealed(true), 2500); } };
  const onLeave = () => { if(!isDev) { setRevealed(false); clearTimeout(timer.current); } };
  const onClick = () => { if(!isDev && block.actionType === 'triple-click') { const next = clicks + 1; setClicks(next); if(next === 3) { setRevealed(true); setClicks(0); } setTimeout(() => setClicks(0), 1000); } };

  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick} className="relative transition-all duration-500">
      <div className={`${revealed && block.clueLink ? 'opacity-10 blur-xl pointer-events-none scale-90' : 'transition-all duration-700'}`}>{children}</div>
      {revealed && block.clueLink && !isDev && (
        <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in fade-in duration-500 z-50">
           <button onClick={(e) => { e.stopPropagation(); onNavigate(block.clueLink); }} className="bg-black text-white px-10 py-5 rounded-full font-black uppercase text-xs tracking-widest shadow-2xl flex items-center gap-3 border border-white/20 transition-all hover:scale-110 active:scale-95"><Share2 size={16}/> DESCUBRIR</button>
        </div>
      )}
    </div>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  const parseVideo = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return `https://www.youtube.com/embed/${url.split('v=')[1]?.split('&')[0] || url.split('/').pop()}`;
    if (url.includes('tiktok.com')) return `https://www.tiktok.com/embed/v2/${url.split('/video/')[1]?.split('?')[0]}`;
    return url;
  };
  switch(block.type) {
    case 'text': return <p className="text-xl md:text-5xl leading-[1.05] tracking-tighter whitespace-pre-wrap">{block.content}</p>;
    case 'image': return <img src={block.content} className="w-full rounded-[2.5rem] shadow-2xl grayscale-[0.6] hover:grayscale-0 transition-all duration-1000" alt="Enigma" />;
    case 'video': return <div className="aspect-video w-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-black border-4 border-white/5"><iframe src={parseVideo(block.content)} title="Contenido" className="w-full h-full" allowFullScreen /></div>;
    case 'html': return <div dangerouslySetInnerHTML={{ __html: block.content }} />;
    default: return null;
  }
}
