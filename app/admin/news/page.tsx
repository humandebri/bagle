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
    return <div className="p-4 sm:p-8">読み込み中...</div>
  }

  return (
    <div className="px-2 py-3 sm:px-4 sm:py-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">お知らせ管理</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            タイトルは40文字、内容は80文字を超えるとトップページで省略されます
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#887c5d] text-white rounded-lg hover:bg-[#6e634b] transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          新規追加
        </button>
      </div>

      {/* モバイル用カード表示 */}
      <div className="sm:hidden space-y-3">
        {news.map((item) => (
          <div key={item.id} className="bg-white border rounded-lg shadow-sm p-2">
            {editingId === item.id ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600">日付</label>
                  <input
                    type="text"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-2 py-1 border border-[#887c5d]/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20"
                    placeholder="2025.01.14"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">タイトル</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className={`w-full px-2 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20 ${editForm.title.length > 40 ? 'border-red-500' : 'border-[#887c5d]/30'}`}
                  />
                  {editForm.title.length > 40 && (
                    <span className="text-xs text-red-500 mt-1 block">
                      文字数: {editForm.title.length}/40 - トップページで省略されます
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-600">内容</label>
                  <textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    className={`w-full px-2 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20 ${editForm.content.length > 80 ? 'border-red-500' : 'border-[#887c5d]/30'}`}
                    rows={3}
                  />
                  {editForm.content.length > 80 && (
                    <span className="text-xs text-red-500 mt-1 block">
                      文字数: {editForm.content.length}/80 - トップページで省略されます
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.is_published}
                      onChange={(e) => setEditForm({ ...editForm, is_published: e.target.checked })}
                      className="rounded border-gray-300 text-[#887c5d] focus:ring-[#887c5d]"
                    />
                    <span className="text-sm">公開</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(item.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors font-medium"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors font-medium"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500">{item.date}</span>
                      {item.is_published ? (
                        <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">公開中</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">非公開</span>
                      )}
                    </div>
                    <h3 className={`font-medium text-sm ${item.title.length > 40 ? 'text-red-600' : ''}`}>
                      {item.title}
                      {item.title.length > 40 && ` (${item.title.length}文字)`}
                    </h3>
                    <p className={`text-xs text-gray-600 mt-1 ${item.content.length > 80 ? 'text-red-600' : ''}`}>
                      {item.content}
                      {item.content.length > 80 && ` (${item.content.length}文字)`}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <button
                    onClick={() => togglePublish(item)}
                    className={`p-1.5 rounded-lg transition-colors ${
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 text-[#887c5d] hover:bg-[#f5f2ea] rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* PC用テーブル表示 */}
      <div className="hidden sm:block overflow-x-auto">
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
                        className="w-full p-1 border border-[#887c5d]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20"
                        placeholder="2025.01.14"
                      />
                    </td>
                    <td className="p-2">
                      <div>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className={`w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20 ${editForm.title.length > 40 ? 'border-red-500' : 'border-[#887c5d]/30'}`}
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
                          className={`w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20 ${editForm.content.length > 80 ? 'border-red-500' : 'border-[#887c5d]/30'}`}
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
                          className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors font-medium"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors font-medium"
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
                          className="p-1 text-[#887c5d] hover:bg-[#f5f2ea] rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
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