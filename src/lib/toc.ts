export type TocItem = {
  id: string;
  text: string;
  depth: 2 | 3;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[<>"'`]/g, '')
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'section';
}

export function extractToc(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const seen = new Map<string, number>();

  const modifiedHtml = html.replace(
    /<h([23])([^>]*?)>([\s\S]*?)<\/h\1>/gi,
    (match, level: string, attrs: string, content: string) => {
      const depth = Number(level) as 2 | 3;
      const text = content.replace(/<[^>]+>/g, '').trim();
      if (!text) return match;

      const base = slugify(text);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      const id = count > 0 ? `${base}-${count + 1}` : base;

      toc.push({ id, text, depth });

      if (/\sid\s*=\s*["']/i.test(attrs)) return match;
      return `<h${depth}${attrs} id="${id}">${content}</h${depth}>`;
    }
  );

  return { html: modifiedHtml, toc };
}
