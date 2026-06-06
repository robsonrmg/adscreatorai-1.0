import React, { useState } from 'react';
import { Plan, ClientProfile, PixelIntegrations } from '../types';
import { Check, ShieldCheck, CreditCard, Globe, Zap, Settings, Save, Sparkles } from 'lucide-react';

interface Props {
  profile: ClientProfile;
  pixelSettings: PixelIntegrations;
  onUpdatePlan: (planId: 'starter' | 'pro' | 'unlimited') => void;
  onUpdateDomains: (subdomain: string, customDomain?: string) => void;
  onUpdatePixels: (pixels: PixelIntegrations) => void;
}

export default function PlansModal({ profile, pixelSettings, onUpdatePlan, onUpdateDomains, onUpdatePixels }: Props) {
  // Domain Setup states
  const [subdomain, setSubdomain] = useState(profile.subdomain.split('.')[0] || 'meusite');
  const [customDomain, setCustomDomain] = useState(profile.customDomain || '');
  const [domainSuccess, setDomainSuccess] = useState(false);

  // Pixel setup states
  const [metaId, setMetaId] = useState(pixelSettings.metaPixelId || '');
  const [gaId, setGaId] = useState(pixelSettings.googleAnalyticsId || '');
  const [gtmId, setGtmId] = useState(pixelSettings.googleTagManagerId || '');
  const [tiktokId, setTiktokId] = useState(pixelSettings.tiktokPixelId || '');
  const [pixelSuccess, setPixelSuccess] = useState(false);

  const PLANS: Plan[] = [
    {
      id: 'starter',
      name: 'Plano Starter AI',
      price: 'R$ 69,90/mês',
      subPrice: 'Mensal',
      limitPages: 10,
      features: [
        'Até 10 páginas simultâneas',
        'Templates de vendas básicos',
        'Redução automática de cópia por IA',
        'Publicação em subdomínio adscreator.ai',
        '1 domínio personalizado próprio'
      ],
    },
    {
      id: 'pro',
      name: 'Plano Pro Copywriter',
      price: 'R$ 209,70/trimestral',
      subPrice: 'Ou 10x de R$ 20,97',
      limitPages: 50,
      features: [
        'Até 50 páginas de alta conversão',
        'Modelos e layouts Premium',
        'Inteligência Artificial Avançada',
        '1 Domínio Personalizado próprio',
        'Painel de Analytics de Cliques',
        'Suporte Técnico'
      ],
    },
    {
      id: 'unlimited',
      name: 'Plano Unlimited VIP',
      price: 'R$ 587,16/anual',
      subPrice: 'Ou 12x de R$ 48,93',
      limitPages: 999999,
      features: [
        'Páginas ilimitadas',
        'Todos os templates desbloqueados',
        'Múltiplos domínios próprios',
        'Analytics avançado em tempo real',
        'Prioridade máxima no processamento IA',
        'Suporte Técnico'
      ],
    },
  ];

  const handleSaveDomains = () => {
    const finalSub = `${subdomain.toLowerCase().trim()}.adscreator.ai`;
    onUpdateDomains(finalSub, customDomain.trim() ? customDomain.trim() : undefined);
    setDomainSuccess(true);
    setTimeout(() => setDomainSuccess(false), 2500);
  };

  const handleSavePixels = () => {
    onUpdatePixels({
      metaPixelId: metaId.trim(),
      googleAnalyticsId: gaId.trim(),
      googleTagManagerId: gtmId.trim(),
      tiktokPixelId: tiktokId.trim(),
    });
    setPixelSuccess(true);
    setTimeout(() => setPixelSuccess(false), 2500);
  };

  return (
    <div className="space-y-12" id="plans-modal">
      
      {/* SECTION 1: SYSTEM PLANS SELECT */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="text-green-400" size={20} />
          <h2 className="text-xl font-bold text-white">Plano Ativo & Faturamento</h2>
        </div>
        <p className="text-sm text-slate-400 mb-6 font-sans">
          Gerencie seu plano de assinatura do **AdsCreator AI** para expandir seus limites de tráfego e publicação de URLs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = profile.planId === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border p-6 flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-slate-900/60 border-green-500 shadow-lg shadow-green-950/20'
                    : 'bg-slate-900/20 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 right-4 bg-green-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                    Plano Ativo
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                  <div className="flex flex-col mb-4">
                    <span className="text-2xl font-extrabold text-white">{plan.price}</span>
                    {plan.subPrice && (
                      <span className="text-[10px] font-mono text-slate-400 mt-1 font-medium">{plan.subPrice}</span>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 px-4 rounded-lg bg-green-950 text-green-400 border border-green-800 text-xs font-bold uppercase tracking-wider cursor-default text-center"
                  >
                    Ativado no momento
                  </button>
                ) : (
                  <button
                    onClick={() => onUpdatePlan(plan.id)}
                    className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-705 text-white hover:bg-slate-700 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Fazer Upgrade para {plan.name.split(' ')[0]}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SECTION 2: DOMAIN MANAGEMENT */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="text-green-400" size={18} />
            <h3 className="text-base font-bold text-white">Configuração de Domínio</h3>
          </div>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            Selecione onde suas páginas criadas por IA serão publicadas instantaneamente.
          </p>

          <div className="space-y-4 pt-2">
            {/* Subdomain */}
            <div>
              <label className="block text-xs font-bold font-mono text-slate-400 mb-1.5 uppercase">Subdomínio AdsCreator AI</label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                  placeholder="seu-subdominio"
                  className="bg-slate-950 border border-slate-800 rounded-l-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-green-500 w-full font-mono text-right"
                />
                <span className="bg-slate-850 border border-l-0 border-slate-800 rounded-r-lg py-2 px-3 text-xs text-slate-450 font-mono text-slate-400">
                  .adscreator.ai
                </span>
              </div>
            </div>

            {/* Custom Domain */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold font-mono text-slate-400 uppercase">Domínio Oficial Próprio</label>
                <span className="text-[9px] bg-green-950/40 text-green-400 font-black tracking-widest px-1.5 py-0.5 rounded border border-green-900">
                  {profile.planId === 'unlimited' ? 'MÚLTIPLOS DOMÍNIOS' : '1 DOMÍNIO PRÓPRIO'}
                </span>
              </div>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder={profile.planId === 'unlimited' ? "Ex: site1.com, site2.com" : "Ex: www.meusite.com"}
                className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-green-500 w-full font-mono text-slate-100"
              />
            </div>

            <button
              onClick={handleSaveDomains}
              className="flex items-center justify-center gap-2 bg-green-400 hover:bg-green-300 text-slate-950 text-xs font-bold py-2.5 px-4 rounded-lg w-full tracking-wider uppercase transition-all cursor-pointer"
            >
              <Save size={14} />
              Salvar Domínios
            </button>

            {domainSuccess && (
              <p className="text-center text-xs text-green-400 font-bold tracking-wide animate-fade-in animate-pulse">
                ✓ Domínios de publicação redefinidos com sucesso!
              </p>
            )}
          </div>
        </div>

        {/* SECTION 3: INTEGRATIONS / PIXELS */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="text-green-400" size={18} />
            <h3 className="text-base font-bold text-white">Integrações de Pixels de Tráfego</h3>
          </div>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            Monitore suas conversões de tráfego pago conectando seus pixels nas páginas diretamente do AdsCreator. Ativado de forma automática.
          </p>

          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1">Meta Pixel ID</label>
                <input
                  type="text"
                  placeholder="ID do Pixel"
                  value={metaId}
                  onChange={(e) => setMetaId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-green-500 w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1">Google Analytics (G-)</label>
                <input
                  type="text"
                  placeholder="G-XXXXXX"
                  value={gaId}
                  onChange={(e) => setGaId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-green-500 w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1">Google Tag Manager (GTM-)</label>
                <input
                  type="text"
                  placeholder="GTM-XXXXXX"
                  value={gtmId}
                  onChange={(e) => setGtmId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-green-500 w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 mb-1">TikTok Pixel ID</label>
                <input
                  type="text"
                  placeholder="ID do TikTok Pixel"
                  value={tiktokId}
                  onChange={(e) => setTiktokId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-green-500 w-full"
                />
              </div>
            </div>

            <button
              onClick={handleSavePixels}
              className="flex items-center justify-center gap-2 bg-green-400 hover:bg-green-300 text-slate-950 text-xs font-bold py-2.5 px-4 rounded-lg w-full tracking-wider uppercase transition-all cursor-pointer mt-4"
            >
              <Save size={14} />
              Salvar Configurações de Pixel
            </button>

            {pixelSuccess && (
              <p className="text-center text-xs text-green-400 font-bold tracking-wide animate-pulse">
                ✓ Pixels de conversão integrados!
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
