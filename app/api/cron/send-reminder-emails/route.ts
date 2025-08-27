import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const resend = new Resend(process.env.RESEND_API_KEY);

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

export async function GET() {
  try {
    // Vercel cronからのリクエストであることを確認
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 現在の日時を取得（日本時間）
    const now = new Date();
    const jstOffset = 9 * 60; // JST is UTC+9
    const jstNow = new Date(now.getTime() + (now.getTimezoneOffset() + jstOffset) * 60 * 1000);
    
    // 翌日の日付を計算
    const tomorrow = new Date(jstNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = format(tomorrow, 'yyyy-MM-dd');
    
    // 翌日の予約を取得（キャンセル済みと受取済みを除く）
    const orders = await prisma.orders.findMany({
      where: {
        dispatch_date: tomorrowDateStr,
        payment_status: {
          not: 'cancelled'
        },
        shipped: false
      },
      include: {
        profiles: true
      }
    });

    console.log(`Found ${orders.length} orders for reminder emails on ${tomorrowDateStr}`);

    // 各予約にリマインドメールを送信
    const emailPromises = orders.map(async (order) => {
      const email = order.profiles?.email;
      if (!email) {
        console.error(`No email found for order ${order.id}`);
        return null;
      }

      // itemsをパース（JSONとして保存されている）
      const items = (order.items as unknown) as OrderItem[];
      const dispatchDate = format(new Date(order.dispatch_date + 'T00:00:00+09:00'), 'yyyy年MM月dd日(E)', { locale: ja });
      const dispatchTime = formatTimeRange(order.dispatch_time || '');

      try {
        await resend.emails.send({
          from: '予約リマインド <onboarding@resend.dev>',
          to: email,
          subject: `【リマインド】明日${dispatchTime}のご予約について`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              
              <div style="background-color: #887c5d; color: white; padding: 20px; border-radius: 5px 5px 0 0; margin-bottom: 0;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold;">BAGELラクダピクニック</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px;">明日のご予約のお知らせ</p>
              </div>

              <div style="background-color: #fff8f0; padding: 20px; border: 1px solid #887c5d; border-top: none; border-radius: 0 0 5px 5px;">
                <p style="font-size: 16px; margin-bottom: 20px;">
                  ${order.profiles?.last_name || ''} ${order.profiles?.first_name || ''} 様
                </p>
                
                <p style="margin-bottom: 20px;">
                  明日のご予約について、お知らせいたします。<br>
                  お時間にお気をつけてご来店ください。
                </p>
              </div>

              <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h2 style="color: #887c5d; margin-top: 0; border-bottom: 2px solid #887c5d; padding-bottom: 10px;">■ご来店日時</h2>
                <p style="font-size: 18px; font-weight: bold; color: #333;">
                  ${dispatchDate} ${dispatchTime}
                </p>
              </div>

              <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                <h2 style="color: #887c5d; margin-top: 0; border-bottom: 2px solid #887c5d; padding-bottom: 10px;">■ご注文内容</h2>
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
                    合計金額: ¥${(order.total_price || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div style="background-color: #ffefef; border: 2px solid #ff6b6b; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                <h2 style="color: #ff6b6b; margin-top: 0; margin-bottom: 15px;">⚠️ 重要なお知らせ</h2>
                
                <div style="margin-bottom: 15px;">
                  <p style="font-weight: bold; color: #333; margin-bottom: 10px;">■お受け取りについて</p>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 5px;">ご予約のお引き取りは、<strong>並ばずにご入店</strong>ください</li>
                    <li style="margin-bottom: 5px;">その時間のご予約の方が優先になります</li>
                  </ul>
                </div>

                <div style="background-color: #fff; padding: 15px; border-radius: 3px; border-left: 4px solid #ff6b6b;">
                  <p style="color: #ff0000; font-weight: bold; margin: 0;">
                    🚫 ご予約商品のお受け取りの際の路上駐車は絶対にできません<br>
                    <span style="color: #333; font-weight: normal;">コインパーキングをご利用いただきますようお願い致します</span>
                  </p>
                </div>
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

              <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; border: 1px solid #ffc107;">
                <h3 style="color: #856404; margin-top: 0; margin-bottom: 10px;">キャンセルについて</h3>
                <p style="color: #856404; margin-bottom: 10px;">
                  当日のキャンセルはお受けできません。<br>
                  どうしても来られなくなった場合は、<strong>冷凍での後日のお引き取り</strong>をお願い致します。
                </p>
                <p style="color: #856404; font-weight: bold;">
                  その際は必ずお電話（089-904-2666）でご連絡ください。
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

        console.log(`Reminder email sent to ${email} for order ${order.id}`);
        return { success: true, orderId: order.id };
      } catch (error) {
        console.error(`Failed to send reminder email for order ${order.id}:`, error);
        return { success: false, orderId: order.id, error };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r?.success).length;
    const failCount = results.filter(r => r && !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Reminder emails sent: ${successCount} success, ${failCount} failed`,
      date: tomorrowDateStr,
      results
    });
  } catch (error) {
    console.error('Error in reminder email cron job:', error);
    return NextResponse.json(
      { error: 'Failed to send reminder emails', details: error },
      { status: 500 }
    );
  }
}

// 時間範囲のフォーマット関数
function formatTimeRange(time: string): string {
  if (!time) return '';
  
  // time が "HH:MM:SS" 形式の場合
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