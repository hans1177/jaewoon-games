// 파일명: tools/artbook-external-design-distillation.mjs
// 역할: 외부 공개 게임설계 자료에서 이미 증류된 원리만 아트북 설계 컨텍스트에 안전하게 선택한다.
import fs from 'node:fs';

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const ALLOWED_ROLES = new Set(['planning', 'graphics', 'development', 'qa', 'balance']);

export function loadExternalDesignLibrary(file = 'company-learning/external-game-design-principles.json') {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (parsed?.version !== 1) throw new Error('unsupported external design library version');
  if (parsed?.meaning !== 'ARTBOOK_EQUALS_GAME_DESIGN') throw new Error('external design library meaning mismatch');
  if (parsed?.sourcePolicy?.storeSourceExcerpts !== false) throw new Error('external source excerpts must not be stored');
  if (parsed?.sourcePolicy?.paraphrasePrinciplesOnly !== true) throw new Error('external principles must be paraphrased');
  if (parsed?.sourcePolicy?.directWeightTrainingAllowed !== false) throw new Error('external principles cannot directly enter weight training');
  if (!Array.isArray(parsed.sources) || !Array.isArray(parsed.principles)) throw new Error('external design library sources/principles required');
  return parsed;
}

export function selectExternalDesignPrinciples({ library, role, genre = 'general', limit = 3 }) {
  if (!ALLOWED_ROLES.has(role)) throw new Error(`unsupported artbook role: ${role}`);
  const sourceIds = new Set((library.sources || []).map((source) => clean(source.id)).filter(Boolean));
  const rows = (library.principles || []).filter((item) => {
    if (!item || !clean(item.id) || !clean(item.principleKo)) return false;
    const roles = Array.isArray(item.roles) ? item.roles : [];
    const genres = Array.isArray(item.genres) ? item.genres : [];
    const refs = Array.isArray(item.sourceIds) ? item.sourceIds : [];
    return roles.includes(role) && (genres.includes('*') || genres.includes(genre)) && refs.length > 0 && refs.every((id) => sourceIds.has(clean(id)));
  });

  rows.sort((a, b) => {
    const ag = Array.isArray(a.genres) && a.genres.includes(genre) ? 1 : 0;
    const bg = Array.isArray(b.genres) && b.genres.includes(genre) ? 1 : 0;
    if (ag !== bg) return bg - ag;
    return clean(a.id).localeCompare(clean(b.id));
  });

  return rows.slice(0, Math.max(0, Number(limit) || 0)).map((item) => ({
    id: clean(item.id),
    titleKo: clean(item.titleKo),
    principleKo: clean(item.principleKo),
    sourceIds: [...item.sourceIds.map(clean)],
    tags: Array.isArray(item.tags) ? item.tags.map(clean).filter(Boolean) : [],
  }));
}

export function buildExternalDesignScope({ library, role, genre = 'general', limit = 3 }) {
  const selected = selectExternalDesignPrinciples({ library, role, genre, limit });
  if (!selected.length) return { selected: [], scope: '' };
  const scope = [
    '[EXTERNAL_GAME_DESIGN_DISTILLATION]',
    'artbookMeaning=GAME_DESIGN_SOURCE_OF_TRUTH',
    'externalPrinciples=proposal-only; user/game-facts/internal-verified-evidence win; do-not-copy-source-text; do-not-direct-weight-train',
    ...selected.map((item, index) => `designPrinciple${index + 1}[${item.id}]=${item.principleKo}`),
  ].join(' | ');
  return { selected, scope };
}
