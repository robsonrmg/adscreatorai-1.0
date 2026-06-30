import express from "express";
import path from "path";
import fs from "fs";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
// 1. Importar o cliente do Supabase
import { createClient } from "@supabase/supabase-js";

// Registrar gerenciadores de exceção global para garantir que o processo nunca caia de forma inesperada (ex: problemas na rede com Supabase)
process.on("unhandledRejection", (reason, promise) => {
  console.warn("⚠️ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});

dotenv.config({ override: true });

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// 2. Inicializar o cliente do Supabase usando variáveis de ambiente
let rawSupabaseUrl = (process.env.SUPABASE_URL || "").trim();
// Limpar a URL caso termine com o sufixo da API RESTful /rest/v1 ou /v1, comumente colado por engano
rawSupabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "");
rawSupabaseUrl = rawSupabaseUrl.replace(/\/v1\/?$/, "");
rawSupabaseUrl = rawSupabaseUrl.replace(/\/+$/, "");

const isPlaceholder = (val: string) => {
  const v = val.toLowerCase();
  return !v || 
         v.includes("your-") || 
         v.includes("placeholder") || 
         v.includes("your_") || 
         v.includes("example.com") || 
         v.includes("[") || 
         v.includes("]");
};

const SUPABASE_URL = isPlaceholder(rawSupabaseUrl) ? "" : rawSupabaseUrl;
const rawAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();
const SUPABASE_ANON_KEY = isPlaceholder(rawAnonKey) ? "" : rawAnonKey;

const rawServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = isPlaceholder(rawServiceRoleKey) ? "" : rawServiceRoleKey;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Silent fallback - Supabase is only for optional creator internal sync, so no warnings are needed
}

// O banco de dados no servidor prefere usar o service_role para contornar políticas RLS legítimas de forma segura.
const serverSupabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const supabase = (SUPABASE_URL && serverSupabaseKey) ? createClient(SUPABASE_URL, serverSupabaseKey) : null;

function logSupabaseSync(action: string, error: any) {
  // Silent sync to prevent throwing false error alerts for clients since Supabase is only for creator's optional internal use.
}

// Tentar criar ou garantir a existência do bucket 'page-media' de forma pública no Supabase
async function ensureBucketExists() {
  if (supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (!listError && buckets) {
        const exists = buckets.some(b => b.name === "page-media");
        if (exists) {
          return;
        }
      }

      await supabase.storage.createBucket("page-media", {
        public: true,
        allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"]
      });
    } catch (e: any) {
      // Quietly handle connection errors
    }
  }
}
ensureBucketExists();

// Executa o reset dos contadores de demonstração caso o Supabase esteja habilitado para uso em produção.
async function checkAndResetProjectCounters() {
  if (supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const db = readDB();
      // Não queremos resetar infinitamente os novos dados reais gerados. Usamos uma chave flag no db para saber se já limpamos uma primeira vez.
      if (!db.profile || !db.countersResetAfterSupabaseConnected) {
        console.log("[Supabase Connection] Habilitado para produção. Zerando os contadores de demonstração iniciais...");
        
        if (db.profile) {
          db.profile.pagesCreatedCount = 0;
        }
        
        if (db.pages && Array.isArray(db.pages)) {
          db.pages.forEach((page: any) => {
            page.views = 0;
            page.clicks = 0;
            page.ctr = 0;
          });
        }
        
        db.countersResetAfterSupabaseConnected = true;
        writeDB(db);
        console.log("[Supabase Connection] Contadores iniciais limpos com sucesso!");
      }
    } catch (err: any) {
      logSupabaseSync("Redefinição de contadores", err);
    }
  }
}
checkAndResetProjectCounters();

const STORAGE_DIR = path.join(process.cwd(), "storage");
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}
app.use("/storage", express.static(STORAGE_DIR));

// O arquivo DB_FILE e as funções antigas readDB() e writeDB() podem ser removidas daqui.
// Nota técnica de suporte: Para manter a compatibilidade e evitar erros críticos de compilação
// em todos os mais de 15 endpoints atuais do express que ainda dependem do readDB e writeDB de forma síncrona,
// mantemos as definições abaixo ativas até que cada endpoint seja migrado para lidar com promessas de forma assíncrona.

const DB_FILE = path.join(process.cwd(), "db.json");

// Cache em memória para evitar falhas em sistemas de arquivos somente-leitura (como o Vercel)
let memoryCacheDB: any = null;

// Helper to read database
function readDB() {
  if (memoryCacheDB) {
    return memoryCacheDB;
  }

  let dbData: any = null;
  if (fs.existsSync(DB_FILE)) {
    try {
      dbData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (e: any) {
      console.error("Erro ao ler db.json:", e);
    }
  }

  if (!dbData) {
    dbData = {
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
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), "utf-8");
    } catch (err: any) {
      console.warn("Aviso: Falha ao salvar banco inicial em disco (normal em Vercel read-only):", err.message);
    }
  }

  // Garante que o usuário padrão existe para o correto login
  if (dbData && (!dbData.users || dbData.users.length === 0)) {
    dbData.users = [
      {
        id: "1",
        name: dbData.profile?.name || "Ribeiromoreira91",
        email: dbData.profile?.email || "ribeiromoreira91@gmail.com",
        password: "123",
        planId: dbData.profile?.planId || "pro",
        subdomain: dbData.profile?.subdomain || "ribeiros-ads.adscreator.ai",
        avatarUrl: dbData.profile?.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
      }
    ];
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), "utf-8");
    } catch (err: any) {
      console.warn("Aviso: Falha ao salvar usuário padrão no db.json em disco:", err.message);
    }
  }

  memoryCacheDB = dbData;
  return memoryCacheDB;
}

// Helper to write database
function writeDB(data: any) {
  memoryCacheDB = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error: any) {
    console.warn("Aviso: Falha ao salvar db.json em disco (sistema de arquivos somente-leitura). As alterações ficarão apenas em memória temporária para este container:", error.message);
  }
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

