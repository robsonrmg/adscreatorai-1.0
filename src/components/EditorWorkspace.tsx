import React, { useState } from 'react';
import { Page, PageComponent, ComponentType } from '../types';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Edit2,
  Sliders,
  Type as FontIcon,
  MousePointerClick,
  Image as ImageIcon,
  Tv as VideoIcon,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  Check,
  Layers,
  Clock,
  Play,
  FileText,
  Loader2,
  Download
} from 'lucide-react';

interface Props {
  page: Page;
  onBack: () => void;
  onSave: (id: string, updatedComponents: PageComponent[]) => Promise<void>;
}

export default function EditorWorkspace({ page, onBack, onSave }: Props) {
  const [components, setComponents] = useState<PageComponent[]>(JSON.parse(JSON.stringify(page.components)));
  const [selectedCompId, setSelectedCompId] = useState<string | null>(components[0]?.id || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const selectedComp = components.find((c) => c.id === selectedCompId);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(page.id, components);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComponent = (type: ComponentType) => {
    const defaultContents: Record<ComponentType, any> = {
      headline: { title: "Meu Título Persuasivo", text: "Minha subheadline instigadora de cliques." },
      text: { text: "Escreva aqui seu storytelling detalhando os benefícios do produto." },
      button: { buttonText: "COMPRAR COM DESCONTO AGORA", buttonUrl: page.originalUrl || "https://siteoficial.com" },
      image: { src: `/api/fallback-image?product=${encodeURIComponent(page.productName)}`, alt: page.productName },
      video: { title: "Assista à Apresentação Exclusiva", embedCode: `<iframe width="100%" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>` },
      faq: {
        title: "Perguntas Frequentes",
        faqList: [{ question: "O envio é rápido?", answer: "Sim, processamento imediato pelo fabricante." }]
      },
      testimonials: {
        title: "Avaliações e Mídia Social",
        testimonialsList: [{ name: "João Pedro", text: "Satisfeito com o suporte técnico e entrega.", role: "São Paulo" }]
      },
      guarantee: { title: "Garantia de Satisfação Total", text: "Seu dinheiro de volta se não gostar." },
      compare: {
        title: "Por que nos escolher?",
        compareFields: [{ feature: "Eficácia", productA: page.productName, productB: "Outros", valueA: true, valueB: false }]
      },
      timer: { title: "A promoção se encerra em:", durationMinutes: 10 }
    };

    const newComp: PageComponent = {
      id: "comp_" + Math.random().toString(36).substr(2, 9),
      type,
      content: defaultContents[type]
    };

    setComponents([...components, newComp]);
    setSelectedCompId(newComp.id);
  };

  const handleDeleteComponent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = components.filter((c) => c.id !== id);
    setComponents(updated);
    if (selectedCompId === id) {
      setSelectedCompId(updated[0]?.id || null);
    }
  };

  const handleDuplicateComponent = (comp: PageComponent, e: React.MouseEvent) => {
    e.stopPropagation();
    const copyComp: PageComponent = {
      ...JSON.parse(JSON.stringify(comp)),
      id: "comp_" + Math.random().toString(36).substr(2, 9)
    };
    const index = components.findIndex((c) => c.id === comp.id);
    const updated = [...components];
    updated.splice(index + 1, 0, copyComp);
    setComponents(updated);
    setSelectedCompId(copyComp.id);
  };

  const handleMoveUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === 0) return;
    const updated = [...components];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setComponents(updated);
  };

  const handleMoveDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === components.length - 1) return;
    const updated = [...components];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setComponents(updated);
  };

  const handleUpdateContent = (field: string, value: any) => {
    if (!selectedComp) return;
    const updated = components.map((c) => {
      if (c.id === selectedComp.id) {
        return {
          ...c,
          content: {
            ...c.content,
            [field]: value
          }
        };
      }
      return c;
    });
    setComponents(updated);
  };

  const COMP_ICONS: Partial<Record<ComponentType, React.ReactNode>> = {
    headline: <FontIcon size={14} className="text-blue-400" />,
    text: <FileText size={14} className="text-teal-400" />,
    button: <MousePointerClick size={14} className="text-green-400" />,
    image: <ImageIcon size={14} className="text-amber-400" />,
    faq: <HelpCircle size={14} className="text-purple-400" />,
    testimonials: <MessageSquare size={14} className="text-orange-400" />,
    guarantee: <ShieldCheck size={14} className="text-emerald-400" />,
    compare: <Layers size={14} className="text-indigo-400" />,
    timer: <Clock size={14} className="text-rose-400" />
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40" id="editor-workspace">
      
      {/* 1. LEFT SIDEBAR: TOOLBOX & STRUCURTER LISTING */}
      <div className="w-full lg:w-72 bg-slate-950 border-r border-slate-800 flex flex-col justify-between">
        
        <div className="p-4 space-y-6 overflow-y-auto flex-1">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 px-2 border border-slate-800 rounded bg-slate-900 text-slate-400 hover:text-white transition-all text-[11px] flex items-center gap-1 cursor-pointer">
              <ArrowLeft size={10} /> Voltar
            </button>
            <span className="text-[10px] font-mono text-slate-550 truncate text-slate-400 font-bold">{page.productName}</span>
          </div>

          {/* ADD BLOCKS TOOLBOX */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-black tracking-wider uppercase font-mono text-slate-500">Adicionar Blocos</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(COMP_ICONS) as ComponentType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleAddComponent(type)}
                  className="flex items-center gap-1.5 p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-lg text-left text-xs font-medium text-slate-300 transition-all cursor-pointer"
                >
                  {COMP_ICONS[type]}
                  <span className="capitalize">{type === 'compare' ? 'Comparar' : type === 'timer' ? 'Contador' : type === 'testimonials' ? 'Review' : type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* PAGE STRUCTURE TREE */}
          <div className="space-y-2.5 pt-4 border-t border-slate-900">
            <h3 className="text-[10px] font-black tracking-wider uppercase font-mono text-slate-500">Estrutura Visual da Lente</h3>
            
            <div className="space-y-1.5">
              {components.map((comp, idx) => {
                const isSelected = selectedCompId === comp.id;
                return (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedCompId(comp.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected ? 'bg-slate-900 border-green-500 text-white' : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-mono text-slate-600">{idx + 1}</span>
                      {COMP_ICONS[comp.type] || <FileText size={14} className="text-slate-400" />}
                      <span className="font-mono text-[11px] truncate uppercase font-bold">{comp.type}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button onClick={(e) => handleMoveUp(idx, e)} disabled={idx === 0} className="p-0.5 text-slate-600 hover:text-white disabled:opacity-20">
                        <ChevronUp size={11} />
                      </button>
                      <button onClick={(e) => handleMoveDown(idx, e)} disabled={idx === components.length - 1} className="p-0.5 text-slate-600 hover:text-white disabled:opacity-20">
                        <ChevronDown size={11} />
                      </button>
                      <button onClick={(e) => handleDeleteComponent(comp.id, e)} className="p-0.5 text-slate-600 hover:text-red-400">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* SAVE WORKSPACE BUTTON */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/90 space-y-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2.5 px-4 rounded-lg bg-green-400 hover:bg-green-300 disabled:opacity-50 text-slate-950 font-black tracking-wider uppercase text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-green-950/30"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar Lente
          </button>
          
          <a
            href={`/api/pages/${page.id}/download`}
            download={`index-${page.slug}.html`}
            className="w-full py-2 px-4 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold tracking-wider uppercase text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download size={14} />
            Baixar HTML Estático
          </a>

          {saveSuccess && (
            <span className="block mt-1 text-center text-[10px] font-bold text-green-400 animate-pulse uppercase tracking-wider">
              ✓ Cópia da página salva!
            </span>
          )}
        </div>

      </div>

      {/* 2. MIDDLE PREVIEW: LOOKING LIKE REAL SITE ACCORDING TO STRCTURE */}
      <div className="flex-1 bg-slate-950 p-6 overflow-y-auto flex justify-center" id="visual-canvas-preview">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-8 select-none">
          
          <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-800 text-slate-500 font-mono">
            <span>Visualização da Lente de Vendas</span>
            <span>Estilo: {page.type}</span>
          </div>

          <div className="space-y-6">
            {components.map((comp, idx) => {
              const isSelected = selectedCompId === comp.id;
              return (
                <div
                  key={comp.id}
                  onClick={() => setSelectedCompId(comp.id)}
                  className={`relative p-4 rounded-xl transition-all border group cursor-pointer ${
                    isSelected ? 'bg-slate-910/20 border-green-500 ring-1 ring-green-950' : 'bg-slate-950/25 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Hover visual block management actions overlays */}
                  <span className="absolute -top-3.5 left-4 bg-slate-800 border border-slate-700 group-hover:flex text-[9px] font-bold font-mono uppercase tracking-widest text-slate-400 px-2 py-0.5 rounded-full z-10 select-none">
                    {comp.type} {isSelected && "• ATIVO"}
                  </span>

                  <div className="absolute right-3 top-3 hidden group-hover:flex items-center gap-1 z-10">
                    <button onClick={(e) => handleDuplicateComponent(comp, e)} title="Duplicar Bloco" className="p-1 px-1.5 bg-slate-950 border border-slate-800 rounded text-slate-400 hover:text-white hover:bg-slate-900">
                      <Copy size={9} />
                    </button>
                    <button onClick={(e) => handleDeleteComponent(comp.id, e)} title="Excluir Bloco" className="p-1 px-1.5 bg-slate-950 border border-slate-800 rounded text-slate-400 hover:text-red-400 hover:bg-slate-900">
                      <Trash2 size={9} />
                    </button>
                  </div>

                  {/* Rendering visual placeholder of page element */}
                  <div className="pt-2">
                    {comp.type === 'headline' && (
                      <div className="text-center py-4 space-y-2">
                        {comp.content.logo && (
                          <div className="flex justify-center mb-2">
                            <img src={comp.content.logo} alt="Logo" className="max-h-8 object-contain" />
                          </div>
                        )}
                        <h2 className="text-xl md:text-2xl font-black text-white leading-tight">{comp.content.title || "Vazio"}</h2>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">{comp.content.text || "Vazio"}</p>
                      </div>
                    )}

                    {comp.type === 'timer' && (
                      <div className="bg-red-950/40 border border-red-900 p-2.5 rounded-lg text-center flex flex-col justify-center items-center gap-1">
                        <span className="text-[10px] text-red-300 font-extrabold tracking-wide">{comp.content.title || "PROMOÇÃO"}</span>
                        <span className="font-mono text-xs font-black text-white bg-red-900 px-3 py-0.5 rounded">
                          0{comp.content.durationMinutes || 10}m : 00s
                        </span>
                      </div>
                    )}

                    {comp.type === 'text' && (
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap py-2 font-sans italic border-l border-slate-800 pl-3">
                        {comp.content.text || "Clique para editar esta cópia de vendas persuasiva."}
                      </p>
                    )}

                    {comp.type === 'video' && (
                      <div className="border border-red-950/40 p-4 rounded-xl text-center bg-slate-950/60">
                        <span className="text-xs text-red-400 font-bold">⚠️ Formato de Vídeo de Oferta Desabilitado (Filtrado por Regra de Mídia)</span>
                      </div>
                    )}

                    {comp.type === 'image' && (
                      <div className="text-center py-2">
                        {comp.content.images && Array.isArray(comp.content.images) && comp.content.images.length > 0 ? (
                          <div className="space-y-1.5">
                            <span className="block text-[9px] font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded tracking-wider uppercase mb-1.5">{comp.content.title || "Galeria de Imagens"}</span>
                            <div className="grid grid-cols-3 gap-1 px-1">
                              {comp.content.images.slice(0, 3).map((imgUrl: string, idx: number) => (
                                <img key={idx} src={imgUrl} className="max-h-12 w-full object-contain bg-slate-900 border border-slate-800 rounded p-0.5" alt="Scrap" referrerPolicy="no-referrer" />
                              ))}
                            </div>
                            {comp.content.images.length > 3 && (
                              <span className="block text-[8px] font-mono font-bold text-slate-500">Mais {comp.content.images.length - 3} variações de produtos</span>
                            )}
                          </div>
                        ) : (
                          <>
                            <img src={comp.content.src || "/api/fallback-image"} alt={comp.content.alt} className="max-h-36 mx-auto rounded border border-slate-800" referrerPolicy="no-referrer" />
                            <span className="block mt-1 text-[9px] font-mono text-slate-500">{comp.content.alt}</span>
                          </>
                        )}
                      </div>
                    )}

                    {comp.type === 'compare' && (
                      <div className="p-3 border border-slate-800 rounded-xl bg-slate-950 space-y-2">
                        <h4 className="text-xs font-bold text-center text-white">{comp.content.title || "Comparativo"}</h4>
                        <div className="space-y-1.5 text-[10px]">
                          {(comp.content.compareFields || []).map((row: any, rIdx: number) => (
                            <div key={rIdx} className="flex justify-between items-center bg-slate-900 p-1.5 rounded">
                              <span className="text-slate-400 font-bold">{row.feature}</span>
                              <div className="flex gap-4">
                                <span className="text-green-400">{comp.content.productA}: {row.valueA ? '✓' : '✗'}</span>
                                <span className="text-slate-500">Concorrência: {row.valueB ? '✓' : '✗'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {comp.type === 'faq' && (
                      <div className="p-3 border border-slate-800 rounded bg-slate-950 space-y-2 text-[11px]">
                        <h4 className="font-bold text-white mb-2">{comp.content.title}</h4>
                        {(comp.content.faqList || []).map((item: any, fIdx: number) => (
                          <div key={fIdx} className="border-b border-slate-900 pb-1.5 last:border-0">
                            <span className="font-bold text-green-400">Q: {item.question}</span>
                            <p className="text-slate-500">{item.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {comp.type === 'testimonials' && (
                      <div className="p-3 border border-slate-800 rounded bg-slate-950 space-y-2 text-[10px]">
                        <h4 className="font-bold text-white text-center mb-1">{comp.content.title}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {(comp.content.testimonialsList || []).map((t: any, tIdx: number) => (
                            <div key={tIdx} className="bg-slate-900 p-2 rounded">
                              <p className="italic text-slate-400">"{t.text}"</p>
                              <span className="block mt-1 font-bold text-right text-slate-200">- {t.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {comp.type === 'guarantee' && (
                      <div className="bg-green-950/20 border border-green-900 rounded-xl p-4 flex gap-3 text-xs">
                        <div className="p-1 px-1.5 bg-green-900/30 rounded text-green-400 flex items-center justify-center">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-green-400 mb-0.5">{comp.content.title}</h4>
                          <p className="text-slate-400 text-[11px] leading-relaxed">{comp.content.text}</p>
                        </div>
                      </div>
                    )}

                    {comp.type === 'button' && (
                      <div className="text-center py-2">
                        <div className="bg-green-400 text-slate-950 rounded-lg text-xs font-black tracking-wider py-3 px-6 uppercase shadow-lg shadow-green-950/25">
                          {comp.content.buttonText || "Vazio"}
                        </div>
                        <span className="block text-[9px] font-mono text-slate-550 mt-1.5 text-slate-400">Checkout redirect: {comp.content.buttonUrl}</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* 3. RIGHT SIDEBAR: FIELD EDIT DETAILS PANEL */}
      <div className="w-full lg:w-80 bg-slate-950 border-l border-slate-800 p-4 space-y-6 overflow-y-auto" id="editor-field-settings">
        
        <div className="flex items-center gap-2 pb-3 border-b border-slate-900">
          <Sliders className="text-green-400" size={16} />
          <h3 className="text-xs font-black tracking-wider uppercase font-mono text-slate-300">Configuração do Bloco</h3>
        </div>

        {selectedComp ? (
          <div className="space-y-4">
            <div className="p-2 border border-slate-800 bg-slate-900/30 rounded-lg text-[10px] text-slate-400">
              <span className="font-mono font-bold uppercase block text-white mb-0.5">Bloco ID:</span>
              <span className="font-mono truncate block">{selectedComp.id}</span>
            </div>

            {/* IF ENDPLAY IS HEADLINE */}
            {selectedComp.type === 'headline' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Logo da Marca (Scraped ou URL customizada)</label>
                  <input
                    type="text"
                    value={selectedComp.content.logo || ''}
                    onChange={(e) => handleUpdateContent('logo', e.target.value)}
                    placeholder="https://exemplo.com/logo.png"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-green-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Headline do Produto</label>
                  <textarea
                    rows={3}
                    value={selectedComp.content.title || ''}
                    onChange={(e) => handleUpdateContent('title', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white uppercase font-black focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Sub-Headline secundária</label>
                  <textarea
                    rows={4}
                    value={selectedComp.content.text || ''}
                    onChange={(e) => handleUpdateContent('text', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-300 leading-relaxed focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
            )}

            {/* IF TIMERS */}
            {selectedComp.type === 'timer' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Título de Urgência</label>
                  <input
                    type="text"
                    value={selectedComp.content.title || ''}
                    onChange={(e) => handleUpdateContent('title', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Minutos Restantes</label>
                  <input
                    type="number"
                    value={selectedComp.content.durationMinutes || 10}
                    onChange={(e) => handleUpdateContent('durationMinutes', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-green-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* IF LONG TEXT */}
            {selectedComp.type === 'text' && (
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Cópia do Storytelling (Markdown)</label>
                <textarea
                  rows={14}
                  value={selectedComp.content.text || ''}
                  onChange={(e) => handleUpdateContent('text', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-green-500 leading-relaxed"
                />
              </div>
            )}

            {/* IF VIDEOS */}
            {selectedComp.type === 'video' && (
              <div className="p-3.5 bg-red-950/20 border border-red-900/40 rounded-xl">
                <p className="text-[11px] text-red-400 font-bold leading-normal">
                  ⚠️ A Regra Global de Mídia do AdsCreator AI impede a utilização, edição ou exibição de conteúdos no formato de vídeo. Utilize apenas componentes de imagem e texto.
                </p>
              </div>
            )}

            {/* IF COMPONENT IMAGES */}
            {selectedComp.type === 'image' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Título da Galeria (se aplicável)</label>
                  <input
                    type="text"
                    value={selectedComp.content.title || ''}
                    onChange={(e) => handleUpdateContent('title', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">URL de Origem Principal (Única)</label>
                  <input
                    type="text"
                    value={selectedComp.content.src || ''}
                    onChange={(e) => handleUpdateContent('src', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-300 focus:outline-none focus:border-green-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Texto Alternativo (SEO)</label>
                  <input
                    type="text"
                    value={selectedComp.content.alt || ''}
                    onChange={(e) => handleUpdateContent('alt', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Grid de Imagens (URLs separadas por vírgula)</label>
                  <textarea
                    rows={4}
                    value={Array.isArray(selectedComp.content.images) ? selectedComp.content.images.join(",\n") : (selectedComp.content.images || '')}
                    onChange={(e) => {
                      const list = e.target.value.split(",").map(url => url.trim()).filter(Boolean);
                      handleUpdateContent('images', list.length > 0 ? list : undefined);
                    }}
                    placeholder="Cole as URLs das imagens dos produtos separadas por vírgulas..."
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-300 focus:outline-none focus:border-green-500 font-mono leading-normal"
                  />
                  <span className="text-[9px] text-slate-500 block leading-tight mt-1">
                    Se preenchido, renderizará todas as opções listadas em um grid elegante ao invés de apenas uma única imagem.
                  </span>
                </div>
              </div>
            )}

            {/* IF COMPARATIONS */}
            {selectedComp.type === 'compare' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Título da Seção</label>
                  <input
                    type="text"
                    value={selectedComp.content.title || ''}
                    onChange={(e) => handleUpdateContent('title', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Nome do Produto A</label>
                  <input
                    type="text"
                    value={selectedComp.content.productA || ''}
                    onChange={(e) => handleUpdateContent('productA', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Nome do Concorrente (Produto B)</label>
                  <input
                    type="text"
                    value={selectedComp.content.productB || ''}
                    onChange={(e) => handleUpdateContent('productB', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
            )}

            {/* IF GUARANTEE BLOCK */}
            {selectedComp.type === 'guarantee' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Título da Cobertura</label>
                  <input
                    type="text"
                    value={selectedComp.content.title || ''}
                    onChange={(e) => handleUpdateContent('title', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Cópia descritiva da Garantia</label>
                  <textarea
                    rows={4}
                    value={selectedComp.content.text || ''}
                    onChange={(e) => handleUpdateContent('text', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-300 focus:outline-none focus:border-green-500 leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* IF GENERAL CTA BUTTON */}
            {selectedComp.type === 'button' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Chamada de Texto do Botão (CTA)</label>
                  <input
                    type="text"
                    value={selectedComp.content.buttonText || ''}
                    onChange={(e) => handleUpdateContent('buttonText', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white uppercase font-black focus:outline-none focus:border-green-500 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase mb-1">Link de Redirecionamento (Checkout Afiliado)</label>
                  <input
                    type="text"
                    value={selectedComp.content.buttonUrl || ''}
                    onChange={(e) => handleUpdateContent('buttonUrl', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-300 focus:outline-none focus:border-green-500 font-mono"
                  />
                </div>
              </div>
            )}

          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-6 font-sans">
            Selecione qualquer bloco do editor para modificar os atributos em tempo real.
          </p>
        )}

      </div>

    </div>
  );
}
