# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated deployment.

## Available Workflows

### 1. `deploy-gh-pages-branch.yml` (Recommended)
Deploys to the `gh-pages` branch. Use this if you're already using the gh-pages branch for GitHub Pages.

**Features:**
- Triggers on push to `main` branch
- Can be manually triggered via `workflow_dispatch`
- Uses `peaceiris/actions-gh-pages` action
- Compatible with existing gh-pages setup

**Setup:**
1. Ensure GitHub Pages is configured to deploy from `gh-pages` branch
2. The workflow will automatically run on every push to `main`

### 2. `deploy.yml`
Modern GitHub Pages deployment using GitHub Actions (no gh-pages branch needed).

**Features:**
- Triggers on push to `main` branch
- Can be manually triggered via `workflow_dispatch`
- Uses official GitHub Pages deployment actions
- Requires Pages to be configured with "GitHub Actions" source

**Setup:**
1. Go to Repository Settings → Pages
2. Set Source to "GitHub Actions"
3. The workflow will automatically run on every push to `main`

## Which Workflow Should I Use?

- **Use `deploy-gh-pages-branch.yml`** if:
  - You're already using the gh-pages branch
  - You want to keep your current setup
  - You prefer the traditional deployment method

- **Use `deploy.yml`** if:
  - You want to use the modern GitHub Pages deployment
  - You don't want to maintain a separate gh-pages branch
  - You prefer GitHub's newer deployment system

## Disabling a Workflow

To disable automatic deployment, you can:
1. Delete the workflow file you don't want to use
2. Or comment out the `on: push:` trigger in the workflow file

## Manual Trigger

Both workflows support manual triggering:
- Go to Actions tab in GitHub
- Select the workflow
- Click "Run workflow"