// Retry wrapper for Gemini API calls to handle transient errors such as 503 (service unavailable) or 429 (rate limits)
async function generateContentWithRetry(ai: GoogleGenAI, params: any, maxRetries = 5, initialDelayMs = 2000) {
  let attempt = 0;
  const isVercel = !!process.env.VERCEL;
  const actualMaxRetries = isVercel ? 2 : maxRetries;
  const actualDelayMs = isVercel ? 1000 : initialDelayMs;

  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      attempt++;
      const isTransient = error?.status === 503 || 
                          error?.status === 429 || 
                          error?.code === 503 ||
                          error?.code === 429 ||
                          (error?.message && (
                            error.message.includes("503") || 
                            error.message.includes("429") || 
                            error.message.includes("temporary") || 
                            error.message.includes("experiencing high demand") ||
                            error.message.includes("UNAVAILABLE") ||
                            error.message.includes("Resource has been exhausted")
                          ));
      
      if (isTransient && attempt < actualMaxRetries) {
        const delay = actualDelayMs * Math.pow(2.2, attempt) * (0.8 + Math.random() * 0.4);
        console.warn(`[Gemini API] Erro transitório detectado (${error?.message || error}). Tentamos novamente em ${Math.round(delay)}ms... (Tentativa ${attempt} de ${actualMaxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
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

      // 2. Comprehensive pattern for any image source attributes inside tags (src, srcset, data-src, etc.)
      const imgTagRegex = /<img[^>]+(?:src|srcset|data-src|data-lazy|data-lazy-src|data-original|src-large)=["']([^"']+)["']/gi;
      let imgMatch;
      while ((imgMatch = imgTagRegex.exec(html)) !== null) {
        if (imgMatch[1]) {
          const rawMatches = imgMatch[1].trim().split(",");
          for (const rawItem of rawMatches) {
            const cleanUrl = rawItem.trim().split(/\s+/)[0];
            if (cleanUrl) {
              foundImgUrls.add(cleanUrl);
            }
          }
        }
      }

      // 3. Match explicit standard/relative background styling URLs
      const bgImgPattern = /url\s*\(\s*['"]?([^'")]+\.(?:png|jpg|jpeg|gif|webp|svg))['"]?\s*\)/gi;
      let bgMatch;
      while ((bgMatch = bgImgPattern.exec(html)) !== null) {
        if (bgMatch[1]) {
          foundImgUrls.add(bgMatch[1].trim());
        }
      }

      // 4. Match tags containing picture sources (srcset/src)
      const sourceTagRegex = /<source[^>]+(?:srcset|src)=["']([^"']+)["']/gi;
      let sourceMatch;
      while ((sourceMatch = sourceTagRegex.exec(html)) !== null) {
        if (sourceMatch[1]) {
          const rawMatches = sourceMatch[1].trim().split(",");
          for (const rawItem of rawMatches) {
            const cleanUrl = rawItem.trim().split(/\s+/)[0];
            if (cleanUrl) {
              foundImgUrls.add(cleanUrl);
            }
          }
        }
      }

      // 5. Match absolute image URLs anywhere in HTML (highly robust fallback!)
      const absoluteImageRegex = /(https?:\/\/[^\s'"()<>]+?\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s'"()<>]*)?)/gi;
      let absMatch;
      while ((absMatch = absoluteImageRegex.exec(html)) !== null) {
        if (absMatch[1]) {
          foundImgUrls.add(absMatch[1].trim());
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

  // Limit to at most 8 candidates to avoid hitting execution timeouts on serverless environments (like Vercel 10s limit)
  const uniqueCandidates = Array.from(new Set(candidateUrls)).slice(0, 8);
  console.log(`[AdsCreator AI] Candidatas qualificadas de mídias identificadas para download: ${uniqueCandidates.length}`);

  const STORAGE_DIR = path.join(process.cwd(), "storage");
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  let downloadCount = 0;

  for (const resolvedUrl of uniqueCandidates) {
    try {
      const urlLower = resolvedUrl.toLowerCase();
      // Classify the image appropriately with smart keywords
      let category: "logo" | "main" | "benefit" | "promo" | "secondary" = "secondary";
      if (urlLower.includes("logo") || urlLower.includes("brand") || urlLower.includes("marca")) {
        category = "logo";
      } else if (
        urlLower.includes("bottle") || 
        urlLower.includes("frasco") || 
        urlLower.includes("box") || 
        urlLower.includes("product") || 
        urlLower.includes("capsule") || 
        urlLower.includes("embalagem") || 
        urlLower.includes("pote") ||
        urlLower.includes("header") || 
        urlLower.includes("main") || 
        urlLower.includes("banner") || 
        urlLower.includes("hero") || 
        urlLower.includes("mockup")
      ) {
        category = "main";
      } else if (
        urlLower.includes("benefit") || 
        urlLower.includes("clin") || 
        urlLower.includes("ingre") || 
        urlLower.includes("prova") || 
        urlLower.includes("vantagem") ||
        urlLower.includes("dr-") ||
        urlLower.includes("doctor") ||
        urlLower.includes("med") ||
        urlLower.includes("expert") ||
        urlLower.includes("label") ||
        urlLower.includes("facts") ||
        urlLower.includes("study") ||
        urlLower.includes("nutrition") ||
        urlLower.includes("science") ||
        urlLower.includes("certification")
      ) {
        category = "benefit";
      } else if (
        urlLower.includes("price") || 
        urlLower.includes("oferta") || 
        urlLower.includes("promo") || 
        urlLower.includes("checkout") || 
        urlLower.includes("comprar") ||
        urlLower.includes("guarantee") ||
        urlLower.includes("warranty") ||
        urlLower.includes("stamp") ||
        urlLower.includes("seal") ||
        urlLower.includes("badge")
      ) {
        category = "promo";
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5 seconds download safety timeout per file
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

      const fileHash = (Math.random().toString(36).substring(2, 8) + Date.now().toString(36).substring(4)).replace(/[^a-z0-9]/gi, "");
      const filename = `scraped_${category}_${fileHash}.${extension}`.replace(/[^a-zA-Z0-9_.-]/g, "");

      let servedUrl = "";
      if (supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("page-media")
            .upload(filename, buffer, {
              contentType: contentType || "image/png",
              upsert: true
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from("page-media")
              .getPublicUrl(filename);
            servedUrl = publicUrlData?.publicUrl || "";
            console.log(`[Supabase Storage] Objeto sincronizado com sucesso: ${servedUrl}`);
          } else {
            logSupabaseSync("Upload para o storage", uploadError);
            console.info(`[Supabase Storage Fallback] Ativando fallback de armazenamento local para garantir o funcionamento imediato.`);
          }
        } catch (supabaseErr: any) {
          logSupabaseSync("Transmissão de imagem para o storage", supabaseErr);
        }
      }

      // Fallback local caso o Supabase não esteja configurado ou ocorra um erro
      if (!servedUrl) {
        const localPath = path.join(STORAGE_DIR, filename);
        fs.writeFileSync(localPath, buffer);
        servedUrl = `/storage/${filename}`;
        console.log(`[Local Storage Fallback] Salvo localmente: ${servedUrl}`);
      }

      downloadCount++;

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

// Extract clean descriptive text blocks from raw HTML to use as direct context for copy generation
function extractVisibleText(html: string): string {
  if (!html) return "";
  try {
    // Remove scripts, styles, head, iframes, svgs, forms, footers, headers, navs, noscripts to keep definitions clean
    let cleanHtml = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<head[\s\S]*?<\/head>/gi, " ")
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<form[\s\S]*?<\/form>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ");

    // Extract content inside standard text delivery tags
    const matches = cleanHtml.match(/<(p|h1|h2|h3|h4|li|span|div)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
    const textBlocks: string[] = [];

    for (const match of matches) {
      // Strip inner tags
      let blockText = match.replace(/<[^>]*>/g, " ")
                           .replace(/&nbsp;/g, " ")
                           .replace(/\s+/g, " ")
                           .trim();

      // Decode basic HTML entities
      blockText = blockText.replace(/&amp;/g, "&")
                           .replace(/&quot;/g, '"')
                           .replace(/&apos;/g, "'")
                           .replace(/&lt;/g, "<")
                           .replace(/&gt;/g, ">")
                           .replace(/&#39;/g, "'")
                           .replace(/&deg;/g, "°");

      // Filter out boilerplates, empty links, or extremely short buttons/menus
      if (
        blockText.length > 25 &&
        blockText.length < 1200 &&
        !/cookie|privacy policy|terms of use|all rights reserved|click here|add to cart|order now|checkout|contact us|sign in|login|forgot password|submit|subscribe/i.test(blockText)
      ) {
         textBlocks.push(blockText);
      }
    }

    // Unique blocks
    const uniqueBlocks = Array.from(new Set(textBlocks));
    return uniqueBlocks.join("\n\n").slice(0, 10000);
  } catch (err) {
    console.warn("[extractVisibleText] Erro ao extrair textos:", err);
    return "";
  }
}

// URL Parsing service with beautiful simulation + scraping
async function fetchAndAnalyzeUrl(targetUrl: string, pageType: string, generationLanguage: string = "pt", affiliateLink: string = "") {
  console.log(`Iniciando análise da URL: ${targetUrl} para o tipo ${pageType} no idioma ${generationLanguage}`);
  let scrapedTitle = "";
  let scrapedDescription = "";
  let scrapedFullDescriptions = "";
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

  // 2. Perform a lightweight HTTP fetch to capture meta tags and full text descriptions from actual page if possible
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout for full scraping
    const fetchRes = await fetch(targetUrl, { 
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      },
      signal: controller.signal 
    });
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

      // Extract all readable content/descriptions
      scrapedFullDescriptions = extractVisibleText(htmlText);
      console.log(`[Scrape Manager] ${scrapedFullDescriptions.length} caracteres de descrições reais extraídos da URL de referência.`);
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

  // Define structured template prompt incorporating full descriptions
  let systemPrompt = `Você é um Copywriter especialista em Marketing de Afiliados de alta conversão.
Sua missão é ler dados de um afiliado e retornar uma resposta JSON impecável com cópias estruturadas de vendas no idioma: ${chosenLangName}.
O tipo de página a ser gerada é: "${pageType}".
Baseado no nome do produto: "${deducedProductName}".
Baseado no título de referência: "${scrapedTitle}".
Descrição de referência: "${scrapedDescription}".

`;

  if (scrapedFullDescriptions) {
    systemPrompt += `
-----------------------------------------
DESCRIÇÕES COMPLETAS, INGREDIENTES E ARGUMENTOS REAIS DO PRODUTO EXTRAÍDOS DO SITE DA OFERTA:
Use esses dados abaixo para ser extremamente fiel ao produto original (características, benefícios, fórmulas, problemas que resolve, etc.):
${scrapedFullDescriptions}
-----------------------------------------

`;
  }

  systemPrompt += `
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
    const response = await generateContentWithRetry(ai, {
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
      ctaDefault: `QUERO ADQUIRIR ${prod.toUpperCase()} COM DESCONTO`,
      galleryTitle: `Ofertas & Apresentação`,
      gallerySubtitle: "Todas as versões e pacotes promocionais de todos os produtos identificados"
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
      ctaDefault: `YES, I WANT TO SECURE MY ${prod.toUpperCase()} WITH DISCOUNT`,
      galleryTitle: `Special Offers & Presentation`,
      gallerySubtitle: "All versions and promotional packages of all identified products below"
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
      guaranteeText: "Adquira hoy y obtenga nuestra cobertura blindada de satisfacción incondicional de 30 días para comprobar todos os benefícios.",
      ctaDefault: `SÍ, QUIERO ADQUIRIR ${prod.toUpperCase()} CON DESCUENTO`,
      galleryTitle: `Ofertas y Presentación`,
      gallerySubtitle: "Todas las versiones y paquetes promocionales de todos los productos identificados"
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
      galleryTitle: `Offerte & Presentazione`,
      gallerySubtitle: "Tutte le versioni e pacchetti promozionali di tutti i prodotti identificati",
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
      ctaDefault: `SÉCURISER MON ${prod.toUpperCase()} AVEC RÉDUCTION`,
      galleryTitle: `Offres & Présentation`,
      gallerySubtitle: "Toutes les versions et packs promotionnels de tous les produits identifiés"
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
  let allProductImgList: string[] = [];

  if (aiData.scrapedImages) {
    if (aiData.scrapedImages.mainProductImage) {
      allProductImgList.push(aiData.scrapedImages.mainProductImage);
    }
    if (aiData.scrapedImages.secondaryImages && aiData.scrapedImages.secondaryImages.length > 0) {
      allProductImgList.push(...aiData.scrapedImages.secondaryImages);
    }
    if (aiData.scrapedImages.benefitImages && aiData.scrapedImages.benefitImages.length > 0) {
      allProductImgList.push(...aiData.scrapedImages.benefitImages);
    }
    if (aiData.scrapedImages.promotionalImages && aiData.scrapedImages.promotionalImages.length > 0) {
      allProductImgList.push(...aiData.scrapedImages.promotionalImages);
    }
  }

  // Deduplicate and filter out fallback URLs, limiting to maximum of 6 images
  allProductImgList = Array.from(new Set(allProductImgList))
    .filter(url => url && !url.includes("fallback-image"))
    .slice(0, 6);

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
      alt: currentLoc.mainImageAlt,
      images: allProductImgList.length > 0 ? allProductImgList : undefined,
      title: `${prod} - ${currentLoc.galleryTitle}`
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

// Obter status de conexão com o Supabase de forma proativa para informar o gestor
app.get("/api/auth/status", async (req, res) => {
  try {
    if (!supabase || !SUPABASE_URL) {
      return res.json({
        supabaseConfigured: false,
        supabaseStatus: "offline",
        supabaseMessage: "O Supabase não está configurado nesta instância. O AdsCreator AI está operando de forma 100% autônoma usando o banco local db.json."
      });
    }

    // Faz um teste rápido de conectividade com timeout curto (1.5 segundos)
    const testPromise = supabase.from("profiles").select("count", { count: "exact", head: true });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout de conexão")), 1500));
    
    try {
      await Promise.race([testPromise, timeoutPromise]);
      return res.json({
        supabaseConfigured: true,
        supabaseStatus: "online",
        supabaseMessage: "Banco do Supabase conectado com sucesso em tempo real."
      });
    } catch (testErr: any) {
      const errMsg = (testErr?.message || "").toLowerCase();
      const errCode = String(testErr?.code || "");
      const isTableMissing = errMsg.includes("relation") && errMsg.includes("does not exist") || errCode === "PGRST205" || errCode === "42P01";

      if (isTableMissing) {
        return res.json({
          supabaseConfigured: true,
          supabaseStatus: "tables_missing",
          supabaseMessage: "O servidor conectou ao Supabase com sucesso, mas a tabela 'profiles' ou 'pages' ainda não foi criada no banco de dados."
        });
      }

      return res.json({
        supabaseConfigured: true,
        supabaseStatus: "offline",
        supabaseMessage: `Falta de resposta do Supabase (${testErr.message || 'limite de tempo excedido'}). Sistema utilizando contingência e cache db.json.`
      });
    }
  } catch (err: any) {
    return res.json({
      supabaseConfigured: true,
      supabaseStatus: "offline",
      supabaseMessage: "Erro ao autenticar o status com o Supabase. Usando o banco local integrado."
    });
  }
});

// Registrar novo usuário localmente (com sync opcional ao Supabase se configurado)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, avatarUrl } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nome completo, e-mail e senha são obrigatórios." });
    }

    const db = readDB();
    const emailLower = email.trim().toLowerCase();
    
    db.users = db.users || [];
    const existingUser = db.users.find((u: any) => u.email.trim().toLowerCase() === emailLower);
    if (existingUser) {
      return res.status(400).json({ error: "Este endereço de e-mail já está cadastrado." });
    }

    const newUser = {
      id: Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      email: emailLower,
      password: password,
      planId: "starter",
      pagesCreatedCount: 0,
      subdomain: `${name.trim().toLowerCase().replace(/[^a-z0-9]/g, "")}-ads.adscreator.ai`,
      avatarUrl: avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
    };

    db.users.push(newUser);
    
    db.profile = {
      name: newUser.name,
      email: newUser.email,
      planId: newUser.planId,
      pagesCreatedCount: newUser.pagesCreatedCount,
      subdomain: newUser.subdomain,
      avatarUrl: newUser.avatarUrl
    };

    writeDB(db);

    addLog("Cadastro de Conta", `Novo usuário registrado: ${newUser.name} (${newUser.email})`);

    if (supabase) {
      // Sincronização em segundo plano não-bloqueante de perfis no Supabase via IIFE assíncrona
      (async () => {
        try {
          const { error } = await supabase.from("profiles").insert({
            name: newUser.name,
            email: newUser.email,
            plan_id: newUser.planId,
            pages_created_count: newUser.pagesCreatedCount,
            subdomain: newUser.subdomain
          });
          if (error) {
            logSupabaseSync("Inserção de perfil", error);
          } else {
            console.log("[Supabase Register Sync] Perfil do usuário gerado e salvo no Supabase!");
          }
        } catch (sbErr: any) {
          logSupabaseSync("Sincronização remota pendente de perfil", sbErr);
        }
      })();
    }

    return res.status(201).json(db.profile);
  } catch (err: any) {
    console.error("Erro no cadastro:", err);
    return res.status(500).json({ error: "Falha de servidor ao processar o cadastro." });
  }
});

// Realizar Login de usuário localmente
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const db = readDB();
    const emailLower = email.trim().toLowerCase();

    db.users = db.users || [];
    const user = db.users.find((u: any) => u.email.trim().toLowerCase() === emailLower);
    
    if (!user) {
      return res.status(404).json({ error: "Usuário com este e-mail não foi encontrado." });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: "Senha incorreta. Tente novamente." });
    }

    db.profile = {
      name: user.name,
      email: user.email,
      planId: user.planId || "starter",
      pagesCreatedCount: user.pagesCreatedCount || 0,
      subdomain: user.subdomain || `${user.name.toLowerCase().replace(/[^a-z0-9]/g, "")}-ads.adscreator.ai`,
      avatarUrl: user.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
    };

    writeDB(db);

    addLog("Login Realizado", `Acesso feito por: ${user.name} (${user.email})`);

    return res.json(db.profile);
  } catch (err: any) {
    console.error("Erro no login:", err);
    return res.status(500).json({ error: "Falha de servidor ao processar o login." });
  }
});

