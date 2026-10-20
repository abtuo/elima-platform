export function ProductVisual({ imageUrl, emoji, alt, className = "" }: { imageUrl?: string; emoji?: string; alt: string; className?: string }) {
  if (imageUrl) return <div role="img" aria-label={alt} className={`bg-cover bg-center bg-no-repeat ${className}`} style={{ backgroundImage: `url(${JSON.stringify(imageUrl).slice(1, -1)})` }} />;
  return <div role="img" aria-label={alt} className={`grid place-items-center ${className}`}><span>{emoji ?? "📦"}</span></div>;
}
