'use client';

import { FcGoogle } from 'react-icons/fc';

export default function GoogleSignInButton() {
  const handleSignIn = () => {
    // NextAuthのサインインページに直接リダイレクト
    window.location.href = '/api/auth/signin';
  };

  return (
    <button 
      onClick={handleSignIn}
      className="w-full py-3 bg-white border border-gray-300 shadow-sm text-gray-700 flex items-center justify-center gap-3 hover:bg-gray-50"
    >
      <FcGoogle className="w-5 h-5" />
      Googleでログイン
    </button>
  );
}