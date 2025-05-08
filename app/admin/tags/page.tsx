'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

type Tag = {
  id: string
  name: string
  label: string
  color: string
  tooltip: string
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [newTag, setNewTag] = useState({
    name: '',
    label: '',
    color: '#000000',
    tooltip: '',
  })
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching tags:', error)
      return
    }

    setTags(data || [])
    setLoading(false)
  }

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTag.name.trim() || !newTag.label.trim()) return

    const { error } = await supabase.from('tags').insert([
      {
        name: newTag.name.trim(),
        label: newTag.label.trim(),
        color: newTag.color,
        tooltip: newTag.tooltip.trim(),
      },
    ])

    if (error) {
      console.error('Error adding tag:', error)
      alert('タグの追加に失敗しました')
      return
    }

    setNewTag({
      name: '',
      label: '',
      color: '#000000',
      tooltip: '',
    })
    fetchTags()
  }

  const handleDeleteTag = async (id: string) => {
    if (!confirm('このタグを削除してもよろしいですか？')) return

    const { error } = await supabase.from('tags').delete().eq('id', id)

    if (error) {
      console.error('Error deleting tag:', error)
      alert('タグの削除に失敗しました')
      return
    }

    fetchTags()
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">タグ管理</h1>
        <button
          onClick={() => router.push('/admin/products')}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          商品一覧に戻る
        </button>
      </div>

      <form onSubmit={handleAddTag} className="mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              タグ名
            </label>
            <input
              type="text"
              value={newTag.name}
              onChange={(e) =>
                setNewTag({ ...newTag, name: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              表示名
            </label>
            <input
              type="text"
              value={newTag.label}
              onChange={(e) =>
                setNewTag({ ...newTag, label: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              色
            </label>
            <input
              type="color"
              value={newTag.color}
              onChange={(e) =>
                setNewTag({ ...newTag, color: e.target.value })
              }
              className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              ツールチップ
            </label>
            <input
              type="text"
              value={newTag.tooltip}
              onChange={(e) =>
                setNewTag({ ...newTag, tooltip: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="flex justify-end">
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
          {tags.map((tag) => (
            <li key={tag.id}>
              <div className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span
                      className="inline-block w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {tag.label}
                      </div>
                      <div className="text-sm text-gray-500">{tag.name}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    削除
                  </button>
                </div>
                {tag.tooltip && (
                  <div className="mt-2 text-sm text-gray-500">
                    {tag.tooltip}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
} 