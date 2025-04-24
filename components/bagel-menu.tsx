import Image from "next/image"

const bagels = [
  {
    id: 1,
    name: "PLAIN",
    description: "小麦粉 酵母 岩塩 麦芽水 で作られている。定番中の定番。",
    price: 350,
    image: "/images/panpkin.jpg",
    tags: ["vegan", "vegetarian"],
  },
  {
    id: 2,
    name: "SESAME",
    description: "原材料：北海道産小麦粉　種子島粗糖　シママース　天然酵母　国産かぼちゃ　カボチャの種",
    price: 370,
    image: "/images/panpkin.jpg",
    tags: ["vegan", "vegetarian"],
  },

]

export default function BagelMenu() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {bagels.map((bagel) => (
        <div key={bagel.id} className="flex border-b pb-6">
          <div className="w-2/3 pr-4">
            <h4 className="text-gray-600 font-medium mb-2">{bagel.name}</h4>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">{bagel.description}</p>
            <div className="flex space-x-1 mb-2">

            {bagel.tags.includes("vegetarian") && (
                <div className="relative group">
                  <div className="rounded-full border border-lime-500 w-6 h-6 flex items-center justify-center cursor-pointer">
                    <span className="text-xs text-lime-500">Ve</span>
                  </div>
                  <div className="absolute invisible group-hover:visible bg-lime-500 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap -top-8 left-1/2 transform -translate-x-1/2">
                    ベジタリアン
                  </div>
                </div>
              )}
              {bagel.tags.includes("vegan") && (
                <div className="relative group">
                  <div className="rounded-full border border-green-500 w-6 h-6 flex items-center justify-center cursor-pointer">
                    <span className="text-xs text-green-500">V</span>
                  </div>
                  <div className="absolute invisible group-hover:visible bg-green-500 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap -top-8 left-1/2 transform -translate-x-1/2">
                    ヴィーガン
                  </div>
                </div>
              )}
            </div>
            <p className="font-medium">¥ {bagel.price}</p>
          </div>
          <div className="w-1/3">
            <div className="relative h-24 w-24 rounded-full overflow-hidden">
              <Image src={bagel.image || "/placeholder.svg"} alt={bagel.name} fill className="object-cover" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
