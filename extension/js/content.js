
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
    }
});

class OverlayManager {
    constructor() {
        this.overlays = new Map(); // Target element -> Overlay element
        this.debouncedCheck = this.debounce(this.checkInput.bind(this), 500);
        this.observer = null;
        this.activeTarget = null;
        this.activeErrorSpan = null; // Track currently active error
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
    }

    handleInput(target) {
        if (!isExtensionEnabled) return;
        if (!this.isValidTarget(target)) return;

        // Dismiss tooltip on edit
        this.dismissTooltip();

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
    }

    repositionAll() {
        this.overlays.forEach((overlay, target) => {
            this.syncStyles(target, overlay);
        });
        this.dismissTooltip();
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

        errors.sort((a, b) => a.index - b.index);

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
                    },
                    (wordToIgnore) => {
                        spellChecker.ignoreWord(wordToIgnore);
                        this.checkInput(target); // Re-check to remove highlight
                        this.activeErrorSpan = null;
                    },
                    (wordToAdd) => {
                        spellChecker.addToDictionary(wordToAdd);
                        this.checkInput(target); // Re-check to remove highlight
                        this.activeErrorSpan = null;
                    },
                    wordForAction
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
}

const overlayManager = new OverlayManager();

initExtension();
