class SpellChecker {
    constructor() {
        this.typo = null;
        this.isLoaded = false;
        this.currentLanguage = 'en_US';
        this.customDictionary = new Set();
        this.ignoreList = new Set(); // Session-only ignore list
    }

    async init(language = 'en_US') {
        try {
            this.currentLanguage = language;
            this.isLoaded = false;

            // Load custom dictionary from storage
            const stored = await chrome.storage.local.get(['customDictionary']);
            if (stored.customDictionary) {
                this.customDictionary = new Set(stored.customDictionary);
            }

            const [affData, dicData] = await Promise.all([
                fetch(chrome.runtime.getURL(`assets/${language}.aff`)).then(r => r.text()),
                fetch(chrome.runtime.getURL(`assets/${language}.dic`)).then(r => r.text())
            ]);

            this.typo = new Typo(language, affData, dicData);
            this.isLoaded = true;
            console.log(`SpellChecker initialized for ${language}`);
        } catch (error) {
            console.error(`Failed to initialize SpellChecker for ${language}:`, error);
        }
    }

    check(word) {
        // Strip punctuation for checking
        const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
        if (!this.isLoaded || !cleanWord) return true;

        // Check ignore list and custom dictionary
        if (this.ignoreList.has(cleanWord) || this.customDictionary.has(cleanWord.toLowerCase())) {
            return true;
        }

        return this.typo.check(cleanWord);
    }

    suggest(word) {
        const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
        if (!this.isLoaded || !cleanWord) return [];
        return this.typo.suggest(cleanWord);
    }

    ignoreWord(word) {
        const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
        if (cleanWord) {
            this.ignoreList.add(cleanWord);
        }
    }

    async addToDictionary(word) {
        const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
        if (cleanWord) {
            const lower = cleanWord.toLowerCase();
            this.customDictionary.add(lower);
            // Persist
            await chrome.storage.local.set({
                customDictionary: Array.from(this.customDictionary)
            });
        }
    }
}

// Singleton instance
const spellChecker = new SpellChecker();
