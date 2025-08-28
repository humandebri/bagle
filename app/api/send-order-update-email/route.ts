import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { prisma } from '@/lib/prisma';
import { emailConfig } from '@/lib/email-config';

const resend = new Resend(process.env.RESEND_API_KEY);

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface RequestBody {
  orderId: string;
  items: OrderItem[];
  dispatchDate: string;
  dispatchTime: string;
  total: number;
}

export async function POST(request: Request) {
  try {
    const { orderId, items, dispatchDate, dispatchTime, total }: RequestBody = await request.json();
    
    // Prismaで注文情報とプロフィール情報を一括取得
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: { 
        profiles: {
          select: { email: true, first_name: true, last_name: true }
        }
      }
    });
    
    if (!order) {
      return NextResponse.json({ error: '注文情報の取得に失敗しました' }, { status: 404 });
    }
    
    // メールアドレスと顧客名を取得
    const orderData = order as typeof order & { customer_email?: string | null; customer_name?: string | null };
    const email = order.profiles?.email || orderData.customer_email;
    const customerName = order.profiles?.last_name 
      ? `${order.profiles.last_name} ${order.profiles.first_name || ''}`
      : orderData.customer_name || 'お客様';
    
    if (!email) {
      return NextResponse.json({ error: 'メールアドレスが見つかりません' }, { status: 400 });
    }
    
    // 日時のフォーマット
    const formattedDate = format(new Date(dispatchDate + 'T00:00:00+09:00'), 'yyyy年MM月dd日(E)', { locale: ja });
    const formattedTime = formatTimeRange(dispatchTime);

    const result = await resend.emails.send({
      from: emailConfig.getFromAddress(),
      replyTo: emailConfig.replyTo,
      to: email,
      subject: '【BAGELラクダピクニック】ご注文内容の変更確認',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="background-color: #887c5d; color: white; padding: 20px; border-radius: 5px 5px 0 0; margin-bottom: 0;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">BAGELラクダピクニック</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">ご注文内容変更のお知らせ</p>
          </div>

          <div style="background-color: #fff8f0; padding: 20px; border: 1px solid #887c5d; border-top: none; border-radius: 0 0 5px 5px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              ${customerName} 様
            </p>
            
            <p style="margin-bottom: 20px;">
              ご注文内容を下記の通り変更いたしました。<br>
              変更後の内容をご確認ください。
            </p>
          </div>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #887c5d; margin-top: 0; border-bottom: 2px solid #887c5d; padding-bottom: 10px;">■変更後のお受け取り日時</h2>
            <p style="font-size: 18px; font-weight: bold; color: #333;">
              ${formattedDate} ${formattedTime}
            </p>
          </div>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #887c5d; margin-top: 0; border-bottom: 2px solid #887c5d; padding-bottom: 10px;">■変更後のご注文内容</h2>
            <ul style="list-style: none; padding: 0;">
              ${items.map((item: OrderItem) => `
                <li style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 3px;">
                  <span style="font-weight: bold;">${item.name}</span> × ${item.quantity}個
                  <span style="float: right;">¥${(item.price * item.quantity).toLocaleString()}</span>
                </li>
              `).join('')}
            </ul>
            <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #887c5d;">
              <p style="font-size: 18px; font-weight: bold; color: #887c5d;">
                合計金額: ¥${total.toLocaleString()}
              </p>
            </div>
          </div>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #887c5d; margin-top: 0; border-bottom: 2px solid #887c5d; padding-bottom: 10px;">■お受け取りについて</h2>
            <p style="margin-bottom: 10px;">ご予約のお引き取りは、<strong>並ばずにご入店</strong>ください。<br>その時間のご予約の方が優先になります。</p>
            <p style="font-weight: bold;">ご予約商品のお受け取りの際の路上駐車は絶対にできません。<br>コインパーキングをご利用いただきますようお願い致します。</p>
          </div>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #887c5d; margin-top: 0; border-bottom: 2px solid #887c5d; padding-bottom: 10px;">■店舗情報</h2>
            <p style="margin-bottom: 10px;">
              <strong>住所：</strong>〒790-0004 愛媛県松山市大街道3丁目 7-3 1F<br>
              <strong>電話：</strong>089-904-2666
            </p>
            <p style="color: #666; font-size: 14px;">
              ※ロープウェイ乗り場すぐそば
            </p>
          </div>

          <div style="margin-top: 30px; padding: 20px; background-color: #f0f0f0; border-radius: 5px; text-align: center;">
            <p style="margin-bottom: 10px;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
            <p style="font-weight: bold; color: #887c5d;">
              BAGELラクダピクニック<br>
              📞 089-904-2666
            </p>
          </div>
        </div>
      `,
    });

    // Resendのレスポンス構造: { data: { id: "xxx" }, error: null }
    interface ResendResponse {
      data?: { id: string };
      id?: string;
      error?: unknown;
    }
    const typedResult = result as ResendResponse;
    const messageId = typedResult.data?.id || typedResult.id;
    
    if (typedResult.error) {
      console.error('Resendエラー:', typedResult.error);
      return NextResponse.json({ 
        error: 'メール送信に失敗しました',
        details: typedResult.error 
      }, { status: 500 });
    }
    
    if (!messageId) {
      console.error('ResendからメッセージIDが返されませんでした:', result);
      return NextResponse.json({ 
        error: 'メール送信に失敗しました',
        details: result 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      messageId: messageId 
    });
  } catch (error) {
    console.error('注文変更メール送信エラー:', error);
    return NextResponse.json({ error: 'メール送信に失敗しました' }, { status: 500 });
  }
}

// 時間範囲のフォーマット関数
function formatTimeRange(time: string): string {
  if (!time) return '';
  
  // time が "HH:MM" または "HH:MM:SS" 形式の場合
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const min = minutes === '00' ? '' : `:${minutes}`;
  
  // 12:00の場合は特別な表記
  if (hour === 12) {
    return '12:00〜15:00';
  }
  
  // その他の時間は15分枠として表示
  const endHour = min === ':45' ? hour + 1 : hour;
  const endMin = min === ':45' ? ':00' : min === ':30' ? ':45' : min === ':15' ? ':30' : ':15';
  
  return `${hour}${min}〜${endHour}${endMin}`;
}