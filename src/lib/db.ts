import { adminDb } from "@/lib/firebase/admin";
import type { Firestore } from "firebase-admin/firestore";

/**
 * サーバー側で利用する Firestore インスタンスを取得
 */
export function getDb(): Firestore {
  if (typeof window !== "undefined") {
    throw new Error(
      "@/lib/db is server-only — access Firestore from server functions, never from client code.",
    );
  }
  return adminDb;
}
