// State
let currentEmail = "";
let inboxData = [];
let autoRefreshTimer = null;

// DOM
const elEmailDisplay = document.getElementById("emailDisplay");
const elInboxList = document.getElementById("inboxList");
const elInboxCount = document.getElementById("inboxCount");
const elInboxLoader = document.getElementById("inboxLoader");
const elViewerLoader = document.getElementById("viewerLoader");
const elSearchInput = document.getElementById("searchInput");

// Init
async function init() {
    setupListeners();
    await createNewTemp();
    // Auto refresh every 15 seconds
    autoRefreshTimer = setInterval(() => fetchInbox(true), 15000);
}

function setupListeners() {
    document.getElementById("copyBtn").addEventListener("click", copyEmail);
    document.getElementById("generateNewBtn").addEventListener("click", createNewTemp);
    document.getElementById("refreshBtn").addEventListener("click", () => fetchInbox(false));
    document.getElementById("deleteBtn").addEventListener("click", deleteTempEmail);
    document.getElementById("closeMobileBtn").addEventListener("click", closeMessage);
    elSearchInput.addEventListener("input", renderInbox);
}

// API Calls
async function createNewTemp() {
    elEmailDisplay.value = "Generating...";
    try {
        const res = await fetch('/api/generate-email');
        const data = await res.json();
        currentEmail = data.email;
        elEmailDisplay.value = currentEmail;
        inboxData = [];
        renderInbox();
        closeMessage();
        showToast("New temporary email generated!", "fa-check");
        fetchInbox(true); // Initial fetch
    } catch (err) {
        showToast("Error generating email", "fa-triangle-exclamation");
    }
}

async function fetchInbox(isBackground = false) {
    if (!currentEmail) return;
    if (!isBackground) elInboxLoader.classList.add("active");
    
    try {
        const res = await fetch(`/api/inbox?email=${currentEmail}`);
        const newInbox = await res.json();
        
        // Check for new emails to show toast
        if (newInbox.length > inboxData.length && inboxData.length !== 0) {
            showToast("New email received!", "fa-envelope");
        }
        
        inboxData = newInbox;
        renderInbox();
    } catch (err) {
        if (!isBackground) showToast("Failed to sync inbox", "fa-xmark");
    } finally {
        elInboxLoader.classList.remove("active");
    }
}

async function openMessage(id) {
    const emailData = inboxData.find(e => e.id === id);
    if (!emailData) return;

    elViewerLoader.classList.add("active");
    document.getElementById("emptyViewer").style.display = "none";
    document.getElementById("viewerContent").style.display = "flex";

    // Handle Mobile View Switching
    if (window.innerWidth <= 768) {
        document.getElementById("emailViewer").classList.add("mobile-active");
        document.querySelector(".inbox-panel").classList.add("mobile-hidden");
    }

    try {
        const res = await fetch(`/api/message?email=${currentEmail}&id=${id}`);
        const msg = await res.json();

        document.getElementById("vAvatar").textContent = msg.sender.charAt(0).toUpperCase();
        document.getElementById("vSender").textContent = msg.sender.split('<')[0].trim();
        document.getElementById("vTime").textContent = msg.time;
        document.getElementById("vSubject").textContent = msg.subject;
        document.getElementById("vBody").innerHTML = msg.htmlBody || msg.body;

        const otpContainer = document.getElementById("vOtpContainer");
        if (msg.otp) {
            otpContainer.style.display = "block";
            document.getElementById("vOtp").textContent = msg.otp;
        } else {
            otpContainer.style.display = "none";
        }
    } catch (err) {
        showToast("Failed to load message", "fa-xmark");
    } finally {
        elViewerLoader.classList.remove("active");
    }
}

async function deleteTempEmail() {
    try {
        await fetch(`/api/delete-email?email=${currentEmail}`, { method: 'DELETE' });
        currentEmail = "";
        elEmailDisplay.value = "Deleted. Create a new one.";
        inboxData = [];
        renderInbox();
        closeMessage();
        showToast("Mailbox session cleared", "fa-trash");
    } catch (err) {
        console.error(err);
    }
}

// UI Functions
function renderInbox() {
    const searchTerm = elSearchInput.value.toLowerCase();
    const filtered = inboxData.filter(email => 
        email.sender.toLowerCase().includes(searchTerm) || 
        email.subject.toLowerCase().includes(searchTerm) ||
        (email.otp && email.otp.includes(searchTerm))
    );

    elInboxCount.textContent = filtered.length;
    elInboxList.innerHTML = "";

    if (filtered.length === 0) {
        elInboxList.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open fa-2x"></i><br><br>Waiting for incoming emails...</div>`;
        return;
    }

    filtered.forEach(email => {
        const div = document.createElement("div");
        div.className = `email-item ${email.otp ? 'has-otp' : ''}`;
        div.onclick = () => openMessage(email.id);
        div.innerHTML = `
            <span class="ei-sender">${email.sender}</span>
            <div class="ei-subject">${email.subject}</div>
        `;
        elInboxList.appendChild(div);
    });
}

function closeMessage() {
    document.getElementById("emptyViewer").style.display = "flex";
    document.getElementById("viewerContent").style.display = "none";
    document.getElementById("emailViewer").classList.remove("mobile-active");
    document.querySelector(".inbox-panel").classList.remove("mobile-hidden");
}

function copyEmail() {
    if (!currentEmail || currentEmail.includes("Deleted")) return;
    navigator.clipboard.writeText(currentEmail);
    showToast("Email copied to clipboard!", "fa-check");
}

function showToast(msg, icon) {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Boot
init();

