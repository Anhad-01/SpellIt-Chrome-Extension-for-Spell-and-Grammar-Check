class Tooltip {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'spellit-tooltip';
        this.element.style.display = 'none';
        document.body.appendChild(this.element);
    }

    show(x, y, suggestions, onSelect) {
        this.element.innerHTML = '';
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
                div.addEventListener('click', () => {
                    onSelect(suggestion);
                    this.hide();
                });
                this.element.appendChild(div);
            });
        }

        // Positioning
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        this.element.style.left = (x + scrollX) + 'px';
        this.element.style.top = (y + scrollY + 20) + 'px'; // Below the cursor
        this.element.style.display = 'block';
    }

    hide() {
        this.element.style.display = 'none';
    }
}

const tooltip = new Tooltip();
