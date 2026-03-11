export interface GitHubUser {
  login: string;
}

export interface GitHubInstallation {
  id: number;
}

export interface GitHubRepositoryOwner {
  login: string;
}

export interface GitHubRepository {
  full_name: string;
  name: string;
  owner: GitHubRepositoryOwner;
}

export interface GitHubPullRequestHead {
  sha: string;
}

export interface GitHubPullRequest {
  html_url: string;
  title: string;
  body: string | null;
  draft: boolean;
  head: GitHubPullRequestHead;
  user: GitHubUser;
}

export interface GitHubPullRequestFile {
  filename: string;
  status: string;
  patch?: string;
  additions?: number;
  deletions?: number;
  changes?: number;
}

export interface PullRequestWebhookPayload {
  action: string;
  number: number;
  installation?: GitHubInstallation;
  repository: GitHubRepository;
  pull_request: GitHubPullRequest;
  sender?: GitHubUser;
}
