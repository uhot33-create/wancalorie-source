import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { authEnabled } from "./client";

/** アプリ内で共通利用するユーザー情報モデル */
export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  isDevFallback: boolean;
};

/** 認証無効時 (VITE_AUTH_ENABLED=false) のフォールバックユーザー */
export const DEV_USER: AppUser = {
  id: "dev-user",
  displayName: "Dev User",
  primaryEmail: "dev@example.com",
  profileImageUrl: null,
  isDevFallback: true,
};

export type CurrentUserState = {
  user: AppUser | null;
  isPending: boolean;
};

function mapFirebaseUser(user: User): AppUser {
  return {
    id: user.uid,
    displayName: user.displayName,
    primaryEmail: user.email,
    profileImageUrl: user.photoURL,
    isDevFallback: false,
  };
}

/**
 * 現在のログインユーザーとローディング状態を返すフック
 */
export function useCurrentUserState(): CurrentUserState {
  const [state, setState] = useState<CurrentUserState>(() => {
    if (!authEnabled) {
      return { user: DEV_USER, isPending: false };
    }
    const currentUser = typeof window !== "undefined" ? auth.currentUser : null;
    return {
      user: currentUser ? mapFirebaseUser(currentUser) : null,
      isPending: true,
    };
  });

  useEffect(() => {
    if (!authEnabled) {
      setState({ user: DEV_USER, isPending: false });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setState({
        user: firebaseUser ? mapFirebaseUser(firebaseUser) : null,
        isPending: false,
      });
    });

    return () => unsubscribe();
  }, []);

  return state;
}

/**
 * 簡易的にユーザー情報のみを取得するフック
 */
export function useCurrentUser(): AppUser | null {
  return useCurrentUserState().user;
}
