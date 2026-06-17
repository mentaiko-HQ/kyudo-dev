import { messaging } from './firebase';
import { getToken } from 'firebase/messaging';

/**
 * ブラウザにプッシュ通知の権限を要求し、FCMトークンを取得する関数
 * @returns {Promise<string | null>} FCMトークン（取得失敗時または権限拒否時はnull）
 */
export async function requestAndGetFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !messaging) {
    console.warn(
      'FCM is not supported in the current environment (Server-side or unsupported browser).',
    );
    return null;
  }

  try {
    // 1. 通知権限の確認と要求
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission was denied by the user.');
      return null;
    }

    // 2. 環境変数からVAPIDキーを取得
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error(
        'Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY in environment variables.',
      );
      return null;
    }

    // 3. 【修正箇所】サービスワーカーを明示的に登録する（待機状態で固まるのを防ぐ）
    const registration = await navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
        return null;
      });

    if (!registration) {
      console.error('Service worker is not available.');
      return null;
    }

    // 4. FCMトークンの取得
    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (currentToken) {
      return currentToken;
    } else {
      console.warn('No registration token available.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while fetching the FCM token:', error);
    return null;
  }
}
