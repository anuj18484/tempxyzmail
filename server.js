const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios'); // Yahan axios add kiya hai

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const API_BASE = 'https://www.1secmail.com/api/v1/';

// Helper: Extract OTP from text
function extractOTP(text) {
    if (!text) return null;
    const otpRegex = /\b(\d{4}|\d{5}|\d{6}|\d{8})\b/g;
    const matches = text.match(otpRegex);
    return matches ? matches[0] : null;
}

// Helper: Split email into login and domain
function splitEmail(email) {
    const parts = email.split('@');
    return { login: parts[0], domain: parts[1] };
}

// 1. Generate Temp Email
app.get('/api/generate-email', async (req, res) => {
    try {
        const response = await axios.get(`${API_BASE}?action=genRandomMailbox&count=1`);
        res.json({ email: response.data[0] });
    } catch (error) {
        console.error("Email Gen Error:", error.message);
        res.status(500).json({ error: 'Failed to generate email' });
    }
});

// 2. Fetch Inbox
app.get('/api/inbox', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const { login, domain } = splitEmail(email);
    try {
        const response = await axios.get(`${API_BASE}?action=getMessages&login=${login}&domain=${domain}`);
        
        const messages = response.data.map(msg => ({
            id: msg.id,
            sender: msg.from.split('<')[0].trim(),
            senderEmail: msg.from,
            subject: msg.subject,
            time: msg.date,
            otp: extractOTP(msg.subject),
            unread: true
        }));
        
        res.json(messages);
    } catch (error) {
        console.error("Inbox Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch inbox' });
    }
});

// 3. Fetch Full Message Details
app.get('/api/message', async (req, res) => {
    const { email, id } = req.query;
    if (!email || !id) return res.status(400).json({ error: 'Email and ID required' });

    const { login, domain } = splitEmail(email);
    try {
        const response = await axios.get(`${API_BASE}?action=readMessage&login=${login}&domain=${domain}&id=${id}`);
        const msg = response.data;

        const bodyText = msg.textBody || msg.htmlBody || "No content.";
        
        const messageDetails = {
            id: msg.id,
            sender: msg.from,
            subject: msg.subject,
            time: msg.date,
            body: bodyText,
            htmlBody: msg.htmlBody,
            otp: extractOTP(msg.subject) || extractOTP(bodyText)
        };
        
        res.json(messageDetails);
    } catch (error) {
        console.error("Message Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch message details' });
    }
});

app.delete('/api/delete-email', (req, res) => {
    res.json({ success: true, message: 'Mailbox session cleared' });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
