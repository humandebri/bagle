import { ShoppingBag } from "lucide-react"
import BagelMenu from "@/components/bagel-menu"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#1a1a1a] text-white">
      <div
        className="relative min-h-screen bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/bagel-background.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-black/50"></div>


        <div className="relative z-10 max-w-4xl mx-auto mt-12 bg-white text-black p-6 rounded-sm">
          <div className="bg-gray-100 p-3 mb-6 text-center">
            <p className="text-sm">お持ち帰り、できるだけ早く（明日） 変更</p>
          </div>

          <div className="flex border-b mb-8">
            <div className="w-1/2 text-center pb-2">
              <button className="font-medium text-gray-600">MENU</button>
            </div>
            <div className="w-1/2 text-center pb-2 border-b-2 border-gray-800">
              <button className="font-medium">BAGEL</button>
            </div>
            <div className="ml-auto">
              <button className="flex items-center">
                <ShoppingBag className="h-5 w-5 mr-1" />
                <span>0</span>
              </button>
            </div>
          </div>

          <h2 className="text-2xl text-gray-600 mb-4">MENU</h2>
          <h3 className="text-xl text-gray-600 mb-6">BAGEL</h3>

          <BagelMenu />
        </div>
      </div>
    </main>
  )
}
