import { apiSuccess } from "@/lib/api-response";
import { clearAuthCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = apiSuccess({
    message: "Logout berhasil.",
  });
  clearAuthCookie(response);
  return response;
}
