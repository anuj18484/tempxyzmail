const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const API_BASE = 'https://www.1secmail.com/api/v1/';

// Helper: Extract OTP from text
function extractOTP(text) {
    if (!text) return null;
    // Regex for 4, 5, 6, or 8 digit codes (standalone)
    const otpRegex = /\b(\d{4}|\d{5}|\d{6}|\d{8})\b/g;
    const matches = text.match(otpRegex);
    return matches ? matches[0] : null; // Return the first match found
}

// Helper: Split email into login and domain
function splitEmail(email) {
    const parts = email.split('@');
    return { login: parts[0], domain: parts[1] };
}

// 1. Generate Temp Email
app.get('/api/generate-email', async (req, res) => {
    try {
        const response = await fetch(`${API_BASE}?action=genRandomMailbox&count=1`);
        const data = await response.json();
        res.json({ email: data[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate email' });
    }
});

// 2. Fetch Inbox
app.get('/api/inbox', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const { login, domain } = splitEmail(email);
    try {
        const response = await fetch(`${API_BASE}?action=getMessages&login=${login}&domain=${domain}`);
        const data = await response.json();
        
        // Format for frontend
        const messages = data.map(msg => ({
            id: msg.id,
            sender: msg.from.split('<')[0].trim(), // Clean sender name
            senderEmail: msg.from,
            subject: msg.subject,
            time: msg.date,
            otp: extractOTP(msg.subject), // Check subject for OTP
            unread: true
        }));
        
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch inbox' });
    }
});

// 3. Fetch Full Message Details
app.get('/api/message', async (req, res) => {
    const { email, id } = req.query;
    if (!email || !id) return res.status(400).json({ error: 'Email and ID required' });

    const { login, domain } = splitEmail(email);
    try {
        const response = await fetch(`${API_BASE}?action=readMessage&login=${login}&domain=${domain}&id=${id}`);
        const msg = await response.json();

        const bodyText = msg.textBody || msg.htmlBody || "No content.";
        
        const messageDetails = {
            id: msg.id,
            sender: msg.from,
            subject: msg.subject,
            time: msg.date,
            body: bodyText,
            htmlBody: msg.htmlBody,
            otp: extractOTP(msg.subject) || extractOTP(bodyText) // Check both for OTP
        };
        
        res.json(messageDetails);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch message details' });
    }
});

// 4. Delete/Reset Email (Simulated for 1secmail)
app.delete('/api/delete-email', (req, res) => {
    // 1secmail auto-deletes after a while, we just tell frontend it's cleared
    res.json({ success: true, message: 'Mailbox session cleared' });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
                                 
