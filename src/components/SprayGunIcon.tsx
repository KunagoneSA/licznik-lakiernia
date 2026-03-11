export default function SprayGunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Nozzle */}
      <line x1="1" y1="8" x2="6" y2="8" />
      {/* Gun body */}
      <rect x="6" y="5" width="10" height="6" rx="1" />
      {/* Trigger */}
      <path d="M10 11 L10 15 L13 15 L13 11" />
      {/* Handle/grip */}
      <path d="M10 15 L9 22 L14 22 L13 15" />
      {/* Tank on top */}
      <rect x="14" y="1" width="4" height="4" rx="1" />
      <line x1="16" y1="5" x2="16" y2="5.5" />
      {/* Spray dots */}
      <circle cx="2" cy="5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="3" cy="3" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="1" cy="4" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
