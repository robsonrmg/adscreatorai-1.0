import React, { useState, useEffect } from 'react';
import { PageType, Page } from '../types';
import {
  Sparkles,
  ArrowLeft,
  Loader2,
  Copy,
  CopyCheck,
  ExternalLink,
  Edit3,
  ShieldCheck,
  Check,
  Globe,
  RefreshCw,
  Sliders,
  Download
} from 'lucide-react';

function detectLanguageFromUrl(url: string): 'pt' | 'en' | 'es' | 'it' {
  if (!url) return 'pt';
  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.includes('.it') || lowercaseUrl.includes('/it/') || lowercaseUrl.includes('/it-')) {
    return 'it';
  }
  if (
    lowercaseUrl.includes('.es') ||
    lowercaseUrl.includes('.mx') ||
    lowercaseUrl.includes('.cl') ||
    lowercaseUrl.includes('.co') ||
    lowercaseUrl.includes('.ar') ||
    lowercaseUrl.includes('/es/') ||
    lowercaseUrl.includes('/es-')
  ) {
    return 'es';
  }
  if (lowercaseUrl.includes('.br') || lowercaseUrl.includes('.pt') || lowercaseUrl.includes('/pt/') || lowercaseUrl.includes('/pt-')) {
    return 'pt';
  }
  return 'en';
}

interface Props {
  onBack: () => void;
  onPageCreated: (page: Page) => void;
  onEditPage: (pageId: string) => void;
  userPlanId: string;
  globalLanguage?: 'pt' | 'en' | 'es' | 'it' | 'fr';
}

