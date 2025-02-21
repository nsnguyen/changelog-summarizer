const core = require("@actions/core");
const github = require("@actions/github");
const { OpenAI } = require("openai");
const { exec } = require("@actions/exec");

async function run() {
  try {
    // Inputs from workflow
    const mode = core.getInput("mode", { required: true });
    const apiKey = core.getInput("api-key", { required: true });
    const githubToken = core.getInput("github-token", { required: true });
    const changelogFile = core.getInput("changelog-file") || "CHANGELOG.md";

    // Initialize clients
    const octokit = github.getOctokit(githubToken);
    const context = github.context;
    const openai = new OpenAI({ apiKey: apiKey });

    if (!context.payload.pull_request) {
      core.setFailed("This action must run in a pull_request context.");
      return;
    }

    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const prNumber = context.payload.pull_request.number;

    if (mode === "summarize_commits") {
      // Fetch commits
      core.info("Fetching commits...");
      const { data: commits } = await octokit.rest.pulls.listCommits({
        owner,
        repo,
        pull_number: prNumber,
      });

      // Summarize each commit
      core.info("Summarizing commits with ChatGPT...");
      const summaries = await Promise.all(
        commits.map(async (commit) => {
          const message = commit.commit.message.split("\n")[0]; // Use first line of commit message
          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "user",
                content: `Summarize this commit message in one sentence: "${message}"`,
              },
            ],
            max_tokens: 50,
          });
          return `- ${response.choices[0].message.content} (Commit: ${commit.sha})`;
        }),
      );

      // Create or update PR comment
      const commentBody = [
        "### Commit Summaries",
        "<!-- COMMIT_SUMMARIES_START -->",
        summaries.join("\n"),
        "<!-- COMMIT_SUMMARIES_END -->",
        "",
        "_Automatically updated by changelog-summarizer._",
      ].join("\n");

      core.info("Updating PR comment...");
      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
      });
      const existingComment = comments.find((c) =>
        c.body.includes("<!-- COMMIT_SUMMARIES_START -->"),
      );

      if (existingComment) {
        await octokit.rest.issues.updateComment({
          owner,
          repo,
          comment_id: existingComment.id,
          body: commentBody,
        });
      } else {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: commentBody,
        });
      }
      core.info("Commit summaries posted successfully.");
    } else if (mode === "generate_changelog") {
      // ... (leave this section unchanged for now)
    } else {
      core.setFailed(
        `Invalid mode: ${mode}. Use "summarize_commits" or "generate_changelog".`,
      );
    }
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
