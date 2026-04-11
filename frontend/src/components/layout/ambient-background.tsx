export function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Base */}
      <div className="absolute inset-0 bg-[#080c16]" />

      {/* Navy-blue orb — top right (same as login: oklch(0.45 0.18 262)) */}
      <div
        className="absolute -top-[15%] -right-[5%] w-[900px] h-[900px] rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.45 0.18 262 / 0.2) 0%, oklch(0.45 0.18 262 / 0.06) 40%, transparent 70%)",
        }}
      />

      {/* Pink/red orb — bottom right (same as login: oklch(0.55 0.15 18)) */}
      <div
        className="absolute -bottom-[10%] right-[10%] w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.55 0.15 18 / 0.12) 0%, oklch(0.55 0.15 18 / 0.03) 40%, transparent 65%)",
        }}
      />

      {/* Teal/green orb — center left (same as login: oklch(0.6 0.2 180)) */}
      <div
        className="absolute top-[35%] -left-[8%] w-[550px] h-[550px] rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.6 0.2 180 / 0.1) 0%, oklch(0.6 0.2 180 / 0.02) 40%, transparent 65%)",
        }}
      />

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />
    </div>
  );
}
