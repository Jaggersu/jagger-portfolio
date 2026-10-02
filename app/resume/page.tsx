import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Mail, Phone, MapPin, Globe, Send } from 'lucide-react';
import { resumeData } from './data';

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}
import ResumeActionButtons from './components/ResumeActionButtons';

export const metadata: Metadata = {
  title: `${resumeData.profile.nameEn || 'Jagger Su'} · Resume | ${resumeData.profile.title}`,
  description: `${resumeData.profile.nameEn || 'Jagger Su'} 的專業履歷：${resumeData.profile.bio}`,
  openGraph: {
    title: `${resumeData.profile.nameEn || 'Jagger Su'} · Resume`,
    description: resumeData.profile.bio,
    type: 'profile',
  },
};

export default function ResumePage() {
  const { profile, expertise, experiences, projects, education, languages } = resumeData;

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-zinc-100 py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center justify-start print:p-0 print:m-0 print:bg-white print:min-h-0 print:text-[#111827]">
      {/* Print Specific CSS Overrides & A4 Page Dimensions */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait;
              margin: 14mm 12mm 14mm 12mm;
            }
            @media print {
              html, body {
                background-color: #ffffff !important;
                background: #ffffff !important;
                color: #111827 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                overflow: visible !important;
                width: 100% !important;
                height: auto !important;
                font-size: 11pt;
              }
              a {
                text-decoration: none !important;
                color: inherit !important;
              }
              .break-avoid {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
            }
          `,
        }}
      />

      {/* Floating Action Buttons for Print / Download PDF */}
      <ResumeActionButtons />

      {/* Main A4 Resume Sheet Container */}
      <div className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-[#0D0D0D] text-zinc-100 rounded-2xl border border-zinc-800 shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-6 sm:p-10 lg:p-12 relative overflow-hidden transition-colors print:max-w-none print:w-full print:min-h-0 print:bg-white print:text-[#111827] print:border-none print:shadow-none print:rounded-none print:p-0 print:pt-1 print:m-0">
        {/* Subtle decorative grid for screen mode */}
        <div className="vector-grid opacity-20 pointer-events-none absolute inset-0 print:hidden" />

        {/* Dual-Column Layout: Left ~35%, Right ~65% */}
        <div className="relative z-10 flex flex-col md:flex-row print:flex-row gap-8 lg:gap-10 print:gap-8 items-start">
          {/* ======================================================== */}
          {/* LEFT COLUMN (35%): Profile, Contacts, Skills, Education  */}
          {/* ======================================================== */}
          <aside className="w-full md:w-[35%] print:w-[35%] shrink-0 flex flex-col gap-6 md:border-r md:border-zinc-800/80 md:pr-7 lg:pr-8 print:border-r print:border-zinc-200 print:pr-6">
            {/* Profile Intro */}
            <div className="break-avoid">
              <div className="relative w-20 h-20 rounded-full overflow-hidden border border-zinc-700/80 shadow-[0_0_20px_rgba(255,85,0,0.12)] mb-4 print:border-zinc-300 print:shadow-none bg-zinc-950">
                <Image
                  src="/avatar.png"
                  alt={profile.name}
                  fill
                  unoptimized
                  className="object-cover"
                  priority
                />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white print:text-[#111827] font-sans">
                {profile.name}
              </h1>
              <p className="text-xs font-mono font-semibold text-[#FF5500] tracking-wider mt-1.5 uppercase">
                {profile.title}
              </p>
              <p className="text-xs text-zinc-400 print:text-zinc-600 leading-relaxed mt-3 font-sans">
                {profile.bio}
              </p>
            </div>

            {/* Contact Information */}
            <div className="break-avoid border-t border-zinc-800/70 pt-5 print:border-zinc-200">
              <h2 className="text-[11px] font-mono tracking-widest text-[#FF5500] uppercase font-bold mb-3">
                // CONTACT & LINKS
              </h2>
              <ul className="space-y-2.5 text-xs font-mono">
                <li className="flex items-center gap-2.5 text-zinc-300 print:text-zinc-700">
                  <Mail className="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
                  <a
                    href={`mailto:${profile.contact.email}`}
                    className="hover:text-white print:text-zinc-800 transition-colors truncate"
                  >
                    {profile.contact.email}
                  </a>
                </li>
                {profile.contact.phone && (
                  <li className="flex items-center gap-2.5 text-zinc-300 print:text-zinc-700">
                    <Phone className="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
                    <a
                      href={`tel:${profile.contact.phone}`}
                      className="hover:text-white print:text-zinc-800 transition-colors truncate"
                    >
                      {profile.contact.phone}
                    </a>
                  </li>
                )}
                {profile.contact.location && (
                  <li className="flex items-center gap-2.5 text-zinc-300 print:text-zinc-700">
                    <MapPin className="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
                    <span className="truncate">{profile.contact.location}</span>
                  </li>
                )}
                {profile.contact.website && (
                  <li className="flex items-center gap-2.5 text-zinc-300 print:text-zinc-700">
                    <Globe className="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
                    <a
                      href={profile.contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#FF5500] print:text-zinc-800 transition-colors truncate"
                    >
                      {profile.contact.website.replace('https://', '')}
                    </a>
                  </li>
                )}
                {profile.contact.github && (
                  <li className="flex items-center gap-2.5 text-zinc-300 print:text-zinc-700">
                    <GithubIcon className="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
                    <a
                      href={profile.contact.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#FF5500] print:text-zinc-800 transition-colors truncate"
                    >
                      {profile.contact.github.replace('https://', '')}
                    </a>
                  </li>
                )}
                {profile.contact.telegram && (
                  <li className="flex items-center gap-2.5 text-zinc-300 print:text-zinc-700">
                    <Send className="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
                    <a
                      href={profile.contact.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#FF5500] print:text-zinc-800 transition-colors truncate"
                    >
                      t.me/jaggersu
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {/* Core Expertise */}
            <div className="border-t border-zinc-800/70 pt-5 print:border-zinc-200 flex flex-col gap-5">
              <h2 className="text-[11px] font-mono tracking-widest text-[#FF5500] uppercase font-bold">
                // CORE EXPERTISE
              </h2>

              {/* 1. Design Architecture */}
              <div className="break-avoid">
                <h3 className="text-xs font-mono font-bold text-zinc-200 print:text-zinc-800 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500]" />
                  設計架構 (Design Architecture)
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {expertise.designArchitecture.map((item, idx) => (
                    <span
                      key={idx}
                      className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-zinc-900/90 text-zinc-300 border border-zinc-800 print:bg-zinc-100 print:text-zinc-800 print:border-zinc-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* 2. Frontend Engineering */}
              <div className="break-avoid">
                <h3 className="text-xs font-mono font-bold text-zinc-200 print:text-zinc-800 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500]" />
                  前端技術 (Frontend Tech)
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {expertise.frontendTech.map((item, idx) => (
                    <span
                      key={idx}
                      className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-zinc-900/90 text-zinc-300 border border-zinc-800 print:bg-zinc-100 print:text-zinc-800 print:border-zinc-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* 3. Remote Collaboration */}
              <div className="break-avoid">
                <h3 className="text-xs font-mono font-bold text-zinc-200 print:text-zinc-800 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500]" />
                  遠端協作 (Remote & Agile)
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {expertise.remoteCollaboration.map((item, idx) => (
                    <span
                      key={idx}
                      className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-zinc-900/90 text-zinc-300 border border-zinc-800 print:bg-zinc-100 print:text-zinc-800 print:border-zinc-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Education */}
            <div className="break-avoid border-t border-zinc-800/70 pt-5 print:border-zinc-200">
              <h2 className="text-[11px] font-mono tracking-widest text-[#FF5500] uppercase font-bold mb-3">
                // EDUCATION
              </h2>
              {education.map((edu) => (
                <div key={edu.id} className="text-xs">
                  <div className="font-bold text-zinc-200 print:text-zinc-800 font-sans">
                    {edu.degree}
                  </div>
                  <div className="text-zinc-400 print:text-zinc-600 font-mono text-[11px] mt-0.5">
                    {edu.school}
                  </div>
                  <div className="text-[10px] font-mono text-[#FF5500] mt-1">
                    {edu.period}
                  </div>
                  {edu.description && (
                    <p className="text-[11px] text-zinc-400 print:text-zinc-600 mt-1.5 leading-relaxed font-sans">
                      {edu.description}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Languages */}
            {languages && languages.length > 0 && (
              <div className="break-avoid border-t border-zinc-800/70 pt-5 print:border-zinc-200">
                <h2 className="text-[11px] font-mono tracking-widest text-[#FF5500] uppercase font-bold mb-2.5">
                  // LANGUAGES
                </h2>
                <div className="space-y-1.5 text-xs font-mono">
                  {languages.map((lang, idx) => (
                    <div key={idx} className="flex justify-between items-center text-zinc-300 print:text-zinc-700">
                      <span>{lang.language}</span>
                      <span className="text-[10px] text-zinc-500 print:text-zinc-500">{lang.proficiency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* ======================================================== */}
          {/* RIGHT COLUMN (65%): Summary, Experience, Projects        */}
          {/* ======================================================== */}
          <section className="w-full md:w-[65%] print:w-[65%] flex-1 flex flex-col gap-7 print:gap-6">
            {/* Executive Summary */}
            <div className="break-avoid">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[11px] font-mono tracking-widest text-[#FF5500] uppercase font-bold">
                  // SUMMARY
                </span>
                <div className="h-[1px] flex-1 bg-zinc-800/80 print:bg-zinc-200" />
              </div>
              <p className="text-xs sm:text-[13px] text-zinc-300 print:text-zinc-700 leading-relaxed font-sans">
                {profile.summary}
              </p>
            </div>

            {/* Professional Experience */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[11px] font-mono tracking-widest text-[#FF5500] uppercase font-bold">
                  // PROFESSIONAL EXPERIENCE
                </span>
                <div className="h-[1px] flex-1 bg-zinc-800/80 print:bg-zinc-200" />
              </div>

              <div className="space-y-6 print:space-y-5">
                {experiences.map((exp) => (
                  <article
                    key={exp.id}
                    className="break-avoid relative pl-3 sm:pl-4 border-l-2 border-zinc-800 print:border-zinc-300"
                  >
                    {/* Period badge and Role */}
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-1">
                      <h3 className="text-sm font-bold text-white print:text-[#111827] font-sans">
                        {exp.role}
                      </h3>
                      <span className="text-[10.5px] font-mono font-medium text-[#FF5500] bg-[#FF5500]/10 border border-[#FF5500]/25 px-2 py-0.5 rounded shrink-0 print:border-[#FF5500]/40">
                        {exp.period}
                      </span>
                    </div>

                    {/* Company and Location */}
                    <div className="text-xs font-mono text-zinc-400 print:text-zinc-600 mb-2">
                      <span className="text-zinc-200 print:text-zinc-800 font-semibold">{exp.company}</span>
                      {exp.location && <span> · {exp.location}</span>}
                    </div>

                    {/* Achievements List */}
                    <ul className="space-y-1.5 text-xs text-zinc-300 print:text-zinc-700 leading-relaxed font-sans mb-2.5">
                      {exp.achievements.map((ach, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#FF5500] font-bold text-[10px] mt-0.5 shrink-0">▸</span>
                          <span>{ach}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Tech stack tags */}
                    {exp.techStack && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {exp.techStack.map((tech, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800/80 print:bg-zinc-100 print:text-zinc-700 print:border-zinc-200"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>

            {/* Featured Projects */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[11px] font-mono tracking-widest text-[#FF5500] uppercase font-bold">
                  // FEATURED PROJECTS
                </span>
                <div className="h-[1px] flex-1 bg-zinc-800/80 print:bg-zinc-200" />
              </div>

              <div className="grid grid-cols-1 gap-4 print:gap-3.5">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="break-avoid bg-[#121214]/90 print:bg-white border border-zinc-800/80 print:border-zinc-200 rounded-xl p-4 print:p-3 print:rounded-lg"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold font-mono text-white print:text-[#111827]">
                          {proj.name}
                        </h3>
                        <span className="text-[11px] font-mono text-zinc-400 print:text-zinc-500">
                          // {proj.category}
                        </span>
                      </div>
                      {proj.link && (
                        <a
                          href={proj.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-mono text-[#FF5500] hover:underline flex items-center gap-1 shrink-0 print:hidden"
                        >
                          LIVE DEMO ↗
                        </a>
                      )}
                    </div>

                    {/* Tech Stack */}
                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {proj.techStack.map((tech, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-300 border border-zinc-700/60 print:bg-zinc-100 print:text-zinc-800 print:border-zinc-200"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* Project Highlights */}
                    <ul className="space-y-1 text-xs text-zinc-300 print:text-zinc-700 leading-relaxed font-sans">
                      {proj.highlights.map((hl, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#FF5500] text-[9px] mt-1 shrink-0">•</span>
                          <span>{hl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Tagline */}
            <div className="break-avoid border-t border-zinc-800/70 pt-4 text-center sm:text-right print:border-zinc-200">
              <span className="text-[10px] font-mono text-zinc-500 print:text-zinc-400">
                JAGGER OS · RESUME ARCHIVE // {new Date().getFullYear()} · COMPILED WITH NEXT.JS & TAILWIND CSS
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
