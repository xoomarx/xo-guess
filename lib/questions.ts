export type Question = {
  type: "flag" | "logo";
  imageUrl: string;
  answer: string;
  acceptedAnswers: string[];
};

export type GameMode = "flags" | "logos" | "mix";

const FLAG_CODES = [
  "ad","ae","af","ag","al","am","ao","ar","at","au","az",
  "ba","bb","bd","be","bf","bg","bh","bi","bj","bn","bo","br","bs","bt","bw","by","bz",
  "ca","cd","cf","cg","ch","ci","cl","cm","cn","co","cr","cu","cv","cy","cz",
  "de","dj","dk","dm","do","dz",
  "ec","ee","eg","er","es","et",
  "fi","fj","fr",
  "ga","gb","gd","ge","gh","gm","gn","gq","gr","gt","gw","gy",
  "hn","hr","ht","hu",
  "id","ie","il","in","iq","ir","is","it",
  "jm","jo","jp",
  "ke","kg","kh","ki","km","kn","kp","kr","kw","kz",
  "la","lb","lc","li","lk","lr","ls","lt","lu","lv","ly",
  "ma","mc","md","me","mg","mk","ml","mm","mn","mr","mt","mu","mv","mw","mx","my","mz",
  "na","ne","ng","ni","nl","no","np","nr","nz",
  "om",
  "pa","pe","pg","ph","pk","pl","ps","pt","pw","py",
  "qa",
  "ro","rs","ru","rw",
  "sa","sb","sc","sd","se","sg","si","sk","sl","sm","sn","so","sr","ss","st","sv","sy","sz",
  "td","tg","th","tj","tl","tm","tn","to","tr","tt","tv","tw","tz",
  "ua","ug","us","uy","uz",
  "va","vc","ve","vn","vu",
  "ws",
  "ye",
  "za","zm","zw",
] as const;

const FLAG_ALIASES: Record<string, string[]> = {
  us: ["usa", "america", "united states", "united states of america"],
  gb: ["uk", "britain", "great britain", "england", "united kingdom"],
  kr: ["south korea", "korea", "republic of korea"],
  kp: ["north korea", "dprk"],
  ae: ["uae", "emirates", "united arab emirates"],
  cz: ["czechia", "czech republic"],
  nl: ["holland", "netherlands"],
  br: ["brasil", "brazil"],
  lb: ["liban", "lebanon"],
  ru: ["russia", "russian federation"],
  cn: ["china", "prc", "peoples republic of china"],
  de: ["germany", "deutschland"],
  fr: ["france"],
  it: ["italy"],
  es: ["spain"],
  jp: ["japan"],
  au: ["australia"],
  ca: ["canada"],
  in: ["india"],
  mx: ["mexico"],
  za: ["south africa"],
  ng: ["nigeria"],
  eg: ["egypt"],
  sa: ["saudi arabia"],
  tr: ["turkey", "turkiye"],
  id: ["indonesia"],
  pk: ["pakistan"],
  bd: ["bangladesh"],
  vn: ["vietnam"],
  ph: ["philippines"],
  th: ["thailand"],
  my: ["malaysia"],
  sg: ["singapore"],
  nz: ["new zealand"],
  ch: ["switzerland"],
  se: ["sweden"],
  no: ["norway"],
  dk: ["denmark"],
  fi: ["finland"],
  pt: ["portugal"],
  pl: ["poland"],
  ua: ["ukraine"],
  gr: ["greece"],
  ar: ["argentina"],
  co: ["colombia"],
  cl: ["chile"],
  pe: ["peru"],
  ve: ["venezuela"],
  ma: ["morocco"],
  dz: ["algeria"],
  tn: ["tunisia"],
  ke: ["kenya"],
  et: ["ethiopia"],
  gh: ["ghana"],
  tz: ["tanzania"],
  ug: ["uganda"],
  cm: ["cameroon"],
  ci: ["ivory coast", "cote divoire"],
  il: ["israel"],
  ir: ["iran"],
  iq: ["iraq"],
  sy: ["syria"],
  jo: ["jordan"],
  lb: ["lebanon"],
  kw: ["kuwait"],
  qa: ["qatar"],
  bh: ["bahrain"],
  om: ["oman"],
  ye: ["yemen"],
  af: ["afghanistan"],
  kz: ["kazakhstan"],
  uz: ["uzbekistan"],
  az: ["azerbaijan"],
  ge: ["georgia"],
  am: ["armenia"],
  by: ["belarus"],
  md: ["moldova"],
  ro: ["romania"],
  bg: ["bulgaria"],
  rs: ["serbia"],
  hr: ["croatia"],
  ba: ["bosnia", "bosnia and herzegovina"],
  si: ["slovenia"],
  sk: ["slovakia"],
  hu: ["hungary"],
  at: ["austria"],
  be: ["belgium"],
  lu: ["luxembourg"],
  ie: ["ireland"],
  is: ["iceland"],
  ee: ["estonia"],
  lv: ["latvia"],
  lt: ["lithuania"],
  cu: ["cuba"],
  do: ["dominican republic"],
  pr: ["puerto rico"],
  jm: ["jamaica"],
  ht: ["haiti"],
  pa: ["panama"],
  cr: ["costa rica"],
  gt: ["guatemala"],
  hn: ["honduras"],
  sv: ["el salvador"],
  ni: ["nicaragua"],
  bo: ["bolivia"],
  py: ["paraguay"],
  uy: ["uruguay"],
  ec: ["ecuador"],
};

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

