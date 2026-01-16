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
                replacements: [' ']
            });
        }
        return errors;
    }

    checkRepeatedWords(text) {
        // Matches word space same-word. Case insensitive for the second word to catch "The the"
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
                replacements: [match[1]]
            });
        }
        return errors;
    }

    checkCapitalization(text) {
        // Simple heuristic: sentence start (start of text or after [.!?] space)
        // Note: very basic.
        const regex = /(?:^|[.!?]\s+)([a-z])/g;
        let match;
        const errors = [];
        while ((match = regex.exec(text)) !== null) {
            // match[0] is the full match including prefix. match[1] is the letter.
            // We need the index of the letter.
            const letter = match[1];
            const letterIndex = match.index + match[0].lastIndexOf(letter);

            errors.push({
                type: 'grammar',
                rule: 'Capitalization',
                message: 'Sentence should start with a capital letter.',
                index: letterIndex,
                length: 1,
                replacements: [letter.toUpperCase()]
            });
        }
        return errors;
    }
}

const grammarRules = new Rules();
