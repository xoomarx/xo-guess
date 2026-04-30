export type Question = {
  type: "flag" | "logo";
  imageUrl: string;
  answer: string;
  acceptedAnswers: string[];
};

const COUNTRIES = [
  ["us", "United States", ["usa", "america", "us"]],
  ["gb", "United Kingdom", ["uk", "britain", "great britain"]],
  ["fr", "France", []],
  ["de", "Germany", []],
  ["it", "Italy", []],
  ["es", "Spain", []],
  ["pt", "Portugal", []],
  ["br", "Brazil", ["brasil"]],
  ["ar", "Argentina", []],
  ["ca", "Canada", []],
  ["mx", "Mexico", []],
  ["jp", "Japan", []],
  ["cn", "China", []],
  ["kr", "South Korea", ["korea"]],
  ["in", "India", []],
  ["au", "Australia", []],
  ["nz", "New Zealand", []],
  ["lb", "Lebanon", ["liban"]],
  ["eg", "Egypt", []],
  ["sa", "Saudi Arabia", []],
  ["ae", "United Arab Emirates", ["uae"]],
  ["qa", "Qatar", []],
  ["kw", "Kuwait", []],
  ["jo", "Jordan", []],
  ["tr", "Turkey", []],
  ["gr", "Greece", []],
  ["nl", "Netherlands", ["holland"]],
  ["be", "Belgium", []],
  ["ch", "Switzerland", []],
  ["se", "Sweden", []],
  ["no", "Norway", []],
  ["dk", "Denmark", []],
  ["fi", "Finland", []],
  ["pl", "Poland", []],
  ["ua", "Ukraine", []],
  ["ru", "Russia", []],
  ["za", "South Africa", []],
  ["ma", "Morocco", []],
  ["tn", "Tunisia", []],
  ["dz", "Algeria", []],
  ["ng", "Nigeria", []],
  ["ke", "Kenya", []],
  ["id", "Indonesia", []],
  ["my", "Malaysia", []],
  ["th", "Thailand", []],
  ["vn", "Vietnam", []],
  ["ph", "Philippines", []],
  ["sg", "Singapore", []],
  ["pk", "Pakistan", []],
  ["bd", "Bangladesh", []],
  ["ir", "Iran", []],
  ["iq", "Iraq", []],
  ["ie", "Ireland", []],
  ["is", "Iceland", []],
  ["at", "Austria", []],
  ["cz", "Czech Republic", ["czechia"]],
  ["ro", "Romania", []],
  ["hu", "Hungary", []],
  ["hr", "Croatia", []],
  ["rs", "Serbia", []],
  ["al", "Albania", []],
  ["cl", "Chile", []],
  ["co", "Colombia", []],
  ["pe", "Peru", []],
  ["uy", "Uruguay", []],
  ["ve", "Venezuela", []],
];

const LOGOS = [
  ["youtube", "YouTube"],
  ["netflix", "Netflix"],
  ["apple", "Apple"],
  ["spotify", "Spotify"],
  ["playstation", "PlayStation"],
  ["xbox", "Xbox"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["discord", "Discord"],
  ["snapchat", "Snapchat"],
  ["facebook", "Facebook"],
  ["x", "X"],
  ["reddit", "Reddit"],
  ["whatsapp", "WhatsApp"],
  ["telegram", "Telegram"],
  ["mcdonalds", "McDonald's"],
  ["kfc", "KFC"],
  ["starbucks", "Starbucks"],
  ["nike", "Nike"],
  ["adidas", "Adidas"],
  ["puma", "Puma"],
  ["tesla", "Tesla"],
  ["bmw", "BMW"],
  ["mercedes", "Mercedes"],
  ["audi", "Audi"],
  ["toyota", "Toyota"],
  ["honda", "Honda"],
  ["ford", "Ford"],
  ["nissan", "Nissan"],
  ["samsung", "Samsung"],
  ["google", "Google"],
  ["microsoft", "Microsoft"],
  ["amazon", "Amazon"],
  ["paypal", "PayPal"],
  ["visa", "Visa"],
  ["mastercard", "Mastercard"],
  ["cocacola", "Coca-Cola"],
  ["pepsi", "Pepsi"],
  ["fifa", "FIFA"],
  ["nba", "NBA"],
  ["roblox", "Roblox"],
  ["minecraft", "Minecraft"],
  ["epicgames", "Epic Games"],
  ["steam", "Steam"],
  ["nintendo", "Nintendo"],
  ["ubereats", "Uber Eats"],
  ["uber", "Uber"],
  ["airbnb", "Airbnb"],
  ["duolingo", "Duolingo"],
  ["github", "GitHub"],
  ["gitlab", "GitLab"],
  ["python", "Python"],
  ["javascript", "JavaScript"],
  ["typescript", "TypeScript"],
  ["react", "React"],
  ["nextdotjs", "Next.js"],
  ["firebase", "Firebase"],
  ["vercel", "Vercel"],
];

export const QUESTIONS: Question[] = [
  ...COUNTRIES.map(([code, answer, aliases]) => ({
    type: "flag" as const,
    imageUrl: `https://flagcdn.com/w320/${code}.png`,
    answer: answer as string,
    acceptedAnswers: [answer as string, ...(aliases as string[])],
  })),

  ...LOGOS.map(([slug, answer]) => ({
    type: "logo" as const,
    imageUrl: `https://cdn.simpleicons.org/${slug}`,
    answer,
    acceptedAnswers: [answer],
  })),
];

export function normalizeAnswer(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ");
}

export function isCorrectAnswer(userAnswer: string, question: Question) {
  const normalized = normalizeAnswer(userAnswer);

  return question.acceptedAnswers.some(
    (accepted) => normalizeAnswer(accepted) === normalized
  );
}

export function getRandomQuestion(usedIndexes: number[] = []) {
  const availableIndexes = QUESTIONS.map((_, index) => index).filter(
    (index) => !usedIndexes.includes(index)
  );

  const pool = availableIndexes.length > 0 ? availableIndexes : QUESTIONS.map((_, index) => index);

  const randomIndex = pool[Math.floor(Math.random() * pool.length)];

  return {
    index: randomIndex,
    question: QUESTIONS[randomIndex],
  };
}