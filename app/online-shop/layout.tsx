export default function OnlineShopLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode | null;  // 👈 ここをnull許容にする
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
