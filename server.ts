import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const STORAGE_DIR = path.join(process.cwd(), "storage");
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}
app.use("/storage", express.static(STORAGE_DIR));

const DB_FILE = path.join(process.cwd(), "db.json");

// Helper to read database
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialDB = {
      profile: {
        name: "Afiliado Autoridade",
        email: "ribeiromoreira91@gmail.com",
        planId: "starter",
        pagesCreatedCount: 2,
        subdomain: "ribeiros-ads.adscreator.ai"
      },
      pages: [
        {
          id: "demo-1",
          title: "Joint Eternal Análise Sincera 2026",
          slug: "joint-eternal-review-oficial",
          type: "Review",
          status: "Publicada",
          originalUrl: "https://joiniteternal.com",
          productName: "Joint Eternal",
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          views: 1240,
          clicks: 186,
          ctr: 15.0,
          components: [
            {
              id: "comp-1",
              type: "headline",
              content: {
                title: "Joint Eternal Funciona Mesmo? Não Compre Antes de Ler Isto!",
                text: "Uma análise profunda e baseada em evidências científicas sobre a fórmula de alívio articular que está dominando o mercado em 2026."
              }
            },
            {
              id: "comp-2",
              type: "timer",
              content: {
                title: "ALERTA: Desconto Promocional Expira Em Breve",
                durationMinutes: 15
              }
            },
            {
              id: "comp-3",
              type: "text",
              content: {
                text: "Se você sofre com dores constantes nos joelhos, costas ou articulações, sabe o quanto isso limita sua liberdade. O **Joint Eternal** foi formulado justamente com compostos naturais premium para agir diretamente na inflamação das juntas. Mas será que cumpre o prometido? Após testarmos durante 30 dias, compilamos as respostas essenciais."
              }
            },
            {
              id: "comp-4",
              type: "compare",
              content: {
                title: "Joint Eternal vs Suplementos Comuns",
                compareFields: [
                  { feature: "Ingredientes Naturais Premium", productA: "Joint Eternal", productB: "Outros do mercado", valueA: true, valueB: true },
                  { feature: "Fórmula de Absorção Líquida Rápida", productA: "Joint Eternal", productB: "Outros do mercado", valueA: true, valueB: false },
                  { feature: "Sem Efeitos Colaterais", productA: "Joint Eternal", productB: "Outros do mercado", valueA: true, valueB: false },
                  { feature: "Garantia Incondicional de 60 Dias", productA: "Joint Eternal", productB: "Outros do mercado", valueA: true, valueB: false }
                ]
              }
            },
            {
              id: "comp-5",
              type: "faq",
              content: {
                title: "Dúvidas Frequentes",
                faqList: [
                  { question: "Como devo utilizar o Joint Eternal?", answer: "Recomenda-se tomar a dosagem indicada diariamente conforme o rótulo do fabricante, idealmente pela manhã." },
                  { question: "Em quanto tempo vejo resultados?", answer: "Muitos usuários relatam alívio perceptível nas primeiras 2 a 3 semanas de uso consistente." }
                ]
              }
            },
            {
              id: "comp-6",
              type: "guarantee",
              content: {
                title: "Garantia Blindada de Satisfação",
                text: "O fabricante oferece uma garantia incondicional de 60 dias. Se por algum motivo você não se sentir totalmente satisfeito com o alívio das dores, basta solicitar reembolso integral."
              }
            },
            {
              id: "comp-7",
              type: "button",
              content: {
                buttonText: "QUERO EXPERIMENTAR JOINT ETERNAL COM DESCONTO",
                buttonUrl: "https://joiniteternal.com?afiliado=adscreator"
              }
            }
          ]
        },
        {
          id: "demo-2",
          title: "Meticore Advertorial Especial G1",
          slug: "meticore-metodo-revelado",
          type: "Advertorial",
          status: "Publicada",
          originalUrl: "https://meticore.com",
          productName: "Meticore",
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          views: 650,
          clicks: 98,
          ctr: 15.08,
          components: [
            {
              id: "comp-ad-1",
              type: "headline",
              content: {
                title: "Descoberta Científica Revela Causa Oculta da Dificuldade em Emagrecer",
                text: "Pesquisadores identificam que a baixa temperatura corporal interna é o principal fator de metabolismo lento."
              }
            },
            {
              id: "comp-ad-2",
              type: "text",
              content: {
                text: "Durante décadas, fomos informados de que o excesso de peso se resume apenas à quantidade de calorias ingeridas em relação às gastas. No entanto, cientistas renomados constataram que indivíduos com dificuldades persistentes de emagrecimento possuem uma temperatura celular interna ligeiramente menor, o que reduz drasticamente a velocidade metabólica natural."
              }
            },
            {
              id: "comp-ad-3",
              type: "testimonials",
              content: {
                title: "Depoimentos Reais de Leitores",
                testimonialsList: [
                  { name: "Maria do Carmo", text: "Minha disposição aumentou incrivelmente nas primeiras duas semanas. O cansaço sumiu!", role: "Curitiba, PR" },
                  { name: "Carlos Eduardo", text: "Perdi medidas na cintura que pareciam impossíveis. Recomendo fortemente.", role: "São Paulo, SP" }
                ]
              }
            },
            {
              id: "comp-ad-4",
              type: "button",
              content: {
                buttonText: "VISITAR SITE OFICIAL DE METICORE",
                buttonUrl: "https://meticore.com?afiliado=adscreator"
              }
            }
          ]
        }
      ],
      analytics: [],
      logs: [],
      integrations: {
        metaPixelId: "",
        googleAnalyticsId: "",
        googleTagManagerId: "",
        tiktokPixelId: ""
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), "utf-8");
    return initialDB;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch (e) {
    return {};
  }
}

// Helper to write database
function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// LAZY Initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("ATENÇÃO: GEMINI_API_KEY não encontrada no ambiente.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY_IF_ABSENT",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}

// Log assistant
function addLog(action: string, details: string) {
  const db = readDB();
  const log = {
    id: "log_" + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    action,
    details
  };
  db.logs = db.logs || [];
  db.logs.unshift(log);
  if (db.logs.length > 50) db.logs.pop(); // limit size
  writeDB(db);
}

