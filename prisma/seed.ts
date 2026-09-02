import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding data Dream Academy Phase 5...');

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

  // Seed Quiz 1
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

  // Seed Questions & Options for Quiz 1
  await seedQuizQuestions(quiz1.id, [
    {
      orderIndex: 1,
      questionText: 'Apa fokus utama saat melatih speaking bahasa Inggris untuk pemula?',
      explanation: 'Prinsip "Fluency over Perfection" menekankan bahwa keberanian menyampaikan pesan adalah prioritas utama pemula.',
      options: [
        { optionText: 'Menghafal 16 rumus tenses secara sempurna sebelum bicara', isCorrect: false, orderIndex: 1 },
        { optionText: 'Menyampaikan pesan secara percaya diri dan jelas tanpa takut salah', isCorrect: true, orderIndex: 2 },
        { optionText: 'Menghindari berbicara sampai aksen seperti native speaker', isCorrect: false, orderIndex: 3 },
        { optionText: 'Menerjemahkan kata demi kata di dalam kepala sebelum bicara', isCorrect: false, orderIndex: 4 },
      ],
    },
    {
      orderIndex: 2,
      questionText: 'Mengapa overthinking tata bahasa saat berbicara dapat menghambat kemajuan?',
      explanation: 'Overthinking tata bahasa memicu keraguan (hesitation) yang mengganggu kelancaran percakapan alami.',
      options: [
        { optionText: 'Karena membuat otak terlalu sibuk menganalisis aturan sehingga kehilangan ritme bicara', isCorrect: true, orderIndex: 1 },
        { optionText: 'Karena tenses bahasa Inggris terlalu sedikit untuk dipelajari', isCorrect: false, orderIndex: 2 },
        { optionText: 'Karena lawan bicara selalu menuntut kesempurnaan grammar', isCorrect: false, orderIndex: 3 },
        { optionText: 'Karena berbicara tanpa berpikir selalu menghasilkan kalimat sempurna', isCorrect: false, orderIndex: 4 },
      ],
    },
    {
      orderIndex: 3,
      questionText: 'Berapa durasi latihan speaking harian yang direkomendasikan untuk membangun konsistensi?',
      explanation: 'Latihan rutin 10–15 menit per hari melatih memori otot mulut (muscle memory) dan membentuk kebiasaan jangka panjang.',
      options: [
        { optionText: '3 jam seminggu sekali saja di akhir pekan', isCorrect: false, orderIndex: 1 },
        { optionText: '10–15 menit setiap hari dengan suara lantang', isCorrect: true, orderIndex: 2 },
        { optionText: 'Cukup membaca materi dalam hati tanpa bersuara', isCorrect: false, orderIndex: 3 },
        { optionText: 'Hanya berlatih saat akan menghadapi ujian resmi', isCorrect: false, orderIndex: 4 },
      ],
    },
  ]);

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

  await seedQuizQuestions(quiz2.id, [
    {
      orderIndex: 1,
      questionText: 'Manakah struktur dasar perkenalan diri (self-introduction) yang paling runtut dan natural?',
      explanation: 'Struktur standar: Greeting pembuka yang ramah, perkenalan nama, tujuan/minat relevan, dan penutup yang bersahabat.',
      options: [
        { optionText: 'Closing -> Hobi -> Nama -> Greeting', isCorrect: false, orderIndex: 1 },
        { optionText: 'Greeting -> Nama -> Latar Belakang / Minat -> Closing yang ramah', isCorrect: true, orderIndex: 2 },
        { optionText: 'Menyebutkan seluruh riwayat hidup dari masa kecil -> Closing', isCorrect: false, orderIndex: 3 },
        { optionText: 'Langsung meminta kontak tanpa menyebutkan nama', isCorrect: false, orderIndex: 4 },
      ],
    },
    {
      orderIndex: 2,
      questionText: 'Frase mana yang paling tepat dan sopan untuk menyatakan tujuan belajar bahasa Inggris?',
      explanation: 'Mengungkapkan tujuan positif memberikan kesan percaya diri dan antusias.',
      options: [
        { optionText: 'I am learning English to expand my career horizons and connect with others.', isCorrect: true, orderIndex: 1 },
        { optionText: 'I speak English because I must do it without choice.', isCorrect: false, orderIndex: 2 },
        { optionText: 'English is hard so I am forced to study it.', isCorrect: false, orderIndex: 3 },
        { optionText: 'My English is bad so please don\'t talk to me.', isCorrect: false, orderIndex: 4 },
      ],
    },
    {
      orderIndex: 3,
      questionText: 'Selain kata-kata yang diucapkan, elemen non-verbal apa yang krusial saat berkenalan?',
      explanation: 'Kontak mata dan intonasi yang hangat membangun koneksi interpersonal secara instan.',
      options: [
        { optionText: 'Menundukkan kepala agar tidak terlihat gugup', isCorrect: false, orderIndex: 1 },
        { optionText: 'Berbicara secepat mungkin tanpa jeda bernapas', isCorrect: false, orderIndex: 2 },
        { optionText: 'Kontak mata wajar, senyuman ramah, dan artikulasi jelas', isCorrect: true, orderIndex: 3 },
        { optionText: 'Membaca teks perkenalan tanpa ekspresi wajah', isCorrect: false, orderIndex: 4 },
      ],
    },
  ]);

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

  await seedQuizQuestions(quiz3.id, [
    {
      orderIndex: 1,
      questionText: 'Topik mana yang paling aman dan ramah untuk memulai obrolan santai (small talk)?',
      explanation: 'Cuaca, akhir pekan, dan topik umum adalah safe topics yang tidak menyinggung privasi lawan bicara.',
      options: [
        { optionText: 'Pertanyaan pribadi tentang gaji atau status finansial', isCorrect: false, orderIndex: 1 },
        { optionText: 'Cuaca hari ini, rencana akhir pekan, atau hobi santai', isCorrect: true, orderIndex: 2 },
        { optionText: 'Topik politik yang kontroversial', isCorrect: false, orderIndex: 3 },
        { optionText: 'Mengkritik penampilan fisik lawan bicara', isCorrect: false, orderIndex: 4 },
      ],
    },
    {
      orderIndex: 2,
      questionText: 'Mengapa pertanyaan terbuka (open-ended questions) lebih disarankan dalam small talk?',
      explanation: 'Open-ended questions (misal: "How was your weekend?") mengundang cerita lebih lanjut.',
      options: [
        { optionText: 'Karena memancing jawaban bercerita yang menjaga obrolan tetap mengalir', isCorrect: true, orderIndex: 1 },
        { optionText: 'Karena hanya butuh jawaban singkat Yes atau No', isCorrect: false, orderIndex: 2 },
        { optionText: 'Karena membuat lawan bicara bingung dan cepat pergi', isCorrect: false, orderIndex: 3 },
        { optionText: 'Karena menguji kemampuan tata bahasa lawan bicara', isCorrect: false, orderIndex: 4 },
      ],
    },
    {
      orderIndex: 3,
      questionText: 'Contoh kalimat pertanyaan pembuka small talk yang tepat adalah:',
      explanation: '"How has your week been going so far?" adalah pembuka obrolan yang sangat umum dan hangat.',
      options: [
        { optionText: 'Why are you standing here alone?', isCorrect: false, orderIndex: 1 },
        { optionText: 'How has your week been going so far?', isCorrect: true, orderIndex: 2 },
        { optionText: 'Tell me all your secrets right now.', isCorrect: false, orderIndex: 3 },
        { optionText: 'Do you know all grammar rules?', isCorrect: false, orderIndex: 4 },
      ],
    },
    {
      orderIndex: 4,
      questionText: 'Bagaimana cara menunjukkan Active Listening saat lawan bicara sedang bercerita?',
      explanation: 'Respons verbal pendek (backchanneling) membuktikan bahwa kita benar-benar menyimak dengan antusias.',
      options: [
        { optionText: 'Melihat layar handphone secara terus-menerus', isCorrect: false, orderIndex: 1 },
        { optionText: 'Memotong kalimatnya dengan cerita tentang diri sendiri', isCorrect: false, orderIndex: 2 },
        { optionText: 'Merespons dengan frase seperti "Oh really?", "That sounds exciting!"', isCorrect: true, orderIndex: 3 },
        { optionText: 'Diam membisu tanpa respons verbal atau visual', isCorrect: false, orderIndex: 4 },
      ],
    },
  ]);

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

  await seedQuizQuestions(quiz4.id, [
    {
      orderIndex: 1,
      questionText: 'Frase mana yang tepat untuk menyatakan opini pribadi secara lugas dan sopan?',
      explanation: '"In my opinion..." adalah cara baku dan sopan untuk mengawali pandangan pribadi.',
      options: [
        { optionText: 'Everybody knows that you are wrong.', isCorrect: false, orderIndex: 1 },
        { optionText: 'In my opinion, daily speaking practice is more effective than memorizing grammar.', isCorrect: true, orderIndex: 2 },
        { optionText: 'I don\'t care about what anyone thinks.', isCorrect: false, orderIndex: 3 },
        { optionText: 'You must agree with my opinion immediately.', isCorrect: false, orderIndex: 4 },
      ],
    },
    {
      orderIndex: 2,
      questionText: 'Bagaimana cara menyatakan kesetujuan penuh (complete agreement) secara antusias?',
      explanation: '"I completely agree with you" menegaskan kesepahaman secara positif.',
      options: [
        { optionText: 'Maybe, but I don\'t think so.', isCorrect: false, orderIndex: 1 },
        { optionText: 'I disagree completely.', isCorrect: false, orderIndex: 2 },
        { optionText: 'I completely agree with you, that makes total sense!', isCorrect: true, orderIndex: 3 },
        { optionText: 'Whatever you say doesn\'t matter.', isCorrect: false, orderIndex: 4 },
      ],
    },
    {
      orderIndex: 3,
      questionText: 'Jika ingin menyatakan ketidaksetujuan secara santun (polite disagreement), ungkapan mana yang paling tepat?',
      explanation: 'Mengapresiasi sudut pandang lawan bicara sebelum menyampaikan alternatif ("I see your point, but...") adalah teknik diplomatis yang sangat baik.',
      options: [
        { optionText: 'You are totally wrong and making no sense.', isCorrect: false, orderIndex: 1 },
        { optionText: 'I see your point, but from my perspective daily practice is crucial.', isCorrect: true, orderIndex: 2 },
        { optionText: 'Stop talking because your opinion is bad.', isCorrect: false, orderIndex: 3 },
        { optionText: 'No way, that is ridiculous.', isCorrect: false, orderIndex: 4 },
      ],
    },
    {
      orderIndex: 4,
      questionText: 'Apa manfaat menggunakan frase pembuka opini seperti "From my perspective..."?',
      explanation: 'Frase perspektif membuka dialog kolaboratif yang dewasa dalam percakapan profesional maupun sosial.',
      options: [
        { optionText: 'Membuat argumen terdengar profesional dan memberi ruang bagi diskusi terbuka', isCorrect: true, orderIndex: 1 },
        { optionText: 'Memaksa orang lain untuk langsung menyerah', isCorrect: false, orderIndex: 2 },
        { optionText: 'Menunjukkan bahwa kita tidak yakin dengan apa yang kita katakan', isCorrect: false, orderIndex: 3 },
        { optionText: 'Memperpanjang kalimat tanpa arti yang jelas', isCorrect: false, orderIndex: 4 },
      ],
    },
  ]);

  console.log(`✅ Seed selesai: 1 Kursus, 2 Modul, 4 Lesson, dan 4 Checkpoint Quizzes dengan pertanyaan & opsi lengkap berhasil disiapkan secara idempoten.`);
}

