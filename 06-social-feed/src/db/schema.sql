-- Adjacency List for the Social Graph
CREATE TABLE follows (
    follower_id UUID NOT NULL,
    followee_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Composite primary key ensures a user cannot follow the exact same person twice
    PRIMARY KEY (follower_id, followee_id)
);

-- Index to quickly find everyone a specific user follows (Fan-out reads / feed generation)
CREATE INDEX idx_follows_follower ON follows(follower_id);

-- Index to quickly find all followers of a specific user (Publishing fan-out)
CREATE INDEX idx_follows_followee ON follows(followee_id);
