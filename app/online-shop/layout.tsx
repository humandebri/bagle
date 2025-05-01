import StripeProvider from './stripe-provider';

export default function OnlineShopLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode | null;  // 👈 ここをnull許容にする
}) {
  return (
    <>
    <StripeProvider>
      {children}
      </StripeProvider>
      {modal}
    </>
  );
}
