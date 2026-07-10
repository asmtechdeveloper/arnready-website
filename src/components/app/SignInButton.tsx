'use client';

import { useState } from 'react';
import { LogIn } from '@/components/Icon';
import { isFirebaseConfigured, signInWithGoogle } from '@/lib/firebase';

export default function SignInButton({ label = 'Sign in' }: { label?: string }) {
  const [note, setNote] = useState<string | null>(null);

  async function handleClick() {
    if (!isFirebaseConfigured()) {
      setNote('Sign-in is not available in this preview build.');
      return;
    }
    try {
      await signInWithGoogle();
    } catch {
      // Popup dismissed or blocked — cancelling is always fine (locked
      // access model: cancel → keep studying free).
    }
  }

  return (
    <div className="flex items-center gap-2">
      {note && <span className="text-xs font-bold text-muted">{note}</span>}
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2 rounded-full bg-purple px-4 py-1.5 text-sm font-bold text-white shadow-card transition-colors hover:bg-purple-dark"
      >
        <LogIn size={16} />
        {label}
      </button>
    </div>
  );
}
