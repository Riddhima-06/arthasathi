export const inr = (n: number | string, digits = 0) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: digits, minimumFractionDigits: digits }).format(Number(n));

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
