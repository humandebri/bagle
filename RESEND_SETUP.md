# Resend メール設定ガイド

## rakudapicnic.comドメインからメールを送信するための設定手順

### 1. Resendダッシュボードでドメインを追加

1. [Resend Dashboard](https://resend.com/dashboard) にログイン
2. 「Domains」セクションへ移動
3. 「Add Domain」をクリック
4. `rakudapicnic.com` を入力して追加

### 2. DNS設定（重要）

Resendがドメインを検証するため、以下のDNSレコードを追加する必要があります：

#### SPFレコード
```
Type: TXT
Name: @
Value: v=spf1 include:amazonses.com ~all
```

#### DKIMレコード（Resendが提供する値を使用）
```
Type: TXT  
Name: resend._domainkey
Value: [Resendダッシュボードに表示される値]
```

#### DMARCレコード（オプション、推奨）
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@rakudapicnic.com
```

### 3. ドメイン検証

DNS設定後、Resendダッシュボードで「Verify DNS Records」をクリック。
検証には最大48時間かかる場合があります（通常は数分〜数時間）。

### 4. 環境変数の設定

`.env.local`に以下を追加（オプション）：

```env
# カスタムドメインを使用する場合
RESEND_FROM_EMAIL=noreply@rakudapicnic.com
RESEND_REPLY_TO=info@rakudapicnic.com
```

### 5. 送信テスト

ドメイン検証完了後、以下のコマンドでテスト：

```bash
# リマインドメールのテスト
CRON_SECRET="[your-cron-secret]" node test-send-reminder.js
```

## トラブルシューティング

### エラー: "Domain not verified"
- DNS設定が正しく反映されているか確認
- `nslookup -type=TXT rakudapicnic.com` でTXTレコードを確認

### エラー: "From address not allowed"  
- ドメインがResendで検証済みか確認
- 送信元メールアドレスが正しいドメインか確認

## 現在の設定

現在は以下の設定でメールが送信されます：

- **送信元**: `BAGELラクダピクニック <noreply@rakudapicnic.com>`
- **返信先**: `info@rakudapicnic.com`

ドメイン検証が完了するまでは、Resendのテストドメイン（`onboarding@resend.dev`）を使用することもできます。

## 注意事項

⚠️ **重要**: `rakudapicnic.com`からメールを送信するには、必ずDNS設定とドメイン検証が必要です。これらの設定なしでは、メール送信がエラーになります。