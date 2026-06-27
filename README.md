# Mailbox Janitor 🧹🤖

> A smart, privacy-first Gmail AI Auto-Pilot Agent that automatically scans, classifies, and cleans your incoming emails in the background so you can focus on conversations that actually matter.

---

## 🎯 The Vision

**Mailbox Janitor** is a dedicated automation agent designed to eliminate email noise. It reads your unread inbox emails using Gemini 2.5 Flash, classifies them into logical categories, and automatically executes actions (like marking newsletters as read, archiving promotional clutter, or ignoring important personal updates) based on your custom rules.

*   **100% Client-Side:** Your emails are analyzed directly in your browser. Your API keys and OAuth tokens are never sent to or stored on a third-party server.
*   **Privacy-First:** Utilizes enterprise-grade Gemini API processing with zero data retention parameters.
*   **Zero Infrastructure Costs:** Runs entirely in your browser using your own credentials (Bring Your Own Key / BYOK model).

---

## 🌟 Key Features

### 🤖 1. Real-Time Auto-Pilot
Toggle the agent on and let it work in the background. It periodically scans your inbox, classifies new unread messages, and automatically cleans them without requiring manual clicks.

### 📊 2. Intelligent Categorization
The agent reads email headers and snippets using Gemini AI to sort messages into:
*   **Important & Personal:** Kept in the inbox.
*   **Newsletters:** Auto-processed (e.g. marked as read, archived, or deleted).
*   **Notifications:** Tool alerts, receipts, shipping updates (custom rules).
*   **Low-Value Clutter:** Marketing, ads, spam-adjacent pitches.

### 📟 3. Live Activity Console
Watch the agent work in real-time through a retro-style terminal emulator. View scan timestamps, classification categories, reasons, and actions taken (e.g. `[SUCCESS] Classified as newsletter. Action: MARK AS READ`).

### ☁️ 4. Free 24/7 Headless Support
Want the agent to run 24/7 even when your browser tab is closed? We include a copy-pasteable **Google Apps Script** snippet inside the dashboard. You can set it up in Google Cloud in under 3 minutes for free.

---

## 🚀 Setup & Installation

Since this is a client-side web application, you can run it directly on GitHub Pages or locally:

### 1. Configure Google Credentials
To securely read and clean your mailbox:
1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Gmail API**.
3. Create an **OAuth Client ID** (Web application) and add your deployment URL (e.g., `https://yourname.github.io`) to the **Authorized JavaScript origins**.
4. Set the publishing status of your OAuth Consent Screen to **Testing** and add your Gmail address as a test user.

### 2. Configure Gemini API Key
1. Get a free API Key from [Google AI Studio](https://aistudio.google.com/).

### 3. Open the App
1. Go to the app URL (e.g. `https://skillith.github.io/Mailbox-Janitor/`).
2. Click **API Config** in the header and paste your Google Client ID and Gemini API Key.
3. Click **Sign In with Google** and authorize the application.
4. Toggle **Activate Auto-Pilot**!

---

## 🛠️ Tech Stack

*   **Frontend:** React 19 + TypeScript + Vite
*   **Styling:** Custom glassmorphic CSS animations
*   **AI Engine:** `@google/generative-ai` (Gemini 2.5 Flash)
*   **API Integrations:** Gmail REST API (fetch, batchModify, settings/filters)
*   **Hosting:** GitHub Pages (automated deployment workflow)

---

## 🔒 Security & Privacy

*   **No Databases:** All settings and logs are saved inside your browser's local storage.
*   **Direct Connections:** API requests travel directly from your browser to Google Gmail and Google Gemini servers.
*   **Safe Scopes:** The app is configured with read-write scopes required to archive and mark mail as read but never sends or drafts emails.
