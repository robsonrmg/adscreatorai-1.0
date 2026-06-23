import { createClient } from "@supabase/supabase-js";

// Pegando as variáveis de ambiente do Supabase (Vite / Frontend)
const meta = import.meta as any;

const rawUrl = meta.env?.VITE_SUPABASE_URL || meta.env?.SUPABASE_URL || "https://knbjqbavyfmecvyvnqmh.supabase.co";
const rawKey = meta.env?.VITE_SUPABASE_ANON_KEY || meta.env?.SUPABASE_ANON_KEY || "sb_publishable_QMVHItYTuZaEO2OrtXGY5A_-EhatPnV";

const isConfigured = rawUrl.trim() !== "" && rawKey.trim() !== "";

// Fallback preventivo para evitar crash em tempo de carregamento do módulo (Uncaught Error: supabaseKey is required)
const supabaseUrl = isConfigured ? rawUrl.trim() : "https://placeholder-project.supabase.co";
const supabaseAnonKey = isConfigured ? rawKey.trim() : "placeholder-key-to-prevent-startup-crash";

// Inicialização do Cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Função utilitária para testar e certificar se a conexão do Supabase está estabelecida.
 */
export async function checkConnection(): Promise<{ success: boolean; message: string; code?: string }> {
  try {
    if (!isConfigured) {
      return {
        success: false,
        message: "As variáveis de ambiente do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) não foram encontradas. Por favor, configure as variáveis de ambiente em seu painel antes de prosseguir.",
        code: "MISSING_KEYS"
      };
    }

    // Fazemos uma chamada leve de teste para a tabela 'pages' ou 'profiles'
    const { data, error } = await supabase.from("pages").select("id").limit(1);

    if (error) {
      // Se retornou erro de tabela inexistente, a conexão com o Supabase de fato existe
      // (conseguiu se autenticar e se comunicar, mas a tabela no banco do usuário precisa ser criada)
      if (error.code === "PGRST205" || error.message?.includes("relation") || error.message?.includes("does not exist")) {
        return {
          success: true,
          message: "Conectado ao Supabase! Porém, a tabela 'pages' ainda não foi criada. Por favor, execute o script SQL no painel.",
          code: "TABLE_MISSING"
        };
      }
      return {
        success: false,
        message: `Erro na consulta ao Supabase: ${error.message} (Código: ${error.code})`,
        code: error.code
      };
    }

    return {
      success: true,
      message: "Conexão com o Supabase ativa e tabelas prontas!",
      code: "SUCCESS"
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Falha de conexão com o Supabase: ${err.message || String(err)}`,
      code: "FETCH_FAILED"
    };
  }
}
