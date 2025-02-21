const core = require("@actions/core");
const github = require("@actions/github");
const { OpenAI } = require("openai"); // Updated import
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
    const openai = new OpenAI({ apiKey: apiKey }); // Updated initialization

    if (!context.payload.pull_request) {
      core.setFailed("This action must run in a pull_request context.");
      return;
    }

    // ... rest of your code remains the same until the OpenAI API call ...

    if (mode === "summarize_commits") {
      // ... other code ...

      // Updated ChatGPT call (using the new OpenAI client)
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
          return `- ${response.choices[0].message.content}`;
        }),
      );

      // ... rest of the code ...
    } else if (mode === "generate_changelog") {
      // ... other code ...

      // Updated ChatGPT call for overall summary
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

      // ... rest of the code ...
    }
    // ... rest of the code ...
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
