document.addEventListener('DOMContentLoaded', () => {
    const enableToggle = document.getElementById('enableToggle');
    const languageSelect = document.getElementById('languageSelect');

    // Load saved settings
    chrome.storage.local.get(['enabled', 'language'], (result) => {
        enableToggle.checked = result.enabled !== false; // Default true
        languageSelect.value = result.language || 'en_US';
    });

    // Save on change
    enableToggle.addEventListener('change', () => {
        const enabled = enableToggle.checked;
        chrome.storage.local.set({ enabled });
    });

    languageSelect.addEventListener('change', () => {
        const language = languageSelect.value;
        chrome.storage.local.set({ language });
    });
});
