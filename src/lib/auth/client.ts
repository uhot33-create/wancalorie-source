import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

/**
 * サーバー関数呼び出し時に付与する現在のユーザーの Firebase ID トークンを取得
 */
export async function getBearerToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!authEnabled) return null;

  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  try {
    return await currentUser.getIdToken();
  } catch {
    return null;
  }
}

/**
 * Google ログイン
 */
export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, googleProvider);
}

/**
 * メール・パスワードでログイン
 */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

/**
 * メール・パスワードで新規登録
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<void> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && cred.user) {
    await updateProfile(cred.user, { displayName });
  }
}

/**
 * ログアウト
 */
export async function signOut(redirectTo = "/login"): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } finally {
    if (typeof window !== "undefined") {
      window.location.href = redirectTo;
    }
  }
}
