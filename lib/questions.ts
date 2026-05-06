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
  lb: ["lebanon", "liban"],
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

// Curated logo list — uses Clearbit domains for fewer broken logo images
const LOGOS: [string, string, string[]][] = [
  // Social & Communication
  ["youtube.com", "YouTube", ["yt", "you tube"]],
  ["netflix.com", "Netflix", []],
  ["instagram.com", "Instagram", ["ig", "insta"]],
  ["tiktok.com", "TikTok", ["tik tok"]],
  ["discord.com", "Discord", []],
  ["snapchat.com", "Snapchat", ["snap"]],
  ["facebook.com", "Facebook", ["fb"]],
  ["reddit.com", "Reddit", []],
  ["whatsapp.com", "WhatsApp", ["whats app"]],
  ["telegram.org", "Telegram", []],
  ["x.com", "X", ["twitter"]],
  ["linkedin.com", "LinkedIn", []],
  ["pinterest.com", "Pinterest", []],
  ["twitch.tv", "Twitch", []],
  ["zoom.us", "Zoom", []],
  ["slack.com", "Slack", []],

  // Productivity & Dev
  ["notion.so", "Notion", []],
  ["figma.com", "Figma", []],
  ["canva.com", "Canva", []],
  ["github.com", "GitHub", ["git hub"]],
  ["gitlab.com", "GitLab", []],
  ["vercel.com", "Vercel", []],
  ["docker.com", "Docker", []],
  ["stripe.com", "Stripe", []],
  ["shopify.com", "Shopify", []],
  ["wordpress.com", "WordPress", ["wp"]],
  ["cloudflare.com", "Cloudflare", []],
  ["openai.com", "OpenAI", ["open ai", "chatgpt"]],
  ["dropbox.com", "Dropbox", []],
  ["adobe.com", "Adobe", []],

  // Food & Beverage
  ["mcdonalds.com", "McDonald's", ["mcdonalds", "mcdonald", "mcd"]],
  ["starbucks.com", "Starbucks", []],
  ["coca-cola.com", "Coca-Cola", ["coke", "coca cola"]],
  ["pepsi.com", "Pepsi", []],
  ["redbull.com", "Red Bull", ["red bull", "redbull"]],
  ["kfc.com", "KFC", ["kentucky fried chicken"]],
  ["subway.com", "Subway", []],
  ["dominos.com", "Domino's", ["dominos", "dominoes"]],
  ["burgerking.com", "Burger King", ["bk"]],
  ["pizzahut.com", "Pizza Hut", []],
  ["dunkindonuts.com", "Dunkin", ["dunkin donuts"]],
  ["tacobell.com", "Taco Bell", []],

  // Fashion & Retail
  ["nike.com", "Nike", []],
  ["adidas.com", "Adidas", []],
  ["puma.com", "Puma", []],
  ["vans.com", "Vans", []],
  ["converse.com", "Converse", []],
  ["gucci.com", "Gucci", []],
  ["zara.com", "Zara", []],
  ["hm.com", "H&M", ["h&m", "h and m"]],
  ["supreme.com", "Supreme", []],
  ["target.com", "Target", []],
  ["walmart.com", "Walmart", []],
  ["ikea.com", "IKEA", []],
  ["ebay.com", "eBay", []],
  ["aliexpress.com", "AliExpress", ["ali express"]],

  // Automotive
  ["tesla.com", "Tesla", []],
  ["bmw.com", "BMW", []],
  ["mercedes-benz.com", "Mercedes-Benz", ["mercedes", "benz"]],
  ["audi.com", "Audi", []],
  ["toyota.com", "Toyota", []],
  ["honda.com", "Honda", []],
  ["ford.com", "Ford", []],
  ["volkswagen.com", "Volkswagen", ["vw"]],
  ["ferrari.com", "Ferrari", []],
  ["lamborghini.com", "Lamborghini", ["lambo"]],
  ["porsche.com", "Porsche", []],
  ["hyundai.com", "Hyundai", []],
  ["kia.com", "Kia", []],
  ["nissan-global.com", "Nissan", []],
  ["chevrolet.com", "Chevrolet", ["chevy"]],
  ["lexus.com", "Lexus", []],
  ["jeep.com", "Jeep", []],
  ["peugeot.com", "Peugeot", []],
  ["renault.com", "Renault", []],
  ["mazda.com", "Mazda", []],

  // Tech & Electronics
  ["apple.com", "Apple", []],
  ["samsung.com", "Samsung", []],
  ["google.com", "Google", []],
  ["microsoft.com", "Microsoft", []],
  ["amazon.com", "Amazon", []],
  ["spotify.com", "Spotify", []],
  ["paypal.com", "PayPal", ["pay pal"]],
  ["visa.com", "Visa", []],
  ["mastercard.com", "Mastercard", ["master card"]],
  ["intel.com", "Intel", []],
  ["nvidia.com", "NVIDIA", ["nvidia", "nvdia"]],
  ["amd.com", "AMD", []],
  ["sony.com", "Sony", []],
  ["lg.com", "LG", []],
  ["huawei.com", "Huawei", []],
  ["mi.com", "Xiaomi", []],
  ["lenovo.com", "Lenovo", []],
  ["dell.com", "Dell", []],
  ["hp.com", "HP", ["hewlett packard"]],
  ["asus.com", "ASUS", []],
  ["philips.com", "Philips", []],

  // Gaming
  ["playstation.com", "PlayStation", ["ps", "ps4", "ps5"]],
  ["xbox.com", "Xbox", []],
  ["nintendo.com", "Nintendo", []],
  ["steampowered.com", "Steam", []],
  ["epicgames.com", "Epic Games", ["epic", "fortnite"]],
  ["roblox.com", "Roblox", []],
  ["ea.com", "EA", ["electronic arts"]],
  ["ubisoft.com", "Ubisoft", []],
  ["riotgames.com", "Riot Games", ["riot"]],
  ["rockstargames.com", "Rockstar Games", ["rockstar", "gta"]],
  ["minecraft.net", "Minecraft", []],

  // Sports & Entertainment
  ["nba.com", "NBA", []],
  ["nfl.com", "NFL", []],
  ["formula1.com", "Formula 1", ["f1", "formula one"]],
  ["uefa.com", "UEFA", []],
  ["fifa.com", "FIFA", []],

  // Travel & Delivery
  ["uber.com", "Uber", []],
  ["ubereats.com", "Uber Eats", ["uber eats"]],
  ["airbnb.com", "Airbnb", ["air bnb"]],
  ["booking.com", "Booking.com", ["booking"]],
  ["doordash.com", "DoorDash", ["door dash"]],
  ["deliveroo.com", "Deliveroo", []],

  // Education
  ["duolingo.com", "Duolingo", []],
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

export const LOGO_QUESTIONS: Question[] = LOGOS.map(([domain, answer, extras]) => ({
  type: "logo" as const,
  imageUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
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