export default function AIPageSetup({ onBack, onPageCreated, onEditPage, userPlanId, globalLanguage = 'pt' }: Props) {
  const [url, setUrl] = useState('');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [domainType, setDomainType] = useState<'subdomain' | 'custom'>('subdomain');
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [selectedType, setSelectedType] = useState<PageType>('Review');
  
  // Custom states for Multi-Language and Cookie Presell configurations
  const [generationLanguage, setGenerationLanguage] = useState<'pt' | 'en' | 'es' | 'it' | 'fr'>(globalLanguage);
  const [cookieNiche, setCookieNiche] = useState<'Saúde' | 'Finanças' | 'Relacionamento' | 'Beleza' | 'E-commerce' | 'Tecnologia'>('Saúde');
  const [cookieDestinationType, setCookieDestinationType] = useState<'link_afiliado' | 'page_slug' | 'custom_url'>('link_afiliado');
  const [cookieDestinationSlug, setCookieDestinationSlug] = useState('');
  const [cookieDestinationCustomUrl, setCookieDestinationCustomUrl] = useState('');
  const [cookieDisplayDelay, setCookieDisplayDelay] = useState<number>(0);
  const [cookieAppearance, setCookieAppearance] = useState<'modal' | 'fullscreen' | 'bottom_bar' | 'popup'>('modal');
  const [existingPages, setExistingPages] = useState<any[]>([]);

  // Profile settings loaded dynamically
  const [profile, setProfile] = useState<any>(null);
  
  // Generation state managers
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successPage, setSuccessPage] = useState<Page | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateSuccess, setRegenerateSuccess] = useState(false);

  const PAGE_TYPES: { id: PageType; label: string; desc: string }[] = [
    { id: 'Review', label: 'Review de Análise', desc: 'Análise aprofundada estruturada com tópicos de vantagens/especificações técnicos.' },
    { id: 'Presell', label: 'Página Presell', desc: 'Página pré-venda aquecedora inteligente contra bloqueios (Google/Meta Ads).' },
    { id: 'Advertorial', label: 'Advertorial Especial', desc: 'Narrativa estilo portal G1/Noticiário para atrair tráfego frio emocional.' },
    { id: 'Landing Page', label: 'Landing Page', desc: 'Conversão matadora com headlines diretas focadas no checkout de vendas.' },
    { id: 'Bridge Page', label: 'Bridge Page (Ponte)', desc: 'Página ponte rápida que destaca garantias blindadas e entrega bônus.' },
    { id: 'Cookie Presell', label: 'Cookie Presell', desc: 'Aviso de cookie simulado para aquecimento e captura de tracking em vários idiomas.' },
  ];

  const LOADING_STEPS = [
    "Scrapeando metadados da oferta e extraindo nome do produto...",
    "Capturando e mapeando de forma segura imagens e logotipos oficiais...",
    "Gemini 3.5-Flash construindo headlines persuasivas de alta conversão...",
    "IA gerando storytelling persuasivo, lista de benefícios e FAQs exclusivas...",
    "Injetando link de afiliado em todos os botões e imagens clicáveis...",
    "Salvando no banco de dados e publicando página automaticamente..."
  ];

  // Fetch current user subdomains on mount
  useEffect(() => {
    fetch('/api/profile')
      .then((res) => {
        if (res.ok) return res.json();
      })
      .then((data) => {
        if (data) {
          setProfile(data);
          if (data.customDomain) {
            setCustomDomainInput(data.customDomain);
            setDomainType('custom');
          }
        }
      })
      .catch((err) => console.error("Error fetching domains profile: ", err));

    // Load existing pages lists for cookie redirect targets
    fetch('/api/pages')
      .then((res) => { if (res.ok) return res.json(); })
      .then((data) => { if (data) setExistingPages(data); })
      .catch((err) => console.error("Error loading existing pages lists: ", err));
  }, []);

  useEffect(() => {
    if (globalLanguage) {
      setGenerationLanguage(globalLanguage);
    }
  }, [globalLanguage]);

  useEffect(() => {
    let timer: number;
    if (isGenerating && generationStep < LOADING_STEPS.length) {
      const stepDuration = generationStep === 2 || generationStep === 3 ? 2000 : 1000;
      timer = window.setTimeout(() => {
        setGenerationStep((prev) => prev + 1);
      }, stepDuration);
    }
    return () => clearTimeout(timer);
  }, [isGenerating, generationStep]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Por favor, digite uma URL de oferta válida!");
      return;
    }
    if (!affiliateLink.trim()) {
      setError("Por favor, informe seu link de afiliado oficial para todos os CTAs.");
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGenerationStep(0);

    const chosenDomain = domainType === 'subdomain'
      ? (profile?.subdomain || "cliente.adscreator.ai")
      : (customDomainInput || "www.meudominio.com");

    const finalCookieUrl = cookieDestinationType === 'link_afiliado' 
      ? affiliateLink.trim() 
      : cookieDestinationType === 'page_slug' 
        ? (existingPages.find(p => p.slug === cookieDestinationSlug)?.published_url || ('/p/' + cookieDestinationSlug))
        : cookieDestinationCustomUrl.trim();

    try {
      const response = await fetch('/api/pages/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          type: selectedType,
          affiliate_link: affiliateLink.trim(),
          domain: chosenDomain,
          generation_language: generationLanguage,
          cookie_niche: cookieNiche,
          cookie_destination_type: cookieDestinationType,
          cookie_destination_slug: cookieDestinationSlug,
          cookie_destination_url: finalCookieUrl,
          cookie_display_delay: cookieDisplayDelay,
          cookie_appearance: cookieAppearance
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Houve um erro técnico imprevisto na geração de IA.");
      }

      const newPage: Page = await response.json();
      
      setTimeout(() => {
        setIsGenerating(false);
        setSuccessPage(newPage);
        onPageCreated(newPage);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de conexão. Verifique o servidor.");
      setIsGenerating(false);
    }
  };

  // Perform AI Regeneration retaining domain, slug, and affiliate_link
  const handleRegenerate = async () => {
    if (!successPage) return;
    setIsRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${successPage.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Erro ao regenerar página por IA.");
      }
      const updatedPage: Page = await res.json();
      setSuccessPage(updatedPage);
      setRegenerateSuccess(true);
      setTimeout(() => setRegenerateSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao tentar regenerar: " + err.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyUrl = (urlText: string) => {
    navigator.clipboard.writeText(urlText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Display default system-rendered preview URL or custom domain URL
  const getPublishUrlDisplay = (page: Page) => {
    if (page.published_url) return page.published_url;
    
    // Fallback if not stored
    const activeDomain = page.domain || profile?.subdomain || window.location.hostname;
    const cleanDomain = activeDomain.replace(/^(https?:\/\/)?(www\.)?/, "");
    return `https://${cleanDomain}/${page.slug}`;
  };

  return (
    <div className="max-w-2xl mx-auto py-2" id="ai-page-setup">
      {!isGenerating && !successPage && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1 px-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft size={12} />
              Voltar
            </button>
            <span className="text-[10px] font-mono uppercase bg-green-950 text-green-400 border border-green-800 rounded px-2 py-0.5">
              Supercharger IA Ativo
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Sparkles className="text-green-400 animate-pulse" size={24} />
              Criar Nova Página Inteligente
            </h1>
            <p className="text-xs text-slate-400">
              Informe a URL de referência do produto e seu link de afiliado. Nossa IA fará todo o processo automaticamente: estruturando reviews, depoimentos, fotos e direcionando todos os botões para o seu link.
            </p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6 pt-2">
            
            {/* Form Input 1: URL DA OFERTA (Mandatory) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold font-mono text-slate-300 uppercase">
                1. URL da Oferta de Referência *
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Ex: https://joineternal.com ou https://siteoficial.com/produto"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 px-4 text-sm text-slate-150 placeholder-slate-600 focus:outline-none focus:border-green-500 font-mono text-slate-200"
              />
              <span className="block text-[10px] text-slate-500">
                A IA analisará esta página para coletar nome do produto, benefícios, fotos oficiais e garantias.
              </span>
            </div>

            {/* Form Input 2: LINK DE AFILIADO (Mandatory) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold font-mono text-slate-300 uppercase">
                2. Link de Afiliado *
              </label>
              <input
                type="url"
                required
                value={affiliateLink}
                onChange={(e) => setAffiliateLink(e.target.value)}
                placeholder="Ex: https://go.hotmart.com/abc12345 ou https://clickbank.com/hoplink"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 px-4 text-sm text-slate-150 placeholder-slate-600 focus:outline-none focus:border-green-500 font-mono text-slate-200"
              />
              <span className="block text-[10px] text-slate-500">
                Crucial! Todos os botões, banners e imagens de compra da página apontarão de forma automática e segura para este link.
              </span>
            </div>

            {/* Form Input 3: DOMÍNIO DE PUBLICAÇÃO (Mandatory) */}
            <div className="space-y-3">
              <label className="block text-xs font-bold font-mono text-slate-300 uppercase">
                3. Domínio de Publicação *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Option A: System Subdomain */}
                <div
                  onClick={() => setDomainType('subdomain')}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    domainType === 'subdomain'
                      ? 'bg-slate-900 border-green-500 shadow-md shadow-green-950/20'
                      : 'bg-slate-900/10 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      checked={domainType === 'subdomain'}
                      onChange={() => setDomainType('subdomain')}
                      className="accent-green-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-white">Subdomínio do sistema</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-450 text-green-400 font-semibold truncate block">
                    {profile?.subdomain || "carregando.adscreator.ai"}
                  </span>
                </div>

                {/* Option B: Custom Own Domain */}
                <div
                  onClick={() => setDomainType('custom')}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    domainType === 'custom'
                      ? 'bg-slate-900 border-green-500 shadow-md shadow-green-950/20'
                      : 'bg-slate-900/10 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      checked={domainType === 'custom'}
                      onChange={() => setDomainType('custom')}
                      className="accent-green-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-white">Domínio próprio</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 truncate block">
                    {profile?.customDomain || "Configurar domínio personalizado"}
                  </span>
                </div>

              </div>

              {domainType === 'custom' && (
                <div className="pt-1.5 animate-fade-in">
                  <input
                    type="text"
                    required={domainType === 'custom'}
                    value={customDomainInput}
                    onChange={(e) => setCustomDomainInput(e.target.value)}
                    placeholder="Ex: www.meusite.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-green-500 font-mono"
                  />
                  <span className="block text-[9px] text-slate-500 mt-1">
                    Insira ou confirme seu domínio próprio contratado.
                  </span>
                </div>
              )}
            </div>

            {/* Form Input 4: TIPO DE PÁGINA (Mandatory) */}
            <div className="space-y-3 animate-fade-in">
              <label className="block text-xs font-bold font-mono text-slate-300 uppercase">
                4. Tipo de Página (Formato) *
              </label>
              <div className="space-y-2">
                {PAGE_TYPES.map((type) => {
                  const isSelected = selectedType === type.id;
                  return (
                    <div
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-900 border-green-500 shadow-md'
                          : 'bg-slate-900/10 border-slate-800 hover:border-slate-750'
                      }`}
                    >
                      <div className="flex-1 pr-4">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          {type.label}
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>}
                        </h4>
                        <p className="text-[10px] text-slate-450 mt-0.5">{type.desc}</p>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-green-400 bg-green-950/50' : 'border-slate-700'
                      }`}>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Input 5: IDIOMA DA GERAÇÃO (Aplica-se a todos os formatos) */}
            <div className="space-y-3 p-4 bg-slate-900/30 border border-slate-800 rounded-2xl animate-fade-in">
              <label className="block text-xs font-bold font-mono text-slate-300 uppercase flex items-center gap-2">
                <Globe size={13} className="text-green-400" />
                5. Idioma de Geração da IA *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'en', label: 'English (US)', labelLong: 'EN-US', flag: '🇺🇸' },
                  { id: 'es', label: 'Español', labelLong: 'ES-ES', flag: '🇪🇸' },
                  { id: 'it', label: 'Italiano', labelLong: 'IT-IT', flag: '🇮🇹' },
                  { id: 'fr', label: 'Français', labelLong: 'FR-FR', flag: '🇫🇷' },
                  { id: 'pt', label: 'Português', labelLong: 'PT-BR', flag: '🇧🇷' }
                ].map((lang) => {
                  const isLangSel = generationLanguage === lang.id;
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setGenerationLanguage(lang.id as any)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center cursor-pointer ${
                        isLangSel
                          ? 'bg-gradient-to-br from-green-950/20 to-slate-900 border-green-500 text-white shadow-md shadow-green-950/20 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-750'
                      }`}
                    >
                      <span className="text-lg mb-0.5">{lang.flag}</span>
                      <span className="text-[10px] font-bold block leading-tight">{lang.label}</span>
                      <span className="text-[8px] font-mono opacity-50 block">{lang.labelLong}</span>
                    </button>
                  );
                })}
              </div>
              <span className="block text-[9px] text-slate-500 mt-1">
                Selecione o idioma no qual a inteligência artificial deve produzir toda a sua copy comercial.
              </span>
            </div>

            {/* Form Input 6: CONFIGURAÇÕES EXCLUSIVAS DE COOKIE PRESELL */}
            {selectedType === 'Cookie Presell' && (
              <div className="space-y-4 p-5 bg-gradient-to-br from-slate-900/60 to-slate-950 border border-slate-800 rounded-2xl animate-fade-in">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-1">
                  <Sliders className="text-green-400" size={16} />
                  <h3 className="text-xs font-black uppercase text-white font-mono tracking-wider">
                    Configurações do Cookie Presell
                  </h3>
                </div>

                {/* Niche Choice */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase">
                    Nicho da Oferta (Direcionamento da IA)
                  </label>
                  <select
                    value={cookieNiche}
                    onChange={(e: any) => setCookieNiche(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-green-500 font-mono focus:bg-slate-950"
                  >
                    {['Saúde', 'Finanças', 'Relacionamento', 'Beleza', 'E-commerce', 'Tecnologia'].map((n) => (
                      <option key={n} value={n} className="bg-slate-950 text-white select-none">{n}</option>
                    ))}
                  </select>
                </div>

                {/* Display Delay */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase flex justify-between items-center">
                    <span>Tempo de Exibição (Delay)</span>
                    <span className="text-green-400 font-mono text-[9px]">
                      {cookieDisplayDelay === 0 ? 'Imediato (Sem Delay)' : `${cookieDisplayDelay} segundos`}
                    </span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: 0, label: 'Instantâneo' },
                      { val: 3, label: '3 Segundos' },
                      { val: 5, label: '5 Segundos' },
                      { val: 10, label: '10 Segundos' }
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setCookieDisplayDelay(opt.val)}
                        className={`py-2 px-1 text-center rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                          cookieDisplayDelay === opt.val
                            ? 'bg-green-400 text-slate-950 border-green-400 font-black'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Appearance */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase">
                    Aparência do Consentimento de Cookies
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'modal', label: 'Modal Central', desc: 'Centralizado na tela com desfoque' },
                      { id: 'fullscreen', label: 'Tela Cheia', desc: 'Ocupa a tela inteira (altíssimo foco)' },
                      { id: 'bottom_bar', label: 'Barra Inferior', desc: 'Banner discreto na base horizontal' },
                      { id: 'popup', label: 'Popup Lateral', desc: 'Pequeno balão flutuante no canto' }
                    ].map((appr) => (
                      <button
                        key={appr.id}
                        type="button"
                        onClick={() => setCookieAppearance(appr.id as any)}
                        className={`p-2 text-left rounded-lg border cursor-pointer transition-all ${
                          cookieAppearance === appr.id
                            ? 'bg-slate-900 border-green-500 shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-750'
                        }`}
                      >
                        <span className="block text-[10px] font-bold text-white mb-0.5">{appr.label}</span>
                        <span className="block text-[8px] opacity-65 leading-tight">{appr.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Destination Selector after agreement */}
                <div className="space-y-3 pt-2 border-t border-slate-800/60">
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase">
                    Destino para Redirecionamento após Aceite
                  </label>
                  
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-955 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {[
                      { id: 'link_afiliado', label: 'Link Afiliado' },
                      { id: 'page_slug', label: 'Página Interna' },
                      { id: 'custom_url', label: 'URL Externa' }
                    ].map((dest) => (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => setCookieDestinationType(dest.id as any)}
                        className={`py-1.5 px-2 text-center rounded-lg text-[9px] font-bold cursor-pointer transition-all ${
                          cookieDestinationType === dest.id
                            ? 'bg-slate-900 text-white font-black border border-slate-850 shadow-inner'
                            : 'text-slate-450 text-slate-400 hover:text-white'
                        }`}
                      >
                        {dest.label}
                      </button>
                    ))}
                  </div>

                  {/* Condition A: Affiliate Link (Standard default) */}
                  {cookieDestinationType === 'link_afiliado' && (
                    <div className="p-3 bg-green-950/20 border border-green-900/40 rounded-xl">
                      <p className="text-[10px] text-green-300 leading-normal flex items-start gap-1.5">
                        <span className="mt-0.5">ℹ️</span>
                        <span>O visitante será redirecionado para o link de afiliado oficial informado no Item 2: <span className="font-mono text-[9px] underline block max-w-full truncate">{affiliateLink || "(Link não informado)"}</span></span>
                      </p>
                    </div>
                  )}

                  {/* Condition B: Redirect to another generated page inside dashboard */}
                  {cookieDestinationType === 'page_slug' && (
                    <div className="space-y-2 animate-fade-in">
                      <span className="block text-[9px] text-slate-400">Selecione uma de suas páginas geradas anteriormente para encaminhar o tráfego de cookies aquecido:</span>
                      {existingPages.length === 0 ? (
                        <div className="p-2.5 text-center border border-dashed border-slate-800 rounded-lg text-[10.5px] text-slate-500">
                          Nenhuma outra página criada no momento.
                        </div>
                      ) : (
                        <select
                          value={cookieDestinationSlug}
                          onChange={(e) => setCookieDestinationSlug(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-green-500 font-mono"
                        >
                          <option value="">-- Selecionar Página Interna --</option>
                          {existingPages.map((pg: any) => (
                            <option key={pg.slug} value={ pg.slug }>
                              [{pg.type}] {pg.productName} ({pg.slug})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Condition C: Redirect to another Custom specified external URL */}
                  {cookieDestinationType === 'custom_url' && (
                    <div className="space-y-2 animate-fade-in">
                      <span className="block text-[9px] text-slate-400">Informe o endereço URL completo de destino:</span>
                      <input
                        type="url"
                        value={cookieDestinationCustomUrl}
                        onChange={(e) => setCookieDestinationCustomUrl(e.target.value)}
                        placeholder="Ex: https://meusiteoficial.com/obrigado"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-green-500 font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-950/30 border border-red-900 rounded-lg text-xs text-red-400 leading-relaxed font-sans">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-green-400 hover:bg-green-300 text-slate-950 font-black tracking-wider uppercase rounded-xl shadow-lg shadow-green-950/30 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles size={14} />
              Gerar Conteúdo Automático por IA
            </button>
          </form>
        </div>
      )}

      {/* IS LOADING PROGRESS COMPONENT */}
      {isGenerating && (
        <div className="space-y-8 text-center py-16 px-4" id="ai-loading">
          <div className="relative inline-flex items-center justify-center">
            <Loader2 size={64} className="text-green-400 animate-spin" />
            <Sparkles className="absolute text-orange-400 animate-pulse" size={24} />
          </div>

          <div className="space-y-3 max-w-sm mx-auto">
            <h3 className="text-lg font-black text-white tracking-tight">Construindo sua Cópia Persuasiva</h3>
            <p className="text-xs text-slate-400 font-medium">Extraindo ganchos emocionais da oferta de referência e programando os botões de afiliado.</p>
          </div>

          {/* Current Step Tracker */}
          <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-5 max-w-md mx-auto space-y-4">
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono uppercase">
              <span>Status Operacional</span>
              <span>{Math.min(100, Math.round(((generationStep + 1) / LOADING_STEPS.length) * 100))}%</span>
            </div>
            
            {/* Steps simulation checklist */}
            <div className="space-y-2 text-left">
              {LOADING_STEPS.map((step, idx) => {
                const isDone = generationStep > idx;
                const isCurrent = generationStep === idx;
                return (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {isDone ? (
                      <Check size={14} className="text-green-500 flex-shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 size={14} className="text-green-400 animate-spin flex-shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[8px] font-mono text-slate-500 flex-shrink-0">{idx + 1}</span>
                    )}
                    <span className={isDone ? 'text-slate-500 line-through font-medium' : isCurrent ? 'text-green-400 font-bold' : 'text-slate-600'}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* FINISHED SUCCESS PAGE CONTAINER */}
      {successPage && (
        <div className="space-y-6 pt-4 text-center animate-fade-in" id="ai-success">
          <div className="w-14 h-14 bg-green-950/50 border border-green-800 rounded-full flex items-center justify-center mx-auto text-green-400">
            <ShieldCheck size={32} />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white tracking-tight">Página criada com sucesso</h2>
            <p className="text-xs text-slate-400 font-medium">
              Sua Presell/Review foi devidamente gerada por Inteligência Artificial e publicada de forma automática.
            </p>
          </div>

          {/* Generated summary section strictly answering to the requested Success screen format */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl max-w-md mx-auto text-left space-y-3.5 shadow-2x">
            
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/60">
              <span className="text-slate-550 font-sans font-bold text-slate-400">Produto:</span>
              <span className="text-white font-extrabold text-sm">{successPage.productName}</span>
            </div>

            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/60">
              <span className="text-slate-550 font-sans font-bold text-slate-400">Tipo:</span>
              <span className="text-green-400 font-extrabold font-mono uppercase tracking-wide">{successPage.type || successPage.page_type}</span>
            </div>

            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/60">
              <span className="text-slate-550 font-sans font-bold text-slate-400">Status:</span>
              <span className="text-slate-950 bg-green-400 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider border border-green-300">
                {successPage.status || 'Publicada'}
              </span>
            </div>

            {/* URL FINAL DISPLAY */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-800/45">
              <h4 className="text-[11px] font-extrabold font-mono text-slate-350 tracking-wide text-slate-400 uppercase">URL FINAL</h4>
              <div className="bg-slate-950/90 border border-slate-800 rounded p-2.5 font-mono text-xs text-green-400 break-all select-all font-bold">
                {getPublishUrlDisplay(successPage)}
              </div>
            </div>

            {/* LINK DE AFILIADO CONFIGURADO */}
            <div className="space-y-1.5 pt-1.5 ">
              <h4 className="text-[11px] font-extrabold font-mono text-slate-350 tracking-wide text-slate-400 uppercase">LINK DE AFILIADO CONFIGURADO</h4>
              <div className="bg-slate-950/90 border border-slate-800 rounded p-2.5 font-mono text-xs text-slate-350 break-all select-all text-slate-300">
                {successPage.affiliate_link || affiliateLink || successPage.originalUrl}
              </div>
            </div>

          </div>

          {error && (
            <div className="p-3 bg-red-950/30 border border-red-900 rounded-lg text-xs text-red-400 max-w-md mx-auto text-left font-sans">
              {error}
            </div>
          )}

          {regenerateSuccess && (
            <div className="p-3 bg-green-950/30 border border-green-900 rounded-lg text-xs text-green-400 max-w-md mx-auto text-center font-sans font-semibold animate-pulse">
              ✓ Conteúdo da página e imagens atualizados com sucesso pela IA!
            </div>
          )}

          {/* ACTION BUTTONS REQUIRED BY THE USER */}
          <div className="space-y-3 max-w-md mx-auto pt-2">
            
            <div className="grid grid-cols-2 gap-3">
              
              {/* Button: Copiar Link */}
              <button
                type="button"
                onClick={() => handleCopyUrl(getPublishUrlDisplay(successPage))}
                className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={13} className="text-green-400" />}
                {copied ? "Copiado!" : "Copiar Link"}
              </button>

              {/* Button: Exportar Página */}
              <a
                href={`/api/pages/${successPage.id}/download`}
                download={`index-${successPage.slug}.html`}
                className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-250 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md text-slate-200"
              >
                <Download size={13} className="text-green-400" />
                Exportar Página
              </a>

            </div>

            <div className="grid grid-cols-3 gap-2">
              
              {/* Button: Abrir Página */}
              <a
                href={`/p/${successPage.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 py-3 px-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                <ExternalLink size={12} className="text-blue-400" />
                Abrir Página
              </a>

              {/* Button: Editar Página */}
              <button
                type="button"
                onClick={() => onEditPage(successPage.id)}
                className="flex items-center justify-center gap-1 py-3 px-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                <Edit3 size={12} className="text-yellow-400" />
                Editar Página
              </button>

              {/* Button: Regenerar Conteúdo */}
              <button
                type="button"
                disabled={isRegenerating}
                onClick={handleRegenerate}
                className="flex items-center justify-center gap-1 py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-755 text-white disabled:opacity-50 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                {isRegenerating ? (
                  <Loader2 size={12} className="animate-spin text-green-400" />
                ) : (
                  <RefreshCw size={12} className="text-green-400" />
                )}
                {isRegenerating ? "Reger..." : "Regenerar"}
              </button>

            </div>

            {/* Back Button */}
            <button
              onClick={onBack}
              className="w-full mt-2 py-3 bg-green-400 hover:bg-green-300 text-slate-950 text-xs font-black uppercase tracking-widest transition-all cursor-pointer rounded-xl shadow shadow-green-950/20"
            >
              Concluir & Voltar ao Painel
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
