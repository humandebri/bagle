'use client'

import { useEffect, useState, useCallback } from 'react'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'

type News = {
  id: string
  date: string
  title: string
  content: string
  is_published: boolean
  created_at: string
}

export default function AdminNewsPage() {
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ date: '', title: '', content: '', is_published: true })

  const fetchNews = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/news', { 
        cache: 'no-store',
        credentials: 'include' 
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API Error Response:', errorData)
        throw new Error(errorData.error || 'Failed to fetch news')
      }
      
      const data = await response.json()
      setNews(data)
    } catch (error) {
      console.error('ニュースの取得に失敗しました:', error)
      toast.error(`ニュースの取得に失敗しました: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  const handleDelete = async (id: string, title: string) => {
    setDeleteTarget({ id, title })
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/news/${deleteTarget.id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('削除に失敗しました')
      
      toast.success('ニュースを削除しました')
      fetchNews()
    } catch (error) {
      console.error('削除エラー:', error)
      toast.error('削除に失敗しました')
    } finally {
      setIsDeleting(false)
      setDeleteModalOpen(false)
      setDeleteTarget(null)
    }
  }

  const handleEdit = (item: News) => {
    setEditingId(item.id)
    setEditForm({
      date: item.date,
      title: item.title,
      content: item.content,
      is_published: item.is_published
    })
  }

  const handleSave = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/news/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      
      if (!response.ok) throw new Error('更新に失敗しました')
      
      toast.success('ニュースを更新しました')
      setEditingId(null)
      fetchNews()
    } catch (error) {
      console.error('更新エラー:', error)
      toast.error('更新に失敗しました')
    }
  }

  const togglePublish = async (item: News) => {
    try {
      const response = await fetch(`/api/admin/news/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          is_published: !item.is_published
        })
      })
      
      if (!response.ok) throw new Error('更新に失敗しました')
      
      toast.success(item.is_published ? 'ニュースを非公開にしました' : 'ニュースを公開しました')
      fetchNews()
    } catch (error) {
      console.error('公開状態の更新エラー:', error)
      toast.error('公開状態の更新に失敗しました')
    }
  }

  const handleAdd = async () => {
    // 今日の日付をデフォルトにして新規作成
    const today = new Date().toLocaleDateString('ja-JP').replace(/\//g, '.')
    const newNews = {
      date: today,
      title: '新しいお知らせ',
      content: '内容を入力',
      is_published: false
    }

    try {
      const response = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNews)
      })
      
      if (!response.ok) throw new Error('作成に失敗しました')
      
      toast.success('ニュースを作成しました')
      fetchNews()
    } catch (error) {
      console.error('作成エラー:', error)
      toast.error('作成に失敗しました')
    }
  }

  if (loading) {
    return <div className="p-8">読み込み中...</div>
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">お知らせ管理</h1>
          <p className="text-sm text-gray-600 mt-1">
            タイトルは40文字、内容は80文字を超えるとトップページで省略されます
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          新規追加
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">日付</th>
              <th className="text-left p-2">タイトル</th>
              <th className="text-left p-2">内容</th>
              <th className="text-center p-2">公開</th>
              <th className="text-center p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {news.map((item) => (
              <tr key={item.id} className="border-b">
                {editingId === item.id ? (
                  <>
                    <td className="p-2">
                      <input
                        type="text"
                        value={editForm.date}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        className="w-full p-1 border rounded"
                        placeholder="2025.01.14"
                      />
                    </td>
                    <td className="p-2">
                      <div>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className={`w-full p-1 border rounded ${editForm.title.length > 40 ? 'border-red-500' : ''}`}
                        />
                        {editForm.title.length > 40 && (
                          <span className="text-xs text-red-500 mt-1 block">
                            文字数: {editForm.title.length}/40 - トップページで省略されます
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div>
                        <textarea
                          value={editForm.content}
                          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                          className={`w-full p-1 border rounded ${editForm.content.length > 80 ? 'border-red-500' : ''}`}
                          rows={2}
                        />
                        {editForm.content.length > 80 && (
                          <span className="text-xs text-red-500 mt-1 block">
                            文字数: {editForm.content.length}/80 - トップページで省略されます
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={editForm.is_published}
                        onChange={(e) => setEditForm({ ...editForm, is_published: e.target.checked })}
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleSave(item.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                        >
                          キャンセル
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2">{item.date}</td>
                    <td className="p-2">
                      <span className={item.title.length > 40 ? 'text-red-600' : ''}>
                        {item.title}
                        {item.title.length > 40 && ` (${item.title.length}文字)`}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className={`max-w-xs truncate ${item.content.length > 80 ? 'text-red-600' : ''}`}>
                        {item.content}
                        {item.content.length > 80 && ` (${item.content.length}文字)`}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => togglePublish(item)}
                        className={`p-2 rounded-lg transition-colors ${
                          item.is_published 
                            ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={item.is_published ? '非公開にする' : '公開する'}
                      >
                        {item.is_published ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="ニュースを削除"
        message={`「${deleteTarget?.title || ''}」を削除してもよろしいですか？`}
        isDeleting={isDeleting}
      />
    </div>
  )
}