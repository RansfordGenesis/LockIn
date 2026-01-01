"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "info";
}

export function CollapsibleSection({
  title,
  subtitle,
  icon,
  children,
  defaultOpen = false,
  badge,
  badgeVariant = "default",
}: Readonly<CollapsibleSectionProps>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const badgeColors = {
    default: "bg-[#1e1e23] text-gray-300",
    success: "bg-emerald-500/20 text-emerald-400",
    warning: "bg-amber-500/20 text-amber-400",
    info: "bg-teal-500/20 text-teal-400",
  };

  return (
    <div className="border border-[#2d2d32] rounded-xl overflow-hidden bg-[#121214]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#1e1e23] transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-teal-400">{icon}</span>}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white">{title}</h3>
              {badge && (
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-full",
                    badgeColors[badgeVariant]
                  )}
                >
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 pt-2 border-t border-[#2d2d32]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface YamlDisplayProps {
  data: Record<string, unknown>;
  level?: number;
}

export function YamlDisplay({ data, level = 0 }: Readonly<YamlDisplayProps>) {
  const indent = "  ".repeat(level);

  const renderValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="yaml-string">null</span>;
    }

    if (typeof value === "boolean") {
      return <span className="yaml-boolean">{value.toString()}</span>;
    }

    if (typeof value === "number") {
      return <span className="yaml-number">{value}</span>;
    }

    if (typeof value === "string") {
      return <span className="yaml-string">&quot;{value}&quot;</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-500">[]</span>;
      }

      return (
        <div className="mt-1">
          {value.map((item, index) => (
            <div key={typeof item === "object" ? `item-${index}-${JSON.stringify(item).substring(0, 50)}` : `${item}-${index}`} className="flex">
              <span className="text-gray-500 mr-2">{indent}  -</span>
              {typeof item === "object" ? (
                <YamlDisplay data={item as Record<string, unknown>} level={level + 2} />
              ) : (
                renderValue(item)
              )}
            </div>
          ))}
        </div>
      );
    }

    if (value === null || value === undefined) {
      return <span className="text-gray-500">null</span>;
    }

    if (typeof value === "object") {
      return <YamlDisplay data={value as Record<string, unknown>} level={level + 1} />;
    }

    // At this point, value is guaranteed to be a primitive (string, number, boolean)
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return <span className="text-white">{String(value)}</span>;
    }

    return <span className="text-gray-500">unknown</span>;
  };

  return (
    <div className="font-mono text-sm leading-relaxed">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex flex-wrap">
          <span className="yaml-key">{indent}{key}:</span>
          {typeof value !== "object" || value === null ? (
            <span className="ml-2">{renderValue(value)}</span>
          ) : (
            renderValue(value)
          )}
        </div>
      ))}
    </div>
  );
}

interface TreeNodeProps {
  label: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  isLast?: boolean;
}

export function TreeNode({ label, children, icon }: Readonly<TreeNodeProps>) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = React.Children.count(children) > 0;

  const handleToggle = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (hasChildren && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative">
      {hasChildren ? (
        <button
          className={cn(
            "flex items-center gap-2 py-1 px-2 rounded hover:bg-[#1e1e23] transition-colors w-full text-left"
          )}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronRight className="w-3 h-3 text-gray-500" />
          </motion.div>
          {icon && <span className="text-teal-400">{icon}</span>}
          <span className="text-gray-200 text-sm">{label}</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 py-1 px-2">
          <div className="w-3" />
          {icon && <span className="text-teal-400">{icon}</span>}
          <span className="text-gray-200 text-sm">{label}</span>
        </div>
      )}

      <AnimatePresence>
        {isOpen && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-4 pl-4 border-l border-[#2d2d32]"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
