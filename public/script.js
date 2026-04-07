async function createNewTemp() {
    elEmailDisplay.value = "Generating...";
    try {
        const res = await fetch('/api/generate-email');
        const data = await res.json();
        
        // Naya check add kiya: Agar res 200 OK nahi hai ya email nahi mila
        if (!res.ok || !data.email) {
            throw new Error(data.error || "Failed to generate");
        }
        
        currentEmail = data.email;
        elEmailDisplay.value = currentEmail;
        inboxData = [];
        renderInbox();
        closeMessage();
        showToast("New temporary email generated!", "fa-check");
        fetchInbox(true); 
    } catch (err) {
        console.error(err);
        elEmailDisplay.value = "Error! Try again.";
        showToast("Backend Server Error", "fa-triangle-exclamation");
    }
}
