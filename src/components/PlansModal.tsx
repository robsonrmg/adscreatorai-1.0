import React, { useState } from 'react';
import { Plan, ClientProfile, PixelIntegrations } from '../types';
import { Check, ShieldCheck, CreditCard, Globe, Zap, Settings, Save, Sparkles, Plus, Trash2, HelpCircle, Activity, AlertTriangle, CheckCircle2, RefreshCw, ExternalLink, Copy } from 'lucide-react';

interface Props {
  profile: ClientProfile;
  pixelSettings: PixelIntegrations;
  onUpdatePlan: (planId: 'starter' | 'pro' | 'unlimited') => void;
  onUpdateDomains: (subdomain: string, customDomain?: string) => void;
  onUpdatePixels: (pixels: PixelIntegrations) => void;
}

export default function PlansModal({ profile, pixelSettings, onUpdatePlan, onUpdateDomains, onUpdatePixels }: Props) {
  // Domain Setup states
  const [subdomain, setSubdomain] = useState((profile?.subdomain || 'meusite').split('.')[0] || 'meusite');
  
  const initialDomains = profile?.customDomain 
    ? profile.customDomain.split(',').map(d => d.trim()).filter(Boolean)
    : [''];
  const [customDomainsList, setCustomDomainsList] = useState<string[]>(initialDomains.length > 0 ? initialDomains : ['']);
  const [domainSuccess, setDomainSuccess] = useState(false);

  const savedDomains = React.useMemo(() => {
    return profile?.customDomain 
      ? profile.customDomain.split(',').map(d => d.trim()).filter(Boolean)
      : [];
  }, [profile?.customDomain]);

  const hasSavedSubdomain = React.useMemo(() => {
    return !!(profile?.subdomain && profile.subdomain !== 'meusite.adscreator.ai');
  }, [profile?.subdomain]);

  // DNS Verification states
  const [selectedVerifyDomain, setSelectedVerifyDomain] = useState<string>('');
  const [verifyLoading, setVerifyLoading] = useState<boolean>(false);
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean;
    domain: string;
    foundCnames: string[];
    foundARecords: string[];
    isConfigured: boolean;
    errorMsg?: string;
  } | null>(null);
  const [copiedText, setCopiedText] = useState<string>('');

  React.useEffect(() => {
    const rawDomain = profile?.customDomain || '';
    const parsed = rawDomain.split(',').map(d => d.trim()).filter(Boolean);
    setCustomDomainsList(parsed.length > 0 ? parsed : ['']);
  }, [profile?.customDomain]);

  React.useEffect(() => {
    setMetaId(pixelSettings.metaPixelId || '');
    setGaId(pixelSettings.googleAnalyticsId || '');
    setGtmId(pixelSettings.googleTagManagerId || '');
    setTiktokId(pixelSettings.tiktokPixelId || '');
  }, [pixelSettings]);

  const handleVerifyDNS = async (domainToVerify: string) => {
    if (!domainToVerify) return;
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const response = await fetch('/api/domains/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: domainToVerify }),
      });
      const data = await response.json();
      if (response.ok) {
        setVerifyResult({
          success: true,
          domain: data.domain,
          foundCnames: data.foundCnames || [],
          foundARecords: data.foundARecords || [],
          isConfigured: data.isConfigured,
          errorMsg: data.errorMsg,
        });
      } else {
        setVerifyResult({
          success: false,
          domain: domainToVerify,
          foundCnames: [],
          foundARecords: [],
          isConfigured: false,
          errorMsg: data.error || 'Falha ao verificar registros DNS.',
        });
      }
    } catch (err: any) {
      setVerifyResult({
        success: false,
        domain: domainToVerify,
        foundCnames: [],
        foundARecords: [],
        isConfigured: false,
        errorMsg: err.message || 'Erro de conexão com o servidor.',
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

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
        'Até 10 Domínios Personalizados próprios',
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
    const mergedDomains = customDomainsList
      .map(d => d.trim())
      .filter(Boolean)
      .join(', ');
    onUpdateDomains(finalSub, mergedDomains ? mergedDomains : undefined);
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
    <div className="space-y-6" id="plans-modal">
      
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

          {/* Important Plan Locking Alert */}
          <div className="bg-amber-955/20 border border-amber-900/40 rounded-xl p-3 flex gap-2.5 items-start bg-slate-950/40 text-left">
            <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={15} />
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-amber-200 font-sans">Regra de Segurança de Domínio</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                Para garantir a integridade dos pixels de tráfego ativos e dos links já compartilhados em suas campanhas, os domínios (subdomínio e domínios próprios) já cadastrados e salvos <strong>não poderão ser excluídos ou alterados</strong> em nenhum plano. Novos domínios podem ser agregados de acordo com as vagas disponíveis do seu plano ativo.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Subdomain */}
            <div>
              <label className="block text-xs font-bold font-mono text-slate-400 mb-1.5 uppercase">Subdomínio AdsCreator AI</label>
              <div className="flex items-center relative">
                <input
                  type="text"
                  value={subdomain}
                  readOnly={hasSavedSubdomain}
                  disabled={hasSavedSubdomain}
                  onChange={(e) => {
                    if (hasSavedSubdomain) return;
                    setSubdomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''));
                  }}
                  placeholder="seu-subdominio"
                  className={`bg-slate-950 border border-slate-800 rounded-l-lg py-2 pl-3 text-sm text-slate-100 focus:outline-none focus:border-green-500 w-full font-mono text-right ${
                    hasSavedSubdomain ? 'opacity-60 cursor-not-allowed bg-slate-900/60 border-slate-900 pr-24' : 'pr-3'
                  }`}
                />
                <span className="bg-slate-850 border border-l-0 border-slate-800 rounded-r-lg py-2 px-3 text-xs text-slate-450 font-mono text-slate-400">
                  .adscreator.ai
                </span>
                {hasSavedSubdomain && (
                  <span className="absolute left-3 top-2.5 text-[8px] font-mono text-amber-400 font-bold tracking-wider uppercase bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/50">
                    🔒 ATIVO NO PLANO
                  </span>
                )}
              </div>
            </div>

            {/* Custom Domain List Manager */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold font-mono text-slate-400 uppercase">Domínio(s) Oficial(is) Próprio(s)</label>
                <span className="text-[9px] bg-green-950/40 text-green-400 font-black tracking-widest px-1.5 py-0.5 rounded border border-green-900">
                  {profile?.planId === 'unlimited' 
                    ? `VIP (${customDomainsList.filter(Boolean).length} ADICIONADOS)` 
                    : profile?.planId === 'pro' 
                    ? `ATÉ 10 (${customDomainsList.filter(Boolean).length}/10)` 
                    : '1 DOMÍNIO PRÓPRIO'}
                </span>
              </div>

              <div className="space-y-2">
                {customDomainsList.map((domain, index) => {
                  const isSaved = domain && savedDomains.includes(domain);
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={domain}
                          readOnly={isSaved}
                          disabled={isSaved}
                          onChange={(e) => {
                            if (isSaved) return;
                            const updated = [...customDomainsList];
                            updated[index] = e.target.value.replace(/\s+/g, ''); // disallow spaces in domains
                            setCustomDomainsList(updated);
                          }}
                          placeholder="Ex: www.meusite.com"
                          className={`bg-slate-950 border border-slate-800 rounded-lg py-2 pl-3 text-sm focus:outline-none focus:border-green-500 w-full font-mono text-slate-100 ${
                            isSaved ? 'opacity-60 cursor-not-allowed bg-slate-900/60 border-slate-900 pr-24' : 'pr-3'
                          }`}
                        />
                        {isSaved && (
                          <span className="absolute right-3 top-2.5 text-[8px] font-mono text-amber-400 font-bold tracking-wider uppercase bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/50">
                            🔒 ATIVO NO PLANO
                          </span>
                        )}
                      </div>
                      
                      {/* Trash icon - show only if we have multiple domains or plan is not starter */}
                      {(profile?.planId === 'pro' || profile?.planId === 'unlimited') && (
                        <button
                          type="button"
                          disabled={isSaved}
                          onClick={() => {
                            if (isSaved) return;
                            const updated = [...customDomainsList];
                            updated.splice(index, 1);
                            if (updated.length === 0) updated.push('');
                            setCustomDomainsList(updated);
                          }}
                          className={`p-2 rounded-lg bg-slate-950 border transition-all ${
                            isSaved 
                              ? 'opacity-30 cursor-not-allowed border-slate-900 text-slate-600' 
                              : 'border-slate-800 hover:border-red-500 hover:text-red-500 text-slate-400 cursor-pointer'
                          }`}
                          title={isSaved ? "Domínios ativos salvos não podem ser excluídos ou alterados do plano" : "Remover este domínio"}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Domain "+" Button for Pro/Unlimited plan */}
              {(profile?.planId === 'pro' || profile?.planId === 'unlimited') && (
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      const maxAllowed = profile?.planId === 'pro' ? 10 : 50;
                      if (customDomainsList.length < maxAllowed) {
                        setCustomDomainsList([...customDomainsList, '']);
                      }
                    }}
                    disabled={profile?.planId === 'pro' && customDomainsList.length >= 10}
                    className="flex items-center gap-1 text-[11px] font-bold text-green-400 hover:text-green-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-all uppercase tracking-wider font-mono cursor-pointer mt-1"
                  >
                    <Plus size={14} /> Adicionar domínio (+ {profile?.planId === 'pro' ? `${10 - customDomainsList.length} vagas` : 'Vagas VIP'})
                  </button>
                </div>
              )}
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

            {/* CNAME DNS SETUP FLOW */}
            <div className="border-t border-slate-800 pt-5 mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="text-blue-400" size={15} />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Apontamento DNS Customizado (CNAME)</h4>
              </div>
              
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Para conectar seu próprio domínio, acesse o painel DNS do seu provedor (Cloudflare, HostGator, GoDaddy, Registro.br) e adicione o seguinte registro CNAME:
              </p>

              <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="grid grid-cols-3 gap-1 pb-1 border-b border-slate-900 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <div>Tipo</div>
                  <div>Nome / Host</div>
                  <div>Destino / Alvo</div>
                </div>

                <div className="grid grid-cols-3 gap-1 items-center bg-slate-900 group rounded p-1.5 transition-all text-slate-300">
                  <div className="text-blue-400 font-bold font-mono">CNAME</div>
                  <div className="flex items-center gap-1.5">
                    <span>www</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('www', 'host')}
                      className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                      title="Copiar Nome"
                    >
                      <Copy size={11} />
                    </button>
                    {copiedText === 'host' && <span className="text-[8px] text-green-400 font-sans font-bold">Copiado!</span>}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">adscreator.ai</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('adscreator.ai', 'target')}
                      className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                      title="Copiar Destino"
                    >
                      <Copy size={11} />
                    </button>
                    {copiedText === 'target' && <span className="text-[8px] text-green-400 font-sans font-bold">Copiado!</span>}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/30 p-3 rounded-lg border border-slate-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold font-mono text-slate-300 uppercase">Verificador DNS em Tempo Real</span>
                  <HelpCircle className="text-slate-500" size={14} title="Verifique se o seu domínio já está apontando corretamente para nossa plataforma." />
                </div>

                {customDomainsList.filter(Boolean).length === 0 ? (
                  <p className="text-[10px] text-slate-500 font-mono italic">
                    Insira e salve um domínio próprio acima para testar o apontamento DNS.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <select
                        value={selectedVerifyDomain}
                        onChange={(e) => {
                          setSelectedVerifyDomain(e.target.value);
                          setVerifyResult(null);
                        }}
                        className="bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-green-500 flex-1 text-slate-200 font-mono text-center"
                      >
                        <option value="">-- Selecione o domínio --</option>
                        {customDomainsList.filter(Boolean).map((d, index) => (
                          <option key={index} value={d}>{d}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleVerifyDNS(selectedVerifyDomain)}
                        disabled={verifyLoading || !selectedVerifyDomain}
                        className="flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-xs font-bold text-slate-950 py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                      >
                        {verifyLoading ? (
                          <RefreshCw className="animate-spin" size={12} />
                        ) : (
                          <Activity size={12} />
                        )}
                        Testar DNS
                      </button>
                    </div>

                    {verifyResult && (
                      <div className={`p-3 rounded-lg border text-xs font-mono space-y-2 animate-fade-in ${
                        verifyResult.isConfigured 
                          ? 'bg-green-950/20 border-green-900/50 text-green-300' 
                          : 'bg-red-950/25 border-red-950/50 text-red-300'
                      }`}>
                        <div className="flex items-start gap-1.5">
                          {verifyResult.isConfigured ? (
                            <CheckCircle2 className="text-green-400 mt-0.5 shrink-0" size={14} />
                          ) : (
                            <AlertTriangle className="text-red-400 mt-0.5 shrink-0" size={14} />
                          )}
                          <div className="flex-1 space-y-1">
                            <p className="font-bold uppercase tracking-wider text-[10px]">
                              Status: {verifyResult.isConfigured ? 'Apontamento Ativo!' : 'Falha / Propagando DNS'}
                            </p>
                            <p className="text-[10px] text-slate-300 break-all leading-relaxed">
                              Domínio: <span className="underline font-bold text-white">{verifyResult.domain}</span>
                            </p>
                            
                            {verifyResult.foundCnames && verifyResult.foundCnames.length > 0 && (
                              <p className="text-[9px] text-slate-400">
                                CNAMEs Resolvidos: {verifyResult.foundCnames.join(', ')}
                              </p>
                            )}
                            
                            {verifyResult.foundARecords && verifyResult.foundARecords.length > 0 && (
                              <p className="text-[9px] text-slate-400">
                                IPs Resolvidos (A): {verifyResult.foundARecords.join(', ')}
                              </p>
                            )}

                            {verifyResult.errorMsg && (
                              <p className="text-[10px] text-amber-300 font-sans italic p-1 border border-amber-900/30 bg-amber-950/10 rounded mt-1 leading-normal">
                                {verifyResult.errorMsg}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
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
