-- Neon PostgreSQL initialization script
-- Run this after connecting to your Neon database

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create vacancies table
CREATE TABLE IF NOT EXISTS vacancies (
  id SERIAL PRIMARY KEY,
  job_title VARCHAR(255) NOT NULL,
  url TEXT,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255),
  phone VARCHAR(50),
  job_title VARCHAR(255) NOT NULL,
  vacancy_id INTEGER REFERENCES vacancies(id),
  cv_file_url TEXT,
  source VARCHAR(50) DEFAULT 'web',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create cv_rankings table
CREATE TABLE IF NOT EXISTS cv_rankings (
  id SERIAL PRIMARY KEY,
  application_id UUID UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  education_score INTEGER DEFAULT 0,
  education_evidence TEXT,
  work_experience_score INTEGER DEFAULT 0,
  work_experience_evidence TEXT,
  skill_match_score INTEGER DEFAULT 0,
  skill_match_evidence TEXT,
  certifications_score INTEGER DEFAULT 0,
  certifications_evidence TEXT,
  domain_knowledge_score INTEGER DEFAULT 0,
  domain_knowledge_evidence TEXT,
  soft_skills_score INTEGER DEFAULT 0,
  soft_skills_evidence TEXT,
  total_score INTEGER DEFAULT 0,
  final_score DECIMAL(5,4) DEFAULT 0,
  summary TEXT,
  ranked_at TIMESTAMP DEFAULT NOW()
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  job_title VARCHAR(255) NOT NULL,
  cv_file_url TEXT,
  copied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_job_title ON applications(job_title);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);
CREATE INDEX IF NOT EXISTS idx_cv_rankings_application_id ON cv_rankings(application_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_status ON vacancies(status);

-- Insert some sample vacancies (optional)
INSERT INTO vacancies (job_title, url, description, status) VALUES 
  ('Software Engineer-Java', 'https://intervest.lk/careers/post/cG9zdDoyODk=/software-engineer-java', 'Java development position with Spring framework experience', 'active'),
  ('Senior Quality Assurance Engineer', 'https://intervest.lk/careers/post/cG9zdDoyODM=/senior-quality-assurance-engineer-manual', 'Manual testing position for senior QA engineer', 'active'),
  ('Scrum Master', 'https://intervest.lk/careers/post/cG9zdDoyODA=/scrum-master', 'Agile project management position', 'active'),
  ('Senior Software Engineer-React', 'https://intervest.lk/careers/post/cG9zdDoyODc=/senior-software-engineer-react', 'React.js development position for senior engineer', 'active')
ON CONFLICT DO NOTHING;