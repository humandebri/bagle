'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cart-store';
import { useAuthSession } from '@/lib/auth-compat';
import { clientSignIn } from '@/lib/next-auth-client';
import { FcGoogle } from 'react-icons/fc';
import { useRouter } from 'next/navigation';
import {  DateTimeDisplay_order } from '@/components/DateTimeDisplay';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const dispatchDate = useCartStore((s) => s.dispatchDate);
  const dispatchTime = useCartStore((s) => s.dispatchTime);
  const dispatchEndTime = useCartStore((s) => s.dispatchEndTime);
  const items        = useCartStore((s) => s.items);
  const router       = useRouter();
  const { data: session, status } = useAuthSession();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({
    firstName: '', lastName: '', phone: '', email: '',
  });

  const validate = () => {
    const e = { firstName: '', lastName: '', phone: '', email: '' };
    let ok = true;
  
    if (!firstName) {
      e.firstName = '名を入力してください';
      ok = false;
    }
  
    if (!lastName) {
      e.lastName = '姓を入力してください';
      ok = false;
    }
  
    if (!phone || !/^\d+$/.test(phone)) {
      e.phone = '数字のみを入力してください（例: 09012345678）';
      ok = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'メール形式が不正です';
      ok = false;
    }
  
    setErrors(e);
    return ok;
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.id) return;
  
    const fetchProfile = async () => {
      try {
        // サーバーサイドAPIを使用してプロフィールを取得
        const response = await fetch('/api/profile');
        
        if (!response.ok) {
          // エラーの詳細は表示しない
          return;
        }
  
        const data = await response.json();
        
        if (data) {
          setFirstName(data.first_name ?? '');
          setLastName(data.last_name ?? '');
          setPhone(data.phone ?? '');
          setEmail(data.email ?? session.user?.email ?? '');
        } else {
          setEmail(session.user?.email ?? '');
        }
      } catch {
        // エラーの詳細はログに出力しない（本番環境のため）
        setEmail(session.user?.email ?? '');
      }
    };
  
    fetchProfile();
  }, [session, status]);

  const handleSubmit = async () => {
    if (!validate()) return;
  
    if (!dispatchDate || !dispatchTime) {
      toast.error('日時を選択してください');
      return;
    }
    
    // 時間枠の有効性をチェック
    try {
      const response = await fetch('/api/validate-time-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: dispatchDate, 
          time: dispatchTime,
          isUserSelection: true // This is the user's current cart selection
        }),
      });

      const result = await response.json();

      if (!result.valid) {
        toast.error("選択された時間枠は利用できません", {
          description: result.message,
        });
        // 無効な時間枠の場合、日時選択画面へ誘導
        router.push('/dispatch');
        return;
      }
    } catch {
      toast.error("エラーが発生しました", {
        description: "もう一度お試しください。",
      });
      return;
    }
  
    if (!session?.user?.id) {
      router.push('/online-shop');
      return;
    }
  
    // サーバーサイドAPIを使用してプロフィールを保存
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
        }),
      });
  
      if (!response.ok) {
        await response.json();
        toast.error('プロフィールの保存に失敗しました');
        return;
      }
  
      router.push('/review');
    } catch {
      toast.error('プロフィールの保存に失敗しました');
    }
  };
  

  if (status === 'loading') {
    return <div className="p-8 text-center">ロード中...</div>;
  }

  if (!session) {
    return (
      <main className="min-h-[calc(100vh-7rem)] px-6 py-10 bg-white">
        <h1 className="text-2xl text-gray-400 mb-6">ログインしてください</h1>
        <button
          onClick={() => clientSignIn()}
          className="w-full py-3 bg-white border border-gray-300 shadow-sm text-gray-700 flex items-center justify-center gap-3 hover:bg-gray-50"
        >
          <FcGoogle className="text-2xl" />
          <span>Googleでログイン</span>
        </button>
      </main>
    );
  }

  return (
    <>
      <main className="pb-24 md:pb-8 min-h-[calc(100vh-7rem)] px-4 md:px-6 py-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-semibold pb-4 md:pb-6">注文手続き</h1>

          <div className="md:grid md:grid-cols-12 md:gap-8">
            {/* Left: Inputs */}
            <div className="md:col-span-7 lg:col-span-8">
              <section className="mb-6 text-gray-700">
                <div className="mb-4">
                  <p className="text-base md:text-lg font-medium">受取場所</p>
                  <p className="text-gray-800">店舗</p>
                </div>
                <div>
                  <p className="text-base md:text-lg font-medium mb-2">受取日時</p>
                  <button
                    onClick={() => router.push(`/dispatch`)}
                    className="w-full border-2 rounded-md p-3 text-center hover:bg-gray-50 transition-colors"
                  >
                    {dispatchDate && dispatchTime ? (
                      <DateTimeDisplay_order
                        date={dispatchDate}
                        time={dispatchTime}
                        endTime={dispatchEndTime}
                      />
                    ) : (
                      '日時を選択してください'
                    )}
                  </button>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-lg md:text-xl font-medium mb-4">連絡先情報</h2>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 md:gap-4">
                    <InputField label="姓" value={lastName} onChange={setLastName} error={errors.lastName} placeholder="例：山田" />
                    <InputField label="名" value={firstName} onChange={setFirstName} error={errors.firstName} placeholder="例：太郎" />
                  </div>
                  <InputField label="電話番号" value={phone} onChange={setPhone} error={errors.phone} placeholder="例：09012345678(ハイフンなし)" type="tel" />
                  <InputField label="メールアドレス" value={email} onChange={setEmail} error={errors.email} placeholder="例：example@email.com" type="email" />
                </div>
              </section>
            </div>

            {/* Right: Summary (desktop only sticky) */}
            <aside className="md:col-span-5 lg:col-span-4">
              <div className="hidden md:block sticky top-4">
                <div className="border rounded-md p-4 bg-white shadow-sm">
                  <h3 className="text-lg font-medium mb-3">ご注文内容</h3>
                  <div className="text-sm text-gray-700 space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">受取日時</span>
                      <span className="font-medium">
                        {dispatchDate && dispatchTime ? (
                          <DateTimeDisplay_order
                            date={dispatchDate}
                            time={dispatchTime}
                            endTime={dispatchEndTime}
                          />
                        ) : (
                          '未選択'
                        )}
                      </span>
                    </div>
                  </div>

                  <ul className="divide-y">
                    {items.length === 0 && (
                      <li className="py-3 text-gray-500 text-sm">カートに商品がありません</li>
                    )}
                    {items.map((it) => (
                      <li key={it.id} className="py-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm text-gray-900">{it.name}</p>
                          <p className="text-xs text-gray-500">× {it.quantity}</p>
                        </div>
                        <div className="text-sm text-gray-900">¥{(it.price * it.quantity).toLocaleString()}</div>
                      </li>
                    ))}
                  </ul>

                  <div className="border-t mt-3 pt-3 flex items-center justify-between text-base">
                    <span className="font-medium">合計</span>
                    <span className="font-semibold">¥{items.reduce((s, it) => s + it.price * it.quantity, 0).toLocaleString()}</span>
                  </div>

                  <button
                    onClick={handleSubmit}
                    className="mt-4 w-full py-3 bg-[#887c5d] text-white text-base rounded-md hover:bg-[#6f6550]"
                  >
                    次へ
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* スマートフォン用の固定ボタン */}
      <div className="fixed bottom-0 w-full max-w-md px-6 py-3 border-t border-gray-300 bg-white md:hidden">
        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
        >
          次へ
        </button>
      </div>

      {/* PC用のボタンはサマリー内に統合済み */}
    </>
  );
}

function InputField({
  label, value, onChange, error, placeholder, type = 'text'
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border px-4 py-2 rounded ${error ? 'border-red-500' : ''}`}
        aria-invalid={!!error}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
