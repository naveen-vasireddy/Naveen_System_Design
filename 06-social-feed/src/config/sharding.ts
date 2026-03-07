const SHARD_COUNT = 4; // We will use 4 shards for this example (N=4)

/**
 * Calculates the shard ID for a given user using userId modulo N.
 * Since userIds are typically UUIDs/Strings, we hash the string to an integer first.
 */
export function getShardIdForUser(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % SHARD_COUNT;
}

// Mock configuration representing connection strings to different database nodes
export const shardConnections = {
  0: 'postgres://db-node-0.internal/feed',
  1: 'postgres://db-node-1.internal/feed',
  2: 'postgres://db-node-2.internal/feed',
  3: 'postgres://db-node-3.internal/feed',
};

/**
 * Mocks inserting a post into a specific user's timeline on the correct shard.
 */
export async function insertIntoTimeline(shardId: number, followerId: string, postId: string) {
  const dbUrl = shardConnections[shardId as keyof typeof shardConnections];
  console.log(`[Shard ${shardId}] Routing write to ${dbUrl} -> Inserted post ${postId} into timeline of user ${followerId}`);
}
