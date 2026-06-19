import { getMessaging, getToken } from 'firebase/messaging';
import { app } from './firebase';

// 環境変数からVAPIDキーを取得
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export async function requestAndGetFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('Service Worker is not supported in this environment.');
    return null;
  }

  try {
    // 1. 通知権限の確認とリクエスト
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.warn('Notification permission was denied.');
      return null;
    }

    // 2. Messaging インスタンスの取得
    const messaging = getMessaging(app);

    // 3. Service Worker の登録状況を確認・登録
    // 古い登録が削除された直後は、新しく登録し直して起動完了を待つ必要があります。
    let registration = await navigator.serviceWorker.getRegistration(
      '/firebase-messaging-sw.js',
    );

    if (!registration) {
      console.log('FCM Service Worker を新しく登録します...');
      registration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js',
        {
          scope: '/',
        },
      );
    }

    // 🌟 【最重要】Service Worker が「アクティブ」になるまで確実に待機するロジック
    // これにより「no active Service Worker」エラーを完全に防止します。
    if (!registration.active) {
      console.log('Service Worker がアクティブになるのを待機しています...');
      await navigator.serviceWorker.ready;

      // 起動完了するまでループで微小なミリ秒単位のチェック待機を行います
      let retryCount = 0;
      while (!registration.active && retryCount < 10) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        registration =
          (await navigator.serviceWorker.getRegistration(
            '/firebase-messaging-sw.js',
          )) || registration;
        retryCount++;
      }
    }

    if (!registration.active) {
      throw new Error(
        'Service Worker のアクティベートがタイムアウトしました。',
      );
    }

    console.log(
      'Service Worker が正常にアクティブになりました。FCMトークンを取得します...',
    );

    // 4. FCMトークンの取得
    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (currentToken) {
      console.log('FCM Token 取得成功:', currentToken);
      return currentToken;
    } else {
      console.warn(
        'No registration token available. Request permission to generate one.',
      );
      return null;
    }
  } catch (error) {
    console.error('An error occurred while fetching the FCM token:', error);
    throw error;
  }
}
