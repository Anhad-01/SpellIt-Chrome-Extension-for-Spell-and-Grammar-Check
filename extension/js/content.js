
// Initialize dependencies
(async function () {
    await spellChecker.init();
})();

class OverlayManager {
    constructor() {
        this.overlays = new Map(); // Target element -> Overlay element
        this.debouncedCheck = this.debounce(this.checkInput.bind(this), 500);

        this.setupObservers();
    }

    setupObservers() {
        document.addEventListener('focusin', (e) => this.handleFocus(e.target));
        document.addEventListener('input', (e) => this.handleInput(e.target));
        document.addEventListener('scroll', (e) => this.handleScroll(e.target), true);
        window.addEventListener('resize', () => this.repositionAll());
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
        if (!this.isValidTarget(target)) return;
        this.createOrUpdateOverlay(target);
        this.checkInput(target);
    }

    handleInput(target) {
        if (!this.isValidTarget(target)) return;
        this.updateOverlayContent(target);
        this.debouncedCheck(target);
    }

    handleScroll(target) {
        const overlay = this.overlays.get(target);
        if (overlay) {
            overlay.scrollTop = target.scrollTop;
            overlay.scrollLeft = target.scrollLeft;
        }
    }

    repositionAll() {
        this.overlays.forEach((overlay, target) => {
            this.syncStyles(target, overlay);
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
    }

    async checkInput(target) {
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

                const suggestions = err.suggestions || err.replacements || [];

                const rect = span.getBoundingClientRect();
                tooltip.show(rect.left, rect.bottom, suggestions, (replacement) => {
                    this.replaceText(target, err.index, err.length, replacement);
                });
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
