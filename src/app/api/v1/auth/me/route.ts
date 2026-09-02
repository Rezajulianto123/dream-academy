import { NextRequest } from "next/server";
import { AuthService, AuthError } from "@/services/auth.service";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthFromRequest(request);
    const user = await AuthService.getUserById(payload.userId);

    if (!user) {
      return apiError("USER_NOT_FOUND", "Pengguna tidak ditemukan.", 404);
    }

    return apiSuccess({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, error.statusCode, error.details);
    }
    console.error("Me API Error:", error);
    return apiError("INTERNAL_SERVER_ERROR", "Terjadi kesalahan pada server.", 500);
  }
}
