import express from 'express';

const app = express();
app.use(express.json());

// Mock Redis Cache (simulating the cache we built in Step 1)
// In a real app, this would fetch from Redis using ZREVRANGEBYSCORE
const mockRankedFeedCache: Record<string, any[]> = {
  'user-123': [
    { id: 'p1', content: 'Viral post', score: 95.5 },
    { id: 'p2', content: 'Great post', score: 82.1 },
    { id: 'p3', content: 'Good post', score: 74.0 },
    { id: 'p4', content: 'Okay post', score: 60.3 },
    { id: 'p5', content: 'Average post', score: 45.8 },
    { id: 'p6', content: 'Boring post', score: 22.4 },
  ]
};

/**
 * GET /feed
 * Serves the user's ranked feed using Keyset (Cursor-based) Pagination.
 */
app.get('/feed', async (req, res) => {
  const userId = req.query.userId as string;
  const limit = parseInt(req.query.limit as string) || 2; // Default to 2 posts per page
  
  // The cursor is the score of the LAST post the user saw on the previous page
  // If no cursor is provided, we start at the absolute highest possible score
  const cursorScore = req.query.cursor ? parseFloat(req.query.cursor as string) : Number.MAX_SAFE_INTEGER;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // 1. Fetch the user's cached ranked feed
    const cachedFeed = mockRankedFeedCache[userId] || [];

    // 2. Keyset Pagination Logic: 
    // Find posts with a score strictly LESS than the cursor, keeping them in order
    const paginatedPosts = cachedFeed.filter(post => post.score < cursorScore).slice(0, limit);

    // 3. Determine the next cursor to send back to the client
    let nextCursor = null;
    if (paginatedPosts.length > 0) {
      // The new cursor is the score of the last item in this newly fetched batch
      nextCursor = paginatedPosts[paginatedPosts.length - 1].score;
    }

    // 4. Return the data and the cursor
    return res.status(200).json({
      data: paginatedPosts,
      nextCursor: nextCursor, // The client will pass this back in the next request: /feed?cursor=nextCursor
      hasMore: paginatedPosts.length === limit
    });

  } catch (error) {
    console.error('Error fetching feed:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Feed Endpoints Service running on port ${PORT}`);
});