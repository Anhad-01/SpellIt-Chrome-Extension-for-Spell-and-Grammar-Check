document.addEventListener('DOMContentLoaded', () => {
    const enableToggle = document.getElementById('enableToggle');
    const languageSelect = document.getElementById('languageSelect');

    const enableAdvancedGrammar = document.getElementById('enableAdvancedGrammar');

    // Load saved settings
    chrome.storage.local.get(['enabled', 'language', 'enableAdvancedGrammar'], (result) => {
        enableToggle.checked = result.enabled !== false; // Default true
        languageSelect.value = result.language || 'en_US';
        enableAdvancedGrammar.checked = result.enableAdvancedGrammar === true; // Default false
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

    enableAdvancedGrammar.addEventListener('change', () => {
        const enableAdvancedGrammar = document.getElementById('enableAdvancedGrammar').checked;
        chrome.storage.local.set({ enableAdvancedGrammar });
    });
});
