import React from 'react';
import { TeamSelectForm } from '@/components/shared/TeamSelectForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center tracking-tight text-slate-900">
          弓道大会運営システム
        </h1>
        <TeamSelectForm />
      </div>
    </main>
  );
}
