'use client';
import { useStripe } from '@stripe/react-stripe-js';
import { useCartStore } from '@/store/cart-store';

export default function ReviewPage() {
  const stripe          = useStripe();
  const items           = useCartStore((s) => s.items);
  const paymentMethod   = useCartStore((s) => s.paymentMethodId);
  const dispatchDate    = useCartStore((s) => s.dispatchDate);
  const dispatchTime    = useCartStore((s) => s.dispatchTime);

  const subtotal = items.reduce((t, i) => t + i.price * i.quantity, 0);
  const bagFee   = 10;
  const total    = subtotal + bagFee;

  const pay = async () => {
    const res = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, paymentMethod }),
    });
    const { clientSecret, requiresAction } = await res.json();

    if (requiresAction && stripe) {
      const { error } = await stripe.confirmCardPayment(clientSecret);
      if (error) return alert(error.message);
    }

    window.location.href = '/online-shop/success';
  };

  return (
    <main className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl mb-6">注文確認</h1>

              {/* 受取日 */}
            
        <div className=" text-gray-700  pb-2">
          <p className="font-medium pb-2">受取日時 : {dispatchDate} {dispatchTime}</p>
        </div>

      <div className="mb-6 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm border-b pb-2">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-gray-500">
                ¥{item.price.toLocaleString()} × {item.quantity}
              </p>
            </div>
            <p className=" self-end">
              ¥{(item.price * item.quantity).toLocaleString()}
            </p>
          </div>
        ))}

        {/* 袋代 */}
        <div className="flex justify-between text-sm border-b pb-2">
          <p className="font-medium">袋代</p>
          <p className="">¥{bagFee}</p>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 mb-6 text-lg">
        <span className="">合計</span>
        <span className="">¥{total.toLocaleString()}</span>
      </div>

      <button
        onClick={pay}
        className="w-full bg-[#887c5d] text-white py-3 rounded"
      >
        支払う
      </button>
    </main>
  );
}
