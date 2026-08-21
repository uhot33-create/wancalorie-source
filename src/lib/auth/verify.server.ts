import { adminAuth } from "@/lib/firebase/admin";

const authDisabled = process.env.VITE_AUTH_ENABLED === "false";

export const DEV_USER_ID = "dev-user";

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export type VerifiedUser = { id: string; email: string | null };

/**
 * 送信された Firebase ID トークンを検証してユーザー情報を取得
 */
export async function getSessionUser(
  bearerToken?: string,
): Promise<VerifiedUser | null> {
  if (authDisabled) {
    return { id: DEV_USER_ID, email: "dev@example.com" };
  }

  if (!bearerToken) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(bearerToken);
    return {
      id: decodedToken.uid,
      email: decodedToken.email ?? null,
    };
  } catch (err) {
    console.error("[auth] Firebase token verification failed:", err);
    return null;
  }
}

/**
 * 認証されたユーザーIDを要求する（未認証なら UnauthorizedError をスロー）
 */
export async function requireUserId(bearerToken?: string): Promise<string> {
  if (authDisabled) {
    return DEV_USER_ID;
  }

  const user = await getSessionUser(bearerToken);
  if (!user) {
    throw new UnauthorizedError("ログインが必要です");
  }
  return user.id;
}
