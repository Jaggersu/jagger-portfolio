import { ResumeData } from "./types";

export const resumeData: ResumeData = {
  profile: {
    name: "Jagger Su (蘇上祐)",
    nameEn: "Jagger Su",
    title: "Product Designer & Design Engineer",
    bio: "具備14年從設計總監至總經理的完整資歷，專長為企業整合設計、前沿技術與商業營運，驅動數位轉型與 SaaS 產品落地。",
    summary:
      "擁有 14 年跨領域資歷的設計架構師與全端落地的實踐者，專精於從 0 到 1 的 SaaS 產品架構、高互動 Web 介面與設計系統建立。曾執掌大型生活娛樂集團品牌體驗與營運策略，兼具頂層商業思維與代碼工程落地能力，能無縫串聯設計規範、前端實作與非同步遠端協作流。",
    contact: {
      email: "sujagger.104@gmail.com",
      phone: "0960-385-778",
      location: "Taoyuan, Taiwan (Remote Available)",
      website: "https://jagger-portfolio.vercel.app",
      github: "https://github.com/Jaggersu",
      telegram: "https://t.me/jaggersu",
      linkedin: "https://linkedin.com/in/jaggersu",
    },
  },

  expertise: {
    designArchitecture: [
      "Design Systems & Token Architecture (Tokens Studio / Figma)",
      "Atomic Design & Reusable Component Library Governance",
      "Micro-interactions & Spring Physics (Framer Motion / Motion)",
      "Accessibility (WCAG 2.1 AA Compliance & Keyboard Navigation)",
      "Figma-to-Code Engineering & Design System Documentation",
    ],
    frontendTech: [
      "Next.js 15/16 (App Router, Server Actions, RSC, ISR)",
      "React 19 & TypeScript Strict Mode",
      "Tailwind CSS v3/v4 & Headless UI Architecture",
      "State Management (Zustand, React Query / TanStack)",
      "Backend Integration (Supabase Auth/RLS, REST, GraphQL)",
      "Performance Tuning (Core Web Vitals, Bundle Splitting)",
    ],
    remoteCollaboration: [
      "Agile / Scrum Sprint Planning & Fast Iterations",
      "Asynchronous Communication & High-fidelity RFC Specs",
      "Git Flow & GitHub Actions CI/CD Pipeline Automation",
      "Cross-functional Leadership (Dev, UI/UX, Product Owners)",
      "Production-ready Observability, Testing & Error Boundaries",
    ],
  },

  experiences: [
    {
      id: "exp-1",
      company: "Greenzone Inc. (牛奶弄設計有限公司)",
      role: "Co-Founder & Product Lead",
      period: "2021 - Present",
      location: "Taiwan",
      achievements: [
        "主導數位產品架構、自動化行政流程設計與 SaaS 解決方案落地。",
        "統籌前端工程與體驗設計標準，運用現代全端技術棧確保設計規格 100% 精準實現。",
      ],
      techStack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Supabase", "Design Systems"],
    },
    {
      id: "exp-2",
      company: "樂與食國際開發股份有限公司",
      role: "總經理暨設計總監",
      period: "2010/1 - 2021/4",
      achievements: [
        "掌管旗下 Brown Sugar、Dozo、Myst 等知名餐飲與娛樂旗艦品牌之全方位視覺系統（CIS）、空間數位體驗與市場策略。",
        "帶領跨部門團隊建立設計交付與專案管理 SOP，平衡極致體驗美感與千萬級商業運營效益。",
      ],
      techStack: ["Brand Strategy", "CIS Design", "Project Management", "UI/UX", "Operations"],
    },
  ],

  projects: [
    {
      id: "proj-1",
      name: "AIPT ONE ECOSYSTEM",
      category: "SaaS 智慧物業維運與工單 AI 生態系",
      role: "Core Frontend Architect & Product Designer",
      period: "2024",
      techStack: ["Next.js 16", "TypeScript", "Supabase RLS", "Tailwind CSS", "AI Agent API"],
      highlights: [
        "設計並落地多維度角色權限（RBAC）與工單調度看板，支援廠商即時報價、住戶審核與多級工單狀態追蹤。",
        "封裝統一的共用 UI 元件庫（VendorSelector、Interactive Modals 等），大幅降低代碼重複率並提升測試覆蓋度。",
        "整合 Generative AI 智能助理介面，自動分類工單痛點並生成維護分析摘要，提升物業管理效率達 60%。",
      ],
      link: "https://aipt-one.vercel.app",
    },
    {
      id: "proj-2",
      name: "REBOX WORKFLOW SYSTEM",
      category: "SaaS 敏捷模組化管理平台",
      role: "Full-stack Frontend Lead",
      period: "2023 - 2024",
      techStack: ["Next.js", "Supabase", "Tailwind CSS", "Server Actions", "PostgreSQL"],
      highlights: [
        "開發高自訂彈性工作流程節點畫布與狀態追蹤面板，滿足非技術人員直覺拖拉調整專案節奏的需求。",
        "運用 React Server Components (RSC) 與樂觀更新（Optimistic Updates），消除操作遲滯感，實現近即時流暢體驗。",
      ],
      link: "https://rebox-roan.vercel.app",
    },
    {
      id: "proj-3",
      name: "SECURITY UNION HUB",
      category: "企業級安全監控與組織管理入口",
      role: "Frontend Architect",
      period: "2023",
      techStack: ["Next.js", "TypeScript", "Tailwind CSS", "Vercel Edge"],
      highlights: [
        "遵循極簡暗黑工控美學打造即時警報監控中心，支援百毫秒即時事件回報與圖表過濾。",
        "完成極致輕量化與首屏效能優化，達到 Google Core Web Vitals 全綠指標與極低記憶體佔用。",
      ],
      link: "https://security-union-website.vercel.app",
    },
    {
      id: "proj-4",
      name: "JAGGER OS · Interactive Portfolio",
      category: "個人品牌高互動實驗室與 Design System 展演",
      role: "Creator & Engineer",
      period: "2024",
      techStack: ["Next.js 16", "Motion/React", "Tailwind CSS v4", "Polar SDK", "Supabase"],
      highlights: [
        "打造融合幾何工程網格、向量畫布互動、微動態動畫與 AI 諮詢對話的沈浸式個人品牌平台。",
        "整合 Polar SDK 實現在線贊助與訂閱流程，建立完整從展示、互動到轉化的全端閉環。",
      ],
      link: "https://jaggersu.com",
    },
  ],

  education: [
    {
      id: "edu-1",
      degree: "學士學位 · 中文系",
      school: "輔仁大學 (Fu Jen Catholic University)",
      period: "2001 - 2008",
    },
  ],

  languages: [
    { language: "中文 (繁體)", proficiency: "母語 (Native)" },
    { language: "英文 (English)", proficiency: "流暢商務溝通 (Professional Working)" },
  ],
};
