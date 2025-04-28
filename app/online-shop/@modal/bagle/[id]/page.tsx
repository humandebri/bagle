import { sampleBagels } from "@/lib/sampleBagels";
import BagelModal from "@/components/BagelModal";

export default function BagelModalPage({ params }: { params: { id: string } }) {
  const bagel =
    sampleBagels.find((b) => b.id.toString() === params.id) || sampleBagels[0];

  return <BagelModal bagel={bagel} />;
}