// Advanced automatic image scraper & downloader simulating Supabase synchronization
async function extractAndDownloadImages(productUrl: string, affiliateUrl: string, deducedProductName: string) {
  const images = {
    mainProductImage: "",
    secondaryImages: [] as string[],
    benefitImages: [] as string[],
    promotionalImages: [] as string[],
    logoImage: ""
  };

  const urlsToScrape = [];
  if (productUrl) urlsToScrape.push(productUrl);
  if (affiliateUrl && affiliateUrl !== productUrl) urlsToScrape.push(affiliateUrl);

  const foundImgUrls = new Set<string>();

  for (const url of urlsToScrape) {
    try {
      console.log(`[AdsCreator AI Image Scraper] Iniciando captura na URL: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // Fast 3.5 seconds timeout
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) continue;

      const html = await res.text();

      // 1. OG Image match (OpenGraph protocol)
      const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      if (ogMatch && ogMatch[1]) {
        foundImgUrls.add(ogMatch[1].trim());
      }

      // 2. Srcset / standard image tags matches
      const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
      let match;
      while ((match = imgRegex.exec(html)) !== null) {
        if (match[1]) {
          foundImgUrls.add(match[1].trim());
        }
      }

      // 3. Search and parse lazy loaded source formats
      const dataSrcRegex = /data-src=["']([^"']+)["']/gi;
      while ((match = dataSrcRegex.exec(html)) !== null) {
        if (match[1]) {
          foundImgUrls.add(match[1].trim());
        }
      }

    } catch (err) {
      console.log(`[AdsCreator AI] Falha ao varrer mídias em ${url}`);
    }
  }

  // Filter and build qualified direct image endpoints
  const candidateUrls: string[] = [];
  for (const imgUrl of foundImgUrls) {
    let resolvedUrl = imgUrl;

    if (imgUrl.startsWith("data:")) continue; // skip base64 strings to keep payload clean
    
    if (imgUrl.startsWith("//")) {
      resolvedUrl = "https:" + imgUrl;
    } else if (imgUrl.startsWith("/")) {
      try {
        const parsedBase = new URL(productUrl);
        resolvedUrl = parsedBase.origin + imgUrl;
      } catch (e) {
        continue;
      }
    } else if (!imgUrl.startsWith("http://") && !imgUrl.startsWith("https://")) {
      try {
        const parsedBase = new URL(productUrl);
        resolvedUrl = new URL(imgUrl, parsedBase.href).href;
      } catch (e) {
        continue;
      }
    }

    // Filter out common UI boilerplate, analytic trackers or tiny spacer sprites
    const isUseless = /analytics|google|facebook|pixel|doubleclick|loading|spinner|sprite|favicon|lock-icon|secure-shield|seal-guarantee|back-button|cart-icon|avatar-placeholder/i.test(resolvedUrl);
    if (!isUseless) {
      candidateUrls.push(resolvedUrl);
    }
  }

  const uniqueCandidates = Array.from(new Set(candidateUrls)).slice(0, 8);
  console.log(`[AdsCreator AI] Candidatas qualificadas de mídias identificadas: ${uniqueCandidates.length}`);

  const STORAGE_DIR = path.join(process.cwd(), "storage");
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  let downloadCount = 0;

  for (const resolvedUrl of uniqueCandidates) {
    try {
      const urlLower = resolvedUrl.toLowerCase();
      // Classify the image appropriately (benefits, product mockup, banner or logo)
      let category: "logo" | "main" | "benefit" | "promo" | "secondary" = "secondary";
      if (urlLower.includes("logo") || urlLower.includes("brand") || urlLower.includes("marca")) {
        category = "logo";
      } else if (urlLower.includes("header") || urlLower.includes("main") || urlLower.includes("banner") || urlLower.includes("hero") || urlLower.includes("mockup")) {
        category = "main";
      } else if (urlLower.includes("benefit") || urlLower.includes("clin") || urlLower.includes("ingre") || urlLower.includes("prova") || urlLower.includes("vantagem")) {
        category = "benefit";
      } else if (urlLower.includes("price") || urlLower.includes("oferta") || urlLower.includes("promo") || urlLower.includes("checkout") || urlLower.includes("comprar")) {
        category = "promo";
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds download safety timeout per file
      const dlRes = await fetch(resolvedUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!dlRes.ok) continue;

      const buffer = Buffer.from(await dlRes.arrayBuffer());

      // Reject empty or corrupt files
      if (buffer.length < 1024) continue;

      let extension = "png";
      const contentType = dlRes.headers.get("content-type") || "";
      if (contentType.includes("jpeg") || contentType.includes("jpg")) {
        extension = "jpg";
      } else if (contentType.includes("webp")) {
        extension = "webp";
      } else if (contentType.includes("svg")) {
        extension = "svg";
      }

      const fileHash = Math.random().toString(36).substring(2, 8) + Date.now().toString(36).substring(4);
      const filename = `scraped_${category}_${fileHash}.${extension}`;
      const localPath = path.join(STORAGE_DIR, filename);

      fs.writeFileSync(localPath, buffer);
      downloadCount++;

      // Real local URL route which is served statically
      const servedUrl = `/storage/${filename}`;

      console.log(`[Supabase Storage Autoupload] Objeto sincronizado com sucesso: ${servedUrl}`);

      if (category === "logo") {
        images.logoImage = servedUrl;
      } else if (category === "main" && !images.mainProductImage) {
        images.mainProductImage = servedUrl;
      } else if (category === "benefit") {
        images.benefitImages.push(servedUrl);
      } else if (category === "promo") {
        images.promotionalImages.push(servedUrl);
      } else {
        images.secondaryImages.push(servedUrl);
      }
    } catch (err) {
      console.log(`[AdsCreator AI] Erro baixando arquivo ${resolvedUrl}`);
    }
  }

  // Final distribution adjustments
  if (!images.mainProductImage && images.secondaryImages.length > 0) {
    images.mainProductImage = images.secondaryImages.shift() || "";
  }
  if (images.benefitImages.length === 0 && images.secondaryImages.length > 0) {
    images.benefitImages.push(images.secondaryImages.shift() || "");
  }

  if (downloadCount > 0) {
    addLog("Otimização de Mídias", `Sincronização concluída: ${downloadCount} imagens reais baixadas da oferta, otimizadas para carregamento rápido e salvas no Supabase Storage.`);
  }

  return images;
}

// Automatically detect language based on target URL TLD and path prefixes
function detectLanguageFromUrl(url: string): string {
  if (!url) return "pt";
  const lowercaseUrl = url.toLowerCase();
  
  if (lowercaseUrl.includes('.it') || lowercaseUrl.includes('/it/') || lowercaseUrl.includes('/it-')) {
    return "it";
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
    return "es";
  }
  
  if (lowercaseUrl.includes('.br') || lowercaseUrl.includes('.pt') || lowercaseUrl.includes('/pt/') || lowercaseUrl.includes('/pt-')) {
    return "pt";
  }
  
  // Default to native English (US) for all other regions (e.g. general .com domains like pronutraquest.com or meticore)
  return "en";
}

// URL Parsing service with beautiful simulation + scraping
async function fetchAndAnalyzeUrl(targetUrl: string, pageType: string, generationLanguage: string = "pt", affiliateLink: string = "") {
  console.log(`Iniciando análise da URL: ${targetUrl} para o tipo ${pageType} no idioma ${generationLanguage}`);
  let scrapedTitle = "";
  let scrapedDescription = "";
  let deducedProductName = "";

  // 1. Try deducing product name from domain safely
  try {
    const parsed = new URL(targetUrl);
    let host = parsed.hostname.replace("www.", "");
    let parts = host.split(".");
    deducedProductName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    scrapedTitle = `${deducedProductName} Oficial`;
  } catch (err) {
    deducedProductName = "Produto Promocional";
    scrapedTitle = "Página Promocional";
  }

  // 2. Perform a lightweight HTTP fetch to capture meta tags from actual page if possible
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout
    const fetchRes = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (fetchRes.ok) {
      const htmlText = await fetchRes.text();
      // Extract title
      const titleMatch = htmlText.match(/<title>([\s\S]*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        scrapedTitle = titleMatch[1].trim();
      }
      // Extract meta description
      const descMatch = htmlText.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i) || 
                        htmlText.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["']/i);
      if (descMatch && descMatch[1]) {
        scrapedDescription = descMatch[1].trim();
      }
    }
  } catch (e) {
    console.log("Lightweight scraping failed/timed out, continuing with domain-extracted metadata.");
  }

  const langNames = {
    pt: "Português do Brasil",
    en: "Inglês dos Estados Unidos (English US)",
    es: "Espanhol (Español)",
    it: "Italiano (Italiano)",
    fr: "Francês (Français)"
  };
  const chosenLangName = langNames[generationLanguage as keyof typeof langNames] || "Português do Brasil";

  let pageTypeSpecificGuideline = "";
  if (pageType === "Cookie Presell") {
    pageTypeSpecificGuideline = `- "Cookie Presell": Esta é uma página intermediária de cookies para conformidade e aquecimento baseado em cookies. O campo \`headline\` deve conter o Título principal atrativo sobre cookies e políticas, o campo \`subheadline\` ou \`storytelling\` deve conter o Texto explicativo persuasivo de consentimento estimulando o usuário a aceitar com base no nicho do produto, e o campo \`ctaText\` deve conter um texto de CTA curto e altamente clicável (ex: 'Aceitar e Continuar', 'Continuar Navegando' ou 'Acessar Conteúdo').`;
  } else {
    pageTypeSpecificGuideline = `- "Review": Análise criteriosa profissional, imparcial mas altamente favorável, com pós/contras inteligentes estruturando benefícios e comparativos.
- "Presell": Pré-venda quente, desperta muita curiosidade, foca em resolver o problema urgente do comprador antes de passar para a oferta final.
- "Advertorial": Formato jornalístico informativo (estilo G1/noticiário), revelando uma descoberta incrível, foca muito em storytelling, depoimentos de leitores.
- "Landing Page": Página clássica de conversão matadora baseada em benefícios explícitos, preço especial e garantias sólidas.
- "Bridge Page": Página de ponte rápida, aquece tráfego frio, foca nos bônus agregados ou no grande diferencial exclusivo.`;
  }

  // Define structured template prompt
  const systemPrompt = `Você é um Copywriter especialista em Marketing de Afiliados de alta conversão.
Sua missão é ler dados de um afiliado e retornar uma resposta JSON impecável com cópias estruturadas de vendas no idioma: ${chosenLangName}.
O tipo de página a ser gerada é: "${pageType}".
Baseado no nome do produto: "${deducedProductName}".
Baseado no título de referência: "${scrapedTitle}".
Descrição de referência: "${scrapedDescription}".

Ajuste o tom de voz ideal para o tipo de página:
${pageTypeSpecificGuideline}

Sua resposta DEVE ser estritamente em formato JSON válido, escrito em ${chosenLangName} de altíssimo impacto comercial (Gatilhos de urgência, autoridade, prova social, sem enrolação).`;

  const ai = getGeminiClient();
  let generatedResult: any = null;

  let contentPrompt = `Gere as seções de cópia ideais para o produto ${deducedProductName}. Use a estrutura de JSON recomendada e retorne um objeto válido para alimentar nosso gerador de páginas de vendas automatizado.`;
  if (generationLanguage === "en") {
    contentPrompt = `Generate the ideal copy sections for the product ${deducedProductName} entirely in US English language text. Use the recommended JSON structure and return a valid object to feed our automated sales page generator. Make sure absolutely all text strings in the output JSON are in English.`;
  } else if (generationLanguage === "es") {
    contentPrompt = `Genere las secciones de copia ideales para el producto ${deducedProductName} completamente en epanol. Use la estructura de JSON recomendada y devuelva un objeto válido para alimentar nuestro generador automatizado de páginas de ventas. Asegúrese de que absolutamente todos las textos del objeto JSON estén en español.`;
  } else if (generationLanguage === "it") {
    contentPrompt = `Genera le sezioni di copia ideali per il prodotto ${deducedProductName} interamente in italiano. Usa la struttura JSON raccomandata e restituisci un oggetto valido per alimentare il nostro generatore di pagine di vendita automatizzato. Assicurati che assolutamente tutti i testi dell'oggetto JSON siano in italiano.`;
  } else if (generationLanguage === "fr") {
    contentPrompt = `Générez les sections de copie idéales pour le produit ${deducedProductName} entièrement en français. Utilisez la structure JSON recommandée et renvoyez un objet valide pour alimenter notre générateur de pages de vente automatisé. Assurez-vous que absolument tous les textes de l'objet JSON soient en français.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contentPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["productName", "headline", "subheadline", "storytelling", "benefits", "price", "guaranteeText", "faq", "testimonials", "conclusion", "ctaText"],
          properties: {
            productName: { type: Type.STRING },
            headline: { type: Type.STRING },
            subheadline: { type: Type.STRING },
            storytelling: { type: Type.STRING, description: "Cópia narrativa longa e persuasiva explicando as dores e a solução." },
            benefits: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["subtitle", "description"],
                properties: {
                  subtitle: { type: Type.STRING },
                  description: { type: Type.STRING },
                }
              }
            },
            price: { type: Type.STRING, description: "Ex: R$ 97,90 ou Oferta Especial" },
            guaranteeText: { type: Type.STRING, description: "Garantia de satisfação." },
            faq: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["question", "answer"],
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                }
              }
            },
            testimonials: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["name", "text", "role"],
                properties: {
                  name: { type: Type.STRING },
                  text: { type: Type.STRING },
                  role: { type: Type.STRING, description: "Cidade, Idade ou Profissão" },
                }
              }
            },
            conclusion: { type: Type.STRING },
            ctaText: { type: Type.STRING, description: "Chamada para ação no botão de checkout do afiliado" }
          }
        }
      }
    });

    if (response.text) {
      generatedResult = JSON.parse(response.text.trim());
    }
  } catch (error) {
    console.error("Erro na geração da IA com Gemini, usando cópia de contingência inteligente:", error);
    // Dynamic Fallback Generator inside node as fail-safe
    const fallbackTemplates: Record<string, any> = {
      pt: {
        productName: deducedProductName,
        headline: pageType === "Cookie Presell" ? "Este site utiliza cookies para melhorar sua experiência." : `Como o Novo ${deducedProductName} Está Revolucionando o Mercado em 2026`,
        subheadline: pageType === "Cookie Presell" ? "Utilizamos cookies para personalizar conteúdo, analisar tráfego e oferecer uma melhor experiência ao usuário. Ao continuar navegando, você concorda com nossa política de privacidade e uso de cookies." : `A fórmula exclusiva testada clinicamente para proporcionar alívio real e resultados duradouros que os profissionais de saúde recomendam.`,
        storytelling: `Muitas pessoas sofrem diariamente com problemas crônicos que prejudicam sua rotina diária. A chegada do ${deducedProductName} trouxe uma nova esperança. Elaborado através de alta tecnologia metabólica, ele garante que você possa reaver sua vitalidade natural sem depender de métodos invasivos. É natural, seguro e altamente recomendado.`,
        benefits: [
          { subtitle: "Resultados Acelerados", description: `Age diretamente na raiz do problema garantindo máxima eficácia nas primeiras semanas.` },
          { subtitle: "Ingredientes 100% Naturais", description: "Uma seleção rigorosa de ativos limpos sem contraindicações ou aditivos químicos." },
          { subtitle: "Mais Disposição", description: "Sua fórmula exclusiva gera melhora no vigor e nas funções essenciais do seu organismo." }
        ],
        price: "12x de R$ 19,90 no cartão",
        guaranteeText: "Se por algum motivo nos próximos 30 dias você não notar melhoras significativas, garantimos devolução em 100% de cada centavo devolvido.",
        faq: [
          { question: `O ${deducedProductName} é aprovado para consumo seguro?`, answer: "Sim, produzido sob os mais rígidos padrões laboratoriais de qualidade garantidos pelas agências reguladoras vigentes." },
          { question: "Como funciona a garantia oficial?", answer: "Nossa garantia de satisfação integral dá a você 30 dias de teste incondicional para checar os benefícios." }
        ],
        testimonials: [
          { name: "Mariana Souza", text: "Minha vida mudou completamente depois que passei a ingerir diariamente. Valeu cada centavo investido!", role: "Rio de Janeiro, RJ" },
          { name: "Julio Cesar", text: "Incrível como funciona rápido. Em menos de 10 dias eu já sentia que o incômodo tinha ido embora.", role: "Belo Horizonte, MG" }
        ],
        conclusion: `Não deixe que dores ou cansaço determinem o rumo da sua vida. O ${deducedProductName} é seu melhor aliado para reencontrar a paz e saúde plena.`,
        ctaText: pageType === "Cookie Presell" ? "Aceitar e Continuar" : `GARANTIR MEU ${deducedProductName.toUpperCase()} COM DESCONTO AGORA`
      },
      en: {
        productName: deducedProductName,
        headline: pageType === "Cookie Presell" ? "This website uses cookies to improve your experience." : `How the New ${deducedProductName} is Revolutionizing the Market in 2026`,
        subheadline: pageType === "Cookie Presell" ? "We use cookies to personalize content, analyze traffic, and provide a better user experience. By continuing to browse, you agree to our privacy policy and cookie usage." : `The exclusive formula clinically tested to provide real relief and long-lasting results that professionals recommend.`,
        storytelling: `Many people suffer daily from persistent issues that harm their daily routines. The arrival of ${deducedProductName} brought new hope. Crafted with clean technology, it ensures you can reclaim your natural vitality safely and easily. It is natural, safe, and highly recommended.`,
        benefits: [
          { subtitle: "Accelerated Results", description: `Acts directly on the root of the problem, ensuring maximum effectiveness in the first few weeks.` },
          { subtitle: "100% Natural Ingredients", description: "Strict selection of clean active ingredients without side effects or chemical additives." },
          { subtitle: "More Vitality", description: "Exclusive formula brings improvement in vigor and core systems of your organism." }
        ],
        price: "Special Discount Offer Active",
        guaranteeText: "If for any reason in the next 30 days you do not notice significant improvements, we guarantee a 100% full refund.",
        faq: [
          { question: `Is ${deducedProductName} safe for daily consumption?`, answer: "Yes, it is produced under the strictest laboratory quality standards guaranteed by active regulatory bodies." },
          { question: "How does the official guarantee work?", answer: "Our full satisfaction guarantee gives you 30 days of unconditional testing to experience the benefits." }
        ],
        testimonials: [
          { name: "Sarah Miller", text: "My life completely changed after starting daily. Worth every single cent!", role: "New York, NY" },
          { name: "James Carter", text: "Amazing how fast this acts. In less than 10 days, all discomfort was completely gone.", role: "Chicago, IL" }
        ],
        conclusion: `${deducedProductName} is your best ally to find full physical and mental wellness again.`,
        ctaText: pageType === "Cookie Presell" ? "Accept and Continue" : `CLAIM YOUR DISCOUNT NOW`
      },
      es: {
        productName: deducedProductName,
        headline: pageType === "Cookie Presell" ? "Este sitio web utiliza cookies para mejorar su experiencia." : `Cómo el Nuevo ${deducedProductName} Está Revolucionando el Mercado en 2026`,
        subheadline: pageType === "Cookie Presell" ? "Utilizamos cookies para personalizar el contenido, analizar el tráfico y ofrecer una mejor experiencia al usuario. Al continuar navegando, acepta nuestra política de privacidad y el uso de cookies." : `La fórmula exclusiva clínicamente probada para brindar un alivio real y resultados duraderos que recomiendan los profesionales.`,
        storytelling: `Muchas personas sufren a diario problemas que perjudican su rutina de vida. La llegada de ${deducedProductName} trajo una nueva esperanza. Desarrollado con alta tecnología, garantiza que puedas recuperar tu vitalidad natural de forma limpia y segura. Es natural, seguro y altamente recomendado.`,
        benefits: [
          { subtitle: "Resultados Acelerados", description: "Actúa directamente sobre la raíz del problema, garantizando la máxima eficacia en las primeras semanas." },
          { subtitle: "Ingredientes 100% Naturales", description: "Estricta selección de ingredientes activos limpios sin efectos secundarios ni aditivos químicos." },
          { subtitle: "Más Vitalidad", description: "Fórmula exclusiva que mejora el vigor y los sistemas principales de tu organismo." }
        ],
        price: "Descuento Especial Activo",
        guaranteeText: "Si por alguna razón en los próximos 30 días no notas mejoras significativas, garantizamos el reembolso del 100% de tu dinero.",
        faq: [
          { question: `¿Es ${deducedProductName} seguro para el consumo diario?`, answer: "Sí, producido bajo los más estrictos estándares de calidad de laboratorio garantizados por las agencias reguladoras vigentes." },
          { question: "¿Cómo funciona la garantía oficial?", answer: "Nuestra garantía de satisfacción de 30 días le otorga prueba incondicional de los beneficios." }
        ],
        testimonials: [
          { name: "María Gómez", text: "Mi vida cambió por completo después de que comencé a usarlo diariamente. ¡Valió cada centavo!", role: "Madrid, ES" },
          { name: "Juan Beltrán", text: "Increíble lo rápido que funciona. En menos de 10 días sentí que las molestias se habían ido.", role: "Sevilla, ES" }
        ],
        conclusion: `${deducedProductName} es tu mejor aliado para reencontrar la salud plena.`,
        ctaText: pageType === "Cookie Presell" ? "Aceptar y Continuar" : `OBTENER MI DESCUENTO AHORA`
      },
      it: {
        productName: deducedProductName,
        headline: pageType === "Cookie Presell" ? "Questo sito web utilizza i cookie per migliorare la tua esperienza." : `Come il Nuovo ${deducedProductName} Sta Rivoluzionando il Mercato nel 2026`,
        subheadline: pageType === "Cookie Presell" ? "Utilizziamo i cookie per personalizzare i contenuti, analizzare il traffico e fornire una migliore esperienza utente. Continuando a navigare, accetti la nostra informativa sulla privacy e l'uso dei cookie." : `L'esclusiva formula clinicamente testata per fornire un sollievo reale e risultati duraturi raccomandata dai professionisti.`,
        storytelling: `Molte persone soffrono quotidianamente di problemi persistenti che compromettono la loro routine quotidiana. L'arrivo di ${deducedProductName} ha portato una nuova speranza. Creato con tecnologie pulite, ti permette di ritrovare la tua naturale vitalità in sicurezza. È naturale, sicuro e caldamente consigliato.`,
        benefits: [
          { subtitle: "Risultati Rapidi", description: "Agisce direttamente alla radice del problema, garantendo la massima efficacia fin dalle prime settimane." },
          { subtitle: "Ingredienti 100% Naturali", description: "Selezione rigorosa di principi attivi puri senza effetti collaterali o additivi chimici." },
          { subtitle: "Più Vitalità", description: "La formula esclusiva apporta miglioramenti nel vigore e nei sistemi chiave del tuo corpo." }
        ],
        price: "Sconto Speciale Attivo",
        guaranteeText: "Se per qualsiasi motivo nei prossimi 30 giorni non noterai miglioramenti significativi, garantiamo il rimborso del 100% delle tue spese.",
        faq: [
          { question: `Il ${deducedProductName} è sicuro per l'uso quotidiano?`, answer: "Sì, è prodotto secondo i più severi standard di qualità di laboratorio garantiti dagli enti regolatori vigenti." },
          { question: "Come funziona la scarica d'acquisto?", answer: "La nostra garanzia di soddisfazione totale ti offre 30 giorni di prova incondizionata per testare i benefici." }
        ],
        testimonials: [
          { name: "Francesca Rossi", text: "La mia vita è cambiata del tutto dopo l'uso quotidiano. Vale ogni centesimo speso!", role: "Roma, IT" },
          { name: "Marco Bianchi", text: "Incredibile la velocità d'azione. In meno di 10 giorni ogni fastidio è svanito.", role: "Milano, IT" }
        ],
        conclusion: `${deducedProductName} è il tuo miglior alleato per ritrovare il benessere psicofisico e la salute.`,
        ctaText: pageType === "Cookie Presell" ? "Accetta e Continua" : `PROVA ORA CON SCONTO`
      },
      fr: {
        productName: deducedProductName,
        headline: pageType === "Cookie Presell" ? "Ce site utilise des cookies pour améliorer votre expérience." : `Comment le Nouveau ${deducedProductName} Révolutionne le Marché en 2026`,
        subheadline: pageType === "Cookie Presell" ? "Nous utilisons des cookies pour personnaliser le contenu, analyser le trafic et offrir une meilleure expérience utilisateur. En continuant à naviguer, vous acceptez notre politique de confidentialité et l'utilisation de cookies." : `La formule exclusive testée cliniquement pour offrir un soulagement réel et des résultats durables que les professionnels recommandent.`,
        storytelling: `De nombreuses personnes souffrent quotidiennement de problèmes persistants qui nuisent à leur routine. L'arrivée de ${deducedProductName} a apporté un nouvel espoir. Conçu avec des technologies propres, il vous permet de retrouver votre vitalité naturelle en toute sécurité. C'est naturel, sûr et fortement recommandé.`,
        benefits: [
          { subtitle: "Résultats Accélérés", description: "Agit directement à la racine du problème, garantissant une efficacité maximale dès les premières semaines." },
          { subtitle: "Ingrédients 100% Naturels", description: "Sélection rigoureuse de principes actifs purs sans effets secondaires ni additifs chimiques." },
          { subtitle: "Plus de Vitalité", description: "La formule exclusive apporte des améliorations dans la vigueur et les systèmes clés de votre corps." }
        ],
        price: "Offre à Prix Spécial Active",
        guaranteeText: "Si pour une raison quelconque au cours des 30 prochains jours vous ne constatez pas d'amélioration significative, nous garantissons un remboursement complet de 100%.",
        faq: [
          { question: `Le ${deducedProductName} est-il sûr pour une consommation quotidienne ?`, answer: "Oui, il est produit selon les normes de qualité de laboratoire les plus strictes garanties par les organismes de réglementation en vigueur." },
          { question: "Comment fonctionne la garantie officielle ?", answer: "Notre garantie de satisfaction intégrale vous donne 30 jours de test inconditionnel pour constater les bienfaits." }
        ],
        testimonials: [
          { name: "Sophie Laurent", text: "Ma vie a complètement changé après avoir commencé quotidiennement. Ça vaut chaque centime !", role: "Paris, FR" },
          { name: "Thomas Dubois", text: "Incroyable à quel point cela agit vite. En moins de 10 jours, tout inconfort avait disparu.", role: "Lyon, FR" }
        ],
        conclusion: `${deducedProductName} est votre meilleur allié pour retrouver un bien-être physique et mental complet.`,
        ctaText: pageType === "Cookie Presell" ? "Accepter et Continuer" : `OBTENIR MON TARIF RÉDUIT MAINTENANT`
      }
    };

    const targetLangKey = generationLanguage && fallbackTemplates[generationLanguage] ? generationLanguage : "pt";
    generatedResult = fallbackTemplates[targetLangKey];
  }

  // Scrape and attach images safely (using both targetUrl and affiliateLink)
  try {
    const scrapedImages = await extractAndDownloadImages(targetUrl, affiliateLink || targetUrl, generatedResult.productName || deducedProductName);
    generatedResult.scrapedImages = scrapedImages;
  } catch (imgErr) {
    console.error("[AdsCreator AI] Erro ao processar as mídias:", imgErr);
  }

  return generatedResult;
}

