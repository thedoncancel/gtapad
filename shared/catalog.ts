/**
 * The catalog: characters, rides, heat, places and brands from the GTA series. Every launch claims one.
 * Fan-made and unofficial: names refer to the games; the images are AI-generated lookalikes, not Rockstar art.
 */
export type Category = "crew" | "rides" | "heat" | "turf" | "loot";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type Game = "GTA VI" | "GTA V" | "GTA Online" | "Vice City" | "San Andreas" | "Series";

export interface Item {
  id: string;
  name: string;
  cat: Category;
  game: Game;
  rarity: Rarity;
  /** Two colors for the fallback gradient while the photo loads. */
  hue: [string, string];
  line: string;
}

export const CATEGORIES: { id: Category; label: string; blurb: string }[] = [
  { id: "crew", label: "Characters", blurb: "Protagonists and the people around them" },
  { id: "rides", label: "Rides", blurb: "Cars, bikes, boats, aircraft" },
  { id: "heat", label: "Heat", blurb: "What you carry" },
  { id: "turf", label: "Places", blurb: "Cities, landmarks, hideouts" },
  { id: "loot", label: "Brands & loot", blurb: "Things you drink, eat and steal" },
];

const P = { pink: "#ff2e88", orange: "#ff8a3d", teal: "#19e3d0", violet: "#8b5cf6", gold: "#ffd166", lime: "#7cff6b", sky: "#38bdf8", red: "#ff4d4d" };

