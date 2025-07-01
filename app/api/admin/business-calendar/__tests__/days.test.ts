import { NextRequest } from 'next/server';
import { GET, POST } from '../days/route';
import { prisma } from '@/lib/prisma';

// モックの設定
jest.mock('@/lib/prisma', () => ({
  prisma: {
    business_days: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: { email: 'admin@test.com' },
  }),
}));

describe('/api/admin/business-calendar/days', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('指定期間の営業日情報を返すべき', async () => {
      const mockDays = [
        {
          id: '1',
          date: new Date('2025-01-14'),
          is_open: true,
          is_special: false,
          notes: null,
        },
        {
          id: '2',
          date: new Date('2025-01-15'),
          is_open: false,
          is_special: false,
          notes: '臨時休業',
        },
      ];

      (prisma.business_days.findMany as jest.Mock).mockResolvedValue(mockDays);

      const url = new URL('http://localhost:3000/api/admin/business-calendar/days?start=2025-01-14&end=2025-01-15');
      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.days).toHaveLength(2);
      expect(data.days[0].date).toBe('2025-01-14');
      expect(data.days[0].is_open).toBe(true);
    });

    it('開始日と終了日が必須であるべき', async () => {
      const url = new URL('http://localhost:3000/api/admin/business-calendar/days');
      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST', () => {
    it('営業日情報を作成・更新できるべき', async () => {
      const mockDay = {
        id: '1',
        date: new Date('2025-01-14'),
        is_open: false,
        is_special: false,
        notes: '機器メンテナンス',
      };

      (prisma.business_days.upsert as jest.Mock).mockResolvedValue(mockDay);

      const request = new NextRequest('http://localhost:3000/api/admin/business-calendar/days', {
        method: 'POST',
        body: JSON.stringify({
          date: '2025-01-14',
          is_open: false,
          is_special: false,
          notes: '機器メンテナンス',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.date).toBe('2025-01-14');
      expect(data.is_open).toBe(false);
      expect(data.notes).toBe('機器メンテナンス');
    });

    it('日付が必須であるべき', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/business-calendar/days', {
        method: 'POST',
        body: JSON.stringify({
          is_open: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });
});