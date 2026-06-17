'use client';

import React, { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Tachi } from '@/types';

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tachis, setTachis] = useState<Tachi[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. 認証チェックとFirestoreのリアルタイム購読
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    // tachisコレクションを立ち番号順にリアルタイム取得
    const q = query(collection(db, 'tachis'), orderBy('tachiNumber', 'asc'));
    const unsubscribeDb = onSnapshot(
      q,
      (snapshot) => {
        const tachiData = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as Tachi[];
        setTachis(tachiData);
        setLoading(false);
      },
      (error) => {
        console.error('Firestore error:', error);
        toast.error(
          'データの取得に失敗しました。管理者権限がない可能性があります。',
        );
        setLoading(false);
      },
    );

    return () => {
      unsubscribeAuth();
      unsubscribeDb();
    };
  }, []);

  // 2. 次の立ちへ進める（ステータス更新）処理
  const handleNextTachi = async () => {
    if (!currentUser) return;

    // 現在「active」な立ちと、次に「waiting」な立ちを探す
    const currentActiveIndex = tachis.findIndex((t) => t.status === 'active');
    const nextWaitingIndex = tachis.findIndex(
      (t, index) => t.status === 'waiting' && index > currentActiveIndex,
    );

    const batch = writeBatch(db);

    // 現在の立ちを終了にする
    if (currentActiveIndex !== -1) {
      const currentTachi = tachis[currentActiveIndex];
      const currentRef = doc(db, 'tachis', currentTachi.id);
      batch.update(currentRef, {
        status: 'finished',
        updatedAt: serverTimestamp(),
      });
    }

    // 次の立ちを試合中にする
    if (nextWaitingIndex !== -1) {
      const nextTachi = tachis[nextWaitingIndex];
      const nextRef = doc(db, 'tachis', nextTachi.id);
      batch.update(nextRef, { status: 'active', updatedAt: serverTimestamp() });

      // ★ ここで「2つ先（nextWaitingIndex + 2）」の立ちのチームIDを取得し、
      // バックエンドAPIを呼び出してFCMプッシュ通知を送信する処理を後ほど追加します。
      const notifyTargetIndex = nextWaitingIndex + 2;
      if (notifyTargetIndex < tachis.length) {
        toast.info(
          `システムログ: 第${tachis[notifyTargetIndex].tachiNumber}立のチームへ呼出通知を送信します（実装予定）`,
        );
      }
    } else {
      toast.success('すべての立ちが終了しました！');
      return;
    }

    try {
      await batch.commit();
      toast.success('進行状況を更新しました。');
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('更新に失敗しました。');
    }
  };

  // 3. テスト用：ダミーデータの初期化
  const initializeDummyData = async () => {
    try {
      const batch = writeBatch(db);
      for (let i = 1; i <= 5; i++) {
        const ref = doc(collection(db, 'tachis'));
        batch.set(ref, {
          id: ref.id,
          tachiNumber: i,
          roundName: '予選',
          teamIds: [`dummy_team_${i}A`, `dummy_team_${i}B`],
          status: i === 1 ? 'active' : 'waiting', // 1立目だけ最初から進行中
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      toast.success('ダミーデータを生成しました！');
    } catch (error) {
      console.error('Init failed:', error);
      toast.error('ダミーデータの生成に失敗しました。');
    }
  };

  if (loading) return <div className="p-8 text-center">読み込み中...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex justify-between items-end pb-4 border-b">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              大会進行ダッシュボード
            </h1>
            <p className="text-muted-foreground mt-1">
              現在の立ちの管理と自動呼出のコントロール
            </p>
          </div>
          {tachis.length === 0 && (
            <Button onClick={initializeDummyData} variant="outline">
              ダミーデータを生成
            </Button>
          )}
        </header>

        {/* コントロールパネル */}
        <Card className="border-blue-200 shadow-sm">
          <CardHeader className="bg-blue-50/50 pb-4">
            <CardTitle className="text-lg">進行コントロール</CardTitle>
            <CardDescription>
              次の立ちを開始すると、2つ後の立ちのチームへ自動で呼出通知が飛びます。
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex gap-4">
            <Button
              onClick={handleNextTachi}
              className="flex-1 h-12 text-lg font-bold"
              disabled={tachis.length === 0}
            >
              次の立ちへ進める (試合開始)
            </Button>
          </CardContent>
        </Card>

        {/* タイムライン表示 */}
        <div className="space-y-3 mt-8">
          <h2 className="text-xl font-bold mb-4">立ち一覧（タイムライン）</h2>
          {tachis.map((tachi) => (
            <Card
              key={tachi.id}
              className={`transition-all ${
                tachi.status === 'active'
                  ? 'border-2 border-blue-500 shadow-md bg-blue-50/30'
                  : tachi.status === 'finished'
                    ? 'opacity-60 bg-slate-100'
                    : ''
              }`}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${
                      tachi.status === 'active'
                        ? 'bg-blue-600 text-white'
                        : tachi.status === 'finished'
                          ? 'bg-slate-300 text-slate-600'
                          : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tachi.tachiNumber}
                  </div>
                  <div>
                    <p className="font-bold text-lg">
                      {tachi.roundName} 第{tachi.tachiNumber}立
                    </p>
                    <p className="text-sm text-muted-foreground">
                      割当: {tachi.teamIds.join(', ')}
                    </p>
                  </div>
                </div>
                <div>
                  {tachi.status === 'active' && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold animate-pulse">
                      試合中
                    </span>
                  )}
                  {tachi.status === 'waiting' && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
                      待機中
                    </span>
                  )}
                  {tachi.status === 'finished' && (
                    <span className="px-3 py-1 bg-slate-200 text-slate-500 rounded-full text-sm font-medium">
                      終了
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {tachis.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              立ちデータがありません。「ダミーデータを生成」を押してください。
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
