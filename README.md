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

### Advanced Grammar
- **LanguageTool Integration**: Connect to a local LanguageTool server for advanced grammar and style checking.
    - **On-Demand**: Triggers only when you click "Check Grammar".
    - **Context-Aware**: Checks the current sentence relative to the cursor.
    - **Privacy-Centric**: Only communicates with your local server (`localhost`).
    - **Visual Distinction**: Errors marked with a blue underline.

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

1.  **Get the Source Code**:
    *   **Clone via Git**:
        ```bash
        git clone https://github.com/Anhad-01/SpellIt-Chrome-Extension-for-Spell-and-Grammar-Check.git
        ```
    *   **Or Download ZIP**: Click "Code" > "Download ZIP" on GitHub and extract it.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer mode** (toggle in the top right).
4.  Click **Load unpacked**.
5.  Select the `extension` folder from inside the downloaded project directory.

### Setting up Local LanguageTool
This extension communicates with a locally running LanguageTool server for advanced grammar checks. You can run this server via the Desktop App (GUI) or the Command Line (CLI).

#### Step 1: Download LanguageTool
*   **For Desktop App (Mac/Windows)**: Download from [languagetool.org](https://languagetool.org/).
*   **For CLI Server**: Download the standalone usage ZIP (e.g., `LanguageTool-6.x.zip`) from [languagetool.org/download/LanguageTool-stable.zip](https://languagetool.org/download/LanguageTool-stable.zip).

#### Step 2: Run the Server

**Option A: Using LanguageTool Desktop App (GUI)**
1.  Open the LanguageTool application.
2.  Go to **Settings**.
3.  In the "General" or "Experimental" tab (depending on version), look for "Local Server".
4.  Check **Enable Local Server**.
5.  Ensure the port is set to **8081**.

**Option B: Using Command Line (CLI)**
1.  Extract the downloaded ZIP file.
2.  Open a terminal in the folder containing `languagetool-server.jar`.
3.  Run the following command:
    ```bash
    java -cp languagetool-server.jar org.languagetool.server.HTTPServer --port 8081 --allow-origin "*"
    ```
    *(Requires Java to be installed)*

#### Step 3: Enable in Extension
1.  Open the SpellIt extension popup.
2.  Toggle **Advanced Grammar (LT)** to ON.
3.  Focus any text field on a webpage and click the "Check Grammar" button to verify.

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
- **LanguageTool**: Managed by `js/languageToolService.js`, communicates with local server via HTTP.

