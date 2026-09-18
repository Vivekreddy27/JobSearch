# Job Search Assistant

A local-first job search dashboard for tracking roles, tailoring resume drafts, writing cover letters, and managing an application queue.

## Live app

Once GitHub Pages finishes deploying, the app should be available at:

https://vivekreddy27.github.io/JobSearch/

## What it does

- Stores your base profile, skills, experience bullets, and resume summary in browser local storage.
- Saves job descriptions and application links.
- Scores each job against your profile keywords.
- Generates editable targeted resume notes and cover letter drafts.
- Queues applications for review before you submit them.
- Exports and imports your data as JSON.

## How to run locally

Open `index.html` in a browser.

No install step is required.

## Why applications are queued

The app does not submit applications without review. Auto-submitting job applications can violate job-board terms, produce low-quality applications, or get accounts flagged. This project keeps the useful automation: matching, drafting, tracking, and opening the correct application link when you are ready.

## Suggested next upgrades

- Add a backend database.
- Connect to LinkedIn, Greenhouse, Lever, or Workday through approved APIs where available.
- Add resume PDF/DOCX generation.
- Add email/calendar reminders.
- Add an LLM API for higher-quality tailoring.
