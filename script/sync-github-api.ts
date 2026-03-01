import { getUncachableGitHubClient } from "../server/github";
import fs from "fs";
import path from "path";

async function main() {
  try {
    console.log("Initializing GitHub client...");
    const octokit = await getUncachableGitHubClient();
    const owner = "Abdesselamh";
    const repo = "settlement-engine";

    console.log(`Syncing to ${owner}/${repo}...`);

    let parentCommitSha: string | undefined;
    try {
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: "heads/main",
      });
      parentCommitSha = refData.object.sha;
    } catch (e) {
      console.log("Branch not found, creating new...");
    }

    const filesToUpload: string[] = [];
    const ignoreList = [
      "node_modules", ".git", ".cache", "dist", ".upm", ".config", 
      "project.zip", ".local", "package-lock.json"
    ];

    function walk(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (ignoreList.includes(file)) continue;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          walk(filePath);
        } else {
          // Extra safety: skip any file over 5MB to avoid GitHub API limits
          if (stat.size > 5 * 1024 * 1024) {
             console.log(`Skipping large file: ${file}`);
             continue;
          }
          filesToUpload.push(path.relative(process.cwd(), filePath));
        }
      }
    }
    walk(process.cwd());

    console.log(`Uploading ${filesToUpload.length} files...`);

    const blobs = await Promise.all(
      filesToUpload.map(async (file) => {
        const content = fs.readFileSync(file, "base64");
        const { data } = await octokit.git.createBlob({
          owner,
          repo,
          content,
          encoding: "base64",
        });
        return {
          path: file,
          mode: "100644" as const,
          type: "blob" as const,
          sha: data.sha,
        };
      })
    );

    const { data: treeData } = await octokit.git.createTree({
      owner,
      repo,
      tree: blobs,
    });

    const { data: commitData } = await octokit.git.createCommit({
      owner,
      repo,
      message: "Final project sync from Replit",
      tree: treeData.sha,
      parents: parentCommitSha ? [parentCommitSha] : [],
    });

    await octokit.git.updateRef({
      owner,
      repo,
      ref: "heads/main",
      sha: commitData.sha,
      force: true,
    });

    console.log("SUCCESS: Pushed to GitHub!");
  } catch (error: any) {
    console.error("FAILED:", error.message);
    process.exit(1);
  }
}
main();
