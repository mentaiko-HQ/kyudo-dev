'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScoreButtonProps {
  value: 'hit' | 'miss' | null;
  onSelect: (result: 'hit' | 'miss') => void;
  label?: string;
}

export function ScoreButton({ value, onSelect, label }: ScoreButtonProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={value === 'hit' ? 'default' : 'outline'}
          className={cn(
            'w-16 h-16 text-2xl rounded-full border-2',
            value === 'hit' && 'bg-blue-600 hover:bg-blue-700 border-blue-800',
          )}
          onClick={() => onSelect('hit')}
        >
          〇
        </Button>
        <Button
          type="button"
          variant={value === 'miss' ? 'default' : 'outline'}
          className={cn(
            'w-16 h-16 text-2xl rounded-full border-2',
            value === 'miss' && 'bg-red-600 hover:bg-red-700 border-red-800',
          )}
          onClick={() => onSelect('miss')}
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