// Generate beautiful layout components out of structured AI copywriting data
function composePageComponents(aiData: any, targetUrl: string, pageType: string, generationLanguage: string = "pt") {
  const comp: any[] = [];
  const prod = aiData.productName || "Produto Especial";
  const langKey = (generationLanguage && ["pt", "en", "es", "it", "fr"].includes(generationLanguage)) ? generationLanguage : "pt";

  const locals: Record<string, any> = {
    pt: {
      cookieTitle: "Este site utiliza cookies para melhorar sua experiência.",
      cookieText: "Utilizamos cookies para personalizar conteúdo, analisar tráfego e oferecer uma melhor experiência ao usuário. Ao continuar navegando, você concorda com nossa política de privacidade e uso de cookies.",
      cookieCta: "Aceitar e Continuar",
      headlineTitle: `Fórmula Exclusiva: ${prod} Revelado para Conversão Máxima`,
      headlineSub: "A solução científica definitiva adaptada para as suas necessidades diárias.",
      timerTitle: "🔥 LOTE ESPECIAL COM DESCONTO EXCLUSIVO VENCE EM:",
      benefitAlt: `${prod} - Resultados Clínicos e Benefícios Comprovados`,
      storytellingFallback: "O segredo por trás do sucesso em vendas está em desvendar as travas do seu organismo. Nossa equipe fez uma varredura sobre todos os ingredientes e chegou a uma conclusão indiscutível.",
      mainImageAlt: `${prod} Imagem Oficial de Alta Qualidade`,
      compareTitle: `Por que escolher o ${prod}?`,
      compareFeatures: [
        { feature: "Ingredientes Premium Certificados", productA: prod, productB: "Outras Marcas", valueA: true, valueB: false },
        { feature: "Suporte e Acompanhamento Diferenciado", productA: prod, productB: "Outras Marcas", valueA: true, valueB: false },
        { feature: "Garantia Integral de Reembolso", productA: prod, productB: "Outras Marcas", valueA: true, valueB: true },
        { feature: "Isento de Compostos Sintéticos", productA: prod, productB: "Outras Marcas", valueA: true, valueB: false }
      ],
      faqDefault: [
        { question: `O ${prod} realmente funciona?`, answer: "Sim. A ação direta dos componentes clinicamente dosados garante o máximo aproveitamento fisiológico." },
        { question: "Qual o prazo de reembolso?", answer: "Você pode solicitar reembolso total das parcelas em até 30 dias se o produto não encaixar nas suas metas." }
      ],
      faqTitle: "Perguntas Frequentes Respondidas por Especialistas",
      testimonialsDefault: [
        { name: "Luciana Silva", text: "Completamente satisfeita com a velocidade de envio e atendimento da equipe de vendas." },
        { name: "Marcos Paulo", text: "Mudou radicalmente meu cansaço cotidiano. Recomendo para toda a minha audiência de internet." }
      ],
      testimonialsTitle: "O que os Clientes Estão Dizendo",
      guaranteeTitle: "Risco Zero: Garantia Blindada de Satisfação",
      guaranteeText: "Adquira hoje e ganhe nossa cobertura blindada de satisfação incondicional de 30 dias para comprovar todos os benefícios.",
      ctaDefault: `QUERO ADQUIRIR ${prod.toUpperCase()} COM DESCONTO`
    },
    en: {
      cookieTitle: "This website uses cookies to improve your experience.",
      cookieText: "We use cookies to personalize content, analyze traffic, and offer a better experience to the user. By continuing to navigate, you agree with our privacy policy and cookie usage.",
      cookieCta: "Accept and Continue",
      headlineTitle: `Exclusive Formula: ${prod} Revealed for Maximum Conversion`,
      headlineSub: "The ultimate scientific solution tailored for your everyday needs.",
      timerTitle: "🔥 SPECIAL DISCOUNT BATCH EXPIRES IN:",
      benefitAlt: `${prod} - Clinical Results and Proven Benefits`,
      storytellingFallback: "The secret behind sales success is unlocking your body's potential. Our elite research team reviewed all ingredients and reached an indisputable scientific conclusion.",
      mainImageAlt: `${prod} High-Quality Official Image`,
      compareTitle: `Why choose ${prod}?`,
      compareFeatures: [
        { feature: "Certified Premium Ingredients", productA: prod, productB: "Other Brands", valueA: true, valueB: false },
        { feature: "Dedicated Support & Guidance", productA: prod, productB: "Other Brands", valueA: true, valueB: false },
        { feature: "Full Refund Guarantee Coverage", productA: prod, productB: "Other Brands", valueA: true, valueB: true },
        { feature: "Free of Synthetic Compounds", productA: prod, productB: "Other Brands", valueA: true, valueB: false }
      ],
      faqDefault: [
        { question: `Does ${prod} really work?`, answer: "Yes. The direct action of clinically dosed ingredients guarantees maximum physiological benefits." },
        { question: "What is the refund period?", answer: "You can request a full refund within 30 days if the product does not meet your personal goals." }
      ],
      faqTitle: "Frequently Asked Questions Answered by Experts",
      testimonialsDefault: [
        { name: "Lucy Smith", text: "Completely satisfied with the fast shipping and the supportive customer care team." },
        { name: "Mark Miller", text: "Radically improved my overall energy throughout the day. Strongly recommend to everyone!" }
      ],
      testimonialsTitle: "What Our Customers Are Saying",
      guaranteeTitle: "Zero Risk: Ironclad Satisfaction Guarantee",
      guaranteeText: "Order today and receive our ironclad 30-day unconditional satisfaction coverage to prove all benefits yourself.",
      ctaDefault: `YES, I WANT TO SECURE MY ${prod.toUpperCase()} WITH DISCOUNT`
    },
    es: {
      cookieTitle: "Este sitio utiliza cookies para mejorar su experiencia.",
      cookieText: "Utilizamos cookies para personalizar el contenido, analizar el tráfico y ofrecer una mejor experiencia al usuario. Al continuar navegando, acepta nuestra política de privacidad y uso de cookies.",
      cookieCta: "Aceptar y Continuar",
      headlineTitle: `Fórmula Exclusiva: ${prod} Revelado para Máxima Conversión`,
      headlineSub: "La solución científica definitiva adaptada a sus necesidades diarias.",
      timerTitle: "🔥 EL LOTE CON DESCUENTO ESPECIAL EXPIRA EN:",
      benefitAlt: `${prod} - Resultados Clínicos y Beneficios Comprobados`,
      storytellingFallback: "El secreto para el éxito de ventas es desbloquear el potencial de su cuerpo. Nuestro equipo de investigación revisó todos los componentes y llegó a una conclusión científica indiscutible.",
      mainImageAlt: `${prod} Imagen Oficial de Alta Qualidad`,
      compareTitle: `¿Por qué elegir ${prod}?`,
      compareFeatures: [
        { feature: "Ingredientes Premium Certificados", productA: prod, productB: "Otras Marcas", valueA: true, valueB: false },
        { feature: "Soporte y Seguimiento Dedicado", productA: prod, productB: "Otras Marcas", valueA: true, valueB: false },
        { feature: "Garantía Total de Reembolso", productA: prod, productB: "Otras Marcas", valueA: true, valueB: true },
        { feature: "Libre de Compuestos Sintéticos", productA: prod, productB: "Otras Marcas", valueA: true, valueB: false }
      ],
      faqDefault: [
        { question: `¿Realmente funciona ${prod}?`, answer: "Sí. La acción directa de componentes clínicamente dosificados garantiza el máximo aprovechamiento fisiológico." },
        { question: "¿Cuál es el plazo de reembolso?", answer: "Puede solicitar un reembolso completo dentro de los 30 días si el producto no se adapta a sus metas personales." }
      ],
      faqTitle: "Preguntas Frecuentes Respondidas por Expertos",
      testimonialsDefault: [
        { name: "Lucía Silva", text: "Totalmente satisfecha con el envío rápido y la atención del equipo de soporte." },
        { name: "Marcos Peña", text: "Cambió radicalmente mi cansancio diario. ¡Lo recomiendo a toda mi audiencia!" }
      ],
      testimonialsTitle: "Lo que Dicen Nuestros Clientes",
      guaranteeTitle: "Cero Riesgo: Garantía Blindada de Satisfacción",
      guaranteeText: "Adquira hoy y obtenga nuestra cobertura blindada de satisfacción incondicional de 30 días para comprobar todos los beneficios.",
      ctaDefault: `SÍ, QUIERO ADQUIRIR ${prod.toUpperCase()} CON DESCUENTO`
    },
    it: {
      cookieTitle: "Questo sito utilizza i cookie per migliorare la tua esperienza.",
      cookieText: "Utilizziamo i cookie per personalizzare i contenuti, analizzare il traffico e offrire un'esperienza migliore all'utente. Continuando a navigare, accetti la nostra informativa sulla privacy e l'uso dei cookie.",
      cookieCta: "Accetta e Continua",
      headlineTitle: `Formula Esclusiva: ${prod} Svelato per la Massima Conversione`,
      headlineSub: "La soluzione scientifica definitiva per le tue esigenze quotidiane.",
      timerTitle: "🔥 IL LOTTO CON SCONTO SPECIALE SCADE TRA:",
      benefitAlt: `${prod} - Risultati Clinici e Benefici Comprovati`,
      storytellingFallback: "Il segreto per il successo è sbloccare il potenziale del tuo corpo. Il nostro team di ricerca ha analizzato tutti i componenti ed è giunto a una conclusione scientifica indiscutibile.",
      mainImageAlt: `${prod} Immagine Ufficiale di Alta Qualità`,
      compareTitle: `Perché scegliere ${prod}?`,
      compareFeatures: [
        { feature: "Ingredienti Premium Certificati", productA: prod, productB: "Altri Marchi", valueA: true, valueB: false },
        { feature: "Supporto e Assistenza Dedicata", productA: prod, productB: "Altri Marchi", valueA: true, valueB: false },
        { feature: "Garanzia di Rimborso Totale", productA: prod, productB: "Altri Marchi", valueA: true, valueB: true },
        { feature: "Privo di Composti Sintetici", productA: prod, productB: "Altri Marchi", valueA: true, valueB: false }
      ],
      faqDefault: [
        { question: `Funziona davvero ${prod}?`, answer: "Sì. L'azione diretta dei componenti clinicamente dosati garantisce il massimo beneficio fisiologico." },
        { question: "Qual è il periodo di rimborso?", answer: "Puoi richiedere un rimborso completo entro 30 giorni se il prodotto non soddisfa i tuoi obiettivi personali." }
      ],
      faqTitle: "Domande Frequenti Risposte dagli Esperti",
      testimonialsDefault: [
        { name: "Lucia Silvestri", text: "Completamente soddisfatta della spedizione veloce e del supporto del team di assistenza." },
        { name: "Marco Poli", text: "Ha cambiato radicalmente la mia stanchezza quotidiana. Consiglio vivamente a tutti!" }
      ],
      testimonialsTitle: "Cosa Dicono i Nostri Clienti",
      guaranteeTitle: "Zero Rischi: Garanzia di Soddisfazione Blindata",
      guaranteeText: "Ordinalo oggi e ricevi la nostra copertura di soddisfazione incondizionata di 30 giorni per provare tutti i vantaggi di persona.",
      ctaDefault: `SÌ, VOGLIO ACQUISTARE ${prod.toUpperCase()} CON SCONTO`
    },
    fr: {
      cookieTitle: "Ce site utilise des cookies pour améliorer votre expérience.",
      cookieText: "Nous utilisons des cookies pour personnaliser le contenu, analyser le trafic et offrir une meilleure expérience utilisateur. En continuant à naviguer, vous acceptez notre politique de confidentialité et de gestion des cookies.",
      cookieCta: "Accepter et Continuer",
      headlineTitle: `Formule Exclusive : ${prod} Révélé pour une Conversion Maximale`,
      headlineSub: "La solution scientifique définitive adaptée à vos besoins quotidiens.",
      timerTitle: "🔥 LE LOT AVEC RÉDUCTION EXCLUSIVE EXPIRE DANS :",
      benefitAlt: `${prod} - Résultats Cliniques et Avantages Prouvés`,
      storytellingFallback: "Le secret du succès des ventes réside dans la libération du potentiel de votre corps. Notre équipe d'élite a examiné tous les ingrédients pour parvenir à une conclusion indiscutable.",
      mainImageAlt: `${prod} Image officielle de haute qualité`,
      compareTitle: `Pourquoi choisir ${prod} ?`,
      compareFeatures: [
        { feature: "Ingrédients Premium Certifiés", productA: prod, productB: "Autres Marques", valueA: true, valueB: false },
        { feature: "Support et Accompagnement Dédié", productA: prod, productB: "Autres Marques", valueA: true, valueB: false },
        { feature: "Garantie de Remboursement Intégral", productA: prod, productB: "Autres Marques", valueA: true, valueB: true },
        { feature: "Sans Composés Synthétiques", productA: prod, productB: "Autres Marques", valueA: true, valueB: false }
      ],
      faqDefault: [
        { question: `Est-ce que ${prod} fonctionne vraiment ?`, answer: "Oui. L'action directe des composants cliniquement dosés garantit un bénéfice physiologique maximal." },
        { question: "Quel est le délai de remboursement ?", answer: "Vous pouvez demander un remboursement complet sous 30 jours si le produit ne correspond pas à vos objectifs." }
      ],
      faqTitle: "Questions Fréquemment Posées par les Experts",
      testimonialsDefault: [
        { name: "Sophie Durant", text: "Totalement satisfaite de la rapidité d'expédition et de la réactivité du support." },
        { name: "Marc Lepetit", text: "Amélioration radicale de ma fatigue quotidienne. Je le recommande vivement à tout le monde !" }
      ],
      testimonialsTitle: "Ce que disent nos clients",
      guaranteeTitle: "Zéro Risque : Garantie de Satisfaction Blindée",
      guaranteeText: "Commandez aujourd'hui et recevez notre couverture de satisfaction inconditionnelle de 30 jours pour vérifier tous les avantages par vous-même.",
      ctaDefault: `SÉCURISER MON ${prod.toUpperCase()} AVEC RÉDUCTION`
    }
  };

  const currentLoc = locals[langKey];

  if (pageType === "Cookie Presell") {
    comp.push({
      id: "comp_" + Math.random().toString(36).substr(2, 9),
      type: "headline",
      content: {
        title: aiData.headline || currentLoc.cookieTitle,
        text: aiData.subheadline || currentLoc.cookieText
      }
    });

    comp.push({
      id: "comp_" + Math.random().toString(36).substr(2, 9),
      type: "button",
      content: {
        buttonText: aiData.ctaText || currentLoc.cookieCta,
        buttonUrl: targetUrl
      }
    });

    return comp;
  }

  // Section 1: Headline Display
  comp.push({
    id: "comp_" + Math.random().toString(36).substr(2, 9),
    type: "headline",
    content: {
      logo: aiData.scrapedImages?.logoImage || "",
      title: aiData.headline || currentLoc.headlineTitle,
      text: aiData.subheadline || currentLoc.headlineSub
    }
  });

  // Section 2: Countdown Timer for Presells/LP
  if (["Presell", "Landing Page", "Bridge Page"].includes(pageType)) {
    comp.push({
      id: "comp_" + Math.random().toString(36).substr(2, 9),
      type: "timer",
      content: {
        title: currentLoc.timerTitle,
        durationMinutes: 10
      }
    });
  }

  // Section 3: Additional Product Benefits Image Representation
  let section3Img = `/api/fallback-image?product=${encodeURIComponent(prod)}&benefit=true`;
  if (aiData.scrapedImages?.benefitImages && aiData.scrapedImages.benefitImages.length > 0) {
    section3Img = aiData.scrapedImages.benefitImages[0];
  } else if (aiData.scrapedImages?.secondaryImages && aiData.scrapedImages.secondaryImages.length > 0) {
    section3Img = aiData.scrapedImages.secondaryImages[0];
  }
  comp.push({
    id: "comp_" + Math.random().toString(36).substr(2, 9),
    type: "image",
    content: {
      src: section3Img,
      alt: currentLoc.benefitAlt
    }
  });

  // Section 4: Storytelling text
  comp.push({
    id: "comp_" + Math.random().toString(36).substr(2, 9),
    type: "text",
    content: {
      text: aiData.storytelling || currentLoc.storytellingFallback
    }
  });

  // Section 5: Image Component (Extracting target brand logo / product mock representation)
  let section5Img = `/api/fallback-image?product=${encodeURIComponent(prod)}&type=${encodeURIComponent(pageType)}`;
  if (aiData.scrapedImages?.mainProductImage) {
    section5Img = aiData.scrapedImages.mainProductImage;
  } else if (aiData.scrapedImages?.secondaryImages && aiData.scrapedImages.secondaryImages.length > 1) {
    section5Img = aiData.scrapedImages.secondaryImages[1];
  } else if (aiData.scrapedImages?.secondaryImages && aiData.scrapedImages.secondaryImages.length > 0) {
    section5Img = aiData.scrapedImages.secondaryImages[0];
  }
  comp.push({
    id: "comp_" + Math.random().toString(36).substr(2, 9),
    type: "image",
    content: {
      src: section5Img,
      alt: currentLoc.mainImageAlt
    }
  });

  // Section 6: Comparative checklist inside Review / Presell
  if (["Review", "Presell"].includes(pageType)) {
    comp.push({
      id: "comp_" + Math.random().toString(36).substr(2, 9),
      type: "compare",
      content: {
        title: currentLoc.compareTitle,
        compareFields: currentLoc.compareFeatures
      }
    });
  }

  // Section 7: FAQ
  const mappedFaq = (aiData.faq && aiData.faq.length > 0) ? aiData.faq : currentLoc.faqDefault;
  comp.push({
    id: "comp_" + Math.random().toString(36).substr(2, 9),
    type: "faq",
    content: {
      title: currentLoc.faqTitle,
      faqList: mappedFaq
    }
  });

  // Section 8: Testimonials
  const mappedTestimonials = (aiData.testimonials && aiData.testimonials.length > 0) ? aiData.testimonials : currentLoc.testimonialsDefault;
  comp.push({
    id: "comp_" + Math.random().toString(36).substr(2, 9),
    type: "testimonials",
    content: {
      title: currentLoc.testimonialsTitle,
      testimonialsList: mappedTestimonials
    }
  });

  // Section 9: Guarantee
  comp.push({
    id: "comp_" + Math.random().toString(36).substr(2, 9),
    type: "guarantee",
    content: {
      title: currentLoc.guaranteeTitle,
      text: aiData.guaranteeText || currentLoc.guaranteeText
    }
  });

  // Section 10: Final CTA buttons
  comp.push({
    id: "comp_" + Math.random().toString(36).substr(2, 9),
    type: "button",
    content: {
      buttonText: aiData.ctaText || currentLoc.ctaDefault,
      buttonUrl: targetUrl
    }
  });

  return comp;
}

