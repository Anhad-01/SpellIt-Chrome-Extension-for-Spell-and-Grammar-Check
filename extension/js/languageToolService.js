/**
 * LanguageToolService
 * Handles communication with the local LanguageTool server.
 */
class LanguageToolService {
    constructor(apiUrl = 'http://localhost:8081/v2/check') {
        this.apiUrl = apiUrl;
    }

    /**
     * Checks grammar for the given text.
     * @param {string} text - The text to check.
     * @param {function} callback - Callback function(err, result).
     */
    async checkGrammar(text, callback) {
        if (!text || text.trim() === '') {
            callback(null, []);
            return;
        }

        try {
            const params = new URLSearchParams();
            params.append('text', text);
            params.append('language', 'en-US'); // Defaulting to en-US for now, can be made dynamic
            params.append('enabledOnly', 'false');

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: params
            });

            if (!response.ok) {
                throw new Error(`LanguageTool server error: ${response.status}`);
            }

            const data = await response.json();
            const matches = this.mapMatches(data.matches);
            callback(null, matches);

        } catch (error) {
            console.error('SpellIt: LanguageTool check failed', error);
            callback(error, null);
        }
    }

    /**
     * Maps LanguageTool matches to SpellIt's internal format.
     * @param {Array} matches - The matches from LanguageTool.
     * @returns {Array} - Array of mapped error objects.
     */
    mapMatches(matches) {
        return matches.map(match => ({
            type: 'grammar-lt', // distinct type for LanguageTool errors
            message: match.message,
            replacements: match.replacements.map(r => r.value),
            offset: match.offset,
            length: match.length,
            ruleId: match.rule.id,
            originalWord: match.context.text.substr(match.context.offset, match.length)
        }));
    }
}

// Expose globally
window.LanguageToolService = LanguageToolService;
