#!/bin/bash

echo "営業日カレンダーの同期を開始します..."

# 1. Supabaseからスキーマを取得
echo "Step 1: Supabaseからスキーマを取得中..."
npx prisma db pull

# 2. Prismaクライアントを生成
echo "Step 2: Prismaクライアントを生成中..."
npx prisma generate

# 3. 初期データを投入
echo "Step 3: 初期データを投入中..."
npx tsx prisma/seed-business-calendar.ts

echo "営業日カレンダーの同期が完了しました！"