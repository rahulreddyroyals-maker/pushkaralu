import { absoluteUrl } from "./site";

/** Share-link builders (pure). The page URL is always the canonical absolute URL, never a tracking/session URL. */
export function whatsappShareUrl(title: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
}

export function facebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function shareTargets(title: string, path: string, siteUrl?: string) {
  const url = absoluteUrl(path, siteUrl);
  return { url, whatsapp: whatsappShareUrl(title, url), facebook: facebookShareUrl(url) };
}
