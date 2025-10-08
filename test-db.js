#!/usr/bin/env node

/**
 * Quick test to verify database connection and data
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...\n');

    // Test vacancies
    const vacancies = await prisma.vacancy.findMany();
    console.log(`✅ Vacancies: ${vacancies.length} records`);
    vacancies.forEach(v => console.log(`   - ${v.job_title} (ID: ${v.id})`));

    // Test applications
    const applications = await prisma.application.findMany({
      include: { vacancy: true }
    });
    console.log(`\n✅ Applications: ${applications.length} records`);
    applications.forEach(a => console.log(`   - ${a.email} applied for ${a.job_title} (ID: ${a.id})`));

    // Test referrals
    const referrals = await prisma.referral.findMany();
    console.log(`\n✅ Referrals: ${referrals.length} records`);
    referrals.forEach(r => console.log(`   - ${r.email} for ${r.job_title} (ID: ${r.id})`));

    // Test rankings
    const rankings = await prisma.cvRanking.findMany();
    console.log(`\n✅ CV Rankings: ${rankings.length} records`);

    console.log('\n🎉 Database connection successful!');
    console.log('📊 Prisma Studio: http://localhost:5555');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();