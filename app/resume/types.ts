export interface ContactInfo {
  email: string;
  phone?: string;
  location: string;
  website?: string;
  github?: string;
  telegram?: string;
  linkedin?: string;
}

export interface Profile {
  name: string;
  nameEn: string;
  title: string;
  bio: string;
  summary: string;
  avatarUrl?: string;
  birthDate?: string;
  availability?: string;
  contact: ContactInfo;
}

export interface ExpertiseCategory {
  category: string;
  skills: string[];
}

export interface CoreExpertise {
  designArchitecture: string[];
  frontendTech: string[];
  remoteCollaboration: string[];
  additional?: ExpertiseCategory[];
}

export interface FeaturedProject {
  id: string;
  name: string;
  category: string;
  role: string;
  period?: string;
  techStack: string[];
  highlights: string[];
  link?: string;
}

export interface ProfessionalExperience {
  id: string;
  company: string;
  role: string;
  period: string;
  location?: string;
  achievements: string[];
  techStack?: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  period: string;
  description?: string;
}

export interface EnglishSkillBreakdown {
  listening: number; // 1-10
  speaking: number;  // 1-10
  reading: number;   // 1-10
  writing: number;   // 1-10
  summary: string;
}

export interface LanguageData {
  english: EnglishSkillBreakdown;
  others: { language: string; proficiency: string }[];
}

export interface ResumeData {
  profile: Profile;
  expertise: CoreExpertise;
  experiences: ProfessionalExperience[];
  projects: FeaturedProject[];
  education: EducationItem[];
  languages: LanguageData;
}
