export function cleanInt(value: any): number | null {
  if (value === null || value === undefined) return null;
  const num = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? null : num;
}

export function cleanText(value: any): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value)
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (
    text === '' ||
    ['nan', 'none', 'null', '-', 'all'].includes(text.toLowerCase())
  )
    return null;
  return text;
}

export function marksToRank(marksInput: any): number | null {
  const marks = cleanInt(marksInput);
  if (marks === null) return null;

  if (marks >= 715) return Math.round((720 - marks) * 50 + 1);
  if (marks >= 650) return Math.round((720 - marks) * 600);
  if (marks >= 550) return Math.round((720 - marks) * 1200);
  if (marks >= 450) return Math.round((720 - marks) * 1500);

  return Math.round((720 - marks) * 2000);
}

export function shortName(nameInput: any): string {
  const name = cleanText(nameInput) || 'College';
  const text = name
    .replace(/All India Institute of Medical Sciences/gi, 'AIIMS')
    .replace(
      /Jawaharlal Institute of Postgraduate Medical Education and Research/gi,
      'JIPMER',
    )
    .replace(/GOVERNMENT/gi, 'Govt.')
    .replace(/Government/gi, 'Govt.')
    .replace(/MEDICAL COLLEGE/gi, 'MC')
    .replace(/Medical College/gi, 'MC')
    .replace(/DENTAL COLLEGE/gi, 'DC')
    .replace(/Dental College/gi, 'DC');

  return text.split(',')[0].trim().substring(0, 55);
}

export function formatBucketByClosingRank(
  userRank: number | null,
  closingRank: number | null,
): string {
  if (!userRank || !closingRank) return 'unknown';

  const gap = closingRank - userRank;
  if (gap < 0) return 'dream';

  const safeMargin = Math.max(3000, Math.floor(userRank * 0.15));
  if (gap >= safeMargin) return 'safe';

  return 'target';
}

export function formatBucketByNearestRank(
  userRank: number | null,
  candidateRank: number | null,
): string {
  if (!userRank || !candidateRank) return 'unknown';

  const diff = candidateRank - userRank;
  if (diff < 0) return 'dream';

  const marginPercent = (diff / userRank) * 100;
  if (marginPercent >= 20) return 'safe';

  return 'target';
}

export function bucketPriority(bucket: string): number {
  return { safe: 0, target: 1, dream: 2, unknown: 3 }[bucket] ?? 9;
}

export function getGradient(bucket: string): string {
  if (bucket === 'safe')
    return 'linear-gradient(135deg, #059669 0%, #064e3b 100%)';
  if (bucket === 'target')
    return 'linear-gradient(135deg, #d97706 0%, #7c2d12 100%)';
  if (bucket === 'dream')
    return 'linear-gradient(135deg, #7c3aed 0%, #2e1065 100%)';
  return 'linear-gradient(135deg, #2563eb 0%, #172554 100%)';
}

export function getLogoColor(bucket: string): string {
  if (bucket === 'safe') return '#059669';
  if (bucket === 'target') return '#d97706';
  if (bucket === 'dream') return '#7c3aed';
  return '#2563eb';
}

export function balancedCards(cards: any[], cardLimit = 30): any[] {
  const safeCards = cards.filter((c) => c.bucket === 'safe');
  const targetCards = cards.filter((c) => c.bucket === 'target');
  const dreamCards = cards.filter((c) => c.bucket === 'dream');
  const unknownCards = cards.filter((c) => c.bucket === 'unknown');

  const sortGroup = (group: any[]) => {
    group.sort((a, b) => {
      const aRankGap =
        a.rankGap !== null && a.rankGap !== undefined
          ? Math.abs(a.rankGap)
          : 10 ** 12;
      const bRankGap =
        b.rankGap !== null && b.rankGap !== undefined
          ? Math.abs(b.rankGap)
          : 10 ** 12;
      if (aRankGap !== bRankGap) return aRankGap - bRankGap;

      const aNearest = a.nearestRank
        ? Math.abs((a.nearestRank || 0) - (a.inputRank || 0))
        : 10 ** 12;
      const bNearest = b.nearestRank
        ? Math.abs((b.nearestRank || 0) - (b.inputRank || 0))
        : 10 ** 12;
      if (aNearest !== bNearest) return aNearest - bNearest;

      return (a.name || '').localeCompare(b.name || '');
    });
  };

  sortGroup(safeCards);
  sortGroup(targetCards);
  sortGroup(dreamCards);
  sortGroup(unknownCards);

  const mixed: any[] = [];
  const maxLen = Math.max(
    safeCards.length,
    targetCards.length,
    dreamCards.length,
    unknownCards.length,
    0,
  );

  for (let i = 0; i < maxLen; i++) {
    if (i < safeCards.length) mixed.push(safeCards[i]);
    if (i < targetCards.length) mixed.push(targetCards[i]);
    if (i < dreamCards.length) mixed.push(dreamCards[i]);
  }

  mixed.push(...unknownCards);
  return mixed.slice(0, cardLimit);
}

const UP_BASE_CATEGORY_NAME_MAP: Record<string, string> = {
  UR: 'Unreserved',
  BC: 'Backward Class',
  SC: 'Scheduled Caste',
  ST: 'Scheduled Tribe',
  EW: 'Economically Weaker Section',
};

const UP_SEAT_TYPE_NAME_MAP: Record<string, string> = {
  OP: 'Open Seat',
  GL: 'Girls Seat',
  PH: 'Persons with Disability',
  EX: 'Ex-serviceman',
  FF: 'Freedom Fighter',
  NC: 'NCC',
};

export function expandUpCategoryCode(code: string | null): string | null {
  code = cleanText(code);
  if (!code) return null;

  code = code.toUpperCase();
  let base: string | null = null;
  let suffix: string | null = null;

  for (const possibleBase of ['UR', 'BC', 'SC', 'ST', 'EW']) {
    if (code.startsWith(possibleBase)) {
      base = possibleBase;
      suffix = code.substring(possibleBase.length);
      break;
    }
  }

  const baseName = base ? UP_BASE_CATEGORY_NAME_MAP[base] || base : code;
  const suffixName = suffix ? UP_SEAT_TYPE_NAME_MAP[suffix] || suffix : '';

  if (suffixName) {
    return `${code} (${baseName} - ${suffixName})`;
  }

  return `${code} (${baseName})`;
}

export function expandUpCodeList(value: string | null): string | null {
  const text = cleanText(value);
  if (!text) return null;

  const parts = text
    .split(',')
    .map((x) => cleanText(x))
    .filter(Boolean);
  const expanded = parts.map((x) => expandUpCategoryCode(x)).filter(Boolean);
  return expanded.join(', ');
}
