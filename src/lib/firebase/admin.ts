import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function initAdmin(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // 改行コードのエスケープを解除
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  // サービスアカウント JSON の文字列が環境変数に設定されている場合
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
    } catch (e) {
      console.error("[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e);
    }
  }

  // 個別の環境変数が設定されている場合
  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  }

  // デフォルト認証 (ADC: Cloud Run / App Engine / Emulator 等)
  return initializeApp({
    projectId: projectId || "demo-project",
  });
}

const adminApp: App = initAdmin();

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
