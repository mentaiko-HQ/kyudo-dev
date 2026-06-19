import TeamSelectForm from '../components/shared/TeamSelectForm';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
      <div className="z-10 max-w-md w-full items-center justify-between font-mono text-sm">
        <h1 className="text-2xl font-bold text-center mb-6 text-slate-800">
          弓道大会運営システム
        </h1>
        {/* チーム選択とFCMトークンの取得を行う共通コンポーネント */}
        <TeamSelectForm />
      </div>
    </main>
  );
}
