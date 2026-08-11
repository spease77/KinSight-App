# KinSight

A responsive mobile-first sales relationship tool built with Next.js and Tailwind CSS.

## Features

- **Dark hotel aesthetic** — luxury-inspired palette with gold accents and serif typography
- **Voice capture** — prominent center microphone button (UI ready for speech integration)
- **Contact list** — scrollable relationship cards with status indicators
- **Export to Excel** — one-tap `.xlsx` export via SheetJS

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/) icons
- [SheetJS (xlsx)](https://sheetjs.com/) for Excel export

## Project Structure

```
src/
├── app/           # Next.js app router (layout, page, globals)
├── components/    # UI components (Dashboard, Mic, Contacts, Export)
├── data/          # Sample contact data
├── lib/           # Utilities (Excel export)
└── types/         # TypeScript interfaces
```