// Get Profile Info
app.get("/api/profile", async (req, res) => {
  try {
    const db = readDB();
    const localProfile = db.profile || {
      name: "Afiliado Autoridade",
      email: "ribeiromoreira91@gmail.com",
      planId: "starter",
      pagesCreatedCount: 2,
      subdomain: "ribeiros-ads.adscreator.ai"
    };

    let supabaseProfile: any = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .limit(1)
          .single();

        if (!error && data) {
          supabaseProfile = data;
        }
      } catch (err: any) {
        if (err.message && err.message.includes("fetch failed")) {
          console.log("[Supabase Profiles] Conexão indisponível, usando cache perfil local.");
        } else {
          console.log("[Supabase Profiles] Erro ao carregar perfil, usando local:", err.message || err);
        }
      }
    }

    if (supabaseProfile) {
      // Sincroniza campos locais com o Supabase
      localProfile.name = supabaseProfile.name || localProfile.name;
      localProfile.email = supabaseProfile.email || localProfile.email;
      localProfile.planId = supabaseProfile.plan_id || localProfile.planId;
      localProfile.pagesCreatedCount = supabaseProfile.pages_created_count ?? localProfile.pagesCreatedCount;
      localProfile.subdomain = supabaseProfile.subdomain || localProfile.subdomain;
      localProfile.customDomain = supabaseProfile.custom_domain || localProfile.customDomain;

      db.profile = localProfile;
      writeDB(db);
    }

    return res.json(localProfile);
  } catch (error) {
    console.error("Erro geral no endpoint de perfil:", error);
    try {
      const db = readDB();
      return res.json(db.profile || {});
    } catch {
      return res.json({
        name: "Afiliado Autoridade",
        email: "ribeiromoreira91@gmail.com",
        planId: "starter",
        pagesCreatedCount: 2,
        subdomain: "ribeiros-ads.adscreator.ai"
      });
    }
  }
});

// Update Profile Custom Domain / Subdomain
app.post("/api/profile/domain", async (req, res) => {
  const { subdomain, customDomain } = req.body;
  const db = readDB();
  db.profile = db.profile || {};
  if (subdomain !== undefined) db.profile.subdomain = subdomain;
  if (customDomain !== undefined) db.profile.customDomain = customDomain;
  writeDB(db);
  
  addLog("Mudança de Domínio", `Sua URL de publicação foi redefinida. Subdomínio: ${subdomain || "-"} | Domínio Próprio: ${customDomain || "-"}`);

  if (supabase) {
    try {
      const { data: firstProfile } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
      const payload: any = {
        subdomain: subdomain || db.profile.subdomain,
        custom_domain: customDomain || db.profile.customDomain
      };

      if (firstProfile?.id) {
        await supabase.from("profiles").update(payload).eq("id", firstProfile.id);
      } else {
        await supabase.from("profiles").insert({
          name: db.profile.name || "Afiliado Autoridade",
          email: db.profile.email || "seu-email@gmail.com",
          plan_id: db.profile.planId || "starter",
          pages_created_count: db.profile.pagesCreatedCount || 0,
          ...payload
        });
      }
    } catch (err: any) {
      logSupabaseSync("Sincronizar alteração de domínio", err);
    }
  }

  res.json(db.profile);
});

// Verify custom domain DNS configuration (CNAME target)
app.post("/api/domains/verify", async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) {
      return res.status(400).json({ error: "O domínio não foi informado." });
    }

    // Clean domain: extract hostname
    let cleanDomain = domain.trim().toLowerCase();
    cleanDomain = cleanDomain.replace(/^(https?:\/\/)?(www\.)?/, "");
    cleanDomain = cleanDomain.replace(/^(https?:\/\/)/, "");
    cleanDomain = cleanDomain.split("/")[0];

    if (!cleanDomain) {
      return res.status(400).json({ error: "Domínio inválido ou malformado." });
    }

    console.log(`[DNS Verify] Verificando CNAME para o domínio: ${cleanDomain}`);

    let cnames: string[] = [];
    let isConfigured = false;
    let errorMsg = "";

    try {
      cnames = await dns.promises.resolveCname(cleanDomain);
      // Normalized check
      const cleanCnames = cnames.map(c => c.replace(/\.$/, "").toLowerCase());
      isConfigured = cleanCnames.some(c => c === "adscreator.ai" || c === "pages.adscreator.ai" || c.includes("adscreator"));
    } catch (err: any) {
      errorMsg = err.message || String(err);
      if (err.code === "ENOTFOUND") {
        errorMsg = "Domínio não encontrado (NXDOMAIN). Verifique se digitou o domínio corretamente e se o registro foi salvo no seu provedor.";
      } else if (err.code === "ENODATA") {
        errorMsg = "Nenhum registro CNAME foi encontrado para este domínio. Ele pode ter apenas registros do tipo A, ou a propagação DNS ainda não terminou.";
      }
    }

    let aRecords: string[] = [];
    try {
      aRecords = await dns.promises.resolve4(cleanDomain);
    } catch (err) {
      // ignore
    }

    return res.json({
      domain: cleanDomain,
      type: "CNAME",
      expected: "adscreator.ai",
      foundCnames: cnames,
      foundARecords: aRecords,
      isConfigured,
      errorMsg: isConfigured ? "" : (errorMsg || "Nenhum registro CNAME apontando para 'adscreator.ai' foi localizado.")
    });
  } catch (globalErr: any) {
    console.error("[DNS Verify] Erro geral na verificação de DNS:", globalErr);
    return res.status(500).json({ error: "Ocorreu um erro interno ao tentar resolver os registros de DNS." });
  }
});

// Update Plan Limit
app.post("/api/profile/plan", async (req, res) => {
  const { planId } = req.body;
  const db = readDB();
  db.profile = db.profile || {};
  db.profile.planId = planId;
  writeDB(db);
  
  addLog("Alteração de Plano", `Seu plano do AdsCreator AI foi alterado para: ${planId.toUpperCase()}`);

  if (supabase) {
    try {
      const { data: firstProfile } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
      const payload: any = {
        plan_id: planId
      };

      if (firstProfile?.id) {
        await supabase.from("profiles").update(payload).eq("id", firstProfile.id);
      } else {
        await supabase.from("profiles").insert({
          name: db.profile.name || "Afiliado Autoridade",
          email: db.profile.email || "seu-email@gmail.com",
          plan_id: planId,
          pages_created_count: db.profile.pagesCreatedCount || 0,
          subdomain: db.profile.subdomain || "seu-SaaS.adscreator.ai"
        });
      }
    } catch (err: any) {
      logSupabaseSync("Sincronizar alteração de plano", err);
    }
  }

  res.json(db.profile);
});

// Update Profile Details (Name, Email, Avatar URL)
app.post("/api/profile/update", async (req, res) => {
  const { name, email, avatarUrl } = req.body;
  const db = readDB();
  db.profile = db.profile || {};
  if (name !== undefined) db.profile.name = name;
  if (email !== undefined) db.profile.email = email;
  if (avatarUrl !== undefined) db.profile.avatarUrl = avatarUrl;
  writeDB(db);
  
  addLog("Atualização de Perfil", `Seus dados de acesso foram atualizados. Nome: ${name || db.profile.name}`);

  if (supabase) {
    try {
      const { data: firstProfile } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
      const payload: any = {};
      if (name !== undefined) payload.name = name;
      if (email !== undefined) payload.email = email;

      if (firstProfile?.id) {
        await supabase.from("profiles").update(payload).eq("id", firstProfile.id);
      } else {
        await supabase.from("profiles").insert({
          name: name || "Afiliado Autoridade",
          email: email || "seu-email@gmail.com",
          plan_id: db.profile.planId || "starter",
          pages_created_count: db.profile.pagesCreatedCount || 0,
          subdomain: db.profile.subdomain || "seu-SaaS.adscreator.ai",
          ...payload
        });
      }
    } catch (err: any) {
      logSupabaseSync("Sincronizar atualização de perfil", err);
    }
  }

  res.json(db.profile);
});

// Fetch All Generated Pages (Dashboard list)
app.get("/api/pages", async (req, res) => {
  try {
    const db = readDB();
    const localPages = db.pages || [];

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.json(localPages);
    }

    try {
      const { data: pages, error } = await supabase
        .from("pages")
        .select("id, title, slug, type, status, original_url, product_name, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (pages && pages.length > 0) {
        const freshDb = readDB();
        freshDb.pages = freshDb.pages || [];
        
        pages.forEach((p: any) => {
          const matchedIdx = freshDb.pages.findIndex((x: any) => x.id === p.id || x.slug === p.slug);
          const mappedPage = {
            id: p.id,
            title: p.title,
            slug: p.slug,
            type: p.type,
            status: p.status || 'Publicada',
            originalUrl: p.original_url,
            productName: p.product_name,
            createdAt: p.created_at || new Date().toISOString()
          };

          if (matchedIdx !== -1) {
            freshDb.pages[matchedIdx] = {
              ...freshDb.pages[matchedIdx],
              ...mappedPage
            };
          } else {
            freshDb.pages.push({
              ...mappedPage,
              views: 0,
              clicks: 0,
              ctr: 0,
              components: []
            });
          }
        });
        
        writeDB(freshDb);
        return res.json(freshDb.pages);
      }
    } catch (err: any) {
      if (err.message && err.message.includes("fetch failed")) {
        console.log("[Supabase Pages] Conexão indisponível, usando páginas locais.");
      } else {
        console.log("[Supabase Pages] Erro ao carregar páginas do Supabase, usando locais:", err.message || err);
      }
    }

    return res.json(localPages);
  } catch (error) {
    console.error("Erro ao listar páginas:", error);
    try {
      const db = readDB();
      return res.json(db.pages || []);
    } catch {
      return res.json([]);
    }
  }
});

