import express from "express";
import path from "path";
import fs from "fs";
import dns from "dns";
import os from "os"; // <-- Adicionado para gerenciar caminhos temporários nativamente
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

function getEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function sendApiError(res: any, status: number, message: string) {
  return res.status(status).json({ error: message });
}

// 2. Inicializar o cliente do Supabase usando variáveis de ambiente
let rawSupabaseUrl = getEnvValue("SUPABASE_URL", "VITE_SUPABASE_URL").trim();
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
const rawAnonKey = getEnvValue("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY").trim();
const SUPABASE_ANON_KEY = isPlaceholder(rawAnonKey) ? "" : rawAnonKey;

const rawServiceRoleKey = getEnvValue("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY").trim();
const SUPABASE_SERVICE_ROLE_KEY = isPlaceholder(rawServiceRoleKey) ? "" : rawServiceRoleKey;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("⚠️ ATENÇÃO: As credenciais do Supabase não foram configuradas no arquivo .env ou são placeholders.");
}

// O banco de dados no servidor prefere usar o service_role para contornar políticas RLS legítimas de forma segura.
const serverSupabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const supabase = (SUPABASE_URL && serverSupabaseKey) ? createClient(SUPABASE_URL, serverSupabaseKey) : null;

function logSupabaseSync(action: string, error: any) {
  const errMsg = error?.message || String(error);
  if (errMsg.toLowerCase().includes("fetch failed") || errMsg.toLowerCase().includes("failed to fetch") || errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("networkerror")) {
    console.log(`[Supabase Async Sync] ${action}: Supabase de contingência offline (fetch failed).`);
  } else {
    console.log(`[Supabase Async Sync] ${action} falhou:`, errMsg);
  }
}

// Tentar criar ou garantir a existência do bucket 'page-media' de forma pública no Supabase
async function ensureBucketExists() {
  if (supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (!listError && buckets) {
        const exists = buckets.some(b => b.name === "page-media");
        if (exists) {
          console.log("[Supabase Storage] Bucket 'page-media' já existe e está pronto.");
          return;
        }
      }

      const { data, error } = await supabase.storage.createBucket("page-media", {
        public: true,
        allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"]
      });

      if (error) {
        if (error.message && error.message.includes("fetch failed")) {
          console.log("[Supabase Storage] Supabase offline ou inacessível no momento.");
        } else {
          console.log(`[Supabase Storage] Bucket 'page-media' status:`, error.message);
        }
      } else {
        console.log(`[Supabase Storage] Bucket 'page-media' criado com sucesso de modo público.`);
      }
    } catch (e: any) {
      if (e.message && e.message.includes("fetch failed")) {
        console.log("[Supabase Storage] Supabase offline ou inacessível no momento.");
      } else {
        console.log(`[Supabase Storage] Nota na inicialização automática do bucket 'page-media':`, e.message || e);
      }
    }
  }
}
ensureBucketExists();

// Executa o reset dos contadores de demonstração caso o Supabase esteja habilitado para uso em produção.
async function checkAndResetProjectCounters() {
  if (supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const db = readDB();
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

// CORREÇÃO: Alinhando os caminhos para rodar em ambiente estrito Serverless /tmp
function getStorageDir() {
  const candidates = [
    process.env.STORAGE_DIR,
    path.join(os.tmpdir(), "storage"), // <-- Garante compatibilidade local (Windows) e nuvem (Linux /tmp)
    "/tmp/storage"
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) {
        fs.mkdirSync(candidate, { recursive: true });
      }
      return candidate;
    } catch (error) {
      console.warn(`[Storage] Não foi possível usar ${candidate}:`, error);
    }
  }

  // Fallback seguro caso tudo falhe (apenas em memória/local)
  return path.join(os.tmpdir(), "storage");
}

const STORAGE_DIR = getStorageDir();
app.use("/storage", express.static(STORAGE_DIR));

const DB_FILE = path.join(os.tmpdir(), "db.json"); // CORREÇÃO: db.json salvo no diretório temporário para evitar falhas de escrita síncronas na Vercel

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
                text: "Se você sofre com dores constantes nos joelhos, costas ou articulações, sabe o quanto isso limita sua liberdade. O **Joint Eternal** foi formulado justamente com compostos naturais premium para agir diretamente na inflamação das juntas. But será que cumpre o prometido? Após testarmos durante 30 dias, compilamos as respostas essenciais."
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
      console.warn("Aviso: Falha ao salvar banco inicial em disco:", err.message);
    }
  }

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

function writeDB(data: any) {
  memoryCacheDB = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error: any) {
    console.warn("Aviso: Falha ao salvar db.json em disco (sistema de arquivos somente-leitura).", error.message);
  }
}

// LAZY Initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!aiClient) {
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

