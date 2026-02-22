"use client"

import { motion } from "framer-motion"

export function Hero() {
  return (
    <section className="relative pt-32 pb-8 px-6 text-center">
      {/* Eyebrow */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center gap-2 mb-5"
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
          style={{
            background: "hsl(197 100% 47% / 0.06)",
            border: "1px solid hsl(197 100% 47% / 0.2)",
          }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70"
              style={{ background: "hsl(197 100% 47%)" }}
            />
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ background: "hsl(197 100% 47%)" }}
            />
          </span>
          <span
            className="text-[10px] font-mono tracking-widest uppercase"
            style={{ color: "hsl(197 100% 47% / 0.8)" }}
          >
            Powered by Genlayer
          </span>
        </div>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground text-balance leading-[1.05] mb-4"
        style={{ fontFamily: "'Syne', system-ui, sans-serif", letterSpacing: "-0.025em" }}
      >
        Decentralized
        <br />
        <span style={{
          background: "linear-gradient(135deg, hsl(197 100% 47%), hsl(213 94% 68%))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          Risk Intelligence
        </span>
      </motion.h1>

      {/* Subheading */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-sm font-mono text-muted-foreground max-w-sm mx-auto mb-2 leading-relaxed"
      >
        AI-proposed signals.{" "}
        <span style={{ color: "hsl(197 100% 47% / 0.7)" }}>Validator-confirmed.</span>{" "}
        On-chain record.
      </motion.p>

      {/* Terminal line */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-[10px] font-mono tracking-wider text-muted-foreground/35 uppercase"
      >
        Not financial advice · Public sources only · Informational
      </motion.p>
    </section>
  )
}