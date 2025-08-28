import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProfile() {
  const userId = process.argv[2] || '105297700299546604044';
  
  console.log(`\n=== Checking profile for user_id: ${userId} ===\n`);
  
  try {
    // profilesテーブルを検索
    const profile = await prisma.profiles.findUnique({
      where: {
        user_id: userId
      }
    });
    
    if (profile) {
      console.log('✅ Profile found:');
      console.log(JSON.stringify(profile, null, 2));
      
      if (!profile.email) {
        console.log('\n❌ Email field is empty!');
      } else {
        console.log(`\n✅ Email: ${profile.email}`);
      }
    } else {
      console.log('❌ No profile found with this user_id');
      
      // 似たようなuser_idを探してみる
      const similarProfiles = await prisma.profiles.findMany({
        where: {
          OR: [
            { user_id: { contains: userId.substring(0, 10) } },
            { email: { contains: '@' } }
          ]
        },
        take: 5
      });
      
      if (similarProfiles.length > 0) {
        console.log('\n📋 Similar profiles found:');
        similarProfiles.forEach(p => {
          console.log(`  - user_id: ${p.user_id}, email: ${p.email || 'NULL'}`);
        });
      }
    }
    
    // このuser_idの注文を確認
    const orders = await prisma.orders.findMany({
      where: {
        user_id: userId
      },
      select: {
        id: true,
        dispatch_date: true,
        dispatch_time: true,
        created_at: true
      },
      take: 5
    });
    
    if (orders.length > 0) {
      console.log(`\n📦 Orders found for this user_id: ${orders.length}`);
      orders.forEach(o => {
        console.log(`  - Order ${o.id}: ${o.dispatch_date} ${o.dispatch_time}`);
      });
    } else {
      console.log('\n📦 No orders found for this user_id');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProfile();