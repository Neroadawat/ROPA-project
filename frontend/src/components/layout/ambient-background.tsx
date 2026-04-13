export function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[#f8fafc]" />

      {/* Warm red orb — top right */}
      <div
        className="absolute -top-[15%] -right-[5%] w-[800px] h-[800px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(220,38,38,0.06) 0%, rgba(220,38,38,0.02) 40%, transparent 70%)",
        }}
      />

      {/* Soft pink orb — bottom left */}
      <div
        className="absolute -bottom-[10%] -left-[5%] w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(244,63,94,0.05) 0%, rgba(244,63,94,0.01) 40%, transparent 65%)",
        }}
      />

      {/* Warm orange orb — center right */}
      <div
        className="absolute top-[40%] right-[15%] w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}
