export interface ParsedApiResponse {
  data: any;
  errorMessage: string | null;
  rawText: string;
}

export async function parseApiResponse(response: Response): Promise<ParsedApiResponse> {
  const rawText = await response.text();

  if (!rawText) {
    return {
      data: null,
      errorMessage: response.ok ? null : `Erro da API (${response.status})`,
      rawText: ""
    };
  }

  try {
    const parsed = JSON.parse(rawText);
    return {
      data: parsed,
      errorMessage: null,
      rawText
    };
  } catch {
    const trimmed = rawText.trim();
    return {
      data: null,
      errorMessage: trimmed || `Erro da API (${response.status})`,
      rawText: trimmed
    };
  }
}
