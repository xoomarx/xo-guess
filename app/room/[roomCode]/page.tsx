"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { onValue, ref, update, serverTimestamp } from "firebase/database";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "../../../lib/firebase";
import { getRandomQuestionByMode, isCorrectAnswer } from "../../../lib/questions";
import type { GameMode, Difficulty } from "../../../lib/questions";

const TIMER_SECONDS = 15;
const TOTAL_ROUNDS = 10;
const REVEAL_SECONDS = 3;

type PlayerHistoryItem = {
  round: number;
  answer: string;
  correct: boolean;
  points: number;
  speed: number;
  correctAnswer: string;
};

type Player = {
  name: string;
  score: number;
  avatar?: string;
  color?: string;
  streak?: number;
  bestStreak?: number;
  typing?: boolean;
  history?: Record<string, PlayerHistoryItem>;
};
type PartyGameType =
  | "logo-flag"
  | "emoji"
  | "typing"
  | "would-you-rather"
  | "trivia"
  | "odd-one-out"
  | "this-or-that";

type Question = {
  type:
    | "flag"
    | "logo"
    | "emoji"
    | "typing"
    | "would-you-rather"
    | "trivia"
    | "odd-one-out"
    | "this-or-that";
  imageUrl?: string;
  fallbackUrl?: string;
  prompt?: string;
  options?: string[];
  answer: string;
  acceptedAnswers: string[];
};
type Room = {
  hostId: string;
  status?: "lobby" | "playing" | "ended";
  currentQuestion?: Question;
  questionIndex?: number;
  usedQuestionIndexes?: number[];
  roundStartedAt?: number;
  roundNumber?: number;
  totalRounds?: number;
  phase?: "question" | "reveal";
  revealStartedAt?: number;
  roundAnswers?: Record<string, Record<string, { correct: boolean; timeTakenMs?: number; answeredAt?: number }>>;
  players?: Record<string, Player>;
  gameMode?: GameMode;
  gameType?: PartyGameType;
  timerSeconds?: number;
  difficulty?: Difficulty | "all";
  solo?: boolean;
  reactions?: Record<string, { emoji: string; name: string; createdAt: number }>;
};
type SoundName = "correct" | "wrong" | "timer" | "gameover";


const PARTY_QUESTIONS: Record<Exclude<PartyGameType, "logo-flag">, Question[]> = {
  emoji: [
    { type: "emoji", prompt: "🦁👑", answer: "The Lion King", acceptedAnswers: ["The Lion King", "lion king"] },
    { type: "emoji", prompt: "🍔👑", answer: "Burger King", acceptedAnswers: ["Burger King"] },
    { type: "emoji", prompt: "🧊❄️👸", answer: "Frozen", acceptedAnswers: ["Frozen"] },
    { type: "emoji", prompt: "🕷️👨", answer: "Spider-Man", acceptedAnswers: ["Spider-Man", "Spiderman", "Spider Man"] },
    { type: "emoji", prompt: "⚡👦🪄", answer: "Harry Potter", acceptedAnswers: ["Harry Potter"] },
    { type: "emoji", prompt: "🚗⚡🏁", answer: "Cars", acceptedAnswers: ["Cars"] },
    { type: "emoji", prompt: "🍕🐢🥷", answer: "Teenage Mutant Ninja Turtles", acceptedAnswers: ["Teenage Mutant Ninja Turtles", "TMNT", "Ninja Turtles"] },
    { type: "emoji", prompt: "🧽⭐🦑", answer: "SpongeBob", acceptedAnswers: ["SpongeBob", "Spongebob Squarepants", "SpongeBob SquarePants"] },
    { type: "emoji", prompt: "🎮⛏️🟩", answer: "Minecraft", acceptedAnswers: ["Minecraft"] },
    { type: "emoji", prompt: "🐭🏰✨", answer: "Disney", acceptedAnswers: ["Disney"] },
    { type: "emoji", prompt: "🔴▶️", answer: "YouTube", acceptedAnswers: ["YouTube", "Youtube"] },
    { type: "emoji", prompt: "📸🌈", answer: "Instagram", acceptedAnswers: ["Instagram", "Insta"] },
    { type: "emoji", prompt: "🎵⬛", answer: "TikTok", acceptedAnswers: ["TikTok", "Tiktok"] },
    { type: "emoji", prompt: "👻💛", answer: "Snapchat", acceptedAnswers: ["Snapchat", "Snap"] },
    { type: "emoji", prompt: "☕⭐", answer: "Starbucks", acceptedAnswers: ["Starbucks"] },
  ],
  typing: [
    { type: "typing", prompt: "the goofy shark stole my points", answer: "the goofy shark stole my points", acceptedAnswers: ["the goofy shark stole my points"] },
    { type: "typing", prompt: "banana boss is locked in", answer: "banana boss is locked in", acceptedAnswers: ["banana boss is locked in"] },
    { type: "typing", prompt: "never trust the mafia pigeon", answer: "never trust the mafia pigeon", acceptedAnswers: ["never trust the mafia pigeon"] },
    { type: "typing", prompt: "rgb warrior carried the lobby", answer: "rgb warrior carried the lobby", acceptedAnswers: ["rgb warrior carried the lobby"] },
    { type: "typing", prompt: "frog wizard cooked everyone", answer: "frog wizard cooked everyone", acceptedAnswers: ["frog wizard cooked everyone"] },
    { type: "typing", prompt: "logo flag rush is chaos", answer: "logo flag rush is chaos", acceptedAnswers: ["logo flag rush is chaos"] },
    { type: "typing", prompt: "i typed this without looking", answer: "i typed this without looking", acceptedAnswers: ["i typed this without looking"] },
    { type: "typing", prompt: "the timer is bullying me", answer: "the timer is bullying me", acceptedAnswers: ["the timer is bullying me"] },
    { type: "typing", prompt: "one more round then sleep", answer: "one more round then sleep", acceptedAnswers: ["one more round then sleep"] },
    { type: "typing", prompt: "my keyboard has aura", answer: "my keyboard has aura", acceptedAnswers: ["my keyboard has aura"] },
  ],
  "would-you-rather": [
    { type: "would-you-rather", prompt: "Would you rather lose Wi‑Fi for a week or lose snacks for a week?", options: ["A) Lose Wi‑Fi", "B) Lose snacks"], answer: "No wrong answer", acceptedAnswers: ["a", "b", "lose wifi", "lose wi-fi", "lose snacks"] },
    { type: "would-you-rather", prompt: "Would you rather only use YouTube or only use TikTok?", options: ["A) YouTube only", "B) TikTok only"], answer: "No wrong answer", acceptedAnswers: ["a", "b", "youtube", "tiktok", "youtube only", "tiktok only"] },
    { type: "would-you-rather", prompt: "Would you rather be super fast or super smart?", options: ["A) Super fast", "B) Super smart"], answer: "No wrong answer", acceptedAnswers: ["a", "b", "fast", "smart", "super fast", "super smart"] },
    { type: "would-you-rather", prompt: "Would you rather always win games or always win arguments?", options: ["A) Games", "B) Arguments"], answer: "No wrong answer", acceptedAnswers: ["a", "b", "games", "arguments"] },
    { type: "would-you-rather", prompt: "Would you rather have unlimited pizza or unlimited burgers?", options: ["A) Pizza", "B) Burgers"], answer: "No wrong answer", acceptedAnswers: ["a", "b", "pizza", "burgers", "burger"] },
  ],
  trivia: [
    { type: "trivia", prompt: "What country has the city Paris?", answer: "France", acceptedAnswers: ["France"] },
    { type: "trivia", prompt: "How many players are on the field for one football/soccer team?", answer: "11", acceptedAnswers: ["11", "eleven"] },
    { type: "trivia", prompt: "What planet is known as the Red Planet?", answer: "Mars", acceptedAnswers: ["Mars"] },
    { type: "trivia", prompt: "What is the fastest land animal?", answer: "Cheetah", acceptedAnswers: ["Cheetah"] },
    { type: "trivia", prompt: "What does NBA stand for?", answer: "National Basketball Association", acceptedAnswers: ["National Basketball Association", "NBA"] },
    { type: "trivia", prompt: "What language is mainly used with React?", answer: "JavaScript", acceptedAnswers: ["JavaScript", "Javascript", "JS", "TypeScript", "Typescript", "TS"] },
    { type: "trivia", prompt: "Which company makes the iPhone?", answer: "Apple", acceptedAnswers: ["Apple"] },
    { type: "trivia", prompt: "What is 9 × 9?", answer: "81", acceptedAnswers: ["81", "eighty one", "eighty-one"] },
  ],
  "odd-one-out": [
    { type: "odd-one-out", prompt: "Pick the odd one out.", options: ["Apple", "Samsung", "Nike", "Google"], answer: "Nike", acceptedAnswers: ["Nike", "c", "3"] },
    { type: "odd-one-out", prompt: "Pick the odd one out.", options: ["France", "Germany", "Brazil", "Netflix"], answer: "Netflix", acceptedAnswers: ["Netflix", "d", "4"] },
    { type: "odd-one-out", prompt: "Pick the odd one out.", options: ["YouTube", "TikTok", "Instagram", "Toyota"], answer: "Toyota", acceptedAnswers: ["Toyota", "d", "4"] },
    { type: "odd-one-out", prompt: "Pick the odd one out.", options: ["Pizza", "Burger", "Sushi", "PlayStation"], answer: "PlayStation", acceptedAnswers: ["PlayStation", "Playstation", "d", "4"] },
    { type: "odd-one-out", prompt: "Pick the odd one out.", options: ["Lion", "Tiger", "Shark", "Adidas"], answer: "Adidas", acceptedAnswers: ["Adidas", "d", "4"] },
  ],
  "this-or-that": [
    { type: "this-or-that", prompt: "Pick one fast.", options: ["A) Messi", "B) Ronaldo"], answer: "No wrong answer", acceptedAnswers: ["a", "b", "messi", "ronaldo"] },
    { type: "this-or-that", prompt: "Pick one fast.", options: ["A) Nike", "B) Adidas"], answer: "No wrong answer", acceptedAnswers: ["a", "b", "nike", "adidas"] },
    { type: "this-or-that", prompt: "Pick one fast.", options: ["A) iPhone", "B) Samsung"], answer: "No wrong answer", acceptedAnswers: ["a", "b", "iphone", "samsung"] },
    { type: "this-or-that", prompt: "Pick one fast.", options: ["A) Pizza", "B) Burger"], answer: "No wrong answer", acceptedAnswers: ["a", "b", "pizza", "burger"] },
    { type: "this-or-that", prompt: "Pick one fast.", options: ["A) Summer", "B) Winter"], answer: "No wrong answer", acceptedAnswers: ["a", "b", "summer", "winter"] },
  ],
};

