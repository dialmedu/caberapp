import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, EyeOff, Layers, Home, Lock,
  Share2, Menu, X, Palette, Sparkles, Trash2, Settings,
  Edit3, GripVertical, Monitor, Tv, FileText, ExternalLink, FileCode, Check, AlertCircle, Smartphone, ArrowLeft, MousePointer2, Volume2, Maximize, Link as LinkIcon, GitBranch, Copy
} from 'lucide-react';

// --- INTERFACES ---
interface Block {
  id: string;
  type: string; // 'text' | 'image' | 'video' | 'html'
  content: string;
  position: 'relative' | 'fixed'; 
  actionType: string; // 'none' | 'hover' | 'long-hover' | 'click' | 'double-click' | 'triple-click' | 'input-match'
  actionResult: string; // 'discover' | 'navigate' | 'cursor' | 'audio' | 'appear' | 'replace'
  clueLink: string;     
  triggerValue?: string; 
  mouseIcon?: string;    
  audioUrl?: string;     
  posProps?: { top?: string; bottom?: string; left?: string; right?: string }; 
  subBlock?: Block; // Nuevo: Componente anidado para apariciones o reemplazos
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
        { id: 'b1', type: 'text', content: 'Escribe "enigma" para avanzar.', position: 'relative', actionType: 'input-match', triggerValue: 'enigma', actionResult: 'discover', clueLink: 'inicio', options: { scale: 100 } }
      ],
      layoutWidth: '100%'
    }
  },
  pageOrder: ['inicio'],
  homePageId: 'inicio'
};

const themeStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime&family=Inter:wght@400;700;900&display=swap');
  
  html, body, #root {
    width: 100% !important;
    height: 100% !important;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .theme-journal { 
    font-family: 'Special Elite', cursive; 
    background-color: #f4e4bc; 
    background-image: url('https://www.transparenttextures.com/patterns/old-map.png'); 
    color: #2c1e11; 
    box-shadow: inset 0 0 100px rgba(0,0,0,0.1); 
  }
  
  .theme-tv { 
    background-color: #0a0a0a; 
    color: #10b981; 
    text-shadow: 0 0 8px rgba(16, 185, 129, 0.6); 
    font-family: 'Courier Prime', monospace; 
  }

  .scanlines { position: absolute; inset: 0; pointer-events: none; z-index: 10; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%); background-size: 100% 4px; }
  @keyframes flicker { 0% { opacity: 0.1; } 100% { opacity: 0.12; } }
  .flicker { animation: flicker 0.1s infinite; position: absolute; inset: 0; pointer-events: none; z-index: 11; background: white; opacity: 0.03; }
  
  .custom-scroll::-webkit-scrollbar { width: 6px; }
  .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 10px; }
