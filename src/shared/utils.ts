import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Implementation of sleep with promises.
 *
 * @function
 * @param ms Time in milliseconds to sleep for.
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateSubjectCode(subjectName: string): string {
  // Remove any non-alphanumeric characters and convert to uppercase
  const cleanName = subjectName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  // Take the first 3 characters
  const prefix = cleanName.slice(0, 3);

  // Generate a random 3-digit number
  const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  return `${prefix}${suffix}`;
}