// Anthropic-stílusú üzenettartalom → OpenAI chat completions tartalom.
export function toOpenAIContent(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((block) => {
    if (block.type === 'image' && block.source?.type === 'base64') {
      return {
        type: 'image_url',
        image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` },
      };
    }
    if (block.type === 'text') return { type: 'text', text: block.text };
    // Unknown/unsupported block types are intentionally dropped to an empty text block.
    return { type: 'text', text: '' };
  });
}

export function toOpenAIMessages(messages) {
  return messages.map((m) => ({ role: m.role, content: toOpenAIContent(m.content) }));
}

const TENDER_INTRO = {
  b: `Te a DIMOP Plusz-1.2.6/B-26 pályázati asszisztens vagy. A feladatod, hogy segítsd a felhasználókat a pályázattal kapcsolatos kérdésekben.`,
  c: `Te a DIMOP Plusz-1.2.6/C-26 (budapesti) pályázati asszisztens vagy. Ez a pályázat KIZÁRÓLAG Budapesten megvalósuló projektekre vonatkozik. A benyújtási időszak: 2026. június 16. – 2026. augusztus 11. A feladatod, hogy segítsd a felhasználókat a pályázattal kapcsolatos kérdésekben.`,
};

export function buildSystemPrompt(knowledge, tender = 'b') {
  const intro = TENDER_INTRO[tender] || TENDER_INTRO.b;
  return `${intro}

SZABÁLYOK:
- Válaszolj MINDIG magyarul
- Csak az alábbi dokumentumok alapján válaszolj - ne találj ki információt
- Ha nem tudod a választ, mondd el őszintén
- Legyél tömör és pontos
- Használj markdown formázást a válaszokban (táblázatok, listák, félkövér)
- Ha összegekről kérdenek, mindig add meg a pontos számokat
- Hivatkozz a forrás dokumentumra ha releváns (pl. "A felhívás 2.3.1. pontja szerint...")

AZ ÖSSZES PÁLYÁZATI DOKUMENTUM TELJES SZÖVEGE:
${knowledge}`;
}

export function friendlyError(err) {
  const msg = (err?.message || '').toLowerCase();
  const code = (err?.code || err?.error?.code || '').toLowerCase();
  const status = err?.status; // OpenAI SDK exposes HTTP status directly on the error
  if (code.includes('insufficient_quota') || msg.includes('quota') || msg.includes('billing') || msg.includes('credit')) {
    return 'Az AI szolgáltatás kreditje elfogyott. Kérlek értesítsd az adminisztrátort.';
  }
  if (status === 401 || code.includes('invalid_api_key') || msg.includes('api key') || msg.includes('authentication')) {
    return 'API kulcs hiba.';
  }
  if (status === 429 || code.includes('rate_limit') || msg.includes('rate limit')) {
    return 'Túl sok kérés, kérlek várj egy kicsit.';
  }
  if ((typeof status === 'number' && status >= 500) || msg.includes('overloaded')) { // 'overloaded' is defensive (covers proxied/legacy error text); OpenAI uses 5xx
    return 'Az AI szerver jelenleg túlterhelt. Kérlek próbáld újra pár másodperc múlva.';
  }
  return 'Szerverhiba, próbáld újra.';
}
