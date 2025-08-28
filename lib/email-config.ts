// メール送信設定
export const emailConfig = {
  // 送信元メールアドレス
  from: {
    name: 'BAGELラクダピクニック',
    email: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  },
  
  // 返信先メールアドレス
  replyTo: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
  
  // メール送信元の形式を生成
  getFromAddress() {
    return `${this.from.name} <${this.from.email}>`;
  }
};