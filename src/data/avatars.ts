export type AvatarCategory = 'all' | 'movies' | 'anime' | 'gaming' | 'people' | 'robots' | 'emoji';

export interface AvatarOption {
  id: string;
  name: string;
  category: Exclude<AvatarCategory, 'all'>;
  url: string;
  tags?: string[];
}

export const FLATICON_PRESETS = [
  { label: '🎬 Movies & Heroes', query: 'movie superhero avatar' },
  { label: '⛩️ Anime & Manga', query: 'anime manga avatar' },
  { label: '🎮 Gaming & Arcade', query: 'game avatar character' },
  { label: '🧙 Fantasy & Magic', query: 'fantasy wizard avatar' },
  { label: '🤖 Sci-Fi & Cyborg', query: 'cyborg robot avatar' },
];

export const DEFAULT_AVATARS: AvatarOption[] = [
  // ================= MOVIES & CINEMA =================
  {
    id: 'm-spiderman',
    name: 'Spider-Man',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1090/1090805.png',
    tags: ['marvel', 'hero', 'peter parker', 'spider', 'superhero', 'avengers']
  },
  {
    id: 'm-batman',
    name: 'Batman',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1090/1090806.png',
    tags: ['dc', 'dark knight', 'bruce wayne', 'gotham', 'superhero']
  },
  {
    id: 'm-ironman',
    name: 'Iron Man',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1090/1090804.png',
    tags: ['marvel', 'tony stark', 'avengers', 'superhero']
  },
  {
    id: 'm-captamerica',
    name: 'Capt. America',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1090/1090803.png',
    tags: ['marvel', 'steve rogers', 'avengers', 'shield']
  },
  {
    id: 'm-deadpool',
    name: 'Deadpool',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1090/1090807.png',
    tags: ['marvel', 'wade wilson', 'x-men', 'mutant']
  },
  {
    id: 'm-wolverine',
    name: 'Wolverine',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1090/1090802.png',
    tags: ['marvel', 'logan', 'x-men', 'mutant', 'claws']
  },
  {
    id: 'm-thor',
    name: 'Thor',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1090/1090801.png',
    tags: ['marvel', 'asgard', 'avengers', 'hammer', 'god of thunder']
  },
  {
    id: 'm-hulk',
    name: 'Hulk',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1090/1090800.png',
    tags: ['marvel', 'bruce banner', 'avengers', 'smash']
  },
  {
    id: 'm-vader',
    name: 'Darth Vader',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1090/1090808.png',
    tags: ['star wars', 'sith', 'anakin', 'empire']
  },
  {
    id: 'm-yoda',
    name: 'Master Yoda',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1090/1090809.png',
    tags: ['star wars', 'jedi', 'force', 'master']
  },
  {
    id: 'm-stormtrooper',
    name: 'Stormtrooper',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1090/1090810.png',
    tags: ['star wars', 'empire', 'soldier']
  },
  {
    id: 'm-chewbacca',
    name: 'Chewbacca',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1090/1090811.png',
    tags: ['star wars', 'wookiee', 'solo']
  },
  {
    id: 'm-r2d2',
    name: 'R2-D2',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1090/1090812.png',
    tags: ['star wars', 'droid', 'astromech']
  },
  {
    id: 'm-c3po',
    name: 'C-3PO',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1090/1090813.png',
    tags: ['star wars', 'droid', 'protocol']
  },
  {
    id: 'm-bobafett',
    name: 'Boba Fett',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1090/1090814.png',
    tags: ['star wars', 'mandalorian', 'bounty hunter']
  },
  {
    id: 'm-harrypotter',
    name: 'Harry Potter',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1423/1423775.png',
    tags: ['harry potter', 'wizard', 'magic', 'hogwarts', 'gryffindor']
  },
  {
    id: 'm-sorcerer',
    name: 'Sorcerer',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1423/1423773.png',
    tags: ['magic', 'wizard', 'spells', 'fantasy']
  },
  {
    id: 'm-witch',
    name: 'Spellcaster',
    category: 'movies',
    url: 'https://cdn-icons-png.flaticon.com/512/1423/1423770.png',
    tags: ['witch', 'magic', 'fantasy', 'potion']
  },

  // ================= ANIME & MANGA =================
  {
    id: 'a-shinobi',
    name: 'Shinobi',
    category: 'anime',
    url: 'https://cdn-icons-png.flaticon.com/512/3574/3574844.png',
    tags: ['ninja', 'naruto', 'leaf', 'shinobi', 'jutsu']
  },
  {
    id: 'a-samurai',
    name: 'Ronin Samurai',
    category: 'anime',
    url: 'https://cdn-icons-png.flaticon.com/512/3574/3574843.png',
    tags: ['samurai', 'katana', 'sword', 'zoro', 'kenshin']
  },
  {
    id: 'a-shonen',
    name: 'Shonen Hero',
    category: 'anime',
    url: 'https://cdn-icons-png.flaticon.com/512/3574/3574842.png',
    tags: ['goku', 'luffy', 'shonen', 'anime boy', 'saiyan']
  },
  {
    id: 'a-demon-slayer',
    name: 'Demon Hunter',
    category: 'anime',
    url: 'https://cdn-icons-png.flaticon.com/512/3574/3574841.png',
    tags: ['tanjiro', 'kimetsu', 'slayer', 'blade']
  },
  {
    id: 'a-kunoichi',
    name: 'Kunoichi',
    category: 'anime',
    url: 'https://cdn-icons-png.flaticon.com/512/3574/3574840.png',
    tags: ['ninja girl', 'sakura', 'tsunade', 'hinata']
  },
  {
    id: 'a-sensei',
    name: 'Anime Sensei',
    category: 'anime',
    url: 'https://cdn-icons-png.flaticon.com/512/3574/3574839.png',
    tags: ['kakashi', 'gojo', 'teacher', 'master', 'mask']
  },
  {
    id: 'a-magical-girl',
    name: 'Magical Girl',
    category: 'anime',
    url: 'https://cdn-icons-png.flaticon.com/512/3574/3574838.png',
    tags: ['sailor moon', 'shoujo', 'magic', 'sparkle']
  },
  {
    id: 'a-mecha',
    name: 'Mecha Pilot',
    category: 'anime',
    url: 'https://cdn-icons-png.flaticon.com/512/3574/3574837.png',
    tags: ['gundam', 'evangelion', 'pilot', 'scifi']
  },
  {
    id: 'a-otaku',
    name: 'Cosplayer',
    category: 'anime',
    url: 'https://cdn-icons-png.flaticon.com/512/3574/3574836.png',
    tags: ['cosplay', 'otaku', 'convention', 'fan']
  },
  {
    id: 'a-kitsune',
    name: 'Spirit Fox',
    category: 'anime',
    url: 'https://cdn-icons-png.flaticon.com/512/3574/3574835.png',
    tags: ['kitsune', 'mask', 'yokai', 'anbu']
  },
  {
    id: 'a-aria',
    name: 'Aria',
    category: 'anime',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Aria',
    tags: ['lorelei', 'kawaii', 'cute']
  },
  {
    id: 'a-luna',
    name: 'Luna',
    category: 'anime',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Luna',
    tags: ['lorelei', 'kawaii', 'aesthetic']
  },
  {
    id: 'a-kai',
    name: 'Kai',
    category: 'anime',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Kai',
    tags: ['notionist', 'minimal', 'monochrome']
  },
  {
    id: 'a-hana',
    name: 'Hana',
    category: 'anime',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Hana',
    tags: ['notionist', 'flower', 'japanese']
  },

  // ================= GAMING & POP CULTURE =================
  {
    id: 'g-pad',
    name: 'Controller',
    category: 'gaming',
    url: 'https://cdn-icons-png.flaticon.com/512/808/808439.png',
    tags: ['gamepad', 'playstation', 'xbox', 'console']
  },
  {
    id: 'g-arcade',
    name: 'Arcade Machine',
    category: 'gaming',
    url: 'https://cdn-icons-png.flaticon.com/512/808/808440.png',
    tags: ['arcade', 'retro', 'street fighter', 'coin']
  },
  {
    id: 'g-gameboy',
    name: 'Handheld Console',
    category: 'gaming',
    url: 'https://cdn-icons-png.flaticon.com/512/808/808441.png',
    tags: ['nintendo', 'gameboy', 'retro', 'switch']
  },
  {
    id: 'g-joystick',
    name: 'Retro Joystick',
    category: 'gaming',
    url: 'https://cdn-icons-png.flaticon.com/512/808/808443.png',
    tags: ['retro', 'atari', 'arcade', 'joystick']
  },
  {
    id: 'g-sword',
    name: 'Quest Shield',
    category: 'gaming',
    url: 'https://cdn-icons-png.flaticon.com/512/686/686589.png',
    tags: ['rpg', 'zelda', 'link', 'fantasy', 'shield']
  },
  {
    id: 'g-skull',
    name: 'Boss Skull',
    category: 'gaming',
    url: 'https://cdn-icons-png.flaticon.com/512/686/686591.png',
    tags: ['boss', 'skull', 'game over', 'dark souls']
  },
  {
    id: 'g-potion',
    name: 'Mana Potion',
    category: 'gaming',
    url: 'https://cdn-icons-png.flaticon.com/512/686/686593.png',
    tags: ['potion', 'mana', 'health', 'elixir']
  },

  // ================= PEOPLE & PERSONAS =================
  {
    id: 'p-alex',
    name: 'Alex',
    category: 'people',
    url: 'https://api.dicebear.com/7.x/personas/svg?seed=Alex',
    tags: ['person', 'modern', 'casual']
  },
  {
    id: 'p-sam',
    name: 'Sam',
    category: 'people',
    url: 'https://api.dicebear.com/7.x/personas/svg?seed=Sam',
    tags: ['person', 'glasses', 'developer']
  },
  {
    id: 'p-jordan',
    name: 'Jordan',
    category: 'people',
    url: 'https://api.dicebear.com/7.x/personas/svg?seed=Jordan',
    tags: ['person', 'urban']
  },
  {
    id: 'p-felix',
    name: 'Felix',
    category: 'people',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
    tags: ['adventurer', 'hat', 'traveler']
  },
  {
    id: 'p-aneka',
    name: 'Aneka',
    category: 'people',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
    tags: ['adventurer', 'explorer']
  },
  {
    id: 'p-milo',
    name: 'Milo',
    category: 'people',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo',
    tags: ['creative', 'art']
  },
  {
    id: 'p-reese',
    name: 'Reese',
    category: 'people',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Reese',
    tags: ['avataaars', 'professional']
  },
  {
    id: 'p-quinn',
    name: 'Quinn',
    category: 'people',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Quinn',
    tags: ['avataaars', 'business']
  },
  {
    id: 'p-skyler',
    name: 'Skyler',
    category: 'people',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Skyler',
    tags: ['avataaars', 'friendly']
  },

  // ================= ROBOTS & TECH =================
  {
    id: 'r-sparks',
    name: 'Sparks',
    category: 'robots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sparks',
    tags: ['bot', 'ai', 'robot']
  },
  {
    id: 'r-gizmo',
    name: 'Gizmo',
    category: 'robots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo',
    tags: ['bot', 'cute', 'robot']
  },
  {
    id: 'r-byte',
    name: 'Byte',
    category: 'robots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Byte',
    tags: ['bot', 'tech', 'cyber']
  },
  {
    id: 'r-pixel',
    name: 'Pixel',
    category: 'robots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Pixel',
    tags: ['bot', 'neon', 'mech']
  },
  {
    id: 'r-circuit',
    name: 'Circuit',
    category: 'robots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Circuit',
    tags: ['bot', 'cpu', 'electronic']
  },
  {
    id: 'r-nova',
    name: 'Nova',
    category: 'robots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nova',
    tags: ['bot', 'space', 'satellite']
  },

  // ================= EMOJI & FUN =================
  {
    id: 'e-sunny',
    name: 'Sunny',
    category: 'emoji',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Sunny',
    tags: ['smile', 'happy', 'yellow']
  },
  {
    id: 'e-chill',
    name: 'Chill',
    category: 'emoji',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Chill',
    tags: ['relax', 'cool', 'sunglasses']
  },
  {
    id: 'e-fire',
    name: 'Fire',
    category: 'emoji',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Fire',
    tags: ['hot', 'flame', 'hype']
  },
  {
    id: 'e-star',
    name: 'Star Eyes',
    category: 'emoji',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Star',
    tags: ['star', 'excited', 'wow']
  },
  {
    id: 'e-party',
    name: 'Party',
    category: 'emoji',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Party',
    tags: ['celebration', 'confetti', 'yay']
  },
  {
    id: 'e-love',
    name: 'Heart Eyes',
    category: 'emoji',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Love',
    tags: ['love', 'heart', 'romance']
  }
];
