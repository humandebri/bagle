import Image from "next/image"


export const metadata = {
  title: 'ACCESS', 
};


export default function Access() {
    return (
      <>
        <main className="relative z-10 flex-grow flex justify-center items-center">
          <div className="bg-white max-w-2xl w-full pt-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/2">
              <Image
                src="/images/Rakuda Picnic_storefront.png"
                alt="Rakuda Picnic storefront"
                width={400}
                height={4000}
                className="w-full"
              />
              </div>
              <div className="md:w-1/2">
                <h2 className="text-[#8B7355] text-xl mb-4">ADDRESS</h2>

                <p className="mb-2"> 愛媛県松山市大街道3丁目 7-3 1F</p>

                <p className="mb-1">ロープウェイ乗り場から徒歩1分</p>


                <p className="mb-1">駅　A1出口より徒歩15分</p>
                <p className="mb-1">駅）B2出口より徒歩12分</p>


                {/* <p className="mb-1">*写真は旧店舗のものです。</p> */}
              </div>
            </div>
          </div>
        </main>
        {/* Google Map埋め込み（ページ下部） */}
        <div className="w-full flex justify-center mb-4">
          <div className="max-w-2xl w-full">
            <iframe
              src="https://maps.google.com/maps?q=33.8436464,132.7715819&z=17&output=embed"
              width="100%"
              height="350"
              style={{ border: 0, borderRadius: '8px' }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Google Map"
            ></iframe>
          </div>
        </div>
      </>
    );
  }
  