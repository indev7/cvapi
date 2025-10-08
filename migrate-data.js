#!/usr/bin/env node

/**
 * Data Migration Script
 * Migrates data from Google Sheets exports to Neon PostgreSQL
 * 
 * Usage:
 * 1. Export your Google Sheets to CSV files:
 *    - applications.csv (from Applications sheet)
 *    - rankings.csv (from Ranks sheet) 
 *    - referrals.csv (from Referral sheet)
 *    - vacancies.csv (from JD sheet or manually create)
 * 
 * 2. Place CSV files in ./migration-data/ folder
 * 3. Run: node migrate-data.js
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateCsvToDatabase() {
  try {
    console.log('🚀 Starting data migration...');

    // 1. Migrate Vacancies
    await migrateVacancies();

    // 2. Migrate Applications  
    await migrateApplications();

    // 3. Migrate Rankings
    await migrateRankings();

    // 4. Migrate Referrals
    await migrateReferrals();

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function migrateVacancies() {
  console.log('\n📝 Migrating vacancies...');
  
  const vacanciesFile = path.join(__dirname, 'migration-data', 'vacancies.csv');
  
  if (!fs.existsSync(vacanciesFile)) {
    console.log('⚠️  No vacancies.csv found, creating sample vacancies...');
    
    const sampleVacancies = [
      { job_title: 'Software Engineer-Java', url: 'https://intervest.lk/careers/post/cG9zdDoyODk=/software-engineer-java' },
      { job_title: 'Scrum Master', url: 'https://intervest.lk/careers/post/cG9zdDoyODA=/scrum-master' },
      { job_title: 'Senior Quality Assurance Engineer', url: 'https://intervest.lk/careers/post/cG9zdDoyODM=/senior-quality-assurance-engineer-manual' },
    ];
    
    for (const vacancy of sampleVacancies) {
      await prisma.vacancy.create({ data: vacancy });
    }
    
    console.log(`✅ Created ${sampleVacancies.length} sample vacancies`);
    return;
  }

  const vacancies = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(vacanciesFile)
      .pipe(csv())
      .on('data', (row) => {
        vacancies.push({
          job_title: row.Job_Title || row['Job Title'] || row.job_title,
          url: row.URL || row.url,
          description: row.Description || row.description || '',
          status: 'active'
        });
      })
      .on('end', async () => {
        try {
          for (const vacancy of vacancies) {
            if (vacancy.job_title) {
              await prisma.vacancy.create({ data: vacancy });
            }
          }
          console.log(`✅ Migrated ${vacancies.length} vacancies`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
  });
}

async function migrateApplications() {
  console.log('\n👥 Migrating applications...');
  
  const applicationsFile = path.join(__dirname, 'migration-data', 'applications.csv');
  
  if (!fs.existsSync(applicationsFile)) {
    console.log('⚠️  No applications.csv found, skipping...');
    return;
  }

  const applications = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(applicationsFile)
      .pipe(csv())
      .on('data', (row) => {
        applications.push({
          id: row.ID || row.id,
          email: row.Email || row.email || null,
          phone: row.Phone || row.phone || null,
          job_title: row.Job_Title || row['Job Title'] || row.job_title,
          cv_file_url: row['CV File URL'] || row.cv_file_url || null,
          source: 'web',
          status: 'pending'
        });
      })
      .on('end', async () => {
        try {
          for (const app of applications) {
            if (app.job_title) {
              // Try to link to vacancy if exists
              const vacancy = await prisma.vacancy.findFirst({
                where: { job_title: app.job_title }
              });
              
              await prisma.application.create({
                data: {
                  ...app,
                  vacancy_id: vacancy?.id || null
                }
              });
            }
          }
          console.log(`✅ Migrated ${applications.length} applications`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
  });
}

async function migrateRankings() {
  console.log('\n📊 Migrating rankings...');
  
  const rankingsFile = path.join(__dirname, 'migration-data', 'rankings.csv');
  
  if (!fs.existsSync(rankingsFile)) {
    console.log('⚠️  No rankings.csv found, skipping...');
    return;
  }

  const rankings = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(rankingsFile)
      .pipe(csv())
      .on('data', (row) => {
        rankings.push({
          application_id: row.ID || row.application_id || row.cv_id,
          education_score: parseInt(row.Education_Score) || 0,
          education_evidence: row.Education_Evidence || '',
          work_experience_score: parseInt(row.Work_Experience_Score) || 0,
          work_experience_evidence: row.Work_Experience_Evidence || '',
          skill_match_score: parseInt(row.Skill_Match_Score) || 0,
          skill_match_evidence: row.Skill_Match_Evidence || '',
          certifications_score: parseInt(row.Certifications_Score) || 0,
          certifications_evidence: row.Certifications_Evidence || '',
          domain_knowledge_score: parseInt(row.Domain_Knowledge_Score) || 0,
          domain_knowledge_evidence: row.Domain_Knowledge_Evidence || '',
          soft_skills_score: parseInt(row.Soft_Skills_Score) || 0,
          soft_skills_evidence: row.Soft_Skills_Evidence || '',
          total_score: parseInt(row.Total_Score) || 0,
          final_score: parseFloat(row.Final_Score) || 0,
          summary: row.Summary || ''
        });
      })
      .on('end', async () => {
        try {
          for (const ranking of rankings) {
            // Check if application exists
            const application = await prisma.application.findUnique({
              where: { id: ranking.application_id }
            });
            
            if (application) {
              await prisma.cvRanking.create({ data: ranking });
            }
          }
          console.log(`✅ Migrated ${rankings.length} rankings`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
  });
}

async function migrateReferrals() {
  console.log('\n🔄 Migrating referrals...');
  
  const referralsFile = path.join(__dirname, 'migration-data', 'referrals.csv');
  
  if (!fs.existsSync(referralsFile)) {
    console.log('⚠️  No referrals.csv found, skipping...');
    return;
  }

  const referrals = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(referralsFile)
      .pipe(csv())
      .on('data', (row) => {
        referrals.push({
          email: row.Email || row.email,
          phone: row.Phone || row.phone || null,
          job_title: row.Job_Title || row['Job Title'] || row.job_title,
          file_path: row.File || row.file_path || null,
          copied: (row.Copied || row.copied) === 'Y' || false
        });
      })
      .on('end', async () => {
        try {
          for (const referral of referrals) {
            if (referral.email && referral.job_title) {
              await prisma.referral.create({ data: referral });
            }
          }
          console.log(`✅ Migrated ${referrals.length} referrals`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
  });
}

// Create migration-data directory if it doesn't exist
const migrationDir = path.join(__dirname, 'migration-data');
if (!fs.existsSync(migrationDir)) {
  fs.mkdirSync(migrationDir);
  console.log('📁 Created migration-data directory');
  console.log('📋 Place your CSV files in ./migration-data/');
  console.log('   - applications.csv');
  console.log('   - rankings.csv');
  console.log('   - referrals.csv');
  console.log('   - vacancies.csv (optional)');
}

// Run migration
migrateCsvToDatabase();