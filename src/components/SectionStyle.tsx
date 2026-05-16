import type { CSSProperties, ReactNode } from "react";
import { sectionColor } from "@/lib/sectionColors";

type Props = {
  slug: string | null | undefined;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

// Publishes --section / --section-text custom properties on the rendered
// element so any descendant using rgb(var(--section)) / rgb(var(--section-text))
// (or the .kicker / .section-ribbon utilities) picks up the right color.
export default function SectionStyle({
  slug,
  as,
  className,
  style,
  children,
}: Props) {
  const Tag = (as ?? "div") as keyof React.JSX.IntrinsicElements;
  const c = sectionColor(slug);
  const css = {
    ...style,
    ["--section" as never]: c.bg,
    ["--section-text" as never]: c.fg,
  } as CSSProperties;
  return (
    <Tag className={className} style={css}>
      {children}
    </Tag>
  );
}
