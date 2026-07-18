"use client";

import React from "react";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol style={styles.breadcrumb}>
        <li style={styles.item}>
          <Link href="/" style={styles.link}>
            <Home size={13} />
            <span style={styles.linkLabel}>Utama</span>
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} style={styles.item}>
            <ChevronRight size={12} style={{ color: "#9ca3af", flexShrink: 0 }} />
            {item.href ? (
              <Link href={item.href} style={styles.link}>
                {item.label}
              </Link>
            ) : (
              <span style={styles.currentPage}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ── Helper: Set navigation source for context-aware breadcrumbs ──── */
export function setNavSource(source: string) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("nav_source", source);
  }
}

export function getNavSource(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("nav_source");
  }
  return null;
}

const styles: Record<string, React.CSSProperties> = {
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    listStyle: "none",
    margin: 0,
    padding: "8px 14px",
    borderRadius: "10px",
    background: "rgba(255, 255, 255, 0.6)",
    WebkitBackdropFilter: "blur(8px)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(221, 223, 226, 0.5)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
    width: "fit-content",
    fontSize: "12px",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  link: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "#65676b",
    textDecoration: "none",
    transition: "color 0.15s ease",
    fontWeight: 500,
  },
  linkLabel: {
    fontSize: "12px",
  },
  currentPage: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#1c1e21",
  },
};