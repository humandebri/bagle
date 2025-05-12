'use client';
import { useEffect, useState } from 'react';
import BagelMenu from '@/components/BagelMenu';
import { Bagel } from '@/components/BagelCard';
import { supabase } from '@/lib/supabase';

// export const metadata = {
//   title: 'MENU', // これが %s の部分に入ります
// };

export default function Menu() {
  const [bagels, setBagels] = useState<Bagel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBagels = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, long_description, price, image')
        .eq('is_available', true)
      if (error) {
        setError('商品の取得に失敗しました');
      } else {
        const bagels = (data as any[]).map((b) => ({
          ...b,
          longDescription: b.long_description,
        }));
        setBagels(bagels);
      }
      setLoading(false);
    };
    fetchBagels();
  }, []);

  if (loading) return <div className="p-6 text-center">読み込み中...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">メニュー</h1>
      <BagelMenu bagels={bagels} link={false} />
    </div>
  );
}
  