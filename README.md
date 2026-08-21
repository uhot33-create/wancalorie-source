# わんカロリー

愛犬の1日のカロリーを足し算し、理想体重に向けたごはん・おやつの量を計算するアプリです。

## 必要なもの

- [Node.js 22](https://nodejs.org/) 以上
- ターミナル（Windows なら PowerShell、Mac なら「ターミナル」）

## 動かし方

1. このフォルダを解凍する
2. その中で次を実行する

```bash
npm install
npm run dev
```

3. ブラウザで [http://localhost:8080](http://localhost:8080) を開く
4. 「はじめての方は新規登録」からメールとパスワード（8文字以上）で登録する

Google / X ログインは、Grok 上のプレビュー向けです。自分のパソコンでは **メール登録** を使ってください。

止めるときは、ターミナルで `Ctrl + C` です。

## 使い方

1. 愛犬の名前・体重・理想体重を登録
2. 「今日」でごはん・おやつのカロリーを足す
3. 「フード」によく使う餌を登録
4. 「プラン」で1日の必要量と給与グラムを確認

## データの保存と認証（Firebase）

このプロジェクトでは、データベースに **Cloud Firestore**、認証に **Firebase Authentication** を使用しています。

### Firebase の設定方法

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成します。
2. **Authentication** で「メール / パスワード」および「Google」を有効化します。
3. **Cloud Firestore** データベースを作成します（テストモードまたは適切なルールで作成）。
4. プロジェクトルートに `.env` ファイルを作成し、`.env.example` を参考に Firebase の設定情報を入力します：

```env
# クライアント用 (Firebase Console > プロジェクト設定 > 全般 > アプリ)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# サーバー用 (Firebase Console > プロジェクト設定 > サービスアカウント)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## ログインを省略したい場合（開発モード）

Firebase の設定をせずローカルで手軽に動作確認したい場合は、認証を無効化して開発用ユーザーで起動できます。

```bash
# Windows PowerShell
$env:VITE_AUTH_ENABLED="false"; npm run dev

# Mac / Linux
VITE_AUTH_ENABLED=false npm run dev
```
