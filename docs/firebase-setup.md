# ASTRAL ARCHIVE：無料クラウドセーブ導入

## 採用サービス・料金

- Firebase Authentication（メール＋パスワード）
- Cloud Firestore **Standard edition**（データベース）
- Firebase の **Spark（無料・従量課金への自動移行なし）** プラン

2026年10月時点、Firestore Standardの無料枠はデータ保存1GiB、ドキュメント読み取り5万回/日、書き込み2万回/日、削除2万回/日です。無料枠を超えると操作が制限されます。無料枠やサービス提供が「永久に保証」されるわけではありません。公式情報：
https://firebase.google.com/pricing
https://firebase.google.com/docs/firestore/quotas

**Cloud Storage for Firebase は Spark プランでは利用できません。** MODファイル配布は移行途中で、現時点では既存のSupabase WORKSHOP連携を維持しています（Firebaseの設定だけではWORKSHOPのDBとMODファイルは移行されません）。
https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024

## 初回セットアップ

1. https://console.firebase.google.com/ でプロジェクトを作成し、**Spark** を選びます。既存のFirebaseプロジェクトでも構いません。
2. Firebase Authentication の Sign-in method で **Email/Password** を有効にします。
3. Firestore Database を **Standard edition** で作成します。リージョンはプレイヤーに近い地域を選びます。無料枠は選ぶ地域により利用可否が異なる場合があるため、作成画面で確認してください。
4. プロジェクト設定からWebアプリを登録し、Web設定オブジェクトから次の値をコピーします。値はクライアント公開用ですが、**管理者用サービスアカウント秘密鍵は絶対に書かないでください**。

```ini
VITE_FIREBASE_API_KEY=（firebaseConfig.apiKey）
VITE_FIREBASE_AUTH_DOMAIN=（firebaseConfig.authDomain）
VITE_FIREBASE_PROJECT_ID=（firebaseConfig.projectId）
VITE_FIREBASE_APP_ID=（firebaseConfig.appId）
```

5. ローカル開発なら `apps/client/.env.example` を `apps/client/.env.local` にコピーし値を設定します。Renderなどで公開する場合は同じ4変数を**ビルド時の環境変数**として設定し、再ビルドします。
6. Firebase CLIにログインして **対象のプロジェクトIDを確認**した後、次のコマンドでセキュリティルールを配備します。プロジェクトIDを間違えると別のDBへ変更が入ります。

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest deploy --only firestore:rules --project YOUR_FIREBASE_PROJECT_ID
```

ファイル `firestore.rules` はプロトタイプです。データ公開前にルールをレビュー・検証し、AuthenticationとFirestoreを有効化したうえで実際に読み書きテストを行ってください。
本プロジェクトには `firebase.json` と `firestore.indexes.json` も含まれています。

## セーブの移行

1. **既存のSupabase設定のまま**旧アカウントにログインします。
2. セーブ画面から旧Supabaseのクラウドセーブを読み込み、**ローカルに保存**します。
3. さらに「セーブファイルを書き出す」でJSONバックアップを取得します。
4. Firebaseの環境変数を設定してアプリを再ビルドします。**同じサイトのURLで開く**とローカルセーブを引き継げます。URLが変わる場合はバックアップJSONから読み込みます。
5. Firebaseで新規アカウントを登録し、ローカルのセーブを読み込んでから「クラウドに保存」します。

旧SupabaseのユーザーとFirebaseのユーザーは**別アカウント**です。メールアドレスが同じでも自動統合しません。
コードを切り替えただけでは、すでに運用しているSupabaseのデータベースは削除されません。移行・バックアップの確認が済むまで削除しないでください。

## 保存先と制限

- ローカル保存：ブラウザのlocalStorage（端末ごと）。JSONファイルにも書き出せます。
- Firebase保存：`users/{uid}/saves/{slot}`。`uid` はFirebase Authの認証済みユーザーIDです。
- セーブはJSON文字列で保存し、1件につき最大256KB（UTF-8バイト数）。セキュリティルールがUIDによるアクセス制限とデータ形式を検証します。
- クラウドセーブはプレイヤー本人しか読めません。無権限の公開読み取りは拒否します。
- ゲームのセーブ以外（MODカタログ・配布ファイル等）は旧Supabaseから移行していないため、WORKSHOP用Supabaseが停止すると使えません。
- Firebaseの無料枠は利用量をFirebaseコンソールで定期的に確認してください。大人数対応や大量MOD配布には追加の設計が必要です。

## 開発者向け検証

- `npm install` の後、`npm run typecheck` と `npm run test` を実行。
- Firebaseテスト用プロジェクトまたは公式エミュレータで、自分のUIDでは保存・読み込み可能／他人のUIDでは拒否／巨大JSONは拒否されることを確認。
- Firestoreルールを変更した際は `npx -y firebase-tools@latest deploy --only firestore:rules --dry-run --project YOUR_FIREBASE_PROJECT_ID` などで構文を確認してから本番デプロイ。
