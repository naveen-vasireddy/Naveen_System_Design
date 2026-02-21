-- 1. Rooms Table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id),
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Outbox Table (The Core of the Outbox Pattern)
CREATE TABLE outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL, -- e.g., 'MESSAGE'
    aggregate_id UUID NOT NULL,          -- e.g., the message ID
    payload JSONB NOT NULL,              -- The actual message content
    status VARCHAR(20) DEFAULT 'PENDING',-- 'PENDING' or 'PUBLISHED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);