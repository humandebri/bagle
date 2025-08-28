'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuthSession } from '@/lib/auth-compat'

type Category = {
  id: string
  name: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState('')
  const router = useRouter()
  const { data: session, status } = useAuthSession()

  const userId = session?.user?.id;
  // 未ログインならログイン画面に飛ばす
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const fetchCategories = useCallback(async () => {
    if (!userId) {
      console.log('ユーザーが認証されていません')
      return
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching categories:', error)
      return
    }

    setCategories(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (userId) {
      fetchCategories()
    }
  }, [fetchCategories, userId])

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim() || !userId) return

    try {
      // 管理者権限チェックはlayout.tsxで既に実施済み
      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName.trim() }])
        .select()

      if (error) {
        alert(`カテゴリーの追加に失敗しました: ${error.message}`)
        return
      }

      setNewCategoryName('')
      fetchCategories()
    } catch (err) {
      console.error('予期せぬエラー:', err)
      alert('エラーが発生しました')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('このカテゴリーを削除しますか？')) return

    const { error } = await supabase.from('categories').delete().eq('id', id)

    if (error) {
      alert('カテゴリーの削除に失敗しました')
      return
    }

    fetchCategories()
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="px-2 py-3 sm:px-6 sm:py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">カテゴリー管理</h1>
        <button
          onClick={() => router.push('/admin/products')}
          className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-[#887c5d]/30 rounded-lg text-xs sm:text-sm font-medium text-gray-700 hover:bg-[#f5f2ea] transition-colors"
        >
          商品一覧に戻る
        </button>
      </div>

      <form onSubmit={handleAddCategory} className="mb-4 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="新しいカテゴリー名"
            className="flex-1 px-3 py-2 rounded-lg border border-[#887c5d]/30 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20 text-sm"
          />
          <button
            type="submit"
            className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-transparent rounded-lg shadow-sm text-xs sm:text-sm font-medium text-white bg-[#887c5d] hover:bg-[#6e634b] transition-colors"
          >
            追加
          </button>
        </div>
      </form>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {categories.map((category) => (
            <li key={category.id}>
              <div className="px-2 sm:px-4 py-2 sm:py-4 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">
                  {category.name}
                </div>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-red-600 hover:text-red-700 transition-colors font-medium text-xs sm:text-sm px-2 py-1 border border-red-600 rounded-lg hover:bg-red-50"
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