function normalizePartyAnswer(text: string) {
  return text.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");
}

function isPartyCorrectAnswer(userAnswer: string, question: Question) {
  if (question.type === "flag" || question.type === "logo") {
    return isCorrectAnswer(userAnswer, question as any);
  }

  const normalized = normalizePartyAnswer(userAnswer);

  if ((question.type === "would-you-rather" || question.type === "this-or-that") && normalized.length > 0) {
    return question.acceptedAnswers.some((accepted) => normalizePartyAnswer(accepted) === normalized);
  }

  return question.acceptedAnswers.some((accepted) => normalizePartyAnswer(accepted) === normalized);
}

function getRandomPartyQuestion(
  usedIndexes: number[] = [],
  room?: Room | null
): { index: number; question: Question } {
  const gameType = room?.gameType || "logo-flag";

  if (gameType === "logo-flag") {
    return getRandomQuestionByMode(usedIndexes, room?.gameMode || "mix", room?.difficulty || "all") as any;
  }

  const pool = PARTY_QUESTIONS[gameType];
  const availableIndexes = pool.map((_, index) => index).filter((index) => !usedIndexes.includes(index));
  const finalPool = availableIndexes.length > 0 ? availableIndexes : pool.map((_, index) => index);
  const pickedIndex = finalPool[Math.floor(Math.random() * finalPool.length)];

  return {
    index: pickedIndex,
    question: pool[pickedIndex],
  };
}

function getGameLabel(gameType?: PartyGameType) {
  const labels: Record<PartyGameType, string> = {
    "logo-flag": "Logo & Flag Rush",
    emoji: "Emoji Guess",
    typing: "Typing Battle",
    "would-you-rather": "Would You Rather",
    trivia: "Trivia Rush",
    "odd-one-out": "Odd One Out",
    "this-or-that": "This or That",
  };

  return labels[gameType || "logo-flag"];
}

function getQuestionLabel(question?: Question) {
  if (!question) return "Question";
  const labels: Record<Question["type"], string> = {
    flag: "🌍 Flag",
    logo: "🏷️ Logo",
    emoji: "😂 Emoji",
    typing: "⌨️ Typing",
    "would-you-rather": "🤔 Would You Rather",
    trivia: "🧠 Trivia",
    "odd-one-out": "🧩 Odd One Out",
    "this-or-that": "⚡ This or That",
  };

  return labels[question.type];
}



