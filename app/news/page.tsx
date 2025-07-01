import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type NewsItem = {
  id: string;
  date: string;
  title: string;
  content: string;
  is_published: boolean;
}

async function getAllNews(): Promise<NewsItem[]> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/news`, {
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Failed to fetch news');
    return await response.json();
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

export default async function NewsPage() {
  const news = await getAllNews();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <section className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="text-sm">トップページに戻る</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">お知らせ</h1>
        </div>
      </section>

      {/* ニュース一覧 */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {news.length > 0 ? (
            <div className="space-y-6">
              {news.map((item) => (
                <article key={item.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition duration-300">
                  <div className="p-6 md:p-8">
                    <time className="text-sm text-[#887c5d] font-medium">{item.date}</time>
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mt-2 mb-3">
                      {item.title}
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                      {item.content}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">現在、お知らせはありません。</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}