export default function OnlineShopLayout({
    children,
    modal, // 👈 @modal/bagel/[id]/page.tsx の内容がここに渡される
  }: {
    children: React.ReactNode;
    modal: React.ReactNode;
  }) {
    return (
      <div>
        {children} {/* 商品一覧 */}
        {modal}    {/* モーダル（表示されていれば） */}
      </div>
    );
  }
  