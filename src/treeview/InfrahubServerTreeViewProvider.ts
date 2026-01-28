import * as vscode from 'vscode';
import { InfrahubClient, InfrahubClientOptions } from 'infrahub-sdk';

// Timeout for API calls in milliseconds
const API_TIMEOUT_MS = 5000;

/**
 * Wraps a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
}

// TODO: Remove this and import from SDK directly
interface BranchResponse {
  id: string;
  name: string;
  description: string;
  origin_branch: string;
  branched_from: string;
  is_default: boolean;
  sync_with_git: boolean;
  has_schema_changes: boolean;
}

interface InfrahubServer {
  address: string;
  api_token?: string;
  name: string;
  tls_insecure?: boolean;
}

export { InfrahubServer };

export class InfrahubServerTreeViewProvider implements vscode.TreeDataProvider<InfrahubServerItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<InfrahubServerItem | undefined | void> = new vscode.EventEmitter<InfrahubServerItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<InfrahubServerItem | undefined | void> = this._onDidChangeTreeData.event;

  private servers: InfrahubServer[] = [];
  private clients: Map<string, InfrahubClient> = new Map();

  constructor(private context: vscode.ExtensionContext) {
    this.refreshServers();
    // Listen for config changes and refresh if servers changed
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('infrahub-vscode.servers')) {
        this.refresh();
      }
    });
  }

  private substituteVariables(value: string): string {
    // Supports ${env:VAR_NAME}
    return value.replace(/\$\{env:([A-Za-z0-9_]+)\}/g, (_, envVar) => {
      return process.env[envVar] || '';
    });
  }

  private refreshServers(): void {
    this.servers = vscode.workspace.getConfiguration().get<InfrahubServer[]>('infrahub-vscode.servers', []);
    this.clients.clear();
    for (const server of this.servers) {
      if (typeof server.api_token === 'string') {
        server.api_token = this.substituteVariables(server.api_token);
      }
      // Create InfrahubClient for each server
      const options: InfrahubClientOptions = {
        address: this.substituteVariables(server.address),
      };
      if (server.api_token) {
        options.token = server.api_token;
      }
      const client = new InfrahubClient(options);
      console.log(`Infrahub: Created client for server: ${server.name} at ${server.address}`);
      this.clients.set(server.name, new InfrahubClient(options));
    }
  }

  refresh(): void {
    this.refreshServers();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: InfrahubServerItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: InfrahubServerItem): Promise<InfrahubServerItem[]> {
    // If no element, return servers
    if (!element) {
      if (this.servers.length === 0) {
        return [];
      }

      // Process all servers in parallel with timeouts
      const serverPromises = this.servers.map(async (server) => {
        let apiVersion: string | undefined = undefined;
        let branches: { [key: string]: BranchResponse } = {};
        const client = this.clients.get(server.name);
        let status: "online" | "offline" | "unknown" = "offline";
        let branchArray: BranchResponse[] = [];
        let errorDetail: string | undefined = undefined;

        if (client) {
          // Try to get version (with timeout)
          try {
            apiVersion = await withTimeout(
              client.getVersion(),
              API_TIMEOUT_MS,
              `Timeout after ${API_TIMEOUT_MS}ms`
            );
          } catch (err: any) {
            apiVersion = 'error';
            errorDetail = 'getVersion: ' + (err?.message || String(err));
            console.error(`Infrahub: getVersion failed for server: ${server.name}`, err?.message || err);
          }

          // Try to get branches (with timeout) - only if version succeeded
          if (apiVersion !== 'error') {
            try {
              branches = await withTimeout(
                client.branch.all(),
                API_TIMEOUT_MS,
                `Timeout after ${API_TIMEOUT_MS}ms`
              );
              if (branches && typeof branches === 'object') {
                branchArray = Object.values(branches);
              }
              status = 'online';
            } catch (err: any) {
              status = 'offline';
              errorDetail = (errorDetail ? errorDetail + '; ' : '') + 'branch.all: ' + (err?.message || String(err));
              console.error(`Infrahub: branch.all failed for server: ${server.name}`, err?.message || err);
            }
          }
        }

        return new InfrahubServerItem(
          server.name,
          branchArray.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
          server.address,
          status,
          apiVersion,
          branchArray,
          errorDetail,
          client
        );
      });

      return Promise.all(serverPromises);
    }
    // If element is a server, return its branches
    if (element instanceof InfrahubServerItem && Array.isArray(element.branches)) {
      // Map BranchResponse to Branch TreeItem, pass client
      return element.branches.map(branch => new Branch(branch, element.client));
    }
    return [];
  }
}

class InfrahubServerItem extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly url: string,
    public readonly status: "online" | "offline" | "unknown" = "unknown",
    public readonly apiVersion?: string,
    public readonly branches?: BranchResponse[],
    public readonly errorDetail?: string,
    public client?: InfrahubClient
  ) {
    super(name, collapsibleState);
    // Set contextValue based on status so menus can show/hide buttons accordingly
    this.contextValue = status === 'online' ? 'infrahubServer:online' : 'infrahubServer:offline';
    // Tooltip includes error detail if offline
    if (status === 'online') {
      this.tooltip = `${this.url} - Status: online` + (this.apiVersion ? ` (v${this.apiVersion})` : '');
      this.description = `${this.url}${this.apiVersion ? ` (v${this.apiVersion})` : ''}`;
      this.iconPath = new vscode.ThemeIcon(
        'circle-large-filled',
        new vscode.ThemeColor('debugIcon.startForeground'),
      );
    } else if (status === 'offline') {
      this.tooltip = `${this.url} - Status: offline${errorDetail ? `\nError: ${errorDetail}` : ''}`;
      this.description = `${this.url} (offline)`;
      this.iconPath = new vscode.ThemeIcon(
        'circle-large-filled',
        new vscode.ThemeColor('debugIcon.stopForeground'),
      );
    } else {
      this.tooltip = `${this.url} - Status: unknown`;
      this.description = this.url;
      this.iconPath = new vscode.ThemeIcon('circle-large-filled');
    }
  }
}

// TreeItem for a single Branch
class Branch extends InfrahubServerItem {
  public readonly defaultBranch: boolean;
  public readonly id: string;
  public readonly syncWithGit: boolean;

  constructor(branch: BranchResponse, client?: InfrahubClient) {
    super(
      branch.name,
      vscode.TreeItemCollapsibleState.None,
      '', // No URL for branch
      'online',
      undefined,
      undefined,
      undefined,
      client
    );
    this.id = branch.id;
    this.syncWithGit = !!branch.sync_with_git;
    this.defaultBranch = (branch.name.toLowerCase() === 'main');
    this.tooltip = `Infrahub Branch: ${branch.name}`;
    this.description = this.syncWithGit ? "synced" : "local";
    if (this.defaultBranch) {
      this.description += " (default)";
    }
    if (this.defaultBranch) {
      this.iconPath = new vscode.ThemeIcon('star-full', new vscode.ThemeColor('toolbar.activeBackground'));
    } else if (this.syncWithGit) {
      this.iconPath = new vscode.ThemeIcon('git-branch');
    } else {
      this.iconPath = new vscode.ThemeIcon('folder-opened');
    }
    this.contextValue = `infrahubBranch:${this.defaultBranch ? 'default' : (this.syncWithGit ? 'synced' : 'local')}`;
  }
}