// Curated logo list — verified slugs on simpleicons.org
const LOGOS: [string, string, string[]][] = [
  // Social & Communication
  ["youtube", "YouTube", ["yt", "you tube"]],
  ["netflix", "Netflix", []],
  ["instagram", "Instagram", ["ig", "insta"]],
  ["tiktok", "TikTok", ["tik tok"]],
  ["discord", "Discord", []],
  ["snapchat", "Snapchat", ["snap"]],
  ["facebook", "Facebook", ["fb"]],
  ["reddit", "Reddit", []],
  ["whatsapp", "WhatsApp", ["whats app"]],
  ["telegram", "Telegram", []],
  ["twitter", "Twitter", ["x", "x.com"]],
  ["linkedin", "LinkedIn", []],
  ["pinterest", "Pinterest", []],
  ["twitch", "Twitch", []],
  ["zoom", "Zoom", []],
  ["slack", "Slack", []],

  // Productivity & Dev
  ["notion", "Notion", []],
  ["figma", "Figma", []],
  ["canva", "Canva", []],
  ["github", "GitHub", ["git hub"]],
  ["gitlab", "GitLab", []],
  ["vercel", "Vercel", []],
  ["docker", "Docker", []],
  ["stripe", "Stripe", []],
  ["shopify", "Shopify", []],
  ["wordpress", "WordPress", ["wp"]],
  ["cloudflare", "Cloudflare", []],
  ["openai", "OpenAI", ["open ai", "chatgpt"]],

  // Food & Beverage
  ["mcdonalds", "McDonald's", ["mcdonalds", "mcdonald", "mcd"]],
  ["starbucks", "Starbucks", []],
  ["cocacola", "Coca-Cola", ["coke", "coca cola"]],
  ["pepsi", "Pepsi", []],
  ["redbull", "Red Bull", ["red bull", "redbull"]],
  ["kfc", "KFC", ["kentucky fried chicken"]],
  ["subway", "Subway", []],
  ["dominos", "Domino's", ["dominos", "dominoes"]],

  // Fashion & Retail
  ["nike", "Nike", []],
  ["adidas", "Adidas", []],
  ["puma", "Puma", []],
  ["vans", "Vans", []],
  ["converse", "Converse", []],
  ["gucci", "Gucci", []],
  ["zara", "Zara", []],
  ["hm", "H&M", ["h&m", "h and m"]],
  ["supreme", "Supreme", []],

  // Automotive
  ["tesla", "Tesla", []],
  ["bmw", "BMW", []],
  ["mercedes", "Mercedes", ["mercedes benz", "mercedes-benz"]],
  ["audi", "Audi", []],
  ["toyota", "Toyota", []],
  ["honda", "Honda", []],
  ["ford", "Ford", []],
  ["volkswagen", "Volkswagen", ["vw"]],
  ["ferrari", "Ferrari", []],
  ["lamborghini", "Lamborghini", ["lambo"]],
  ["porsche", "Porsche", []],
  ["hyundai", "Hyundai", []],
  ["kia", "Kia", []],
  ["nissan", "Nissan", []],
  ["chevrolet", "Chevrolet", ["chevy"]],
  ["lexus", "Lexus", []],
  ["jeep", "Jeep", []],
  ["peugeot", "Peugeot", []],
  ["renault", "Renault", []],
  ["mazda", "Mazda", []],

  // Tech & Electronics
  ["apple", "Apple", []],
  ["samsung", "Samsung", []],
  ["google", "Google", []],
  ["microsoft", "Microsoft", []],
  ["amazon", "Amazon", []],
  ["spotify", "Spotify", []],
  ["paypal", "PayPal", ["pay pal"]],
  ["visa", "Visa", []],
  ["mastercard", "Mastercard", ["master card"]],
  ["intel", "Intel", []],
  ["nvidia", "NVIDIA", ["nvidia", "nvdia"]],
  ["amd", "AMD", []],
  ["sony", "Sony", []],
  ["lg", "LG", []],
  ["huawei", "Huawei", []],
  ["xiaomi", "Xiaomi", []],
  ["lenovo", "Lenovo", []],
  ["dell", "Dell", []],
  ["hp", "HP", ["hewlett packard"]],
  ["asus", "ASUS", []],
  ["philips", "Philips", []],

  // Gaming
  ["playstation", "PlayStation", ["ps", "ps4", "ps5"]],
  ["xbox", "Xbox", []],
  ["nintendo", "Nintendo", []],
  ["steam", "Steam", []],
  ["epicgames", "Epic Games", ["epic", "fortnite"]],
  ["roblox", "Roblox", []],
  ["ea", "EA", ["electronic arts"]],
  ["ubisoft", "Ubisoft", []],
  ["riotgames", "Riot Games", ["riot"]],
  ["rockstargames", "Rockstar Games", ["rockstar", "gta"]],

  // Sports & Entertainment
  ["spotify", "Spotify", []],
  ["nba", "NBA", []],
  ["nfl", "NFL", []],
  ["formula1", "Formula 1", ["f1", "formula one"]],
  ["uefa", "UEFA", []],

  // Travel & Delivery
  ["uber", "Uber", []],
  ["airbnb", "Airbnb", ["air bnb"]],
  ["ubereats", "Uber Eats", ["uber eats"]],

  // Education
  ["duolingo", "Duolingo", []],
];

