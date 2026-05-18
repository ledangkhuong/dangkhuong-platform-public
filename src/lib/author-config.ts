// Default author configuration for blog posts
// Derives values from siteConfig; can be overridden per-post when
// author columns are added to blog_posts table.

import { siteConfig } from "@/lib/site-config";

export interface AuthorInfo {
  name: string;
  avatar: string;
  bio: string;
  facebook: string;
}

export const DEFAULT_AUTHOR: AuthorInfo = {
  name: siteConfig.owner.name,
  avatar: siteConfig.owner.avatar,
  bio: siteConfig.owner.bio,
  facebook: siteConfig.socials.facebook,
};
