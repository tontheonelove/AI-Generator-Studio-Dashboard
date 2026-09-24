import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes (standard shadcn/ui utility)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper สำหรับ handle Select onValueChange ที่รับ string | null
 * ใช้กับ shadcn/ui Select component ใน Radix UI เวอร์ชันใหม่
 */
export function handleSelectChange<T>(
  setter: (value: T) => void,
  fallback: T
): (value: string | null) => void {
  return (value) => setter((value ?? fallback) as T);
}