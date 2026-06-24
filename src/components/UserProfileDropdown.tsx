import React, { useState, useRef, useEffect } from 'react';
import { ClientProfile } from '../types';
import { User, Mail, LogOut, Check, Camera, Loader2, ChevronDown, Sliders, Upload } from 'lucide-react';

interface UserProfileDropdownProps {
  profile: ClientProfile;
  onUpdateProfile: (name: string, email: string, avatarUrl: string) => Promise<boolean>;
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

export default function UserProfileDropdown({ profile, onUpdateProfile }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || PRESET_AVATARS[0].url);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastFeedback, setToastFeedback] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
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
      showFeedback('Apenas arquivos de imagem!');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showFeedback('A imagem precisa ser menor que 2MB!');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result as string);
        showFeedback('Imagem de perfil carregada!');
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

  // Default avatar if none
  const currentAvatar = profile.avatarUrl || PRESET_AVATARS[0].url;

  // Handle outside click to close dropdown safely
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditing(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update component states if profile updates externally
  useEffect(() => {
    setName(profile.name);
    setEmail(profile.email);
    if (profile.avatarUrl) {
      setAvatarUrl(profile.avatarUrl);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showFeedback('Nome e e-mail são obrigatórios!');
      return;
    }
    setIsUpdating(true);
    const success = await onUpdateProfile(name, email, avatarUrl);
    setIsUpdating(false);
    if (success) {
      showFeedback('Perfil atualizado!');
      setTimeout(() => {
        setIsEditing(false);
      }, 800);
    } else {
      showFeedback('Erro ao salvar as alterações.');
    }
  };

  const showFeedback = (msg: string) => {
    setToastFeedback(msg);
    setTimeout(() => setToastFeedback(null), 2500);
  };

  const activePlanBadge = () => {
    switch (profile.planId) {
      case 'unlimited':
        return { label: 'Unlimited VIP', style: 'bg-emerald-950 text-emerald-400 border-emerald-800' };
      case 'pro':
        return { label: 'Pro Copywriter', style: 'bg-indigo-950 text-indigo-400 border-indigo-800' };
      default:
        return { label: 'Starter AI', style: 'bg-blue-950 text-blue-400 border-blue-800' };
    }
  };

  const badge = activePlanBadge();

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} id="profile-dropdown-container">
      {/* TRIGGER AVATAR BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-green-400 cursor-pointer text-left"
        title="Menu de Perfil do usuário"
        id="profile-toggle-button"
      >
        <div className="relative">
          <img
            src={currentAvatar}
            alt={profile.name}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full border-2 border-slate-800 hover:border-green-400 object-cover shadow-md transition-all duration-300"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-950"></div>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform hidden sm:inline-block ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* DROPDOWN BOX */}
      {isOpen && (
        <div className="absolute right-0 mt-3.5 w-80 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden animate-fade-in font-sans">
          {/* USER QUICK DETAILS */}
          <div className="p-4 bg-slate-950/60 border-b border-slate-850">
            <div className="flex items-center gap-3">
              <img
                src={currentAvatar}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover border border-slate-800"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate font-medium">{profile.name}</h4>
                <p className="text-[11px] text-slate-500 truncate font-mono">{profile.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`text-[9px] px-2 py-0.5 rounded border uppercase tracking-wider font-extrabold ${badge.style}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC VIEW FOR EDIT VS MENU ACTIONS */}
          <div className="p-4 space-y-4">
            {toastFeedback && (
              <div className="text-center text-[11px] font-bold font-mono tracking-wide py-1.5 px-3 rounded bg-slate-950 text-green-400 border border-green-950">
                {toastFeedback}
              </div>
            )}

            {!isEditing ? (
              <div className="space-y-3">
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full flex items-center gap-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl py-3 px-4 text-xs font-bold transition-all border border-slate-800 cursor-pointer"
                >
                  <Camera size={14} className="text-green-400" />
                  Visualizar e Alterar Imagem / Dados
                </button>

                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 justify-center">
                  <Sliders size={10} />
                  <span>Sessão ativa criptografada por domínio</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {/* NAME INPUT */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 mb-1">Nome Completo</label>
                  <div className="relative">
                    <User size={12} className="absolute left-3 top-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-green-500 rounded-xl py-2 px-3 pl-8 text-xs text-white focus:outline-none focus:ring-1 focus:ring-green-950"
                      placeholder="Ex: Maria Rita Fernandes"
                    />
                  </div>
                </div>

                {/* EMAIL INPUT */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 mb-1">E-mail</label>
                  <div className="relative">
                    <Mail size={12} className="absolute left-3 top-3.5 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-green-500 rounded-xl py-2 px-3 pl-8 text-xs text-white focus:outline-none focus:ring-1 focus:ring-green-950"
                      placeholder="Ex: maria@suaempresa.com"
                    />
                  </div>
                </div>

                {/* PRESET AVATAR CHOICES */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 mb-2">Selecione uma imagem de Perfil</label>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_AVATARS.map((av) => {
                      const isSelected = avatarUrl === av.url;
                      return (
                        <button
                          type="button"
                          key={av.id}
                          onClick={() => setAvatarUrl(av.url)}
                          className="relative group focus:outline-none"
                          title={av.name}
                        >
                          <img
                            src={av.url}
                            alt={av.name}
                            className={`w-9 h-9 rounded-full object-cover transition-all ${
                              isSelected ? 'ring-2 ring-green-400 border-2 border-slate-900 scale-110' : 'opacity-70 hover:opacity-100 border border-slate-800'
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
                    className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-green-400 bg-green-950/20 text-white'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-400 hover:text-slate-350'
                    }`}
                  >
                    <Upload size={16} className={`mx-auto mb-1 transition-all ${isDragging ? 'text-green-400 scale-110' : 'text-slate-500'}`} />
                    <p className="text-[11px] font-bold">Arraste a foto aqui ou <span className="text-green-400 underline decoration-green-950 underline-offset-2">busque no PC</span></p>
                    <p className="text-[9px] font-mono text-slate-500 mt-0.5">Formatos de imagem suportados (Máx 2MB)</p>
                  </div>
                </div>

                {/* CUSTOM IMAGE LINK */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 mb-1">Ou cole uma URL própria externa</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-green-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none font-mono"
                    placeholder="https://exemplo.com/sua-foto.jpg"
                  />
                </div>

                {/* SUBMIT BUTTON */}
                <div className="flex gap-2 pt-1 font-semibold">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-350 text-xs py-2.5 rounded-xl border-0 transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 bg-green-400 hover:bg-green-300 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 text-xs py-2.5 rounded-xl border-0 font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {isUpdating && <Loader2 size={12} className="animate-spin" />}
                    Salvar Dados
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* LOGOUT FOOTER STATE */}
          <div className="p-3 bg-slate-950 border-t border-slate-850 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono font-medium">AdsCreator AI v1</span>
            <span className="text-[10px] text-green-400 font-mono font-bold">Acesso Liberado</span>
          </div>
        </div>
      )}
    </div>
  );
}
