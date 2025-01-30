import { exec } from 'child_process';
import sudo from 'sudo-prompt';

export class FirewallManager {
  private static isAdmin(): Promise<boolean> {
    return new Promise((resolve) => {
      exec('net session', (error) => {
        resolve(!error);
      });
    });
  }

  private static async execWithAdminRights(commands: string[]): Promise<void> {
    const hasAdmin = await this.isAdmin();
    
    if (!hasAdmin) {
      return new Promise((resolve, reject) => {
        sudo.exec(commands.join(' && '), {
          name: 'EduInsight'
        }, (error) => {
          if (error) {
            reject(new Error('Admin privileges required. Please run as administrator.'));
          } else {
            resolve();
          }
        });
      });
    }

    // Already has admin rights
    return new Promise((resolve, reject) => {
      exec(commands.join(' && '), (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  private static createBlockRule(url: string): Promise<void> {
    const commands = [
      `netsh advfirewall firewall add rule name="Block ${url}" dir=out action=block remotehost=${url}`,
      `netsh advfirewall firewall add rule name="Block ${url}" dir=in action=block remotehost=${url}`
    ];
    return this.execWithAdminRights(commands);
  }

  static async blockUrls(urls: string[]): Promise<void> {
    try {
      await Promise.all(urls.map(url => this.createBlockRule(url)));
    } catch (error) {
      console.error('Failed to block URLs:', error);
      throw new Error(`Admin privileges required. ${error.message}`);
    }
  }

  static getBlockedUrls(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      exec('netsh advfirewall firewall show rule name=all', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        const rules = stdout.split('\n');
        const blockedUrls = rules
          .filter(rule => rule.includes('Block '))
          .map(rule => {
            const match = rule.match(/Block (.*?)"/);
            return match ? match[1] : null;
          })
          .filter((url): url is string => url !== null);

        resolve([...new Set(blockedUrls)]); // Remove duplicates
      });
    });
  }

  private static unblockUrl(url: string): Promise<void> {
    const commands = [
      `netsh advfirewall firewall delete rule name="Block ${url}"`
    ];
    return this.execWithAdminRights(commands);
  }

  static async unblockUrls(urls: string[]): Promise<void> {
    try {
      await Promise.all(urls.map(url => this.unblockUrl(url)));
    } catch (error) {
      console.error('Failed to unblock URLs:', error);
      throw new Error(`Admin privileges required. ${error.message}`);
    }
  }

  static async limitWebAccess(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        // Block all outbound HTTP/HTTPS traffic except whitelisted sites
        const commands = [
          // Remove existing web limit rules if any
          'netsh advfirewall firewall delete rule name="Block Web Access"',
          // Add new block rule for HTTP/HTTPS
          'netsh advfirewall firewall add rule name="Block Web Access" dir=out action=block protocol=TCP remoteport=80,443 enable=yes',
          // Allow access to educational sites (example)
          'netsh advfirewall firewall add rule name="Allow Google" dir=out action=allow protocol=TCP remoteport=80,443 remoteip=172.217.0.0/16',
          'netsh advfirewall firewall add rule name="Allow Educational Sites" dir=out action=allow protocol=TCP remoteport=80,443 remoteip=52.223.0.0/16'
        ];
        await this.execWithAdminRights(commands);
      } else {
        // Remove web limiting rules
        const commands = [
          'netsh advfirewall firewall delete rule name="Block Web Access"',
          'netsh advfirewall firewall delete rule name="Allow Google"',
          'netsh advfirewall firewall delete rule name="Allow Educational Sites"'
        ];
        await this.execWithAdminRights(commands);
      }
    } catch (error) {
      console.error('Failed to configure web limiting:', error);
      throw new Error(`Failed to ${enabled ? 'enable' : 'disable'} web limiting. ${error.message}`);
    }
  }

  static async isWebLimited(): Promise<boolean> {
    return new Promise((resolve) => {
      exec('netsh advfirewall firewall show rule name="Block Web Access"', (error) => {
        resolve(!error); // Rule exists = web is limited
      });
    });
  }
}
