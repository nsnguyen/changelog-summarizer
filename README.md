# Changelog Summarizer

A GitHub Action that uses ChatGPT to summarize commit messages and generate changelogs for pull requests.

## Features

- Summarizes individual commits in a PR and posts them as a comment.
- Generates an overall summary and updates a changelog file when the PR is merged.

## Prerequisites

- An OpenAI API key (get one from [OpenAI](https://platform.openai.com)).

## Usage

1. Add your OpenAI API key as a repository secret named `CHATGPT_API_KEY` (Settings > Secrets and variables > Actions > New repository secret).
2. Add the following workflows to `.github/workflows/` in your repository.

### Workflow 1: Summarize Commits

`.github/workflows/summarize-commits.yml`:

```yaml
name: Summarize Commits
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  summarize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: your-username/changelog-summarizer@v1
        with:
          mode: summarize_commits
          api-key: ${{ secrets.CHATGPT_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```
