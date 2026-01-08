/**
 * Push Notification Bridge Server
 * 
 * This server polls your ads API and sends Expo Push Notifications
 * to all registered devices when it finds "Notification" ads.
 * 
 * Setup:
 * 1. npm install axios expo-server-sdk node-cron dotenv
 * 2. Set your ADS_API_URL in .env
 * 3. Run: node server.js
 * 4. Deploy to Heroku/Railway/Render (free tier works)
 */

// Load environment variables
require('dotenv').config();

const { Expo } = require('expo-server-sdk');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// Configuration
const ADS_API_URL = process.env.ADS_API_URL || 'http://localhost:3000/api/ads';
const PROCESSED_ADS_FILE = path.join(__dirname, 'processed_ads.json');
const PUSH_TOKENS_FILE = path.join(__dirname, 'push_tokens.json');
const POLLING_INTERVAL = '*/2 * * * *'; // Every 2 minutes

// Initialize Expo SDK
const expo = new Expo();

/**
 * Load processed ad IDs from disk
 */
function loadProcessedAds() {
  try {
    if (fs.existsSync(PROCESSED_ADS_FILE)) {
      const data = fs.readFileSync(PROCESSED_ADS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading processed ads:', error);
  }
  return [];
}

/**
 * Save processed ad IDs to disk
 */
function saveProcessedAds(processedAds) {
  try {
    // Keep only last 500 ads to prevent file bloat
    const trimmed = processedAds.slice(-500);
    fs.writeFileSync(PROCESSED_ADS_FILE, JSON.stringify(trimmed, null, 2));
  } catch (error) {
    console.error('Error saving processed ads:', error);
  }
}

/**
 * Load registered push tokens from disk
 */
function loadPushTokens() {
  try {
    if (fs.existsSync(PUSH_TOKENS_FILE)) {
      const data = fs.readFileSync(PUSH_TOKENS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading push tokens:', error);
  }
  return [];
}

/**
 * Save push tokens to disk
 */
function savePushTokens(tokens) {
  try {
    fs.writeFileSync(PUSH_TOKENS_FILE, JSON.stringify(tokens, null, 2));
  } catch (error) {
    console.error('Error saving push tokens:', error);
  }
}

/**
 * Fetch ads from your API
 */
async function fetchAds() {
  try {
    // Add timestamp to prevent caching (matches app behavior)
    const timestamp = Date.now();
    const urlWithTimestamp = `${ADS_API_URL}?t=${timestamp}`;
    
    console.log(`Fetching from: ${urlWithTimestamp}`);
    
    const response = await axios.get(urlWithTimestamp, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Kimedata-Push-Bridge/1.0'
      }
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response data type: ${Array.isArray(response.data) ? 'array' : typeof response.data}`);
    
    // Filter active ads only (matches app behavior)
    if (response.data && Array.isArray(response.data)) {
      const activeAds = response.data.filter(ad => ad.isActive !== false);
      console.log(`Fetched ${response.data.length} total ads, ${activeAds.length} active`);
      return activeAds;
    }
    
    console.log('Response data is not an array:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching ads:');
    console.error('  Message:', error.message);
    console.error('  Status:', error.response?.status);
    console.error('  Status Text:', error.response?.statusText);
    console.error('  Response Data:', error.response?.data);
    return [];
  }
}

/**
 * Send push notifications to all registered devices
 */
async function sendPushNotifications(title, body, data) {
  const pushTokens = loadPushTokens();
  
  if (pushTokens.length === 0) {
    console.log('No push tokens registered yet');
    return;
  }

  // Filter valid Expo push tokens
  const validTokens = pushTokens.filter(token => 
    Expo.isExpoPushToken(token)
  );

  if (validTokens.length === 0) {
    console.log('No valid Expo push tokens found');
    return;
  }

  // Create push notification messages
  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    priority: 'high',
    badge: 1,
  }));

  // Send in chunks (Expo recommends max 100 per request)
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
      console.log(`Sent ${chunk.length} push notification(s)`);
    } catch (error) {
      console.error('Error sending push notifications:', error);
    }
  }

  return tickets;
}

/**
 * Main polling function
 */
async function checkForNotificationAds() {
  console.log(`[${new Date().toISOString()}] Checking for notification ads...`);

  try {
    // Fetch ads from your API
    const ads = await fetchAds();
    
    if (!Array.isArray(ads) || ads.length === 0) {
      console.log('No ads returned from API');
      return;
    }

    // Filter notification ads (case-insensitive)
    const notificationAds = ads.filter(ad => 
      ad.title && ad.title.toLowerCase().includes('notification')
    );

    if (notificationAds.length === 0) {
      console.log('No notification ads found');
      return;
    }

    console.log(`Found ${notificationAds.length} notification ad(s)`);

    // Load processed ads
    const processedAds = loadProcessedAds();

    // Filter new ads
    const newAds = notificationAds.filter(ad => 
      !processedAds.includes(ad.id)
    );

    if (newAds.length === 0) {
      console.log('No new notification ads to process');
      return;
    }

    console.log(`Processing ${newAds.length} new notification ad(s)`);

    // Send push notification for each new ad
    for (const ad of newAds) {
      try {
        const title = ad.title.replace(/^notification:?\s*/i, '').trim() || ad.title;
        const body = ad.body || ad.message || 'You have a new notification';

        await sendPushNotifications(title, body, {
          adId: ad.id,
          type: 'notification_ad',
          imageUrl: ad.image,
        });

        // Mark as processed
        processedAds.push(ad.id);
        console.log(`✅ Sent push for ad: ${ad.id}`);
      } catch (error) {
        console.error(`Error processing ad ${ad.id}:`, error);
      }
    }

    // Save updated processed ads
    saveProcessedAds(processedAds);

    console.log(`✅ Successfully processed ${newAds.length} notification(s)`);
  } catch (error) {
    console.error('Error in checkForNotificationAds:', error);
  }
}

/**
 * Express server for token registration
 */
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Register push token endpoint
app.post('/api/register-push-token', (req, res) => {
  const { token } = req.body;

  if (!token || !Expo.isExpoPushToken(token)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid push token' 
    });
  }

  const tokens = loadPushTokens();
  
  if (!tokens.includes(token)) {
    tokens.push(token);
    savePushTokens(tokens);
    console.log(`Registered new push token: ${token}`);
  }

  res.json({ 
    success: true, 
    message: 'Push token registered successfully' 
  });
});

// Unregister push token endpoint
app.post('/api/unregister-push-token', (req, res) => {
  const { token } = req.body;
  const tokens = loadPushTokens();
  const filtered = tokens.filter(t => t !== token);
  
  savePushTokens(filtered);
  console.log(`Unregistered push token: ${token}`);
  
  res.json({ 
    success: true, 
    message: 'Push token unregistered' 
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const tokens = loadPushTokens();
  const processedAds = loadProcessedAds();
  
  res.json({
    status: 'online',
    registeredDevices: tokens.length,
    processedAds: processedAds.length,
    adsApiUrl: ADS_API_URL,
    pollingInterval: POLLING_INTERVAL,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Push Notification Bridge Server running on port ${PORT}`);
  console.log(`📡 Polling ads API: ${ADS_API_URL}`);
  console.log(`⏱️  Interval: ${POLLING_INTERVAL} (every 2 minutes)`);
  console.log(`📱 Registered devices: ${loadPushTokens().length}`);
});

// Start cron job for polling
cron.schedule(POLLING_INTERVAL, checkForNotificationAds);

// Run initial check on startup
setTimeout(() => {
  console.log('Running initial notification check...');
  checkForNotificationAds();
}, 5000); // 5 second delay for server startup
