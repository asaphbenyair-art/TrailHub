"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-xs text-fg-faint hover:text-red-500 transition-colors mt-1"
    >
      התנתק
    </button>
  );
}
