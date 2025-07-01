'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Category = {
  id: string
  name: string
}

export default function NewProductPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const [product, setProduct] = useState({
    name: '',
    description: '',
    long_description: '',
    price: 0,
    image: '',
    is_available: true,
    is_limited: false,
    start_date: '',
    end_date: '',
    category_id: '',
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchData = useCallback(async () => {
    // カテゴリー一覧の取得
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      return
    }

    setCategories(categoriesData)
    setLoading(false)

    // デフォルトカテゴリーを設定
    if (categoriesData.length > 0) {
      setProduct((prev) => ({
        ...prev,
        category_id: categoriesData[0].id,
      }))
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    const formData = new FormData();
    formData.append('file', file);
  
    try {
      const response = await fetch('/api/upload-new', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
  
      if (!response.ok) {
        throw new Error('アップロードに失敗しました');
      }
  
      const data = await response.json();
      setProduct({ ...product, image: data.url });
  
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('画像のアップロードに失敗しました');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { error } = await supabase.from('products').insert([
      {
        name: product.name,
        description: product.description,
        long_description: product.long_description,
        price: product.price,
        image: product.image,
        is_available: product.is_available,
        is_limited: product.is_limited,
        start_date: product.start_date || null,
        end_date: product.end_date || null,
        category_id: product.category_id,
      },
    ])

    if (error) {
      console.error('Error creating product:', error)
      return
    }

    router.push('/admin/products')
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">新規商品追加</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            商品名
          </label>
          <input
            type="text"
            value={product.name}
            onChange={(e) =>
              setProduct({ ...product, name: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            説明
          </label>
          <textarea
            value={product.description}
            onChange={(e) =>
              setProduct({ ...product, description: e.target.value })
            }
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            詳細説明
          </label>
          <textarea
            value={product.long_description}
            onChange={(e) =>
              setProduct({ ...product, long_description: e.target.value })
            }
            rows={5}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            価格
          </label>
          <input
            type="number"
            value={product.price}
            onChange={(e) =>
              setProduct({ ...product, price: parseInt(e.target.value) || 0 })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            商品画像
          </label>
          <div className="mt-1 flex items-center space-x-4">
            {product.image && (
              <Image
                src={product.image}
                alt={product.name || '商品画像'}
                width={128}
                height={128}
                className="object-cover rounded"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-[#887c5d] file:text-white
                hover:file:bg-gray-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            カテゴリー
          </label>
          <select
            value={product.category_id}
            onChange={(e) =>
              setProduct({ ...product, category_id: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={product.is_available}
            onChange={(e) =>
              setProduct({ ...product, is_available: e.target.checked })
            }
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label className="ml-2 block text-sm text-gray-900">
            販売中
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={product.is_limited}
            onChange={(e) =>
              setProduct({ ...product, is_limited: e.target.checked })
            }
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label className="ml-2 block text-sm text-gray-900">
            季節限定商品
          </label>
        </div>

        {product.is_limited && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                開始日
              </label>
              <input
                type="date"
                value={product.start_date}
                onChange={(e) =>
                  setProduct({ ...product, start_date: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                終了日
              </label>
              <input
                type="date"
                value={product.end_date}
                onChange={(e) =>
                  setProduct({ ...product, end_date: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </>
        )}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push('/admin/products')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            作成
          </button>
        </div>
      </form>
    </div>
  )
} 