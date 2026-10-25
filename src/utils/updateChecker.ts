// Software Update Checker for Dark Flip Timer (TanCreative)
// Queries the official GitHub Releases API with caching and semver comparison

export interface UpdateAsset {
  name: string;
  downloadUrl: string;
  sizeBytes: number;
}

export interface UpdateInfo {
  checkedAt: number;
  currentVersion: string;
  hasUpdate: boolean;
  latestVersion?: string;
  releaseName?: string;
  releaseUrl?: string;
  releaseNotes?: string;
  publishedAt?: string;
  portableAsset?: UpdateAsset;
  installerAsset?: UpdateAsset;
  error?: string;
}

const GITHUB_REPO = 'contacttancrea-cmyk/Dark-flip-timer';
const CACHE_KEY = 'darkFlipTimer_updateCache';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

function cleanSemver(v: string): number[] {
  const cleaned = v.trim().replace(/^v/i, '');
  const parts = cleaned.split('.').map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

export function isNewerVersion(latest: string, current: string): boolean {
  const [lMaj, lMin, lPat] = cleanSemver(latest);
  const [cMaj, cMin, cPat] = cleanSemver(current);

  if (lMaj > cMaj) return true;
  if (lMaj < cMaj) return false;

  if (lMin > cMin) return true;
  if (lMin < cMin) return false;

  return lPat > cPat;
}

export async function checkForAppUpdates(
  currentVersion: string = '1.0.0',
  force: boolean = false
): Promise<UpdateInfo> {
  const now = Date.now();

  // Check cache first if not forced
  if (!force && typeof window !== 'undefined') {
    try {
      const cachedRaw = localStorage.getItem(CACHE_KEY);
      if (cachedRaw) {
        const cached: UpdateInfo = JSON.parse(cachedRaw);
        if (now - cached.checkedAt < CACHE_TTL_MS) {
          return cached;
        }
      }
    } catch {
      // Ignore cache parse errors
    }
  }

  const endpoint = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        // No releases published yet
        const noRelease: UpdateInfo = {
          checkedAt: now,
          currentVersion,
          hasUpdate: false,
        };
        saveCache(noRelease);
        return noRelease;
      }
      throw new Error(`GitHub API HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawTag = (data.tag_name || '').trim();
    const latestVersion = rawTag.replace(/^v/i, '') || currentVersion;
    const hasUpdate = isNewerVersion(latestVersion, currentVersion);

    let portableAsset: UpdateAsset | undefined;
    let installerAsset: UpdateAsset | undefined;

    if (Array.isArray(data.assets)) {
      for (const asset of data.assets) {
        const name = asset.name || '';
        const downloadUrl = asset.browser_download_url || '';
        const sizeBytes = asset.size || 0;

        if (name.toLowerCase().includes('portable') && name.endsWith('.exe')) {
          portableAsset = { name, downloadUrl, sizeBytes };
        } else if (name.toLowerCase().includes('nsis') || (name.endsWith('.exe') && !portableAsset)) {
          installerAsset = { name, downloadUrl, sizeBytes };
        }
      }
    }

    const result: UpdateInfo = {
      checkedAt: now,
      currentVersion,
      hasUpdate,
      latestVersion: rawTag || `v${latestVersion}`,
      releaseName: data.name || `Release ${rawTag}`,
      releaseUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases`,
      releaseNotes: data.body || '',
      publishedAt: data.published_at || '',
      portableAsset,
      installerAsset,
    };

    saveCache(result);
    return result;
  } catch (err) {
    const fallback: UpdateInfo = {
      checkedAt: now,
      currentVersion,
      hasUpdate: false,
      error: err instanceof Error ? err.message : 'Failed to reach GitHub Releases',
    };
    return fallback;
  }
}

function saveCache(info: UpdateInfo) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(info));
  } catch {
    // Ignore storage quota errors
  }
}
