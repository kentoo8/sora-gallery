export type GalleryFilters = { tag: string; query: string };

export function readGalleryFilters(search: string): GalleryFilters {
  const params = new URLSearchParams(search);
  return { tag: params.get("tag") ?? "", query: params.get("q") ?? "" };
}

export function galleryUrl(href: string, pathname: string, filters?: GalleryFilters) {
  const url = new URL(href);
  url.pathname = pathname;
  if (filters) {
    for (const [key, value] of [["tag", filters.tag], ["q", filters.query]]) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
  }
  return url.pathname + url.search + url.hash;
}
