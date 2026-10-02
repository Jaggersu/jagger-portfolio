import { ResumeData } from "./types";

export const resumeData: ResumeData = {
  profile: {
    name: "Jagger Su (蘇上祐)",
    nameEn: "Jagger Su",
    title: "Product Designer & Design Engineer",
    bio: "具備14年從設計總監至總經理的完整資歷，專長為企業整合設計、前沿技術與商業營運，驅動數位轉型與 SaaS 產品落地。",
    summary:
      "擁有 14 年跨領域資歷的設計架構師與全端落地的實踐者，專精於從 0 到 1 的 SaaS 產品架構、高互動 Web 介面與設計系統建立。曾執掌大型生活娛樂集團品牌體驗與營運策略，兼具頂層商業思維與代碼工程落地能力，能無縫串聯設計規範、前端實作與非同步遠端協作流。",
    birthDate: "1979.01.21",
    availability: "錄取後 1-2 週內可到職（可全時配合遠端非同步協作）",
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
        "深度協同並派駐上海 Brown Sugar、上海 Dozo、上海 Sabatini 等跨兩岸品牌實體與數位營運，具備多年對接大陸在地團隊、跨文化非同步溝通與高頻協同管理經驗。",
        "帶領跨部門團隊建立設計交付與專案管理 SOP，平衡極致體驗美感與千萬級商業運營效益。",
      ],
      techStack: ["Brand Strategy", "CIS Design", "Project Management", "UI/UX", "Operations"],
    },
  ],

  projects: [
    {
      id: "proj-1",
      name: "AIPT",
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
      id: "proj-lottery",
      name: "TAIWAN LOTTERY PLATFORM (台灣彩券官網)",
      category: "大型彩票交易與資訊平台 UI/UX",
      role: "Senior Web Designer (e21摩奇創意時期)",
      period: "Core Archive",
      techStack: ["High-Traffic UX", "Information Architecture", "HTML/CSS", "JavaScript", "Design System"],
      highlights: [
        "主導台灣彩券官網核心視覺介面與即時開獎資訊架構設計，兼顧極高瞬間併發流量下的高可用性與直覺易讀性。",
        "制定彩票平台開獎動態展示與數位活動互動流程，建立長期穩定營運之介面規範。",
      ],
      link: "https://www.taiwanlottery.com/",
    },
    {
      id: "proj-4",
      name: "FUMA CRASH · Web3 Gaming Platform",
      category: "GameFi / 即時倍率高頻互動遊戲",
      role: "Lead Interactive Web & Game UI Designer",
      period: "Live Production",
      techStack: ["Crash Mechanics", "Game UI/UX", "Interactive Web", "High-frequency States", "Real-time Feedback"],
      highlights: [
        "操刀高張力即時倍率（Crash）遊戲之視覺體系與動態曲線，兼顧高頻下注決策與沉浸式遊戲心理反饋。",
        "規劃即時倒數、投注狀態切換與開獎動效反饋，確保在跨裝置環境下維持極低延遲的直覺操作感。",
        "打造具備現代科技感與強烈視覺刺激的遊戲面板，成功整合於線上運行驗證環境。"
      ],
      link: "https://jaggersu888.wixstudio.com/fuma",
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

  languages: {
    english: {
      listening: 6,
      speaking: 6,
      reading: 7,
      writing: 7,
      summary: "商務溝通 · Professional",
    },
    others: [
      { language: "中文 (繁體)", proficiency: "母語 (Native)" },
      { language: "台語 (Taiwanese)", proficiency: "母語精通 (Fluent)" },
      { language: "日文 (Japanese)", proficiency: "基礎略懂 (Basic)" },
    ],
  },
};