async function seedQuizQuestions(
  quizId: string,
  questions: Array<{
    orderIndex: number;
    questionText: string;
    explanation: string;
    options: Array<{ optionText: string; isCorrect: boolean; orderIndex: number }>;
  }>
) {
  // Idempotent clean and insert for questions of this quiz
  for (const q of questions) {
    const existingQ = await prisma.quizQuestion.findFirst({
      where: { quizId, orderIndex: q.orderIndex },
    });

    let questionId: string;
    if (existingQ) {
      const updated = await prisma.quizQuestion.update({
        where: { id: existingQ.id },
        data: {
          questionText: q.questionText,
          explanation: q.explanation,
        },
      });
      questionId = updated.id;
    } else {
      const created = await prisma.quizQuestion.create({
        data: {
          quizId,
          orderIndex: q.orderIndex,
          questionText: q.questionText,
          explanation: q.explanation,
        },
      });
      questionId = created.id;
    }

    // Seed Options for question
    for (const opt of q.options) {
      const existingOpt = await prisma.quizOption.findFirst({
        where: { questionId, orderIndex: opt.orderIndex },
      });

      if (existingOpt) {
        await prisma.quizOption.update({
          where: { id: existingOpt.id },
          data: {
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
          },
        });
      } else {
        await prisma.quizOption.create({
          data: {
            questionId,
            orderIndex: opt.orderIndex,
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
          },
        });
      }
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
