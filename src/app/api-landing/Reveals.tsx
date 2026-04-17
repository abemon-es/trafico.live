"use client";

import { motion, AnimatePresence } from "motion/react";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Hero section reveal — animates immediately on mount.
 * Respects prefers-reduced-motion automatically via CSS.
 */
export function HeroReveal({ children, delay = 0, className }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 22, delay }}
      className={className}
      // motion/react automatically reads prefers-reduced-motion and disables
      // animations when the user has requested reduced motion
    >
      {children}
    </motion.div>
  );
}

/**
 * Scroll-triggered reveal — triggers when the element enters the viewport.
 * Use for section headings and cards.
 */
export function SectionReveal({ children, delay = 0, className }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={{ type: "spring", stiffness: 240, damping: 26, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export { AnimatePresence };
