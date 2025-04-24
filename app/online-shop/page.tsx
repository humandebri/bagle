import { ShoppingBag } from "lucide-react"
import BagelMenu from "@/components/BagelMenu"
import { sampleBagels } from "@/lib/sampleBagels";

export const metadata = {
  title: 'SHOP', 
};

export default function Home() {
  return (
    <main className="min-h-screen">
        <div className="relative z-10 mx-auto mt-12 bg-white text-black p-6 rounded-sm">
          <div className="bg-gray-100 p-3 mb-6 text-center">
            <p className="text-sm">お持ち帰り、できるだけ早く（明日） 変更</p>
          </div>

          <div className="flex border-b mb-8">
            <div className="w-1/2 text-center pb-2 border-b-2">
              <button className="font-medium">BAGEL</button>
            </div>
            <div className="ml-auto">
              <button className="flex items-center">
                <ShoppingBag className="h-5 w-5 mr-1" />
                <span>
                  0
                </span>
              </button>
            </div>
          </div>

          <BagelMenu bagels={sampleBagels} />
        </div>
    </main>
  )
}
