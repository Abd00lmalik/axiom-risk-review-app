"use client"

import { motion } from "framer-motion"

interface AxiomLogoProps {
  size?: number
  showWordmark?: boolean
  className?: string
}

export function AxiomLogo({ size = 28, showWordmark = true, className = "" }: AxiomLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`} aria-label="Axiom">
      <AxiomMark size={size} />
      {showWordmark && (
        <span
          style={{
            fontFamily: "'Syne', system-ui, sans-serif",
            fontSize: size * 0.68,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: "hsl(210 40% 94%)",
          }}
        >
          Axiom
        </span>
      )}
    </span>
  )
}

export function AxiomMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polyline
        points="11,5 4,14 11,23"
        stroke="hsl(197, 100%, 47%)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="17,5 24,14 17,23"
        stroke="hsl(197, 100%, 47%)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
      <motion.circle
        cx="14" cy="14" r="2"
        fill="hsl(197, 100%, 47%)"
        animate={{ opacity: [1, 0.4, 1], scale: [1, 1.3, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="14" cy="14" r="4.5"
        stroke="hsl(197, 100%, 47%)"
        strokeWidth="0.7"
        fill="none"
        animate={{ opacity: [0.25, 0.05, 0.25] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  )
}