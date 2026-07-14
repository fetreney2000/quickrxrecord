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
import { Palette, Sun, Moon, Monitor, Sparkles } from "lucide-react";

const themes = [
  { id: "dark", name: "Dark", icon: Moon, desc: "Dark mode" },
  { id: "light", name: "Light", icon: Sun, desc: "Light mode" },
  { id: "system", name: "System", icon: Monitor, desc: "Ikut sistem" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span>Tema</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
              theme === t.id ? "bg-primary border-primary text-primary-foreground" : "border-border"
            }`}>
              <t.icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{t.name}</span>
              <span className="text-xs text-muted-foreground">{t.desc}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}