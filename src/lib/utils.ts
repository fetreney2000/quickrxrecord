import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("ms-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("ms-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toKLTimestamp(date?: Date): string {
  const d = date || new Date();
  return d.toISOString();
}

export function getKLDate(): string {
  const now = new Date();
  const kl = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
  return kl.toISOString().split("T")[0];
}