export type CardInfo = {
  name: string;
  set?: string;
  number?: string;
};

export function extractCardInfo(input: string): CardInfo {
  let s = input.trim();

  s = s.replace(/^\s*\d+\s*x?\s+/i, "");

  const caretTail = /\s*\^[^^]*\^\s*$/;
  const bracketTail = /\s*\[[^\]]*]\s*$/;
  let changed = true;
  while (changed) {
    const before = s;
    s = s.replace(caretTail, "").trim();
    s = s.replace(bracketTail, "").trim();
    changed = s !== before;
  }

  let setCode: string | undefined;
  let number: string | undefined;
  const setNumTail = /\s*\(([a-z0-9]{2,5})\)\s*([0-9]+[a-z]?)?\s*$/i;
  const m = s.match(setNumTail);
  if (m) {
    setCode = m[1]?.toLowerCase();
    number = m[2] ?? undefined;
    s = s.replace(setNumTail, "").trim();
  }

  return { name: s, set: setCode, number };
}

export function parseDeckToInfos(deckText: string): CardInfo[] {
  const infos: CardInfo[] = [];
  deckText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const qtyMatch = trimmed.match(/^\s*(\d+)\s*x?\s+(.*)$/i);
    if (qtyMatch) {
      const count = parseInt(qtyMatch[1], 10);
      const rest = qtyMatch[2];
      const info = extractCardInfo(rest);
      for (let i = 0; i < count; i++) infos.push(info);
    } else {
      infos.push(extractCardInfo(trimmed));
    }
  });
  return infos;
}

export function cardKey(ci: CardInfo): string {
  return `${ci.name.toLowerCase()}|${ci.set ?? ""}|${ci.number ?? ""}`;
}