export const ITEMS: Item[] = [
  // Characters
  { id: "lucia", name: "Lucia Caminos", cat: "crew", game: "GTA VI", rarity: "legendary", hue: [P.pink, P.orange], line: "The first woman to lead a GTA in decades. Fresh out, done waiting." },
  { id: "jason", name: "Jason Duval", cat: "crew", game: "GTA VI", rarity: "legendary", hue: [P.orange, P.gold], line: "Ex-army, Keys local. Ride or die with Lucia." },
  { id: "cal", name: "Cal Hampton", cat: "crew", game: "GTA VI", rarity: "rare", hue: [P.teal, P.sky], line: "Jason's paranoid buddy. Has a theory about everything." },
  { id: "boobie", name: "Boobie Ike", cat: "crew", game: "GTA VI", rarity: "epic", hue: [P.gold, P.violet], line: "Strip club, recording studio, real estate. Vice City mogul." },
  { id: "drequan", name: "Dre'Quan Priest", cat: "crew", game: "GTA VI", rarity: "rare", hue: [P.violet, P.pink], line: "Running Only Raw Records out of a strip club office." },
  { id: "real-dimez", name: "Real Dimez", cat: "crew", game: "GTA VI", rarity: "rare", hue: [P.pink, P.violet], line: "Bae-Luxe and Roxy. Viral first, rappers second." },
  { id: "raul", name: "Raul Bautista", cat: "crew", game: "GTA VI", rarity: "epic", hue: [P.red, P.gold], line: "Bank robber with a taste for the big score." },
  { id: "brian", name: "Brian Heder", cat: "crew", game: "GTA VI", rarity: "rare", hue: [P.lime, P.orange], line: "Old-school Keys smuggler. Jason's landlord and boss." },
  { id: "michael", name: "Michael De Santa", cat: "crew", game: "GTA V", rarity: "legendary", hue: [P.sky, P.violet], line: "Retired bank robber in witness protection. Didn't stay retired." },
  { id: "franklin", name: "Franklin Clinton", cat: "crew", game: "GTA V", rarity: "epic", hue: [P.lime, P.teal], line: "Repo man turned heist driver turned agency owner." },
  { id: "trevor", name: "Trevor Philips", cat: "crew", game: "GTA V", rarity: "legendary", hue: [P.red, P.orange], line: "Sandy Shores' most unstable businessman." },
  { id: "lamar", name: "Lamar Davis", cat: "crew", game: "GTA V", rarity: "rare", hue: [P.gold, P.lime], line: "Roasts first, asks questions never." },
  { id: "lester", name: "Lester Crest", cat: "crew", game: "GTA V", rarity: "rare", hue: [P.teal, P.lime], line: "The man with the plan and the cane." },
  { id: "chop", name: "Chop", cat: "crew", game: "GTA V", rarity: "epic", hue: [P.orange, P.red], line: "Franklin's Rottweiler. Best boy in Los Santos." },
  { id: "cj", name: "Carl \"CJ\" Johnson", cat: "crew", game: "San Andreas", rarity: "legendary", hue: [P.lime, P.gold], line: "Grove Street. Home. At least it was before." },
  { id: "tommy", name: "Tommy Vercetti", cat: "crew", game: "Vice City", rarity: "legendary", hue: [P.sky, P.pink], line: "Fifteen years inside, then took the whole city." },

  // Rides
  { id: "infernus", name: "Infernus", cat: "rides", game: "Series", rarity: "legendary", hue: [P.pink, P.orange], line: "The wedge-nosed supercar that's been in nearly every game." },
  { id: "cheetah", name: "Cheetah", cat: "rides", game: "Series", rarity: "epic", hue: [P.red, P.gold], line: "Red, low and loud. A Vice City icon." },
  { id: "banshee", name: "Banshee", cat: "rides", game: "Series", rarity: "rare", hue: [P.violet, P.sky], line: "Long hood, big engine, zero chill." },
  { id: "zentorno", name: "Zentorno", cat: "rides", game: "GTA V", rarity: "epic", hue: [P.gold, P.orange], line: "All angles. The Online grinder's first dream car." },
  { id: "adder", name: "Adder", cat: "rides", game: "GTA V", rarity: "epic", hue: [P.teal, P.violet], line: "Million-dollar hypercar. Top speed, no brakes." },
  { id: "kuruma", name: "Kuruma (Armored)", cat: "rides", game: "GTA Online", rarity: "rare", hue: [P.sky, P.teal], line: "The heist car. Bulletproof glass, bulletproof reputation." },
  { id: "oppressor", name: "Oppressor Mk II", cat: "rides", game: "GTA Online", rarity: "legendary", hue: [P.red, P.violet], line: "The flying bike everyone in the lobby hates." },
  { id: "faggio", name: "Faggio", cat: "rides", game: "Series", rarity: "common", hue: [P.lime, P.sky], line: "Slowest scooter in the state. Most loved." },
  { id: "sanchez", name: "Sanchez", cat: "rides", game: "Series", rarity: "common", hue: [P.orange, P.lime], line: "Dirt bike for hills, ramps and bad decisions." },
  { id: "jetmax", name: "Jetmax", cat: "rides", game: "Series", rarity: "rare", hue: [P.teal, P.pink], line: "Speedboat built for running cargo past the Keys." },
  { id: "buzzard", name: "Buzzard", cat: "rides", game: "GTA V", rarity: "epic", hue: [P.violet, P.teal], line: "Attack chopper. Fast respawns, faster rockets." },
  { id: "hydra", name: "Hydra", cat: "rides", game: "Series", rarity: "legendary", hue: [P.sky, P.red], line: "Vertical takeoff jet. Lifted from a military base, naturally." },

  // Heat
  { id: "sticky-bomb", name: "Sticky Bomb", cat: "heat", game: "GTA V", rarity: "rare", hue: [P.red, P.orange], line: "Slap it on, walk away, press the button." },
  { id: "minigun", name: "Minigun", cat: "heat", game: "Series", rarity: "epic", hue: [P.gold, P.red], line: "Thousands of rounds a minute. Subtle." },
  { id: "rpg", name: "RPG", cat: "heat", game: "Series", rarity: "epic", hue: [P.orange, P.gold], line: "The answer to every police helicopter." },
  { id: "atomizer", name: "Up-n-Atomizer", cat: "heat", game: "GTA Online", rarity: "legendary", hue: [P.teal, P.lime], line: "Retro-futuristic ray gun. Launches cars into orbit." },
  { id: "golf-club", name: "Golf Club", cat: "heat", game: "Series", rarity: "common", hue: [P.lime, P.teal], line: "Country club etiquette, street rules." },

  // Places
  { id: "vice-city", name: "Vice City", cat: "turf", game: "GTA VI", rarity: "legendary", hue: [P.pink, P.teal], line: "Neon, beaches, money. Back after more than twenty years." },
  { id: "leonida-keys", name: "Leonida Keys", cat: "turf", game: "GTA VI", rarity: "epic", hue: [P.teal, P.sky], line: "Island chain of stilt houses, bridges and smugglers." },
  { id: "grassrivers", name: "Grassrivers", cat: "turf", game: "GTA VI", rarity: "rare", hue: [P.lime, P.orange], line: "Swamp country. Airboats and gators." },
  { id: "port-gellhorn", name: "Port Gellhorn", cat: "turf", game: "GTA VI", rarity: "common", hue: [P.orange, P.red], line: "Faded beach town on the Gulf side." },
  { id: "mount-kalaga", name: "Mount Kalaga", cat: "turf", game: "GTA VI", rarity: "rare", hue: [P.lime, P.sky], line: "Northern woods, trails and lakes." },
  { id: "los-santos", name: "Los Santos", cat: "turf", game: "GTA V", rarity: "legendary", hue: [P.orange, P.violet], line: "The city of dreams, smog and sponsored content." },
  { id: "vinewood", name: "Vinewood Hills", cat: "turf", game: "GTA V", rarity: "epic", hue: [P.gold, P.pink], line: "Mansions, the famous sign and a view of the whole city." },
  { id: "maze-bank", name: "Maze Bank Tower", cat: "turf", game: "GTA V", rarity: "epic", hue: [P.sky, P.violet], line: "Tallest tower in the city. Best base jump in it, too." },
  { id: "chiliad", name: "Mount Chiliad", cat: "turf", game: "Series", rarity: "rare", hue: [P.teal, P.lime], line: "The mystery mountain. Still unsolved, apparently." },
  { id: "cayo-perico", name: "Cayo Perico", cat: "turf", game: "GTA Online", rarity: "legendary", hue: [P.lime, P.pink], line: "Private island, one compound, the most-run heist ever." },
  { id: "sandy-shores", name: "Sandy Shores", cat: "turf", game: "GTA V", rarity: "common", hue: [P.orange, P.gold], line: "Trailer parks, meth, an airfield and Trevor." },

  // Brands & loot
  { id: "sprunk", name: "Sprunk", cat: "loot", game: "Series", rarity: "rare", hue: [P.lime, P.teal], line: "The essence of life. In a green can." },
  { id: "ecola", name: "eCola", cat: "loot", game: "Series", rarity: "common", hue: [P.red, P.pink], line: "Deliciously infectious." },
  { id: "cluckin-bell", name: "Cluckin' Bell", cat: "loot", game: "Series", rarity: "rare", hue: [P.gold, P.orange], line: "Fast-food chicken of questionable origin." },
  { id: "burger-shot", name: "Burger Shot", cat: "loot", game: "Series", rarity: "rare", hue: [P.orange, P.red], line: "Bleeder burgers and Heart Stopper meals." },
  { id: "pisswasser", name: "Pißwasser", cat: "loot", game: "Series", rarity: "common", hue: [P.gold, P.lime], line: "You're in for a good time." },
  { id: "five-stars", name: "Five Stars", cat: "loot", game: "Series", rarity: "legendary", hue: [P.gold, P.red], line: "Maximum wanted level. Every cop in the state." },
  { id: "heist-cash", name: "Heist Cash", cat: "loot", game: "GTA Online", rarity: "epic", hue: [P.lime, P.gold], line: "Duffel bags from the vault. Split four ways, if you're lucky." },
];

export const itemById = (id: string) => ITEMS.find((i) => i.id === id);

export const RARITY_LABEL: Record<Rarity, string> = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" };
