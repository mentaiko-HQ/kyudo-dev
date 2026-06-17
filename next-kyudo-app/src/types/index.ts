/**
 * 弓道大会ドメイン 定義ファイル (Firestore スキーマ対応)
 */

// 射会形式（一手、四矢、射詰、遠近）
export type MatchFormat = 'hitote' | 'yotsuya' | 'izume' | 'enkin';

// 的中結果（〇 または ✕）
export type HitResult = 'hit' | 'miss';

// ==========================================
// Firestore コレクションごとの型定義
// ==========================================

// 1. users コレクション (システム利用者・通知先)
export interface User {
  uid: string;
  role: 'player' | 'admin'; // 選手か管理者か
  selectedTeamId: string; // 通知対象のチームID
  fcmToken: string; // プッシュ通知トークン
  updatedAt: any; // Firestore Timestamp
}

// 2. teams コレクション (チーム・団体)
export interface Team {
  id: string;
  name: string; // チーム名（例: 東京大学 弓道部A）
  category: string; // カテゴリ（例: 'team_men', 'individual_women'）
  isDisqualified: boolean; // 失格などの状態フラグ
  createdAt: any;
}

// 3. participants コレクション (参加選手)
export interface Participant {
  id: string;
  teamId: string; // 所属チームID
  name: string; // 選手名
  orderNum: number; // 立ち順 (1:大前, 2:二的, 3:中, 4:落ち前, 5:落)
  isActive: boolean; // 補欠交代時などにfalseにする
}

// 4. tachis コレクション (立ち・試合進行キュー) ★最重要
export type TachiStatus = 'waiting' | 'active' | 'finished';

export interface Tachi {
  id: string;
  tachiNumber: number; // 立ち番号 (第1立, 第2立...)
  roundName: string; // 試合名 (例: 予選 1回戦)
  teamIds: string[]; // この立ちに入場するチームのID配列
  status: TachiStatus; // 現在の進行状況
  updatedAt: any;
}

// 5. scores コレクション (的中記録)
export interface Score {
  id: string;
  participantId: string; // 誰の記録か
  teamId: string; // 所属チーム (集計用)
  tachiId: string; // どの立ちでの記録か
  format: MatchFormat; // 試合形式
  results: HitResult[]; // 的中配列 ['hit', 'miss', 'hit', 'hit']
  totalHits: number; // 合計的中数 (集計用)
  recordedBy: string; // 記録した管理者のUID
  updatedAt: any;
}
