#!/usr/bin/env node

// Quick DB sanity check for vacancies and applications
const { PrismaClient } = require('@prisma/client');

(async function main(){
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const vacanciesCount = await prisma.vacancy.count();
    const applicationsCount = await prisma.application.count();
    console.log('vacancies count:', vacanciesCount);
    console.log('applications count:', applicationsCount);

    const vacancies = await prisma.vacancy.findMany({ take: 5 });
    const applications = await prisma.application.findMany({ take: 5 });

    console.log('vacancies sample:', JSON.stringify(vacancies, null, 2));
    console.log('applications sample:', JSON.stringify(applications, null, 2));
  } catch (e) {
    console.error('DB sanity check failed:', e.message || e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
