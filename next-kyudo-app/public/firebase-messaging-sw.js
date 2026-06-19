// 特殊なグローバル環境であるため、eslintの警告を無効化
/* eslint-disable no-undef */
importScripts(
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
);
importScripts(
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js',
);

// サービスワーカー内は環境変数が使えないため、直接クライアント側と同じFirebase構成を定義する
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // バックグラウンド通知受信時のイベントハンドラ
  messaging.onBackgroundMessage((payload) => {
    console.log(
      '[firebase-messaging-sw.js] Received background message: ',
      payload,
    );

    const notificationTitle =
      payload.notification.title || '弓道大会運営システム';
    const notificationOptions = {
      body: payload.notification.body || '新しい通知があります。',
      icon: '/favicon.ico', // 適切なアイコンパスを設定
      data: payload.data, // 呼び出し情報（立ち番号など）を添付
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.error('Failed to initialize service worker messaging:', error);
}
