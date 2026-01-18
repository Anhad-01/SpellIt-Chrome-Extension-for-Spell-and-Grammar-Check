class Rules {
    constructor() {
        this.rules = [
            this.checkDoubleSpaces,
            this.checkRepeatedWords,
            this.checkCapitalization,
            this.checkContractions,
            this.checkArticles,
            this.checkLowercaseI
        ];

        this.contractionsMap = {
            "dont": "don't",
            "cant": "can't",
            "wont": "won't",
            "im": "I'm",
            "youre": "you're",
            "theyre": "they're"
            // "its": "it's"
        };
    }

    check(text) {
        let errors = [];
        this.rules.forEach(rule => {
            errors = errors.concat(rule.call(this, text));
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
                suggestions: [' ']
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
                suggestions: [suggestion]
            });
        }
        return errors;
    }

    checkContractions(text) {
        // Keys as alternatives. \b around them.
        const keys = Object.keys(this.contractionsMap).join('|');
        const regex = new RegExp(`\\b(${keys})\\b`, 'gi');
        let match;
        const errors = [];

        while ((match = regex.exec(text)) !== null) {
            const word = match[0]; // matched word (e.g. "dont", "DONT")
            const lowerKey = word.toLowerCase();
            const replacement = this.contractionsMap[lowerKey];

            if (replacement) {
                errors.push({
                    type: 'grammar',
                    rule: 'Contraction',
                    message: 'Missing contraction.',
                    index: match.index,
                    length: word.length,
                    suggestions: [replacement]
                });
            }
        }
        return errors;
    }

    checkArticles(text) {
        // a <vowel-sound> or an <consonant-sound>
        // Simplified: Vowels a, e, i, o, u.
        // Regex to find "a <word>" or "an <word>"
        const regex = /\b(a|an)\s+(\w+)\b/gi;
        let match;
        const errors = [];

        const vowels = ['a', 'e', 'i', 'o', 'u']; // Simple heuristic

        while ((match = regex.exec(text)) !== null) {
            const article = match[1]; // a or an
            const nextWord = match[2];
            const lowerNext = nextWord.toLowerCase();
            const startsWithVowel = vowels.includes(lowerNext.charAt(0));

            const isA = article.toLowerCase() === 'a';
            const isAn = article.toLowerCase() === 'an';

            let suggestion = null;

            if (isA && startsWithVowel) {
                suggestion = 'an';
            } else if (isAn && !startsWithVowel) {
                suggestion = 'a';
            }

            if (suggestion) {
                // Match case of article
                if (article[0] === article[0].toUpperCase()) {
                    suggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
                }

                errors.push({
                    type: 'grammar',
                    rule: 'Article',
                    message: `Incorrect article usage.`,
                    index: match.index,
                    length: article.length, // only highlight article
                    suggestions: [suggestion]
                });
            }
        }
        return errors;
    }

    checkLowercaseI(text) {
        // Matches solitary "i" surrounded by word boundaries
        const regex = /\b(i)\b/g;
        let match;
        const errors = [];

        while ((match = regex.exec(text)) !== null) {
            errors.push({
                type: 'grammar',
                rule: 'Capitalization',
                message: "The pronoun 'I' should be capitalized.",
                index: match.index,
                length: 1,
                suggestions: ['I']
            });
        }
        return errors;
    }


}

const grammarRules = new Rules();
