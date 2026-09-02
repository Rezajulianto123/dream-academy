import { NextRequest } from "next/server";
import { registerSchema } from "@/schemas/auth.schema";
import { AuthService, AuthError } from "@/services/auth.service";
import { apiError, apiSuccess } from "@/lib/api-response";
import { setAuthCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = registerSchema.safeParse(body);

    if (!parseResult.success) {
      const details = parseResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return apiError(
        "VALIDATION_ERROR",
        details[0]?.message || "Data pendaftaran tidak valid.",
        400,
        details
      );
    }

    const result = await AuthService.register(parseResult.data);
    const response = apiSuccess(
      {
        user: result.user,
        token: result.token,
      },
      undefined,
      201
    );

    setAuthCookie(response, result.token);
    return response;
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, error.statusCode, error.details);
    }
    console.error("Register API Error:", error);
    return apiError("INTERNAL_SERVER_ERROR", "Terjadi kesalahan pada server.", 500);
  }
}
