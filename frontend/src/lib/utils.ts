import { clsx, type ClassValue } from "clsx"
// import { twMerge } from "tailwind-merge"

// export function cn(...inputs: ClassValue[]) {
//   return twMerge(clsx(inputs))
// }


export type JsonCertificate = {
  issuer: string;
  issued_at: string;
  valid_until: string;
  is_valid: boolean;
  owner: string;
  year_of_birth: number;
};