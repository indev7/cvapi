#!/usr/bin/env node

/**
 * Seed Script - Add sample data to the database
 * Run: node seed.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample vacancies
  const vacancies = [
    {
      job_title: 'Software Engineer-Java',
      url: 'https://intervest.lk/careers/post/cG9zdDoyODk=/software-engineer-java',
      description: 'We are looking for a skilled Java developer with experience in Spring framework, microservices, and REST APIs. The ideal candidate should have strong problem-solving skills and experience with agile development.',
      status: 'active'
    },
    {
      job_title: 'Scrum Master',
      url: 'https://intervest.lk/careers/post/cG9zdDoyODA=/scrum-master',
      description: 'Experienced Scrum Master needed to lead agile development teams. Should have Scrum certification and experience with Jira, Confluence, and agile methodologies.',
      status: 'active'
    },
    {
      job_title: 'Senior Quality Assurance Engineer - Manual',
      url: 'https://intervest.lk/careers/post/cG9zdDoyODM=/senior-quality-assurance-engineer-manual',
      description: 'Senior QA Engineer with expertise in manual testing, test case design, and defect management. Experience with test management tools and SDLC processes required.',
      status: 'active'
    },
    {
      job_title: 'Senior Software Engineer-React',
      url: 'https://intervest.lk/careers/post/cG9zdDoyODc=/senior-software-engineer-react',
      description: 'Senior React developer with expertise in modern JavaScript, TypeScript, Redux, and Next.js. Experience with testing frameworks and CI/CD pipelines preferred.',
      status: 'active'
    },
    {
      job_title: 'Senior Data Analyst',
      url: 'https://intervest.lk/careers/post/cG9zdDoyNjM=/senior-data-analyst',
      description: 'Data analyst with experience in SQL, Python, data visualization tools, and statistical analysis. Should have experience with business intelligence and reporting.',
      status: 'active'
    }
  ];

  console.log('Creating vacancies...');
  for (const vacancy of vacancies) {
    // Check if vacancy already exists
    const existing = await prisma.vacancy.findFirst({
      where: { job_title: vacancy.job_title }
    });
    
    if (existing) {
      console.log(`⚠️  Vacancy already exists: ${vacancy.job_title}`);
      continue;
    }
    
    const created = await prisma.vacancy.create({
      data: vacancy
    });
    console.log(`✅ Created vacancy: ${created.job_title}`);
  }

  // Create a sample application
  console.log('Creating sample application...');
  
  // Find the Java vacancy
  const javaVacancy = await prisma.vacancy.findFirst({
    where: { job_title: 'Software Engineer-Java' }
  });
  
  const sampleApplication = await prisma.application.create({
    data: {
      email: 'john.doe@example.com',
      phone: '+94771234567',
      job_title: 'Software Engineer-Java',
      vacancy_id: javaVacancy?.id || null,
      source: 'web',
      status: 'pending'
    }
  });
  console.log(`✅ Created sample application: ${sampleApplication.id}`);

  // Create a sample referral
  console.log('Creating sample referral...');
  const sampleReferral = await prisma.referral.create({
    data: {
      email: 'jane.smith@example.com',
      phone: '+94772345678',
      job_title: 'Scrum Master',
      file_path: '/path/to/cv.pdf',
      copied: false
    }
  });
  console.log(`✅ Created sample referral: ${sampleReferral.id}`);

  console.log('\n🎉 Database seeded successfully!');
  console.log('🔍 View your data at: http://localhost:5555');
  console.log('\nTables created:');
  console.log('- vacancies (5 job postings)');
  console.log('- applications (1 sample)');
  console.log('- referrals (1 sample)');
  console.log('- cv_rankings (empty, ready for rankings)');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });