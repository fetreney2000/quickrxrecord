"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sparkles } from "lucide-react";

const themes = [
  { id: "default", name: "Default Light", color: "#7c3aed" },
  { id: "dracula", name: "Dracula", color: "#bd93f9" },
  { id: "monokai", name: "Monokai", color: "#a6e22e" },
  { id: "monokai-pro", name: "Monokai Pro", color: "#ff6188" },
  { id: "one-monokai", name: "One Monokai", color: "#98c379" },
  { id: "ayu", name: "Ayu", color: "#ff8f40" },
  { id: "synthwave-82", name: "Synthwave 82", color: "#ff7edb" },
  { id: "retro-arcade", name: "Retro Arcade", color: "#e94560" },
  { id: "neo-brutalism", name: "Neo Brutalism", color: "#2563eb" },
  { id: "tweakcn", name: "TweakCN", color: "#18181b" },
  { id: "notebook", name: "Notebook", color: "#c0392b" },
  { id: "bubblegum", name: "Bubblegum", color: "#ff6b9d" },
  { id: "cyberpunk", name: "Cyberpunk", color: "#ff00ff" },
  { id: "darkmatter", name: "Dark Matter", color: "#6c63ff" },
  { id: "graphite", name: "Graphite", color: "#888888" },
  { id: "midnight-bloom", name: "Midnight Bloom", color: "#c084fc" },
  { id: "mocha-mousse", name: "Mocha Mousse", color: "#a67c52" },
  { id: "modern-minimal", name: "Modern Minimal", color: "#0a0a0a" },
  { id: "quantum-rose", name: "Quantum Rose", color: "#ff69b4" },
  { id: "starry-night", name: "Starry Night", color: "#fbbf24" },
  { id: "supabase", name: "Supabase", color: "#3ecf8e" },
  { id: "twitter", name: "Twitter", color: "#1d9bf0" },
  { id: "vercel", name: "Vercel", color: "#000000" },
  { id: "vintage-paper", name: "Vintage Paper", color: "#8b4513" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const current = themes.find(t => t.id === theme) || themes[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Tukar tema">
          <div className="h-4 w-4 rounded-full border-2 border-current" style={{ backgroundColor: current?.color || "#7c3aed" }} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 max-h-80 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Tema Warna</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((t) => (
          <DropdownMenuItem key={t.id} onClick={() => setTheme(t.id)} className="flex items-center gap-3 cursor-pointer">
            <div className={`h-5 w-5 rounded-full border-2 shrink-0 ${theme === t.id ? "border-foreground" : "border-border"}`} style={{ backgroundColor: t.color }} />
            <span className="text-sm">{t.name}</span>
            {theme === t.id && <span className="ml-auto text-xs text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}