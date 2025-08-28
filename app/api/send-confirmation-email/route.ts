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
    let userEmail: string | undefined;
    if (userId) {
      // Supabaseから直接取得する方法（プロファイルテーブル経由）
      const { createServerSupabaseClient } = await import('@/lib/supabase-server');
      const supabase = await createServerSupabaseClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (profile) {
        userEmail = profile.email;
      }
    }
    
    const email = providedEmail || userEmail || 'no-email@example.com';
    
    const result = await resend.emails.send({
      from: emailConfig.getFromAddress(),
      replyTo: emailConfig.replyTo,
      to: [email], // 配列形式で送信
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
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid #ddd;">
                  <th style="text-align: left; padding: 8px 4px;">商品名</th>
                  <th style="text-align: right; padding: 8px 4px;">数量</th>
                  <th style="text-align: right; padding: 8px 4px;">金額</th>
                </tr>
              </thead>
              <tbody>
                ${orderDetails.items.map((item: OrderItem) => `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 8px 4px;">${item.name}</td>
                    <td style="text-align: right; padding: 8px 4px;">${item.quantity}</td>
                    <td style="text-align: right; padding: 8px 4px;">¥${item.price.toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr>
                  <td colspan="2" style="padding: 8px 4px; font-weight: bold;">合計</td>
                  <td style="text-align: right; padding: 8px 4px; font-weight: bold;">¥${orderDetails.total.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
            <p style="margin: 0; color: #856404;">
              <strong>※ お支払いは来店時に現金でお願いいたします</strong>
            </p>
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

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; line-height: 1.6;">
            <p>ご来店を心よりお待ちしております。</p>
            <p>
              <strong>BAGELラクダピクニック</strong><br>
              📍 愛媛県松山市道後北代1-10<br>
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

    // 送信結果の検証
    if (typedResult.error) {
      console.error('Resendエラー:', typedResult.error);
      return NextResponse.json({ 
        error: 'メール送信に失敗しました',
        details: typedResult.error
      }, { status: 500 });
    }
    
    if (!messageId) {
      return NextResponse.json({ 
        error: 'メール送信の確認ができませんでした' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      messageId: messageId,
      sentTo: email
    });
  } catch (error) {
    console.error('メール送信エラー:', error);
    return NextResponse.json({ 
      error: 'メール送信に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}