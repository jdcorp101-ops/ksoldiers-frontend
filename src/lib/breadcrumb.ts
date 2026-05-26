import { SITE_URL } from './site';

export type BreadcrumbInput = { name: string; path: string };
export type BreadcrumbItem = BreadcrumbInput & { url: string };

export type BreadcrumbSchema = {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
};

export function buildBreadcrumb(items: BreadcrumbInput[]): {
  items: BreadcrumbItem[];
  schema: BreadcrumbSchema;
} {
  const enriched: BreadcrumbItem[] = items.map((item) => ({
    ...item,
    url: `${SITE_URL}${item.path}`,
  }));

  return {
    items: enriched,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: enriched.map((item, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: item.name,
        item: item.url,
      })),
    },
  };
}
