'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase' // ✅ 修正ポイント：共通クライアントを使う

type Product = {
  id: string
  name: string
  description: string
  price: number
  is_available: boolean
  category: {
    id: string
    name: string
  }
}

type Category = {
  id: string
  name: string
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const router = useRouter()

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('カテゴリーの取得に失敗しました:', error)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const fetchProducts = useCallback(async () => {
    console.log('📥 fetchProducts called')
    try {
      const response = await fetch('/api/products')
      if (!response.ok) {
        throw new Error('商品データの取得に失敗しました')
      }
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error('商品データの取得に失敗しました:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleEdit = (id: string) => {
    router.push(`/admin/products/${id}`)
  }

  const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('products')
      .update({ is_available: !currentStatus })
      .eq('id', id)

    if (error) {
      console.error('Error updating product:', error)
      return
    }

    fetchProducts()
  }

  const handleCategoryChange = async (productId: string, categoryId: string) => {
    const { error } = await supabase
      .from('products')
      .update({ category_id: categoryId })
      .eq('id', productId)

    if (error) {
      console.error('カテゴリーの更新に失敗しました:', error)
      return
    }

    fetchProducts()
  }

  const handleBulkToggleAvailability = async (newStatus: boolean) => {
    if (selectedProducts.length === 0) return

    const { error } = await supabase
      .from('products')
      .update({ is_available: newStatus })
      .in('id', selectedProducts)

    if (error) {
      console.error('Error updating products:', error)
      return
    }

    setSelectedProducts([])
    fetchProducts()
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(products.map(product => product.id))
    } else {
      setSelectedProducts([])
    }
  }

  const handleSelectProduct = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, id])
    } else {
      setSelectedProducts(prev => prev.filter(productId => productId !== id))
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">商品管理</h1>
        <div className="flex gap-4">
          {selectedProducts.length > 0 && (
            <>
              <button
                onClick={() => handleBulkToggleAvailability(false)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 border border-gray-300"
              >
                選択商品を販売停止
              </button>
              <button
                onClick={() => handleBulkToggleAvailability(true)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 border border-gray-300"
              >
                選択商品を販売再開
              </button>
            </>
          )}
          <button
            onClick={() => router.push('/admin/products/new')}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 border border-gray-300"
          >
            新規商品追加
          </button>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedProducts.length === products.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">カテゴリー</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">価格</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    <select
                      value={product.category?.id || ''}
                      onChange={(e) => handleCategoryChange(product.id, e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="">カテゴリーなし</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">¥{product.price.toLocaleString('ja-JP')}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {product.is_available ? '販売中' : '販売停止中'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(product.id)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleToggleAvailability(product.id, product.is_available)}
                    className="text-red-600 hover:text-red-900"
                  >
                    {product.is_available ? '販売停止' : '販売再開'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
