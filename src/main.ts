import * as core from '@actions/core';
import * as github from '@actions/github';
import * as Octokit from '@octokit/rest';
import Axios, * as axios from 'axios';

type Issue = Octokit.IssuesListForRepoResponseItem;

type Args = {
  repoToken: string;
  webhook: string;
  daysBeforeStale: number;
};

async function run() {
  try {
    const args = getAndValidateArgs();

    const client = new github.GitHub(args.repoToken);
    await processIssues(client, args);
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

async function processIssues(
  client: github.GitHub,
  args: Args,
  page: number = 1
) {
  const issues = await client.issues.listForRepo({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    state: 'open',
    per_page: 100,
    page: page
  });


  if (issues.data.length === 0) {
    return;
  }

  for (var issue of issues.data.values()) {
    core.debug(`found issue: ${issue.title} last updated ${issue.updated_at}`);
    let isPr = !!issue.pull_request;

    if (wasLastUpdatedBefore(issue, args.daysBeforeStale)) {
      sendTeams(issue, args.webhook);
    }
  }

  return await processIssues(client, args, page + 1);
}

async function sendTeams(issue: Issue, webhook: string) {
  const text = `Stale issue/pr found: ${issue.url}`;
  const body = {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    "summary": "Stale Github Notification",
    "themeColor": "#FFDD00",
    "sections": [
      {
        "activityTitle": "Github",
        "activitySubtitle": "Stale Issues",
        "activityImage": "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
        "text": text
      }
    ]
  }
  await Axios.post(webhook, body);
}

function wasLastUpdatedBefore(issue: Issue, num_days: number): boolean {
  return true;
  // const daysInMillis = 1000 * 60 * 60 * 24 * num_days;
  // const millisSinceLastUpdated =
  //   new Date().getTime() - new Date(issue.updated_at).getTime();
  // return millisSinceLastUpdated >= daysInMillis;
}


function getAndValidateArgs(): Args {
  const args = {
    repoToken: core.getInput('repo-token', { required: true }),
    webhook: core.getInput('webhook', { required: true }),
    daysBeforeStale: parseInt(
      core.getInput('days-before-stale', { required: true })
    )
  };

  for (var numberInput of [
    'days-before-stale'
  ]) {
    if (isNaN(parseInt(core.getInput(numberInput)))) {
      throw Error(`input ${numberInput} did not parse to a valid integer`);
    }
  }

  return args;
}

run();
