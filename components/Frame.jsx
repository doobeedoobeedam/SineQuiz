export default function Frame({ children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-md bg-film shadow-[0_20px_60px_-20px_rgba(91,108,255,0.5)] ring-1 ring-white/10 ${className}`}>
      <div className="sprockets" />
      <div className="relative aspect-video overflow-hidden">{children}</div>
      <div className="sprockets" />
    </div>
  );
}
