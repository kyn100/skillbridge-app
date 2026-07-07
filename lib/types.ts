export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  summary: string;
  education: Education[];
  experience: Experience[];
  skills: string[];
  created_at: string;
  updated_at: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  graduation_year: string;
  gpa?: string;
}

export interface Experience {
  company: string;
  title: string;
  start_date: string;
  end_date: string;
  description: string;
}

export interface JobField {
  id: number;
  name: string;
  description: string;
  icon_emoji: string;
  color_class: string;
  display_order: number;
}

export interface FieldKeyword {
  id: number;
  field_id: number;
  keyword: string;
  is_default: number;
  created_at: string;
}

export interface JobSearch {
  id: number;
  field_id: number;
  keywords_used: string[];
  created_at: string;
}

export interface JobListing {
  id: number;
  search_id: number;
  field_id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  source_site: string;
  description_raw: string;
  description_summary: string;
  match_score: number;
  created_at: string;
}

export interface ResumeContent {
  contact: {
    name: string;
    email: string;
    phone: string;
    location?: string;
    linkedin?: string;
    github?: string;
  };
  summary: string;
  skills: {
    category: string;
    items: string[];
  }[];
  experience: {
    company: string;
    title: string;
    start_date: string;
    end_date: string;
    bullets: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    field: string;
    graduation_year: string;
    gpa?: string;
  }[];
  projects?: {
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }[];
}

export interface Resume {
  id: number;
  job_listing_id: number;
  profile_id: number;
  content: ResumeContent;
  created_at: string;
}

export interface StudyPlan {
  id: number;
  resume_id: number;
  job_listing_id: number;
  skill_gaps: string[];
  overview: string;
  total_hours_estimate: number;
  created_at: string;
}

export interface StudyModule {
  id: number;
  plan_id: number;
  title: string;
  description: string;
  skill_category: string;
  order_num: number;
  estimated_hours: number;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
}

export interface TextbookChapter {
  id: number;
  module_id: number;
  title: string;
  content_markdown: string;
  order_num: number;
  created_at: string;
}

export interface TestQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface Test {
  id: number;
  module_id: number;
  level: 1 | 2 | 3;
  title: string;
  questions: TestQuestion[];
  passing_score: number;
  created_at: string;
}

export interface TestAttempt {
  id: number;
  test_id: number;
  score: number;
  answers: number[];
  passed: number;
  created_at: string;
}
