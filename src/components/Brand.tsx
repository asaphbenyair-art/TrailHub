import Link from "next/link";

/**
 * TrailHub brand / slogan: "בשבילי נברא העולם — דרך. אחרת. לטייל".
 * The "שביל" inside "בשבילי" is bold green (#3d8f5f), same size as the rest.
 *
 * - variant="bar"  → compact wordmark "בשבילי" for top navigation bars.
 * - variant="full" → the full slogan for hero / auth screens.
 */
const GREEN = "#3d8f5f";

function Wordmark() {
  // בשבילי = ב + שביל + י (middle segment styled)
  return (
    <span className="whitespace-nowrap">
      ב<span className="font-bold" style={{ color: GREEN }}>שביל</span>י
    </span>
  );
}

export function BrandSlogan({ className = "" }: { className?: string }) {
  return (
    <span className={`whitespace-normal ${className}`}>
      <Wordmark /> נברא העולם — דרך. אחרת. לטייל
    </span>
  );
}

export default function Brand({
  variant = "bar",
  href = "/",
  className = "",
}: {
  variant?: "bar" | "full";
  href?: string | null;
  className?: string;
}) {
  const content =
    variant === "full" ? (
      <BrandSlogan className="font-display text-lg leading-snug text-fg" />
    ) : (
      <span className="font-display text-[17px] tracking-wide text-fg flex items-center gap-1.5">
        <Wordmark />
      </span>
    );

  if (href === null) return <span className={className}>{content}</span>;
  return (
    <Link href={href} className={`flex-shrink-0 ${className}`} aria-label="בשבילי — דף הבית">
      {content}
    </Link>
  );
}
