import { z } from "zod";

export const registerSchema = z.object({
  full_name: z
    .string({ required_error: "Nama lengkap wajib diisi" })
    .min(2, "Nama lengkap minimal 2 karakter")
    .max(150, "Nama lengkap maksimal 150 karakter")
    .trim(),
  email: z
    .string({ required_error: "Email wajib diisi" })
    .email("Format email tidak valid")
    .max(255, "Email maksimal 255 karakter")
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: "Password wajib diisi" })
    .min(8, "Password minimal 8 karakter")
    .regex(
      /^(?=.*[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
      "Password harus memuat minimal 1 angka atau simbol"
    ),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email wajib diisi" })
    .email("Format email tidak valid")
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: "Password wajib diisi" })
    .min(1, "Password wajib diisi"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
