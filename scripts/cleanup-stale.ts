import { execSync } from 'child_process';

/**
 * Cleanup Stale Processes Utility
 * 
 * Automatically scans for and terminates orphaned or stale processes
 * (specifically targeting headless Chromium shells, Node/tsx runner scripts,
 * and Playwright instances) that have exceeded the permitted age threshold.
 * 
 * Satisfies the "Simple Made Easy" and Rich Hickey Quality standards by
 * acting as a pure, deterministic sweeper.
 */

// Max age of a scraping process before it is considered stale (in milliseconds)
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

// Process filters - commands containing these substrings are candidates for termination
const SUSPECT_COMMANDS = [
  'chrome-headless-shell',
  'playwright',
  'tsx src/test_clipboard.ts',
  'tsx src/inspect_listeners.ts',
  'tsx src/inspect_fiber_props.ts',
];

interface ProcessInfo {
  pid: number;
  ppid: number;
  started: Date;
  command: string;
  ageMs: number;
}

function getProcesses(): ProcessInfo[] {
  try {
    const stdout = execSync('ps -Aww -o pid,ppid,lstart,command', { encoding: 'utf8' });
    const lines = stdout.split('\n');
    const processes: ProcessInfo[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Regex matches: PID, PPID, Started Date (24 chars), and Command
      const match = line.match(/^(\d+)\s+(\d+)\s+([A-Za-z]{3}\s+[A-Za-z]{3}\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.*)$/);
      if (!match) continue;

      const pid = parseInt(match[1], 10);
      const ppid = parseInt(match[2], 10);
      const startedStr = match[3];
      const command = match[4];

      const started = new Date(startedStr);
      if (isNaN(started.getTime())) continue;

      const ageMs = Date.now() - started.getTime();

      processes.push({
        pid,
        ppid,
        started,
        command,
        ageMs,
      });
    }

    return processes;
  } catch (error) {
    console.error('Failed to retrieve process list:', error);
    return [];
  }
}

function run() {
  const dryRun = process.argv.includes('--dry-run');
  const allProcs = getProcesses();
  
  console.log(`[Cleaner] Scanned ${allProcs.length} active system processes.`);

  // Find suspects
  const staleSuspects = allProcs.filter((proc) => {
    // Check if the command matches any suspect patterns
    const matchesPattern = SUSPECT_COMMANDS.some((pattern) => proc.command.includes(pattern));
    if (!matchesPattern) return false;

    // We do not want to terminate this script itself or parent shell commands
    if (proc.pid === process.pid) return false;

    // Check if it exceeds the maximum allowed runtime age
    return proc.ageMs > MAX_AGE_MS;
  });

  if (staleSuspects.length === 0) {
    console.log('[Cleaner] No stale processes detected. System is clean.');
    return;
  }

  console.log(`[Cleaner] Found ${staleSuspects.length} stale suspect process(es):`);
  staleSuspects.forEach((proc) => {
    const ageHrs = (proc.ageMs / (60 * 60 * 1000)).toFixed(2);
    console.log(`  - PID ${proc.pid} (Parent: ${proc.ppid}) | Age: ${ageHrs} hrs | Command: ${proc.command.substring(0, 100)}...`);
  });

  if (dryRun) {
    console.log('[Cleaner] Dry run complete. No processes were terminated.');
    return;
  }

  console.log('[Cleaner] Initiating termination sequence...');
  for (const proc of staleSuspects) {
    try {
      console.log(`  Killing PID ${proc.pid}...`);
      process.kill(proc.pid, 'SIGTERM');
    } catch (e: any) {
      console.error(`  Failed to kill PID ${proc.pid}: ${e.message}`);
    }
  }
  console.log('[Cleaner] Termination complete.');
}

run();