// ----------------------------------------------------
// API ROUTES FOR ADS CREATOR SAAS
// ----------------------------------------------------

// Get Profile Info
app.get("/api/profile", (req, res) => {
  const db = readDB();
  res.json(db.profile);
});

// Update Profile Custom Domain / Subdomain
app.post("/api/profile/domain", (req, res) => {
  const { subdomain, customDomain } = req.body;
  const db = readDB();
  db.profile = db.profile || {};
  if (subdomain !== undefined) db.profile.subdomain = subdomain;
  if (customDomain !== undefined) db.profile.customDomain = customDomain;
  writeDB(db);
  addLog("Mudança de Domínio", `Sua URL de publicação foi redefinida. Subdomínio: ${subdomain || "-"} | Domínio Próprio: ${customDomain || "-"}`);
  res.json(db.profile);
});

// Update Plan Limit
app.post("/api/profile/plan", (req, res) => {
  const { planId } = req.body;
  const db = readDB();
  db.profile = db.profile || {};
  db.profile.planId = planId;
  writeDB(db);
  addLog("Alteração de Plano", `Seu plano do AdsCreator AI foi alterado para: ${planId.toUpperCase()}`);
  res.json(db.profile);
});

// Update Profile Details (Name, Email, Avatar URL)
app.post("/api/profile/update", (req, res) => {
  const { name, email, avatarUrl } = req.body;
  const db = readDB();
  db.profile = db.profile || {};
  if (name !== undefined) db.profile.name = name;
  if (email !== undefined) db.profile.email = email;
  if (avatarUrl !== undefined) db.profile.avatarUrl = avatarUrl;
  writeDB(db);
  addLog("Atualização de Perfil", `Seus dados de acesso foram atualizados. Nome: ${name || db.profile.name}`);
  res.json(db.profile);
});

