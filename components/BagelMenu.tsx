import Link from 'next/link';
import BagelCard, { Bagel } from './BagelCard';

type Props = {
  bagels: Bagel[];
  /** true = 各カードを `/bagel/[id]` へリンクさせる（デフォルト） */
  linkable?: boolean;
};

export default function BagelMenu({ bagels, linkable = true }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {bagels.map((bagel) =>
        linkable ? (
          <Link
            href={`/online-shop/bagle/${bagel.id}`}
            key={bagel.id}
          >
            <BagelCard bagel={bagel} />
          </Link>
        ) : (
          <BagelCard bagel={bagel} key={bagel.id} />
        ),
      )}
    </div>
  );
}