`;

export default function App() {
  const [config, setConfig] = useState<Config>(INITIAL_DATA);
  const [currentPageId, setCurrentPageId] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [isDev, setIsDev] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pages');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSubBlock, setEditingSubBlock] = useState(false); // Nuevo: Control de edición de hijos
  const [password, setPassword] = useState("");
  const [devClicks, setDevClicks] = useState(0);
  const [devMsg, setDevMsg] = useState("");
  const [isMobileEnv, setIsMobileEnv] = useState(false);
  const [rawJson, setRawJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isExternalLinkMode, setIsExternalLinkMode] = useState(false);
  const [globalCursor, setGlobalCursor] = useState<string | null>(null);

  useEffect(() => {
    const checkEnv = () => setIsMobileEnv(window.innerWidth < 768);
    checkEnv();
    window.addEventListener('resize', checkEnv);
    
    const loadData = async () => {
      const saved = localStorage.getItem('enigma_v15_pro');
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
      localStorage.setItem('enigma_v15_pro', JSON.stringify(config));
    }
  }, [config]);

  const handleLogin = () => {
    if (password === "Daniela") {
      setIsDev(true); setShowLogin(false); setSidebarOpen(true); setPassword("");
    } else alert("Clave incorrecta");
  };

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

  const navigateTo = (id: string) => {
    if (!id) return;
    if (id.startsWith('http')) {
      window.open(id, '_blank');
      return;
    }
    setHistory(prev => [...prev, currentPageId]);
    setCurrentPageId(id);
    window.scrollTo(0,0);
  };

  const goBack = () => {
    if (history.length === 0) return;
    const lastPage = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setCurrentPageId(lastPage);
    window.scrollTo(0,0);
  };

  const addBlock = () => {
    const id = 'b' + Date.now();
    const pg = config.pages[currentPageId];
    if (!pg) return;
    const newBlock: Block = { 
      id, type: 'text', content: 'Nuevo misterio...', 
      position: 'relative', actionType: 'none', actionResult: 'discover', clueLink: '', 
      options: { scale: 100 } 
    };
    setConfig(prev => ({...prev, pages: {...prev.pages, [currentPageId]: {...pg, blocks: [...pg.blocks, newBlock]}}}));
    setEditingId(id); setActiveTab('blocks');
  };

  const updateCurrentBlock = (upd: Partial<Block>) => {
    const pg = config.pages[currentPageId];
    const blocks = pg.blocks.map(b => b.id === editingId ? { ...b, ...upd } : b);
    setConfig({ ...config, pages: { ...config.pages, [currentPageId]: { ...pg, blocks } } });
  };

  const updateSubBlock = (upd: Partial<Block>) => {
    const pg = config.pages[currentPageId];
    const blocks = pg.blocks.map(b => {
      if (b.id === editingId) {
        return { ...b, subBlock: { ...(b.subBlock as Block), ...upd } };
      }
      return b;
    });
    setConfig({ ...config, pages: { ...config.pages, [currentPageId]: { ...pg, blocks } } });
  };

  const currentPage = config.pages[currentPageId] || config.pages[config.homePageId];

  return (
    <div 
      className={`flex h-screen w-full transition-colors duration-500 overflow-hidden ${isDev ? 'bg-zinc-900' : 'bg-white'}`}
      style={globalCursor ? { cursor: `url(${globalCursor}), auto` } : {}}
    >
      {/* MODAL DE LOGIN */}
      {showLogin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 text-white text-xs">
          <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center">
            <Lock className="mx-auto text-blue-500 mb-6" size={56} />
            <input type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="w-full bg-zinc-800 border border-zinc-700 p-5 rounded-2xl text-white text-center text-3xl mb-6 outline-none" placeholder="••••" />
            <button onClick={handleLogin} className="w-full bg-blue-600 p-5 rounded-2xl text-white font-black uppercase tracking-widest shadow-lg hover:bg-blue-500">ENTRAR</button>
            <button onClick={() => setShowLogin(false)} className="mt-6 text-zinc-500 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* PANEL DE EDITOR (SIDEBAR) */}
      {isDev && (
        <aside className={`h-full bg-zinc-950 border-r border-zinc-800 flex flex-col z-[100] transition-all duration-300 ${sidebarOpen ? 'w-[95vw] md:w-[480px]' : 'w-0 overflow-hidden'}`}>
          <div className="p-4 border-b border-zinc-900 flex justify-between items-center shrink-0">
            <span className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2"><Sparkles size={16} className="text-blue-400" /> CMS ENGINE PRO</span>
            <button onClick={() => setSidebarOpen(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
          </div>

          <div className="flex border-b border-zinc-900 shrink-0 overflow-x-auto hide-scrollbar">
            {[
              { id: 'pages', icon: Home, label: 'Páginas' },
              { id: 'design', icon: Palette, label: 'Diseño' },
              { id: 'tree', icon: GitBranch, label: 'Árbol' },
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

          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scroll text-white text-xs">
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
                    <div key={pid} draggable onDragStart={(e) => handleDragStart(e, pid, 'page')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, pid, 'page')}
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

            {/* NUEVO TAB: ÁRBOL DE COMPONENTES */}
            {activeTab === 'tree' && (
              <div className="space-y-4 animate-in fade-in">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Estructura de Nodos: {currentPage.title}</h4>
                <div className="space-y-3 pl-2 border-l border-zinc-800">
                  {currentPage.blocks.map((b) => (
                    <div key={b.id} className="space-y-2">
                       <div onClick={() => { setEditingId(b.id); setEditingSubBlock(false); setActiveTab('blocks'); }} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-zinc-900 transition-colors ${editingId === b.id && !editingSubBlock ? 'bg-zinc-800 text-blue-400 border border-blue-900/30' : 'text-zinc-400'}`}>
                          <Layers size={14}/>
                          <span className="font-mono text-[10px]">{b.type} <span className="opacity-30">#{b.id.slice(-4)}</span></span>
                       </div>
                       {b.subBlock && (
                         <div onClick={() => { setEditingId(b.id); setEditingSubBlock(true); setActiveTab('blocks'); }} className={`flex items-center gap-2 p-2 ml-4 rounded-lg cursor-pointer hover:bg-zinc-900 transition-colors border-l-2 border-zinc-800 ${editingId === b.id && editingSubBlock ? 'bg-zinc-800 text-amber-400 border border-amber-900/30' : 'text-zinc-500'}`}>
                            <GitBranch size={12}/>
                            <span className="font-mono text-[9px]">CHILD: {b.subBlock.type}</span>
                         </div>
                       )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'blocks' && (
              <div className="space-y-4 pb-20 animate-in fade-in">
                <div className="flex justify-between items-center mb-2 text-zinc-500"><h4 className="text-[10px] font-black uppercase tracking-widest">Componentes</h4><button onClick={addBlock} className="bg-blue-600 text-white p-1 rounded-lg shadow-lg"><Plus size={18}/></button></div>
                {currentPage?.blocks.map((b: Block, idx: number) => {
                  const isCurrent = editingId === b.id;
                  const blockToEdit = (isCurrent && editingSubBlock && b.subBlock) ? b.subBlock : b;
                  
                  return (
                    <div key={b.id} className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-all ${isCurrent ? 'border-blue-500 shadow-xl' : 'border-slate-800'}`}>
                      <div className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <GripVertical size={12} className="opacity-30" />
                           <span onClick={() => { setEditingId(b.id); setEditingSubBlock(false); }} className="text-[9px] font-black uppercase text-zinc-500 truncate max-w-[150px]">{b.type}: {b.content.substring(0,10)}...</span>
                        </div>
                        <Settings onClick={() => { setEditingId(b.id); setEditingSubBlock(false); }} size={12} className="text-zinc-600 cursor-pointer hover:text-white" />
                      </div>
                      
                      {isCurrent && (
                        <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-4">
                           {/* HEADER DE SUB-EDICIÓN */}
                           {editingSubBlock && (
                             <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl flex justify-between items-center mb-4">
                                <span className="text-[8px] font-black uppercase text-amber-500 flex items-center gap-1"><GitBranch size={10}/> Editando Hijo</span>
                                <button onClick={() => setEditingSubBlock(false)} className="text-[8px] font-black bg-amber-500 text-black px-2 py-0.5 rounded">Volver al Padre</button>
                             </div>
                           )}

                           <div className="grid grid-cols-2 gap-2">
                             <div>
                                <label className="text-[8px] uppercase text-zinc-600 font-black mb-1 block">Tipo Bloque</label>
                                <select 
                                  value={blockToEdit.type} 
                                  onChange={e => {
                                    if (editingSubBlock) updateSubBlock({ type: e.target.value });
                                    else updateCurrentBlock({ type: e.target.value });
                                  }} 
                                  className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-[10px]"
                                >
                                  <option value="text">Texto</option><option value="image">Imagen</option><option value="video">Video</option><option value="html">HTML</option>
                                </select>
                             </div>
                             <div>
                                <label className="text-[8px] uppercase text-zinc-600 font-black mb-1 block">Posición</label>
                                <select 
                                  value={blockToEdit.position} 
                                  onChange={e => {
                                    if (editingSubBlock) updateSubBlock({ position: e.target.value as any });
                                    else updateCurrentBlock({ position: e.target.value as any });
                                  }}
                                  className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-[10px]"
                                >
                                  <option value="relative">Inline (Normal)</option><option value="fixed">Fixed (Flotante)</option>
                                </select>
                             </div>
                           </div>

                           {blockToEdit.position === 'fixed' && (
                             <div className="grid grid-cols-2 gap-2 bg-blue-500/5 p-2 rounded border border-blue-500/20">
                               <input placeholder="Top (ej 20px)" value={blockToEdit.posProps?.top || ""} onChange={e => {
                                 const p = {...(blockToEdit.posProps||{}), top: e.target.value};
                                 if (editingSubBlock) updateSubBlock({ posProps: p }); else updateCurrentBlock({ posProps: p });
                               }} className="bg-zinc-900 p-1 rounded text-[10px]" />
                               <input placeholder="Left (ej 50%)" value={blockToEdit.posProps?.left || ""} onChange={e => {
                                 const p = {...(blockToEdit.posProps||{}), left: e.target.value};
                                 if (editingSubBlock) updateSubBlock({ posProps: p }); else updateCurrentBlock({ posProps: p });
                               }} className="bg-zinc-900 p-1 rounded text-[10px]" />
                             </div>
                           )}

                           <div className="space-y-1">
                              <label className="text-[8px] uppercase text-zinc-600 font-black mb-1 block">Interactividad (Trigger)</label>
                              <select value={blockToEdit.actionType} onChange={e => {
                                if (editingSubBlock) updateSubBlock({ actionType: e.target.value });
                                else updateCurrentBlock({ actionType: e.target.value });
                              }} className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-[10px]">
                                <option value="none">Visible Siempre</option>
                                <option value="hover">Al pasar mouse</option>
                                <option value="long-hover">Esperar 3 seg</option>
                                <option value="click">Al hacer click</option>
                                <option value="double-click">Doble Click</option>
                                <option value="triple-click">Triple Click</option>
                                <option value="input-match">Input de Clave</option>
                              </select>
                           </div>

                           <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-3">
                              <label className="text-[8px] uppercase text-blue-400 font-black block">Respuesta de Acción</label>
                              <select value={blockToEdit.actionResult} onChange={e => {
                                const val = e.target.value;
                                const upd: Partial<Block> = { actionResult: val };
                                if ((val === 'appear' || val === 'replace') && !blockToEdit.subBlock) {
                                  upd.subBlock = { id: 'child-' + Date.now(), type: 'text', content: 'Contenido hijo...', position: 'relative', actionType: 'none', actionResult: 'discover', clueLink: '', options: { scale: 100 } };
                                }
                                if (editingSubBlock) updateSubBlock(upd); else updateCurrentBlock(upd);
                              }} className="w-full bg-zinc-900 p-2 rounded border border-zinc-800 text-[10px]">
                                 <option value="discover">Botón Descubrir</option>
                                 <option value="navigate">Navegación Directa</option>
                                 <option value="cursor">Cambiar Cursor</option>
                                 <option value="audio">Reproducir Audio</option>
                                 <option value="appear">Aparecer Hijo</option>
                                 <option value="replace">Reemplazar por Hijo</option>
                              </select>

                              {blockToEdit.actionType === 'input-match' && (
                                <input placeholder="Clave secreta..." value={blockToEdit.triggerValue || ""} onChange={e => {
                                  if (editingSubBlock) updateSubBlock({ triggerValue: e.target.value }); else updateCurrentBlock({ triggerValue: e.target.value });
                                }} className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-[10px]" />
                              )}

                              {(blockToEdit.actionResult === 'appear' || blockToEdit.actionResult === 'replace') && (
                                <button onClick={() => setEditingSubBlock(true)} className="w-full p-2 bg-amber-600 text-black text-[9px] font-black uppercase rounded-lg hover:bg-amber-500 transition-all flex items-center justify-center gap-2 shadow-lg">
                                  <Edit3 size={12}/> Configurar Hijo
                                </button>
                              )}

                              {(blockToEdit.actionResult === 'discover' || blockToEdit.actionResult === 'navigate') && (
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                                     <button onClick={() => setIsExternalLinkMode(false)} className={`flex-1 py-1 text-[8px] font-black rounded uppercase transition-all ${!isExternalLinkMode ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}>Interno</button>
                                     <button onClick={() => setIsExternalLinkMode(true)} className={`flex-1 py-1 text-[8px] font-black rounded uppercase transition-all ${isExternalLinkMode ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}>Externo</button>
                                  </div>
                                  {isExternalLinkMode ? (
                                    <input placeholder="https://..." value={blockToEdit.clueLink} onChange={e => { if(editingSubBlock) updateSubBlock({clueLink: e.target.value}); else updateCurrentBlock({clueLink: e.target.value}); }} className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-blue-400 font-bold text-[10px]" />
                                  ) : (
                                    <select value={blockToEdit.clueLink} onChange={e => { if(editingSubBlock) updateSubBlock({clueLink: e.target.value}); else updateCurrentBlock({clueLink: e.target.value}); }} className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-blue-400 font-bold text-[10px]">
                                      <option value="">Página...</option>
                                      {config.pageOrder.map(pid => <option key={pid} value={pid}>{config.pages[pid]?.title || pid}</option>)}
                                    </select>
                                  )}
                                </div>
                              )}
                           </div>

                           <textarea value={blockToEdit.content} onChange={e => { if(editingSubBlock) updateSubBlock({content: e.target.value}); else updateCurrentBlock({content: e.target.value}); }} className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-[10px] text-white min-h-[60px] outline-none" />
                           <button onClick={() => {
                             const blocks = config.pages[currentPageId].blocks.filter(block => block.id !== b.id);
                             setConfig({...config, pages: {...config.pages, [currentPageId]: {...currentPage, blocks}}});
                             setEditingId(null);
                           }} className="w-full p-2 bg-red-600/10 text-red-500 text-[9px] font-black uppercase rounded-lg">Eliminar</button>
                        </div>
                      )}
                    </div>
                  );
                })}
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
            <button onClick={() => setIsDev(false)} className="px-5 py-2 bg-zinc-950 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all"><EyeOff size={14} className="inline mr-2"/> Finalizar</button>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto scroll-smooth transition-all duration-700 custom-scroll ${isDev ? 'p-6 md:p-12 bg-slate-100' : 'p-0 bg-white'}`}>
          <div className={`mx-auto transition-all duration-700 min-h-full ${isDev ? 'bg-white shadow-2xl rounded-[3rem] border-[14px] border-zinc-900 max-w-[420px] md:max-w-7xl relative overflow-hidden' : 'w-full min-h-screen'}`}>
             <PageRenderer 
                page={currentPage} 
                isDev={isDev} 
                isMobileEnv={isMobileEnv}
                history={history}
                onNavigate={navigateTo} 
                onBack={goBack}
                onFooterClick={() => {
                  const n = devClicks + 1; setDevClicks(n);
                  if (n >= 5 && n < 10) setDevMsg(`Activando editor en ${10 - n}...`);
                  if (n >= 10) { setShowLogin(true); setDevClicks(0); setDevMsg(""); }
                  setTimeout(() => { setDevClicks(0); setDevMsg(""); }, 5000);
                }} 
                onSelectBlock={(id: string) => { setEditingId(id); setActiveTab('blocks'); setSidebarOpen(true); }} 
                msg={devMsg} 
                setGlobalCursor={setGlobalCursor}
             />
          </div>
        </div>
      </main>
    </div>
  );
}

function PageRenderer({ page, isDev, onNavigate, onBack, history, onFooterClick, onSelectBlock, msg, isMobileEnv, setGlobalCursor }: any) {
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
      
      {!isDev && history.length > 0 && (
        <button onClick={onBack} className="absolute top-6 left-6 z-[60] p-3 bg-white/10 backdrop-blur-md border border-current/20 rounded-full hover:bg-white/20 transition-all active:scale-90"><ArrowLeft size={20} /></button>
      )}

      <div className={`${contentWidthClass} w-full space-y-20 py-16 md:py-32 px-8 md:px-24 pb-40 z-20 relative transition-all duration-500`}>
        <header className="border-b-4 border-current pb-10 mb-20 animate-in slide-in-from-top duration-700">
          <h1 className="text-5xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] drop-shadow-sm">{page?.title || "Sin Título"}</h1>
          <div className="text-[10px] font-bold opacity-30 uppercase tracking-[0.5em] mt-4">ID: {page?.id || "N/A"}</div>
        </header>

        <div className="space-y-24">
          {page?.blocks.map((b: Block) => (
            <div 
              key={b.id} 
              onClick={e => { if(isDev) { e.stopPropagation(); onSelectBlock(b.id); } }} 
              className={`${isDev ? 'cursor-edit hover:ring-2 hover:ring-blue-500 rounded-2xl p-2 transition-all relative group' : ''} ${b.position === 'fixed' ? 'fixed z-[100]' : ''}`}
              style={b.position === 'fixed' ? { top: b.posProps?.top, left: b.posProps?.left, right: b.posProps?.right, bottom: b.posProps?.bottom } : {}}
            >
              {isDev && <Edit3 size={16} className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-blue-500" />}
              <HiddenWrapper block={b} onNavigate={onNavigate} isDev={isDev} setGlobalCursor={setGlobalCursor}>
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

function HiddenWrapper({ block, children, onNavigate, isDev, setGlobalCursor }: any) {
  const [revealed, setRevealed] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [inputText, setInputText] = useState("");
  const timer = useRef<any>(null);

  const executeAction = () => {
    setRevealed(true);
    if (block.actionResult === 'navigate' && block.clueLink) onNavigate(block.clueLink);
    if (block.actionResult === 'cursor' && block.mouseIcon) setGlobalCursor(block.mouseIcon);
    if (block.actionResult === 'audio' && block.audioUrl) new Audio(block.audioUrl).play();
  };

  const onEnter = () => { 
    if(isDev) return; 
    if(block.actionType === 'hover') executeAction(); 
    if(block.actionType === 'long-hover') timer.current = setTimeout(executeAction, 3000); 
  };

  const onLeave = () => { 
    if(isDev) return; 
    if(block.actionType === 'hover' || block.actionType === 'long-hover') { setRevealed(false); clearTimeout(timer.current); }
    if(block.actionResult === 'cursor') setGlobalCursor(null);
  };

  const onClick = () => { 
    if(isDev) return; 
    const n = clicks + 1;
    if(block.actionType === 'click') executeAction();
    if(block.actionType === 'double-click' && n === 2) { executeAction(); setClicks(0); }
    if(block.actionType === 'triple-click' && n === 3) { executeAction(); setClicks(0); }
    setClicks(n);
    setTimeout(() => setClicks(0), 500); 
  };

  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick} className="relative transition-all duration-500">
      <div className={`${revealed && (block.actionResult === 'discover' || block.actionResult === 'navigate') ? 'opacity-10 blur-xl pointer-events-none scale-95' : 'transition-all duration-700'}`}>
        {/* Renderizado de Reemplazo */}
        {revealed && block.actionResult === 'replace' && block.subBlock ? (
           <div className="animate-in fade-in zoom-in duration-500">
              <BlockRenderer block={block.subBlock} />
           </div>
        ) : children}
        
        {block.actionType === 'input-match' && !revealed && !isDev && (
          <div className="mt-4 flex gap-2">
             <input value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Clave..." className="border-b border-black text-xs p-1 outline-none bg-transparent" />
             <button onClick={(e) => { e.stopPropagation(); if(inputText.toLowerCase() === block.triggerValue?.toLowerCase()) executeAction(); }} className="p-1"><Check size={14}/></button>
          </div>
        )}
      </div>

      {/* Renderizado de Aparición (Hijo convive con Padre) */}
      {revealed && block.actionResult === 'appear' && block.subBlock && (
        <div className={`animate-in fade-in duration-500 ${block.subBlock.position === 'fixed' ? 'fixed z-[110]' : 'mt-6'}`}
             style={block.subBlock.position === 'fixed' ? { top: block.subBlock.posProps?.top, left: block.subBlock.posProps?.left } : {}}>
           <BlockRenderer block={block.subBlock} />
        </div>
      )}

      {revealed && block.actionResult === 'discover' && block.clueLink && !isDev && (
        <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in fade-in duration-500 z-50">
           <button onClick={(e) => { e.stopPropagation(); onNavigate(block.clueLink); }} className="bg-black text-white px-10 py-5 rounded-full font-black uppercase text-xs tracking-widest shadow-2xl flex items-center gap-3 border border-white/20 transition-all hover:scale-110">
              {block.clueLink.startsWith('http') ? <ExternalLink size={16}/> : <Share2 size={16}/>} DESCUBRIR
           </button>
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
