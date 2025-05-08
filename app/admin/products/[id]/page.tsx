'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

type Category = {
  id: string
  name: string
}

type Tag = {
  id: string
  name: string
  label: string
  color: string
  tooltip: string
}

type Product = {
  id: string
  name: string
  description: string
  long_description: string
  price: number
  image: string
  is_available: boolean
  is_limited: boolean
  start_date: string | null
  end_date: string | null
  category_id: string
  tags: { tag: Tag }[]
}

export default function EditProductPage({
  params,
}: {
  params: { id: string }
}) {
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    // 商品データの取得
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        tags:product_tags(
          tag:tags(*)
        )
      `)
      .eq('id', params.id)
      .single()

    if (productError) {
      console.error('Error fetching product:', productError)
      return
    }

    // カテゴリー一覧の取得
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      return
    }

    // タグ一覧の取得
    const { data: tagsData, error: tagsError } = await supabase
      .from('tags')
      .select('*')
      .order('name')

    if (tagsError) {
      console.error('Error fetching tags:', tagsError)
      return
    }

    setProduct(productData)
    setCategories(categoriesData)
    setTags(tagsData)
    setLoading(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !product) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('productId', product.id)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('アップロードに失敗しました')
      }

      const data = await response.json()
      setProduct({ ...product, image: data.url })
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('画像のアップロードに失敗しました')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return

    const { error } = await supabase
      .from('products')
      .update({
        name: product.name,
        description: product.description,
        long_description: product.long_description,
        price: product.price,
        image: product.image,
        is_available: product.is_available,
        is_limited: product.is_limited,
        start_date: product.start_date,
        end_date: product.end_date,
        category_id: product.category_id,
      })
      .eq('id', product.id)

    if (error) {
      console.error('Error updating product:', error)
      return
    }

    router.push('/admin/products')
  }

  const handleAddTag = async (tagId: string) => {
    if (!product) return;

    try {
      const response = await fetch(`/api/products/${product.id}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagId }),
      });

      if (!response.ok) {
        throw new Error('タグの追加に失敗しました');
      }

      // タグを追加した商品データを再取得
      fetchData();
    } catch (error) {
      console.error('Error adding tag:', error);
      alert('タグの追加に失敗しました');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!product) return;

    try {
      const response = await fetch(`/api/products/${product.id}/tags`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagId }),
      });

      if (!response.ok) {
        throw new Error('タグの削除に失敗しました');
      }

      // タグを削除した商品データを再取得
      fetchData();
    } catch (error) {
      console.error('Error removing tag:', error);
      alert('タグの削除に失敗しました');
    }
  };

  if (loading || !product) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">商品編集</h1>

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
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            商品画像
          </label>
          <div className="mt-1 flex items-center space-x-4">
            {product.image && (
              <img
                src={product.image}
                alt={product.name}
                className="h-32 w-32 object-cover rounded"
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
            説明
          </label>
          <textarea
            value={product.description}
            onChange={(e) =>
              setProduct({ ...product, description: e.target.value })
            }
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            詳細説明
          </label>
          <textarea
            value={product.long_description || ''}
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
              setProduct({ ...product, price: parseInt(e.target.value) })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
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
                value={product.start_date || ''}
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
                value={product.end_date || ''}
                onChange={(e) =>
                  setProduct({ ...product, end_date: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            タグ
          </label>
          <div className="mt-2 space-y-4">
            <div className="flex flex-wrap gap-2">
              {product.tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-1 rounded-full text-sm"
                  style={{
                    backgroundColor: tag.color,
                    color: '#fff',
                  }}
                >
                  {tag.label}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-2 text-white hover:text-gray-200"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div>
              <select
                onChange={(e) => {
                  const tagId = e.target.value;
                  if (tagId) {
                    handleAddTag(tagId);
                    e.target.value = '';
                  }
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">タグを追加</option>
                {tags
                  .filter(
                    (tag) =>
                      !product.tags.some(({ tag: existingTag }) => existingTag.id === tag.id)
                  )
                  .map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

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
            保存
          </button>
        </div>
      </form>
    </div>
  )
} 