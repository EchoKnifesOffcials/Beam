// server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Roblox API endpoints
const ROBLOX_USER_API = 'https://api.roblox.com/users/get-by-username';
const ROBLOX_THUMBNAIL_API = 'https://thumbnails.roblox.com/v1/users/avatar-headshot';

// Root endpoint - serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Get avatar by username
app.get('/api/avatar/:username', async (req, res) => {
    try {
        const username = req.params.username;
        if (!username || username.length < 2) {
            return res.status(400).json({ error: 'Username must be at least 2 characters' });
        }

        const userResponse = await axios.get(ROBLOX_USER_API, {
            params: { username: username },
            timeout: 10000
        });

        if (!userResponse.data || !userResponse.data.Id) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = userResponse.data.Id;

        const thumbResponse = await axios.get(ROBLOX_THUMBNAIL_API, {
            params: {
                userIds: userId,
                size: '180x180',
                format: 'png',
                isCircular: true
            },
            timeout: 10000
        });

        if (!thumbResponse.data || !thumbResponse.data.data || thumbResponse.data.data.length === 0) {
            return res.status(404).json({ error: 'Thumbnail not available' });
        }

        const thumbnailData = thumbResponse.data.data[0];
        if (thumbnailData.state !== 'Completed') {
            return res.status(404).json({ error: 'Thumbnail not ready' });
        }

        res.json({
            username: username,
            userId: userId,
            imageUrl: thumbnailData.imageUrl,
            state: thumbnailData.state
        });

    } catch (error) {
        console.error('Avatar fetch error:', error.message);
        if (error.response) {
            return res.status(error.response.status || 500).json({
                error: 'Roblox API error',
                details: error.response.data || error.message
            });
        }
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// API: Get avatar by userId (direct)
app.get('/api/avatar/id/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'Valid userId required' });
        }

        const thumbResponse = await axios.get(ROBLOX_THUMBNAIL_API, {
            params: {
                userIds: userId,
                size: '180x180',
                format: 'png',
                isCircular: true
            },
            timeout: 10000
        });

        if (!thumbResponse.data || !thumbResponse.data.data || thumbResponse.data.data.length === 0) {
            return res.status(404).json({ error: 'Thumbnail not available' });
        }

        const thumbnailData = thumbResponse.data.data[0];
        if (thumbnailData.state !== 'Completed') {
            return res.status(404).json({ error: 'Thumbnail not ready' });
        }

        res.json({
            userId: parseInt(userId),
            imageUrl: thumbnailData.imageUrl,
            state: thumbnailData.state
        });

    } catch (error) {
        console.error('Avatar fetch error:', error.message);
        if (error.response) {
            return res.status(error.response.status || 500).json({
                error: 'Roblox API error',
                details: error.response.data || error.message
            });
        }
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Health check endpoint (required for Render)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Avatar API: /api/avatar/:username`);
    console.log(`Avatar by ID: /api/avatar/id/:userId`);
});
