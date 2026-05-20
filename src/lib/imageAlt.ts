// Alt-text fallback for cover images.
//
// The DALL·E pipeline writes a real editorial alt (cover_image_alt) for
// every generated cover. If a row predates that field, or an editor
// manually swapped an image in without setting alt, we fall back to the
// article title so screen-reader users still get meaningful context
// rather than an empty <img alt="">. WCAG H37 — informative images must
// have a textual alternative; the headline is the closest substitute we
// have without a human editor in the loop.
export function coverImageAlt(article: {
  cover_image_alt?: string | null;
  title?: string | null;
}): string {
  const editorial = article.cover_image_alt?.trim();
  if (editorial) return editorial;
  const title = article.title?.trim();
  return title ? `Illustration accompanying: ${title}` : "Cover illustration";
}
