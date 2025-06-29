'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore, Product } from '@/store/cart-store';
import { ShoppingBag } from 'lucide-react';
import BagelMenu from '@/components/BagelMenu';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';
import { Bagel } from '@/components/BagelCard';

export default function OnlineShopPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const cartItems = useCartStore((s) => s.items);
  const totalQuantity = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const dispatchDate = useCartStore((s) => s.dispatchDate);
  const dispatchTime = useCartStore((s) => s.dispatchTime);

  const setSelectedProduct = useCartStore((s) => s.setSelectedProduct);

  const handleProductSelect = (bagel: Bagel) => {
    // Find the original product from the products array
    const product = products.find(p => p.id === bagel.id);
    if (product) {
      // Ensure image is null instead of empty string or undefined
      const sanitizedProduct = {
        ...product,
        image: (!product.image || product.image === '') ? null : product.image
      };
      setSelectedProduct(sanitizedProduct);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      
      // Filter only available products
      const availableProducts = data.filter((product: Product) => {
        if (!product.is_available) return false;
        
        const now = new Date();
        if (product.start_date) {
          const start = new Date(product.start_date);
          if (now < start) return false;
        }
        if (product.end_date) {
          const end = new Date(product.end_date);
          if (now > end) return false;
        }
        
        return true;
      });
      
      setProducts(availableProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const convertToBagels = (products: Product[]): Bagel[] => {
    return products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      longDescription: product.long_description,
      price: product.price,
      image: product.image && product.image !== '' ? product.image : undefined,
      tags: product.is_available ? [] : ['販売停止中'],
    }));
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-7rem)]">読み込み中...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-7rem)] text-red-500">{error}</div>;
  }

  return (
    <>
      <main className="min-h-[calc(100vh-7rem)] pb-28 md:pb-20">
        <div className="relative z-10 mx-auto mt-5 bg-white text-gray-400 p-6 rounded-sm">
          <div className="border-2 p-3 mb-6 text-center max-w-4xl mx-auto">
            {mounted && (
              <button onClick={() => router.push(`/online-shop/dispatch`)}>
                {dispatchDate && dispatchTime ? (
                  <DateTimeDisplay date={dispatchDate} time={dispatchTime} />
                ) : (
                  "日時を選択してください"
                )}
              </button>
            )}
          </div>

          <div className="flex border-b sm:border-b-0  max-w-4xl mx-auto ">
            <div className=" border-b-2 pl-4">
              <button className="font-medium text-2xl text-gray-400">BAGEL</button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <BagelMenu bagels={convertToBagels(products)} onProductSelect={handleProductSelect} />
          </div>
        </div>
      </main>

      {mounted && totalQuantity > 0 && (
        <CartFooter
          totalQuantity={totalQuantity}
          onClick={() => router.push('/online-shop/cart')}
        />
      )}
    </>
  );
}

function CartFooter({
  totalQuantity,
  onClick,
}: {
  totalQuantity: number;
  onClick: () => void;
}) {
  return (
    <div className="fixed bottom-0 w-full bg-white flex justify-center z-20 border-t border-gray-300">
      <div className="w-full max-w-md px-6 py-3">
        <button
          onClick={onClick}
          className="w-full relative py-3 bg-[#887c5d] text-gray-200 hover:bg-gray-600 text-xl flex items-center justify-center"
          aria-label="カートを見る"
        >
          カートを見る
          <div className="flex absolute right-6">
            <ShoppingBag className="h-5 w-5" />
            {totalQuantity > 0 && (
              <span className="ml-1 w-5 h-5 flex items-center justify-center">
                {totalQuantity}
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
