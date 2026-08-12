"use client";

import { motion } from "framer-motion";

export default function MessageScreen({
  icon,
  iconBgClass = "bg-muted",
  title,
  children,
  action,
}) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card p-8 rounded-xl border border-border max-w-md w-full mx-4 text-center"
      >
        {icon && (
          <div
            className={`w-16 h-16 ${iconBgClass} rounded-full flex items-center justify-center mx-auto mb-4`}
          >
            {icon}
          </div>
        )}
        <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
        {children && <div className="text-muted-foreground mb-6">{children}</div>}
        {action}
      </motion.div>
    </div>
  );
}
