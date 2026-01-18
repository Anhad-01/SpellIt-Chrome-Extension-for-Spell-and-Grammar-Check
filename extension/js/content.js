
// Initialize dependencies
let isExtensionEnabled = true;

const initExtension = async () => {
    // Check global toggle
    const stored = await chrome.storage.local.get(['enabled', 'language']);
    if (stored.enabled === false) {
        isExtensionEnabled = false;
        overlayManager.teardown();
        return;
    }

    // Check language
    const lang = stored.language || 'en_US';
    await spellChecker.init(lang);

    // Check Advanced Grammar
    if (stored.enableAdvancedGrammar) {
        overlayManager.enableAdvancedGrammar(true);
    }

    // Start observing
    overlayManager.start();
};

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.enabled) {
            isExtensionEnabled = changes.enabled.newValue;
            if (isExtensionEnabled) {
                initExtension();
            } else {
                overlayManager.teardown();
            }
        }
        if (changes.language && isExtensionEnabled) {
            spellChecker.init(changes.language.newValue).then(() => {
                // Re-check all active inputs
                overlayManager.recheckAll();
            });
        }
        if (changes.enableAdvancedGrammar) {
            overlayManager.enableAdvancedGrammar(changes.enableAdvancedGrammar.newValue);
        }
    }
});

class OverlayManager {
    constructor() {
        this.overlays = new Map(); // Target element -> Overlay element
        this.ltErrors = new Map(); // Target element -> Array of LT errors
        this.debouncedCheck = this.debounce(this.checkInput.bind(this), 500);
        this.observer = null;
        this.activeTarget = null;
        this.activeErrorSpan = null; // Track currently active error

        this.isAdvancedGrammarEnabled = false;
        this.ltService = new LanguageToolService();
        this.triggerBtn = null;
    }

    start() {
        this.setupObservers();
        // Check current focused element
        if (document.activeElement) {
            this.handleFocus(document.activeElement);
        }
    }

    teardown() {
        // Remove all overlays
        this.overlays.forEach((overlay) => overlay.remove());
        this.overlays.clear();
        // Remove listeners (optional if we want to be super clean, but typically just stopping logic is enough)
    }

    setupObservers() {
        const _this = this;
        document.addEventListener('focusin', (e) => this.handleFocus(e.target));
        document.addEventListener('input', (e) => this.handleInput(e.target));
        document.addEventListener('scroll', (e) => this.handleScroll(e.target), true);
        window.addEventListener('resize', () => this.repositionAll());

        // Tooltip Dismissal Logic
        // 1. Click outside
        document.addEventListener('mousedown', (e) => {
            // If click is not inside tooltip and not inside an error span, hide tooltip
            if (!e.target.closest('.spellit-tooltip') && !e.target.classList.contains('spellit-error') && !e.target.classList.contains('spellit-grammar-error')) {
                this.dismissTooltip();
            }
        });

        // 2. Scroll (global or parent) -> hide tooltip
        document.addEventListener('scroll', () => {
            if (tooltip.isVisible()) this.dismissTooltip();
        }, true);
    }

    dismissTooltip() {
        tooltip.hide();
        this.activeErrorSpan = null;
    }

    debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    isValidTarget(target) {
        if (!target) return false;
        if (target.tagName === 'TEXTAREA') return true;
        if (target.tagName === 'INPUT' && (target.type === 'text' || target.type === 'search')) return true;
        return false;
    }

    handleFocus(target) {
        if (!isExtensionEnabled) return;
        if (!this.isValidTarget(target)) return;

        this.activeTarget = target;
        this.createOrUpdateOverlay(target);
        this.checkInput(target);
        this.injectTriggerButton(target);
    }

    handleInput(target) {
        if (!isExtensionEnabled) return;
        if (!this.isValidTarget(target)) return;

        // Dismiss tooltip on edit
        this.dismissTooltip();

        // Clear LT errors on edit to prevent stale offsets
        this.ltErrors.delete(target);

        this.updateOverlayContent(target);
        this.debouncedCheck(target);
    }

    handleScroll(target) {
        const overlay = this.overlays.get(target);
        if (overlay) {
            overlay.scrollTop = target.scrollTop;
            overlay.scrollLeft = target.scrollLeft;
        }
        this.dismissTooltip(); // Dismiss on scroll
        this.repositionTriggerButton();
    }

    repositionAll() {
        this.overlays.forEach((overlay, target) => {
            this.syncStyles(target, overlay);
        });
        this.dismissTooltip();
        this.repositionTriggerButton();
    }

    recheckAll() {
        this.overlays.forEach((overlay, target) => {
            if (document.contains(target)) {
                this.checkInput(target);
            }
        });
    }

