# Mailbox Janitor 🧹

> A smart, privacy-first email-cleaning assistant designed to help you regain control over cluttered inboxes, focus on high-value conversations, and automate repetitive cleanup tasks.

---

## 📖 Table of Contents
1. [Core Vision](#-core-vision)
2. [Key Features](#-key-features)
3. [User Experience & Product Feel](#-user-experience--product-feel)
4. [Proposed Architectures](#-proposed-architectures)
5. [Security & Privacy Guarantees](#-security--privacy-guarantees)
6. [Roadmap](#-roadmap)

---

## 🎯 Core Vision

**Mailbox Janitor** is not just another email client. It is a calm, competent assistant that works in the background to handle the "noise" of your inbox (newsletters, shipping updates, social notifications, promotional alerts) so you can focus on the signals that actually matter.

*   **Opinionated but Safe:** It suggests confident cleaning actions but never deletes, archives, or unsubscribes without your explicit consent.
*   **Minimal Friction:** It doesn't ask complicated questions. It groups, summarizes, and offers one-click resolutions.
*   **Privacy-First:** Senders, subjects, and snippets contain highly sensitive personal data. Mailbox Janitor uses secure AI processing with zero-data-retention parameters.

---

## 🌟 Key Features

### 🔍 1. Intelligent Analysis & Categorization
Instead of standard folder-filtering, Mailbox Janitor reads email headers and snippets using LLMs to group your inbox into actionable categories:
*   **Important & Personal:** Emails requiring human attention.
*   **Newsletters & Subscriptions:** Reading material.
*   **Automated Notifications:** Shipping notices, order confirmations, password resets.
*   **Low-Value Clutter:** Cold sales pitches, bulk promotions, spam-adjacent mail.

### 🧹 2. Batch-Cleaning ("Sprints")
Never review emails one by one. Mailbox Janitor aggregates messages into logical clean-up bundles:
*   *"Archive these 120 shipping notices from last month?"*
*   *"Delete these 65 promotional emails older than 30 days?"*
*   *"Unsubscribe from these 8 newsletters you haven't opened in 90 days?"*

### ⚙️ 3. Auto-Filter Generation (The Permanent Fix)
Instead of forcing you to clean the same clutter repeatedly, Mailbox Janitor helps you fix it at the source:
*   If you bulk-archive or delete emails from a specific sender multiple times, it offers to generate a permanent filter (e.g., automatically skip the inbox, mark as read, or apply a specific label).

### 📰 4. Smart Newsletter Digest
Stop letting newsletters clutter your main feed. Mailbox Janitor can automatically label and move newsletters out of the main inbox and present them in a single, beautifully structured, readable daily or weekly magazine-style digest.

### 🧠 5. Learning & Preference Tracking
The janitor learns your preferences silently:
*   **Whitelist Senders:** Senders you *never* want the janitor to suggest cleaning.
*   **Supervised Automation:** Gradually reduces prompt frequency for senders you consistently clean in the same way.

---

## 🎨 User Experience & Product Feel

*   **The "Swipe-to-Clean" Sweep:** A fast, mobile-friendly interface to quickly accept or reject proposed batch actions.
*   **Digest Summaries:** Clear, non-intrusive notification reports:
    *   *"Top 5 senders caused 75% of your clutter this week."*
    *   *"I staged 450 emails for deletion. Approve them in 2 clicks."*
*   **No Shady Actions:** The assistant never replies to emails, sends emails, or alters your mailbox configuration without permission.

---

## 🏗️ Proposed Architectures

We are evaluating three primary architectures to scale Mailbox Janitor easily and cost-effectively, avoiding Google's expensive REST API restricted-scope security audit ($15,000–$75,000/year):

### Option A: Firebase Web App (Hybrid Auth/BYOK)
*   **Tech Stack:** Next.js (React) + Firebase (Auth, Firestore, Cloud Functions).
*   **Auth:** Google Sign-In (OAuth 2.0) using Firebase Auth.
*   **AI:** Gemini 3.5 Flash API (highly optimized, cost-efficient classification).
*   **Scaling Strategy:** Bypasses audit requirements during development and early access by operating in **OAuth Testing Mode** (supporting up to 100 users) or using the **"Bring Your Own API Key/Client ID"** configuration model for power users.

### Option B: DOM-Based Chrome Extension
*   **Tech Stack:** JavaScript (React) + Manifest V3 Chrome Extension.
*   **How it works:** Injects UI components directly into the Gmail web page. It reads the visible inbox DOM nodes and automates archival/deletion by simulating native keyboard shortcuts (e.g., pressing `e` to archive).
*   **Scaling Strategy:** **Zero Audit Required.** Because it does not directly use the Gmail REST API backend scopes, it does not trigger Google's restricted-scope audit. 
*   **Server Cost:** $0 (runs entirely in the browser using the user's local computing resources and Gemini API keys).

### Option C: Local Desktop App (Tauri / Rust)
*   **Tech Stack:** Tauri + Rust + React.
*   **How it works:** A local-first mail application that connects to Gmail (and other providers) via standard **IMAP/SMTP**. 
*   **Scaling Strategy:** Bypasses Google API audits because it operates as a native local mail client (like Outlook or Thunderbird). All indexing and processing are completely local.

---

## 🔒 Security & Privacy Guarantees

*   **Zero-Data-Retention AI:** All email snippet classification is processed via enterprise-grade APIs with zero-data-retention policies. Your emails are never used to train machine learning models.
*   **Read-Only Analysis:** Analysis is separate from modification. The AI evaluates text snippets, and modifications are triggered locally by secure, client-side actions.
*   **No Credentials Storage:** Your Google/IMAP passwords are never saved on a central server. All authentication tokens are encrypted and managed using Firebase/Google security best practices or stored locally on your device.

---

## 🚀 Roadmap

- [ ] **Phase 1: Local CLI/Prototype** – Connect to Gmail, query with Gemini 3.5 Flash, and test classification accuracy.
- [ ] **Phase 2: Database Schema & Authentication** – Set up Firebase Authentication, Firestore, and the scheduled worker function logic.
- [ ] **Phase 3: Web Dashboard / UI Mockup** – Design a beautiful, premium, glassmorphic layout for the newsletter digest, batch cleaning, and analytics.
- [ ] **Phase 4: Auto-Filter Engine** – Implement automated Gmail rule creation based on cleanup recommendations.
- [ ] **Phase 5: Release Integration** – Package as a Chrome Extension or a "Bring Your Own Key" Web App for early testing.
