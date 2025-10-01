'use client'

export function MobileOverlay() {
  return (
    <label
      htmlFor="nav-toggle"
      className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ease-out peer-checked:opacity-100 peer-checked:visible opacity-0 invisible md:hidden cursor-pointer"
    />
  )
}