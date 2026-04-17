"use client";

import { motion } from "motion/react";

interface HeroRevealProps {
  children: React.ReactNode;
}

/**
 * Wraps hero content with a spring-based reveal animation.
 * Respects prefers-reduced-motion via motion/react's built-in support.
 */
export function HeroReveal({ children }: HeroRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 28,
        delay: 0.1,
      }}
    >
      {children}
    </motion.div>
  );
}
