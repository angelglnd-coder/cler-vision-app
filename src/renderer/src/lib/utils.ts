// src/renderer/src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}

// Helper type to add ref property to component props
// Supports both 1 and 2 type arguments for backwards compatibility
export type WithElementRef<T extends Record<string, any>, E = any> = T & { ref?: E | null };

// Helper type to omit children and child properties
export type WithoutChildrenOrChild<T extends Record<string, any>> = Omit<T, 'children' | 'child'>;

// Helper type to omit children property
export type WithoutChildren<T extends Record<string, any>> = Omit<T, 'children'>;
