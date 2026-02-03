import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, EyeOff, Layers, Home, Lock,
  Share2, Menu, X, Palette, Sparkles, Trash2, Settings,
  Edit3, GripVertical, Monitor, Tv, FileText, ExternalLink, FileCode, Check, AlertCircle, Smartphone, Volume2, MousePointer2, Layout
} from 'lucide-react';

// --- INTERFACES ---
interface Block {
  id: string;
  type: string;
  content: string;
  actionType: string; // 'none' | 'hover' | 'long-hover' | 'triple-click' | 'input-match'
  actionResult: string; // 'discover' | 'navigate' | 'cursor' | 'audio' | 'floating'
  clueLink: string;
  triggerValue?: string; // Palabra clave o texto de entrada
  mouseIcon?: string;    // URL de imagen para el cursor
  audioUrl?: string;     // URL de audio
  floatingProps?: {      // Propiedades para componente flotante
    type: string;
    content: string;
    pos: { top?: string; bottom?: string; left?: string; right?: string };
  };
  options: { scale: number };
}

interface Page {
  id: string;
  title: string;
  theme: string;
  publishDate: string;
  blocks: Block[];
  no_pc?: boolean;     
  no_mobile?: boolean; 
  layoutWidth?: string;
  backgroundImage?: string;
}

interface Config {
  pages: { [key: string]: Page };
  pageOrder: string[]; 
  homePageId: string;
}

const INITIAL_DATA: Config = {
  pages: {
    'inicio': {
      id: 'inicio', title: 'El Umbral', theme: 'journal', publishDate: new Date().toISOString(),
      blocks: [
        { id: 'b1', type: 'text', content: 'Escribe "hada" para ver el misterio.', actionType: 'input-match', triggerValue: 'hada', actionResult: 'discover', clueLink: 'inicio', options: { scale: 100 } }
      ],
      layoutWidth: '100%'
    }
  },
  pageOrder: ['inicio'],
  homePageId: 'inicio'
};

const themeStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime&family=Inter:wght@400;700;900&display=swap');
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
  
  // Estados de interacción global
  const [globalCursor, setGlobalCursor] = useState<string | null>(null);
  const [activeFloating, setActiveFloating] = useState<any[]>([]);

  useEffect(() => {
    const checkEnv = () => setIsMobileEnv(window.innerWidth < 768);
    checkEnv();
    window.addEventListener('resize', checkEnv);
    
    const loadData = async () => {
      const saved = localStorage.getItem('enigma_v11_actions');
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
      localStorage.setItem('enigma_v11_actions', JSON.stringify(config));
    }
  }, [config]);

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
    const newBlock: Block = { 
      id, type: 'text', content: 'Nuevo misterio...', 
      actionType: 'none', actionResult: 'discover', clueLink: '', options: { scale: 100 } 
    };
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
    <div 
      className={`flex h-screen w-full transition-colors duration-500 overflow-hidden ${isDev ? 'bg-zinc-900' : 'bg-white'}`}
      style={globalCursor ? { cursor: `url(${globalCursor}), auto` } : {}}
    >
      
      {/* MODAL DE LOGIN */}
      {showLogin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 text-white">
          <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center">
            <Lock className="mx-auto text-blue-500 mb-6" size={56} />
            <input type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="w-full bg-zinc-800 border border-zinc-700 p-5 rounded-2xl text-white text-center text-3xl mb-6 outline-none" placeholder="••••" />
            <button onClick={handleLogin} className="w-full bg-blue-600 p-5 rounded-2xl text-white font-black uppercase tracking-widest shadow-lg hover:bg-blue-500 transition-all">ENTRAR</button>
            <button onClick={() => setShowLogin(false)} className="mt-6 text-zinc-500 text-sm font-bold">Cancelar</button>
          </div>
        </div>
      )}

      {/* PANEL DE EDITOR */}
      {isDev && (
        <aside className={`h-full bg-zinc-950 border-r border-zinc-800 flex flex-col z-[100] transition-all duration-300 ${sidebarOpen ? 'w-[95vw] md:w-[450px]' : 'w-0 overflow-hidden'}`}>
          <div className="p-4 border-b border-zinc-900 flex justify-between items-center shrink-0">
            <span className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2"><Sparkles size={16} className="text-blue-400" /> CMS ENGINE</span>
            <button onClick={() => setSidebarOpen(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
          </div>

          <div className="flex border-b border-zinc-900 shrink-0 overflow-x-auto hide-scrollbar">
            {[
              { id: 'pages', icon: Home, label: 'Páginas' },
              { id: 'design', icon: Palette, label: 'Diseño' },
              { id: 'blocks', icon: Layers, label: 'Bloques' },
              { id: 'json', icon: FileCode, label: 'JSON' }
            ].map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'json') setRawJson(JSON.stringify(config, null, 2)); }}
                className={`flex-1 py-4 px-2 flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'text-blue-400 bg-blue-400/5' : 'text-zinc-600'}`}
              >
                <tab.icon size={16} />
                <span className="text-[9px] font-black uppercase tracking-tighter whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scroll text-white">
            {activeTab === 'json' && (
              <div className="h-full flex flex-col space-y-4 animate-in fade-in">
                <textarea value={rawJson} onChange={(e) => setRawJson(e.target.value)} spellCheck={false} className="w-full h-[65vh] bg-zinc-900 text-emerald-500 font-mono text-[11px] p-4 rounded-xl border border-zinc-800 outline-none focus:border-blue-500 resize-none custom-scroll" />
                <button onClick={applyRawJson} className="w-full p-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg"><Check size={14} /> Aplicar Cambios</button>
              </div>
            )}

            {activeTab === 'pages' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex justify-between items-center text-white"><h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Navegación</h4><button onClick={() => {const id='pg'+Date.now(); setConfig(prev=>({...prev, pages:{...prev.pages, [id]:{id, title:'Nueva', theme:'default', publishDate:new Date().toISOString(), blocks:[], layoutWidth: "100%"}}, pageOrder:[...prev.pageOrder, id]})); setCurrentPageId(id);}} className="text-blue-500"><Plus size={18}/></button></div>
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
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-600 block mb-2">Nombre de Página</label>
                    <input value={currentPage?.title || ""} onChange={e => setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, title: e.target.value}}})} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-600 block mb-2">Imagen de Fondo (URL)</label>
                    <input placeholder="https://..." value={currentPage?.backgroundImage || ""} onChange={e => setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, backgroundImage: e.target.value}}})} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-600 block mb-2">Ancho en PC</label>
                    <div className="grid grid-cols-2 gap-2">
                       {["100%", "80%"].map(w => (
                         <button key={w} onClick={() => setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, layoutWidth: w}}})} className={`p-2 rounded-xl border text-xs font-bold transition-all ${currentPage?.layoutWidth === w || (!currentPage?.layoutWidth && w === "100%") ? 'bg-blue-600 border-blue-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>{w}</button>
                       ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'blocks' && (
              <div className="space-y-4 pb-20 animate-in fade-in">
                <div className="flex justify-between items-center mb-2 text-zinc-500"><h4 className="text-[10px] font-black uppercase tracking-widest">Fragmentos</h4><button onClick={addBlock} className="bg-blue-600 text-white p-1 rounded-lg"><Plus size={18}/></button></div>
                {currentPage?.blocks.map((b: Block, idx: number) => (
                  <div key={b.id} draggable onDragStart={(e) => handleDragStart(e, b.id, 'block')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, b.id, 'block')} className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-all ${editingId === b.id ? 'border-blue-500 shadow-xl' : 'border-slate-800'}`}>
                    <div className="p-3 flex items-center justify-between cursor-grab">
                      <div className="flex items-center gap-2">
                         <GripVertical size={12} className="opacity-30" />
                         <span onClick={() => setEditingId(editingId === b.id ? null : b.id)} className="text-[9px] font-black uppercase text-zinc-500 truncate max-w-[200px]">{b.type}: {b.content.substring(0,15)}...</span>
                      </div>
                      <Settings onClick={() => setEditingId(editingId === b.id ? null : b.id)} size={12} className="text-zinc-600 cursor-pointer hover:text-white" />
                    </div>
                    {editingId === b.id && (
                      <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-4 text-xs">
                         <div className="grid grid-cols-2 gap-2">
                           <div className="space-y-1">
                              <label className="text-[8px] uppercase text-zinc-600 font-black">Tipo Bloque</label>
                              <select value={b.type} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].type = e.target.value; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full bg-zinc-900 p-2 rounded border border-zinc-800">
                                <option value="text">Texto</option><option value="image">Imagen</option><option value="video">Video</option><option value="html">HTML</option>
                              </select>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[8px] uppercase text-zinc-600 font-black">Acción Disparador</label>
                              <select value={b.actionType} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].actionType = e.target.value; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full bg-zinc-900 p-2 rounded border border-zinc-800">
                                <option value="none">Sin Acción</option><option value="hover">Al pasar mouse</option><option value="long-hover">Esperar 3s</option><option value="triple-click">3 Clics</option><option value="input-match">Coincidir Texto</option>
                              </select>
                           </div>
                         </div>

                         <div className="space-y-1">
                            <label className="text-[8px] uppercase text-zinc-600 font-black">Contenido Principal</label>
                            <textarea value={b.content} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].content = e.target.value; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-[10px] text-white min-h-[60px] outline-none" />
                         </div>

                         <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-3">
                            <label className="text-[9px] uppercase text-blue-400 font-black flex items-center gap-1"><Sparkles size={10}/> Respuesta al Misterio</label>
                            <select value={b.actionResult} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].actionResult = e.target.value; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full bg-zinc-900 p-2 rounded border border-zinc-800">
                               <option value="discover">Botón "Descubrir"</option><option value="navigate">Cambiar Página Solo</option><option value="cursor">Cambiar Icono Mouse</option><option value="audio">Reproducir Audio</option><option value="floating">Componente Flotante</option>
                            </select>

                            {b.actionType === 'input-match' && (
                              <input placeholder="Palabra clave necesaria..." value={b.triggerValue || ""} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].triggerValue = e.target.value; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-[10px]" />
                            )}

                            {b.actionResult === 'cursor' && (
                              <input placeholder="URL de imagen para cursor..." value={b.mouseIcon || ""} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].mouseIcon = e.target.value; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-[10px]" />
                            )}

                            {b.actionResult === 'audio' && (
                              <input placeholder="URL de archivo audio..." value={b.audioUrl || ""} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].audioUrl = e.target.value; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-[10px]" />
                            )}

                            {b.actionResult === 'floating' && (
                              <div className="space-y-2 border-l-2 border-blue-500 pl-2">
                                 <select value={b.floatingProps?.type || "text"} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].floatingProps = {...(blocks[idx].floatingProps || {content: "", pos: {top: "20px", left: "20px"}}), type: e.target.value}; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full bg-zinc-900 p-1 text-[9px]">
                                    <option value="text">Texto</option><option value="image">Imagen</option><option value="html">HTML</option>
                                 </select>
                                 <input placeholder="Contenido flotante..." value={b.floatingProps?.content || ""} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].floatingProps = {...(blocks[idx].floatingProps || {type: "text", pos: {top: "20px", left: "20px"}}), content: e.target.value}; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full bg-zinc-900 p-2 rounded text-[9px]" />
                                 <div className="grid grid-cols-2 gap-1">
                                    <input placeholder="Top (px/%)" value={b.floatingProps?.pos.top || ""} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].floatingProps!.pos.top = e.target.value; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="bg-zinc-900 p-1 text-[9px]" />
                                    <input placeholder="Left (px/%)" value={b.floatingProps?.pos.left || ""} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].floatingProps!.pos.left = e.target.value; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="bg-zinc-900 p-1 text-[9px]" />
                                 </div>
                              </div>
                            )}

                            {(b.actionResult === 'discover' || b.actionResult === 'navigate') && (
                              <select value={b.clueLink} onChange={e => { const blocks = [...currentPage.blocks]; blocks[idx].clueLink = e.target.value; setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full bg-zinc-900 p-2 rounded border border-zinc-800 text-blue-400">
                                 <option value="">Ir a página...</option>
                                 {config.pageOrder.map(pid => <option key={pid} value={pid}>{config.pages[pid]?.title || pid}</option>)}
                              </select>
                            )}
                         </div>

                         <button onClick={() => { const blocks = currentPage.blocks.filter(block => block.id !== b.id); setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}}); }} className="w-full p-2 bg-red-600/10 text-red-500 text-[9px] font-black uppercase rounded-lg hover:bg-red-600/20">Eliminar</button>
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
                  <Smartphone size={14} className={isMobileEnv ? 'text-blue-500' : ''} />
               </div>
            </div>
            <button onClick={() => setIsDev(false)} className="px-5 py-2 bg-zinc-950 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all"><EyeOff size={14} className="inline mr-2"/> Salir</button>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto scroll-smooth transition-all duration-700 custom-scroll ${isDev ? 'p-6 md:p-12 bg-slate-100' : 'p-0 bg-white'}`}>
          <div className={`mx-auto transition-all duration-700 min-h-full ${isDev ? 'bg-white shadow-2xl rounded-[3rem] border-[14px] border-zinc-900 max-w-[420px] md:max-w-[1400px] relative overflow-hidden' : 'w-full min-h-screen'}`}>
             <PageRenderer 
                page={currentPage} 
                isDev={isDev} 
                isMobileEnv={isMobileEnv}
                onNavigate={(id: string) => { setCurrentPageId(id); window.scrollTo(0,0); setActiveFloating([]); }} 
                onFooterClick={() => {
                  const n = devClicks + 1; setDevClicks(n);
                  if (n >= 5 && n < 10) setDevMsg(`Activando editor en ${10 - n}...`);
                  if (n >= 10) { setShowLogin(true); setDevClicks(0); setDevMsg(""); }
                  setTimeout(() => { setDevClicks(0); setDevMsg(""); }, 5000);
                }} 
                onSelectBlock={(id: string) => { setEditingId(id); setActiveTab('blocks'); setSidebarOpen(true); }} 
                msg={devMsg} 
                setGlobalCursor={setGlobalCursor}
                activeFloating={activeFloating}
                setActiveFloating={setActiveFloating}
             />
          </div>
        </div>
      </main>

      {/* RENDERIZADO DE COMPONENTES FLOTANTES */}
      {activeFloating.map((f, i) => (
        <div key={i} className="fixed z-[150] shadow-2xl animate-fade-in pointer-events-auto" style={{ 
          top: f.pos.top, bottom: f.pos.bottom, left: f.pos.left, right: f.pos.right 
        }}>
          <div className="relative bg-white border-2 border-black p-4 rounded-xl">
             <button onClick={() => setActiveFloating(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-3 -right-3 bg-black text-white rounded-full p-1"><X size={12}/></button>
             {f.type === 'text' && <p className="text-black font-bold">{f.content}</p>}
             {f.type === 'image' && <img src={f.content} className="max-w-[300px] rounded" />}
             {f.type === 'html' && <div dangerouslySetInnerHTML={{ __html: f.content }} />}
          </div>
        </div>
      ))}
    </div>
  );
}

function PageRenderer({ page, isDev, onNavigate, onFooterClick, onSelectBlock, msg, isMobileEnv, setGlobalCursor, activeFloating, setActiveFloating }: any) {
  const themes: any = {
    default: "bg-white text-zinc-900",
    journal: "theme-journal",
    'retro-tv': "theme-tv"
  };

  const isHidden = !isDev && ((isMobileEnv && page?.no_mobile) || (!isMobileEnv && page?.no_pc));
  if (isHidden) return <div className="p-20 text-center text-zinc-400 italic bg-white h-screen flex items-center justify-center font-sans">Contenido no disponible en este dispositivo.</div>;

  const containerStyle = {
    backgroundImage: page?.backgroundImage ? `url(${page.backgroundImage})` : 'none',
    backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
  };

  const contentWidthClass = (page?.layoutWidth === "80%" && !isMobileEnv) ? "max-w-[80%] mx-auto" : "max-w-full";

  return (
    <div className={`${themes[page?.theme] || themes.default} w-full transition-all duration-1000 select-none relative min-h-screen flex flex-col items-center`} style={containerStyle}>
      {page?.theme === 'retro-tv' && <><div className="scanlines"></div><div className="flicker"></div></>}
      
      <div className={`${contentWidthClass} w-full space-y-20 py-16 md:py-32 px-8 md:px-24 pb-40 z-20 relative transition-all duration-500`}>
        <header className="border-b-4 border-current pb-10 mb-20 animate-in slide-in-from-top duration-700">
          <h1 className="text-5xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] drop-shadow-sm">{page?.title || "Sin Título"}</h1>
          <div className="text-[10px] font-bold opacity-30 uppercase tracking-[0.5em] mt-4">ID: {page?.id || "N/A"}</div>
        </header>

        <div className="space-y-24">
          {page?.blocks.map((b: Block) => (
            <div key={b.id} onClick={e => { if(isDev) { e.stopPropagation(); onSelectBlock(b.id); } }} className={isDev ? 'cursor-edit hover:ring-2 hover:ring-blue-500 rounded-2xl p-2 transition-all relative group' : ''}>
              {isDev && <Edit3 size={16} className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-blue-500" />}
              <HiddenWrapper block={b} onNavigate={onNavigate} isDev={isDev} setGlobalCursor={setGlobalCursor} setActiveFloating={setActiveFloating}>
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

function HiddenWrapper({ block, children, onNavigate, isDev, setGlobalCursor, setActiveFloating }: any) {
  const [revealed, setRevealed] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [inputText, setInputText] = useState("");
  const timer = useRef<any>(null);

  const executeAction = () => {
    setRevealed(true);
    // Ejecutar efectos secundarios según configuración
    if (block.actionResult === 'navigate' && block.clueLink) onNavigate(block.clueLink);
    if (block.actionResult === 'cursor' && block.mouseIcon) setGlobalCursor(block.mouseIcon);
    if (block.actionResult === 'audio' && block.audioUrl) new Audio(block.audioUrl).play();
    if (block.actionResult === 'floating' && block.floatingProps) setActiveFloating((prev: any) => [...prev, block.floatingProps]);
  };

  const onEnter = () => { 
    if(isDev) return; 
    if(block.actionType === 'hover') executeAction(); 
    if(block.actionType === 'long-hover') timer.current = setTimeout(executeAction, 3000); 
  };

  const onLeave = () => { 
    if(isDev) return; 
    setRevealed(false); 
    clearTimeout(timer.current); 
    if (block.actionResult === 'cursor') setGlobalCursor(null);
  };

  const onClick = () => { 
    if(isDev) return; 
    if(block.actionType === 'triple-click') { 
      const next = clicks + 1; setClicks(next); 
      if(next === 3) { executeAction(); setClicks(0); } 
      setTimeout(() => setClicks(0), 1000); 
    } 
  };

  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick} className="relative transition-all duration-500">
      <div className={`${revealed && (block.actionResult === 'discover' || block.actionResult === 'navigate') ? 'opacity-10 blur-xl pointer-events-none scale-95' : 'transition-all duration-700'}`}>
        {children}
        
        {block.actionType === 'input-match' && !revealed && !isDev && (
          <div className="mt-4 flex gap-2">
             <input value={inputText} onChange={e => setInputText(e.target.value)} placeholder="¿La clave?" className="border-b border-black text-xs p-1 outline-none" />
             <button onClick={() => { if(inputText.toLowerCase() === block.triggerValue?.toLowerCase()) executeAction(); }} className="text-[10px] font-black uppercase"><Check size={14}/></button>
          </div>
        )}
      </div>

      {revealed && block.actionResult === 'discover' && block.clueLink && !isDev && (
        <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in fade-in duration-500 z-50">
           <button onClick={(e) => { e.stopPropagation(); onNavigate(block.clueLink); }} className="bg-black text-white px-10 py-5 rounded-full font-black uppercase text-xs tracking-widest shadow-2xl flex items-center gap-3 border border-white/20 transition-all hover:scale-110"><Share2 size={16}/> DESCUBRIR</button>
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
    case 'text': return <p className="text-xl md:text-6xl leading-[1] tracking-tighter whitespace-pre-wrap">{block.content}</p>;
    case 'image': return <img src={block.content} className="w-full rounded-[2.5rem] shadow-2xl grayscale-[0.6] hover:grayscale-0 transition-all duration-1000" alt="Enigma" />;
    case 'video': return <div className="aspect-video w-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-black border-4 border-white/5"><iframe src={parseVideo(block.content)} title="Contenido" className="w-full h-full" allowFullScreen /></div>;
    case 'html': return <div dangerouslySetInnerHTML={{ __html: block.content }} />;
    default: return null;
  }
}
