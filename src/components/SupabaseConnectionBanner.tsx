import React, { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, Copy, Check, RefreshCw, Terminal, ExternalLink } from 'lucide-react';

interface SupabaseConnectionBannerProps {
  status: {
    isChecked: boolean;
    success: boolean;
    message: string;
    code?: string;
  };
  onReverify: () => Promise<void>;
}

export default function SupabaseConnectionBanner({ status, onReverify }: SupabaseConnectionBannerProps) {
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const sqlScript = `-- ==========================================
-- SCRIPT SQL PARA O SQL EDITOR DO SUPABASE
-- ==========================================
-- Copie todo o código abaixo, cole no "SQL Editor" do seu painel do Supabase e clique em "Run".

-- 1. Criar Tabela de Perfis (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id bigserial PRIMARY KEY,
  name text,
  email text,
  plan_id text DEFAULT 'starter',
  pages_created_count integer DEFAULT 0,
  subdomain text,
  custom_domain text,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Criar Tabela de Páginas (pages)
CREATE TABLE IF NOT EXISTS public.pages (
  id text PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL,
  type text NOT NULL DEFAULT 'Landing Page',
  status text NOT NULL DEFAULT 'Publicada',
  original_url text,
  product_name text NOT NULL DEFAULT 'Produto',
  html_content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Ativar Row Level Security (RLS) para proteção contra acessos maliciosos do navegador
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- 4. Definir Políticas de Segurança (Row Level Security Policies)
-- Como as Páginas e Perfis do AdsCreator AI precisam ser lidos publicamente pelos visitantes,
-- liberamos o acesso de leitura para qualquer usuário de forma segura.
CREATE POLICY "Leitura pública de páginas" ON public.pages FOR SELECT USING (true);
CREATE POLICY "Leitura pública de perfis" ON public.profiles FOR SELECT USING (true);

-- Para escrita/modificação (INSERT, UPDATE, DELETE):
-- [OPÇÃO RECOMENDADA]: Ao definir 'SUPABASE_SERVICE_ROLE_KEY' no .env, o servidor do AdsCreator AI
-- ignora o RLS automaticamente. Isso permite remover as políticas de gravação abaixo para segurança absoluta.
-- [OPÇÃO DE COMPATIBILIDADE]: Libera gravação para a anon_key para facilitar testes iniciais locais.
CREATE POLICY "Gravação via API para páginas" ON public.pages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Gravação via API para perfis" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyClick = async () => {
    setIsVerifying(true);
    await onReverify();
    setIsVerifying(false);
  };

  if (!status.isChecked) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-3">
          <Database className="text-slate-500 animate-bounce" size={18} />
          <span className="text-xs text-slate-400 font-mono">Verificando conexão com o banco de dados Supabase...</span>
        </div>
      </div>
    );
  }

  // Case 1: Active Connection with tables created successfully (All Green)
  if (status.success && status.code === "SUCCESS") {
    return (
      <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in" id="supabase-status-connected">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-900 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 leading-none">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Supabase Completamente Ativo & Conectado!
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Todos os recursos de sincronização automática e tabelas estão prontos para persistência duradoura.
            </p>
          </div>
        </div>
        <button
          onClick={handleVerifyClick}
          disabled={isVerifying}
          className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 py-1.5 px-3.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={11} className={isVerifying ? 'animate-spin' : ''} />
          {isVerifying ? 'Testando...' : 'Re-testar'}
        </button>
      </div>
    );
  }

  // Case 2: Connection verified but tables missing (User needs to execute SQL)
  if (status.success && status.code === "TABLE_MISSING") {
    return (
      <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-5 space-y-4 animate-fade-in" id="supabase-status-missing-tables">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-500 shrink-0 mt-0.5 sm:mt-0">
              <AlertCircle size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-500 flex items-center gap-1.5 leading-none">
                Conexão Ok, mas as tabelas ainda não foram criadas!
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                O aplicativo conseguiu se conectar com sucesso ao seu projeto do Supabase! Contudo, o banco de dados está vazio. É necessário criar as tabelas <code className="text-amber-400 font-mono font-bold bg-slate-950 px-1 py-0.5 rounded">pages</code> e <code className="text-amber-400 font-mono font-bold bg-slate-950 px-1 py-0.5 rounded">profiles</code> para salvar os seus dados.
              </p>
            </div>
          </div>
          <button
            onClick={handleVerifyClick}
            disabled={isVerifying}
            className="bg-amber-950/60 hover:bg-amber-950 border border-amber-800 text-amber-400 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            <RefreshCw size={13} className={isVerifying ? 'animate-spin' : ''} />
            Verificar Novamente
          </button>
        </div>

        {/* SQL EDITOR ACTIONS EXPANDER */}
        <div className="bg-slate-950 rounded-2xl border border-slate-850 overflow-hidden">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-850 flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 flex items-center gap-2">
              <Terminal size={12} className="text-amber-500" />
              SQL EDITOR - SCRIPT DE MODELAGEM
            </span>
            <button
              onClick={handleCopy}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-350 hover:text-white py-1.5 px-3 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
              {copied ? 'Copiado!' : 'Copiar SQL'}
            </button>
          </div>
          <div className="p-4 overflow-x-auto max-h-56">
            <pre className="text-[11px] font-mono text-slate-300 leading-relaxed text-left select-all bg-transparent border-0 scrollbar-thin">
              {sqlScript}
            </pre>
          </div>
          <div className="bg-slate-900/60 px-4 py-3 border-t border-slate-850 flex flex-col md:flex-row items-center justify-between gap-3 text-left">
            <p className="text-[11px] text-slate-500">
              💡 Instalação em 2 segundos: Vá até o seu <span className="text-slate-300 font-semibold">Painel do Supabase</span> {`->`} <span className="text-slate-300 font-semibold">SQL Editor</span> {`->`} <span className="text-slate-300 font-semibold">New Query</span>, cole o código acima e execute.
            </p>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-green-400 hover:text-green-300 font-bold flex items-center gap-1 whitespace-nowrap"
            >
              Ir para o Supabase
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Error connecting (Invalid Credentials or Offline)
  return (
    <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-5 space-y-4 animate-fade-in" id="supabase-status-error">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-900 flex items-center justify-center text-rose-400 shrink-0 mt-0.5 sm:mt-0">
            <AlertCircle size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-400 flex items-center gap-1.5 leading-none">
              Ocorreu um erro ao conectar ao Supabase
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Não foi possível estabelecer contato com a instância do Supabase. Verifique se as variáveis de ambiente <code className="text-rose-400 font-mono font-bold bg-slate-950 px-1 py-0.5 rounded">SUPABASE_URL</code> e <code className="text-rose-400 font-mono font-bold bg-slate-950 px-1 py-0.5 rounded">SUPABASE_ANON_KEY</code> estão configuradas corretamente.
            </p>
          </div>
        </div>
        <button
          onClick={handleVerifyClick}
          disabled={isVerifying}
          className="bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-400 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center"
        >
          <RefreshCw size={13} className={isVerifying ? 'animate-spin' : ''} />
          Tentar Novamente
        </button>
      </div>

      <div className="bg-slate-950 p-4 rounded-xl border border-rose-950/40 text-left font-mono text-[11px] text-rose-350">
        <span className="font-bold uppercase tracking-wider text-rose-400 block mb-1">Painel Técnico de Diagnóstico:</span>
        {status.message}
      </div>
    </div>
  );
}
