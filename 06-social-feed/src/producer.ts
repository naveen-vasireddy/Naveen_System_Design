import express from 'express';

const app = express();
app.use(express.json());

// Mock Message Broker (represents Kafka, RabbitMQ, or Redis)
const messageBroker = {
  enqueue: async (topic: string, key: string, payload: any) => {
    // In a real system, 'key' guarantees order by routing to a specific partition
    console.log(`[Queue] Enqueued to '${topic}' | Key (userId): ${key} | Payload:`, payload.postId);
  }
};

// Mock Database
const db = {
  savePost: async (userId: string, content: string) => {
    const postId = `post-${Date.now()}`;
    console.log(`[DB] Saved post ${postId} for user ${userId}`);
    return { postId, userId, content, timestamp: new Date() };
  }
};

/**
 * POST /posts
 * Creates a new post and enqueues an asynchronous fan-out job.
 */
app.post('/posts', async (req, res) => {
  const { userId, content } = req.body;

  if (!userId || !content) {
    return res.status(400).json({ error: 'userId and content are required.' });
  }

  try {
    // 1. Save the post to the primary database synchronously
    const newPost = await db.savePost(userId, content);

    // 2. Enqueue the fan-out job keyed by userId
    // This allows the request to finish quickly without waiting for timelines to update
    await messageBroker.enqueue('feed.fanout', userId, newPost);

    // 3. Respond to the client immediately (low latency)
    return res.status(201).json({
      message: 'Post published successfully',
      post: newPost
    });
  } catch (error) {
    console.error('Error publishing post:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Producer Service running on port ${PORT}`);
});
