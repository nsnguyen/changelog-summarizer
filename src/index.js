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
      // Ensure PR is merged
      if (!context.payload.pull_request.merged) {
        core.info("PR not merged; skipping changelog update.");
        return;
      }

      // Fetch summaries from PR comment
      core.info("Fetching commit summaries from PR comment...");
      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
      });
      const summaryComment = comments.find((c) =>
        c.body.includes("<!-- COMMIT_SUMMARIES_START -->"),
      );

      if (!summaryComment) {
        core.setFailed("No commit summaries found in PR comments.");
        return;
      }

      const summaries = summaryComment.body
        .split("<!-- COMMIT_SUMMARIES_START -->")[1]
        .split("<!-- COMMIT_SUMMARIES_END -->")[0]
        .trim();

      // Generate overall summary with ChatGPT
      core.info("Generating overall summary with ChatGPT...");
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: `Generate a concise overall summary in bullet points for a changelog based on these commit summaries:\n\n${summaries}`,
          },
        ],
        max_tokens: 100,
      });
      const overallSummary = response.choices[0].message.content;

      // Update changelog file
      const prTitle = context.payload.pull_request.title;
      const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const newEntry = `## [${date}] PR #${prNumber}: ${prTitle}\n\n${overallSummary}\n\n`;

      core.info(`Updating ${changelogFile}...`);
      let existingContent = "";
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: changelogFile,
        });
        existingContent = Buffer.from(data.content, "base64").toString("utf-8");
      } catch (error) {
        if (error.status !== 404) throw error; // File doesn’t exist yet, which is fine
      }

      const updatedContent = newEntry + existingContent;
      require("fs").writeFileSync(changelogFile, updatedContent);

      // Commit and push the updated changelog
      core.info("Committing and pushing changelog...");
      await exec("git", ["config", "user.name", "github-actions"]);
      await exec("git", ["config", "user.email", "github-actions@github.com"]);
      await exec("git", ["add", changelogFile]);
      await exec("git", [
        "commit",
        "-m",
        `Update changelog for PR #${prNumber}`,
      ]);
      await exec("git", ["push"]);
      core.info("Changelog updated successfully.");
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
