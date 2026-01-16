class Tooltip {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'spellit-tooltip';
        this.element.style.display = 'none';

        // Prevent tooltip from trapping focus or causing issues
        this.element.setAttribute('tabindex', '-1');

        document.body.appendChild(this.element);
    }

    show(x, y, suggestions, onSelect, onIgnore, onAddToDict, word) {
        this.element.innerHTML = '';

        // 1. Suggestions
        if (suggestions.length === 0) {
            const div = document.createElement('div');
            div.className = 'spellit-no-suggestions';
            div.textContent = 'No suggestions found';
            this.element.appendChild(div);
        } else {
            suggestions.forEach(suggestion => {
                const div = document.createElement('div');
                div.className = 'spellit-suggestion';
                div.textContent = suggestion;
                div.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent dismissal immediately if we want animations later, but usually fine
                    onSelect(suggestion);
                    this.hide();
                });
                this.element.appendChild(div);
            });
        }

        // Separator
        const hr = document.createElement('hr');
        hr.style.margin = '4px 0';
        hr.style.border = '0';
        hr.style.borderTop = '1px solid #eee';
        this.element.appendChild(hr);

        // 2. Actions
        // Ignore Once
        const ignoreBtn = document.createElement('div');
        ignoreBtn.className = 'spellit-action';
        ignoreBtn.textContent = 'Ignore Always'; // "Ignore Once" requested, but usually "Ignore" implies session. "Add to Dict" is permanent. 
        // User asked: "Ignore Once" -> Remain ignored only for current session and current text field.
        // Let's call it "Ignore" in UI for brevity.
        ignoreBtn.textContent = 'Ignore';
        ignoreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onIgnore(word);
            this.hide();
        });
        this.element.appendChild(ignoreBtn);

        // Add to Dictionary
        const addBtn = document.createElement('div');
        addBtn.className = 'spellit-action';
        addBtn.textContent = 'Add to Dictionary';
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onAddToDict(word);
            this.hide();
        });
        this.element.appendChild(addBtn);


        // Positioning
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        this.element.style.left = (x + scrollX) + 'px';
        this.element.style.top = (y + scrollY + 5) + 'px';
        this.element.style.display = 'block';
    }

    hide() {
        this.element.style.display = 'none';
    }

    isVisible() {
        return this.element.style.display === 'block';
    }
}

const tooltip = new Tooltip();