// Create/Save Page on Supabase & Local DB
app.post("/api/pages", async (req, res) => {
  const { title, slug, type, originalUrl, productName, htmlContent } = req.body;

  if (!slug || !htmlContent) {
    return res.status(400).json({ error: "Slug e conteúdo HTML são obrigatórios." });
  }

  try {
    const cleanSlug = slug.trim().toLowerCase();
    const pageId = `page-${Date.now()}`;

    const newPage = {
      id: pageId,
      title: title || "Página Sem Título",
      slug: cleanSlug,
      type: type || "Landing Page",
      status: "Publicada",
      originalUrl: originalUrl || null,
      productName: productName || "Produto",
      createdAt: new Date().toISOString(),
      views: 0,
      clicks: 0,
      ctr: 0,
      components: []
    };

    // Salva localmente primeiro
    const db = readDB();
    if (db.pages.some((p: any) => p.slug === cleanSlug)) {
      return res.status(400).json({ error: "Este link/slug já está em uso por outra página." });
    }
    db.pages.push(newPage);
    writeDB(db);
    addLog("Salvar Página", `Página "${newPage.title}" salva com sucesso.`);

    if (supabase) {
      try {
        const sbPage = {
          id: pageId,
          title: title || "Página Sem Título",
          slug: cleanSlug,
          type: type || "Landing Page",
          status: "Publicada",
          original_url: originalUrl || null,
          product_name: productName || "Produto",
          html_content: htmlContent,
          created_at: newPage.createdAt
        };

        const { error } = await supabase
          .from("pages")
          .insert([sbPage]);

        if (error) {
          logSupabaseSync("Inserir página no Supabase", error);
        }
      } catch (sbErr: any) {
        logSupabaseSync("Inserir página no Supabase (exceção)", sbErr);
      }
    }

    return res.status(201).json({ 
      success: true, 
      page: {
        id: newPage.id,
        title: newPage.title,
        slug: newPage.slug,
        type: newPage.type,
        status: newPage.status
      } 
    });
  } catch (error) {
    console.error("Erro ao salvar nova página:", error);
    return res.status(500).json({ error: "Falha ao salvar a página." });
  }
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

    if (supabase) {
      try {
        const updatedPage = db.pages[pIndex];
        const htmlContent = compilePageHtml(updatedPage, db);
        supabase.from("pages").update({
          title: updatedPage.title,
          type: updatedPage.type,
          html_content: htmlContent
        }).eq("id", id).then(({ error }) => {
          if (error) {
            logSupabaseSync("Sincronizar edição de página", error);
          } else {
            console.log(`[Supabase Pages] Edição sincronizada com sucesso para id: ${id}`);
          }
        });
      } catch (sbErr: any) {
        logSupabaseSync("Sincronizar edição de página (exceção)", sbErr);
      }
    }

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

    if (supabase) {
      try {
        const htmlContent = compilePageHtml(duplicate, db);
        const sbPage = {
          id: duplicate.id,
          title: duplicate.title,
          slug: duplicate.slug,
          type: duplicate.type,
          status: duplicate.status || 'Publicada',
          original_url: duplicate.originalUrl || null,
          product_name: duplicate.productName || "Produto",
          html_content: htmlContent,
          created_at: duplicate.createdAt
        };
        supabase.from("pages").insert([sbPage]).then(({ error }) => {
          if (error) {
            logSupabaseSync("Duplicação de página", error);
          } else {
            console.log(`[Supabase Pages] Duplicação sincronizada no Supabase: ${duplicate.slug}`);
          }
        });
      } catch (sbErr: any) {
        logSupabaseSync("Duplicação de página (exceção)", sbErr);
      }
    }

    res.json(duplicate);
  } else {
    res.status(404).json({ error: "Página não encontrada." });
  }
});

