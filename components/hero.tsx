"use client"

import { motion } from "framer-motion"

export function Hero() {
  return (
    <section className="relative flex flex-col items-center px-4 pt-32 pb-8 text-center md:pt-40 md:pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-4"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
          Powered by Genlayer
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        className="max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl"
      >
        <span className="text-foreground">Decentralized</span>{" "}
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(135deg, hsl(217 91% 60%), hsl(250 80% 65%))",
          }}
        >
          Risk Intelligence
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        className="mt-4 max-w-xl text-pretty text-base text-muted-foreground md:text-lg"
      >
        AI-powered protocol verification with validator consensus.
        Analyze any crypto project.
      </motion.p>
    </section>
  )
}
