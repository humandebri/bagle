// app/online-shop/@modal/layout.tsx
'use client';

export default function ModalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white md:bg-black/50">
      <div className="bg-white rounded-lg overflow-hidden w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
