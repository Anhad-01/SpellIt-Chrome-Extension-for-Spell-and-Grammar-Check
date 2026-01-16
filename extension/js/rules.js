class Rules {
    constructor() {
        this.rules = [
            this.checkDoubleSpaces,
            this.checkRepeatedWords,
            this.checkCapitalization
        ];
    }

    check(text) {
        let errors = [];
        this.rules.forEach(rule => {
            errors = errors.concat(rule(text));
        });
        return errors;
    }

    checkDoubleSpaces(text) {
        const regex = /[ ]{2,}/g;
        let match;
        const errors = [];
        while ((match = regex.exec(text)) !== null) {
            errors.push({
                type: 'grammar',
                rule: 'Double Space',
                message: 'Multiple spaces detected.',
                index: match.index,
                length: match[0].length,
                replacements: [' '], // Suggestion: Single space
                suggestions: [' '] // Unified prop
            });
        }
        return errors;
    }

    checkRepeatedWords(text) {
        // Matches word space same-word. Case insensitive for the second word
        const regex = /\b(\w+)\s+\1\b/gi;
        let match;
        const errors = [];
        while ((match = regex.exec(text)) !== null) {
            errors.push({
                type: 'grammar',
                rule: 'Repeated Word',
                message: 'Repeated word.',
                index: match.index,
                length: match[0].length,
                replacements: [match[1]], // Suggestion: The word once
                suggestions: [match[1]]
            });
        }
        return errors;
    }

    checkCapitalization(text) {
        // Heuristic: sentence start
        const regex = /(?:^|[.!?]\s+)([a-z]\w*)/g;
        let match;
        const errors = [];
        while ((match = regex.exec(text)) !== null) {
            // match[1] is the full word that started with lower case
            // match[0] includes prefix (space/punct). find where the word starts in match[0]
            const word = match[1];
            const fullMatch = match[0];
            const wordIndexInMatch = fullMatch.lastIndexOf(word);
            const absoluteIndex = match.index + wordIndexInMatch;

            const suggestion = word.charAt(0).toUpperCase() + word.slice(1);

            errors.push({
                type: 'grammar',
                rule: 'Capitalization',
                message: 'Sentence should start with a capital letter.',
                index: absoluteIndex,
                length: word.length,
                replacements: [suggestion],
                suggestions: [suggestion]
            });
        }
        return errors;
    }
}

const grammarRules = new Rules();
