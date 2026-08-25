<<<<<<< HEAD
# Document Manifest

This project is a static document portal designed for GitHub Pages or any other static host.

## Setup

1. Put the HTML file at the project root.
2. Place document files in a folder such as `docs/`.
3. Use public PDF URLs or relative paths like `./docs/file.pdf` in the admin panel.
4. Deploy the folder to GitHub Pages or another static host.

## Recommended hosting model

- Frontend: GitHub Pages
- PDFs: public repository files or a cloud object store for very large files

## Example public URL

https://username.github.io/repo-name/

## Admin access

The admin passcode must be configured as an environment variable, not embedded in the public page.

1. Copy `.env.example` to a real environment file for your host.
2. Set `ADMIN_PASSCODE` to a unique secret value.
3. On Vercel or another host, add that value in the project environment settings.

> For large PDFs, prefer a public hosted link instead of in-browser upload.
=======
# doc-host
>>>>>>> origin/main
