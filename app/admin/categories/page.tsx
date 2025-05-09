'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useSession } from 'next-auth/react'

type Category = {
  id: string
  name: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState('')
  const router = useRouter()
  const { data: session, status } = useSession()

  const userId = (session?.user as { id: string })?.id;
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
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', userId)
        .single()

      if (profileError) {
        console.error('プロフィール取得エラー:', profileError)
        return
      }

      if (!profile?.is_admin) {
        alert('管理者権限がありません')
        return
      }

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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">カテゴリー管理</h1>
        <button
          onClick={() => router.push('/admin/products')}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          商品一覧に戻る
        </button>
      </div>

      <form onSubmit={handleAddCategory} className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="新しいカテゴリー名"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            追加
          </button>
        </div>
      </form>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {categories.map((category) => (
            <li key={category.id}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">
                  {category.name}
                </div>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-red-600 hover:text-red-900"
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
