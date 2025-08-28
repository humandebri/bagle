'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase' // ✅ 修正ポイント：共通クライアントを使う
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import { toast } from 'sonner'
import { ChevronUp, ChevronDown } from 'lucide-react'

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

type SortColumn = 'name' | 'category' | 'price' | 'is_available'
type SortDirection = 'asc' | 'desc'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
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
      // 管理画面では全商品を表示するため all=true パラメータを追加
      const response = await fetch('/api/products?all=true')
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

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteTarget({ id, name })
    setDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/products/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '削除に失敗しました')
      }

      toast.success(data.message)
      setDeleteModalOpen(false)
      setDeleteTarget(null)
      fetchProducts()
    } catch (error) {
      console.error('削除エラー:', error)
      toast.error(error instanceof Error ? error.message : '削除に失敗しました')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkDeleteClick = () => {
    if (selectedProducts.length === 0) return
    setBulkDeleteModalOpen(true)
  }

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return

    setIsDeleting(true)
    try {
      const response = await fetch('/api/products/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds: selectedProducts }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '削除に失敗しました')
      }

      toast.success(data.message)
      setBulkDeleteModalOpen(false)
      setSelectedProducts([])
      fetchProducts()
    } catch (error) {
      console.error('一括削除エラー:', error)
      toast.error(error instanceof Error ? error.message : '削除に失敗しました')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortedProducts = [...products].sort((a, b) => {
    if (!sortColumn) return 0

    let aValue: string | number
    let bValue: string | number

    switch (sortColumn) {
      case 'name':
        aValue = a.name
        bValue = b.name
        break
      case 'category':
        aValue = a.category?.name || ''
        bValue = b.category?.name || ''
        break
      case 'price':
        aValue = a.price
        bValue = b.price
        break
      case 'is_available':
        aValue = a.is_available ? 1 : 0
        bValue = b.is_available ? 1 : 0
        break
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  if (loading) {
    return <div>Loading...</div>
  }

  const SortIndicator = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <span className="ml-1 text-gray-400">
        <ChevronUp className="w-3 h-3 -mb-1" />
        <ChevronDown className="w-3 h-3 -mt-1" />
      </span>
    }
    
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? (
          <ChevronUp className="w-4 h-4 text-gray-700" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-700" />
        )}
      </span>
    )
  }

  return (
    <div className="px-2 py-3 sm:px-6 sm:py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">商品管理</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
          {selectedProducts.length > 0 && (
            <>
              <button
                onClick={() => handleBulkToggleAvailability(false)}
                className="w-full sm:w-auto bg-white text-gray-700 px-3 sm:px-4 py-2 rounded-lg hover:bg-[#f5f2ea] border border-[#887c5d]/30 transition-colors font-medium text-sm sm:text-base"
              >
                選択商品を販売停止
              </button>
              <button
                onClick={() => handleBulkToggleAvailability(true)}
                className="w-full sm:w-auto bg-white text-gray-700 px-3 sm:px-4 py-2 rounded-lg hover:bg-[#f5f2ea] border border-[#887c5d]/30 transition-colors font-medium text-sm sm:text-base"
              >
                選択商品を販売再開
              </button>
              <button
                onClick={handleBulkDeleteClick}
                className="w-full sm:w-auto bg-red-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium text-sm sm:text-base"
              >
                選択商品を削除 ({selectedProducts.length})
              </button>
            </>
          )}
          <button
            onClick={() => router.push('/admin/products/new')}
            className="w-full sm:w-auto bg-[#887c5d] text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-[#6e634b] transition-colors font-medium text-sm sm:text-base"
          >
            新規商品追加
          </button>
        </div>
      </div>

      {/* モバイル用: 全選択チェックボックス */}
      <div className="sm:hidden mb-3 flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedProducts.length === products.length && products.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="rounded border-gray-300 text-[#887c5d] focus:ring-[#887c5d]"
          />
          <span className="text-sm font-medium">すべて選択</span>
        </label>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">並び替え:</label>
          <select
            value={sortColumn || 'name'}
            onChange={(e) => handleSort(e.target.value as SortColumn)}
            className="text-sm border border-[#887c5d]/30 rounded-lg px-2 py-1 bg-white hover:bg-[#f5f2ea] transition-colors focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20"
          >
            <option value="name">商品名</option>
            <option value="category">カテゴリー</option>
            <option value="price">価格</option>
            <option value="is_available">ステータス</option>
          </select>
        </div>
      </div>
      
      {/* モバイル用カード表示 */}
      <div className="sm:hidden space-y-3">
        {sortedProducts.map((product) => (
          <div key={product.id} className="bg-white border rounded-lg shadow-sm p-2">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-[#887c5d] focus:ring-[#887c5d]"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{product.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    ¥{product.price.toLocaleString('ja-JP')}
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  product.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {product.is_available ? '販売中' : '販売停止'}
              </span>
            </div>
            
            <div className="mb-3">
              <label className="text-xs text-gray-600">カテゴリー</label>
              <select
                value={product.category?.id || ''}
                onChange={(e) => handleCategoryChange(product.id, e.target.value)}
                className="mt-1 block w-full px-2 py-1 text-sm border border-[#887c5d]/30 rounded-lg bg-white hover:bg-[#f5f2ea] transition-colors focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20"
              >
                <option value="">カテゴリーなし</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2 pt-2 border-t">
              <button
                onClick={() => handleEdit(product.id)}
                className="flex-1 bg-[#887c5d] text-white py-1.5 rounded-lg text-xs font-medium hover:bg-[#6e634b] transition-colors"
              >
                編集
              </button>
              <button
                onClick={() => handleToggleAvailability(product.id, product.is_available)}
                className="flex-1 bg-white text-yellow-600 border border-yellow-600 py-1.5 rounded-lg text-xs font-medium hover:bg-yellow-50 transition-colors"
              >
                {product.is_available ? '販売停止' : '販売再開'}
              </button>
              <button
                onClick={() => handleDeleteClick(product.id, product.name)}
                className="flex-1 bg-white text-red-600 border border-red-600 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* PC用テーブル表示 */}
      <div className="hidden sm:block bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedProducts.length === products.length && products.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-[#887c5d] focus:ring-[#887c5d]"
                />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  商品名
                  <SortIndicator column="name" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center">
                  カテゴリー
                  <SortIndicator column="category" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center">
                  価格
                  <SortIndicator column="price" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('is_available')}
              >
                <div className="flex items-center">
                  ステータス
                  <SortIndicator column="is_available" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedProducts.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                    className="rounded border-gray-300 text-[#887c5d] focus:ring-[#887c5d]"
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
                      className="mt-1 block w-full px-3 py-2 text-sm border border-[#887c5d]/30 rounded-lg bg-white hover:bg-[#f5f2ea] transition-colors focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20"
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
                    className="text-[#887c5d] hover:text-[#6e634b] mr-4 transition-colors font-medium"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleToggleAvailability(product.id, product.is_available)}
                    className="text-yellow-600 hover:text-yellow-700 mr-4 transition-colors font-medium"
                  >
                    {product.is_available ? '販売停止' : '販売再開'}
                  </button>
                  <button
                    onClick={() => handleDeleteClick(product.id, product.name)}
                    className="text-red-600 hover:text-red-700 transition-colors font-medium"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 個別削除確認モーダル */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setDeleteTarget(null)
        }}
        onConfirm={handleDelete}
        title="商品を削除しますか？"
        message={`商品「${deleteTarget?.name || ''}」を削除します。この操作は取り消せません。`}
        isDeleting={isDeleting}
      />

      {/* 一括削除確認モーダル */}
      <DeleteConfirmModal
        isOpen={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title="選択した商品を削除しますか？"
        message={`${selectedProducts.length}件の商品を削除します。この操作は取り消せません。`}
        confirmText={`${selectedProducts.length}件を削除`}
        isDeleting={isDeleting}
      />
    </div>
  )
}