async function generateContentWithRetry(ai: GoogleGenAI, params: any, maxRetries = 5, initialDelayMs = 2000) {
  let attempt = 0;
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
      
      if (isTransient && attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2.2, attempt) * (0.8 + Math.random() * 0.4);
        console.warn(`[Gemini API] Erro transitório detectado. Tentamos novamente em ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

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
  if (db.logs.length > 50) db.logs.pop();
  writeDB(db);
}

// CORREÇÃO: O scraper de imagens agora salva no STORAGE_DIR dinâmico (que aponta para /tmp na nuvem)
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
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
        },
        signal: controller.signal
      });
      誠clearTimeout(timeoutId);
      if (!res.ok) continue;

      const html = await res.text();

      const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      if (ogMatch && ogMatch[1]) {
        foundImgUrls.add(ogMatch[1].trim());
      }

      const imgTagRegex = /<img[^>]+(?:src|srcset|data-src|data-lazy|data-lazy-src|data-original|src-large)=["']([^"']+)["']/gi;
      let imgMatch;
      while ((imgMatch = imgTagRegex.exec(html)) !== null) {
        if (imgMatch[1]) {
          const rawMatches = imgMatch[1].trim().split(",");
          for (const rawItem of rawMatches) {
            const cleanUrl = rawItem.trim().split(/\s+/)[0];
            if (cleanUrl) foundImgUrls.add(cleanUrl);
          }
        }
      }

      const bgImgPattern = /url\s*\(\s*['"]?([^'")]+\.(?:png|jpg|jpeg|gif|webp|svg))['"]?\s*\)/gi;
      let bgMatch;
      while ((bgMatch = bgImgPattern.exec(html)) !== null) {
        if (bgMatch[1]) foundImgUrls.add(bgMatch[1].trim());
      }

    } catch (err) {
      console.log(`[AdsCreator AI] Falha ao varrer mídias em ${url}`);
    }
  }

  const candidateUrls: string[] = [];
  for (const imgUrl of foundImgUrls) {
    let resolvedUrl = imgUrl;
    if (imgUrl.startsWith("data:")) continue;
    if (imgUrl.startsWith("//")) {
      resolvedUrl = "https:" + imgUrl;
    } else if (imgUrl.startsWith("/")) {
      try {
        const parsedBase = new URL(productUrl);
        resolvedUrl = parsedBase.origin + imgUrl;
      } catch (e) { continue; }
    }
    candidateUrls.push(resolvedUrl);
  }

  const uniqueCandidates = Array.from(new Set(candidateUrls)).slice(0, 30);
  let downloadCount = 0;

  for (const resolvedUrl of uniqueCandidates) {
    try {
      const urlLower = resolvedUrl.toLowerCase();
      let category: "logo" | "main" | "benefit" | "promo" | "secondary" = "secondary";
      if (urlLower.includes("logo") || urlLower.includes("brand")) category = "logo";
      else if (urlLower.includes("product") || urlLower.includes("frasco") || urlLower.includes("pote") || urlLower.includes("main")) category = "main";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const dlRes = await fetch(resolvedUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!dlRes.ok) continue;
      const buffer = Buffer.from(await dlRes.arrayBuffer());
      if (buffer.length < 1024) continue;

      let extension = "png";
      const contentType = dlRes.headers.get("content-type") || "";
      if (contentType.includes("jpeg")) extension = "jpg";

      const fileHash = Math.random().toString(36).substring(2, 8);
      const filename = `scraped_${category}_${fileHash}.${extension}`;

      let servedUrl = "";
      if (supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
          const { error: uploadError } = await supabase.storage
            .from("page-media")
            .upload(filename, buffer, { contentType: contentType || "image/png", upsert: true });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from("page-media").getPublicUrl(filename);
            servedUrl = publicUrlData?.publicUrl || "";
          }
        } catch (supabaseErr) { }
      }

      if (!servedUrl) {
        const localPath = path.join(STORAGE_DIR, filename); // Usando o caminho seguro mapeado em STORAGE_DIR
        fs.writeFileSync(localPath, buffer);
        servedUrl = `/storage/${filename}`;
      }

      downloadCount++;
      if (category === "logo") images.logoImage = servedUrl;
      else if (category === "main" && !images.mainProductImage) images.mainProductImage = servedUrl;
      else images.secondaryImages.push(servedUrl);

    } catch (err) { }
  }

  return images;
}

function detectLanguageFromUrl(url: string): string {
  if (!url) return "pt";
  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.includes('.it')) return "it";
  if (lowercaseUrl.includes('.es')) return "es";
  return "pt";
}

function extractVisibleText(html: string): string {
  if (!html) return "";
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]*>/g, " ").slice(0, 10000);
}

async function fetchAndAnalyzeUrl(targetUrl: string, pageType: string, generationLanguage: string = "pt", affiliateLink: string = "") {
  console.log(`Análise iniciada para ${targetUrl}`);
}

// Adicionando a exportação padrão limpa exigida pelo api/index.ts da Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Servidor local rodando na porta ${PORT}`));
}

export default app;