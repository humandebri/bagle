'use client';

// React 19との互換性のため、next-auth/reactの関数を使わずに直接リダイレクト

export const clientSignIn = () => {
  const callbackUrl = window.location.pathname;
  // カスタムサインインページにリダイレクト
  window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
};

export const clientSignOut = () => {
  // カスタムサインアウトページにリダイレクト
  window.location.href = '/auth/signout';
};