"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function DispatchModal() {
    const router = useRouter();
    const addToCart = useCartStore((s) => s.addToCart);
  
    // ――― 初期化（フェードイン & 背景スクロール禁止）
    useEffect(() => {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }, []);
  
    // ――― ハンドラ
    // const add   = () => {
    //   addToCart({ date: , time: , });
    //   close();
    // };
  
    // ――― JSX
    return (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center">
    
    <div className="flex-1 relative w-full h-full bg-white overflow-y-auto ">
          {/* ✕ */}
          <div>
            <h1 className="text-gray-400 text-2xl">どのように注文を受け取りますか？</h1>
          </div>
          <button
            onClick={close}
            className="absolute top-2 right-2 text-2xl text-gray-500 hover:text-black"
            aria-label="閉じる"
          >
            ✕
          </button>


          {/* 情報 */}
          <div className="p-6 pt-8">
            <h2 className="text-3xl text-gray-400 mb-1 ">受取場所</h2>
  
            
            <p className="text-xl text-gray-400 mb-6">住所</p>
            <p className="text-xl text-gray-400 mb-6">お持ち帰り時間</p>
            
  
            {/* 数量 */}
            <div className="my-8 ">
              <p className="mb-2 text-gray-400">日付</p>
              <div className="flex items-center border-2 border-gray-300 w-44 h-15">
                <Select onValueChange={(value) => console.log("選んだのは:", value)}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="味を選んでください" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="plain">プレーン</SelectItem>
                        <SelectItem value="blueberry">ブルーベリー</SelectItem>
                        <SelectItem value="sesame">セサミ</SelectItem>
                    </SelectContent>
                </Select>   
          </div>
        </div>
      </div>
    </div>
  
    {/* 固定フッター */}
    <div className="w-full max-w-md px-6 py-7 border-t border-gray-300 bg-white">
      <button
        // onClick={add}
        className="w-full py-5 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
      >
        注文に追加する
      </button>
    </div>
  </div>
    );
  }
  