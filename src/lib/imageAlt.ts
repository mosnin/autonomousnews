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

// Alt-text for author portraits. Mirrors coverImageAlt's reasoning: the
// DALL·E portrait pipeline doesn't currently persist an editorial alt
// for author headshots, so we synthesize one from the author's name and
// title. This still gives screen-reader users meaningful context (who
// the person is and their role) rather than the slug or an empty alt.
export function authorPortraitAlt(author: {
  name: string;
  title?: string | null;
}): string {
  const title = author.title?.trim();
  return title
    ? `Portrait of ${author.name}, ${title} at Techno Times`
    : `Portrait of ${author.name}`;
}
