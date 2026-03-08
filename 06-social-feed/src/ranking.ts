export interface Post {
  id: string;
  authorId: string;
  content: string;
  likes: number;
  comments: number;
  createdAt: Date;
}

const GRAVITY = 1.8; // Time decay factor

/**
 * 1. Ranking Logic: Recency + Interactions
 * Calculates a score. Newer posts with more interactions get higher scores.
 */
export function calculateScore(post: Post): number {
  // Give comments slightly more weight than simple likes
  const interactions = (post.likes * 1) + (post.comments * 2); 
  
  // Calculate how old the post is in hours
  const ageInHours = Math.max(0, (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60));

  // HackerNews-style formula: (Interactions) / (Age + 2)^Gravity
  // Prevents division by zero and ensures a smooth decay over time
  return interactions / Math.pow(ageInHours + 2, GRAVITY);
}

// Mock Redis Cache for storing the Top N feeds
const redisCache = new Map<string, any[]>();

/**
 * 2. Cache Top N
 * Ranks a batch of timeline posts and stores the top N in memory/Redis.
 */
export async function rankAndCacheFeed(userId: string, rawPosts: Post[], topN: number = 100) {
  console.log(`[Ranking] Calculating scores for ${rawPosts.length} posts for User: ${userId}`);

  // Calculate scores and attach them to the post objects
  const scoredPosts = rawPosts.map(post => ({
    ...post,
    score: calculateScore(post)
  }));

  // Sort descending by score
  scoredPosts.sort((a, b) => b.score - a.score);

  // Extract the Top N
  const topPosts = scoredPosts.slice(0, topN);

  // Cache them (In a real system, this would be Redis ZADD or SETEX)
  const cacheKey = `feed:top:${userId}`;
  redisCache.set(cacheKey, topPosts);
  
  console.log(`[Ranking] Cached top ${topPosts.length} ranked posts in '${cacheKey}'`);

  return topPosts;
}

// --- Quick Test Execution ---
if (require.main === module) {
  const mockPosts: Post[] = [
    { id: 'p1', authorId: 'u1', content: 'Old but viral', likes: 5000, comments: 400, createdAt: new Date(Date.now() - 48 * 3600000) },
    { id: 'p2', authorId: 'u2', content: 'Brand new, no likes', likes: 0, comments: 0, createdAt: new Date() },
    { id: 'p3', authorId: 'u3', content: 'Few hours old, gaining traction', likes: 50, comments: 10, createdAt: new Date(Date.now() - 3 * 3600000) }
  ];

  rankAndCacheFeed('user-123', mockPosts, 2).then(ranked => {
    console.log('\nTop 2 Ranked Posts:', ranked.map(p => ({ id: p.id, score: p.score.toFixed(4) })));
  });
}
