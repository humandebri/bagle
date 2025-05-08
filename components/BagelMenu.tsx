"use client";

import { useState } from 'react';
import { useCartStore } from '@/store/cart-store';
import { Plus, Minus } from 'lucide-react';
import Link from "next/link";
import BagelCard, { Bagel } from "./BagelCard";

type Product = {
  id: string;
  name: string;
  description: string;
  long_description: string;
  price: number;
  image: string;
  is_available: boolean;
  is_limited: boolean;
  start_date: string | null;
  end_date: string | null;
  category: {
    name: string;
  };
  tags: {
    tag: {
      name: string;
      label: string;
      color: string;
      tooltip: string;
    };
  }[];
};

type Props = {
  products: Product[];
};

export default function BagelMenu({ products }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const addToCart = useCartStore((s) => s.addItem);

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    addToCart({
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      quantity,
    });

    setSelectedProduct(null);
    setQuantity(1);
  };

  return (
    <div className="space-y-8">
      {products.map((product) => (
        <div key={product.id} className="border-b pb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {product.name}
              </h3>
              <p className="text-gray-600 mb-4">{product.description}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {product.tags.map(({ tag }) => (
                  <span
                    key={tag.name}
                    className="px-2 py-1 text-xs rounded-full"
                    style={{
                      backgroundColor: tag.color,
                      color: '#fff',
                    }}
                    title={tag.tooltip}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
              <p className="text-gray-900 font-medium">¥{product.price}</p>
            </div>
            <button
              onClick={() => setSelectedProduct(product)}
              className="ml-4 px-4 py-2 bg-[#887c5d] text-white rounded hover:bg-gray-600"
            >
              カートに追加
            </button>
          </div>
        </div>
      ))}

      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">{selectedProduct.name}</h2>
            <p className="text-gray-600 mb-4">
              {selectedProduct.long_description}
            </p>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 border rounded-l"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 py-2 border-t border-b">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 border rounded-r"
        >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-lg font-medium">
                ¥{selectedProduct.price * quantity}
              </p>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 border rounded"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddToCart}
                className="px-4 py-2 bg-[#887c5d] text-white rounded hover:bg-gray-600"
              >
                カートに追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
