'use client';

import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { requestAndGetFcmToken } from '@/lib/fcm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// 選択肢となるチームのモックデータ（本来はFirestoreのteamsコレクションから取得）
const MOCK_TEAMS = [
  { id: 'team_001', name: '東京大学 弓道部A' },
  { id: 'team_002', name: '早稲田大学 弓道部' },
  { id: 'team_003', name: '慶應義塾大学 弓道部B' },
];

export function TeamSelectForm() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 1. 既存の紐付け情報をFirestoreからロードして維持するロジック (useEffectより上に配置)
  const loadUserSelection = async (uid: string) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data.selectedTeamId) {
          setSelectedTeamId(data.selectedTeamId);

          // 自動更新要件: リロード時に紐付けがある場合、トークン文字列のみ最新化する
          const currentToken = await requestAndGetFcmToken();
          if (currentToken && currentToken !== data.fcmToken) {
            await setDoc(userDocRef, {
              ...data,
              fcmToken: currentToken,
              updatedAt: serverTimestamp(),
            });
            console.log('FCM token automatically updated on reload.');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user selection from Firestore:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2. 認証状態の監視および匿名ログインの実行
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadUserSelection(user.uid);
      } else {
        try {
          // ユーザー識別を確実にするため、未ログイン時は匿名ログインを実行
          const credential = await signInAnonymously(auth);
          setCurrentUser(credential.user);
          await loadUserSelection(credential.user.uid);
        } catch (error) {
          console.error('Anonymous sign-in failed:', error);
          toast.error('認証エラー', {
            description:
              'システムの初期化に失敗しました。再読み込みしてください。',
          });
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. チーム選択・変更時の保存処理（上書きリセット）
  const handleTeamRegister = async () => {
    if (!currentUser || !selectedTeamId) return;

    setSubmitting(true);
    try {
      // プッシュ通知トークンの取得
      const fcmToken = await requestAndGetFcmToken();
      if (!fcmToken) {
        toast.error('通知登録失敗', {
          description:
            '通知権限が拒否されたか、トークンを取得できませんでした。ブラウザの設定を確認してください。',
        });
        setSubmitting(false);
        return;
      }

      // ユーザードキュメントへの保存（明示的選択のため、既存を上書きリセットして新規紐付け）
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, {
        uid: currentUser.uid,
        selectedTeamId: selectedTeamId,
        fcmToken: fcmToken,
        updatedAt: serverTimestamp(),
      });

      toast.success('チーム登録完了', {
        description: 'チームの紐付けと呼出通知の設定が完了しました。',
      });
    } catch (error) {
      console.error('Failed to save team and FCM token to Firestore:', error);
      toast.error('登録エラー', {
        description:
          'データの保存中にエラーが発生しました。時間を置いて再度お試しください。',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-4 text-sm text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>選手・チーム設定</CardTitle>
        <CardDescription>
          所属するチームを選択してください。試合の2つ前の立ち（試合順）になりましたら、この端末にプッシュ通知で呼出が行われます。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">チーム名</label>
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-full h-11">
              <SelectValue placeholder="チームを選択してください" />
            </SelectTrigger>
            <SelectContent>
              {MOCK_TEAMS.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          className="w-full h-11 font-medium mt-2"
          onClick={handleTeamRegister}
          disabled={!selectedTeamId || submitting}
        >
          {submitting ? '登録中...' : 'このチームで通知を受け取る'}
        </Button>
      </CardContent>
    </Card>
  );
}
