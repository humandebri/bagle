import { NextRequest, NextResponse } from 'next/server';
import { GET, PUT } from '../hours/route';
import { prisma } from '@/lib/prisma';

// モックの設定
jest.mock('@/lib/prisma', () => ({
  prisma: {
    business_hours: {
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

describe('/api/admin/business-calendar/hours', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('全曜日の営業時間情報を返すべき', async () => {
      const mockHours = [
        {
          id: '1',
          day_of_week: 0,
          open_time: new Date('1970-01-01T11:00:00'),
          close_time: new Date('1970-01-01T13:00:00'),
          is_closed: false,
        },
        {
          id: '2',
          day_of_week: 4,
          open_time: null,
          close_time: null,
          is_closed: true,
        },
      ];

      (prisma.business_hours.findMany as jest.Mock).mockResolvedValue(mockHours);

      const request = new NextRequest('http://localhost:3000/api/admin/business-calendar/hours');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hours).toHaveLength(2);
      expect(data.hours[0].day_of_week).toBe(0);
      expect(data.hours[0].open_time).toBe('11:00');
      expect(data.hours[1].is_closed).toBe(true);
    });
  });

  describe('PUT /hours/:dayOfWeek', () => {
    it('特定曜日の営業時間を更新できるべき', async () => {
      const mockHour = {
        id: '1',
        day_of_week: 0,
        open_time: new Date('1970-01-01T10:00:00'),
        close_time: new Date('1970-01-01T14:00:00'),
        is_closed: false,
      };

      (prisma.business_hours.upsert as jest.Mock).mockResolvedValue(mockHour);

      const request = new NextRequest('http://localhost:3000/api/admin/business-calendar/hours/0', {
        method: 'PUT',
        body: JSON.stringify({
          open_time: '10:00',
          close_time: '14:00',
          is_closed: false,
        }),
      });

      // パラメータを含むコンテキストを渡す
      const context = { params: { dayOfWeek: '0' } };
      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.day_of_week).toBe(0);
      expect(data.open_time).toBe('10:00');
      expect(data.close_time).toBe('14:00');
    });

    it('定休日として設定できるべき', async () => {
      const mockHour = {
        id: '1',
        day_of_week: 4,
        open_time: null,
        close_time: null,
        is_closed: true,
      };

      (prisma.business_hours.upsert as jest.Mock).mockResolvedValue(mockHour);

      const request = new NextRequest('http://localhost:3000/api/admin/business-calendar/hours/4', {
        method: 'PUT',
        body: JSON.stringify({
          is_closed: true,
        }),
      });

      const context = { params: { dayOfWeek: '4' } };
      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.is_closed).toBe(true);
      expect(data.open_time).toBeNull();
    });

    it('無効な曜日を拒否すべき', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/business-calendar/hours/7', {
        method: 'PUT',
        body: JSON.stringify({
          open_time: '10:00',
          close_time: '14:00',
        }),
      });

      const context = { params: { dayOfWeek: '7' } };
      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });
});