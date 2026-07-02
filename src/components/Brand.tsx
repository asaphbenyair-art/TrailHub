import Link from "next/link";

/**
 * Brand slogan: "בשבילי נברא העולם — אנוכי עפר ואפר".
 * "בשבילי" and "עפר" are bold green (#3d8f5f); the rest is light, weight 300,
 * uniform size. Top nav shows the text only; hero/splash add the trail illustration.
 */
const GREEN = "#3d8f5f";

export function BrandSlogan({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`whitespace-nowrap ${className}`} style={{ fontWeight: 300, color: "var(--fg)", ...style }}>
      <span style={{ color: GREEN, fontWeight: 700 }}>בשבילי</span> נברא העולם — אנוכי{" "}
      <span style={{ color: GREEN, fontWeight: 700 }}>עפר</span> ואפר
    </span>
  );
}

/** Hand-drawn, schematic trail: two wavy parallel green lines with a tree, rock,
 *  well, and marked start/end points, on a black background. Hero/splash only. */
export function BrandTrail({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 84" className={className} width="100%" height="84" role="img" aria-label="שביל מאויר"
      style={{ background: "#0a0a0a", borderRadius: 12, display: "block" }}>
      <g fill="none" stroke={GREEN} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Two wavy parallel trail lines */}
        <path d="M14,58 C60,40 90,72 130,54 C170,36 210,70 250,50 C278,36 296,52 306,44" />
        <path d="M14,66 C60,48 90,80 130,62 C170,44 210,78 250,58 C278,44 296,60 306,52" opacity="0.75" />
        {/* Start marker */}
        <circle cx="14" cy="62" r="4" fill={GREEN} stroke="none" />
        {/* Tree near the start */}
        <line x1="66" y1="44" x2="66" y2="30" />
        <circle cx="66" cy="24" r="8" />
        {/* Rock mid-route */}
        <path d="M150,52 q6,-12 16,-6 q10,4 4,10 q-4,4 -20,-4 Z" strokeWidth="1.4" />
        {/* Well near the end */}
        <rect x="228" y="40" width="16" height="12" rx="1.5" />
        <path d="M226,40 l8,-7 l8,7" />
        <line x1="234" y1="33" x2="234" y2="27" />
        {/* End marker (flag) */}
        <line x1="306" y1="48" x2="306" y2="30" />
        <path d="M306,30 l12,4 l-12,4" fill={GREEN} stroke="none" />
      </g>
    </svg>
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
      <span className="flex flex-col gap-2">
        <BrandSlogan className="text-base sm:text-lg leading-snug" />
        <BrandTrail className="max-w-[320px]" />
      </span>
    ) : (
      <BrandSlogan className="text-[12.5px] sm:text-sm" />
    );

  if (href === null) return <span className={className}>{content}</span>;
  return (
    <Link href={href} className={`flex-shrink-0 ${className}`} aria-label="בשבילי — דף הבית">
      {content}
    </Link>
  );
}
