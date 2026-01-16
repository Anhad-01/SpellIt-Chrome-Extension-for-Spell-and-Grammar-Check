# SpellIt - Offline Chrome Extension for Spelling & Grammar

SpellIt is a lightweight, offline-first Chrome extension that detects spelling errors and basic grammar mistakes in real-time within `<textarea>` and `<input>` fields. It provides inline highlighting and a tooltip for suggestions.

## Features

- **Offline Spelling**: Uses Hunspell dictionaries (`en_US`) via `Typo.js`.
- **Basic Grammar Rules**: Detects double spaces, repeated words, and capitalization errors.
- **Real-time Detection**: Checks text as you type (debounced).
- **Non-intrusive UI**: Uses an overlay system to highlight errors without modifying the underlying text until you accept a suggestion.
- **Privacy-Focused**: No external API calls. All processing happens locally in your browser.

## Installation

1.  Clone or download this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer mode** (toggle in the top right).
4.  Click **Load unpacked**.
5.  Select the `extension` folder from this project.

## architecture

- **manifest.json**: Manifest V3 configuration.
- **content.js**: Core script injected into pages. Monitors input fields, creates mirror overlays for highlighting, and handles user interaction.
- **spellChecker.js**: Wrapper around `Typo.js`. Loads dictionary files and performs spell checking.
- **rules.js**: Contains heuristic-based grammar rules.
- **tooltip.js**: Manages the suggestion tooltip UI.
- **styles.css**: Styles for the overlay, highlights, and tooltip.

## Development

- **Dictionaries**: Located in `extension/assets/`. `en_US.dic` and `en_US.aff`.
- **Library**: `Typo.js` located in `extension/lib/`.

## API Support

The codebase is designed to be modular. To add an online grammar checking service,`spellChecker.js` or `rules.js` can be extended to fetch suggestions from an API if the user is online, while keeping the offline fallback.
