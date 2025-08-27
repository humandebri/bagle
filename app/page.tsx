
import BusinessCalendar from '@/components/BusinessCalendar';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, MapPin, Phone, Calendar, Instagram } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import './calendar.css';

type NewsItem = {
  id: string;
  date: string;
  title: string;
  content: string;
  is_published: boolean;
}

async function getNews(): Promise<NewsItem[]> {
  try {
    const news = await prisma.news.findMany({
      where: {
        is_published: true
      },
      orderBy: {
        date: 'desc'
      },
      take: 2
    });
    return news;
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

export default async function Home() {
  const news = await getNews();
  return (
    <div className="min-h-screen">
      {/* ヒーローセクション */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center">
        {/* 背景画像 */}
        <Image
          src="/images/IMG_1867.jpeg"
          alt="ベーグル専門店"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 "></div>
        
        {/* コンテンツ */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-4 sm:mb-6 tracking-wider whitespace-nowrap">
            BAGELラクダピクニック
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white mb-6 sm:mb-8 font-light">
            松山城ロープウェイ乗り場すぐそば
          </p>
          <p className="text-base sm:text-lg text-white/90 mb-8 sm:mb-12 max-w-2xl mx-auto">
            手作りの温もりと、素材へのこだわり。<br />
            毎日焼きたてのベーグルをお届けします。
          </p>
          <div className="flex justify-center">
            <Link
              href="/online-shop"
              className="px-6 sm:px-8 py-3 bg-[#887c5d] text-white font-semibold rounded-full hover:bg-[#6b5f48] transition duration-300"
            >
              オンライン予約はこちら
            </Link>
          </div>
        </div>
      </section>

      {/* コンセプトセクション */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-2 md:order-1">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">
                ベーグルのある暮らしを
              </h3>
              <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                <p>
                  松山城に上がるロープウェイ乗り場の近くで、毎日心を込めてベーグルを焼いています。
                </p>
                <p>
                  素材にこだわり、なるべくプランツベースな材料を使用。
                  身体にも心にも、そして地球にも優しいベーグルづくりを心がけています。
                </p>
                <p>
                  地元産の新鮮な野菜や、こだわりのピクルスを使ったベーグルサンドも人気です。
                  一つ一つ丁寧に、愛情を込めて作っています。
                </p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="relative h-32 sm:h-40 md:h-48 rounded-lg overflow-hidden">
                  <Image
                    src="/images/81929539-44B9-49E0-831E-001BD8A1ECCE.jpeg"
                    alt="焼きたてベーグル"
                    fill
                    className="object-cover hover:scale-105 transition duration-300"
                  />
                </div>
                <div className="relative h-32 sm:h-40 md:h-48 rounded-lg overflow-hidden">
                  <Image
                    src="/images/beagel_plane.jpg"
                    alt="手作りベーグル"
                    fill
                    className="object-cover hover:scale-105 transition duration-300"
                  />
                </div>
                <div className="relative h-32 sm:h-40 md:h-48 rounded-lg overflow-hidden">
                  <Image
                    src="/images/5C56F05A-C8F2-4A1B-8263-906836D633B8.jpeg"
                    alt="ベーグルの種類"
                    fill
                    className="object-cover hover:scale-105 transition duration-300"
                  />
                </div>
                <div className="relative h-32 sm:h-40 md:h-48 rounded-lg overflow-hidden">
                  <Image
                    src="/images/shop_display.jpg"
                    alt="店舗の様子"
                    fill
                    className="object-cover hover:scale-105 transition duration-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 営業情報セクション */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-4">Information</h2>
            <div className="w-24 h-1 bg-[#887c5d] mx-auto"></div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-16">
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm text-center hover:shadow-md transition duration-300">
              <Clock className="w-10 sm:w-12 h-10 sm:h-12 text-[#887c5d] mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">営業時間</h3>
              <p className="text-gray-600 font-medium text-sm sm:text-base">11:00 - 15:00</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">売り切れ次第終了</p>
            </div>
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm text-center hover:shadow-md transition duration-300">
              <Calendar className="w-10 sm:w-12 h-10 sm:h-12 text-[#887c5d] mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">営業日</h3>
              <p className="text-gray-600 font-medium text-sm sm:text-base">木・金・土・<br className="sm:hidden" />第4日曜</p>
            </div>
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm text-center hover:shadow-md transition duration-300">
              <Phone className="w-10 sm:w-12 h-10 sm:h-12 text-[#887c5d] mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">電話番号</h3>
              <p className="text-gray-600 font-medium text-sm sm:text-base">089-904-2666</p>
            </div>
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm text-center hover:shadow-md transition duration-300">
              <MapPin className="w-10 sm:w-12 h-10 sm:h-12 text-[#887c5d] mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">アクセス</h3>
              <p className="text-gray-600 font-medium text-sm sm:text-base">松山市中心部</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">ロープウェイ駅すぐ</p>
            </div>
            <a
              href="https://instagram.com/rakudapicnic"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white p-6 sm:p-8 rounded-lg shadow-sm text-center hover:shadow-md transition duration-300 block"
            >
              <Instagram className="w-10 sm:w-12 h-10 sm:h-12 text-[#E4405F] mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Instagram</h3>
              <p className="text-gray-600 font-medium text-sm sm:text-base">@rakudapicnic</p>
              <p className="text-xs sm:text-sm text-[#E4405F] mt-1">フォローする</p>
            </a>
          </div>

          {/* カレンダー */}
          <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-lg shadow-sm">
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6 text-center">営業日カレンダー</h3>
            <BusinessCalendar />
          </div>
        </div>
      </section>

      {/* お知らせセクション */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-4">News</h2>
            <div className="w-24 h-1 bg-[#887c5d] mx-auto"></div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {news.length > 0 ? (
              news.map((item) => (
                <article key={item.id} className="group cursor-pointer h-full">
                  <div className="bg-gray-50 p-8 rounded-lg hover:shadow-lg transition duration-300 h-full flex flex-col">
                    <time className="text-sm text-[#887c5d] font-medium">{item.date}</time>
                    <h3 className="text-xl font-semibold text-gray-800 mt-2 mb-3 group-hover:text-[#887c5d] transition duration-300 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed line-clamp-3 flex-grow">
                      {item.content}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              // フォールバック（ニュースがない場合）
              <>
                <article className="group cursor-pointer h-full">
                  <div className="bg-gray-50 p-8 rounded-lg hover:shadow-lg transition duration-300 h-full flex flex-col">
                    <time className="text-sm text-[#887c5d] font-medium">2025.01.14</time>
                    <h3 className="text-xl font-semibold text-gray-800 mt-2 mb-3 group-hover:text-[#887c5d] transition duration-300 line-clamp-2">
                      新商品「抹茶ベーグル」販売開始
                    </h3>
                    <p className="text-gray-600 leading-relaxed line-clamp-3 flex-grow">
                      京都宇治産の抹茶を使用した、香り高い和風ベーグルが新登場です。
                    </p>
                  </div>
                </article>
                
                <article className="group cursor-pointer h-full">
                  <div className="bg-gray-50 p-8 rounded-lg hover:shadow-lg transition duration-300 h-full flex flex-col">
                    <time className="text-sm text-[#887c5d] font-medium">2025.01.10</time>
                    <h3 className="text-xl font-semibold text-gray-800 mt-2 mb-3 group-hover:text-[#887c5d] transition duration-300 line-clamp-2">
                      オンライン予約システム開始
                    </h3>
                    <p className="text-gray-600 leading-relaxed line-clamp-3 flex-grow">
                      お待たせしました！オンラインでの事前予約が可能になりました。
                    </p>
                  </div>
                </article>
              </>
            )}
          </div>
          
          <div className="text-center mt-12">
            <Link
              href="/news"
              className="inline-flex items-center text-[#887c5d] font-medium hover:text-[#6b5f48] transition duration-300"
            >
              すべてのお知らせを見る
              <span className="ml-2">→</span>
            </Link>
          </div>
        </div>
      </section>
      
      {/* フッターCTA
      <section className="py-16 px-4 bg-[#887c5d]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            焼きたてベーグルをご自宅で
          </h2>
          <p className="text-lg text-white/90 mb-8">
            ベーグルのご来店予約が出来ます
          </p>
          <Link
            href="/online-shop"
            className="inline-block px-8 py-3 bg-white text-[#887c5d] font-semibold rounded-full hover:bg-gray-100 transition duration-300"
          >
            今すぐ予約する
          </Link>
        </div>
      </section> */}
    </div>
  );
}
