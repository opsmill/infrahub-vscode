import * as vscode from 'vscode';
import { PythonExtension } from '@vscode/python-extension';
import * as path from 'path';
import * as fs from 'fs';

export interface InfrahubctlCheckResult {
    isAvailable: boolean;
    path?: string;
    errorMessage?: string;
    pythonEnvironment?: string;
}

/**
 * Utility class for checking infrahubctl availability in the current Python environment.
 */
export class InfrahubctlChecker {
    private cachedResult: InfrahubctlCheckResult | null = null;
    private lastCheckTime: number = 0;
    private readonly CACHE_DURATION = 30000; // 30 seconds cache

    /**
     * Checks if infrahubctl is available in the current Python environment.
     * Results are cached for 30 seconds to avoid excessive checks.
     */
    public async checkInfrahubctlAvailability(): Promise<InfrahubctlCheckResult> {
        const now = Date.now();
        if (this.cachedResult && (now - this.lastCheckTime) < this.CACHE_DURATION) {
            return this.cachedResult;
        }

        try {
            const infrahubctlPath = await this.getInfrahubctlPath();
            if (infrahubctlPath && await this.fileExists(infrahubctlPath)) {
                this.cachedResult = {
                    isAvailable: true,
                    path: infrahubctlPath,
                    pythonEnvironment: await this.getPythonEnvironmentInfo()
                };
            } else {
                this.cachedResult = {
                    isAvailable: false,
                    errorMessage: 'infrahubctl not found in Python environment',
                    pythonEnvironment: await this.getPythonEnvironmentInfo()
                };
            }
        } catch (error) {
            this.cachedResult = {
                isAvailable: false,
                errorMessage: `Failed to check infrahubctl: ${error instanceof Error ? error.message : 'Unknown error'}`,
                pythonEnvironment: await this.getPythonEnvironmentInfo()
            };
        }

        this.lastCheckTime = now;
        return this.cachedResult;
    }

    /**
     * Gets the resolved path to infrahubctl in the current Python environment.
     * Returns null if not found or if Python extension is not available.
     */
    public async getInfrahubctlPath(): Promise<string | null> {
        try {
            // Check if custom path is configured
            const config = vscode.workspace.getConfiguration('infrahub-vscode');
            const customPath = config.get<string>('infrahubctlPath');
            if (customPath) {
                return customPath;
            }

            // Get active Python environment and resolve infrahubctl path (same logic as utilities.ts)
            const pythonApi: PythonExtension = await PythonExtension.api();
            const environmentPathObj = pythonApi.environments.getActiveEnvironmentPath();
            const pythonPath = environmentPathObj?.path || environmentPathObj?.id || '';

            if (!pythonPath) {
                return 'infrahubctl'; // Fallback to system PATH
            }

            const infrahubctlPath = path.join(path.dirname(pythonPath), 'infrahubctl');
            return infrahubctlPath;
        } catch (error) {
            console.warn('Failed to resolve infrahubctl path:', error);
            return 'infrahubctl'; // Fallback to system PATH
        }
    }

    /**
     * Gets installation guidance for infrahubctl with environment context.
     */
    public async getInstallationGuidance(): Promise<string> {
        const pythonEnv = await this.getPythonEnvironmentInfo();
        const envInfo = pythonEnv ? `Current Python environment: ${pythonEnv}` : 'Python environment: Not detected';

        return `infrahubctl is required for schema validation and transform operations.

${envInfo}

Installation options:
1. Install via pip: pip install infrahub-sdk
2. Install via poetry: poetry add infrahub-sdk
3. Visit: https://docs.infrahub.app/getting-started/installation for detailed instructions

After installation, restart VS Code to refresh the extension.`;
    }

    /**
     * Invalidates the cached result to force a fresh check.
     */
    public invalidateCache(): void {
        this.cachedResult = null;
        this.lastCheckTime = 0;
    }

    /**
     * Gets information about the current Python environment.
     */
    private async getPythonEnvironmentInfo(): Promise<string | undefined> {
        try {
            const pythonApi: PythonExtension = await PythonExtension.api();
            const environmentPathObj = pythonApi.environments.getActiveEnvironmentPath();
            const pythonPath = environmentPathObj?.path || environmentPathObj?.id;

            if (pythonPath) {
                return path.dirname(pythonPath);
            }
        } catch (error) {
            console.warn('Failed to get Python environment info:', error);
        }
        return undefined;
    }

    /**
     * Checks if a file exists (cross-platform).
     */
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
            return true;
        } catch {
            // Try with .exe extension on Windows
            if (process.platform === 'win32' && !filePath.endsWith('.exe')) {
                try {
                    await fs.promises.access(`${filePath}.exe`, fs.constants.F_OK);
                    return true;
                } catch {
                    return false;
                }
            }
            return false;
        }
    }
}