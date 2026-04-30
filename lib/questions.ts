export type Question = {
  type: "flag" | "logo";
  imageUrl: string;
  answer: string;
  acceptedAnswers: string[];
};
const FLAG_CODES = [
  "ad","ae","af","ag","ai","al","am","ao","ar","as","at","au","aw","az",
  "ba","bb","bd","be","bf","bg","bh","bi","bj","bm","bn","bo","br","bs","bt","bw","by","bz",
  "ca","cd","cf","cg","ch","ci","cl","cm","cn","co","cr","cu","cv","cy","cz",
  "de","dj","dk","dm","do","dz",
  "ec","ee","eg","er","es","et",
  "fi","fj","fm","fr",
  "ga","gb","gd","ge","gh","gm","gn","gq","gr","gt","gw","gy",
  "hk","hn","hr","ht","hu",
  "id","ie","il","in","iq","ir","is","it",
  "jm","jo","jp",
  "ke","kg","kh","ki","km","kn","kp","kr","kw","kz",
  "la","lb","lc","li","lk","lr","ls","lt","lu","lv","ly",
  "ma","mc","md","me","mg","mh","mk","ml","mm","mn","mr","mt","mu","mv","mw","mx","my","mz",
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
  us: ["usa", "america", "united states of america"],
  gb: ["uk", "britain", "great britain", "united kingdom"],
  kr: ["south korea", "korea"],
  kp: ["north korea"],
  ae: ["uae", "emirates"],
  cz: ["czechia"],
  nl: ["holland"],
  br: ["brasil"],
  lb: ["liban"],
};

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

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
  ["twitter", "Twitter"],
  ["linkedin", "LinkedIn"],
  ["pinterest", "Pinterest"],
  ["twitch", "Twitch"],
  ["zoom", "Zoom"],
  ["slack", "Slack"],
  ["notion", "Notion"],
  ["figma", "Figma"],
  ["canva", "Canva"],

  ["mcdonalds", "McDonald's"],
  ["kfc", "KFC"],
  ["starbucks", "Starbucks"],
  ["burgerking", "Burger King"],
  ["subway", "Subway"],
  ["dominos", "Domino's"],
  ["pizzahut", "Pizza Hut"],
  ["dunkin", "Dunkin"],
  ["wendys", "Wendy's"],
  ["tacobell", "Taco Bell"],
  ["chipotle", "Chipotle"],
  ["cocacola", "Coca-Cola"],
  ["pepsi", "Pepsi"],
  ["redbull", "Red Bull"],
  ["monster", "Monster"],

  ["nike", "Nike"],
  ["adidas", "Adidas"],
  ["puma", "Puma"],
  ["reebok", "Reebok"],
  ["newbalance", "New Balance"],
  ["underarmour", "Under Armour"],
  ["vans", "Vans"],
  ["converse", "Converse"],
  ["thenorthface", "The North Face"],
  ["supreme", "Supreme"],
  ["gucci", "Gucci"],
  ["louisvuitton", "Louis Vuitton"],
  ["chanel", "Chanel"],
  ["prada", "Prada"],
  ["zara", "Zara"],
  ["hm", "H&M"],

  ["tesla", "Tesla"],
  ["bmw", "BMW"],
  ["mercedes", "Mercedes"],
  ["audi", "Audi"],
  ["toyota", "Toyota"],
  ["honda", "Honda"],
  ["ford", "Ford"],
  ["nissan", "Nissan"],
  ["volkswagen", "Volkswagen"],
  ["porsche", "Porsche"],
  ["ferrari", "Ferrari"],
  ["lamborghini", "Lamborghini"],
  ["hyundai", "Hyundai"],
  ["kia", "Kia"],
  ["chevrolet", "Chevrolet"],
  ["jeep", "Jeep"],
  ["mazda", "Mazda"],
  ["lexus", "Lexus"],
  ["mitsubishi", "Mitsubishi"],
  ["peugeot", "Peugeot"],
  ["renault", "Renault"],

  ["samsung", "Samsung"],
  ["google", "Google"],
  ["microsoft", "Microsoft"],
  ["amazon", "Amazon"],
  ["paypal", "PayPal"],
  ["visa", "Visa"],
  ["mastercard", "Mastercard"],
  ["intel", "Intel"],
  ["amd", "AMD"],
  ["nvidia", "NVIDIA"],
  ["hp", "HP"],
  ["dell", "Dell"],
  ["lenovo", "Lenovo"],
  ["asus", "ASUS"],
  ["acer", "Acer"],
  ["huawei", "Huawei"],
  ["xiaomi", "Xiaomi"],
  ["oppo", "Oppo"],
  ["sony", "Sony"],
  ["lg", "LG"],
  ["panasonic", "Panasonic"],
  ["philips", "Philips"],

  ["fifa", "FIFA"],
  ["nba", "NBA"],
  ["nfl", "NFL"],
  ["formula1", "Formula 1"],
  ["uefa", "UEFA"],
  ["olympics", "Olympics"],

  ["roblox", "Roblox"],
  ["minecraft", "Minecraft"],
  ["epicgames", "Epic Games"],
  ["steam", "Steam"],
  ["nintendo", "Nintendo"],
  ["ea", "EA"],
  ["ubisoft", "Ubisoft"],
  ["riotgames", "Riot Games"],
  ["rockstargames", "Rockstar Games"],
  ["activision", "Activision"],
  ["blizzardentertainment", "Blizzard"],

  ["ubereats", "Uber Eats"],
  ["uber", "Uber"],
  ["airbnb", "Airbnb"],
  ["doordash", "DoorDash"],
  ["deliveroo", "Deliveroo"],
  ["bookingdotcom", "Booking.com"],

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
  ["docker", "Docker"],
  ["kubernetes", "Kubernetes"],
  ["mongodb", "MongoDB"],
  ["postgresql", "PostgreSQL"],
  ["mysql", "MySQL"],
  ["wordpress", "WordPress"],
  ["shopify", "Shopify"],
  ["stripe", "Stripe"],
  ["cloudflare", "Cloudflare"],
  ["openai", "OpenAI"],
];
export const QUESTIONS: Question[] = [
...FLAG_CODES.map((code) => {
  const answer = regionNames.of(code.toUpperCase()) || code.toUpperCase();

  return {
    type: "flag" as const,
    imageUrl: `https://flagcdn.com/w320/${code}.png`,
    answer,
    acceptedAnswers: [answer, ...(FLAG_ALIASES[code] || [])],
  };
}),

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