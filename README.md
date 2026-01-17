# SpellIt - Offline Chrome Extension for Spelling & Grammar

SpellIt is a lightweight, offline-first Chrome extension that helps you write better by detecting spelling errors and grammar mistakes in real-time. It works entirely within your browser, ensuring your data remains private.

## Features

### Core Detection
- **Offline Spelling**: Uses Hunspell dictionaries (`en_US` and `en_GB`) to detect spelling errors instantly.
- **Real-time Checking**: Monitors `<textarea>` and `<input>` fields as you type.
- **Smart Highlighting**: Uses a non-intrusive overlay to underline errors:
    - **Red**: Spelling errors.
    - **Orange**: Grammar and style suggestions.

### Grammar & Style Rules
SpellIt goes beyond simple spell checking with rule-based heuristics:
- **Capitalization**: Detects sentences starting with lowercase letters.
- **Double Spaces**: Flags accidental multiple spaces between words.
- **Repeated Words**: Detects accidental repetition (e.g., "the the").
- **Contractions**: Suggests missing contractions (e.g., "dont" → "don't").
- **Articles**: Checks for incorrect indefinite article usage (e.g., "a apple" → "an apple").

### Tools & Actions
- **Smart Tooltip**: Click any underlined word to see suggestions.
    - **Toggle Behavior**: Click to show, click again to hide. Dismisses automatically when you type or scroll.
- **Dictionary Management**:
    - **Ignore**: Temporarily ignore a word for the current session.
    - **Add to Dictionary**: Permanently add a custom word to your local dictionary so it's never flagged again.
- **Language Support**: Switch between **English (US)** and **English (UK)** via the extension popup.
- **Global Control**: Easily enable or disable the extension globally from the toolbar popup.

## Privacy & Offline Promise
SpellIt makes **zero network requests**.
- No text is sent to the cloud.
- Dictionaries are loaded locally.
- Preferences are stored in your browser's local storage.

## Installation

1.  Clone or download this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer mode** (toggle in the top right).
4.  Click **Load unpacked**.
5.  Select the `extension` folder from this project.

## Architecture

- **manifest.json**: Manifest V3 compliant configuration.
- **content.js**: Injects the overlay system and handles user interaction (clicks, typing, tooltip management).
- **spellChecker.js**: Manages `Typo.js`, Hunspell dictionaries, and custom user dictionaries.
- **rules.js**: Contains the modular logic for all grammar and style heuristics.
- **popup.html/js**: UI for language selection and global toggle.
- **tooltip.js**: Renders the suggestion UI.

## Development

- **Dictionaries**: Located in `extension/assets/`. Includes `.dic` and `.aff` files.
- **Library**: Uses `Typo.js` for spell checking logic.

