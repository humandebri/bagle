import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { emailConfig } from '@/lib/email-config';

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

    // 翌日（JST）の日付文字列を取得（サーバーTZに依存しない）
    const tomorrowDateStr = getTomorrowDateJST();
    
    // 翌日の予約を取得（キャンセル済みと受取済みを除く）
    const orders = await prisma.orders.findMany({
      where: {
        dispatch_date: tomorrowDateStr,
        OR: [
          { payment_status: null },
          { payment_status: { not: 'cancelled' } }
        ],
        shipped: false
      },
      include: {
        profiles: {
          select: { email: true, first_name: true, last_name: true }
        }
      }
    });

    console.log(`Found ${orders.length} orders for reminder emails on ${tomorrowDateStr}`);

    // 各予約にリマインドメールを送信
    const emailPromises = orders.map(async (order) => {
      // メールアドレスと顧客名を取得
      const orderData = order as typeof order & { customer_email?: string | null; customer_name?: string | null };
      const email = order.profiles?.email || orderData.customer_email;
      const customerName = order.profiles?.last_name 
        ? `${order.profiles.last_name} ${order.profiles.first_name || ''}`
        : orderData.customer_name || 'お客様';
      
      if (!email) {
        console.error(`No email found for order ${order.id}`);
        return null;
      }

      // itemsをパース（JSONとして保存されている）
      const items = (order.items as unknown) as OrderItem[];
      const dispatchDate = formatDateJST(order.dispatch_date || '');
      const dispatchTime = formatTimeRange(order.dispatch_time || '', order.dispatch_end_time || null);

      try {
        await resend.emails.send({
          from: emailConfig.getFromAddress(),
          replyTo: emailConfig.replyTo,
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
                  ${customerName} 様
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
                <h3 style="color: #856404; margin-top: 0; margin-bottom: 10px;">■キャンセルポリシー</h3>
                <p style="color: #856404; margin-bottom: 10px;">・キャンセルは<strong>2日前まで</strong>マイページから可能です。</p>
                <p style="color: #856404; margin-bottom: 10px;">・前日のキャンセルはお電話（📞089-904-2666）でご連絡ください。</p>
                <p style="color: #856404;"><strong>・当日どうしても来られなくなった場合は、冷凍での後日のお引き取りをお願い致します。必ずお電話でご連絡下さい。</strong></p>
                <p style="margin-top: 15px;">
                  <a href="https://rakudapicnic.vercel.app/account" style="color: #887c5d; text-decoration: underline;">
                    マイページはこちら
                  </a>
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
function formatTimeRange(start?: string | null, end?: string | null): string {
  if (!start) return '';
  const normalize = (value: string) => value.slice(0, 5);
  const normalizedStart = normalize(start);
  const normalizedEnd = end ? normalize(end) : null;
  if (normalizedEnd && normalizedEnd !== normalizedStart) {
    return `${normalizedStart}〜${normalizedEnd}`;
  }
  return normalizedStart;
}

// JSTの「YYYY年MM月DD日(曜)」表記に整形
function formatDateJST(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00+09:00`);
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(d);

  const y = parts.find(p => p.type === 'year')?.value || '';
  const m = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  const w = parts.find(p => p.type === 'weekday')?.value || '';
  return `${y}年${m}月${day}日(${w})`;
}

// 翌日（JST）の yyyy-MM-dd を返す
function getTomorrowDateJST(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);

  const y = Number(parts.find(p => p.type === 'year')?.value || '0');
  const m = Number(parts.find(p => p.type === 'month')?.value || '1');
  const d = Number(parts.find(p => p.type === 'day')?.value || '1');

  // UTC基準でカレンダー演算（ローカルTZの影響を避ける）
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + 1);
  const y2 = utc.getUTCFullYear();
  const m2 = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const d2 = String(utc.getUTCDate()).padStart(2, '0');
  return `${y2}-${m2}-${d2}`;
}
