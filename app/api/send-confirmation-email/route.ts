import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { emailConfig } from '@/lib/email-config';

const resend = new Resend(process.env.RESEND_API_KEY);

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderDetails {
  dispatchDate: string;
  dispatchTime: string;
  items: OrderItem[];
  total: number;
}

interface RequestBody {
  userId?: string;
  email?: string;
  orderDetails: OrderDetails;
}

export async function POST(request: Request) {
  try {
    const { userId, email: providedEmail, orderDetails }: RequestBody = await request.json();
    
    // userIdからメールアドレスを取得
    let email = providedEmail;
    if (userId && !email) {
      const { prisma } = await import('@/lib/prisma');
      const profile = await prisma.profiles.findUnique({
        where: { user_id: userId },
        select: { email: true }
      });
      email = profile?.email || undefined;
    }
    
    if (!email) {
      console.error('メールアドレスが見つかりません:', { userId, providedEmail });
      return NextResponse.json({ error: 'メールアドレスが見つかりません' }, { status: 400 });
    }
    
    console.log('送信先メールアドレス:', email);
    console.log('送信元設定:', emailConfig.getFromAddress());

    const result = await resend.emails.send({
      from: emailConfig.getFromAddress(),
      replyTo: emailConfig.replyTo,
      to: email,
      subject: '【BAGELラクダピクニック】ご予約が確定いたしました',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="margin-bottom: 30px; line-height: 1.6;">
            <p>ご予約ありがとうございます。</p>
            <p>下記内容にて、ご予約が確定いたしましたのでお知らせいたします。</p>
          </div>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #666; margin-top: 0;">■来店日時</h2>
            <p style="font-size: 16px;">${orderDetails.dispatchDate} ${orderDetails.dispatchTime}</p>
          </div>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #666; margin-top: 0;">■ご注文内容</h2>
            <ul style="list-style: none; padding: 0;">
              ${orderDetails.items.map((item: OrderItem) => `
                <li style="margin-bottom: 10px;">
                  ${item.name} × ${item.quantity} - ¥${(item.price * item.quantity).toLocaleString()}
                </li>
              `).join('')}
            </ul>
            <div style="text-align: right; margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px;">
              <p style="font-weight: bold;">合計金額: ¥${orderDetails.total.toLocaleString()}</p>
            </div>
          </div>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #666; margin-top: 0;">■キャンセルポリシー</h2>
            <p style="margin-bottom: 10px;">・キャンセルは<strong>2日前まで</strong>マイページから可能です。</p>
            <p style="margin-bottom: 10px;">・前日のキャンセルはお電話（📞089-904-2666）でご連絡ください。</p>
            <p><strong>・当日どうしても来られなくなった場合は、冷凍での後日のお引き取りをお願い致します。必ずお電話でご連絡下さい。</strong></p>
            <p style="margin-top: 15px;">
              <a href="https://rakudapicnic.vercel.app/account" style="color: #887c5d; text-decoration: underline;">
                マイページはこちら
              </a>
            </p>
          </div>

          <div style="margin-top: 30px; padding: 20px; border-radius: 5px; background-color: #f9f9f9;">
            <h2 style="color: #666; margin-top: 0; margin-bottom: 15px;">■お受け取りについて</h2>
            <p style="margin-bottom: 15px;">ご予約のお引き取りは、並ばずにご入店ください。<br>その時間のご予約の方が優先になります。</p>
            <p>ご予約商品のお受け取りの際の路上駐車は、絶対にできません<br>コインパーキングをご利用頂きますようによろしくお願い致します</p>

            <p style="margin-bottom: 15px;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
            <p>お電話：089-904-2666</p>
          </div>
        </div>
      `,
    });
    
    console.log('メール送信結果:', result);

    return NextResponse.json({ success: true, messageId: (result as { id?: string }).id });
  } catch (error) {
    console.error('メール送信エラー:', error);
    return NextResponse.json({ error: 'メール送信に失敗しました' }, { status: 500 });
  }
}