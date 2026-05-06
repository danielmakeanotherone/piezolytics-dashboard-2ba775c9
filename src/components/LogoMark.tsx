export function LogoMark({ size = 24 }: { size?: number }) {
  const dots = [3, 15, 27];
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* horizontal lines */}
      {dots.map((y) => (
        <line key={`h-${y}`} x1={3} y1={y} x2={27} y2={y} stroke="#c8a876" strokeWidth={1} />
      ))}
      {/* vertical lines */}
      {dots.map((x) => (
        <line key={`v-${x}`} x1={x} y1={3} x2={x} y2={27} stroke="#c8a876" strokeWidth={1} />
      ))}
      {dots.flatMap((x) =>
        dots.map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={3.5} fill="#c8a876" />)
      )}
    </svg>
  );
}
