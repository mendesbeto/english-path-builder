export interface LessonTemplate {
  id: string;
  label: string;
  emoji: string;
  description: string;
  form: {
    title: string;
    description: string;
    type: string;
    content: string;
    media_url: string;
    duration_minutes: number;
  };
  exercises?: { question: string; options: string[]; correct_answer: string; points: number }[];
}

export const LESSON_TEMPLATES: LessonTemplate[] = [
  {
    id: "quiz",
    label: "Quiz",
    emoji: "🧩",
    description: "Múltipla escolha com 3 perguntas prontas",
    form: {
      title: "Quiz — [tema]",
      description: "Teste rápido de múltipla escolha sobre [tema].",
      type: "quiz",
      content:
        "Instruções:\n1. Leia cada pergunta com atenção.\n2. Escolha apenas uma alternativa.\n3. Você pode revisar suas respostas ao final.",
      media_url: "",
      duration_minutes: 10,
    },
    exercises: [
      {
        question: "Choose the correct option: She ___ a teacher.",
        options: ["is", "are", "am", "be"],
        correct_answer: "is",
        points: 10,
      },
      {
        question: "Complete: They ___ to school every day.",
        options: ["go", "goes", "going", "gone"],
        correct_answer: "go",
        points: 10,
      },
      {
        question: "Which sentence is correct?",
        options: ["He don't like it", "He doesn't like it", "He not like it", "He no like it"],
        correct_answer: "He doesn't like it",
        points: 10,
      },
    ],
  },
  {
    id: "listening",
    label: "Listening",
    emoji: "🎧",
    description: "Áudio + perguntas de compreensão",
    form: {
      title: "Listening — [tema]",
      description: "Compreensão auditiva com perguntas sobre o áudio.",
      type: "audio",
      content:
        "Instruções:\n1. Ouça o áudio uma vez sem pausar.\n2. Ouça novamente e faça anotações.\n3. Responda às perguntas de compreensão.\n\nVocabulário-chave:\n- [palavra] — [tradução]\n- [palavra] — [tradução]",
      media_url: "https://",
      duration_minutes: 15,
    },
    exercises: [
      {
        question: "What is the main topic of the audio?",
        options: ["Daily routine", "Travel plans", "Job interview", "Shopping"],
        correct_answer: "Daily routine",
        points: 10,
      },
      {
        question: "How many people are speaking?",
        options: ["One", "Two", "Three", "Four"],
        correct_answer: "Two",
        points: 10,
      },
    ],
  },
  {
    id: "writing",
    label: "Escrita",
    emoji: "✍️",
    description: "Produção escrita com critérios de avaliação",
    form: {
      title: "Writing — [tema]",
      description: "Atividade de produção escrita com critérios claros.",
      type: "writing",
      content:
        "Tarefa:\nEscreva um texto de 80–120 palavras sobre [tema].\n\nEstrutura sugerida:\n1. Introdução — apresente o assunto.\n2. Desenvolvimento — 2 ideias com exemplos.\n3. Conclusão — sua opinião final.\n\nCritérios de avaliação:\n- Gramática e tempos verbais\n- Vocabulário adequado ao nível\n- Coesão e conectivos (and, but, because, however)\n- Cumprimento do número de palavras",
      media_url: "",
      duration_minutes: 25,
    },
  },
  {
    id: "speaking",
    label: "Pronúncia",
    emoji: "🗣️",
    description: "Frases-modelo para gravação de voz",
    form: {
      title: "Pronunciation — [som/tema]",
      description: "Prática de pronúncia com gravação de voz.",
      type: "speaking",
      content:
        "Instruções:\n1. Ouça o modelo e repita em voz alta.\n2. Grave sua voz usando o botão de gravação.\n3. Compare com o modelo e regrave se necessário.\n\nFrases para praticar:\n- \"Think about the three thin things.\"\n- \"She sells seashells by the seashore.\"\n- \"I would like a cup of coffee, please.\"\n\nFoco: entonação, ritmo e sons /θ/ e /ð/.",
      media_url: "",
      duration_minutes: 15,
    },
  },
];

export const EXERCISE_TEMPLATES: {
  id: string;
  label: string;
  question: string;
  options: string[];
  correctIndex: number;
  points: number;
}[] = [
  {
    id: "gap",
    label: "Complete a lacuna",
    question: "Complete: She ___ to work by bus.",
    options: ["goes", "go", "going", "gone"],
    correctIndex: 0,
    points: 10,
  },
  {
    id: "listening",
    label: "Compreensão de áudio",
    question: "According to the audio, what does the speaker do on weekends?",
    options: ["Studies", "Travels", "Works", "Rests"],
    correctIndex: 0,
    points: 10,
  },
  {
    id: "vocab",
    label: "Vocabulário",
    question: "What is the meaning of \"however\"?",
    options: ["no entanto", "portanto", "porque", "além disso"],
    correctIndex: 0,
    points: 10,
  },
  {
    id: "pronunciation",
    label: "Pronúncia",
    question: "Which word has the /θ/ sound?",
    options: ["think", "this", "those", "there"],
    correctIndex: 0,
    points: 10,
  },
];
