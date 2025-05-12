import Image from "next/image"
import Link from "next/link"


export const metadata = {
  title: 'ACCESS', 
};


export default function Access() {
    return (

      <main className="relative z-10 flex-grow flex justify-center items-center p-6">
        <div className="bg-white max-w-3xl w-full p-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/2">
              <Image
                src="/placeholder.svg?height=400&width=400"
                alt="Rakuda Picnic storefront"
                width={400}
                height={400}
                className="w-full"
              />
            </div>
            <div className="md:w-1/2">
              <h2 className="text-[#8B7355] text-xl mb-4">ADDRESS</h2>

              <p className="mb-2">東京都港区新橋 5-23-10 1F</p>

              <p className="mb-1">御成門駅（三田線）A4出口より徒歩4分</p>
              <p className="mb-1">A4出口よりエスカレーター</p>
              <p className="mb-1">A4出口よりエレベーター</p>

              <p className="mb-1">新橋駅　A1出口より徒歩15分</p>
              <p className="mb-1">虎ノ門駅（銀座線）B2出口より徒歩12分</p>
              <p className="mb-1">虎ノ門ヒルズ駅（日比谷線）A2出口より徒歩12分</p>

              <p className="mt-4 mb-2">5-23-10 SHINBASHI MINATO-KU TOKYO</p>

              <p className="mb-1">Onarimon station (Mita line )</p>
              <p className="mb-1">4min walk from Exit A4</p>
              <p className="mb-1">*写真は日曜1丁目の時のものです。</p>
            </div>
          </div>
        </div>
      </main>
    );
  }
  