const FUNNY_AVATARS = [
  { id: "brainrot-king", label: "Brainrot King", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=BrainrotKing&backgroundColor=b6e3f4,c0aede,ffd5dc" },
  { id: "skibidi-boss", label: "Skibidi Boss", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=SkibidiBoss&backgroundColor=d1d4f9,c0aede,b6e3f4" },
  { id: "sigma-stare", label: "Sigma Stare", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=SigmaStare&backgroundColor=ffdfbf,b6e3f4,c0aede" },
  { id: "aura-farmer", label: "Aura Farmer", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=AuraFarmer&backgroundColor=fff1ba,c0aede,b6e3f4" },
  { id: "rizz-goblin", label: "Rizz Goblin", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=RizzGoblin&backgroundColor=ffd5dc,ffdfbf,d1d4f9" },
  { id: "delulu-duck", label: "Delulu Duck", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=DeluluDuck&backgroundColor=b6e3f4,ffd5dc,fff1ba" },
  { id: "ohio-wizard", label: "Ohio Wizard", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=OhioWizard&backgroundColor=c0aede,ffdfbf,d1d4f9" },
  { id: "npc-streamer", label: "NPC Streamer", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=NPCStreamer&backgroundColor=b6e3f4,d1d4f9,ffd5dc" },
  { id: "goofy-ahh", label: "Goofy Ahh", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=GoofyAhh&backgroundColor=ffdfbf,b6e3f4,c0aede" },
  { id: "cooked-cat", label: "Cooked Cat", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=CookedCat&backgroundColor=ffd5dc,c0aede,b6e3f4" },
  { id: "locked-in", label: "Locked In", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=LockedIn&backgroundColor=d1d4f9,b6e3f4,ffdfbf" },
  { id: "side-eye", label: "Side Eye", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=SideEye&backgroundColor=fff1ba,c0aede,ffd5dc" },

  { id: "italian-shark", label: "Sneaker Shark", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=SneakerShark&backgroundColor=b6e3f4,d1d4f9,c0aede" },
  { id: "cappuccino-baller", label: "Cappuccino Baller", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=CappuccinoBaller&backgroundColor=ffdfbf,fff1ba,ffd5dc" },
  { id: "crocodile-plane", label: "Croc Plane", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=CrocPlane&backgroundColor=c0aede,b6e3f4,ffdfbf" },
  { id: "patapim-tree", label: "Patapim Tree", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=PatapimTree&backgroundColor=d1d4f9,fff1ba,b6e3f4" },
  { id: "lobster-don", label: "Don Lobster", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=DonLobster&backgroundColor=ffd5dc,b6e3f4,c0aede" },
  { id: "mango-maniac", label: "Mango Maniac", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=MangoManiac&backgroundColor=fff1ba,ffdfbf,c0aede" },
  { id: "toilet-ceo", label: "Toilet CEO", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=ToiletCEO&backgroundColor=d1d4f9,c0aede,ffd5dc" },
  { id: "67-bandit", label: "67 Bandit", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=SixtySevenBandit&backgroundColor=b6e3f4,ffdfbf,d1d4f9" },

  { id: "chill-guy", label: "Chill Guy Energy", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=ChillGuyEnergy&backgroundColor=c0aede,b6e3f4,fff1ba" },
  { id: "yapper-3000", label: "Yapper 3000", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Yapper3000&backgroundColor=ffd5dc,d1d4f9,b6e3f4" },
  { id: "crashout", label: "Crashout Gremlin", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=CrashoutGremlin&backgroundColor=ffdfbf,ffd5dc,c0aede" },
  { id: "low-taper", label: "Low Taper Legend", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=LowTaperLegend&backgroundColor=b6e3f4,c0aede,d1d4f9" },
  { id: "sus-nugget", label: "Sus Nugget", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=SusNugget&backgroundColor=fff1ba,ffd5dc,ffdfbf" },
  { id: "rage-baiter", label: "Rage Baiter", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=RageBaiter&backgroundColor=d1d4f9,ffd5dc,c0aede" },
  { id: "ratio-robot", label: "Ratio Robot", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=RatioRobot&backgroundColor=b6e3f4,c0aede,ffdfbf" },
  { id: "gyatt-goblin", label: "Gyatt Goblin", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=GyattGoblin&backgroundColor=ffd5dc,c0aede,fff1ba" },

  { id: "pixel-bot", label: "Pixel Bot", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=PixelBot&backgroundColor=b6e3f4,c0aede,d1d4f9" },
  { id: "toast-bot", label: "Toast Bot", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=ToastBot&backgroundColor=ffd5dc,ffdfbf,c0aede" },
  { id: "alien-bot", label: "Alien Bot", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=AlienBot&backgroundColor=c0aede,b6e3f4,d1d4f9" },
  { id: "chaos-frog", label: "Chaos Frog", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=ChaosFrog&backgroundColor=b6e3f4,fff1ba,c0aede" },
  { id: "sir-goof", label: "Sir Goof", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=SirGoof&backgroundColor=ffdfbf,c0aede,b6e3f4" },
  { id: "captain-meme", label: "Captain Meme", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=CaptainMeme&backgroundColor=b6e3f4,d1d4f9,ffd5dc" },
];

const PLAYER_COLORS = ["#38d9ff", "#a78bfa", "#facc15", "#4af0a0", "#fb7185", "#f472b6", "#60a5fa"];

function pickAvatar(seed: string) {
  const total = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FUNNY_AVATARS[total % FUNNY_AVATARS.length].url;
}

function pickPlayerColor(seed: string) {
  const total = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return PLAYER_COLORS[total % PLAYER_COLORS.length];
}

// Simple confetti burst helper
function spawnConfetti(container: HTMLElement) {
  const colors = ["#f0c040", "#4af0a0", "#f06060", "#60a0f0", "#f060c0", "#a0f060"];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement("div");
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 6 + Math.random() * 8;
    el.style.cssText = `
      position:fixed;width:${size}px;height:${size}px;
      background:${color};border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
      left:${Math.random() * 100}vw;top:-20px;pointer-events:none;z-index:9999;
      transform:rotate(${Math.random() * 360}deg);
      animation:confettiFall ${1.5 + Math.random() * 2}s ease-in ${Math.random() * 0.5}s forwards;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

export default function RoomPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;

  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [uid, setUid] = useState("");
  const [name, setName] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [prevScores, setPrevScores] = useState<Record<string, number>>({});
  const [justScored, setJustScored] = useState<Record<string, boolean>>({});
  const [displayScores, setDisplayScores] = useState<Record<string, number>>({});
  const [scorePopups, setScorePopups] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [serverOffset, setServerOffset] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(FUNNY_AVATARS[0].url);
  const soundUnlockedRef = useRef(false);
  const [lastPhase, setLastPhase] = useState<string | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [copied, setCopied] = useState(false);
  const answerInputRef = useRef<HTMLInputElement | null>(null);
  const confettiRef = useRef(false);
  const lastTimerSoundSecondRef = useRef<number | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  
  const isHost = Boolean(uid && room?.hostId === uid);
  function playSound(name: SoundName, maxDurationMs?: number) {
    if ((!soundUnlockedRef.current && name !== "correct") || muted) return;

    const files: Record<SoundName, string> = {
      correct: "/sounds/correct.wav",
      wrong: "/sounds/wrong.wav",
      timer: "/sounds/timer.wav",
      gameover: "/sounds/gameover.wav",
    };

    const audio = new Audio(files[name]);
    audio.volume = name === "timer" ? Math.min(volume, 0.45) : volume;

    let stopTimer: ReturnType<typeof setTimeout> | undefined;

    audio.play().catch((error) => {
      console.log("Sound failed:", name, error);
    });

    if (maxDurationMs) {
      stopTimer = setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, maxDurationMs);
    }

    audio.onended = () => {
      if (stopTimer) clearTimeout(stopTimer);
    };
  }

  function enableSound() {
    setSoundEnabled(true);
    soundUnlockedRef.current = true;

    const audio = new Audio("/sounds/correct.wav");
    audio.volume = volume;

    audio.play().catch((error) => {
      console.log("Enable sound failed:", error);
    });
  }

  useEffect(() => {
    const savedName = localStorage.getItem("name");
    const savedAvatar = localStorage.getItem("avatar");
    if (savedName) setName(savedName);
    if (savedAvatar) setSelectedAvatar(savedAvatar);
    setCurrentUrl(window.location.href);
  }, []);

  useEffect(() => {
    musicRef.current = new Audio("/sounds/music.wav");
    musicRef.current.loop = true;
    musicRef.current.volume = 0.25;

    return () => {
      musicRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!musicRef.current) return;

    musicRef.current.volume = muted ? 0 : Math.min(volume, 0.35);

    if (musicEnabled && !muted) {
      musicRef.current.play().catch((error) => {
        console.log("Music failed:", error);
      });
    } else {
      musicRef.current.pause();
    }
  }, [musicEnabled, muted, volume]);

  useEffect(() => {
    if (auth.currentUser) setUid(auth.currentUser.uid);
    else signInAnonymously(auth).then((r) => setUid(r.user.uid));
  }, []);

  useEffect(() => {
    const roomRef = ref(db, `rooms/${roomCode}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      setRoom(snapshot.exists() ? snapshot.val() : null);
    });
    return () => unsubscribe();
  }, [roomCode]);

  // Sync selected avatar into Firebase so the leaderboard updates instantly.
  useEffect(() => {
    if (!uid || !room?.players?.[uid]) return;
    if (!selectedAvatar) return;
    if (room.players[uid]?.avatar === selectedAvatar) return;

    update(ref(db, `rooms/${roomCode}/players/${uid}`), {
      avatar: selectedAvatar,
    });
  }, [selectedAvatar, uid, roomCode, room?.players?.[uid]?.avatar]);

  useEffect(() => {
    if (room?.status !== "playing") return;
    if (room?.phase !== "question") return;

    setAnswer("");
    setFeedback(null);
    lastTimerSoundSecondRef.current = null;

    const focusTimer = setTimeout(() => {
      answerInputRef.current?.focus();
      answerInputRef.current?.select();
    }, 100);

    return () => clearTimeout(focusTimer);
  }, [room?.status, room?.phase, room?.questionIndex]);

  useEffect(() => {
    if (room?.phase === "reveal" && lastPhase !== "reveal") {
      setLastPhase("reveal");
    }

    if (room?.phase === "question") {
      setLastPhase("question");
      lastTimerSoundSecondRef.current = null;
    }
  }, [room?.phase, lastPhase]);

  useEffect(() => {
    if (room?.status === "ended" && !gameEnded) {
      if (soundUnlockedRef.current) playSound("gameover");
      setGameEnded(true);

      if (!confettiRef.current) {
        confettiRef.current = true;
        spawnConfetti(document.body);
        setTimeout(() => {
          confettiRef.current = false;
        }, 4000);
      }
    }

    if (room?.status !== "ended") {
      setGameEnded(false);
    }
  }, [room?.status, gameEnded]);

  useEffect(() => {
    if (!room?.players) return;
    const newScores: Record<string, number> = {};
    Object.values(room.players).forEach((p) => { newScores[p.name] = p.score; });
    setPrevScores((prev) => {
      if (Object.keys(prev).length === 0) { setDisplayScores(newScores); return newScores; }
      Object.entries(newScores).forEach(([playerName, score]) => {
        const oldScore = prev[playerName] ?? 0;
        const gained = score - oldScore;
        if (gained > 0) {
          let current = oldScore;
          setJustScored((s) => ({ ...s, [playerName]: true }));
          setScorePopups((s) => ({ ...s, [playerName]: gained }));
          const interval = setInterval(() => {
            current += 1;
            setDisplayScores((s) => ({ ...s, [playerName]: current }));
            if (current >= score) clearInterval(interval);
          }, 80);
          setTimeout(() => {
            setJustScored((s) => ({ ...s, [playerName]: false }));
            setScorePopups((s) => { const c = { ...s }; delete c[playerName]; return c; });
          }, 1400);
        }
      });
      return newScores;
    });
  }, [room?.players]);

  useEffect(() => {
    const offsetRef = ref(db, ".info/serverTimeOffset");
    const unsubscribe = onValue(offsetRef, (snapshot) => { setServerOffset(snapshot.val() || 0); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (room?.status !== "playing") return;
    const interval = setInterval(() => {
      const serverNow = Date.now() + serverOffset;
      if (room.phase === "reveal" && room.revealStartedAt) {
        const elapsed = Math.floor((serverNow - room.revealStartedAt) / 1000);
        const remaining = Math.max(REVEAL_SECONDS - elapsed, 0);
        setTimeLeft(remaining);
        if (remaining === 0 && isHost) { clearInterval(interval); nextQuestion(); }
        return;
      }
      if (!room.roundStartedAt) return;
      const elapsed = Math.floor((serverNow - room.roundStartedAt) / 1000);
      const remaining = Math.max((room.timerSeconds || TIMER_SECONDS) - elapsed, 0);
      setTimeLeft(remaining);
      if (remaining === 0 && isHost && room.phase !== "reveal") {
        clearInterval(interval);
        update(ref(db, `rooms/${roomCode}`), { phase: "reveal", revealStartedAt: serverTimestamp() });
      }
    }, 300);
    return () => clearInterval(interval);
  }, [room?.status, room?.roundStartedAt, room?.revealStartedAt, room?.phase, room?.questionIndex, serverOffset, isHost]);

  useEffect(() => {
    if (room?.status !== "playing") return;
    if (room?.phase !== "question") return;
    if (timeLeft <= 0 || timeLeft > 5) return;
    if (lastTimerSoundSecondRef.current === timeLeft) return;

    lastTimerSoundSecondRef.current = timeLeft;

    if (soundUnlockedRef.current) {
      playSound("timer", 350);
    }
  }, [room?.status, room?.phase, timeLeft]);

  function chooseAvatar(avatarUrl: string) {
    setSelectedAvatar(avatarUrl);
    localStorage.setItem("avatar", avatarUrl);

    if (uid && room?.players?.[uid]) {
      update(ref(db, `rooms/${roomCode}/players/${uid}`), {
        avatar: avatarUrl,
      });
    }
  }

  async function joinRoom() {
    if (!uid) return;
    const playerName = name.trim();
    if (!playerName) return;
    localStorage.setItem("name", playerName);
    localStorage.setItem("avatar", selectedAvatar);
    await update(ref(db, `rooms/${roomCode}/players/${uid}`), {
      name: playerName,
      score: room?.players?.[uid]?.score || 0,
      avatar: selectedAvatar || room?.players?.[uid]?.avatar || pickAvatar(playerName),
      color: room?.players?.[uid]?.color || pickPlayerColor(playerName),
      streak: room?.players?.[uid]?.streak || 0,
      bestStreak: room?.players?.[uid]?.bestStreak || 0,
      typing: false,
    });
  }

  async function startGame() {
    const random = getRandomPartyQuestion([], room);
    await update(ref(db, `rooms/${roomCode}`), {
      status: "playing",
      questionIndex: random.index,
      roundNumber: 1,
      totalRounds: room?.totalRounds || TOTAL_ROUNDS,
      usedQuestionIndexes: [random.index],
      currentQuestion: random.question,
      roundStartedAt: serverTimestamp(),
      roundAnswers: {},
      phase: "question",
      revealStartedAt: null,
    });
    setAnswer(""); setFeedback(null); lastTimerSoundSecondRef.current = null;
  }

  async function nextQuestion() {
    const currentRound = room?.roundNumber || 1;
    if (currentRound >= (room?.totalRounds || TOTAL_ROUNDS)) {
      await update(ref(db, `rooms/${roomCode}`), { status: "ended" });
      return;
    }
    const used = room?.usedQuestionIndexes || [];
    const random = getRandomPartyQuestion(used, room);
    await update(ref(db, `rooms/${roomCode}`), {
      status: "playing",
      questionIndex: random.index,
      roundNumber: currentRound + 1,
      usedQuestionIndexes: [...used, random.index],
      currentQuestion: random.question,
      roundStartedAt: serverTimestamp(),
      phase: "question",
      revealStartedAt: null,
    });
    setAnswer(""); setFeedback(null); lastTimerSoundSecondRef.current = null;
  }


  function handleAnswerChange(value: string) {
    setAnswer(value);
    setFeedback(null);

    if (uid && room?.status === "playing" && room?.phase === "question") {
      update(ref(db, `rooms/${roomCode}/players/${uid}`), {
        typing: value.trim().length > 0,
      });
    }
  }


  async function skipQuestion() {
    if (!isHost || room?.status !== "playing") return;

    await update(ref(db, `rooms/${roomCode}`), {
      phase: "reveal",
      revealStartedAt: serverTimestamp(),
    });
  }

  async function endGame() {
    if (!isHost) return;
    await update(ref(db, `rooms/${roomCode}`), {
      status: "ended",
    });
  }

  async function restartGame() {
    if (!isHost) return;
    await startGame();
  }





  async function sendReaction(emoji: string) {
    if (!uid) return;

    await update(ref(db, `rooms/${roomCode}/reactions/${uid}`), {
      emoji,
      name: room?.players?.[uid]?.name || name || "Player",
      createdAt: Date.now(),
    });
  }

  function toggleMusic() {
    setMusicEnabled((value) => !value);
    soundUnlockedRef.current = true;
  }

  async function submitAnswer() {
    if (!room?.currentQuestion || room.phase === "reveal" || !uid) return;
    if (timeLeft <= 0) { setFeedback({ text: "Time is up!", ok: false }); return; }
    const questionKey = String(room.questionIndex);
    if (room.roundAnswers?.[questionKey]?.[uid]?.correct) {
      setFeedback({ text: "Already answered!", ok: false }); return;
    }
    const correct = isPartyCorrectAnswer(answer, room.currentQuestion);
    if (!correct) {
      playSound("wrong");

      await update(ref(db, `rooms/${roomCode}`), {
        [`players/${uid}/streak`]: 0,
        [`players/${uid}/typing`]: false,
        [`players/${uid}/history/${questionKey}`]: {
          round: room.roundNumber || 1,
          answer,
          correct: false,
          points: 0,
          speed: 0,
          correctAnswer: room.currentQuestion.answer,
        },
      });

      setAnswer("");
      setFeedback({ text: "Wrong — try again!", ok: false });
      setTimeout(() => {
        answerInputRef.current?.focus();
      }, 80);
      return;
    }
    const currentScore = room.players?.[uid]?.score || 0;
    const serverNow = Date.now() + serverOffset;
    const elapsedMs = Math.max(0, serverNow - (room.roundStartedAt || serverNow));
    const elapsed = Math.floor(elapsedMs / 1000);
    const remaining = Math.max((room.timerSeconds || TIMER_SECONDS) - elapsed, 0);
    const basePoints = Math.max(1, remaining);
    const currentStreak = room.players?.[uid]?.streak || 0;
    const newStreak = currentStreak + 1;
    const streakBonus = newStreak >= 3 ? Math.min(10, newStreak * 2) : 0;
    const earnedPoints = basePoints + streakBonus;
    const totalPlayers = Object.keys(room.players || {}).length;
    const alreadyCorrectCount = Object.values(room.roundAnswers?.[questionKey] || {}).filter(
      (result) => result.correct
    ).length;
    const everyoneAnswered = totalPlayers > 0 && alreadyCorrectCount + 1 >= totalPlayers;

    const updates: Record<string, unknown> = {
      [`players/${uid}/score`]: currentScore + earnedPoints,
      [`players/${uid}/streak`]: newStreak,
      [`players/${uid}/bestStreak`]: Math.max(room.players?.[uid]?.bestStreak || 0, newStreak),
      [`players/${uid}/typing`]: false,
      [`players/${uid}/history/${questionKey}`]: {
        round: room.roundNumber || 1,
        answer,
        correct: true,
        points: earnedPoints,
        speed: remaining,
        correctAnswer: room.currentQuestion.answer,
      },
      [`roundAnswers/${questionKey}/${uid}`]: {
        correct: true,
        timeTakenMs: elapsedMs,
        answeredAt: serverNow,
      },
    };

    if (everyoneAnswered) {
      updates.phase = "reveal";
      updates.revealStartedAt = serverTimestamp();
    }

    await update(ref(db, `rooms/${roomCode}`), updates);

    playSound("correct");
    setFeedback({ text: streakBonus > 0 ? `+${earnedPoints} pts! 🔥 ${newStreak} streak` : `+${earnedPoints} pts! ⚡`, ok: true });
    setAnswer("");

    setTimeout(() => {
      answerInputRef.current?.focus();
    }, 80);
  }

  function copyInvite() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const roundSeconds = room?.timerSeconds || TIMER_SECONDS;
  const totalRounds = room?.totalRounds || TOTAL_ROUNDS;
  const difficulty = room?.difficulty || "all";

  const timerPct = room?.phase === "reveal"
    ? (timeLeft / REVEAL_SECONDS) * 100
    : (timeLeft / roundSeconds) * 100;
  const timerColor = timerPct > 50 ? "#4af0a0" : timerPct > 25 ? "#f0c040" : "#f05a4a";
  const timerGlow = timerPct > 50
    ? "rgba(74,240,160,0.4)"
    : timerPct > 25
    ? "rgba(240,192,64,0.4)"
    : "rgba(240,90,74,0.5)";

  // ── Loading / not-found states ──────────────────────────────────────────
  if (room === undefined) return (
    <main style={{ minHeight:"100vh",background:"#05080f",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ textAlign:"center",color:"#4a5a72",fontFamily:"DM Sans,sans-serif" }}>
        <div style={{ fontSize:48,marginBottom:16,animation:"spin 1s linear infinite",display:"inline-block" }}>⏳</div>
        <p style={{ fontSize:14 }}>Loading room…</p>
      </div>
    </main>
  );

  if (room === null) return (
    <main style={{ minHeight:"100vh",background:"#05080f",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ textAlign:"center",color:"#4a5a72",fontFamily:"DM Sans,sans-serif" }}>
        <div style={{ fontSize:48,marginBottom:16 }}>🚫</div>
        <p style={{ fontSize:14 }}>Room not found</p>
        <a href="/" style={{ display:"inline-block",marginTop:20,color:"#f0c040",fontSize:13 }}>← Back to home</a>
      </div>
    </main>
  );

  const players = Object.values(room.players || {});
  const questionKey = String(room.questionIndex);
  const alreadyAnswered = uid ? room.roundAnswers?.[questionKey]?.[uid]?.correct : false;
  const correctPlayers = Object.entries(room.roundAnswers?.[questionKey] || {})
    .filter(([, result]) => result.correct)
    .map(([playerId, result]) => ({
      id: playerId,
      name: room.players?.[playerId]?.name || "Player",
      timeTakenMs: result.timeTakenMs ?? TIMER_SECONDS * 1000,
    }))
    .sort((a, b) => a.timeTakenMs - b.timeTakenMs);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const circumference = 2 * Math.PI * 28;
  const isReveal = room.phase === "reveal";
  const maxTime = isReveal ? REVEAL_SECONDS : roundSeconds;
  const dashOffset = circumference * (1 - timeLeft / maxTime);

  const allHistory = sortedPlayers.flatMap((player) =>
    Object.values(player.history || {}).map((item) => ({
      ...item,
      playerName: player.name,
      bestStreak: player.bestStreak || 0,
    }))
  );

  const correctHistory = allHistory.filter((item) => item.correct);
  const fastestAnswer = correctHistory.sort((a, b) => b.speed - a.speed)[0];
  const bestStreakPlayer = sortedPlayers
    .slice()
    .sort((a, b) => (b.bestStreak || 0) - (a.bestStreak || 0))[0];
  const mostAccuratePlayer = sortedPlayers
    .slice()
    .sort((a, b) => {
      const aHistory = Object.values(a.history || {});
      const bHistory = Object.values(b.history || {});
      const aAccuracy = aHistory.length ? aHistory.filter((item) => item.correct).length / aHistory.length : 0;
      const bAccuracy = bHistory.length ? bHistory.filter((item) => item.correct).length / bHistory.length : 0;
      return bAccuracy - aAccuracy;
    })[0];

  const gameStats = {
    fastestAnswer,
    bestStreakPlayer,
    mostAccuratePlayer,
  };

  function getAchievements(player: Player) {
    const history = Object.values(player.history || {});
    const correctCount = history.filter((item) => item.correct).length;
    const fastCount = history.filter((item) => item.correct && item.speed >= roundSeconds - 2).length;
    const achievements: string[] = [];

    if (fastCount > 0) achievements.push("⚡ Speed Demon");
    if ((player.bestStreak || 0) >= 5) achievements.push("🔥 On Fire");
    if (correctCount >= 10) achievements.push("🏆 Master");
    if (player.score >= 100) achievements.push("💎 Century Club");

    return achievements;
  }

  function formatAnswerSpeed(timeTakenMs: number) {
    const secondsLeft = Math.max(0, roundSeconds - timeTakenMs / 1000);
    return `${secondsLeft.toFixed(2)}s`;
  }

  return (
    <>
      <div className="motion-bg" aria-hidden="true">
        <span className="bg-bar bar1" />
        <span className="bg-bar bar2" />
        <span className="bg-bar bar3" />
        <span className="bg-bar bar4" />
        <span className="bg-bar bar5" />
        <span className="bg-bar bar6" />
        <span className="bg-bar bar7" />
        <span className="bg-bar bar8" />
        <span className="bg-orb orb1" />
        <span className="bg-orb orb2" />
      </div>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#050716;--surface:#0d162c;--surface2:#1a2748;--surface3:#23345e;
          --border:rgba(255,255,255,0.10);--border-hi:rgba(255,255,255,0.18);
          --accent:#38d9ff;--accent2:#a78bfa;--danger:#fb7185;
          --text:#f8fbff;--muted:#9aaccf;
        }
        body{
          background:#050716;
          color:var(--text);
          font-family:'DM Sans',sans-serif;
          min-height:100vh;
          overflow-x:hidden;
        }

        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{0%{transform:scale(0.85);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
        @keyframes floatPoints{0%{opacity:0;transform:translateY(4px) scale(0.85)}20%{opacity:1;transform:translateY(-8px) scale(1.1)}100%{opacity:0;transform:translateY(-36px) scale(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        @keyframes reveal-in{from{opacity:0;transform:scale(0.94) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes glow-pulse{0%,100%{box-shadow:0 0 20px rgba(74,240,160,0.15)}50%{box-shadow:0 0 40px rgba(74,240,160,0.35)}}
        @keyframes confettiFall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}
        @keyframes podium-in{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes crown-bounce{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-8px) rotate(8deg)}}
        @keyframes timer-warn{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes bgFloatA{
          0%{transform:translate3d(0,0,0) rotate(-36deg)}
          50%{transform:translate3d(18px,-28px,0) rotate(-36deg)}
          100%{transform:translate3d(0,0,0) rotate(-36deg)}
        }
        @keyframes bgFloatB{
          0%{transform:translate3d(0,0,0) rotate(-36deg)}
          50%{transform:translate3d(-22px,24px,0) rotate(-36deg)}
          100%{transform:translate3d(0,0,0) rotate(-36deg)}
        }
        @keyframes orbPulse{
          0%,100%{transform:scale(1);opacity:.55}
          50%{transform:scale(1.08);opacity:.8}
        }

        .motion-bg{
          position:fixed;
          inset:0;
          overflow:hidden;
          z-index:-1;
          pointer-events:none;
          background:
            radial-gradient(circle at 20% 20%, rgba(0,188,255,0.16), transparent 26%),
            radial-gradient(circle at 80% 18%, rgba(168,85,247,0.15), transparent 24%),
            linear-gradient(135deg, #040713 0%, #07122d 42%, #11112d 100%);
        }
        .motion-bg::before{
          content:"";
          position:absolute;
          inset:0;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px);
          background-size:72px 72px;
          opacity:.22;
        }
        .bg-bar,.bg-orb{
          position:absolute;
          display:block;
          filter:drop-shadow(0 10px 24px rgba(0,0,0,0.18));
        }
        .bg-bar{
          height:54px;
          border-radius:999px;
          transform:rotate(-36deg);
          opacity:.95;
        }
        .bar1{width:340px;left:-40px;top:70px;background:linear-gradient(90deg,#ff00d4,#8b5cf6);animation:bgFloatA 10s ease-in-out infinite;}
        .bar2{width:420px;left:210px;top:18px;background:linear-gradient(90deg,#6d28d9,#3b82f6);animation:bgFloatB 11s ease-in-out infinite;}
        .bar3{width:250px;right:120px;top:120px;background:linear-gradient(90deg,#a855f7,#ec4899);animation:bgFloatA 12s ease-in-out infinite;}
        .bar4{width:420px;left:120px;top:320px;background:linear-gradient(90deg,rgba(22,53,120,.55),rgba(22,53,120,.10));height:64px;animation:bgFloatB 14s ease-in-out infinite;}
        .bar5{width:290px;right:-40px;top:280px;background:linear-gradient(90deg,#4f46e5,#9333ea);animation:bgFloatA 13s ease-in-out infinite;}
        .bar6{width:360px;left:-60px;bottom:160px;background:linear-gradient(90deg,#0ea5e9,#312e81);height:60px;animation:bgFloatB 15s ease-in-out infinite;}
        .bar7{width:220px;right:260px;bottom:120px;background:linear-gradient(90deg,#d946ef,#7c3aed);animation:bgFloatA 9s ease-in-out infinite;}
        .bar8{width:300px;right:-70px;bottom:40px;background:linear-gradient(90deg,rgba(17,41,91,.65),rgba(17,41,91,.12));height:68px;animation:bgFloatB 16s ease-in-out infinite;}

        .bg-orb{
          border-radius:999px;
          animation:orbPulse 7s ease-in-out infinite;
          opacity:.75;
        }
        .orb1{
          width:96px;height:96px;
          left:58%;
          top:160px;
          background:linear-gradient(135deg,#4f46e5,#9333ea);
        }
        .orb2{
          width:88px;height:88px;
          right:18%;
          top:430px;
          background:linear-gradient(135deg,#ec4899,#8b5cf6);
          animation-delay:1.5s;
        }
        .page-layout{position:relative;z-index:1}

        



        /* Layout */
        .page-layout{
          display:grid;grid-template-columns:1fr 272px;gap:16px;
          max-width:980px;margin:0 auto;padding:22px;min-height:100vh;align-items:start;
        }
        @media(max-width:720px){
          .page-layout{grid-template-columns:1fr}
          .sidebar{order:2}
        }

        /* Cards */
        .card{
          background:linear-gradient(180deg, rgba(20,32,68,0.78), rgba(8,14,35,0.74));
          border:1px solid rgba(255,255,255,0.13);
          border-radius:26px;padding:24px;
          box-shadow:0 24px 70px rgba(0,0,0,0.38),0 0 42px rgba(56,217,255,0.10);
          backdrop-filter:blur(6px);
        }
        .card-elevated{
          background:linear-gradient(180deg, rgba(20,32,68,0.82), rgba(8,14,35,0.80));
          border:1px solid rgba(255,255,255,0.16);
          border-radius:30px;padding:28px;
          box-shadow:0 34px 90px rgba(0,0,0,0.50),0 0 54px rgba(56,217,255,0.12);
          backdrop-filter:blur(6px);
        }

        /* Header */
        .room-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:20px}
        .room-title{font-family:'Syne',sans-serif;font-size:20px;font-weight:900;letter-spacing:-0.02em}
        .room-code-badge{
          font-family:'Syne',monospace;font-size:11px;font-weight:700;
          letter-spacing:0.15em;color:var(--muted);
          background:var(--surface2);border:1px solid var(--border);
          padding:3px 10px;border-radius:100px;margin-top:3px;display:inline-block;
        }
        .room-mode-badge{
          display:inline-block;margin-top:6px;margin-left:6px;
          font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;
          color:var(--accent);background:rgba(56,217,255,0.10);
          border:1px solid rgba(56,217,255,0.22);
          padding:4px 9px;border-radius:999px;
        }
        .btn-row{display:flex;gap:8px;flex-wrap:wrap}

        /* Buttons */
        .btn{
          padding:10px 17px;border-radius:14px;border:none;
          font-family:'DM Sans',sans-serif;font-size:13px;font-weight:800;
          cursor:pointer;transition:transform 0.14s,opacity 0.12s,background 0.15s,box-shadow 0.15s;
        }
        .btn:hover:not(:disabled){transform:translateY(-1px)}
        .btn:disabled{opacity:0.35;cursor:not-allowed}
        .btn-ghost{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.14);color:var(--text);backdrop-filter:blur(6px)}
        .btn-ghost:hover:not(:disabled){background:var(--surface3);border-color:var(--border-hi)}
        .btn-primary{background:linear-gradient(135deg,#38d9ff,#a78bfa);color:#04111b;font-weight:900;box-shadow:0 14px 34px rgba(56,217,255,0.30)}
        .btn-green{background:linear-gradient(135deg,var(--accent2),#c4b5fd);color:#05080f;font-weight:900;box-shadow:0 12px 28px rgba(167,139,250,0.22)}

        /* Progress bar */
        .round-track{
          margin-top:16px;height:3px;background:var(--surface2);
          border-radius:100px;overflow:hidden;
        }
        .round-fill{
          height:100%;border-radius:100px;
          background:linear-gradient(90deg,var(--accent2),var(--accent));
          transition:width 0.6s cubic-bezier(0.22,1,0.36,1);
        }
        .round-label{font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:var(--muted);margin-bottom:2px}
        .round-value{font-family:'Syne',sans-serif;font-size:17px;font-weight:800}

        /* Timer */
        .timer-wrap{display:flex;align-items:center;gap:0}
        .timer-ring-wrap{position:relative;width:68px;height:68px;flex-shrink:0}
        .timer-ring-wrap svg{transform:rotate(-90deg)}
        .timer-number{
          position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          font-family:'Syne',sans-serif;font-size:21px;font-weight:900;
        }

        /* Question type */
        .q-type-badge{
          display:inline-flex;align-items:center;gap:6px;
          background:rgba(240,192,64,0.09);border:1px solid rgba(240,192,64,0.2);
          color:var(--accent);font-size:10px;font-weight:700;
          letter-spacing:0.12em;text-transform:uppercase;
          padding:5px 13px;border-radius:100px;margin-bottom:16px;
        }

        /* Image box */

        .party-question{
          min-height:230px;
          margin:18px 0;
          border-radius:30px;
          padding:30px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:18px;
          text-align:center;
          background:
            radial-gradient(circle at 50% 15%, rgba(167,139,250,0.18), transparent 34%),
            linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025));
          border:1px solid rgba(255,255,255,0.12);
          box-shadow:0 18px 42px rgba(0,0,0,0.26),0 0 0 1px rgba(255,255,255,0.08) inset;
          animation:popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .party-game-label{
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.16em;
          color:var(--muted);
          font-weight:900;
        }
        .emoji-prompt{
          font-size:70px;
          line-height:1;
          filter:drop-shadow(0 14px 26px rgba(0,0,0,.25));
        }
        .party-prompt{
          font-family:'Syne',sans-serif;
          font-size:28px;
          line-height:1.2;
          font-weight:900;
          color:var(--text);
          max-width:720px;
        }
        .party-typing .party-prompt{
          font-size:24px;
          color:var(--accent);
          background:rgba(56,217,255,.08);
          border:1px solid rgba(56,217,255,.16);
          padding:18px 20px;
          border-radius:18px;
        }
        .option-hint{
          font-size:12px;
          color:var(--muted);
          margin-top:-8px;
        }
        .option-grid{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:10px;
          width:100%;
          max-width:620px;
        }
        .option-card{
          background:rgba(255,255,255,0.07);
          border:1px solid rgba(255,255,255,0.14);
          color:var(--text);
          border-radius:16px;
          padding:14px 16px;
          font-weight:900;
          cursor:pointer;
          transition:transform .18s ease,border-color .18s ease,background .18s ease;
        }
        .option-card:hover:not(:disabled){
          transform:translateY(-2px);
          border-color:rgba(56,217,255,.55);
          background:rgba(56,217,255,.10);
        }
        .option-card:disabled{opacity:.55;cursor:not-allowed}

        .img-box{
          background:
            radial-gradient(circle at 50% 45%, rgba(56,217,255,0.09), transparent 34%),
            linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.020));
          border-radius:30px;padding:34px;
          margin:18px 0;display:flex;align-items:center;justify-content:center;
          min-height:230px;position:relative;overflow:hidden;
          animation:popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both;
          box-shadow:0 18px 42px rgba(0,0,0,0.26),0 0 0 1px rgba(255,255,255,0.10) inset;
        }
        .img-box img{
          max-width:100%;
          max-height:165px;
          object-fit:contain;
          position:relative;
          z-index:1;
          filter:drop-shadow(0 18px 28px rgba(0,0,0,0.28));
        }

        /* Answer input */
        .answer-row{display:flex;gap:10px;margin-top:6px}
        .answer-input{
          flex:1;background:rgba(255,255,255,0.075);border:1px solid rgba(255,255,255,0.14);
          color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;
          padding:14px 16px;border-radius:16px;outline:none;
          transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .answer-input:focus{border-color:rgba(240,192,64,0.4);box-shadow:0 0 0 3px rgba(240,192,64,0.07)}
        .answer-input::placeholder{color:var(--muted)}
        .answer-input:disabled{opacity:0.45;cursor:not-allowed}
        .answer-input.answered{border-color:rgba(74,240,160,0.4);background:rgba(74,240,160,0.05)}

        .feedback-ok{font-size:14px;font-weight:700;color:var(--accent2);margin-top:10px;animation:fadeUp 0.2s ease}
        .feedback-err{font-size:14px;color:var(--danger);margin-top:10px;animation:shake 0.35s ease;font-weight:500}

        /* Reveal */
        .reveal-box{
          background:linear-gradient(180deg,rgba(56,217,255,0.12),rgba(167,139,250,0.12));
          border:1px solid rgba(56,217,255,0.26);
          border-radius:22px;padding:24px;text-align:center;margin-bottom:16px;
          animation:reveal-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
          box-shadow:0 0 42px rgba(56,217,255,0.12);
        }
        .reveal-label{font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:var(--muted);margin-bottom:10px}
        .reveal-answer{
          font-family:'Syne',sans-serif;font-size:36px;font-weight:900;
          background:linear-gradient(90deg,var(--accent),var(--accent2));
          background-size:200% auto;-webkit-background-clip:text;
          -webkit-text-fill-color:transparent;background-clip:text;
          animation:shimmer 2s linear infinite;margin-bottom:14px;
        }
        .correct-chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:10px}
        .correct-chip{
          display:inline-flex;align-items:center;gap:5px;
          background:rgba(74,240,160,0.1);border:1px solid rgba(74,240,160,0.25);
          color:var(--accent2);padding:5px 12px;border-radius:100px;
          font-size:12px;font-weight:600;
        }
        .correct-ranking{
          display:flex;flex-direction:column;gap:8px;
          max-width:360px;margin:14px auto 10px;
        }
        .correct-ranking-title{
          font-size:10px;text-transform:uppercase;letter-spacing:0.14em;
          color:var(--muted);margin-bottom:2px;
        }
        .correct-rank-row{
          display:flex;align-items:center;justify-content:space-between;gap:12px;
          background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.10);
          border-radius:12px;padding:9px 12px;
          font-size:13px;font-weight:700;color:var(--text);
        }
        .correct-rank-left{
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
        }
        .correct-rank-time{
          font-family:'Syne',sans-serif;font-weight:900;color:var(--accent);
          flex-shrink:0;
        }
        .reveal-next{font-size:11px;color:var(--muted);margin-top:8px}

        /* Sidebar */
        .sidebar{display:flex;flex-direction:column;gap:16px}
        .sidebar-title{
          font-family:'Syne',sans-serif;font-size:11px;font-weight:700;
          text-transform:uppercase;letter-spacing:0.12em;color:var(--muted);margin-bottom:14px;
        }


        .leaderboard-card{
          transition:transform .2s ease,padding .2s ease,box-shadow .2s ease;
        }
        .leaderboard-playing{
          padding:26px;
          box-shadow:0 28px 80px rgba(0,0,0,0.42),0 0 48px rgba(56,217,255,0.10);
        }
        .leaderboard-playing .sidebar-title{
          font-size:13px;
          margin-bottom:18px;
        }
        .leaderboard-playing .player-row{
          padding:15px 16px;
          border-radius:17px;
          margin-bottom:10px;
          min-height:58px;
        }
        .leaderboard-playing .player-name{
          font-size:15px;
          font-weight:800;
        }
        .leaderboard-playing .player-score{
          font-size:20px;
        }
        .leaderboard-playing .player-medal{
          font-size:20px;
          min-width:28px;
        }
        .leaderboard-playing .player-rank-num{
          font-size:13px;
          min-width:28px;
        }
        .leaderboard-playing .avatar-badge{
          width:42px!important;
          height:42px!important;
          margin-right:12px;
          box-shadow:0 0 18px rgba(56,217,255,0.10);
        }
        .leaderboard-playing .typing-pill,
        .leaderboard-playing .streak-pill{
          display:inline-block;
          margin-top:3px;
        }

        .player-row{
          display:flex;align-items:center;gap:0;
          padding:11px 14px;border-radius:13px;
          background:var(--surface2);border:1px solid var(--border);
          margin-bottom:7px;transition:all 0.3s;position:relative;overflow:visible;
        }
        .player-row.scoring{
          background:rgba(74,240,160,0.06);border-color:rgba(74,240,160,0.25);
          box-shadow:0 0 20px rgba(74,240,160,0.1);animation:glow-pulse 1.5s ease infinite;
        }
        .player-medal{font-size:14px;margin-right:10px;min-width:20px;text-align:center}
        .player-rank-num{font-size:11px;color:var(--muted);font-weight:600;margin-right:10px;min-width:20px}
        .player-name{flex:1;font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .player-score{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:var(--accent)}
        .score-popup{
          position:absolute;right:14px;top:-16px;
          font-family:'Syne',sans-serif;font-size:14px;font-weight:900;
          color:var(--accent2);pointer-events:none;
          animation:floatPoints 1.4s ease-out forwards;
        }

        /* Lobby */
        .lobby-wrap{animation:fadeUp 0.4s ease}
        .lobby-title{font-family:'Syne',sans-serif;font-size:24px;font-weight:900;margin-bottom:6px}
        .lobby-sub{font-size:13px;color:var(--muted);margin-bottom:24px}
        .join-input{
          width:100%;background:var(--surface2);border:1px solid var(--border);
          color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;
          padding:14px 18px;border-radius:14px;outline:none;margin-bottom:12px;
          transition:border-color 0.2s;
        }
        .join-input:focus{border-color:rgba(240,192,64,0.4)}
        .join-input::placeholder{color:var(--muted)}

        .waiting-label{
          font-size:13px;color:var(--muted);
          display:flex;align-items:center;gap:8px;margin-top:16px;
        }
        .dot-pulse{
          display:inline-block;width:7px;height:7px;
          border-radius:50%;background:var(--accent2);
          animation:pulse 1.2s ease-in-out infinite;
        }

        /* Game Over — Podium */
        .gameover-wrap{text-align:center;padding:8px 0 4px;animation:fadeUp 0.5s ease}
        .gameover-trophy{
          font-size:64px;display:block;margin-bottom:8px;
          animation:crown-bounce 2s ease-in-out infinite;
        }
        .gameover-title{
          font-family:'Syne',sans-serif;font-size:36px;font-weight:900;
          background:linear-gradient(90deg,var(--accent),var(--accent2));
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          margin-bottom:4px;
        }
        .gameover-winner{font-size:14px;color:var(--muted);margin-bottom:28px}
        .podium{display:flex;align-items:flex-end;justify-content:center;gap:8px;margin-bottom:28px}
        .podium-col{display:flex;flex-direction:column;align-items:center;gap:0}
        .podium-name{font-size:12px;font-weight:600;margin-bottom:6px;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .podium-score{font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--accent);margin-bottom:4px}
        .podium-block{
          width:72px;display:flex;align-items:center;justify-content:center;
          border-radius:10px 10px 0 0;font-family:'Syne',sans-serif;font-size:20px;font-weight:900;
        }
        .podium-block.p1{height:80px;background:linear-gradient(180deg,rgba(240,192,64,0.3),rgba(240,192,64,0.1));border:1px solid rgba(240,192,64,0.4);animation:podium-in 0.6s 0.1s ease both}
        .podium-block.p2{height:56px;background:rgba(160,176,200,0.15);border:1px solid rgba(160,176,200,0.3);animation:podium-in 0.6s 0.25s ease both}
        .podium-block.p3{height:40px;background:rgba(200,128,96,0.12);border:1px solid rgba(200,128,96,0.25);animation:podium-in 0.6s 0.4s ease both}

        /* Sound button active */

        .host-controls{
          display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.08);
        }
        .danger-btn{color:#fecdd3!important;border-color:rgba(251,113,133,0.28)!important;background:rgba(251,113,133,0.08)!important}
        .volume-slider{width:86px;accent-color:var(--accent);align-self:center}
        .typing-pill{
          color:var(--accent);font-size:10px;font-weight:800;margin-left:6px;
        }
        
        .avatar-picker-grid{
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(58px,1fr));
          gap:10px;
          margin:14px 0 4px;
          max-height:260px;
          overflow-y:auto;
          padding-right:4px;
        }
        .avatar-card{
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(255,255,255,0.04);
          border-radius:16px;
          padding:6px;
          cursor:pointer;
          transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease;
        }
        .avatar-card:hover{transform:translateY(-2px);border-color:rgba(56,217,255,0.45)}
        .avatar-card.selected{
          border-color:rgba(56,217,255,0.9);
          background:rgba(56,217,255,0.08);
          box-shadow:0 0 0 2px rgba(56,217,255,0.16),0 10px 24px rgba(56,217,255,0.14);
        }
        .avatar-card img{
          width:100%;
          aspect-ratio:1/1;
          object-fit:cover;
          display:block;
          border-radius:12px;
          background:rgba(255,255,255,0.06);
        }
        .avatar-badge img{
          width:100%;
          height:100%;
          object-fit:cover;
          border-radius:999px;
          display:block;
        }
.avatar-badge{
          display:inline-grid;place-items:center;width:30px;height:30px;border-radius:999px;
          margin-right:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);
        }
        .streak-pill{
          margin-left:8px;color:#facc15;font-size:11px;font-weight:900;
        }
        .history-list{display:flex;flex-direction:column;gap:7px;margin-top:18px}
        .history-row{
          display:flex;align-items:center;justify-content:space-between;gap:8px;
          padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.045);
          font-size:12px;color:var(--muted);
        }

        .btn-sound-on{
          background:rgba(74,240,160,0.1);border-color:rgba(74,240,160,0.3);
          color:var(--accent2);
        }
      `}</style>

      <div className="page-layout">
        {/* ── MAIN COLUMN ── */}
        <div style={{ display:"flex",flexDirection:"column",gap:16 }}>

          {/* Header */}
          <div className="card">
            <div className="room-header">
              <div>
                <div className="room-title">{getGameLabel(room.gameType)}</div>
                <div className="room-code-badge">{roomCode}</div>
                <div className="room-mode-badge">
                  {room.gameType === "logo-flag"
                    ? room.gameMode === "flags"
                      ? "🌍 Flags only"
                      : room.gameMode === "logos"
                      ? "🏷️ Logos only"
                      : "🎲 Mixed logos + flags"
                    : getGameLabel(room.gameType)}
                </div>
              </div>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={copyInvite}>
                  {copied ? "✓ Copied!" : "🔗 Invite"}
                </button>
                <button
                  className={`btn btn-ghost ${soundEnabled ? "btn-sound-on" : ""}`}
                  onClick={enableSound}
                >
                  {soundEnabled ? "🔊 Sound on" : "🔇 Sound off"}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => playSound("correct")}
                  title="Test sound"
                >
                  Test sound
                </button>
                <button className="btn btn-ghost" onClick={() => setMuted((value) => !value)}>
                  {muted ? "🔇 Muted" : "🔈 SFX"}
                </button>
                <input
                  aria-label="Volume"
                  className="volume-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                />
              </div>
            </div>

            {room.status === "playing" && (
              <>
                <div className="round-track">
                  <div
                    className="round-fill"
                    style={{ width:`${((room.roundNumber || 1) / (room.totalRounds || TOTAL_ROUNDS)) * 100}%` }}
                  />
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",marginTop:8 }}>
                  <span style={{ fontSize:11,color:"var(--muted)" }}>
                    Round {room.roundNumber || 1} of {room.totalRounds || TOTAL_ROUNDS}
                  </span>
                  <span style={{ fontSize:11,color:"var(--muted)" }}>
                    {((room.roundNumber || 1) - 1)} done
                  </span>
                </div>
              </>
            )}

            {isHost && room.status === "playing" && (
              <div className="host-controls">
                <button className="btn btn-ghost" onClick={skipQuestion}>⏭ Skip</button>
                <button className="btn btn-ghost" onClick={restartGame}>🔁 Restart</button>
                <button className="btn btn-ghost danger-btn" onClick={endGame}>⛔ End</button>
              </div>
            )}
          </div>

          {/* ── LOBBY ── */}
          {room.status !== "playing" && room.status !== "ended" && (
            <div className="card-elevated lobby-wrap">
              <div className="lobby-title">Waiting Room</div>
              <div className="lobby-sub">Enter your name, then join the game.</div>

              <input
                className="join-input"
                placeholder="Your name…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                maxLength={20}
              />

              <div className="avatar-picker-grid">
                {FUNNY_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    className={`avatar-card ${selectedAvatar === avatar.url ? "selected" : ""}`}
                    onClick={() => chooseAvatar(avatar.url)}
                    title={avatar.label}
                  >
                    <img src={avatar.url} alt={avatar.label} />
                  </button>
                ))}
              </div>

              <div className="btn-row">
                <button className="btn btn-primary" onClick={joinRoom} disabled={!name.trim()}>
                  Join Game
                </button>
                {uid && room.players?.[uid] && (
                  <button className="btn btn-ghost" onClick={() => chooseAvatar(selectedAvatar)}>
                    Save avatar
                  </button>
                )}
                {isHost && (
                  <button className="btn btn-green" onClick={startGame} disabled={players.length === 0}>
                    ▶ Start Game
                  </button>
                )}
              </div>

              <div className="waiting-label">
                <span className="dot-pulse" />
                {players.length} player{players.length !== 1 ? "s" : ""} in lobby
              </div>
            </div>
          )}

          {/* ── PLAYING ── */}
          {room.status === "playing" && room.currentQuestion && (
            <div className="card-elevated" style={{ animation:"fadeUp 0.35s ease" }}>
              {/* Top row: question type + timer */}
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
                <div className="q-type-badge">
                  {getQuestionLabel(room.currentQuestion)}
                </div>

                <div className="timer-wrap">
                  <div className="timer-ring-wrap" style={{
                    animation: timerPct < 25 ? "timer-warn 0.5s ease infinite" : "none"
                  }}>
                    <svg width="68" height="68" viewBox="0 0 68 68">
                      <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                      <circle
                        cx="34" cy="34" r="28" fill="none"
                        stroke={timerColor} strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={dashOffset}
                        style={{ transition:"stroke-dashoffset 0.3s linear,stroke 0.3s",filter:`drop-shadow(0 0 6px ${timerGlow})` }}
                      />
                    </svg>
                    <div className="timer-number" style={{ color:timerColor }}>{timeLeft}</div>
                  </div>
                </div>
              </div>

              {/* Reveal overlay */}
              {isReveal && (
                <div className="reveal-box">
                  <div className="reveal-label">Correct answer</div>
                  <div className="reveal-answer">
                    {room.currentQuestion.answer}
                  </div>
                  {correctPlayers.length > 0 && (
                    <div className="correct-ranking">
                      <div className="correct-ranking-title">Fastest correct answers</div>

                      {correctPlayers.map((player, index) => (
                        <div key={player.id} className="correct-rank-row">
                          <span className="correct-rank-left">
                            <strong>#{index + 1}</strong> {player.name}
                          </span>
                          <span className="correct-rank-time">
                            {formatAnswerSpeed(player.timeTakenMs)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="reveal-next">Next question in {timeLeft}s…</div>
                </div>
              )}

              {/* Question content */}
              {room.currentQuestion.type === "flag" || room.currentQuestion.type === "logo" ? (
                <div className="img-box" key={room.questionIndex}>
                  <img
                    src={room.currentQuestion.imageUrl}
                    alt="Guess this"
                    draggable={false}
                    onContextMenu={(event) => event.preventDefault()}
                    onError={(event) => {
                      const img = event.currentTarget;
                      if (img.dataset.fallbackUsed === "true") return;
                      img.dataset.fallbackUsed = "true";
                      img.src =
                        room.currentQuestion?.fallbackUrl ||
                        (room.currentQuestion?.type === "logo"
                          ? `https://www.google.com/s2/favicons?domain=${room.currentQuestion.answer.toLowerCase().replace(/\s+/g, "")}.com&sz=256`
                          : "/favicon.ico");
                    }}
                  />
                </div>
              ) : (
                <div className={`party-question party-${room.currentQuestion.type}`} key={room.questionIndex}>
                  <div className="party-game-label">{getGameLabel(room.gameType)}</div>
                  <div className={room.currentQuestion.type === "emoji" ? "emoji-prompt" : "party-prompt"}>
                    {room.currentQuestion.prompt}
                  </div>

                  {room.currentQuestion.options && (
                    <>
                    <div className="option-hint">Click an option, then press Enter / Submit</div>
                    <div className="option-grid">
                      {room.currentQuestion.options.map((option, index) => (
                        <button
                          key={option}
                          type="button"
                          className="option-card"
                          onClick={() => {
                            const letter = String.fromCharCode(65 + index);
                            setAnswer(letter);
                            setFeedback(null);
                            setTimeout(() => answerInputRef.current?.focus(), 50);
                          }}
                          disabled={isReveal || timeLeft === 0 || !!alreadyAnswered}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    </>
                  )}
                </div>
              )}

              {/* Answer input */}
              <div className="answer-row">
                <input
                  ref={answerInputRef}
                  className={`answer-input ${alreadyAnswered ? "answered" : ""}`}
                  placeholder={
                    alreadyAnswered
                      ? "✓ Answered correctly!"
                      : room.currentQuestion.type === "typing"
                        ? "Type the phrase exactly…"
                        : room.currentQuestion.options
                          ? "Type A/B/C/D or click an option…"
                          : "Type your answer…"
                  }
                  value={answer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !alreadyAnswered && !isReveal && submitAnswer()}
                  disabled={isReveal || timeLeft === 0 || !!alreadyAnswered}
                  autoFocus
                />
                <button
                  className="btn btn-primary"
                  onClick={submitAnswer}
                  disabled={isReveal || timeLeft === 0 || !!alreadyAnswered || !answer.trim()}
                >
                  Submit
                </button>
              </div>

              {feedback && (
                <div className={feedback.ok ? "feedback-ok" : "feedback-err"}>
                  {feedback.text}
                </div>
              )}

              <div className="reaction-bar">
                {["😂", "🔥", "😡", "GG"].map((emoji) => (
                  <button key={emoji} className="btn btn-ghost reaction-btn" onClick={() => sendReaction(emoji)}>
                    {emoji}
                  </button>
                ))}
              </div>

              {room.reactions && (
                <div className="reaction-float">
                  {Object.entries(room.reactions).slice(-6).map(([id, reaction]) => (
                    <span key={id} className="reaction-pill">
                      {reaction.emoji} {reaction.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── GAME OVER ── */}
          {room.status === "ended" && (
            <div className="card-elevated gameover-wrap">
              <span className="gameover-trophy">🏆</span>
              <div className="gameover-title">Game Over!</div>
              <div className="gameover-winner">
                {sortedPlayers[0]?.name} wins with {sortedPlayers[0]?.score} pts
              </div>

              {/* Podium */}
              <div className="podium">
                {/* 2nd */}
                {sortedPlayers[1] && (
                  <div className="podium-col">
                    <div className="podium-name">{sortedPlayers[1].name}</div>
                    <div className="podium-score">{sortedPlayers[1].score}</div>
                    <div className="podium-block p2">🥈</div>
                  </div>
                )}
                {/* 1st */}
                {sortedPlayers[0] && (
                  <div className="podium-col">
                    <div className="podium-name">{sortedPlayers[0].name}</div>
                    <div className="podium-score">{sortedPlayers[0].score}</div>
                    <div className="podium-block p1">🥇</div>
                  </div>
                )}
                {/* 3rd */}
                {sortedPlayers[2] && (
                  <div className="podium-col">
                    <div className="podium-name">{sortedPlayers[2].name}</div>
                    <div className="podium-score">{sortedPlayers[2].score}</div>
                    <div className="podium-block p3">🥉</div>
                  </div>
                )}
              </div>

              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-label">Fastest</div>
                  <div className="stat-value">
                    {gameStats.fastestAnswer ? `${gameStats.fastestAnswer.playerName} +${gameStats.fastestAnswer.speed}` : "—"}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Best Streak</div>
                  <div className="stat-value">
                    {gameStats.bestStreakPlayer ? `${gameStats.bestStreakPlayer.name} 🔥${gameStats.bestStreakPlayer.bestStreak || 0}` : "—"}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Most Accurate</div>
                  <div className="stat-value">
                    {gameStats.mostAccuratePlayer?.name || "—"}
                  </div>
                </div>
              </div>

              {sortedPlayers[0] && (
                <div className="achievement-list">
                  {getAchievements(sortedPlayers[0]).map((achievement) => (
                    <span key={achievement} className="achievement-chip">{achievement}</span>
                  ))}
                </div>
              )}

              {sortedPlayers[0]?.history && (
                <div className="history-list">
                  <div className="sidebar-title">Winner history</div>
                  {Object.values(sortedPlayers[0].history || {}).slice(-5).map((item) => (
                    <div key={item.round} className="history-row">
                      <span>{item.correct ? "✅" : "❌"} R{item.round}: {item.correctAnswer}</span>
                      <strong>{item.correct ? `+${item.points}` : "+0"}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Rest of players */}
              {sortedPlayers.slice(3).map((p, i) => (
                <div key={p.name} style={{ fontSize:13,color:"var(--muted)",marginBottom:4 }}>
                  #{i + 4} {p.name} — {p.score} pts
                </div>
              ))}

              {sortedPlayers[0]?.history && (
                <div className="history-list">
                  <div className="sidebar-title">Winner history</div>
                  {Object.values(sortedPlayers[0].history || {}).slice(-5).map((item) => (
                    <div key={item.round} className="history-row">
                      <span>{item.correct ? "✅" : "❌"} R{item.round}: {item.correctAnswer}</span>
                      <strong>{item.correct ? `+${item.points}` : "+0"}</strong>
                    </div>
                  ))}
                </div>
              )}

              {isHost && (
                <button
                  className="btn btn-green"
                  onClick={startGame}
                  style={{ margin:"24px auto 0",display:"block",padding:"12px 32px",fontSize:15 }}
                >
                  ▶ Play Again
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── SIDEBAR — Leaderboard ── */}
        <div className={`sidebar ${room.status === "playing" ? "sidebar-playing" : ""}`}>
          <div className={`card leaderboard-card ${room.status === "playing" ? "leaderboard-playing" : ""}`}>
            <div className="sidebar-title">Leaderboard</div>
            {sortedPlayers.length === 0 && (
              <div style={{ color:"var(--muted)",fontSize:13,textAlign:"center",padding:"20px 0" }}>
                No players yet
              </div>
            )}
            {sortedPlayers.map((player, index) => (
              <div
                key={player.name}
                className={`player-row ${justScored[player.name] ? "scoring" : ""}`}
              >
                {scorePopups[player.name] && (
                  <span className="score-popup">+{scorePopups[player.name]}</span>
                )}
                {index < 3 ? (
                  <span className="player-medal">
                    {["🥇","🥈","🥉"][index]}
                  </span>
                ) : (
                  <span className="player-rank-num">#{index + 1}</span>
                )}
                <span className="avatar-badge" style={{ borderColor: player.color || "rgba(255,255,255,0.12)" }}>
                  <img key={player.avatar || player.name} src={player.avatar || pickAvatar(player.name)} alt={player.name} />
                </span>
                <span className="player-name">
                  {player.name}
                  {player.typing && room.status === "playing" && room.phase === "question" && (
                    <span className="typing-pill">typing…</span>
                  )}
                  {(player.streak || 0) >= 3 && (
                    <span className="streak-pill">🔥{player.streak}</span>
                  )}
                </span>
                <span className="player-score">
                  {displayScores[player.name] ?? player.score}
                </span>
              </div>
            ))}
          </div>

          {/* Points guide */}
          <div className="card" style={{ fontSize:12,color:"var(--muted)" }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:12 }}>
              Points Guide
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {[
                { label:"Exact speed", sub:"Points = seconds left", value:"15→1", color:"var(--accent2)" },
                { label:"Example", sub:"Answer with 12s left", value:"+12", color:"var(--accent)" },
                { label:"Minimum", sub:"Last-second answer", value:"+1", color:"var(--muted)" },
                { label:"Streak bonus", sub:"3+ correct in a row", value:"+6+", color:"var(--accent2)" },
                { label:"Streak bonus", sub:"3+ correct in a row", value:"+6+", color:"var(--accent2)" },
              ].map((row) => (
                <div key={row.label} style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:12,fontWeight:500,color:"var(--text)" }}>{row.label}</div>
                    <div style={{ fontSize:11 }}>{row.sub}</div>
                  </div>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:row.color }}>
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
