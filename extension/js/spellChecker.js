class SpellChecker {
    constructor() {
        this.typo = null;
        this.isLoaded = false;
    }

    async init() {
        if (this.isLoaded) return;

        try {
            const [affData, dicData] = await Promise.all([
                fetch(chrome.runtime.getURL('assets/en_US.aff')).then(r => r.text()),
                fetch(chrome.runtime.getURL('assets/en_US.dic')).then(r => r.text())
            ]);

            this.typo = new Typo("en_US", affData, dicData);
            this.isLoaded = true;
            console.log("SpellChecker initialized");
        } catch (error) {
            console.error("Failed to initialize SpellChecker:", error);
        }
    }

    check(word) {
        // Strip punctuation for checking
        const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
        if (!this.isLoaded || !cleanWord) return true; // Assume correct if not loaded or empty
        return this.typo.check(cleanWord);
    }

    suggest(word) {
        const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
        if (!this.isLoaded || !cleanWord) return [];
        return this.typo.suggest(cleanWord);
    }
}

// Singleton instance
const spellChecker = new SpellChecker();