    createOrUpdateOverlay(target) {
        let overlay = this.overlays.get(target);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'spellit-overlay';
            document.body.appendChild(overlay);
            this.overlays.set(target, overlay);
        }
        this.syncStyles(target, overlay);
        return overlay;
    }

    syncStyles(target, overlay) {
        try {
            const style = window.getComputedStyle(target);
            const rect = target.getBoundingClientRect();

            const properties = [
                'font-family', 'font-size', 'font-weight', 'font-style',
                'line-height', 'letter-spacing', 'text-align',
                'text-transform', 'text-indent', 'white-space',
                'word-break', 'word-spacing', 'overflow-wrap',
                'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
                'box-sizing'
            ];

            properties.forEach(prop => {
                overlay.style[prop] = style[prop];
            });

            overlay.style.width = rect.width + 'px';
            overlay.style.height = rect.height + 'px';

            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            overlay.style.top = (rect.top + scrollY) + 'px';
            overlay.style.left = (rect.left + scrollX) + 'px';

            overlay.scrollTop = target.scrollTop;
            overlay.scrollLeft = target.scrollLeft;

            overlay.style.display = style.display === 'none' ? 'none' : 'block';
        } catch (e) {
            // Element might be detached
        }
    }

    async checkInput(target) {
        if (!isExtensionEnabled) return;
        if (!this.isValidTarget(target)) return;

        const text = target.value;
        const overlay = this.createOrUpdateOverlay(target);

        let errors = [];

        const wordRegex = /[a-zA-Z]+/g;
        let match;
        while ((match = wordRegex.exec(text)) !== null) {
            const word = match[0];
            if (!spellChecker.check(word)) {
                errors.push({
                    type: 'spelling',
                    index: match.index,
                    length: word.length,
                    word: word,
                    suggestions: spellChecker.suggest(word)
                });
            }
        }

        const grammarErrors = grammarRules.check(text);
        errors = errors.concat(grammarErrors);

        const ltErrors = this.ltErrors.get(target) || [];
        errors = errors.concat(ltErrors);

        // Prioritize grammar errors (including LT) over spelling errors when they overlap
        errors.sort((a, b) => {
            if (a.index !== b.index) {
                return a.index - b.index;
            }
            // If indices are equal, prioritize non-spelling (grammar)
            const aIsSpelling = a.type === 'spelling';
            const bIsSpelling = b.type === 'spelling';

            if (aIsSpelling && !bIsSpelling) return 1;
            if (!aIsSpelling && bIsSpelling) return -1;
            return 0; // maintain relative order otherwise
        });

        const uniqueErrors = [];
        let lastEnd = -1;
        errors.forEach(err => {
            const end = err.index + err.length;
            if (err.index >= lastEnd) {
                uniqueErrors.push(err);
                lastEnd = end;
            }
        });

        this.renderOverlay(target, overlay, text, uniqueErrors);
    }

    updateOverlayContent(target) {
    }

    renderOverlay(target, overlay, text, errors) {
        overlay.innerHTML = '';
        let currentIndex = 0;

        errors.forEach(err => {
            if (err.index > currentIndex) {
                const before = text.substring(currentIndex, err.index);
                overlay.appendChild(document.createTextNode(before));
            }

            const errorText = text.substring(err.index, err.index + err.length);
            const span = document.createElement('span');
            span.textContent = errorText;

            if (err.type === 'spelling') {
                span.className = 'spellit-error';
            } else if (err.type === 'grammar-lt') {
                span.className = 'spellit-lt-error';
            } else {
                span.className = 'spellit-grammar-error';
            }

            span.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                // Toggle Logic
                if (this.activeErrorSpan === span && tooltip.isVisible()) {
                    this.dismissTooltip();
                    return;
                }

                const suggestions = err.suggestions || err.replacements || [];
                // Word for actions is either the error word or the text content
                const wordForAction = err.word || errorText;
                const label = err.type === 'grammar-lt' ? 'Grammar' : null;

                const rect = span.getBoundingClientRect();
                this.activeErrorSpan = span;

                // Show tooltip with enhanced callbacks
                tooltip.show(
                    rect.left,
                    rect.bottom,
                    suggestions,
                    (replacement) => {
                        this.replaceText(target, err.index, err.length, replacement);
                        this.activeErrorSpan = null;
                        this.ltErrors.delete(target); // Clear LT errors after fix to force re-check
                    },
                    (wordToIgnore) => {
                        if (err.type === 'spelling') {
                            spellChecker.ignoreWord(wordToIgnore);
                        }
                        // For grammar, ignore just removes the error from view?
                        // Or we need an ignore list. Logic for grammar ignore is implicit 
                        // if we re-check and it persists. 
                        // For LT, we'd need to ignore rule, but simple "Ignore" 
                        // could just remove this error instance from our local list.
                        if (err.type === 'grammar-lt') {
                            const currentErrors = this.ltErrors.get(target) || [];
                            const newErrors = currentErrors.filter(e => e !== err);
                            this.ltErrors.set(target, newErrors);
                        }

                        this.checkInput(target); // Re-check to remove highlight
                        this.activeErrorSpan = null;
                    },
                    (wordToAdd) => {
                        if (err.type === 'spelling') {
                            spellChecker.addToDictionary(wordToAdd);
                        }
                        this.checkInput(target); // Re-check to remove highlight
                        this.activeErrorSpan = null;
                    },
                    wordForAction,
                    label
                );
            });

            overlay.appendChild(span);
            currentIndex = err.index + err.length;
        });

        if (currentIndex < text.length) {
            const remaining = text.substring(currentIndex);
            overlay.appendChild(document.createTextNode(remaining));
        }
    }

    replaceText(target, index, length, replacement) {
        const text = target.value;
        const newText = text.substring(0, index) + replacement + text.substring(index + length);

        target.value = newText;

        if (target.setSelectionRange) {
            const newCursorPos = index + replacement.length;
            target.setSelectionRange(newCursorPos, newCursorPos);
        }

        const event = new Event('input', { bubbles: true });
        target.dispatchEvent(event);

        target.focus();
    }

    enableAdvancedGrammar(enabled) {
        this.isAdvancedGrammarEnabled = enabled;
        if (enabled && this.activeTarget) {
            this.injectTriggerButton(this.activeTarget);
        } else {
            this.removeTriggerButton();
            this.ltErrors.clear();
            this.recheckAll();
        }
    }

    repositionTriggerButton() {
        if (!this.triggerBtn || !this.activeTarget) return;

        try {
            const rect = this.activeTarget.getBoundingClientRect();
            const scrollY = window.scrollY;
            const scrollX = window.scrollX;

            this.triggerBtn.style.top = (rect.top + scrollY + 4) + 'px';
            this.triggerBtn.style.left = (rect.right + scrollX - 100) + 'px';
        } catch (e) {
            // ignore
        }
    }

    injectTriggerButton(target) {
        this.removeTriggerButton();
        if (!this.isAdvancedGrammarEnabled) return;

        // Only inject if target is active
        if (document.activeElement !== target) return;

        const btn = document.createElement('button');
        btn.textContent = 'Check Grammar';
        btn.className = 'spellit-trigger-btn';

        try {
            const rect = target.getBoundingClientRect();
            const scrollY = window.scrollY;
            const scrollX = window.scrollX;

            // Position: Top Right
            btn.style.top = (rect.top + scrollY + 4) + 'px';
            btn.style.left = (rect.right + scrollX - 100) + 'px'; // approx offset

            // Re-adjust on resize/scroll
        } catch (e) {
            return;
        }

        btn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent focus loss
            e.stopPropagation();
            this.handleTriggerClick(target);
        });

        document.body.appendChild(btn);
        this.triggerBtn = btn;
    }

    removeTriggerButton() {
        if (this.triggerBtn) {
            this.triggerBtn.remove();
            this.triggerBtn = null;
        }
    }

    async handleTriggerClick(target) {
        if (!this.triggerBtn) return;
        const originalText = this.triggerBtn.textContent;
        this.triggerBtn.textContent = 'Checking...';
        this.triggerBtn.disabled = true;

        const text = target.value;
        const cursorIndex = target.selectionStart || 0;

        const sentenceObj = this.extractSentence(text, cursorIndex);

        this.ltService.checkGrammar(sentenceObj.text, (err, matches) => {
            if (this.triggerBtn) {
                this.triggerBtn.textContent = originalText;
                this.triggerBtn.disabled = false;
            }

            if (err) {
                // Determine unavailability
                const rect = this.triggerBtn ? this.triggerBtn.getBoundingClientRect() : target.getBoundingClientRect();
                tooltip.show(
                    rect.left,
                    rect.bottom + 5,
                    [],
                    () => { },
                    () => { },
                    () => { },
                    '',
                    'Unavailable via LT'
                );
                return;
            }

            // Adjust offsets
            const adjustedMatches = matches.map(m => ({
                ...m,
                index: m.offset + sentenceObj.start
            }));

            this.ltErrors.set(target, adjustedMatches);
            this.checkInput(target);
        });
    }

    extractSentence(text, cursorIndex) {
        if (window.Intl && Intl.Segmenter) {
            const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
            const segments = Array.from(segmenter.segment(text));
            const activeSegment = segments.find(seg => cursorIndex >= seg.index && cursorIndex < seg.index + seg.segment.length);
            // Handling cursor exactly at end of text might fail above find logic if strictly <, so standard use <= or fallback
            // Actually Segmenter includes end.
            if (activeSegment) {
                return { text: activeSegment.segment, start: activeSegment.index };
            }
        }

        // Fallback or if cursor at end
        return { text: text, start: 0 };
    }
}

const overlayManager = new OverlayManager();

initExtension();