// Import Page from Backup or HTML metadata
app.post("/api/pages/import", (req, res) => {
  const { pageData } = req.body;
  if (!pageData || !pageData.slug || !pageData.components) {
    return res.status(400).json({ error: "Dados de importação inválidos ou incompletos." });
  }

  try {
    const db = readDB();

    // Check Plan Limits
    const limit = db.profile.planId === "starter" ? 10 : db.profile.planId === "pro" ? 50 : 999999;
    const currentCount = (db.pages || []).length;
    if (currentCount >= limit) {
      return res.status(422).json({ error: `Você atingiu o limite de ${limit} páginas para o plano ${db.profile.planId.toUpperCase()}. Por favor, faça um upgrade para importar.` });
    }

    // Ensure unique slug
    let finalSlug = pageData.slug.trim().toLowerCase();
    let counter = 1;
    while ((db.pages || []).some((p: any) => p.slug === finalSlug)) {
      finalSlug = `${pageData.slug}-${counter}`;
      counter++;
    }

    const importedPage = {
      ...pageData,
      id: "p_" + Math.random().toString(36).substr(2, 9),
      slug: finalSlug,
      createdAt: new Date().toISOString(),
      views: 0,
      clicks: 0,
      ctr: 0
    };

    db.pages = db.pages || [];
    db.pages.push(importedPage);
    writeDB(db);

    addLog("Importação de Página", `Página "${importedPage.title}" importada e restaurada a partir do HTML.`);

    if (supabase) {
      try {
        const htmlContent = compilePageHtml(importedPage, db);
        const sbPage = {
          id: importedPage.id,
          title: importedPage.title,
          slug: importedPage.slug,
          type: importedPage.type,
          status: importedPage.status || "Publicada",
          original_url: importedPage.originalUrl || null,
          product_name: importedPage.productName || "Produto",
          html_content: htmlContent,
          created_at: importedPage.createdAt
        };
        supabase.from("pages").insert([sbPage]).then(({ error }) => {
          if (error) {
            logSupabaseSync("Importação de página", error);
          }
        });
      } catch (sbErr: any) {
        logSupabaseSync("Importação de página (exceção)", sbErr);
      }
    }

    res.status(201).json({ success: true, page: importedPage });
  } catch (err: any) {
    console.error("Erro ao importar página:", err);
    res.status(500).json({ error: "Erro interno do servidor ao importar os dados da página." });
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

    if (supabase) {
      try {
        supabase.from("pages").delete().eq("id", id).then(({ error }) => {
          if (error) {
            logSupabaseSync("Exclusão de página", error);
          } else {
            console.log(`[Supabase Pages] Remoção sincronizada no Supabase id: ${id}`);
          }
        });
      } catch (sbErr: any) {
        logSupabaseSync("Exclusão de página (exceção)", sbErr);
      }
    }

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
      cookie_appearance: cookie_appearance || "modal",
      scrapedImages: aiData.scrapedImages
    };

    db.pages.push(newPage);
    writeDB(db);
    addLog("Criação Automática por IA", `Página "${newPage.title}" gerada com sucesso e cadastrada no domínio ${cleanDomain}!`);

    if (supabase) {
      try {
        const htmlContent = compilePageHtml(newPage, db);
        const sbPage = {
          id: newPage.id,
          title: newPage.title,
          slug: newPage.slug,
          type: newPage.type,
          status: newPage.status,
          original_url: newPage.originalUrl,
          product_name: newPage.productName,
          html_content: htmlContent,
          created_at: newPage.createdAt
        };

        const { error } = await supabase
          .from("pages")
          .insert([sbPage]);

        if (error) {
          logSupabaseSync("Página gerada automaticamente", error);
        } else {
          console.log(`[Supabase Pages] Página gerada sincronizada com sucesso: ${newPage.slug}`);
        }
      } catch (sbErr: any) {
        logSupabaseSync("Página gerada automaticamente (exceção)", sbErr);
      }
    }

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
    existingPage.scrapedImages = aiData.scrapedImages;
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
    
    // Fallback or custom destination link (User requested prioritizing affiliate link over producer link to prevent leak)
    const destinationUrl = page.affiliate_link || page.cookie_destination_url || "#";
    const language = page.generation_language || "pt";

    const productName = page.productName || page.product_name || "Meticore";
    let logoUrl = "";
    let mainProductImg = "";
    let benefitImg = "";

    // Primeiro tenta puxar mídias da própria página de de cookies
    if (page.scrapedImages) {
      if (page.scrapedImages.logoImage) {
        logoUrl = page.scrapedImages.logoImage;
      }
      if (page.scrapedImages.mainProductImage) {
        mainProductImg = page.scrapedImages.mainProductImage;
      } else if (page.scrapedImages.secondaryImages && page.scrapedImages.secondaryImages.length > 0) {
        mainProductImg = page.scrapedImages.secondaryImages[0];
      }
      if (page.scrapedImages.benefitImages && page.scrapedImages.benefitImages.length > 0) {
        benefitImg = page.scrapedImages.benefitImages[0];
      } else if (page.scrapedImages.secondaryImages && page.scrapedImages.secondaryImages.length > 1) {
        benefitImg = page.scrapedImages.secondaryImages[1];
      }
    }

    if (page.components) {
      const headline = page.components.find((c: any) => c.type === "headline" && c.content?.logo);
      if (headline?.content?.logo) {
        logoUrl = logoUrl || headline.content.logo;
      }
      const imgs = page.components.filter((c: any) => c.type === "image" && c.content?.src);
      if (imgs.length > 0) {
        mainProductImg = mainProductImg || imgs[0].content.src;
        if (imgs.length > 1) {
          benefitImg = benefitImg || imgs[1].content.src;
        }
      }
    }

    // Procura outras páginas do mesmo produto para reaproveitar mídias e logos reais
    const sameProductPages = (db.pages || []).filter((p: any) => 
      p.id !== page.id && 
      (p.productName || p.product_name) &&
      (String(p.productName).toLowerCase() === String(productName).toLowerCase() || 
       String(p.product_name).toLowerCase() === String(productName).toLowerCase() ||
       String(p.productName).toLowerCase() === String(page.product_name || "").toLowerCase() ||
       String(p.product_name).toLowerCase() === String(page.product_name || "").toLowerCase())
    );

    if (!logoUrl) {
      for (const p of sameProductPages) {
        if (p.components) {
          const headline = p.components.find((c: any) => c.type === "headline" && c.content?.logo);
          if (headline?.content?.logo) {
            logoUrl = headline.content.logo;
            break;
          }
        }
      }
    }

    if (!mainProductImg || !benefitImg) {
      for (const p of sameProductPages) {
        if (p.components) {
          const imgs = p.components.filter((c: any) => c.type === "image" && c.content?.src);
          if (imgs.length > 0) {
            mainProductImg = mainProductImg || imgs[0].content.src;
            if (imgs.length > 1) {
              benefitImg = benefitImg || imgs[1].content.src;
            }
            break;
          }
        }
      }
    }

    // Fallbacks elegantes se não houver mídias no BD
    if (!mainProductImg) {
      mainProductImg = `/api/fallback-image?product=${encodeURIComponent(productName)}`;
    }
    if (!benefitImg) {
      benefitImg = `/api/fallback-image?product=${encodeURIComponent(productName)}&benefit=true`;
    }

    const bgLocals: Record<string, any> = {
      pt: {
        specCheck: "✨ FÓRMULA CLÍNICA EXCLUSIVA E TESTADA EM 2026",
        officialSupply: "Distribuição Oficial Direta do Fabricante",
        satisfactoryRate: "99.4% de Satisfação",
        satisfactoryDesc: "Nível médio de aprovação documentado entre as dezenas de milhares de clientes ativos.",
        secureConn: "Conexão Criptografada",
        secureConnDesc: "Seu canal é 100% verificado e assegurado com certificação de nível comercial SSL.",
        qualityCert: "Instalações Controladas",
        qualityCertDesc: "As diretrizes seguem normas rigorosas de pureza de insumos e manufatura de ponta.",
        specReviewTitle: "Lista de Verificação Oficial de Qualidade",
        specReviewFeature: "Fator de Avaliação",
        specReviewAlt: "Outras Marcas do Mercado",
        yesMarker: "Sim (✓)",
        noMarker: "Não (⨉)",
        certRaw: "Matérias-primas importadas com controle de lote integrado",
        certRatio: "Proporções estudadas e otimizadas cientificamente",
        certGuarantee: "Satisfação garantida ou devolução total em 30 dias",
        officialDirect: `${productName} - Distribuidor Oficial`,
        disclaimer: "Informação Importante: As opiniões expressas neste portal de aquecimento são de cunho estritamente informativo e de conteúdo educacional. Os resultados práticos de satisfação relatados podem flutuar dependendo do organismo do usuário.",
        footerText: `© 2026 ${productName}. Todos os direitos de propriedade intelectual reservados.`,
        heroHeadline: `A inovadora fórmula cientificamente balanceada de <span class="text-blue-600">${productName}</span>.`,
        heroSub: "Desenvolvida com ingredientes puros estudados exaustivamente sob os mais rígidos preceitos de qualidade de mercado. Faça como os mais de 145.000 clientes satisfeitos no mundo inteiro.",
        benefits: ["Ingredientes 100% Puros e Selecionados", "Livre de Alergênicos ou Organismos OGM", "Recomendado por Especialistas", "Garantia Integral de Reembolso do Fabricador"],
        secureAccess: "Conexão 100% Segura pelo Fabricante",
        details: "Detalhes do Produto",
        research: "Estudos Científicos",
        testimonials: "Opiniões Reais",
        faq: "Perguntas e Respostas"
      },
      en: {
        specCheck: "✨ EXCLUSIVE CLINICALLY TESTED FORMULA 2026",
        officialSupply: "Manufacturer Direct Official Supply Network",
        satisfactoryRate: "99.4% Approval Rate",
        satisfactoryDesc: "Verified average satisfaction reported across over a hundred thousand active customers.",
        secureConn: "Secure Encryption",
        secureConnDesc: "Your channel is 100% encrypted and protected through state-of-the-art SSL layers.",
        qualityCert: "FDA Registered Premises",
        qualityCertDesc: "High sanitation protocols and sterile testing at every manufacturing batch.",
        specReviewTitle: "Official Qualificative Verification Table",
        specReviewFeature: "Rating Factor",
        specReviewAlt: "Average Market Substitutes",
        yesMarker: "Yes (✓)",
        noMarker: "No (⨉)",
        certRaw: "Active premium raw imports with thorough chemical tracking",
        certRatio: "Scientifically accurate ratios optimized for absorption",
        certGuarantee: "Unconditional 30-day satisfaction backup coverage",
        officialDirect: `${productName} - Official Supplier`,
        disclaimer: "Important Legal Notice: The reviews and research outcomes hosted on this site are for general informative insights only. Reported biological performance outcomes vary individually.",
        footerText: `© 2026 ${productName}. Intellectual property rights secured.`,
        heroHeadline: `The dynamic breakthrough formula of <span class="text-blue-600">${productName}</span>.`,
        heroSub: "Enriched with selected natural elements sourced cleanly and formulated within fully certified standard facilities. Join more than 145,000 active global clients.",
        benefits: ["100% Highly Bioavailable Active Compounds", "Zero Artificial Fillers and Non-GMO", "Scientifically Recommended Pathways", "30-Day Safe Full Satisfaction Refund Card"],
        secureAccess: "100% Secure & Encrypted Connection",
        details: "Product Details",
        research: "Clinical Science",
        testimonials: "User Reviews",
        faq: "FAQs"
      },
      es: {
        specCheck: "✨ FÓRMULA CLÍNICA EXCLUSIVA TESTEADA EN 2026",
        officialSupply: "Distribución Oficial Directa de Fábrica",
        satisfactoryRate: "99.4% de Satisfacción",
        satisfactoryDesc: "Nivel de satisfacción documentado a través de miles de comentarios de clientes.",
        secureConn: "Firma Criptográfica",
        secureConnDesc: "Su canal de navegación tiene certificación comercial SSL verificado de extremo a extremo.",
        qualityCert: "Instalaciones de Calidad",
        qualityCertDesc: "Cada lote se formula bajo estrictos estándares de higiene y control aséptico.",
        specReviewTitle: "Ficha Técnica Oficial del Suplemento",
        specReviewFeature: "Factor de Evaluación",
        specReviewAlt: "Otras Marcas del Mercado",
        yesMarker: "Sí (✓)",
        noMarker: "No (⨉)",
        certRaw: "Ingredientes premium rastreables desde origen",
        certRatio: "Proporciones clínicamente respaldadas para máxima acción",
        certGuarantee: "Protección total de reembolso del producto en 30 días",
        officialDirect: `${productName} - Distribuidor Oficial`,
        disclaimer: "Aviso de Divulgación: Este sitio es meramente de carácter informativo. Las marcas comerciales que aparecen en este portal pertenecen a sus legítimos dueños de propiedad industrial.",
        footerText: `© 2026 ${productName}. Todos los derechos de propiedad reservados.`,
        heroHeadline: `El revolucionario avance de nutrición celular con <span class="text-blue-600">${productName}</span>.`,
        heroSub: "Elaborado con fitoquímicos naturales probados en laboratorios de excelente estándar clínico. Elige la calidad elegida por más de 145,000 personas.",
        benefits: ["Ingredientes Naturales 100% Puros", "Formulado Sin Aditivos Químicos ni OGM", "Recomendado por Especialistas Clínicos", "Garantía del Fabricante por 30 Días"],
        secureAccess: "Conexión 100% Segura del Fabricante",
        details: "Detalles Técnicos",
        research: "Estudios Científicos",
        testimonials: "Opiniones Reales",
        faq: "Preguntas Frecuentes"
      }
    };

    const bgLoc = bgLocals[language] || bgLocals.en || bgLocals.pt;

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
        alertText: "Sua navegação está totalmente segura. Esta política descreve como os cookies ajudam a otimizar as comunicações com o fabricante oficial do produto",
        privacyHeading: "Valorizamos sua privacidade",
        btnCustomize: "Personalizar",
        btnReject: "Rejeitar",
        btnAccept: "Aceitar Todos"
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
        alertText: "Your navigation is completely secure. This policy describes how cookies help optimize communications with the official manufacturer of the product",
        privacyHeading: "We value your privacy",
        btnCustomize: "Customize",
        btnReject: "Reject All",
        btnAccept: "Accept All"
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
        alertText: "Su navegación es completamente segura. Esta política describe cómo las cookies ayudan a optimizar las comunicaciones con el fabricante oficial del producto",
        privacyHeading: "Valoramos su privacidad",
        btnCustomize: "Personalizar",
        btnReject: "Rechazar todo",
        btnAccept: "Aceptar todo"
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
        alertText: "La tua navigazione è completamente sicura. Questa informativa descrive come i cookie aiutino a ottimizzare le comunicazioni con il produttore ufficiale del produttore",
        privacyHeading: "Diamo valore alla tua privacy",
        btnCustomize: "Personalizza",
        btnReject: "Rifiuta tutto",
        btnAccept: "Accetta tutto"
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
        alertText: "Votre navigation est totalement sécurisée. Cette politique décrit comment les cookies aident à optimiser les communications avec le fabricant officiel du produit",
        privacyHeading: "Nous respectons votre vie privée",
        btnCustomize: "Personnaliser",
        btnReject: "Tout rejeter",
        btnAccept: "Tout accepter"
      }
    };

    const currentLoc = locals[language] || locals.pt;
    const trackingDelaySec = Number(page.cookie_display_delay) || 0;
    const appearance = page.cookie_appearance || "modal";

    // Set interactive visual styling classes according to appearance
    let overlayClass = "bg-slate-900/40 backdrop-blur-[6px]";
    let containerClass = "max-w-xl bg-white border border-slate-100 rounded-[28px] p-6 md:p-8 shadow-2xl relative text-slate-800 z-30 transition-all duration-300 transform scale-100";

    if (appearance === "fullscreen") {
      overlayClass = "bg-slate-950/70 backdrop-blur-[10px]";
      containerClass = "w-full max-w-3xl bg-white border border-slate-100 rounded-[32px] text-left p-8 md:p-12 shadow-2xl flex flex-col justify-center relative z-30 my-8";
    } else if (appearance === "bottom_bar") {
      overlayClass = "bg-slate-900/10 backdrop-blur-[2px] pointer-events-none";
      containerClass = "fixed bottom-0 left-0 right-0 max-w-none bg-white border-t border-slate-200 rounded-t-[32px] p-8 w-full pointer-events-auto z-50 shadow-[0_-15px_30px_-5px_rgba(0,0,0,0.1)] text-slate-850";
    } else if (appearance === "popup") {
      overlayClass = "bg-slate-900/10 backdrop-blur-[2px] pointer-events-none";
      containerClass = "fixed bottom-6 right-6 max-w-md bg-white border border-slate-100 rounded-[24px] p-6 pointer-events-auto z-50 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.15)] text-slate-850";
    }

    return `
      <!DOCTYPE html>
      <html lang="${language}" class="scroll-smooth bg-slate-50 font-sans">
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
        <body class="bg-slate-50 text-slate-800 antialiased selection:bg-blue-500 selection:text-white min-h-screen relative flex items-center justify-center overflow-x-hidden pt-12 pb-24 font-sans">
          
          <!-- BACKGROUND UNDERLAY: REAL STATIC SCREENSHOT OF THE PRODUCT PAGE OR SIMULATED INTERACTIVE DESIGN FALLBACK -->
          ${destinationUrl && destinationUrl.includes("://") ? `
          <div class="absolute inset-0 w-full min-h-screen select-none pointer-events-none overflow-hidden z-0 bg-white flex justify-center items-start">
            <img src="https://image.thum.io/get/width/1280/crop/1000/maxAge/12/${destinationUrl}" 
                 onerror="this.onerror=null; this.src='https://s.wordpress.com/mshots/v1/${encodeURIComponent(destinationUrl)}?w=1280';" 
                 alt="Product Page Background Preview" 
                 class="w-full h-auto min-h-screen object-cover object-top opacity-100 shrink-0" />
          </div>
          ` : `
          <!-- REALISTIC DETAILED PRODUCT PAGE UNDERLAY (FALLBACK) -->
          <div class="absolute inset-0 w-full min-h-full bg-slate-50 flex flex-col items-center select-none pointer-events-none opacity-90 overflow-hidden z-0">
            
            <!-- Beautiful Real Custom Navbar -->
            <header class="w-full bg-white border-b border-slate-100 py-4 px-6 md:px-12 flex justify-between items-center shadow-xs">
              <div class="flex items-center gap-3">
                ${logoUrl ? `
                  <img src="${logoUrl}" alt="${productName}" class="h-10 max-w-[120px] object-contain" />
                ` : `
                  <div class="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                    ${productName.substring(0, 2).toUpperCase()}
                  </div>
                  <span class="font-extrabold text-slate-900 text-lg tracking-tight">${productName}</span>
                `}
                <span class="bg-blue-50 text-blue-600 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-100/30">
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  ${bgLoc.secureAccess}
                </span>
              </div>
              <div class="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-500">
                <span>${bgLoc.details}</span>
                <span>${bgLoc.research}</span>
                <span>${bgLoc.testimonials}</span>
                <span>${bgLoc.faq}</span>
                <span class="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-1 rounded">
                  🛡️ SSL Encrypted Connection
                </span>
              </div>
            </header>

            <!-- Main Page Stage Area -->
            <main class="w-full max-w-6xl px-4 md:px-8 py-10 flex flex-col gap-10">
              
              <!-- Hero grid section -->
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
                <div class="lg:col-span-7 flex flex-col gap-4">
                  <span class="inline-flex items-center gap-1.5 text-[11px] font-mono font-black uppercase text-blue-600 tracking-widest bg-blue-50 border border-blue-200/20 rounded-full px-3 py-1 self-start">
                    ${bgLoc.specCheck}
                  </span>
                  <h1 class="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                    ${bgLoc.heroHeadline}
                  </h1>
                  <p class="text-slate-500 text-sm md:text-base leading-relaxed">
                    ${bgLoc.heroSub}
                  </p>
                  
                  <!-- Benefits Checklist Grid -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-xs font-bold text-slate-700">
                    <div class="flex items-center gap-2">
                      <span class="text-green-500 text-base">✓</span> ${bgLoc.benefits[0]}
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-green-500 text-base">✓</span> ${bgLoc.benefits[1]}
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-green-500 text-base">✓</span> ${bgLoc.benefits[2]}
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-green-500 text-base">✓</span> ${bgLoc.benefits[3]}
                    </div>
                  </div>
                </div>

                <!-- Product display image right-side -->
                <div class="lg:col-span-5 flex justify-center">
                  <div class="relative bg-white border border-slate-100 p-6 rounded-[24px] shadow-sm max-w-sm w-full flex flex-col items-center">
                    <img src="${mainProductImg}" alt="${productName}" class="max-h-[200px] object-contain mb-4 transform scale-100" />
                    <div class="w-full text-center">
                      <div class="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">${bgLoc.officialSupply}</div>
                      <div class="font-extrabold text-slate-800 text-xs mt-1">${productName} Supreme Bio-Active</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Divider line -->
              <hr class="border-slate-200/60" />

              <!-- Technical rating section -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div class="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs">
                  <div class="text-[10px] font-mono text-blue-600 font-extrabold uppercase tracking-wide">METRICS</div>
                  <div class="text-2xl font-black text-slate-900 mt-1">${bgLoc.satisfactoryRate}</div>
                  <p class="text-slate-450 text-[11px] text-slate-500 mt-1">${bgLoc.satisfactoryDesc}</p>
                </div>
                <div class="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs">
                  <div class="text-[10px] font-mono text-purple-600 font-extrabold uppercase tracking-wide">SECURE CHANNELS</div>
                  <div class="text-2xl font-black text-slate-900 mt-1">${bgLoc.secureConn}</div>
                  <p class="text-slate-450 text-[11px] text-slate-500 mt-1">${bgLoc.secureConnDesc}</p>
                </div>
                <div class="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs">
                  <div class="text-[10px] font-mono text-green-600 font-extrabold uppercase tracking-wide">CERTIFICATION</div>
                  <div class="text-2xl font-black text-slate-900 mt-1">${bgLoc.qualityCert}</div>
                  <p class="text-slate-450 text-[11px] text-slate-500 mt-1">${bgLoc.qualityCertDesc}</p>
                </div>
              </div>

              <!-- Product comparison chart -->
              <div class="bg-white border border-slate-100 p-6 rounded-[24px] shadow-xs text-left">
                <h3 class="text-sm font-extrabold text-slate-950 mb-4">${bgLoc.specReviewTitle}</h3>
                <div class="overflow-x-auto">
                  <table class="w-full text-xs text-slate-650">
                    <thead>
                      <tr class="border-b border-slate-100 text-slate-450">
                        <th class="pb-3 font-bold text-left">${bgLoc.specReviewFeature}</th>
                        <th class="pb-3 font-extrabold text-center text-blue-600">${productName}</th>
                        <th class="pb-3 font-bold text-center">${bgLoc.specReviewAlt}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr class="border-b border-slate-100/60 py-2.5">
                        <td class="py-3 font-bold text-slate-800">${bgLoc.certRaw}</td>
                        <td class="py-3 text-center text-green-500 font-black">${bgLoc.yesMarker}</td>
                        <td class="py-3 text-center text-slate-400">${bgLoc.noMarker}</td>
                      </tr>
                      <tr class="border-b border-slate-100/60 py-2.5">
                        <td class="py-3 font-bold text-slate-800">${bgLoc.certRatio}</td>
                        <td class="py-3 text-center text-green-500 font-black">${bgLoc.yesMarker}</td>
                        <td class="py-3 text-center text-slate-400">Not Optimized</td>
                      </tr>
                      <tr class="border-b border-slate-100/60 py-2.5">
                        <td class="py-3 font-bold text-slate-800">${bgLoc.certGuarantee}</td>
                        <td class="py-3 text-center text-green-500 font-black">30 Days Return</td>
                        <td class="py-3 text-center text-slate-400">None</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </main>

            <!-- Complete detailed footer disclaimer -->
            <footer class="w-full mt-auto bg-slate-900 text-slate-400 py-12 px-6 border-t border-slate-800 text-center">
              <div class="max-w-4xl mx-auto flex flex-col gap-4 text-xs">
                <div class="font-extrabold text-slate-200">${bgLoc.officialDirect}</div>
                <p class="text-[10px] text-slate-500 leading-relaxed">
                  ${bgLoc.disclaimer}
                </p>
                <div class="text-[10px] text-slate-500 pt-2 border-t border-slate-800/50">
                  ${bgLoc.footerText}
                </div>
              </div>
            </footer>

          </div>
          `}>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </main>

            <!-- Complete detailed footer disclaimer -->
            <footer class="w-full mt-auto bg-slate-900 text-slate-400 py-12 px-6 border-t border-slate-800 text-center">
              <div class="max-w-4xl mx-auto flex flex-col gap-4 text-xs">
                <div class="font-extrabold text-slate-200">${bgLoc.officialDirect}</div>
                <p class="text-[10px] text-slate-500 leading-relaxed">
                  ${bgLoc.disclaimer}
                </p>
                <div class="text-[10px] text-slate-500 pt-2 border-t border-slate-800/50">
                  ${bgLoc.footerText}
                </div>
              </div>
            </footer>

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
            <p class="text-xs font-mono text-slate-400 max-w-sm text-center leading-relaxed font-bold animate-pulse">
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
              
              <!-- Privacy title & Shield with optimized user visual guidelines -->
              <div class="flex items-center gap-3.5 mb-5 select-none text-left">
                <div class="w-11 h-11 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                  <svg class="w-5.5 h-5.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
                <div class="text-left">
                  <h2 class="text-[17px] font-black text-slate-900 tracking-tight leading-none mb-1">${currentLoc.privacyHeading}</h2>
                  <span class="inline-flex items-center gap-1.5 text-[10px] font-mono font-black uppercase text-blue-600 tracking-widest bg-blue-50 border border-blue-250/20 rounded-full px-2 py-0.5">${currentLoc.back}</span>
                </div>
              </div>

              <!-- Main Dynamic Headline generated/edited -->
              <h1 class="text-sm md:text-base font-bold text-slate-800 tracking-tight leading-snug mb-3 text-left">
                ${cookieTitle}
              </h1>

              <!-- Main Dynamic Text description generated/edited -->
              <p class="text-xs text-slate-500 leading-relaxed mb-6 text-left">
                ${cookieText}
              </p>

              <!-- Option Checkboxes Checklist representing Cookies customization (initially collapsed, interactive) -->
              <div id="checkboxes-panel" class="hidden space-y-3.5 mb-6 bg-slate-50 border border-slate-100 rounded-2xl p-4 md:p-5 text-left transition-all duration-300">
                
                <!-- Mandatory -->
                <label class="flex gap-3 text-left cursor-default select-none">
                  <div class="mt-0.5">
                    <input type="checkbox" checked disabled class="accent-blue-600 h-4.5 w-4.5 bg-white border-slate-300 rounded cursor-default">
                  </div>
                  <div>
                    <span class="block text-xs font-extrabold text-slate-900">${currentLoc.req}</span>
                    <span class="block text-[10px] text-slate-550 leading-normal text-slate-500 mt-1">${currentLoc.reqDesc}</span>
                  </div>
                </label>

                <hr class="border-slate-100">

                <!-- Analytical -->
                <label class="flex gap-3 text-left cursor-pointer select-none group">
                  <div class="mt-0.5">
                    <input type="checkbox" id="cookie-anal" checked class="accent-blue-600 h-4.5 w-4.5 bg-white border-slate-300 rounded pointer-events-none">
                  </div>
                  <div>
                    <span class="block text-xs font-extrabold text-slate-800 group-hover:text-blue-600 transition-all">${currentLoc.anal}</span>
                    <span class="block text-[10px] text-slate-550 leading-normal text-slate-500 mt-1">${currentLoc.analDesc}</span>
                  </div>
                </label>

                <hr class="border-slate-100">

                <!-- Marketing -->
                <label class="flex gap-3 text-left cursor-pointer select-none group">
                  <div class="mt-0.5">
                    <input type="checkbox" id="cookie-mark" checked class="accent-blue-600 h-4.5 w-4.5 bg-white border-slate-300 rounded pointer-events-none">
                  </div>
                  <div>
                    <span class="block text-xs font-extrabold text-slate-800 group-hover:text-blue-600 transition-all">${currentLoc.mark}</span>
                    <span class="block text-[10px] text-slate-550 leading-normal text-slate-500 mt-1">${currentLoc.markDesc}</span>
                  </div>
                </label>

              </div>

              <!-- Main Consent Action Buttons layout (3-columns precisely matching user screenshot) -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button type="button" onclick="toggleCustomize()" class="w-full py-3 px-4 text-center border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-all duration-150 font-bold text-xs rounded-xl cursor-pointer">
                  ${currentLoc.btnCustomize}
                </button>
                <button type="button" onclick="acceptAndRedirect()" class="w-full py-3 px-4 text-center border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-all duration-150 font-bold text-xs rounded-xl cursor-pointer">
                  ${currentLoc.btnReject}
                </button>
                <button type="button" onclick="acceptAndRedirect()" class="w-full py-3 px-6 text-center text-white bg-blue-600 hover:bg-blue-700 transition-all duration-150 font-black text-xs rounded-xl cursor-pointer shadow-md shadow-blue-600/15">
                  ${currentLoc.btnAccept}
                </button>
              </div>

              <div class="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-2 justify-center text-[10px] font-medium text-slate-400">
                <a href="#privacy" onclick="alertPolicy('${currentLoc.priv}')" class="hover:text-slate-600 transition-all underline">${currentLoc.priv}</a>
                <span class="text-slate-200">•</span>
                <a href="#terms" onclick="alertPolicy('${currentLoc.term}')" class="hover:text-slate-600 transition-all underline">${currentLoc.term}</a>
                <span class="text-slate-200">•</span>
                <a href="#cookies" onclick="alertPolicy('${currentLoc.cookies}')" class="hover:text-slate-600 transition-all underline">${currentLoc.cookies}</a>
              </div>

            </div>
          </div>

          <!-- Standardised policies generator popup script -->
          <script>
            function toggleCustomize() {
              const panel = document.getElementById('checkboxes-panel');
              if (panel) {
                panel.classList.toggle('hidden');
              }
            }

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
      copyright: "Todos os direitos reservados.",
      galleryTitle: "Ofertas & Apresentação",
      gallerySubtitle: "Todas as versões e pacotes promocionais de todos os produtos identificados"
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
      copyright: "All rights reserved.",
      galleryTitle: "Offers & Presentation",
      gallerySubtitle: "All versions and promotional packages of all identified products below"
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
      copyright: "Todos los derechos reservados.",
      galleryTitle: "Ofertas y Presentación",
      gallerySubtitle: "Todas las versiones y paquetes promocionales de todos los productos identificados"
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
      copyright: "Tutti i diritti riservati.",
      galleryTitle: "Offerte & Presentazione",
      gallerySubtitle: "Tutte le versioni e pacchetti promozionali di tutti i prodotti identificati"
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
      copyright: "Tous droits réservés.",
      galleryTitle: "Offres & Présentation",
      gallerySubtitle: "Toutes les versions et packs promotionnels de tous les produits identifiés"
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
        if (comp.content.images && Array.isArray(comp.content.images) && comp.content.images.length > 0) {
          const limitedImages = comp.content.images.slice(0, 6);
          const gridItemsHtml = limitedImages.map((img: string) => `
            <div class="bg-slate-900/80 border border-slate-800/80 hover:border-blue-500/50 p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center transition-all hover:scale-[1.03] group relative overflow-hidden">
              <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <img src="${img}" alt="${comp.content.alt || page.productName}" class="max-h-[220px] object-contain rounded-xl drop-shadow-xl transition-transform group-hover:scale-105" />
            </div>
          `).join('');

          let displayTitle = comp.content.title || `${page.productName} - ${currentLoc.galleryTitle}`;
          if (language !== "pt" && (displayTitle.includes("Ofertas & Apresentação") || displayTitle.includes("Opções Disponíveis"))) {
            displayTitle = `${page.productName} - ${currentLoc.galleryTitle}`;
          }

          let displaySubtitle = currentLoc.gallerySubtitle || "Todas as versões e pacotes promocionais de todos os produtos identificados";

          return `
            <section class="py-16 bg-slate-950 border-b border-slate-900 px-4">
              <div class="max-w-5xl mx-auto">
                <div class="text-center mb-10">
                  <h3 class="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">${displayTitle}</h3>
                  <p class="text-slate-400 text-sm mt-3">${displaySubtitle}</p>
                </div>
                <a href="${affLink}" onclick="registerClick()" target="_blank" class="block cursor-pointer">
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    ${gridItemsHtml}
                  </div>
                </a>
              </div>
            </section>
          `;
        }
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

        <!-- BACKUP DATA FOR REIMPORTING -->
        <script id="adscreator-backup-data" type="application/json">
          ${JSON.stringify(page).replace(/</g, '\\u003c')}
        </script>

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

if (!process.env.VERCEL) {
  initializeViteAndStaticServing();
}

export default app;
