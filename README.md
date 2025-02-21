# Changelog Summarizer

A GitHub Action that uses ChatGPT to summarize commit messages and generate changelogs for pull requests (PRs).

## Features

- Summarizes individual commits in a PR and posts them as a comment.

- Generates an overall summary and updates a changelog file (e.g., `CHANGELOG.md`) when the PR is merged.

- Includes commit hashes for tracking in summaries.

- Open-source and reusable by anyone with a ChatGPT API key.

## Prerequisites

- An OpenAI API key (get one from [OpenAI](https://platform.openai.com)).

- A GitHub repository where you want to use this action.

## Usage

To integrate `changelog-summarizer` into your GitHub repository, follow these steps:

### 1. Add the Action to Your Repository

Add the following workflows to your repository in the `.github/workflows/` directory.

#### Workflow 1: Summarize Commits

This workflow runs when a PR is opened or updated, summarizing commits and posting them as a PR comment.

`.github/workflows/summarize-commits.yml`:

```yaml
name: Summarize Commits
on:
  pull_request:
    types: [opened, synchronize]
permissions:
  pull-requests: write
  contents: read
jobs:
  summarize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: nsnguyen/changelog-summarizer@v1
        with:
          mode: summarize_commits
          api-key: ${{ secrets.CHATGPT_API_KEY }}
          github-token: ${{ github.token }}
```

#### Workflow 2: Update Changelog

This workflow runs when a PR is merged, generating an overall summary and updating CHANGELOG.md.

`.github/workflows/update-changelog.yml`:

```yaml
name: Update Changelog
on:
  pull_request:
    types: [closed]
permissions:
  pull-requests: read
  contents: write
jobs:
  update:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          ref: ${{ github.event.pull_request.base.ref }}
      - uses: nsnguyen/changelog-summarizer@v1
        with:
          mode: generate_changelog
          api-key: ${{ secrets.CHATGPT_API_KEY }}
          github-token: ${{ github.token }}
          changelog-file: CHANGELOG.md
```

### 2. Set Up Secrets

- Go to your repository on GitHub > Settings > Secrets and variables > Actions > New repository secret.

- Add a secret named `CHATGPT_API_KEY` with your OpenAI API key value.

- Ensure the API key has sufficient quota for ChatGPT API calls.

### 3. Customize (Optional)

- Change the Changelog File: Modify the `changelog-file` input in `update-changelog.yml` to use a different file path (e.g., `docs/CHANGELOG.md`).

- Adjust Summary Format: If you want to customize how summaries are generated, fork this repository, modify `src/index.js` (e.g., change the ChatGPT prompt), rebuild with `npm run build`, and tag a new version (e.g., `v2`).

## Updating the Action

To keep your repository up-to-date with new versions of changelog-summarizer:

1. Check the Releases page for new versions (e.g., `v2`, `v3`).

2. Update the version in your workflows by changing nsnguyen/changelog-summarizer@v1 to the latest version (e.g., `nsnguyen/changelog-summarizer@v2`).

3. Test the updated workflows in a PR to ensure compatibility with your repository.

## Example Output

### PR Comment (Workflow 1)

```
### Commit Summaries
<!-- COMMIT_SUMMARIES_START -->
- This commit adds a final test Python file to the project. (Commit: abc123def)
- This commit improves the final test Python file. (Commit: xyz789ghi)
<!-- COMMIT_SUMMARIES_END -->

_Automatically updated by changelog-summarizer._
```

### CHANGELOG.md (Workflow 2)

```
# Changelog

## [2025-02-20] PR #3: Add and improve final test Python file
- Enhanced the project with a final test Python file and improvements
```

## Notes

- This action uses ChatGPT API calls, which may incur costs based on usage (see OpenAI pricing).

- Ensure your GITHUB_TOKEN has the necessary permissions (pull-requests: write, contents: read/write) as specified in the workflows.

- The action requires Node.js 16 or later (bundled in GitHub Actions runners).
