import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import versionInfo from './version.json' with { type: 'json' };
import { SITE, siteUrl } from './src/config/siteConfig.ts';

const version: string = versionInfo.version;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Fills the {{TOKENS}} in index.html and emits manifest.webmanifest, robots.txt and sitemap.xml from src/config/siteConfig.ts. */
function sitePlugin(): Plugin {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE.name,
    url: siteUrl,
    description: SITE.description,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any (modern web browser)',
    inLanguage: SITE.language,
    isAccessibleForFree: true,
    softwareVersion: version,
    image: `${siteUrl}og-image.png`,
    keywords: SITE.keywords.join(', '),
    featureList: SITE.features,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
  const tokens: Record<string, string> = {
    BASE: SITE.basePath,
    URL: siteUrl,
    TITLE: esc(SITE.title),
    NAME: esc(SITE.name),
    SHORT_NAME: esc(SITE.shortName),
    DESCRIPTION: esc(SITE.description),
    KEYWORDS: esc(SITE.keywords.join(', ')),
    LANG: SITE.language,
    LOCALE: SITE.locale,
    THEME: SITE.themeColor,
    OG_IMAGE: `${siteUrl}og-image.png`,
    JSONLD: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
    FEATURES: SITE.features.map((f) => `<li>${esc(f)}</li>`).join(''),
  };
  return {
    name: 'hyperpkpd-site',
    transformIndexHtml: (html) => html.replace(/\{\{([A-Z_]+)\}\}/g, (m, k: string) => tokens[k] ?? m),
    generateBundle() {
      const icon = (file: string, sizes: string, purpose: string) => ({ src: `${SITE.basePath}icons/${file}`, sizes, type: 'image/png', purpose });
      const manifest = {
        id: SITE.basePath,
        name: SITE.name,
        short_name: SITE.shortName,
        description: SITE.description,
        lang: SITE.language,
        start_url: `${SITE.basePath}?source=pwa`,
        scope: SITE.basePath,
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'any',
        theme_color: SITE.themeColor,
        background_color: SITE.backgroundColor,
        categories: [SITE.category, 'medical', 'science'],
        icons: [
          icon('icon-192.png', '192x192', 'any'),
          icon('icon-512.png', '512x512', 'any'),
          icon('icon-maskable-192.png', '192x192', 'maskable'),
          icon('icon-maskable-512.png', '512x512', 'maskable'),
          { src: `${SITE.basePath}favicon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      };
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: JSON.stringify(manifest, null, 2) });
      this.emitFile({
        type: 'asset', fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`,
      });
      this.emitFile({
        type: 'asset', fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n  <url>\n    <loc>${siteUrl}</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n    <image:image><image:loc>${siteUrl}og-image.png</image:loc></image:image>\n  </url>\n</urlset>\n`,
      });
    },
  };
}

export default defineConfig({
  base: SITE.basePath,
  plugins: [react(), tailwindcss(), sitePlugin()],
});
