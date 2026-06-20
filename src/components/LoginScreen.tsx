import React, { useState, useRef } from 'react';
import { User, Mail, Check, LogIn, Sparkles, Loader2, Upload, Lock, ShieldCheck, UserPlus } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (name: string, email: string, password: string, avatarUrl: string) => Promise<{ success: boolean; error?: string }>;
}

const PRESET_AVATARS = [
  {
    id: 'lady-hero',
    name: 'Gestora Premium',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'man-hero',
    name: 'Especialista de Tráfego',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'lady-marketing',
    name: 'Copywriter de Conversão',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'man-builder',
    name: 'Fundador da Agência',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'cute-3d-boy',
    name: 'Gestor Criativo',
    url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'cute-3d-girl',
    name: 'Gestora de Performance',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  }
];

export default function LoginScreen({ onLogin, onRegister }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Registration fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAvatarUrl, setRegAvatarUrl] = useState(PRESET_AVATARS[1].url);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('ribeiromoreira91@gmail.com');
  const [loginPassword, setLoginPassword] = useState('123');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Apenas arquivos de imagem são aceitos.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('A imagem de perfil deve ter menos que 2MB.');
      return;
    }
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setRegAvatarUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (activeTab === 'login') {
        if (!loginEmail.trim() || !loginPassword) {
          setErrorMessage('Preencha seu e-mail e sua senha de acesso.');
          setIsSubmitting(false);
          return;
        }
        const res = await onLogin(loginEmail, loginPassword);
        if (!res.success) {
          setErrorMessage(res.error || 'Erro ao efetuar login.');
        }
      } else {
        if (!regName.trim() || !regEmail.trim() || !regPassword) {
          setErrorMessage('Todos os campos cadastrais são obrigatórios.');
          setIsSubmitting(false);
          return;
        }
        if (regPassword.length < 3) {
          setErrorMessage('A senha deve conter no mínimo 3 caracteres.');
          setIsSubmitting(false);
          return;
        }
        const res = await onRegister(regName, regEmail, regPassword, regAvatarUrl);
        if (!res.success) {
          setErrorMessage(res.error || 'Erro ao efetuar cadastro.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Erro imprevisto de conexão ou requisição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-green-400 selection:text-slate-950 font-sans w-full">
      {/* Decorative background grid glow elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl relative z-10">
        
        {/* Banner with Brand name */}
        <div className="p-8 bg-gradient-to-b from-slate-950 to-slate-900/40 text-center relative border-b border-slate-800/60">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-green-500 to-emerald-600 p-[1px] shadow-xl justify-center items-center mb-4">
            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 text-lg font-mono">
              AD
            </div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            AdsCreator AI
          </h2>
          <p className="text-xs text-slate-400 mt-2 font-medium">Plataforma de Monitoramento & Sincronização Premium</p>
        </div>

        {/* TABS SELECTOR */}
        <div className="grid grid-cols-2 border-b border-slate-800/50 bg-slate-950/40 p-1.5 mx-8 mt-6 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
            }}
            className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 text-green-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <LogIn size={13} />
            Entrar / Login
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
            }}
            className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 text-green-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <UserPlus size={13} />
            Cadastrar Agência
          </button>
        </div>

        {/* Auth form */}
        <form onSubmit={handleFormSubmit} className="p-8 space-y-5">
          {errorMessage && (
            <div className="bg-red-950/40 border border-red-900/60 text-red-400 py-3 px-4 rounded-xl text-xs font-semibold text-center leading-relaxed">
              ⚠️ {errorMessage}
            </div>
          )}

          {activeTab === 'login' ? (
            <>
              {/* LOGIN MODE */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 mb-1.5">Endereço de E-mail</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-green-500 rounded-2xl py-3 px-4 pl-10 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
                    placeholder="Ex: ribeiromoreira91@gmail.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400">Senha de Acesso</label>
                </div>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-green-500 rounded-2xl py-3 px-4 pl-10 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none font-mono"
                    placeholder="Sua senha secreta"
                  />
                </div>
              </div>

              {/* DEMO ACCOUNT TIP */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/40 space-y-1.5">
                <p className="text-[11px] font-bold text-green-400 flex items-center gap-1.5">
                  <ShieldCheck size={13} />
                  Dica de Acesso Rápido
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                  E-mail: <span className="text-slate-200">ribeiromoreira91@gmail.com</span><br />
                  Senha: <span className="text-slate-200">123</span>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* REGISTER MODE */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 mb-1.5">Seu Nome Completo</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-green-500 rounded-2xl py-3 px-4 pl-10 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
                    placeholder="Ex: Afiliado Autoridade"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 mb-1.5">Endereço de E-mail</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-green-500 rounded-2xl py-3 px-4 pl-10 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
                    placeholder="Ex: ribeiromoreira91@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 mb-1.5">Definir Senha de Acesso</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-green-500 rounded-2xl py-3 px-4 pl-10 text-sm text-slate-100 placeholder:text-slate-650 focus:outline-none font-mono"
                    placeholder="Mínimo de 3 caracteres"
                  />
                </div>
              </div>

              {/* AVATAR SELECT */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 mb-2">Sua Foto de Perfil / Avatar</label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((av) => {
                    const isSelected = regAvatarUrl === av.url;
                    return (
                      <button
                        type="button"
                        key={av.id}
                        onClick={() => setRegAvatarUrl(av.url)}
                        className="relative group focus:outline-none focus:ring-1 focus:ring-green-400 rounded-full"
                        title={av.name}
                      >
                        <img
                          src={av.url}
                          alt={av.name}
                          className={`w-11 h-11 rounded-full object-cover transition-all ${
                            isSelected ? 'ring-2 ring-green-400 border-2 border-slate-950 scale-105' : 'opacity-60 hover:opacity-100 border border-slate-800'
                          }`}
                        />
                        {isSelected && (
                          <div className="absolute -bottom-1 -right-1 bg-green-400 text-slate-950 rounded-full p-[1px] border border-slate-900">
                            <Check size={8} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* UPLOAD FROM COMPUTER */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 mb-1.5">
                  Ou carregue imagem do computador
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-green-400 bg-green-950/20 text-white'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <Upload size={16} className={`mx-auto mb-1.5 transition-all ${isDragging ? 'text-green-400 scale-110' : 'text-slate-500'}`} />
                  <p className="text-xs font-bold">Arraste a foto aqui ou <span className="text-green-400 underline decoration-green-950 underline-offset-2">carregue do seu PC</span></p>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5 font-medium">PNG, JPG ou GIF (Tamanho Máximo: 2MB)</p>
                </div>
              </div>
            </>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-300 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider py-4 px-6 rounded-2xl shadow-xl shadow-green-999_custom border-0 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Processando solicitação...
              </>
            ) : activeTab === 'login' ? (
              <>
                <LogIn size={14} strokeWidth={2.5} />
                Entrar no Painel AdsCreator AI
              </>
            ) : (
              <>
                <UserPlus size={14} strokeWidth={2.5} />
                Criar Minha Conta e Acessar
              </>
            )}
          </button>
        </form>

        {/* Footer info lock */}
        <div className="p-4 bg-slate-950 text-center border-t border-slate-850">
          <p className="text-[10px] text-slate-600 font-medium">Ambiente Protegido por SSL com Encriptação AES-256</p>
        </div>
      </div>
    </div>
  );
}