export const FLAG_QUESTIONS: Question[] = FLAG_CODES.map((code) => {
  const answer = regionNames.of(code.toUpperCase()) || code.toUpperCase();
  return {
    type: "flag" as const,
    imageUrl: `https://flagcdn.com/w320/${code}.png`,
    answer,
    acceptedAnswers: [answer, ...(FLAG_ALIASES[code] || [])],
  };
});

export const LOGO_QUESTIONS: Question[] = LOGOS.map(([slug, answer, extras]) => ({
  type: "logo" as const,
  imageUrl: `https://cdn.simpleicons.org/${slug}`,
  answer,
  acceptedAnswers: [answer, ...extras],
}));

export const QUESTIONS: Question[] = [...FLAG_QUESTIONS, ...LOGO_QUESTIONS];

export function getQuestionsByMode(mode: GameMode): Question[] {
  if (mode === "flags") return FLAG_QUESTIONS;
  if (mode === "logos") return LOGO_QUESTIONS;
  return QUESTIONS;
}

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
  return getRandomQuestionByMode(usedIndexes, "mix");
}

export function getRandomQuestionByMode(
  usedIndexes: number[] = [],
  mode: GameMode = "mix"
) {
  const pool = getQuestionsByMode(mode);

  // Map to global QUESTIONS indexes so Firebase stays consistent
  const poolWithIndexes = pool.map((q) => ({
    question: q,
    index: QUESTIONS.indexOf(q),
  }));

  const available = poolWithIndexes.filter(
    ({ index }) => !usedIndexes.includes(index)
  );

  const finalPool = available.length > 0 ? available : poolWithIndexes;
  const picked = finalPool[Math.floor(Math.random() * finalPool.length)];

  return { index: picked.index, question: picked.question };
}
