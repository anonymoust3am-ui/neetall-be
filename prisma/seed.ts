import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (order matters for relations)
  await prisma.fAQ.deleteMany();
  await prisma.socialLink.deleteMany();
  await prisma.blogs.deleteMany();
  await prisma.author.deleteMany();

  console.log('🧹 Cleaned existing blog/author data');

  // ========================
  // 👤 CREATE AUTHORS
  // ========================

  const author1 = await prisma.author.create({
    data: {
      name: 'Dr. Priya Sharma',
      tag: 'NEET Expert',
      bio: 'Senior medical educator with 12+ years of experience guiding NEET aspirants. Former faculty at AIIMS New Delhi, specializing in Anatomy and Physiology.',
      avatarUrl: 'https://picsum.photos/seed/priya/200/200',
      expertise: 'NEET UG & PG Preparation',
      socialLinks: {
        create: [
          { platform: 'linkedin', url: 'https://linkedin.com/in/dr-priya-sharma' },
          { platform: 'twitter', url: 'https://twitter.com/drpriyasharma' },
          { platform: 'youtube', url: 'https://youtube.com/@drpriyasharma' },
        ],
      },
    },
  });

  const author2 = await prisma.author.create({
    data: {
      name: 'Dr. Rajesh Mehta',
      tag: 'Counselling Specialist',
      bio: 'Career counsellor and NEET strategy coach. Has helped 5000+ students secure admissions in top medical colleges across India.',
      avatarUrl: 'https://picsum.photos/seed/rajesh/200/200',
      expertise: 'NEET Counselling & College Selection',
      socialLinks: {
        create: [
          { platform: 'linkedin', url: 'https://linkedin.com/in/dr-rajesh-mehta' },
          { platform: 'instagram', url: 'https://instagram.com/drrajeshmehta' },
        ],
      },
    },
  });

  const author3 = await prisma.author.create({
    data: {
      name: 'Ananya Verma',
      tag: 'Medical Student & Blogger',
      bio: 'NEET AIR 234 holder, currently pursuing MBBS at Maulana Azad Medical College. Shares practical study tips and exam strategies.',
      avatarUrl: 'https://picsum.photos/seed/ananya/200/200',
      expertise: 'Study Strategies & Time Management',
      socialLinks: {
        create: [
          { platform: 'instagram', url: 'https://instagram.com/ananya_neet' },
          { platform: 'youtube', url: 'https://youtube.com/@ananyaverma' },
          { platform: 'twitter', url: 'https://twitter.com/ananya_medico' },
        ],
      },
    },
  });

  const author4 = await prisma.author.create({
    data: {
      name: 'Dr. Suresh Iyer',
      tag: 'Biology Faculty',
      bio: 'HOD Biology at Allen Kota. 20+ years of teaching experience with a passion for simplifying complex biological concepts for NEET aspirants.',
      avatarUrl: 'https://picsum.photos/seed/suresh/200/200',
      expertise: 'Biology (Botany & Zoology)',
      socialLinks: {
        create: [
          { platform: 'linkedin', url: 'https://linkedin.com/in/dr-suresh-iyer' },
        ],
      },
    },
  });

  console.log('✅ Created 4 authors');

  // ========================
  // 📝 CREATE BLOGS
  // ========================

  const blogs = [
    {
      title: 'NEET 2026 Complete Preparation Strategy: A Month-by-Month Guide',
      description: 'A comprehensive roadmap to crack NEET 2026 with subject-wise planning, revision techniques, and mock test schedules.',
      content: `# NEET 2026 Complete Preparation Strategy

## Introduction
Cracking NEET requires a structured and disciplined approach. This guide breaks down your preparation into manageable monthly goals.

## Phase 1: Foundation Building (June - September)
Focus on NCERT textbooks thoroughly. Complete all chapters of Physics, Chemistry, and Biology at least once. Make short notes for quick revision.

### Biology
- Start with Cell Biology and Genetics
- Cover Plant Physiology and Human Physiology
- Daily practice of 50 MCQs

### Physics
- Mechanics and Optics first
- Electrostatics and Modern Physics
- Focus on numerical problem-solving

### Chemistry
- Organic Chemistry basics
- Physical Chemistry formulas
- Inorganic Chemistry periodic trends

## Phase 2: Advanced Practice (October - January)
Move to advanced problem-solving. Attempt previous year papers and analyze your weak areas. Join a test series for regular assessment.

## Phase 3: Revision & Mock Tests (February - May)
Dedicate this phase entirely to revision and full-length mock tests. Aim for at least 2 mock tests per week.

## Key Tips
1. **Consistency over intensity** - Study 6-8 hours daily with breaks
2. **NCERT is Bible** - 90% of questions come from NCERT
3. **Previous Year Papers** - Solve last 15 years' papers
4. **Health matters** - Sleep 7-8 hours, exercise regularly`,
      authorId: author1.id,
      slug: 'neet-2026-complete-preparation-strategy',
      imageUrl: 'https://picsum.photos/seed/neet-strategy/800/400',
      coverImageUrl: 'https://picsum.photos/seed/neet-cover1/1200/600',
      tags: ['NEET 2026', 'Study Plan', 'Preparation Strategy', 'Tips'],
      faqs: [
        { question: 'How many hours should I study daily for NEET?', answer: '6-8 hours of focused study is ideal. Quality matters more than quantity.' },
        { question: 'Is NCERT enough for NEET?', answer: 'NCERT covers about 90% of the syllabus. Supplement with reference books for advanced concepts.' },
        { question: 'When should I start taking mock tests?', answer: 'Start partial mocks from month 4 and full-length mocks from month 8 of your preparation.' },
      ],
    },
    {
      title: 'Top 20 Medical Colleges in India: Cutoffs, Fees & Campus Life',
      description: 'Detailed overview of India\'s premier medical institutions with NEET cutoff scores, fee structures, and student experiences.',
      content: `# Top 20 Medical Colleges in India

## 1. AIIMS New Delhi
- **NEET Cutoff**: 720/720 (General)
- **Annual Fee**: ₹1,628
- **Highlights**: Premier medical institute, world-class research facilities

## 2. JIPMER Puducherry
- **NEET Cutoff**: 680+ (General)
- **Annual Fee**: ₹2,390
- **Highlights**: Autonomous institute with excellent clinical exposure

## 3. CMC Vellore
- **NEET Cutoff**: 650+ (General)
- **Annual Fee**: ₹72,250
- **Highlights**: Known for community medicine and rural health programs

## 4. Maulana Azad Medical College, Delhi
- **NEET Cutoff**: 660+ (General)
- **Annual Fee**: ₹3,020
- **Highlights**: Affiliated with LNJP Hospital, excellent practical training

## 5. King George's Medical University, Lucknow
- **NEET Cutoff**: 640+ (General)
- **Annual Fee**: ₹21,650
- **Highlights**: One of the oldest medical colleges in Asia

*... and 15 more colleges covered in detail*

## How to Choose the Right College
- Consider location and living costs
- Check faculty-to-student ratio
- Visit campus if possible
- Talk to current students and alumni`,
      authorId: author2.id,
      slug: 'top-20-medical-colleges-india',
      imageUrl: 'https://picsum.photos/seed/medical-colleges/800/400',
      coverImageUrl: 'https://picsum.photos/seed/colleges-cover/1200/600',
      tags: ['Medical Colleges', 'NEET Cutoff', 'Admissions', 'College Selection'],
      faqs: [
        { question: 'What NEET score is needed for AIIMS?', answer: 'You typically need 710+ marks out of 720 for AIIMS New Delhi in the General category.' },
        { question: 'Are private medical colleges worth it?', answer: 'Some private colleges like CMC Vellore and Manipal offer excellent education. Research thoroughly before deciding.' },
      ],
    },
    {
      title: 'Biology Mnemonics That Will Save You in NEET',
      description: 'Easy-to-remember mnemonics for complex biological classifications, cycles, and processes frequently asked in NEET.',
      content: `# Biology Mnemonics for NEET

## Taxonomy
**Kingdom Classification**: "King Philip Came Over For Good Spaghetti"
- Kingdom → Phylum → Class → Order → Family → Genus → Species

## Cell Biology
**Stages of Mitosis**: "I Pray My Apple Tree"
- Interphase → Prophase → Metaphase → Anaphase → Telophase

## Biochemistry
**Essential Amino Acids**: "PVT TIM HALL"
- Phenylalanine, Valine, Threonine, Tryptophan, Isoleucine, Methionine, Histidine, Arginine, Leucine, Lysine

## Krebs Cycle
**"Citrate Is Krebs' Starting Substrate For Making Oxaloacetate"**
- Citrate → Isocitrate → α-Ketoglutarate → Succinyl CoA → Succinate → Fumarate → Malate → Oxaloacetate

## Cranial Nerves
**"Oh Oh Oh To Touch And Feel Very Good Velvet AH"**
- Olfactory, Optic, Oculomotor, Trochlear, Trigeminal, Abducens, Facial, Vestibulocochlear, Glossopharyngeal, Vagus, Accessory, Hypoglossal`,
      authorId: author3.id,
      slug: 'biology-mnemonics-neet',
      imageUrl: 'https://picsum.photos/seed/bio-mnemonics/800/400',
      coverImageUrl: 'https://picsum.photos/seed/mnemonics-cover/1200/600',
      tags: ['Biology', 'Mnemonics', 'Study Tips', 'NEET'],
      faqs: [
        { question: 'Do mnemonics really help in NEET?', answer: 'Absolutely! Mnemonics help retain complex information and are especially useful during last-minute revision.' },
        { question: 'How to create my own mnemonics?', answer: 'Use the first letter of each term and create a funny or memorable sentence. The more absurd, the better you remember!' },
      ],
    },
    {
      title: 'NEET Counselling Process 2026: Step-by-Step Walkthrough',
      description: 'Complete guide to MCC and state counselling procedures including document checklist, choice filling strategy, and seat allotment process.',
      content: `# NEET Counselling Process 2026

## Overview
After NEET results are declared, the counselling process determines your college and course allocation. Understanding this process is crucial.

## Types of Counselling
1. **AIQ (All India Quota)** - 15% seats, conducted by MCC
2. **State Quota** - 85% seats, conducted by respective state authorities
3. **Deemed/Central Universities** - Separate counselling by MCC

## Step-by-Step Process

### Step 1: Registration
- Visit mcc.nic.in
- Register with NEET roll number
- Pay registration fee (₹1,000 - ₹5,000)

### Step 2: Choice Filling
- Browse available colleges and courses
- Fill preferences in order of priority
- Lock your choices before deadline

### Step 3: Seat Allotment
- Based on NEET rank, category, and choices
- Multiple rounds of allotment
- Accept or reject allotted seat

### Step 4: Reporting
- Visit allotted college with original documents
- Complete admission formalities
- Pay first-year fees

## Important Documents
- NEET Admit Card & Scorecard
- Class 10th & 12th Marksheets
- Category Certificate (if applicable)
- Domicile Certificate
- 8 Passport-size Photographs`,
      authorId: author2.id,
      slug: 'neet-counselling-process-2026',
      imageUrl: 'https://picsum.photos/seed/counselling/800/400',
      coverImageUrl: 'https://picsum.photos/seed/counselling-cover/1200/600',
      tags: ['Counselling', 'NEET 2026', 'Admissions', 'MCC'],
      faqs: [
        { question: 'What is the difference between AIQ and State Quota?', answer: 'AIQ covers 15% of govt seats nationwide managed by MCC, while State Quota covers 85% of seats managed by individual states.' },
        { question: 'Can I participate in both AIQ and State counselling?', answer: 'Yes, you can participate in both simultaneously. However, if allotted a seat in AIQ, your state candidature may be affected.' },
        { question: 'What happens if I don\'t get a seat in Round 1?', answer: 'You automatically move to Round 2 and subsequent rounds. Seats vacated by candidates who don\'t report are redistributed.' },
      ],
    },
    {
      title: 'Physics Numerical Problem-Solving: NEET High-Yield Topics',
      description: 'Master the most frequently asked physics numerical topics in NEET with shortcut formulas and solved examples.',
      content: `# Physics Numericals for NEET

## Why Physics Numericals Matter
Physics contributes 45 questions (180 marks) in NEET. About 60% of these are numerical-based, making problem-solving skills essential.

## High-Yield Topics

### 1. Mechanics (12-15 Questions)
- Projectile Motion
- Newton's Laws Applications
- Work-Energy Theorem
- Rotational Dynamics

### 2. Electrostatics & Current Electricity (8-10 Questions)
- Coulomb's Law problems
- Circuit Analysis (Kirchhoff's Laws)
- Capacitor combinations

### 3. Optics (5-7 Questions)
- Mirror and Lens formula
- Wave optics - Young's double slit
- Optical instruments

### 4. Modern Physics (4-5 Questions)
- Photoelectric effect
- Radioactive decay
- Bohr's model calculations

## Quick Formulas Cheat Sheet
| Topic | Formula | Usage |
|-------|---------|-------|
| Projectile | R = u²sin2θ/g | Range calculation |
| Capacitor | C = εA/d | Parallel plate |
| Lens | 1/f = 1/v - 1/u | Image position |
| Decay | N = N₀e^(-λt) | Remaining nuclei |`,
      authorId: author4.id,
      slug: 'physics-numerical-neet-high-yield',
      imageUrl: 'https://picsum.photos/seed/physics-neet/800/400',
      coverImageUrl: 'https://picsum.photos/seed/physics-cover/1200/600',
      tags: ['Physics', 'Numericals', 'NEET', 'Problem Solving'],
      faqs: [
        { question: 'How important is Physics in NEET?', answer: 'Physics is crucial with 180 marks. Many toppers say Physics is the differentiator between a good and great NEET score.' },
        { question: 'Which Physics topics have highest weightage?', answer: 'Mechanics, Electrostatics, and Optics together contribute about 60-70% of Physics questions in NEET.' },
      ],
    },
    {
      title: 'How I Scored 700+ in NEET: My Complete Journey',
      description: 'Personal experience and detailed strategy breakdown from a NEET topper who scored 705/720 in their first attempt.',
      content: `# My NEET Journey: From Average Student to 705/720

## Background
I was an average student in Class 11. My pre-boards score was barely 60%. But with the right strategy and consistency, I managed to score 705 in NEET.

## What Changed
1. **Stopped following multiple sources** - Stuck to NCERT + one reference book per subject
2. **Daily revision** - Spent 1 hour every day revising previous topics
3. **Error analysis** - Maintained an error log for every mock test

## My Daily Schedule
- 5:00 AM - Wake up, light exercise
- 6:00 AM - Biology (3 hours)
- 9:00 AM - Breakfast break
- 9:30 AM - Chemistry (2.5 hours)
- 12:00 PM - Lunch + rest
- 2:00 PM - Physics (2.5 hours)
- 5:00 PM - Break + walk
- 6:00 PM - Revision + MCQ practice (2 hours)
- 8:00 PM - Dinner
- 9:00 PM - Light reading / weak topic review
- 10:30 PM - Sleep

## Resources I Used
- **Biology**: NCERT + Trueman's
- **Physics**: NCERT + DC Pandey
- **Chemistry**: NCERT + MS Chouhan (Organic)

## Mental Health Tips
- Take one full day off per week
- Talk to friends and family
- Don't compare with others
- Celebrate small wins`,
      authorId: author3.id,
      slug: 'how-i-scored-700-plus-neet',
      imageUrl: 'https://picsum.photos/seed/neet-topper/800/400',
      coverImageUrl: 'https://picsum.photos/seed/topper-cover/1200/600',
      tags: ['NEET Topper', 'Success Story', 'Study Plan', 'Motivation'],
      faqs: [
        { question: 'Is coaching mandatory for NEET?', answer: 'No, self-study with the right resources can work. I used selective online lectures rather than full-time coaching.' },
        { question: 'How many mock tests should I take?', answer: 'I took 45 full-length mocks in my last 3 months. Start with one per week and increase to 2-3 per week closer to the exam.' },
      ],
    },
    {
      title: 'Organic Chemistry Made Easy: Reaction Mechanisms for NEET',
      description: 'Simplified guide to understanding organic reaction mechanisms with flowcharts and practice problems for NEET Chemistry.',
      content: `# Organic Chemistry Reaction Mechanisms

## Why Students Struggle
Organic chemistry feels overwhelming because students try to memorize reactions instead of understanding mechanisms.

## The GOC Approach
**General Organic Chemistry (GOC)** is the foundation. Master these concepts first:

### 1. Inductive Effect
- +I effect: Electron-donating groups (alkyl groups)
- -I effect: Electron-withdrawing groups (halogens, -NO₂)

### 2. Resonance
- Delocalization of electrons
- Stability of intermediates
- Drawing resonance structures

### 3. Hyperconjugation
- No-bond resonance
- Explains stability order of carbocations

## Must-Know Named Reactions
1. **Wurtz Reaction** - Alkane synthesis
2. **Aldol Condensation** - β-hydroxy carbonyl compounds
3. **Cannizzaro Reaction** - Disproportionation
4. **Friedel-Crafts** - Alkylation & Acylation
5. **Sandmeyer Reaction** - Diazonium salt conversions

## NEET Pattern Analysis
- 8-10 questions from Organic Chemistry
- Named reactions: 2-3 questions
- Conversion problems: 2-3 questions
- GOC-based: 3-4 questions`,
      authorId: author4.id,
      slug: 'organic-chemistry-reaction-mechanisms-neet',
      imageUrl: 'https://picsum.photos/seed/organic-chem/800/400',
      coverImageUrl: 'https://picsum.photos/seed/chemistry-cover/1200/600',
      tags: ['Chemistry', 'Organic Chemistry', 'NEET', 'Reactions'],
      faqs: [
        { question: 'Should I memorize all named reactions?', answer: 'Focus on the 15-20 most important ones that appear repeatedly in NEET. Understanding the mechanism helps retention.' },
        { question: 'What is the best book for Organic Chemistry?', answer: 'NCERT is primary. MS Chouhan for practice problems and Morrison & Boyd for deep understanding of mechanisms.' },
      ],
    },
    {
      title: 'NEET vs JEE: Which Exam Should You Prepare For?',
      description: 'Detailed comparison of NEET and JEE covering syllabus overlap, career paths, difficulty levels, and how to decide between medicine and engineering.',
      content: `# NEET vs JEE: The Ultimate Comparison

## Exam Overview
| Aspect | NEET | JEE Main + Advanced |
|--------|------|---------------------|
| For | Medical (MBBS/BDS) | Engineering (B.Tech) |
| Subjects | PCB | PCM |
| Questions | 200 (attempt 180) | 90 (Main) |
| Duration | 3 hours 20 min | 3 hours |
| Attempts | No limit | 6 (3 consecutive years) |

## Syllabus Overlap
Physics and Chemistry are common to both exams. If you're confused, start preparing for both and decide by Class 12.

## Career Prospects
### Medicine (NEET)
- MBBS: 5.5 years + MD/MS: 3 years
- Stable career with social respect
- Growing demand in healthcare

### Engineering (JEE)
- B.Tech: 4 years + M.Tech/MBA optional
- Diverse career options including tech
- Higher starting salaries in IT sector

## How to Decide
1. What subjects excite you?
2. Are you comfortable with long study durations (medicine)?
3. Do you prefer hands-on practical work (engineering)?
4. Consider financial aspects and ROI`,
      authorId: author1.id,
      slug: 'neet-vs-jee-comparison',
      imageUrl: 'https://picsum.photos/seed/neet-jee/800/400',
      coverImageUrl: 'https://picsum.photos/seed/comparison-cover/1200/600',
      tags: ['NEET vs JEE', 'Career Guidance', 'Exam Comparison'],
      faqs: [
        { question: 'Can I prepare for both NEET and JEE?', answer: 'It is very difficult to prepare for both due to different Biology/Mathematics requirements. Choose one by end of Class 11.' },
        { question: 'Which exam is tougher?', answer: 'JEE Advanced is conceptually harder, but NEET has intense competition with 20 lakh+ applicants for limited seats.' },
      ],
    },
  ];

  for (const blogData of blogs) {
    const { faqs, ...blogFields } = blogData;
    await prisma.blogs.create({
      data: {
        ...blogFields,
        faqs: {
          create: faqs,
        },
      },
    });
  }

  console.log(`✅ Created ${blogs.length} blogs with FAQs`);

  // ========================
  // 📋 SEED COUNSELLING OPTIONS
  // ========================

  await prisma.body.deleteMany();
  await prisma.counsellingOption.deleteMany();

  const counsellingData = [
    {
      value: 'neet-ug',
      label: 'NEET UG',
      icon: 'Stethoscope',
      desc: 'MBBS / BDS / BAMS',
      bodies: [
        { key: 'ai-md', name: 'All India UG – Medical & Dental', quota: 'All India' },
        { key: 'afms', name: 'AFMS (through MCC) – UG Medical', quota: 'AFMS' },
        { key: 'andaman', name: 'Andaman & Nicobar Islands – UG Medical', quota: 'Government Quota' },
        { key: 'ap-govt', name: 'Andhra Pradesh Government Quota – UG', quota: 'Government Quota' },
        { key: 'ap-mgmt', name: 'Andhra Pradesh Management Quota – UG', quota: 'Management Quota' },
        { key: 'arunachal', name: 'Arunachal Pradesh – UG Medical', quota: 'Government Quota' },
        { key: 'assam', name: 'Assam – UG Medical', quota: 'Government Quota' },
        { key: 'bihar', name: 'Bihar – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'chandigarh', name: 'Chandigarh – UG Medical', quota: 'Government Quota' },
        { key: 'chhattisgarh', name: 'Chhattisgarh – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'dadra', name: 'Dadra and Nagar Haveli – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'delhi', name: 'Delhi – UG Medical', quota: 'Government Quota' },
        { key: 'goa', name: 'Goa – UG Medical', quota: 'Government Quota' },
        { key: 'gujarat', name: 'Gujarat – UG Medical', quota: 'Government Quota' },
        { key: 'haryana', name: 'Haryana – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'himachal', name: 'Himachal Pradesh – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'jk', name: 'Jammu and Kashmir – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'jharkhand', name: 'Jharkhand – UG Medical', quota: 'Government Quota' },
        { key: 'karnataka', name: 'Karnataka – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'kerala', name: 'Kerala – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'mp', name: 'Madhya Pradesh – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'maharashtra', name: 'Maharashtra – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'manipur', name: 'Manipur – UG Medical', quota: 'Government Quota' },
        { key: 'meghalaya', name: 'Meghalaya – UG Medical', quota: 'Government Quota' },
        { key: 'mizoram', name: 'Mizoram – UG Medical', quota: 'Government Quota' },
        { key: 'nagaland', name: 'Nagaland – UG Medical', quota: 'Government Quota' },
        { key: 'neigrihms', name: 'NEIGRIHMS – UG Medical', quota: 'Government Quota' },
        { key: 'odisha', name: 'Odisha – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'open-seats', name: 'Open Seats (Private Institute)', quota: 'Open State Seats' },
        { key: 'pondicherry', name: 'Pondicherry – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'punjab', name: 'Punjab – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'rajasthan', name: 'Rajasthan – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'rims-manipur', name: 'RIMS Manipur – UG Medical', quota: 'Government Quota' },
        { key: 'sikkim-mu', name: 'Sikkim Manipal University – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'sikkim', name: 'Sikkim – UG Medical', quota: 'Government Quota' },
        { key: 'tn-govt', name: 'Tamil Nadu Government Quota – UG Medical', quota: 'Government Quota' },
        { key: 'tn-mgmt', name: 'Tamil Nadu Management Quota – UG Medical', quota: 'Management Quota' },
        { key: 'telangana-g', name: 'Telangana Government Quota – UG Medical', quota: 'Government Quota' },
        { key: 'telangana-m', name: 'Telangana Management Quota – UG Medical', quota: 'Management Quota' },
        { key: 'tripura', name: 'Tripura – UG Medical', quota: 'Government Quota' },
        { key: 'uttarakhand', name: 'Uttarakhand – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'up', name: 'Uttar Pradesh – UG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'wb', name: 'West Bengal – UG Medical', quota: 'Government Quota and Management Quota' },
      ],
    },
    {
      value: 'neet-pg',
      label: 'NEET PG',
      icon: 'Sparkles',
      desc: 'MD / MS / Diploma',
      bodies: [
        { key: 'pg-ai', name: 'All India PG Medical', quota: 'All India' },
        { key: 'pg-delhi', name: 'Delhi – PG Medical', quota: 'Government Quota' },
        { key: 'pg-karnataka', name: 'Karnataka – PG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'pg-kerala', name: 'Kerala – PG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'pg-maha', name: 'Maharashtra – PG Medical', quota: 'Government Quota and Management Quota' },
        { key: 'pg-tn', name: 'Tamil Nadu – PG Medical', quota: 'Government Quota' },
        { key: 'pg-up', name: 'Uttar Pradesh – PG Medical', quota: 'Government Quota and Management Quota' },
      ],
    },
    {
      value: 'neet-ss',
      label: 'NEET SS',
      icon: 'Microscope',
      desc: 'Super Speciality',
      bodies: [
        { key: 'ss-ai', name: 'All India SS Medical', quota: 'All India' },
        { key: 'ss-delhi', name: 'Delhi – SS Medical', quota: 'Government Quota' },
        { key: 'ss-pgi', name: 'PGI Chandigarh – SS Medical', quota: 'Institute Quota' },
      ],
    },
    {
      value: 'aiapget',
      label: 'AIAPGET',
      icon: 'FlaskConical',
      desc: 'Ayush PG Entrance',
      bodies: [
        { key: 'ayush-ai', name: 'All India Ayush PG', quota: 'All India' },
        { key: 'ayush-ap', name: 'Andhra Pradesh – Ayush PG', quota: 'Government Quota' },
        { key: 'ayush-gj', name: 'Gujarat – Ayush PG', quota: 'Government Quota' },
        { key: 'ayush-mh', name: 'Maharashtra – Ayush PG', quota: 'Government Quota and Management Quota' },
        { key: 'ayush-up', name: 'Uttar Pradesh – Ayush PG', quota: 'Government Quota and Management Quota' },
      ],
    },
  ];

  for (const option of counsellingData) {
    const { bodies, ...optionData } = option;
    await prisma.counsellingOption.create({
      data: {
        ...optionData,
        bodies: {
          create: bodies,
        },
      },
    });
  }

  console.log(`✅ Seeded ${counsellingData.length} counselling options with ${counsellingData.reduce((sum, opt) => sum + opt.bodies.length, 0)} bodies`);

  // Summary
  const authorCount = await prisma.author.count();
  const blogCount = await prisma.blogs.count();
  const faqCount = await prisma.fAQ.count();
  const linkCount = await prisma.socialLink.count();
  const counsellingCount = await prisma.counsellingOption.count();
  const bodyCount = await prisma.body.count();

  console.log('\n📊 Seed Summary:');
  console.log(`   Authors:           ${authorCount}`);
  console.log(`   Blogs:             ${blogCount}`);
  console.log(`   FAQs:              ${faqCount}`);
  console.log(`   Social Links:      ${linkCount}`);
  console.log(`   Counselling Types: ${counsellingCount}`);
  console.log(`   Counselling Bodies: ${bodyCount}`);
  console.log('\n🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
