// src/types.ts
export type SocialLink =
  | 'coolapk'
  | 'telegram'
  | 'github'
  | 'bilibili'
  | 'twitter'
  | 'zhihu'
  | 'steam'
  | 'netease_music'
  | 'linkedin'; // <-- Add this


export const SocialMediaIconId: Record<SocialLink, string> = {
  coolapk: 'coolapk',
  telegram: 'telegram',
  github: 'github',
  bilibili: 'bilibili',
  twitter: 'twitter',
  zhihu: 'zhihu',
  steam: 'steam',
  netease_music: 'netease_music',
  linkedin: 'linkedin' // <-- Add this
}