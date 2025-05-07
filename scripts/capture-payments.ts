import { config } from 'dotenv';
import { resolve } from 'path';

// 環境変数の読み込み
config({ path: resolve(__dirname, '../.env.local') });

const CRON_SECRET = process.env.CRON_SECRET;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function capturePayments() {
  try {
    const response = await fetch(`${API_URL}/api/cron/capture-payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    });

    const data = await response.json();
    console.log('決済処理結果:', data);
  } catch (error) {
    console.error('決済処理エラー:', error);
    process.exit(1);
  }
}

capturePayments(); 