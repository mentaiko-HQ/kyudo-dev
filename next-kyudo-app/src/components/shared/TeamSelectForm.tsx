'use client';

import React, { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously, User } from 'firebase/auth';
import { requestAndGetFcmToken } from '@/lib/fcm';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';

// ==========================================
// ★ 大切なポイント: ダッシュボードのダミーデータと
// 文字列（id）を完全に一致させた本番用チームリスト
// ==========================================
interface TeamOption {
  id: string;
  name: string;
}

const TEAMS: TeamOption[] = [
  { id: 'test_team_1', name: 'テストチーム1 (通知テスト用)' },
  { id: 'dummy_team_3B', name: 'ダミーチーム 3B' },
  { id: 'dummy_team_4B', name: 'ダミーチーム 4B' },
];

export default function TeamSelectForm() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 1. 匿名ログインと現在の選択状況の読み込み
  useEffect(() => {
    const loginAndLoad = async () => {
      try {
        // 未ログイン時は匿名ログインを実行してユーザーUIDを確保
        let user = auth.currentUser;
        if (!user) {
          const credential = await signInAnonymously(auth);
          user = credential.user;
        }
        setCurrentUser(user);

        // すでに登録済みのチームがあるかFirestoreから取得
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.selectedTeamId) {
              setSelectedTeamId(data.selectedTeamId);
              setIsRegistered(true);
            }
          }
        }
      } catch (error) {
        console.error('Initialization failed:', error);
        toast.error('初期化に失敗しました。再読み込みしてください。');
      } finally {
        setLoading(false);
      }
    };

    loginAndLoad();
  }, []);

  // 2. チーム登録 ＆ FCMトークン取得処理
  const handleTeamRegister = async () => {
    if (!currentUser || !selectedTeamId) return;
    setSubmitting(true);

    try {
      // ブラウザに通知権限を求め、FCMトークンを取得
      const fcmToken = await requestAndGetFcmToken();

      if (!fcmToken) {
        toast.error(
          '通知権限が拒否されたか、トークンを取得できませんでした。ブラウザの設定を確認してください。',
        );
        setSubmitting(false);
        return;
      }

      // Firestoreの 'users' コレクションに「ユーザーUID」をドキュメントIDとして保存
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(
        userDocRef,
        {
          uid: currentUser.uid,
          selectedTeamId: selectedTeamId,
          fcmToken: fcmToken,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setIsRegistered(true);
      toast.success('チームの登録と呼出通知の連携が完了しました！');
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error('登録処理中にエラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">読み込み中...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>選手・関係者用 呼出登録</CardTitle>
          <CardDescription>
            ご自身の所属チームを選択してください。試合の2つ前の立ちが開始された際に、プッシュ通知でお知らせします。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRegistered ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
                現在、
                <strong>
                  {TEAMS.find((t) => t.id === selectedTeamId)?.name ||
                    selectedTeamId}
                </strong>{' '}
                で通知待機中です。
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsRegistered(false)}
              >
                所属チームを変更する
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  所属チーム
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full p-2 border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- チームを選択してください --</option>
                  {/* ★ 古い MOCK_TEAMS から 新しい TEAMS へ名前を修正し、型定義も適合させました */}
                  {TEAMS.map((team: TeamOption) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleTeamRegister}
                className="w-full h-10 font-bold"
                disabled={!selectedTeamId || submitting}
              >
                {submitting ? '登録中...' : '通知を受け取る（登録）'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
