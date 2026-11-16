// Título, descripción y canonical por página (sin dependencias extra).
import { useEffect } from 'react';

export const SITE_URL = 'https://turismo-chilon.pages.dev';
const SITE_NAME = 'Turismo Chilón';

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

export function useDocumentMeta(title: string, description: string, path: string) {
  useEffect(() => {
    document.title = title;
    setMeta('description', description);
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${SITE_URL}${path}`;
  }, [title, description, path]);
}

export const siteTitle = (page: string) => `${page} · ${SITE_NAME} Cajamarca`;
