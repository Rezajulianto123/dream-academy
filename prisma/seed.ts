import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding data Dream Academy...');

  // 1. Seed Course: English for Confident Speaking
  const course = await prisma.course.upsert({
    where: { slug: 'english-for-confident-speaking' },
    update: {
      title: 'English for Confident Speaking: Dari Nol Sampai Berani Ngomong',
      description: 'Kuasai percakapan bahasa Inggris sehari-hari dengan fokus pada keberanian dan kelancaran berbicara (fluency over perfection) tanpa cemas salah grammar.',
      level: 'beginner',
      isPublished: true,
      orderIndex: 1,
    },
    create: {
      title: 'English for Confident Speaking: Dari Nol Sampai Berani Ngomong',
      slug: 'english-for-confident-speaking',
      description: 'Kuasai percakapan bahasa Inggris sehari-hari dengan fokus pada keberanian dan kelancaran berbicara (fluency over perfection) tanpa cemas salah grammar.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=600&auto=format&fit=crop',
      level: 'beginner',
      isPublished: true,
      orderIndex: 1,
    },
  });

  console.log(`✅ Course seeded: ${course.title} (${course.id})`);

  // 2. Seed Module 1: Mindset & Fondasi Keberanian
  const module1 = await prisma.module.upsert({
    where: {
      uq_module_course_slug: {
        courseId: course.id,
        slug: 'mindset-fondasi-keberanian',
      },
    },
    update: {
      title: 'Module 1: Mindset & Fondasi Keberanian Berbicara',
      description: 'Membongkar rasa takut salah grammar dan membangun rasa percaya diri saat mulai berbicara bahasa Inggris.',
      orderIndex: 1,
    },
    create: {
      courseId: course.id,
      title: 'Module 1: Mindset & Fondasi Keberanian Berbicara',
      slug: 'mindset-fondasi-keberanian',
      description: 'Membongkar rasa takut salah grammar dan membangun rasa percaya diri saat mulai berbicara bahasa Inggris.',
      orderIndex: 1,
    },
  });

  // 3. Seed Lesson 1
  const lesson1 = await prisma.lesson.upsert({
    where: {
      uq_lesson_module_slug: {
        moduleId: module1.id,
        slug: 'mindset-fluency-over-perfection',
      },
    },
    update: {
      title: 'Lesson 1: Mindset Fluency over Perfection',
      youtubeVideoId: 'dQw4w9WgXcQ',
      summaryContent: `### Rangkuman Materi\n- **Fluency over Perfection**: Keberanian menyampaikan pesan jauh lebih penting daripada tata bahasa sempurna di tahap awal.\n- **Hindari Overthinking**: Jangan biarkan rasa takut salah menghambat proses latihan.\n- **Konsistensi Harian**: Luangkan 10-15 menit setiap hari untuk berbicara dengan suara lantang.`,
      speakingPrompt: `Katakan dengan lantang dan percaya diri:\n"I speak English with confidence and I am not afraid of making mistakes. Every mistake is a step forward!"`,
      orderIndex: 1,
    },
    create: {
      moduleId: module1.id,
      title: 'Lesson 1: Mindset Fluency over Perfection',
      slug: 'mindset-fluency-over-perfection',
      youtubeVideoId: 'dQw4w9WgXcQ',
      summaryContent: `### Rangkuman Materi\n- **Fluency over Perfection**: Keberanian menyampaikan pesan jauh lebih penting daripada tata bahasa sempurna di tahap awal.\n- **Hindari Overthinking**: Jangan biarkan rasa takut salah menghambat proses latihan.\n- **Konsistensi Harian**: Luangkan 10-15 menit setiap hari untuk berbicara dengan suara lantang.`,
      speakingPrompt: `Katakan dengan lantang dan percaya diri:\n"I speak English with confidence and I am not afraid of making mistakes. Every mistake is a step forward!"`,
      orderIndex: 1,
    },
  });

  // Seed Quiz for Lesson 1
  const quiz1 = await prisma.quiz.upsert({
    where: { lessonId: lesson1.id },
    update: {
      title: 'Checkpoint Quiz: Mindset of Fluency',
      passingScore: 70,
    },
    create: {
      lessonId: lesson1.id,
      title: 'Checkpoint Quiz: Mindset of Fluency',
      passingScore: 70,
    },
  });

  // 4. Seed Lesson 2
  const lesson2 = await prisma.lesson.upsert({
    where: {
      uq_lesson_module_slug: {
        moduleId: module1.id,
        slug: 'self-introduction-natural',
      },
    },
    update: {
      title: 'Lesson 2: Teknik Self-Introduction yang Natural',
      youtubeVideoId: 'eX2qmM7l4hw',
      summaryContent: `### Rangkuman Materi\n- **Struktur Perkenalan**: Greeting -> Nama -> Latar Belakang/Tujuan -> Closing ramah.\n- **Intonasi & Kontak Mata**: Gunakan nada bicara ramah dan artikulasi yang jelas.\n- **Frase Kunci**: "Nice to meet you", "I'm currently focusing on..."`,
      speakingPrompt: `Perkenalkan dirimu dalam bahasa Inggris:\n"Hi everyone, my name is Reza. I am learning English to expand my career horizons and connect with the world!"`,
      orderIndex: 2,
    },
    create: {
      moduleId: module1.id,
      title: 'Lesson 2: Teknik Self-Introduction yang Natural',
      slug: 'self-introduction-natural',
      youtubeVideoId: 'eX2qmM7l4hw',
      summaryContent: `### Rangkuman Materi\n- **Struktur Perkenalan**: Greeting -> Nama -> Latar Belakang/Tujuan -> Closing ramah.\n- **Intonasi & Kontak Mata**: Gunakan nada bicara ramah dan artikulasi yang jelas.\n- **Frase Kunci**: "Nice to meet you", "I'm currently focusing on..."`,
      speakingPrompt: `Perkenalkan dirimu dalam bahasa Inggris:\n"Hi everyone, my name is Reza. I am learning English to expand my career horizons and connect with the world!"`,
      orderIndex: 2,
    },
  });

  const quiz2 = await prisma.quiz.upsert({
    where: { lessonId: lesson2.id },
    update: {
      title: 'Checkpoint Quiz: Self-Introduction',
      passingScore: 70,
    },
    create: {
      lessonId: lesson2.id,
      title: 'Checkpoint Quiz: Self-Introduction',
      passingScore: 70,
    },
  });

  // 5. Seed Module 2: Percakapan Praktis Situasi Nyata
  const module2 = await prisma.module.upsert({
    where: {
      uq_module_course_slug: {
        courseId: course.id,
        slug: 'percakapan-praktis-situasi-nyata',
      },
    },
    update: {
      title: 'Module 2: Percakapan Praktis Situasi Nyata',
      description: 'Latihan percakapan sehari-hari untuk situasi obrolan santai dan interaksi sosial nyata.',
      orderIndex: 2,
    },
    create: {
      courseId: course.id,
      title: 'Module 2: Percakapan Praktis Situasi Nyata',
      slug: 'percakapan-praktis-situasi-nyata',
      description: 'Latihan percakapan sehari-hari untuk situasi obrolan santai dan interaksi sosial nyata.',
      orderIndex: 2,
    },
  });

  // 6. Seed Lesson 3
  const lesson3 = await prisma.lesson.upsert({
    where: {
      uq_lesson_module_slug: {
        moduleId: module2.id,
        slug: 'small-talk-membuka-obrolan',
      },
    },
    update: {
      title: 'Lesson 3: Small Talk & Membuka Obrolan Santai',
      youtubeVideoId: 'L_LUpnjgPso',
      summaryContent: `### Rangkuman Materi\n- **Topik Aman Small Talk**: Cuaca, kesibukan hari ini, akhir pekan, atau hobi.\n- **Open-Ended Questions**: Ajukan pertanyaan terbuka ("How was your weekend?") daripada pertanyaan ya/tidak.\n- **Active Listening**: Tanggapi dengan frase seperti "Oh really?", "That sounds exciting!"`,
      speakingPrompt: `Latih pertanyaan pembuka obrolan:\n"Hey! How has your week been going so far? Doing anything fun this weekend?"`,
      orderIndex: 1,
    },
    create: {
      moduleId: module2.id,
      title: 'Lesson 3: Small Talk & Membuka Obrolan Santai',
      slug: 'small-talk-membuka-obrolan',
      youtubeVideoId: 'L_LUpnjgPso',
      summaryContent: `### Rangkuman Materi\n- **Topik Aman Small Talk**: Cuaca, kesibukan hari ini, akhir pekan, atau hobi.\n- **Open-Ended Questions**: Ajukan pertanyaan terbuka ("How was your weekend?") daripada pertanyaan ya/tidak.\n- **Active Listening**: Tanggapi dengan frase seperti "Oh really?", "That sounds exciting!"`,
      speakingPrompt: `Latih pertanyaan pembuka obrolan:\n"Hey! How has your week been going so far? Doing anything fun this weekend?"`,
      orderIndex: 1,
    },
  });

  const quiz3 = await prisma.quiz.upsert({
    where: { lessonId: lesson3.id },
    update: {
      title: 'Checkpoint Quiz: Small Talk Essentials',
      passingScore: 70,
    },
    create: {
      lessonId: lesson3.id,
      title: 'Checkpoint Quiz: Small Talk Essentials',
      passingScore: 70,
    },
  });

  // 7. Seed Lesson 4
  const lesson4 = await prisma.lesson.upsert({
    where: {
      uq_lesson_module_slug: {
        moduleId: module2.id,
        slug: 'mengekspresikan-opini',
      },
    },
    update: {
      title: 'Lesson 4: Mengekspresikan Opini & Rasa Setuju',
      youtubeVideoId: 'kJQP7kiw5Fk',
      summaryContent: `### Rangkuman Materi\n- **Memberi Opini**: "In my opinion...", "From my perspective...", "I believe that..."\n- **Menyatakan Setuju**: "I completely agree with you", "That makes total sense."\n- **Menyatakan Tidak Setuju secara Sopan**: "I see your point, but I think..."`,
      speakingPrompt: `Sampaikan opinimu dengan tegas:\n"In my opinion, daily speaking practice is much more effective than just memorizing grammar rules from textbooks."`,
      orderIndex: 2,
    },
    create: {
      moduleId: module2.id,
      title: 'Lesson 4: Mengekspresikan Opini & Rasa Setuju',
      slug: 'mengekspresikan-opini',
      youtubeVideoId: 'kJQP7kiw5Fk',
      summaryContent: `### Rangkuman Materi\n- **Memberi Opini**: "In my opinion...", "From my perspective...", "I believe that..."\n- **Menyatakan Setuju**: "I completely agree with you", "That makes total sense."\n- **Menyatakan Tidak Setuju secara Sopan**: "I see your point, but I think..."`,
      speakingPrompt: `Sampaikan opinimu dengan tegas:\n"In my opinion, daily speaking practice is much more effective than just memorizing grammar rules from textbooks."`,
      orderIndex: 2,
    },
  });

  const quiz4 = await prisma.quiz.upsert({
    where: { lessonId: lesson4.id },
    update: {
      title: 'Checkpoint Quiz: Expressing Opinions',
      passingScore: 70,
    },
    create: {
      lessonId: lesson4.id,
      title: 'Checkpoint Quiz: Expressing Opinions',
      passingScore: 70,
    },
  });

  console.log(`✅ Seed selesai: 1 Kursus, 2 Modul, 4 Lesson, dan 4 Checkpoint Quizzes berhasil disiapkan secara idempoten.`);
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
