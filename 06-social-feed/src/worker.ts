// 06-feed/src/worker.ts
import { getShardIdForUser, insertIntoTimeline } from './config/sharding';

const MEGA_USER_THRESHOLD = 100000; // 100k followers

// Mock database function to get a user's follower count
async function getFollowerCount(userId: string): Promise<number> {
  // For demonstration, let's pretend "user-celeb" is a mega user
  return userId === 'user-celeb' ? 5000000 : 250; 
}

// Mock database function to get a list of follower IDs
async function getFollowerIds(userId: string): Promise<string[]> {
  return ['user-abc', 'user-def', 'user-ghi']; // Mocked list of normal followers
}

/**
 * Background Worker processing the 'feed.fanout' queue
 */
export async function processFanOutJob(jobPayload: { userId: string; postId: string }) {
  const { userId, postId } = jobPayload;
  console.log(`\n[Worker] Processing fan-out job for Post: ${postId}, Author: ${userId}`);

  const followerCount = await getFollowerCount(userId);

  // HYBRID FAN-OUT LOGIC
  if (followerCount >= MEGA_USER_THRESHOLD) {
    // READ FOR MEGA USERS (Pull Model)
    console.log(`[Worker] Author ${userId} is a MEGA USER (${followerCount} followers).`);
    console.log(`[Worker] Skipping push fan-out. Followers will pull this post at read-time.`);
    return;
  }

  // WRITE FOR NORMAL USERS (Push Model)
  console.log(`[Worker] Author ${userId} is a normal user. Initiating push fan-out...`);
  const followers = await getFollowerIds(userId);

  for (const followerId of followers) {
    // 1. Determine which shard this specific follower's timeline lives on
    const shardId = getShardIdForUser(followerId);
    
    // 2. Write the post directly to that shard
    await insertIntoTimeline(shardId, followerId, postId);
  }
  
  console.log(`[Worker] Fan-out complete for Post: ${postId}`);
}

// Simulate processing jobs from the message broker
setTimeout(() => processFanOutJob({ userId: 'user-normal', postId: 'post-123' }), 1000);
setTimeout(() => processFanOutJob({ userId: 'user-celeb', postId: 'post-999' }), 2000);
