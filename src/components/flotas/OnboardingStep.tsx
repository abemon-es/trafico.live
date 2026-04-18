"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";

interface OnboardingStepProps {
  step: number;
  title: string;
  description: string;
  completed?: boolean;
  active?: boolean;
  children?: React.ReactNode;
}

export function OnboardingStep({
  step,
  title,
  description,
  completed = false,
  active = false,
  children,
}: OnboardingStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 26, delay: step * 0.08 }}
      className={[
        "flex gap-5 p-6 rounded-2xl border transition-colors",
        active
          ? "border-tl-500 bg-tl-50 dark:bg-tl-900/30"
          : completed
          ? "border-signal-green/30 bg-white dark:bg-tl-950"
          : "border-tl-100 dark:border-tl-800 bg-white dark:bg-tl-950 opacity-60",
      ].join(" ")}
    >
      {/* Step indicator */}
      <div className="shrink-0">
        {completed ? (
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-signal-green text-white">
            <Check className="w-4 h-4" />
          </span>
        ) : (
          <span
            className={[
              "flex items-center justify-center w-9 h-9 rounded-full font-heading font-bold text-sm",
              active
                ? "bg-tl-600 text-white"
                : "bg-tl-100 dark:bg-tl-800 text-foreground/50",
            ].join(" ")}
          >
            {step}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-heading font-semibold text-base">{title}</h3>
          <p className="text-sm text-foreground/60 mt-0.5">{description}</p>
        </div>
        {(active || completed) && children && (
          <div>{children}</div>
        )}
      </div>
    </motion.div>
  );
}
