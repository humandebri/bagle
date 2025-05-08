import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, orderDetails } = await request.json();

    const { data, error } = await resend.emails.send({
      from: '予約確認 <onboarding@resend.dev>',
      to: email,
      subject: 'ご予約が確定いたしました',
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
              ${orderDetails.items.map((item: any) => `
                <li style="margin-bottom: 10px;">
                  ${item.name} × ${item.quantity} - ¥${(item.price * item.quantity).toLocaleString()}
                </li>
              `).join('')}
            </ul>
            <div style="text-align: right; margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px;">
              <p style="margin-bottom: 5px;">小計: ¥${(orderDetails.total - 10).toLocaleString()}</p>
              <p style="margin-bottom: 5px;">袋代: ¥10</p>
              <p style="font-weight: bold;">合計金額: ¥${orderDetails.total.toLocaleString()}</p>
            </div>
          </div>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #666; margin-top: 0;">■予約キャンセルについて</h2>
            <p>キャンセル規定によりキャンセル料が発生した場合、直接キャンセル料が請求される場合があります。</p>
            
            <h3 style="color: #666; margin-top: 15px;">キャンセル規定</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin-bottom: 5px;">2日前：合計金額の0%</li>
              <li style="margin-bottom: 5px;">当日：合計金額の100%</li>
              <li style="margin-bottom: 5px;">無断：合計金額の100%</li>
            </ul>
            
            <p style="margin-top: 15px; font-weight: bold;">特記事項：</p>
            <p>前日のキャンセルはお電話ください。ご連絡がない場合は、前日キャンセルとなりキャンセル料をいただきます。</p>
          </div>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px;">
            <h2 style="color: #666; margin-top: 0;">■マイページからのキャンセル可能期限</h2>
            <p>受取日時2日前 23:59</p>
          </div>

          <div style="margin-top: 30px; padding: 20px; border-radius: 5px; background-color: #f9f9f9;">
            <h2 style="color: #666; margin-top: 0; margin-bottom: 15px;">■お受け取りについて</h2>
            <p style="margin-bottom: 15px;">ご予約のお引き取りは、並ばずにご入店ください。<br>その時間のご予約の方が優先になります。</p>
            <p>ご予約商品のお受け取りの際の路上駐車は、絶対にできません<br>コインパーキングをご利用頂きますようによろしくお願い致します</p>

            <p style="margin-bottom: 15px;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
            <p>お電話：111-222-3333</p>
          </div>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'メール送信に失敗しました' }, { status: 500 });
  }
} 