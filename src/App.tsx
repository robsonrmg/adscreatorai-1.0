import React, { useState, useEffect } from 'react';
import { Page, ClientProfile, PixelIntegrations, LogEntry, PageComponent } from './types';
import AnalyticsSummary from './components/AnalyticsSummary';
import PlansModal from './components/PlansModal';
import AIPageSetup from './components/AIPageSetup';
import EditorWorkspace from './components/EditorWorkspace';
import ActivityLogPanel from './components/ActivityLogPanel';
import UserProfileDropdown from './components/UserProfileDropdown';
import LoginScreen from './components/LoginScreen';
import { checkConnection } from './lib/supabase';
import {
  Globe,
  Plus,
  Sparkles,
  Copy,
  CopyCheck,
  ExternalLink,
  Edit2,
  Trash2,
  Settings,
  CreditCard,
  Target,
  ChevronRight,
  Loader2,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Sliders,
  Sparkle,
  Download,
  LogIn,
  Lock,
  ShieldAlert,
  Upload
} from 'lucide-react';

export default function App() {
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [pixels, setPixels] = useState<PixelIntegrations | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('ads_is_logged_in') === 'true';
  });
  
  const [activeTab, setActiveTab] = useState<'pages' | 'plans'>('pages');
  const [viewingWorkOrderId, setViewingWorkOrderId] = useState<string | null>(null); // For active Editor Workspace
  const [isCreatingNew, setIsCreatingNew] = useState(false); // For AI creation wizard

  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [globalLanguage, setGlobalLanguage] = useState<'pt' | 'en' | 'es' | 'it'>(() => {
    const saved = localStorage.getItem('ads_global_lang');
    return (saved === 'pt' || saved === 'en' || saved === 'es' || saved === 'it') ? saved : 'pt';
  });

  const [supabaseStatus, setSupabaseStatus] = useState<{
    isChecked: boolean;
    success: boolean;
    message: string;
    code?: string;
  }>({
    isChecked: false,
    success: false,
    message: "Verificando conexão..."
  });

  const [copiedSql, setCopiedSql] = useState(false);

  // Pagination & Sorting (10 pages per block, newest first)
  const itemsPerPage = 10;
  const sortedPages = React.useMemo(() => {
    return [...pages].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [pages]);

  const totalPages = Math.ceil(sortedPages.length / itemsPerPage);
  const activePage = Math.min(Math.max(1, currentPage), totalPages || 1);
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedPages = React.useMemo(() => {
    return sortedPages.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedPages, startIndex]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [pages.length]);

  React.useEffect(() => {
    if (pages && pages.length > 0) {
      localStorage.setItem('ads_pages_backup', JSON.stringify(pages));
    } else if (pages && pages.length === 0 && !isLoading) {
      localStorage.setItem('ads_pages_backup', JSON.stringify([]));
    }
  }, [pages, isLoading]);

  const handleGlobalLanguageChange = (lang: 'pt' | 'en' | 'es' | 'it') => {
    setGlobalLanguage(lang);
    localStorage.setItem('ads_global_lang', lang);
    triggerToast(`Idioma padrão alterado para: ${lang === 'pt' ? 'Português 🇧🇷' : lang === 'en' ? 'English 🇺🇸' : lang === 'es' ? 'Español 🇪🇸' : 'Italiano 🇮🇹'}`);
  };

  // Synchronize dynamic databases on loading and mounts
  const fetchData = async () => {
    try {
      try {
        const pRes = await fetch('/api/pages');
        if (pRes.ok) {
          const fetchedPages = await pRes.json();
          setPages(fetchedPages);

          // Auto-recovery backup pages list from localStorage if server db is vacant or wiped
          const backupStr = localStorage.getItem('ads_pages_backup');
          if ((!fetchedPages || fetchedPages.length === 0) && backupStr) {
            try {
              const backupPages = JSON.parse(backupStr);
              if (Array.isArray(backupPages) && backupPages.length > 0) {
                console.log("[Auto-Sync] Restaurando páginas salvas em cache local...");
                for (const bkPage of backupPages) {
                  await fetch('/api/pages/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pageData: bkPage })
                  });
                }
                const refetchRes = await fetch('/api/pages');
                if (refetchRes.ok) {
                  setPages(await refetchRes.json());
                  triggerToast("Suas páginas criadas foram restauradas do navegador com sucesso!");
                }
              }
            } catch (backupErr) {
              console.error("Erro restaurando backup local:", backupErr);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar paginas:", err);
      }

      try {
        const profRes = await fetch('/api/profile');
        if (profRes.ok) {
          setProfile(await profRes.json());
        } else {
          setProfile({
            name: "Afiliado Autoridade",
            email: "ribeiromoreira91@gmail.com",
            planId: "starter",
            pagesCreatedCount: 0,
            subdomain: "ribeiros-ads.adscreator.ai"
          });
        }
      } catch (err) {
        console.error("Erro ao carregar perfil, usando padrao:", err);
        setProfile({
          name: "Afiliado Autoridade",
          email: "ribeiromoreira91@gmail.com",
          planId: "starter",
          pagesCreatedCount: 0,
          subdomain: "ribeiros-ads.adscreator.ai"
        });
      }

      try {
        const pixRes = await fetch('/api/integrations');
        if (pixRes.ok) {
          setPixels(await pixRes.json());
        } else {
          setPixels({});
        }
      } catch (err) {
        console.error("Erro ao carregar pixel settings:", err);
        setPixels({});
      }

      try {
        const logRes = await fetch('/api/logs');
        if (logRes.ok) setLogs(await logRes.json());
      } catch (err) {
        console.error("Erro ao carregar logs:", err);
      }
    } catch (e) {
      console.error("Erro de sincronização de dados fullstack: ", e);
    } finally {
      setIsLoading(false);
    }
  };

  const verifySupabase = async () => {
    try {
      const res = await checkConnection();
      setSupabaseStatus({
        isChecked: true,
        success: res.success,
        message: res.message,
        code: res.code
      });
    } catch (err: any) {
      setSupabaseStatus({
        isChecked: true,
        success: false,
        message: err.message || String(err),
        code: "UNEXPECTED_ERROR"
      });
    }
  };

  useEffect(() => {
    fetchData();
    verifySupabase();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Update active plan
  const handleUpdatePlan = async (planId: 'starter' | 'pro' | 'unlimited') => {
    try {
      const res = await fetch('/api/profile/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      if (res.ok) {
        setProfile(await res.json());
        triggerToast(`Plano alterado para ${planId.toUpperCase()} com sucesso!`);
        fetchData(); // reload log events
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Update subdomain and domain options
  const handleUpdateDomains = async (subdomain: string, customDomain?: string) => {
    try {
      const res = await fetch('/api/profile/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain, customDomain }),
      });
      if (res.ok) {
        setProfile(await res.json());
        triggerToast("Informações de domínio atualizadas!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Save Facebook track pixels metadata
  const handleUpdatePixels = async (updatedPixels: PixelIntegrations) => {
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPixels),
      });
      if (res.ok) {
        setPixels(await res.json());
        triggerToast("Configurações de pixels salvas!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3.5. Update profile details
  const handleUpdateProfile = async (name: string, email: string, avatarUrl: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, avatarUrl }),
      });
      if (res.ok) {
        setProfile(await res.json());
        triggerToast("Perfil atualizado com sucesso!");
        fetchData();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.setItem('ads_is_logged_in', 'false');
    setIsLoggedIn(false);
    triggerToast("Você desconectou da sua conta.");
  };

  const handleLogin = async (name: string, email: string, avatarUrl: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, avatarUrl }),
      });
      if (res.ok) {
        setProfile(await res.json());
        localStorage.setItem('ads_is_logged_in', 'true');
        setIsLoggedIn(true);
        triggerToast(`Sessão iniciada com sucesso, ${name}!`);
        fetchData();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleHeaderLogin = async (email: string, password?: string) => {
    if (!email || !email.includes('@')) {
      triggerToast("Por favor, insira um e-mail válido!");
      return;
    }
    if (password && password.length < 4) {
      triggerToast("A senha deve ter pelo menos 4 caracteres!");
      return;
    }
    const nameFromEmail = email.split('@')[0];
    const capitalizedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
    
    const success = await handleLogin(capitalizedName, email, "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80");
    if (success) {
      triggerToast(`Painel acessado com sucesso!`);
    } else {
      triggerToast("Erro ao efetuar login. Tente novamente.");
    }
  };

  // 4. Duplicate page
  const handleDuplicatePage = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/pages/${id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        triggerToast("Página duplicada com sucesso!");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao duplicar página.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Delete specific page
  const handleDeletePage = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Deseja realmente remover esta página gerada? Esta ação é irreversível.")) return;
    try {
      const res = await fetch(`/api/pages/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerToast("Página removida com sucesso.");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportHtml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        let pageData: any = null;

        if (text.trim().startsWith('{')) {
          pageData = JSON.parse(text);
        } else {
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, 'text/html');
          const scriptEl = doc.getElementById('adscreator-backup-data');
          if (scriptEl && scriptEl.textContent) {
            pageData = JSON.parse(scriptEl.textContent);
          }
        }

        if (!pageData || !pageData.components || !pageData.slug) {
          triggerToast("Não foi possível localizar os dados de restauração AdsCreator neste arquivo HTML.");
          return;
        }

        const res = await fetch('/api/pages/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageData }),
        });

        if (res.ok) {
          triggerToast(`Página "${pageData.title}" importada e restaurada com sucesso!`);
          fetchData();
        } else {
          const errData = await res.json();
          triggerToast(errData.error || "Erro ao salvar a página importada.");
        }
      } catch (err: any) {
        console.error("Erro na importação:", err);
        triggerToast("Falha técnica ao tentar ler o arquivo importado.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 6. Save visual builder updates on component list
  const handleSaveEditor = async (id: string, updatedComponents: PageComponent[]) => {
    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ components: updatedComponents }),
      });
      if (res.ok) {
        triggerToast("Modificações salvas!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyUrl = (slug: string, id: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    triggerToast("URL copiada com sucesso.");
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-300">
        <Loader2 className="text-green-400 animate-spin" size={32} />
        <span className="font-mono text-xs tracking-widest uppercase">Inicializando AdsCreator AI...</span>
      </div>
    );
  }

  // Active editor rendering logic
  if (viewingWorkOrderId && isLoggedIn) {
    const editPageInstance = pages.find((p) => p.id === viewingWorkOrderId);
    if (editPageInstance) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
          <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-white tracking-tight">AdsCreator AI</span>
              <span className="text-xs bg-slate-850 text-slate-400 border border-slate-800 rounded px-2.5 py-0.5 font-mono">
                Editor Visual
              </span>
            </div>
            <span className="text-xs text-slate-400">Editando página: <strong>{editPageInstance.title}</strong></span>
          </nav>
          <div className="flex-1">
            <EditorWorkspace
              page={editPageInstance}
              onBack={() => setViewingWorkOrderId(null)}
              onSave={handleSaveEditor}
            />
          </div>
        </div>
      );
    }
  }

  // Active AI generation wizard rendering logic
  if (isCreatingNew && isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-lg font-black text-white tracking-tight">AdsCreator AI</span>
            <span className="text-xs text-slate-400 font-mono tracking-wider">CREATOR WORKFLOW</span>
          </div>
        </nav>
        <div className="flex-1 py-8 px-6 overflow-y-auto">
          <AIPageSetup
            globalLanguage={globalLanguage}
            userPlanId={profile?.planId || 'starter'}
            onBack={() => {
              setIsCreatingNew(false);
              fetchData();
            }}
            onPageCreated={(newPage) => {
              fetchData();
            }}
            onEditPage={(pageId) => {
              setIsCreatingNew(false);
              setViewingWorkOrderId(pageId);
              fetchData();
            }}
          />
        </div>
      </div>
    );
  }

  // Left Limits tracking
  const limit = profile?.planId === 'starter' ? 10 : profile?.planId === 'pro' ? 50 : 999999;
  const currentCount = pages.length;
  const limitReached = currentCount >= limit;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-green-400 selection:text-slate-950">
      
      {/* GLOBAL TOAST NOTIFICATION CARD */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-green-500/50 text-white rounded-xl py-3 px-5 shadow-2xl flex items-center gap-3 z-50 animate-fade-in font-sans max-w-sm">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* TOP DECORATIVE RAIL HEADER */}
      <nav className="bg-slate-955/40 backdrop-blur border-b border-slate-900 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-green-500 to-blue-600 p-[1px] shadow-lg shadow-green-950/20">
              <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400 text-sm font-mono leading-none">
                AD
              </div>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5 leading-none">
                AdsCreator AI
                <span className="text-[9px] bg-green-950 text-green-400 border border-green-800 rounded px-1.5 py-0.5 uppercase tracking-widest font-mono font-black">V1.0</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-sans font-medium mt-1">Gerador Automático de Presell & Review para Afiliados</p>
            </div>
          </div>

          {/* Quick Header Stats */}
          <div className="flex items-center gap-6">
            
            {!isLoggedIn ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const emailInput = form.elements.namedItem('headerEmail') as HTMLInputElement;
                const passwordInput = form.elements.namedItem('headerPassword') as HTMLInputElement;
                handleHeaderLogin(emailInput.value, passwordInput.value);
              }} className="flex flex-col sm:flex-row items-center gap-2 bg-slate-900 border border-slate-800 p-2 sm:p-2 sm:py-1.5 sm:px-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <input
                    name="headerEmail"
                    type="email"
                    required
                    placeholder="Login / E-mail"
                    className="bg-slate-950 border border-slate-800 focus:border-green-500 rounded-lg py-1 px-2.5 text-[11px] text-white placeholder:text-slate-500 focus:outline-none w-36 sm:w-44 font-sans"
                  />
                  <input
                    name="headerPassword"
                    type="password"
                    required
                    placeholder="Senha"
                    className="bg-slate-950 border border-slate-800 focus:border-green-500 rounded-lg py-1 px-2.5 text-[11px] text-white placeholder:text-slate-500 focus:outline-none w-24 sm:w-28 font-sans"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-300 hover:to-emerald-400 text-slate-950 font-black px-3.5 py-1 rounded-lg text-[11px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border-0 w-full sm:w-auto justify-center font-sans shadow shadow-green-950/20"
                >
                  <LogIn size={11} strokeWidth={3} />
                  Entrar
                </button>
              </form>
            ) : (
              <>
                {/* Active profile limit status tracker on header */}
                <div className="hidden md:flex flex-col items-end text-right">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Limites de Páginas</span>
                  <span className="text-xs font-bold text-slate-200 mt-0.5">
                    {currentCount} / <span className="text-slate-400 font-semibold">{limit === 999999 ? 'Ilimitado' : `${limit} un.`}</span>
                  </span>
                  <div className="w-24 bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${limitReached ? 'bg-red-500' : 'bg-green-400'}`}
                      style={{ width: `${Math.min(100, Math.round((currentCount / limit) * 100))}%` }}
                    ></div>
                  </div>
                </div>

                {/* Plan Badge toggles tab */}
                <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('pages')}
                    className={`py-1.5 px-4 rounded-md transition-all cursor-pointer ${
                      activeTab === 'pages' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Páginas
                  </button>
                  <button
                    onClick={() => setActiveTab('plans')}
                    className={`py-1.5 px-4 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'plans' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <CreditCard size={12} />
                    Plano & Domínios
                  </button>
                </div>

                {/* Profile Dropdown with picture upload / logout option */}
                {profile && (
                  <UserProfileDropdown
                    profile={profile}
                    onUpdateProfile={handleUpdateProfile}
                    onLogout={handleLogout}
                  />
                )}
              </>
            )}

          </div>

        </div>
      </nav>

      {/* DASHBOARD CONTENT BOUNDS */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10 relative">
        
        {!isLoggedIn && (
          <div className="absolute inset-x-0 top-0 bottom-0 bg-slate-955/95 backdrop-blur-lg rounded-2xl flex flex-col items-center justify-center text-center p-6 sm:p-8 z-30 border border-slate-900/60 shadow-2xl min-h-[500px]">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-green-500 to-emerald-600 p-[1px] shadow-lg shadow-green-950/20 mb-4 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center text-green-400">
                <Lock size={20} />
              </div>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="text-amber-500" size={18} />
              Acesso Restrito / Painel Bloqueado
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mt-2 font-medium leading-relaxed font-sans">
              Insira as suas credenciais no formulário integrado abaixo ou no painel superior direito para liberar o AdsCreator AI.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const emailInput = form.elements.namedItem('mainEmail') as HTMLInputElement;
              const passwordInput = form.elements.namedItem('mainPassword') as HTMLInputElement;
              handleHeaderLogin(emailInput.value, passwordInput.value);
            }} className="mt-6 w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
              <div className="space-y-3">
                <div className="text-left">
                  <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400">Usuário / E-mail</label>
                  <input
                    name="mainEmail"
                    type="email"
                    required
                    placeholder="Ex: ribeiromoreira91@gmail.com"
                    defaultValue="ribeiromoreira91@gmail.com"
                    className="w-full bg-slate-955 border border-slate-800 focus:border-green-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-slate-600 focus:outline-none mt-1 font-sans"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400">Senha de Acesso</label>
                  <input
                    name="mainPassword"
                    type="password"
                    required
                    placeholder="Digite sua senha de acesso"
                    className="w-full bg-slate-955 border border-slate-800 focus:border-green-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-slate-600 focus:outline-none mt-1 font-sans"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-300 hover:to-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-0 shadow shadow-green-950/20"
              >
                <LogIn size={13} strokeWidth={2.5} />
                Entrar no Painel
              </button>
            </form>
          </div>
        )}
        
        {activeTab === 'pages' && (
          <div className="space-y-10">
            
            {/* ANALYTICS SUMMARY PANEL */}
            <AnalyticsSummary pages={pages} />

            {/* ACTION TRIGGERS & PAGES DATA TABLE */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Layers className="text-green-400" size={18} />
                    Suas Páginas Publicadas
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Visão geral sobre mídias reviews, presells e landing pages configuradas.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <label className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-black tracking-wider uppercase text-xs py-3 px-5 rounded-xl border border-slate-700 cursor-pointer w-full sm:w-auto text-center font-sans tracking-wide">
                    <Upload size={14} className="text-green-400" />
                    Importar do HTML
                    <input
                      type="file"
                      accept=".html"
                      onChange={handleImportHtml}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={() => setIsCreatingNew(true)}
                    className="flex items-center gap-2 bg-green-400 hover:bg-green-300 text-slate-950 font-black tracking-wider uppercase text-xs py-3 px-6 rounded-xl shadow-lg shadow-green-950/25 border-0 cursor-pointer w-full sm:w-auto justify-center font-sans"
                  >
                    <Plus size={14} />
                    Criar com um Clique
                  </button>
                </div>
              </div>

              {/* TABLE CONTAINER CARD */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl" id="pages-table">
                {pages.length === 0 ? (
                  <div className="text-center py-16 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500 animate-pulse">
                      <Sparkles size={20} />
                    </div>
                    <div className="space-y-1 max-w-sm mx-auto">
                      <h3 className="text-sm font-bold text-white">Nenhuma Página Criada</h3>
                      <p className="text-xs text-slate-500">Insira a URL de um produto de afiliado para que nossa Inteligência Artificial comece a redigir toda a lente automaticamente.</p>
                    </div>
                    <button
                      onClick={() => setIsCreatingNew(true)}
                      className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 px-5 rounded-lg border-0 transition-all cursor-pointer"
                    >
                      Criar Página Agora
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-450 border-b border-slate-800 font-mono tracking-wider text-slate-400">
                          <th className="py-4 px-6 font-bold uppercase">Produto / Nome</th>
                          <th className="py-4 px-6 font-bold uppercase">Formato</th>
                          <th className="py-4 px-6 font-bold uppercase">Data de Criação</th>
                          <th className="py-4 px-6 font-bold uppercase">Status</th>
                          <th className="py-4 px-6 font-bold uppercase text-center">Cliques / Views</th>
                          <th className="py-4 px-6 font-bold uppercase text-center">CTR</th>
                          <th className="py-4 px-6 font-bold uppercase text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {paginatedPages.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-850/20 transition-all group">
                            
                            {/* Product Title / Link placeholder */}
                            <td className="py-4 px-6">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-200 text-sm group-hover:text-green-400 transition-colors block leading-tight">
                                  {p.productName}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono block truncate max-w-[200px]">
                                  {p.title}
                                </span>
                              </div>
                            </td>

                            {/* Format Page Type */}
                            <td className="py-4 px-6 font-mono font-semibold text-slate-400">
                              <span className="inline-block px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-300">
                                {p.type}
                              </span>
                            </td>

                            {/* Format Date */}
                            <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">
                              {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                            </td>

                            {/* Published Status Label */}
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-green-400 bg-green-950/40 border border-green-900">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                {p.status}
                              </span>
                            </td>

                            {/* Views / Clicks */}
                            <td className="py-4 px-6 text-center font-mono text-[11px] text-slate-350">
                              <span className="text-white font-bold">{p.clicks}</span> / {p.views}
                            </td>

                            {/* CTR */}
                            <td className="py-4 px-6 text-center font-mono">
                              <span className={`font-black text-sm ${p.ctr >= 15 ? 'text-green-400' : p.ctr >= 8 ? 'text-amber-500' : 'text-slate-400'}`}>
                                {p.ctr}%
                              </span>
                            </td>

                            {/* Row Action Operations */}
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                
                                {/* Copy URL */}
                                <button
                                  type="button"
                                  onClick={() => handleCopyUrl(p.slug, p.id)}
                                  title="Copiar URL Publicada"
                                  className="p-2 border border-slate-800 bg-slate-950 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-green-400 transition-all cursor-pointer"
                                >
                                  {copiedId === p.id ? <CopyCheck size={14} className="text-green-400" /> : <Copy size={14} />}
                                </button>

                                {/* Open Preview */}
                                <a
                                  href={`/p/${p.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Abrir Página Publicada"
                                  className="p-2 border border-slate-800 bg-slate-950 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                                >
                                  <ExternalLink size={14} />
                                </a>

                                {/* Baixar HTML */}
                                <a
                                  href={`/api/pages/${p.id}/download`}
                                  download={`index-${p.slug}.html`}
                                  title="Baixar HTML Estático"
                                  className="p-2 border border-slate-800 bg-slate-950 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-green-455 hover:text-green-400 transition-all flex items-center justify-center cursor-pointer"
                                >
                                  <Download size={14} />
                                </a>

                                {/* Edit visual */}
                                <button
                                  type="button"
                                  onClick={() => setViewingWorkOrderId(p.id)}
                                  title="Editar Páginas no Construtor"
                                  className="p-2 border border-slate-800 bg-slate-950 hover:bg-slate-900 rounded-lg text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                                >
                                  <Edit2 size={14} />
                                </button>

                                {/* Duplicate */}
                                <button
                                  type="button"
                                  onClick={(e) => handleDuplicatePage(p.id, e)}
                                  title="Duplicar Modelo"
                                  className="p-2 border border-slate-800 bg-slate-950 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                                >
                                  <Layers size={14} />
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={(e) => handleDeletePage(p.id, e)}
                                  title="Excluir Página da Lista"
                                  className="p-2 border border-slate-800 bg-slate-950 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-red-400 hover:border-red-950 transition-all cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>

                              </div>
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINATION CONTROLS */}
                  {totalPages > 1 && (
                    <div className="bg-slate-950 border-t border-slate-800/50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-[11px] text-slate-400 font-mono">
                        Exibindo <span className="text-white font-bold">{Math.min(startIndex + 1, sortedPages.length)}</span> até <span className="text-white font-bold">{Math.min(startIndex + itemsPerPage, sortedPages.length)}</span> de <span className="text-green-400 font-bold">{sortedPages.length}</span> páginas
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={activePage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className="px-3 py-1.5 text-[11px] font-bold font-mono border border-slate-850 bg-slate-900 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer transition-all flex items-center gap-1"
                        >
                          &larr; Anterior
                        </button>

                        {Array.from({ length: totalPages }).map((_, i) => {
                          const pageNum = i + 1;
                          const isNear = Math.abs(pageNum - activePage) <= 1 || pageNum === 1 || pageNum === totalPages;
                          
                          if (!isNear) {
                            if (pageNum === 2 || pageNum === totalPages - 1) {
                              return <span key={pageNum} className="text-slate-600 px-0.5 font-mono text-xs">...</span>;
                            }
                            return null;
                          }

                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer ${
                                activePage === pageNum 
                                  ? 'bg-green-400 text-slate-950 shadow-md shadow-green-950/40 font-black' 
                                  : 'border border-slate-850 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          disabled={activePage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className="px-3 py-1.5 text-[11px] font-bold font-mono border border-slate-850 bg-slate-900 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer transition-all flex items-center gap-1"
                        >
                          Próxima &rarr;
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
              </div>
            </div>

            {/* LIVE FEED SERVER LOGGER PANEL */}
            <ActivityLogPanel logs={logs} />

          </div>
        )}

        {/* PLANS SETTINGS TAB */}
        {activeTab === 'plans' && profile && pixels && (
          <div className="bg-slate-900/10 border border-slate-900 p-6 md:p-8 rounded-2xl">
            <PlansModal
              profile={profile}
              pixelSettings={pixels}
              onUpdatePlan={handleUpdatePlan}
              onUpdateDomains={handleUpdateDomains}
              onUpdatePixels={handleUpdatePixels}
            />
          </div>
        )}

      </main>

      {/* FOOTER ACCENTS */}
      <footer className="py-12 border-t border-slate-900 text-center text-slate-600 text-xs mt-12 bg-slate-955/20 max-w-7xl mx-auto px-6">
        <p>Copyright &copy; 2026 AdsCreator AI. Editor Visual & Copie Avançada de Venda por IA Integrados.</p>
        <p className="font-mono text-[10px] text-slate-700 mt-2">Active Node: Sandbox Ingress Router Port 3000</p>
      </footer>

    </div>
  );
}
