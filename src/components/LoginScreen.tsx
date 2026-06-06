import React, { useState, useRef } from 'react';
import { User, Mail, Check, LogIn, Sparkles, Loader2, Upload } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (name: string, email: string, avatarUrl: string) => Promise<boolean>;
}

const PRESET_AVATARS = [
  {
    id: 'lady-hero',
    name: 'Growth Woman',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'man-hero',
    name: 'Traffic Specialist',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'lady-marketing',
    name: 'Conversion Expert',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'man-builder',
    name: 'SaaS Founder',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'cute-3d-boy',
    name: 'Creative Boy',
    url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'cute-3d-girl',
    name: 'Creative Girl',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  }
];

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [name, setName] = useState('Afiliado Autoridade');
  const [email, setEmail] = useState('ribeiromoreira91@gmail.com');
  const [avatarUrl, setAvatarUrl] = useState(PRESET_AVATARS[0].url);
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
        setAvatarUrl(event.target.result as string);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErrorMessage('Nome completo e E-mail são obrigatórios.');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const success = await onLogin(name, email, avatarUrl);
      if (!success) {
        setErrorMessage('Não foi possível conectar a conta. Verifique sua rede e tente novamente.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Erro imprevisto de conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-green-400 selection:text-slate-950 font-sans">
      {/* Decorative background grid glow elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative z-10">
        
        {/* Banner with Brand name */}
        <div className="p-8 bg-gradient-to-b from-slate-955/80 to-slate-900 text-center relative border-b border-slate-850">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-green-500 to-blue-600 p-[1px] shadow-xl justify-center items-center mb-4">
            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400 text-lg font-mono">
              AD
            </div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            AdsCreator AI
            <span className="text-[10px] bg-green-950 text-green-400 border border-green-900 rounded px-2 py-0.5 uppercase tracking-widest font-mono font-black">LOGIN</span>
          </h2>
          <p className="text-xs text-slate-400 mt-2 font-medium">Instale a sincronização de campanhas e pixels de forma unificada.</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {errorMessage && (
            <div className="bg-red-950/40 border border-red-900 text-red-400 py-3 px-4 rounded-xl text-xs font-semibold text-center">
              {errorMessage}
            </div>
          )}

          {/* NAME FIELD */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 mb-1.5">Seu Nome Completo</label>
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-green-500 rounded-2xl py-3 px-4 pl-10 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
                placeholder="Ex: Afiliado Autoridade"
              />
            </div>
          </div>

          {/* EMAIL FIELD */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 mb-1.5">Endereço de E-mail</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-green-500 rounded-2xl py-3 px-4 pl-10 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
                placeholder="Ex: ribeiromoreira91@gmail.com"
              />
            </div>
          </div>

          {/* AVATAR SELECT */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 mb-2">Sua Foto de Perfil / Avatar</label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_AVATARS.map((av) => {
                const isSelected = avatarUrl === av.url;
                return (
                  <button
                    type="button"
                    key={av.id}
                    onClick={() => setAvatarUrl(av.url)}
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
              Ou faça upload do computador
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
              <p className="text-[10px] font-mono text-slate-500 mt-0.5 font-medium">JPG, PNG ou GIF (Tamanho Máximo: 2MB)</p>
            </div>
          </div>

          {/* CUSTOM PHOTO FIELD */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 mb-1.5">Ou URL de Foto Personalizada</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-green-500 rounded-2xl py-2 px-4 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none font-mono"
              placeholder="Cole link de imagem próprio do Facebook ou Instagram"
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-300 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider py-4 px-6 rounded-2xl shadow-xl shadow-green-950/20 border-0 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Carregando Sessão...
              </>
            ) : (
              <>
                <LogIn size={14} strokeWidth={2.5} />
                Conectar Conta AdsCreator AI
              </>
            )}
          </button>
        </form>

        {/* Footer info lock */}
        <div className="p-4 bg-slate-950 text-center border-t border-slate-850">
          <p className="text-[10px] text-slate-600 font-medium">Sincronização SSL Segura e Encriptação de API local</p>
        </div>
      </div>
    </div>
  );
}
