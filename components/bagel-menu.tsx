import Image from "next/image"

const bagels = [
  {
    id: 1,
    name: "PLAIN",
    description: "北海道の小麦粉 酵母 岩塩 麦芽水 で作られている。マルイチベーグルの定番中の定番。",
    price: 350,
    image: "/images/plain-bagel.jpg",
    tags: ["vegan", "vegetarian"],
  },
  {
    id: 2,
    name: "SESAME",
    description: "プレーンベーグルの表面に美味しい胡麻が付いている。Flour from Hokkaido, yeast, salt, malt water.",
    price: 370,
    image: "/images/sesame-bagel.jpg",
    tags: ["vegan", "vegetarian"],
  },
  {
    id: 3,
    name: "POPPY",
    description: "プレーンベーグルの表面に美味しいポピーシード（芥子の実）が付いている。",
    price: 370,
    image: "/images/poppy-bagel.jpg",
    tags: ["vegan", "vegetarian"],
  },
  {
    id: 4,
    name: "ONION",
    description:
      "プレーンベーグルの表面に美味しい乾燥した玉ねぎが付いている。Flour from Hokkaido, yeast, salt, malt water.",
    price: 370,
    image: "/images/onion-bagel.jpg",
    tags: ["vegan", "vegetarian"],
  },
  {
    id: 5,
    name: "EVERYTHING",
    description: "プレーンベーグルの表面に美味しい胡麻、ポピーシード、玉ねぎ、にんにく、塩が付いている。",
    price: 370,
    image: "/images/everything-bagel.jpg",
    tags: ["vegan", "vegetarian"],
  },
  {
    id: 6,
    name: "ROCK SALT",
    description:
      "プレーンベーグルの上に美味しいシチリアの天然岩塩が付いている。Flour from Hokkaido, yeast, salt, malt water.",
    price: 370,
    image: "/images/rock-salt-bagel.jpg",
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
              {bagel.tags.includes("vegan") && (
                <div className="rounded-full border border-green-500 w-6 h-6 flex items-center justify-center">
                  <span className="text-xs text-green-500">Ve</span>
                </div>
              )}
              {bagel.tags.includes("vegetarian") && (
                <div className="rounded-full border border-green-500 w-6 h-6 flex items-center justify-center">
                  <span className="text-xs text-green-500">V</span>
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