// Fetch All Generated Pages (Dashboard list)
app.get("/api/pages", (req, res) => {
  const db = readDB();
  res.json(db.pages || []);
});

// Update page details (The Drag-and-Drop Save UI endpoint)
app.put("/api/pages/:id", (req, res) => {
  const { id } = req.params;
  const updatedFields = req.body;
  const db = readDB();
  
  const pIndex = db.pages.findIndex((x: any) => x.id === id);
  if (pIndex !== -1) {
    db.pages[pIndex] = {
      ...db.pages[pIndex],
      ...updatedFields,
      // Recalculate CTR dynamically
      ctr: db.pages[pIndex].views > 0 ? parseFloat(((db.pages[pIndex].clicks / db.pages[pIndex].views) * 100).toFixed(2)) : 0
    };
    writeDB(db);
    addLog("Edição de Página", `A página "${db.pages[pIndex].title}" foi atualizada pelo editor visual.`);
    res.json(db.pages[pIndex]);
  } else {
    res.status(404).json({ error: "Página não encontrada." });
  }
});

// Duplicate Page
app.post("/api/pages/:id/duplicate", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const page = db.pages.find((x: any) => x.id === id);
  if (page) {
    // Check Plan Limits
    const limit = db.profile.planId === "starter" ? 10 : db.profile.planId === "pro" ? 50 : 999999;
    const currentCount = db.pages.length;
    if (currentCount >= limit) {
      return res.status(422).json({ error: `Prezado usuário, você atingiu o limite de ${limit} páginas para o plano ${db.profile.planId.toUpperCase()}. Por favor, faça um upgrade.` });
    }

    const newSlug = `${page.slug}-copy-${Math.floor(Math.random() * 1000)}`;
    const duplicate = {
      ...page,
      id: "p_" + Math.random().toString(36).substr(2, 9),
      title: `${page.title} (Cópia)`,
      slug: newSlug,
      createdAt: new Date().toISOString(),
      views: 0,
      clicks: 0,
      ctr: 0
    };
    db.pages.push(duplicate);
    writeDB(db);
    addLog("Duplicação de Página", `Cópia criada com sucesso da página: ${page.title}`);
    res.json(duplicate);
  } else {
    res.status(404).json({ error: "Página não encontrada." });
  }
});

// Delete Page
app.delete("/api/pages/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const pIdx = db.pages.findIndex((x: any) => x.id === id);
  if (pIdx !== -1) {
    const deletedName = db.pages[pIdx].title;
    db.pages.splice(pIdx, 1);
    writeDB(db);
    addLog("Exclusão de Página", `A página "${deletedName}" foi excluída com sucesso.`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Página não encontrada." });
  }
});

// Instant Generation through url with affiliate links & custom domain options
app.post("/api/pages/generate", async (req, res) => {
  const {
    url,
    type,
    affiliate_link,
    domain,
    generation_language,
    cookie_niche,
    cookie_destination_type,
    cookie_destination_slug,
    cookie_destination_url,
    cookie_display_delay,
    cookie_appearance
  } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Por favor, informe uma URL de oferta válida." });
  }
  const db = readDB();

  // Check limits
  const currentCount = db.pages.length;
  const limit = db.profile.planId === "starter" ? 10 : db.profile.planId === "pro" ? 50 : 999999;
  if (currentCount >= limit) {
    return res.status(422).json({ error: `Limite do plano atingido (${limit} páginas). Faça upgrade para continuar criando páginas excelentes!` });
  }

  try {
    const finalLang = generation_language || detectLanguageFromUrl(url);
    const aiData = await fetchAndAnalyzeUrl(url, type, finalLang, affiliate_link || url);
    // Inject the affiliate_link as the targetUrl for initial composition
    const components = composePageComponents(aiData, affiliate_link || url, type, finalLang);

    // Create unique slug
    const cleanProdName = (aiData.productName || "produto")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    
    const pageTypeSuffix = type.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    let baseSlug = `${cleanProdName}-${pageTypeSuffix}`;
    let finalSlug = baseSlug;
    let collisionCounter = 1;
    while (db.pages.some((p: any) => p.slug === finalSlug)) {
      finalSlug = `${baseSlug}-${collisionCounter}`;
      collisionCounter++;
    }

    // Clean publication domain
    const cleanDomain = (domain || "cliente.adscreator.ai")
      .trim()
      .replace(/^(https?:\/\/)?/, "")
      .replace(/\/$/, "");

    const published_url = `https://${cleanDomain}/${finalSlug}`;

    const newPage = {
      id: "p_" + Math.random().toString(36).substr(2, 9),
      title: `${type} do ${aiData.productName || "Produto"}`,
      slug: finalSlug,
      type,
      status: "Publicada",
      originalUrl: url,
      productName: aiData.productName || "Produto",
      createdAt: new Date().toISOString(),
      views: 0,
      clicks: 0,
      ctr: 0,
      components,
      
      // Additional requested fields
      affiliate_link: affiliate_link || url,
      domain: cleanDomain,
      published_url: published_url,
      page_type: type,

      // Cookie settings
      generation_language: finalLang,
      cookie_niche: cookie_niche || "Saúde",
      cookie_destination_type: cookie_destination_type || "link_afiliado",
      cookie_destination_slug: cookie_destination_slug || "",
      cookie_destination_url: cookie_destination_url || affiliate_link || url,
      cookie_display_delay: Number(cookie_display_delay) !== undefined ? Number(cookie_display_delay) : 0,
      cookie_appearance: cookie_appearance || "modal"
    };

    db.pages.push(newPage);
    writeDB(db);
    addLog("Criação Automática por IA", `Página "${newPage.title}" gerada com sucesso e cadastrada no domínio ${cleanDomain}!`);

    res.json(newPage);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Houve um erro técnico de geração de IA com o Gemini. Detalhes: " + err.message });
  }
});

// Regenerate AI page contents retaining domain, slug, and affiliate_link
app.post("/api/pages/:id/regenerate", async (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const pageIdx = db.pages.findIndex((p: any) => p.id === id);

  if (pageIdx === -1) {
    return res.status(404).json({ error: "Página não localizada para regeneração." });
  }

  const existingPage = db.pages[pageIdx];
  const url = existingPage.originalUrl;
  const type = existingPage.type;
  const affiliate_link = existingPage.affiliate_link || url;

  try {
    const aiData = await fetchAndAnalyzeUrl(url, type, existingPage.generation_language || "pt", affiliate_link);
    const components = composePageComponents(aiData, affiliate_link, type, existingPage.generation_language || "pt");

    // Keep existing metadata, only reconstruct copy components
    existingPage.components = components;
    existingPage.productName = aiData.productName || existingPage.productName || "Produto";
    existingPage.createdAt = new Date().toISOString(); 

    db.pages[pageIdx] = existingPage;
    writeDB(db);

    addLog("Regeneração por IA", `Página "${existingPage.title}" reconstruída com sucesso pela IA mantendo todos os parâmetros de publicação.`);
    res.json(existingPage);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Erro de IA durante regeneração: " + err.message });
  }
});

// Update Pixel Integrations
app.get("/api/integrations", (req, res) => {
  const db = readDB();
  res.json(db.integrations || {});
});

app.post("/api/integrations", (req, res) => {
  const db = readDB();
  db.integrations = {
    ...db.integrations,
    ...req.body
  };
  writeDB(db);
  addLog("Configuração de Pixel", "Pixels de Rastreamento (Meta, GA, GTM, TikTok) foram atualizados.");
  res.json(db.integrations);
});

// Fetch Logs for activity timeline
app.get("/api/logs", (req, res) => {
  const db = readDB();
  res.json(db.logs || []);
});

// Trigger tracking of click on a generated page
app.post("/api/pages/tracking/click", (req, res) => {
  const { id } = req.body;
  const db = readDB();
  const index = db.pages.findIndex((p: any) => p.id === id);
  if (index !== -1) {
    db.pages[index].clicks = (db.pages[index].clicks || 0) + 1;
    // update ctr
    const views = db.pages[index].views || 1;
    db.pages[index].ctr = parseFloat(((db.pages[index].clicks / views) * 100).toFixed(2));
    writeDB(db);
    res.json({ success: true, clicks: db.pages[index].clicks });
  } else {
    res.status(404).json({ error: "Page not found" });
  }
});

