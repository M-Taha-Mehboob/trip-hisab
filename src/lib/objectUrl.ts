// One object URL per Blob, reused across renders (and StrictMode's double effects). Receipt photos are
// ~200 KB and only a handful are opened per visit, so the URLs simply live until the page closes.
const urls = new WeakMap<Blob, string>()

export function objectUrlFor(blob: Blob | null | undefined): string | null {
  if (!blob) return null
  let url = urls.get(blob)
  if (!url) {
    url = URL.createObjectURL(blob)
    urls.set(blob, url)
  }
  return url
}
