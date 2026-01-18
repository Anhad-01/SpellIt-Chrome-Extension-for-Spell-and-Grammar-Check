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
        const updates = { enabled };

        if (!enabled && enableAdvancedGrammar.checked) {
            enableAdvancedGrammar.checked = false;
            updates.enableAdvancedGrammar = false;
        }

        chrome.storage.local.set(updates);
    });

    languageSelect.addEventListener('change', () => {
        const language = languageSelect.value;
        chrome.storage.local.set({ language });
    });

    enableAdvancedGrammar.addEventListener('change', () => {
        const isAdvancedEnabled = enableAdvancedGrammar.checked;
        const updates = { enableAdvancedGrammar: isAdvancedEnabled };

        if (isAdvancedEnabled && !enableToggle.checked) {
            enableToggle.checked = true;
            updates.enabled = true;
        }

        chrome.storage.local.set(updates);
    });
});