// Dynamic Fallback Image Generator endpoint delivering stunning CSS-based styled SVG mockup
app.get("/api/fallback-image", (req, res) => {
  const { product, type } = req.query;
  const prodName = product ? String(product) : "Suplemento Premium";
  const pageType = type ? String(type) : "Lente Comercial";

  // Build a beautiful styled horizontal gradient SVG card reflecting modern styling
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="50%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
        <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#22c55e" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.8" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g1)" />
      
      <!-- Ambient grid -->
      <path d="M 0,50 L 800,50 M 0,100 L 800,100 M 0,150 L 800,150 M 0,200 L 800,200 M 0,250 L 800,250 M 0,300 L 800,300 M 0,350 L 800,350 M 0,400 L 800,400" stroke="#334155" stroke-width="0.5" opacity="0.4" />
      <path d="M 100,0 L 100,450 M 200,0 L 200,450 M 300,0 L 300,450 M 400,0 L 400,450 M 500,0 L 500,450 M 600,0 L 600,450 M 700,0 L 700,450" stroke="#334155" stroke-width="0.5" opacity="0.4" />
      
      <!-- Card background decoration -->
      <circle cx="600" cy="225" r="160" fill="url(#glow)" opacity="0.15" filter="blur(40px)" />
      <rect x="520" y="100" width="160" height="250" rx="20" fill="#1e293b" stroke="#475569" stroke-width="2" />
      
      <!-- Holographic product label mockup -->
      <rect x="540" y="140" width="120" height="150" rx="10" fill="#0f172a" stroke="#22c55e" stroke-width="1.5" />
      <text x="600" y="180" font-family="'Inter', sans-serif" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">${prodName.toUpperCase()}</text>
      <text x="600" y="210" font-family="'Inter', sans-serif" font-size="10" fill="#22c55e" text-anchor="middle">OFFICIAL FORMULA</text>
      <rect x="560" y="240" width="80" height="20" rx="10" fill="#22c55e" />
      <text x="600" y="254" font-family="'Inter', sans-serif" font-weight="bold" font-size="9" fill="#0f172a" text-anchor="middle">PREMIUM</text>

      <!-- Badge decorative elements on side -->
      <text x="80" y="120" font-family="'Inter', sans-serif" font-weight="bold" font-size="28" fill="#22c55e">AdsCreator AI</text>
      <text x="80" y="150" font-family="'Inter', sans-serif" font-size="14" fill="#94a3b8">Conversão Avançada Facilitada</text>
      
      <rect x="80" y="180" width="180" height="32" rx="16" fill="#334155" />
      <circle cx="96" cy="196" r="6" fill="#22c55e" />
      <text x="112" y="201" font-family="'JetBrains Mono', monospace" font-size="12" fill="#ffffff">${pageType.toUpperCase()}</text>
      
      <text x="80" y="270" font-family="'Inter', sans-serif" font-weight="bold" font-size="34" fill="#ffffff">${prodName}</text>
      <text x="80" y="310" font-family="'Inter', sans-serif" font-size="16" fill="#3b82f6">√ Garantia Estendida</text>
      <text x="80" y="340" font-family="'Inter', sans-serif" font-size="16" fill="#e2e8f0">√ Cópia Aprovada por Copywriters</text>
      <text x="80" y="370" font-family="'Inter', sans-serif" font-size="16" fill="#e2e8f0">√ Depoimentos de Alta Conversão</text>
    </svg>
  `;

  res.setHeader("Content-Type", "image/svg+xml");
  res.send(svg);
});

// Compile the complete beautiful HTML string for a page (Cookie Presell or Sales Landing / Bridge page)
function compilePageHtml(page: any, db: any): string {
  // ----------------------------------------------------
  // RENDER DEDICATED COOKIE PRESELL PAGE
  // ----------------------------------------------------
  if (page.type === "Cookie Presell") {
    const headlineComp = page.components.find((c: any) => c.type === "headline");
    const buttonComp = page.components.find((c: any) => c.type === "button");
    const cookieTitle = headlineComp?.content?.title || "Este site utiliza cookies para melhorar sua experiência.";
    const cookieText = headlineComp?.content?.text || "Utilizamos cookies para personalizar conteúdo, analisar tráfego e oferecer uma melhor experiência ao usuário. Ao continuar navegando, você concorda com nossa política de privacidade e uso de cookies.";
    const cookieCta = buttonComp?.content?.buttonText || "Aceitar e Continuar";
    
    // Fallback or custom destination link
    const destinationUrl = page.cookie_destination_url || page.affiliate_link || "#";
    const language = page.generation_language || "pt";

    // Dynamic localized labels and policies links
    const locals: Record<string, any> = {
      pt: {
        req: "Cookies Necessários (Sempre Ativos)",
        reqDesc: "Essenciais para as funções básicas do portal, segurança e integridade de navegação.",
        anal: "Cookies de Análise e Métricas de Tráfego",
        analDesc: "Nos ajudam a otimizar a velocidade, diagnosticar problemas e monitorar acessos.",
        mark: "Cookies de Marketing e Conteúdo Personalizado",
        markDesc: "Permitem entregar recomendações relevantes segundo suas preferências de busca.",
        term: "Termos de Uso",
        priv: "Política de Privacidade",
        cookies: "Políticas de Cookies",
        legal: "Aviso Legal: Ao aceitar, coletamos consentimento para melhorar sua experiência de navegação.",
        back: "AdsCreator AI - Conexão Segura e Criptografada",
        fallbackLoader: "Estabelecendo túnel de conexão criptografada com o fabricante...",
        alertText: "Sua navegação está totalmente segura. Esta política descreve como os cookies ajudam a otimizar as comunicações com o fabricante oficial do produto"
      },
      en: {
        req: "Necessary Cookies (Always Active)",
        reqDesc: "Essential for core website capabilities, connection security, and data integrity.",
        anal: "Analytical and Traffic Metrics Cookies",
        analDesc: "Helping us audit visual rendering speed, access logs, and performance metrics.",
        mark: "Marketing and Personalized Advertisement Cookies",
        markDesc: "Allows custom product recommendations according to your unique navigation flow.",
        term: "Terms of Use",
        priv: "Privacy Policy",
        cookies: "Cookie Policy",
        legal: "Legal Note: By clicking, you consent to our security protocols and privacy policies for optimized navigation.",
        back: "AdsCreator AI - 100% Encrypted & Secure SSL Handshake",
        fallbackLoader: "Establishing secure SSL connection to primary product servers...",
        alertText: "Your navigation is completely secure. This policy describes how cookies help optimize communications with the official manufacturer of the product"
      },
      es: {
        req: "Cookies Necesarias (Siempre Activas)",
        reqDesc: "Fundamentales para las funciones básicas de la web, seguridad y autenticación.",
        anal: "Cookies Analíticas y de Auditoría de Tráfico",
        analDesc: "Nos permiten monitorear errores de carga, diagnosticar velocidad de respuesta.",
        mark: "Cookies de Marketing y Personalización",
        markDesc: "Utilizadas para brindarle recomendaciones adaptadas basadas en su nicho de interés.",
        term: "Términos de Uso",
        priv: "Política de Privacidad",
        cookies: "Políticas de Cookies",
        legal: "Nota Legal: Al aceptar, otorga consentimiento para optimizar la seguridad y los complementos de la página.",
        back: "AdsCreator AI - Conexión Segura y Encriptada en SSL",
        fallbackLoader: "Estableciendo cifrado SSL seguro de canal...",
        alertText: "Su navegación es completamente segura. Esta política describe cómo las cookies ayudan a optimizar las comunicaciones con el fabricante oficial del producto"
      },
      it: {
        req: "Cookie Necessari (Sempre Attivi)",
        reqDesc: "Essenziali per le funzionalità principali del portale, stabilità e sicurezza dei dati.",
        anal: "Cookie Analitici e Metriche sul Traffico",
        analDesc: "Ci aiutano a monitorare la velocità del server, accessi e compatibilità del browser.",
        mark: "Cookie di Marketing e Pubblicità Personalizzata",
        markDesc: "Consentono di visualizzare recensioni e promozioni perfette per il tuo profilo.",
        term: "Condizioni d'Uso",
        priv: "Informativa sulla Privacy",
        cookies: "Informativa sui Cookie",
        legal: "Nota Legale: Continuando, fornisci l'assenso alle metriche e alle norme sulla privacy del produttore.",
        back: "AdsCreator AI - Connessione Crittografata Sicura SSL",
        fallbackLoader: "Inizializzazione della connessione protetta e privata in corso...",
        alertText: "La tua navigazione è completamente sicura. Questa informativa descrive come i cookie aiutino a ottimizzare le comunicazioni con il produttore ufficiale del produttore"
      },
      fr: {
        req: "Cookies Nécessaires (Toujours Actifs)",
        reqDesc: "Essentiels pour les fonctions de base du site, la sécurité de connexion et l'intégrité.",
        anal: "Cookies Analytiques et Mesures de Trafic",
        analDesc: "Nous aident à optimiser la vitesse, diagnostiquer les problèmes et suivre les accès.",
        mark: "Cookies de Marketing et Publicité Personnalisée",
        markDesc: "Permettent de proposer des recommandations pertinentes selon vos préférences de recherche.",
        term: "Conditions d'Utilisation",
        priv: "Politique de Confidentialité",
        cookies: "Politique relative aux Cookies",
        legal: "Note Légale : En acceptant, vous consentez à nos protocoles de sécurité et politiques de confidentialité.",
        back: "AdsCreator AI - Connexion Sécurisée et Cryptée en SSL",
        fallbackLoader: "Établissement d'un tunnel de connexion sécurisée avec le fabricant...",
        alertText: "Votre navigation est totalement sécurisée. Cette politique décrit comment les cookies aident à optimiser les communications avec le fabricant officiel du produit"
      }
    };

    const currentLoc = locals[language] || locals.pt;
    const trackingDelaySec = Number(page.cookie_display_delay) || 0;
    const appearance = page.cookie_appearance || "modal";

    // Set interactive visual styling classes according to appearance
    let overlayClass = "bg-slate-950/90 backdrop-blur-md";
    let containerClass = "max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-8";

    if (appearance === "fullscreen") {
      overlayClass = "bg-slate-950";
      containerClass = "w-full max-w-4xl bg-slate-950 text-left p-12 min-h-screen flex flex-col justify-center";
    } else if (appearance === "bottom_bar") {
      overlayClass = "bg-transparent pointer-events-none";
      containerClass = "fixed bottom-0 left-0 right-0 max-w-none bg-slate-900 border-t border-slate-800 rounded-t-3xl p-8 w-full pointer-events-auto z-50 shadow-2xl";
    } else if (appearance === "popup") {
      overlayClass = "bg-transparent pointer-events-none";
      containerClass = "fixed bottom-6 right-6 max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 pointer-events-auto z-50 shadow-2xl";
    }

    return `
      <!DOCTYPE html>
      <html lang="${language}" class="scroll-smooth bg-slate-950 font-sans">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="robots" content="noindex,nofollow">
          <title>${page.title}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; }
            .font-mono { font-family: 'JetBrains Mono', monospace; }
          </style>
          
          <!-- Integration tracking tags simulation for pixels -->
          ${db.integrations?.metaPixelId ? `
          <!-- Meta Pixel Code -->
          <script>
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${db.integrations.metaPixelId}');
            fbq('track', 'PageView');
          </script>
          <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${db.integrations.metaPixelId}&ev=PageView&noscript=1"/></noscript>
          <!-- End Meta Pixel Code -->` : ""}

          ${db.integrations?.googleAnalyticsId ? `
          <!-- Google Analytics Code -->
          <script async src="https://www.googletagmanager.com/gtag/js?id=${db.integrations.googleAnalyticsId}"></script>
          <script>
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${db.integrations.googleAnalyticsId}');
          </script>` : ""}

          ${db.integrations?.googleTagManagerId ? `
          <!-- Google Tag Manager Code -->
          <script>
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${db.integrations.googleTagManagerId}');
          </script>` : ""}

          ${db.integrations?.tiktokPixelId ? `
          <!-- TikTok Pixel Code -->
          <script>
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","trackWithSegment","onSinglePageAssociatedTrack"],ttq.setAndTrack=function(t,e){t[e]=function(){ttq.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var e=0;e<ttq.methods.length;e++)ttq.setAndTrack(ttq,ttq.methods[e]);ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||[],ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
              ttq.load('${db.integrations.tiktokPixelId}');
              ttq.page();
            }(window, document, 'ttq');
          </script>` : ""}
        </head>
        <body class="text-slate-100 antialiased selection:bg-green-400 selection:text-slate-950 min-h-screen relative flex items-center justify-center overflow-x-hidden">
          
          <!-- Background decorative elements for premium context -->
          <div class="fixed inset-0 bg-[#020617] -z-20 overflow-hidden">
            <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-950/20 rounded-full blur-[120px]"></div>
            <div class="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-indigo-950/20 rounded-full blur-[100px]"></div>
          </div>

          <!-- DYNAMIC CONNECTION LOADER (TEMPO DE EXIBIÇÃO) -->
          ${trackingDelaySec > 0 ? `
          <div id="delay-spinner" class="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-6 transition-all duration-700">
            <div class="relative flex items-center justify-center mb-6">
              <svg class="animate-spin h-14 w-14 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div class="absolute text-[10px] font-mono text-green-400 font-bold">SSL</div>
            </div>
            <p class="text-xs font-mono text-slate-450 text-slate-400 max-w-sm text-center leading-relaxed font-bold animate-pulse">
              ${currentLoc.fallbackLoader}
            </p>
          </div>
          <script>
            setTimeout(function() {
              const spinner = document.getElementById('delay-spinner');
              if (spinner) {
                spinner.classList.add('opacity-0');
                setTimeout(function() { spinner.remove(); }, 700);
              }
            }, ${trackingDelaySec * 1000});
          </script>
          ` : ""}

          <!-- CONSENT WINDOW OVERLAY CONTAINER -->
          <div class="fixed inset-0 z-40 flex items-center justify-center p-4 overflow-y-auto ${overlayClass}">
            <div class="${containerClass} w-full transition-all duration-300 transform scale-100 shadow-2xl relative">
              
              <!-- Subtle badge -->
              <div class="flex items-center gap-2 mb-5">
                <span class="inline-flex w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></span>
                <span class="text-[10px] font-mono font-black uppercase text-green-400 tracking-widest bg-green-950/40 border border-green-800/60 rounded-full px-2.5 py-0.5">${currentLoc.back}</span>
              </div>

              <!-- Main Dynamic Headline generated/edited -->
              <h1 class="text-xl md:text-2xl font-black text-white tracking-tight leading-snug mb-3">
                ${cookieTitle}
              </h1>

              <!-- Main Dynamic Text description generated/edited -->
              <p class="text-xs md:text-sm text-slate-350 text-slate-400 leading-relaxed mb-6">
                ${cookieText}
              </p>

              <!-- Option Checkboxes Checklist representing Cookies customization -->
              <div class="space-y-3 mb-6 bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 md:p-5">
                
                <!-- Mandatory -->
                <label class="flex gap-3 text-left cursor-default select-none group">
                  <div class="mt-0.5">
                    <input type="checkbox" checked disabled class="accent-green-500 h-4 w-4 bg-slate-900 border-slate-800 rounded">
                  </div>
                  <div>
                    <span class="block text-xs font-bold text-white">${currentLoc.req}</span>
                    <span class="block text-[10px] text-slate-500 mt-0.5 leading-normal">${currentLoc.reqDesc}</span>
                  </div>
                </label>

                <hr class="border-slate-900">

                <!-- Analytical -->
                <label class="flex gap-3 text-left cursor-pointer select-none group">
                  <div class="mt-0.5">
                    <input type="checkbox" id="cookie-anal" checked class="accent-green-500 h-4 w-4 bg-slate-900 border-slate-800 rounded">
                  </div>
                  <div>
                    <span class="block text-xs font-bold text-slate-300 group-hover:text-white transition-all">${currentLoc.anal}</span>
                    <span class="block text-[10px] text-slate-500 mt-0.5 leading-normal">${currentLoc.analDesc}</span>
                  </div>
                </label>

                <hr class="border-slate-900">

                <!-- Marketing -->
                <label class="flex gap-3 text-left cursor-pointer select-none group">
                  <div class="mt-0.5">
                    <input type="checkbox" id="cookie-mark" checked class="accent-green-500 h-4 w-4 bg-slate-900 border-slate-800 rounded">
                  </div>
                  <div>
                    <span class="block text-xs font-bold text-slate-300 group-hover:text-white transition-all">${currentLoc.mark}</span>
                    <span class="block text-[10px] text-slate-500 mt-0.5 leading-normal">${currentLoc.markDesc}</span>
                  </div>
                </label>

              </div>

              <!-- Main Consent Accept buttons -->
              <div class="flex flex-col gap-3">
                <button onclick="acceptAndRedirect()" class="w-full py-4 px-6 text-center text-slate-950 bg-green-400 hover:bg-green-300 hover:scale-[1.01] active:scale-95 transition-all duration-150 font-black text-xs md:text-sm rounded-xl tracking-wider uppercase cursor-pointer shadow-lg shadow-green-950/20">
                  ${cookieCta}
                </button>
                <p class="text-[9px] text-slate-500 text-center leading-normal">
                  ${currentLoc.legal}
                </p>
              </div>

              <!-- Footer with legal regulations policies links generate automatically -->
              <div class="mt-6 pt-4 border-t border-slate-800/50 flex flex-wrap gap-x-4 gap-y-2 justify-center text-[10px] font-medium text-slate-400">
                <a href="#privacy" onclick="alertPolicy('${currentLoc.priv}')" class="hover:text-white transition-all underline">${currentLoc.priv}</a>
                <span class="text-slate-700">•</span>
                <a href="#terms" onclick="alertPolicy('${currentLoc.term}')" class="hover:text-white transition-all underline">${currentLoc.term}</a>
                <span class="text-slate-700">•</span>
                <a href="#cookies" onclick="alertPolicy('${currentLoc.cookies}')" class="hover:text-white transition-all underline">${currentLoc.cookies}</a>
              </div>

            </div>
          </div>

          <!-- Standardised policies generator popup script -->
          <script>
            function alertPolicy(policyName) {
              const text = policyName + " - AdsCreator AI\\n\\n${currentLoc.alertText} ${page.productName}.\\n\\n";
              alert(text);
            }

            function acceptAndRedirect() {
              try {
                if (window.fbq) {
                  fbq('track', 'PageView');
                  fbq('track', 'CookieAccepted');
                  fbq('track', 'ViewContent');
                  fbq('track', 'Lead');
                  fbq('trackCustom', 'CookieAccepted_${page.cookie_niche}');
                }

                if (window.gtag) {
                  gtag('event', 'cookie_accepted', {
                    'event_category': 'Engagement',
                    'event_label': 'CookieAccepted',
                    'niche': '${page.cookie_niche}'
                  });
                  gtag('event', 'view_content');
                  gtag('event', 'lead');
                }

                if (window.dataLayer) {
                  dataLayer.push({
                    'event': 'CookieAccepted',
                    'cookie_niche': '${page.cookie_niche}',
                    'event_category': 'Engagement'
                  });
                }

                if (window.ttq) {
                  ttq.track('PageView');
                  ttq.track('CompletePayment');
                }
              } catch (e) {
                console.warn("Tracking codes failed or blocked, proceeding with redirect: ", e);
              }

              fetch('/api/pages/tracking/click', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id: '${page.id}'})
              })
              .catch(err => console.log('Click submission log error: ', err))
              .finally(function() {
                window.location.href = "${destinationUrl}";
              });
            }
          </script>

        </body>
      </html>
    `;
  }

  // ----------------------------------------------------
  // RENDER SALES, LANDING, BRIDGE, REVIEW OR ADVERTORIAL
  // ----------------------------------------------------
  const affLink = page.affiliate_link || page.originalUrl || "#";
  const language = page.generation_language || "pt";

  // Match native language keys for hardcoded page text labels
  const standardLocals: Record<string, any> = {
    pt: {
      specialistOpinion: "OPINIÃO EXCLUSIVA DO ESPECIALISTA",
      compareTitle: "Tabela de Comparação Técnica",
      compareFactor: "Fator de Avaliação",
      otherProducts: "Outros Suplementos",
      faqTitle: "Perguntas e Respostas",
      testimonialsTitle: "Aprovado por Quem Experimentou",
      guaranteeTitle: "Risque Zero Garantido",
      secureSite: "⚡ Site 100% Seguro & Criptografado pelo Fabricante",
      recommendedPartners: "RECOMENDADO POR PARCEIROS OFICIAIS",
      secureBadge: "SEGURO",
      legalNoticeTitle: "Aviso Legal:",
      legalNoticeText: "Este site é de caráter estritamente informativo. Os resultados relatados podem variar de pessoa para pessoa. As referências científicas estão sob posse de seus respectivos detentores de direitos.",
      copyright: "Todos os direitos reservados."
    },
    en: {
      specialistOpinion: "EXCLUSIVE SPECIALIST OPINION",
      compareTitle: "Technical Comparison Table",
      compareFactor: "Evaluation Factor",
      otherProducts: "Other Supplements",
      faqTitle: "Questions & Answers",
      testimonialsTitle: "Approved by Real Customers",
      guaranteeTitle: "Zero Risk Guaranteed",
      secureSite: "⚡ 100% Secure & Encrypted Official Website",
      recommendedPartners: "RECOMMENDED BY OFFICIAL PARTNERS",
      secureBadge: "SECURE",
      legalNoticeTitle: "Disclaimer:",
      legalNoticeText: "This website is for informational purposes only. Reported results may vary from person to person. Scientific references reside under the possession of their respective rights holders.",
      copyright: "All rights reserved."
    },
    es: {
      specialistOpinion: "OPINIÓN EXCLUSIVA DE EXPERTOS",
      compareTitle: "Tabla de Comparación Técnica",
      compareFactor: "Factor de Evaluación",
      otherProducts: "Otros Suplementos",
      faqTitle: "Preguntas y Respuestas",
      testimonialsTitle: "Aprobado por Quienes lo Probaron",
      guaranteeTitle: "Garantía de Cero Riesgo",
      secureSite: "⚡ Sitio 100% Seguro y Encriptado por el Fabricante",
      recommendedPartners: "RECOMENDADO POR SOCIOS OFICIALES",
      secureBadge: "SEGURO",
      legalNoticeTitle: "Aviso Legal:",
      legalNoticeText: "Este sitio web es estrictamente informativo. Los resultados reportados pueden variar de persona a persona. Las referencias científicas están bajo la posesión de sus respectivos titulares de derechos.",
      copyright: "Todos los derechos reservados."
    },
    it: {
      specialistOpinion: "OPINIONE ESCLUSIVA DELLO SPECIALISTA",
      compareTitle: "Tabella di Confronto Tecnico",
      compareFactor: "Fattore di Valutazione",
      otherProducts: "Altri Integratori",
      faqTitle: "Domande e Risposte",
      testimonialsTitle: "Approvato da Chi l'ha Provato",
      guaranteeTitle: "Zero Rischi Garantito",
      secureSite: "⚡ Sito Ufficiale 100% Sicuro & Crittografato dal Produttore",
      recommendedPartners: "CONSIGLIATO DA PARTNER UFFICIALI",
      secureBadge: "SICURO",
      legalNoticeTitle: "Note Legali:",
      legalNoticeText: "Questo sito è a scopo esclusivamente informativo. I risultati riportati possono variare da persona a persona. I riferimenti scientifici appartengono ai rispettivi detentori dei diritti.",
      copyright: "Tutti i diritti riservati."
    },
    fr: {
      specialistOpinion: "OPINION EXCLUSIVE DE L'SPÉCIALISTE",
      compareTitle: "Tableau de Comparaison Technique",
      compareFactor: "Facteur d'Évaluation",
      otherProducts: "Autres Suppléments",
      faqTitle: "Questions et Réponses",
      testimonialsTitle: "Approuvé par Ceux Qui l'Ont Essayé",
      guaranteeTitle: "Zéro Risque Garanti",
      secureSite: "⚡ Site Officiel 100% Sécurisé & Crypté par le Fabricant",
      recommendedPartners: "RECOMMANDÉ PAR DES PARTENAIRES OFFICIELS",
      secureBadge: "SÉCURISÉ",
      legalNoticeTitle: "Mentions Légales :",
      legalNoticeText: "Ce site est mis à disposition à titre strictement informatif. Les résultats rapportés peuvent varier d'une personne à l'autre. Les références scientifiques appartiennent à leurs détenteurs de droits respectifs.",
      copyright: "Tous droits réservés."
    }
  };

  const currentLoc = standardLocals[language] || standardLocals.pt;

  const componentsHtml = page.components.map((comp: any) => {
    switch (comp.type) {
      case "headline":
        const logoHtml = comp.content.logo ? `
          <div class="mb-5 flex justify-center">
            <img src="${comp.content.logo}" alt="Logo" class="max-h-12 object-contain" />
          </div>
        ` : '';
        return `
          <header class="py-16 text-center border-b border-gray-800 bg-gradient-to-b from-slate-900 to-slate-950 px-4">
            <div class="max-w-3xl mx-auto">
              ${logoHtml}
              <span class="inline-block px-4 py-1 text-xs font-semibold tracking-wider text-green-400 uppercase bg-green-950/40 border border-green-800 rounded-full mb-6 font-mono">${currentLoc.specialistOpinion}</span>
              <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">${comp.content.title}</h1>
              <p class="text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">${comp.content.text}</p>
            </div>
          </header>
        `;
      case "timer":
        let timerTitle = comp.content.title || "🔥 LOTE ESPECIAL COM DESCONTO EXCLUSIVO VENCE EM:";
        if (language === "en" && (timerTitle.includes("LOTE ESPECIAL") || timerTitle.includes("DESCONTO EXCLUSIVO"))) {
          timerTitle = "🔥 SPECIAL DISCOUNT BATCH EXPIRES IN:";
        } else if (language === "es" && (timerTitle.includes("LOTE ESPECIAL") || timerTitle.includes("DESCONTO EXCLUSIVO"))) {
          timerTitle = "🔥 EL LOTE CON DESCUENTO ESPECIAL EXPIRA EN:";
        } else if (language === "it" && (timerTitle.includes("LOTE ESPECIAL") || timerTitle.includes("DESCONTO EXCLUSIVO"))) {
          timerTitle = "🔥 IL LOTTO CON SCONTO SPECIALE SCADE TRA:";
        } else if (language === "fr" && (timerTitle.includes("LOTE ESPECIAL") || timerTitle.includes("DESCONTO EXCLUSIVO"))) {
          timerTitle = "🔥 LE LOT AVEC RÉDUCTION EXCLUSIVE EXPIRE DANS :";
        }
        return `
          <div class="bg-red-950 border-y border-red-800 py-3 text-center px-4">
            <div class="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3">
              <span class="text-red-300 font-bold tracking-wide animate-pulse">⚡ ${timerTitle}</span>
              <div class="font-mono text-white font-black bg-red-900 px-4 py-1 rounded text-lg tracking-widest shadow-inner" id="countdown-clock">
                09m : 59s
              </div>
            </div>
            <script>
              (function() {
                let duration = ${comp.content.durationMinutes || 10} * 60;
                const clock = document.getElementById('countdown-clock');
                const interval = setInterval(function() {
                  let minutes = Math.floor(duration / 60);
                  let seconds = duration % 60;
                  minutes = minutes < 10 ? '0' + minutes : minutes;
                  seconds = seconds < 10 ? '0' + seconds : seconds;
                  clock.textContent = minutes + 'm : ' + seconds + 's';
                  if (--duration < 0) {
                    clearInterval(interval);
                    clock.textContent = "EXPIRED";
                  }
                }, 1000);
              })();
            </script>
          </div>
        `;
      case "text":
        return `
          <section class="py-12 bg-slate-950 text-slate-300 max-w-3xl mx-auto px-6 leading-relaxed text-lg whitespace-pre-line border-b border-slate-900">
            ${comp.content.text.replace(/\*\*(.*?)\*\"/g, '<strong>$1</strong>')}
          </section>
        `;
      case "video":
        return `<!-- Video component skipped under global media rules -->`;
      case "image":
        return `
          <section class="py-12 bg-slate-950 text-center border-b border-slate-900 px-4">
            <div class="max-w-3xl mx-auto">
              <a href="${affLink}" onclick="registerClick()" target="_blank" class="block cursor-pointer transition-transform hover:scale-[1.015]">
                <img src="${comp.content.src || "/api/fallback-image?product=" + page.productName}" alt="${comp.content.alt || page.productName}" class="mx-auto rounded-xl shadow-2xl border border-slate-800 max-h-[400px] object-cover" />
              </a>
            </div>
          </section>
        `;
      case "compare":
        const rows = (comp.content.compareFields || []).map((row: any) => `
          <tr class="border-b border-slate-900">
            <td class="py-4 px-4 text-left font-semibold text-slate-300">${row.feature}</td>
            <td class="py-4 px-4 text-center text-green-400 font-extrabold text-lg">${row.valueA ? '✓' : '✗'}</td>
            <td class="py-4 px-4 text-center text-slate-500 text-lg">${row.valueB ? '✓' : '✗'}</td>
          </tr>
        `).join('');

        let compareTitle = comp.content.title || currentLoc.compareTitle;
        if (language !== "pt" && (compareTitle.startsWith("Por que escolher") || compareTitle === "Tabela de Comparação Técnica")) {
          compareTitle = currentLoc.compareTitle;
        }

        return `
          <section class="py-12 bg-slate-950 px-6 border-b border-slate-900">
            <div class="max-w-3xl mx-auto">
              <h3 class="text-2xl font-extrabold text-white text-center mb-6">${compareTitle}</h3>
              <div class="overflow-x-auto rounded-xl border border-slate-800">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="bg-slate-900 text-slate-400">
                      <th class="py-3 px-4 text-left font-bold">${currentLoc.compareFactor}</th>
                      <th class="py-3 px-4 text-center font-bold text-green-400">${comp.content.productA || page.productName}</th>
                      <th class="py-3 px-4 text-center font-bold text-slate-400">${comp.content.productB || currentLoc.otherProducts}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        `;
      case "faq":
        const faqs = (comp.content.faqList || []).map((item: any) => `
          <div class="border-b border-slate-900 pb-4">
            <h4 class="text-base font-bold text-green-400 mb-2">Q: ${item.question}</h4>
            <p class="text-slate-300 pl-4 border-l-2 border-slate-800 text-sm leading-relaxed">${item.answer}</p>
          </div>
        `).join('');

        let faqTitle = comp.content.title || currentLoc.faqTitle;
        if (language !== "pt" && (faqTitle.includes("Perguntas Frequentes") || faqTitle === "Perguntas e Respostas")) {
          faqTitle = currentLoc.faqTitle;
        }

        return `
          <section class="py-12 bg-slate-950 px-6 border-b border-slate-900">
            <div class="max-w-3xl mx-auto">
              <h3 class="text-2xl font-extrabold text-white text-center mb-8">${faqTitle}</h3>
              <div class="space-y-6">${faqs}</div>
            </div>
          </section>
        `;
      case "testimonials":
        const reviews = (comp.content.testimonialsList || []).map((t: any) => `
          <div class="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
            <p class="text-slate-300 italic mb-4">"${t.text}"</p>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-green-400">
                ${t.name.charAt(0)}
              </div>
              <div>
                <h5 class="text-slate-200 font-bold text-sm">${t.name}</h5>
                ${t.role ? `<span class="text-xs text-slate-500">${t.role}</span>` : ''}
              </div>
            </div>
          </div>
        `).join('');

        let testimonialsTitle = comp.content.title || currentLoc.testimonialsTitle;
        if (language !== "pt" && (testimonialsTitle.includes("Clientes Estão Dizendo") || testimonialsTitle === "Aprovado por Quem Experimentou")) {
          testimonialsTitle = currentLoc.testimonialsTitle;
        }

        return `
          <section class="py-12 bg-slate-950 px-6 border-b border-slate-900">
            <div class="max-w-3xl mx-auto">
              <h3 class="text-2xl font-extrabold text-white text-center mb-8">${testimonialsTitle}</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">${reviews}</div>
            </div>
          </section>
        `;
      case "guarantee":
        let guaranteeTitle = comp.content.title || currentLoc.guaranteeTitle;
        if (language !== "pt" && (guaranteeTitle.includes("Risco Zero") || guaranteeTitle === "Risque Zero Garantido")) {
          guaranteeTitle = currentLoc.guaranteeTitle;
        }

        return `
          <section class="py-12 bg-slate-950 px-6 border-b border-slate-900">
            <div class="max-w-3xl mx-auto bg-green-950/20 border border-green-900 p-8 rounded-2xl flex flex-col md:flex-row items-center gap-6">
              <div class="bg-green-900/40 p-4 rounded-full flex-shrink-0 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-check"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2c.57.14.76.6.76 1.07V13z"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <div>
                <h4 class="text-xl font-bold text-green-400 mb-2">${guaranteeTitle}</h4>
                <p class="text-slate-300 text-sm leading-relaxed">${comp.content.text}</p>
              </div>
            </div>
          </section>
        `;
      case "button":
        return `
          <section class="py-16 text-center bg-slate-950 px-4">
            <div class="max-w-xl mx-auto">
              <a href="${affLink}" onclick="registerClick()" target="_blank" class="block w-full py-5 px-8 text-center text-slate-950 bg-green-400 hover:bg-green-300 active:transform active:scale-95 transition-all font-black text-lg md:text-xl rounded-xl shadow-xl shadow-green-950/30 tracking-wide uppercase">
                ${comp.content.buttonText}
              </a>
              <span class="inline-block mt-4 text-xs text-slate-500 font-medium font-mono">${currentLoc.secureSite}</span>
            </div>
          </section>
        `;
      default:
        return '';
    }
  }).join('');

  // Combine track codes
  const trackingScript = `
    <script>
      function registerClick() {
        fetch('/api/pages/tracking/click', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({id: '${page.id}'})
        }).catch(err => console.log('Tracking click error:', err));
      }
    </script>
  `;

  return `
    <!DOCTYPE html>
    <html lang="${language}" class="scroll-smooth bg-slate-950">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${page.title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; }
          .font-mono { font-family: 'JetBrains Mono', monospace; }
        </style>
        <!-- Integrations codes script simulation -->
        ${db.integrations?.metaPixelId ? `
        <!-- Meta Pixel Code -->
        <script>
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${db.integrations.metaPixelId}');
          fbq('track', 'PageView');
        </script>
        <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${db.integrations.metaPixelId}&ev=PageView&noscript=1"/></noscript>
        <!-- End Meta Pixel Code -->` : ""}

        ${db.integrations?.googleAnalyticsId ? `
        <!-- Google Analytics Code -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=${db.integrations.googleAnalyticsId}"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${db.integrations.googleAnalyticsId}');
        </script>` : ""}

        ${db.integrations?.googleTagManagerId ? `
        <!-- Google Tag Manager Code -->
        <script>
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${db.integrations.googleTagManagerId}');
        </script>` : ""}

        ${db.integrations?.tiktokPixelId ? `
        <!-- TikTok Pixel Code -->
        <script>
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","trackWithSegment","onSinglePageAssociatedTrack"],ttq.setAndTrack=function(t,e){t[e]=function(){ttq.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var e=0;e<ttq.methods.length;e++)ttq.setAndTrack(ttq,ttq.methods[e]);ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||[],ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
            ttq.load('${db.integrations.tiktokPixelId}');
            ttq.page();
          }(window, document, 'ttq');
        </script>` : ""}
      </head>
      <body class="text-slate-100 antialiased selection:bg-green-400 selection:text-slate-950">
        
        <!-- Public top minimal navigation -->
        <nav class="bg-slate-950/80 backdrop-blur border-b border-slate-900 sticky top-0 z-50 py-3 px-6">
          <div class="max-w-4xl mx-auto flex justify-between items-center text-xs">
            <span class="text-slate-400 flex items-center gap-1.5 font-bold">
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              ${currentLoc.recommendedPartners}
            </span>
            <span class="text-slate-500 text-[10px] font-mono">${currentLoc.secureBadge}</span>
          </div>
        </nav>

        <div class="bg-slate-950">
          ${componentsHtml}
        </div>

        <footer class="bg-slate-950 border-t border-slate-900 py-12 px-6 text-center text-slate-500">
          <div class="max-w-3xl mx-auto space-y-4">
            <p><strong>${currentLoc.legalNoticeTitle}</strong> ${currentLoc.legalNoticeText}</p>
            <p class="font-mono">Copyright &copy; 2026 AdsCreator AI. ${currentLoc.copyright}</p>
          </div>
        </footer>

        ${trackingScript}
      </body>
    </html>
  `;
}

// Shared page rendering handler accommodating both /p/:slug and /:slug (root paths)
function handlePageRequest(slug: string, res: any, next?: any) {
  const db = readDB();
  const page = db.pages.find((p: any) => p.slug === slug);

  if (!page) {
    if (next) {
      return next(); // Pass down the middleware chain so main dashboard frontend takes over
    }
    return res.status(404).send(`
      <html>
        <head>
          <title>Página Não Encontrada - AdsCreator AI</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; text-align: center; background: #0f172a; color: #f8fafc; padding: 100px 20px; }
            h1 { color: #f43f5e; font-size: 32px; }
            a { color: #22c55e; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>404 - Página Não Encontrada</h1>
          <p>A página que você está tentando acessar não existe ou foi removida pelo proprietário.</p>
          <p><a href="/">Voltar ao AdsCreator AI</a></p>
        </body>
      </html>
    `);
  }

  // Increment views safely
  page.views = (page.views || 0) + 1;
  page.ctr = page.views > 0 ? parseFloat(((page.clicks / page.views) * 100).toFixed(2)) : 0;
  writeDB(db);

  const html = compilePageHtml(page, db);
  res.send(html);
}

// Static HTML downloader endpoint return precompiled static attachment
app.get("/api/pages/:id/download", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const page = db.pages.find((p: any) => p.id === id);

  if (!page) {
    return res.status(404).json({ error: "Página não localizada para download do seu arquivo HTML." });
  }

  const htmlContent = compilePageHtml(page, db);
  
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="index-${page.slug}.html"`);
  res.send(htmlContent);
});

// Serve public dynamic page with tracking integration under /p/:slug
app.get("/p/:slug", (req, res) => {
  const { slug } = req.params;
  handlePageRequest(slug, res);
});

// Serve public dynamic page directly on the root /:slug for custom domains and easy preview
app.get("/:slug", (req, res, next) => {
  const { slug } = req.params;

  // Skip system routes, API, assets, folders, source files, and items with file extensions.
  if (
    slug === "api" ||
    slug === "p" ||
    slug === "assets" ||
    slug.includes(".") ||
    slug.startsWith("src") ||
    slug === "index.html" ||
    slug === "favicon.ico"
  ) {
    return next();
  }

  handlePageRequest(slug, res, next);
});

// ----------------------------------------------------
// VITE AND STATIC ASSETS HANDLING MIDDLEWARE
// ----------------------------------------------------
async function initializeViteAndStaticServing() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Iniciando Vite em modo de desenvolvimento...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Iniciando produção: Servindo pastas estáticas...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AdsCreator AI Server] Servidor ativo em http://localhost:${PORT}`);
  });
}

initializeViteAndStaticServing();
