/**
 * Cấu hình mặc định cho hệ thống cache
 */
export const CacheConfig = {
  // TTL mặc định cho các loại dữ liệu
  ttl: {
    // Dữ liệu thường xuyên thay đổi
    SHORT: 60, // 1 phút
    // Dữ liệu thay đổi định kỳ
    MEDIUM: 300, // 5 phút
    // Dữ liệu ít thay đổi
    LONG: 3600, // 1 giờ
    // Dữ liệu gần như tĩnh
    VERY_LONG: 86400, // 1 ngày
  },

  // Prefixes cho các key cache
  prefix: {
    USER: 'user:',
    // SOCIAL: 'social:',
    // FOLLOW: 'follow:',
    // PROFILE: 'profile:',
    // SHOP: 'shop:',
    // STATS: 'stats:',
    // NOTIFICATION: 'notification:',
    // BIO_TEMPLATE: 'bio:templates:',
    // BIO_TEMPLATE_CATEGORY: 'bio:template:categories:',
    // BIO_USER_FAVORITES: 'bio:user:favorites:',
  },

  // TTL settings for different template cache types
  templateTTL: {
    // Public template listings (change frequently)
    LISTINGS: 300, // 5 minutes

    // Template categories (change infrequently)
    CATEGORIES: 3600, // 1 hour

    // Individual template details (moderate change frequency)
    DETAILS: 600, // 10 minutes

    // User's favorite templates (high change frequency)
    FAVORITES: 60, // 1 minute
  },

  // Maximum items in local cache
  localCacheSize: 10000,

  // Rate limiting settings
  rateLimit: {
    // API endpoints
    api: {
      standard: {
        limit: 100, // requests
        window: 60, // seconds
      },
      sensitive: {
        limit: 20,
        window: 60,
      },
    },
    // Follow/unfollow actions
    follow: {
      limit: 50, // actions
      window: 3600, // 1 hour
    },
  },
};

// Helpers để xây dựng cache keys
export class CacheKeyBuilder {
  static userProfile(userId: number): string {
    return `${CacheConfig.prefix.USER}${userId}:profile`;
  }

  // static userFollowers(userId: string, page: string = ''): string {
  //   return `${CacheConfig.prefix.FOLLOW}followers:${userId}:${page}`;
  // }

  // static userFollowing(userId: string, page: string = ''): string {
  //   return `${CacheConfig.prefix.FOLLOW}following:${userId}:${page}`;
  // }

  // static userStats(userId: string): string {
  //   return `${CacheConfig.prefix.STATS}${userId}`;
  // }

  // static socialRecommendations(userId: string): string {
  //   return `${CacheConfig.prefix.SOCIAL}recommendations:${userId}`;
  // }

  // static shopProduct(productId: string): string {
  //   return `${CacheConfig.prefix.SHOP}product:${productId}`;
  // }

  // static userNotifications(userId: string): string {
  //   return `${CacheConfig.prefix.NOTIFICATION}${userId}:list`;
  // }

  // static userNotificationCount(userId: string): string {
  //   return `${CacheConfig.prefix.NOTIFICATION}${userId}:count`;
  // }

  // static templateListings(params: string = ''): string {
  //   return `${CacheConfig.prefix.BIO_TEMPLATE}listings:${params}`;
  // }

  // static templateCategories(includeInactive: boolean = false): string {
  //   return `${CacheConfig.prefix.BIO_TEMPLATE_CATEGORY}${includeInactive ? 'all' : 'active'}`;
  // }

  // static templateDetails(id: string): string {
  //   return `${CacheConfig.prefix.BIO_TEMPLATE}detail:${id}`;
  // }

  // static bioUserFavorites(userId: string): string {
  //   return `${CacheConfig.prefix.BIO_USER_FAVORITES}${userId}`;
  // }

  // static searchTemplates(query: string): string {
  //   return `${CacheConfig.prefix.BIO_TEMPLATE}search:${query}`;
  // }
}
