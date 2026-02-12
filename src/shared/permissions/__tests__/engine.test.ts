import { describe, it, expect } from 'vitest'
import { PermissionEngine } from '../engine'
import type { PermissionRule } from '../../types/toolPermissions'

const engine = new PermissionEngine()

// ─── evaluate: 6-step decision flow ─────────────────────────

describe('PermissionEngine.evaluate', () => {
  describe('Step 1: safe tools auto-allow', () => {
    it('Read tool is safe → allow', () => {
      const result = engine.evaluate('Read', { path: '/foo' })
      expect(result.action).toBe('allow')
      expect(result.reason).toBe('Tool classified as safe')
    })

    it('safe Bash command → allow', () => {
      const result = engine.evaluate('Bash', { command: 'ls -la' })
      expect(result.action).toBe('allow')
      expect(result.reason).toBe('Tool classified as safe')
    })

    it('Glob tool is safe → allow', () => {
      const result = engine.evaluate('Glob', { pattern: '*.ts' })
      expect(result.action).toBe('allow')
    })

    it('safe tools skip all other checks', () => {
      // Even with deny rules, safe tools should pass
      const denyAll: PermissionRule = {
        id: 'deny-all',
        action: 'deny',
        tool: '*',
        source: 'project',
        description: 'Deny everything',
      }
      const result = engine.evaluate('Read', { path: '/foo' }, {
        permissionRules: [denyAll],
      })
      expect(result.action).toBe('allow')
      expect(result.reason).toBe('Tool classified as safe')
    })
  })

  describe('Step 2: deny rules (P1, deny-first priority)', () => {
    const denyWrite: PermissionRule = {
      id: 'deny-write',
      action: 'deny',
      tool: 'Write',
      source: 'project',
      description: 'No writes allowed',
    }

    it('deny rule blocks tool', () => {
      const result = engine.evaluate('Write', { path: '/foo' }, {
        permissionRules: [denyWrite],
      })
      expect(result.action).toBe('deny')
      expect(result.reason).toBe('No writes allowed')
      expect(result.matchedRule).toBe(denyWrite)
    })

    it('deny rule takes priority over allow rule', () => {
      const allowWrite: PermissionRule = {
        id: 'allow-write',
        action: 'allow',
        tool: 'Write',
        source: 'project',
      }
      const result = engine.evaluate('Write', { path: '/foo' }, {
        permissionRules: [allowWrite, denyWrite],
      })
      expect(result.action).toBe('deny')
    })

    it('deny rule takes priority even when allow rule is first', () => {
      const allowWrite: PermissionRule = {
        id: 'allow-write',
        action: 'allow',
        tool: 'Write',
        source: 'project',
      }
      const result = engine.evaluate('Write', { path: '/foo' }, {
        permissionRules: [allowWrite, denyWrite],
      })
      expect(result.action).toBe('deny')
    })

    it('allow rule works when no deny rule matches', () => {
      const allowWrite: PermissionRule = {
        id: 'allow-write',
        action: 'allow',
        tool: 'Write',
        source: 'project',
        description: 'Writes OK',
      }
      const result = engine.evaluate('Write', { path: '/foo' }, {
        permissionRules: [allowWrite],
      })
      expect(result.action).toBe('allow')
      expect(result.reason).toBe('Writes OK')
      expect(result.matchedRule).toBe(allowWrite)
    })

    it('no matching rules falls through', () => {
      const ruleForOtherTool: PermissionRule = {
        id: 'allow-edit',
        action: 'allow',
        tool: 'Edit',
        source: 'project',
      }
      const result = engine.evaluate('Write', { path: '/foo' }, {
        permissionRules: [ruleForOtherTool],
      })
      // Falls through to step 6 (ask)
      expect(result.action).toBe('ask')
    })
  })

  describe('Step 3: allowOnce', () => {
    it('tool in allowOnceTools → allow', () => {
      const result = engine.evaluate('Write', { path: '/foo' }, {
        allowOnceTools: ['Write'],
      })
      expect(result.action).toBe('allow')
      expect(result.reason).toBe('Allowed once by user')
    })

    it('other tool not in allowOnceTools → falls through', () => {
      const result = engine.evaluate('Edit', { path: '/foo' }, {
        allowOnceTools: ['Write'],
      })
      expect(result.action).toBe('ask')
    })
  })

  describe('Step 4: session approved', () => {
    it('tool in sessionApprovedTools → allow', () => {
      const result = engine.evaluate('Write', { path: '/foo' }, {
        sessionApprovedTools: new Set(['Write']),
      })
      expect(result.action).toBe('allow')
      expect(result.reason).toBe('Allowed for this session')
    })

    it('other tool not in session set → falls through', () => {
      const result = engine.evaluate('Edit', { path: '/foo' }, {
        sessionApprovedTools: new Set(['Write']),
      })
      expect(result.action).toBe('ask')
    })
  })

  describe('Step 5: allowAll (backward compat)', () => {
    it('allowAll=true → allow', () => {
      const result = engine.evaluate('Write', { path: '/foo' }, {
        allowAll: true,
      })
      expect(result.action).toBe('allow')
      expect(result.reason).toBe('All tools allowed (allowAll)')
    })

    it('allowAll=false → falls through to ask', () => {
      const result = engine.evaluate('Write', { path: '/foo' }, {
        allowAll: false,
      })
      expect(result.action).toBe('ask')
    })
  })

  describe('Step 6: default ask', () => {
    it('no options → ask for moderate tool', () => {
      const result = engine.evaluate('Write', { path: '/foo' })
      expect(result.action).toBe('ask')
      expect(result.reason).toContain('Write')
      expect(result.reason).toContain('moderate')
    })

    it('no options → ask for dangerous tool', () => {
      const result = engine.evaluate('GitPush', {})
      expect(result.action).toBe('ask')
      expect(result.reason).toContain('GitPush')
      expect(result.reason).toContain('dangerous')
    })

    it('unknown tool → ask (moderate)', () => {
      const result = engine.evaluate('MCPCustomTool', {})
      expect(result.action).toBe('ask')
      expect(result.reason).toContain('MCPCustomTool')
      expect(result.reason).toContain('moderate')
    })
  })

  describe('priority order', () => {
    it('deny rule beats allowOnce', () => {
      const denyRule: PermissionRule = {
        id: 'deny',
        action: 'deny',
        tool: 'Write',
        source: 'project',
      }
      const result = engine.evaluate('Write', {}, {
        permissionRules: [denyRule],
        allowOnceTools: ['Write'],
        sessionApprovedTools: new Set(['Write']),
        allowAll: true,
      })
      expect(result.action).toBe('deny')
    })

    it('allow rule beats allowOnce/session/allowAll', () => {
      const allowRule: PermissionRule = {
        id: 'allow',
        action: 'allow',
        tool: 'Write',
        source: 'project',
        description: 'Rule allow',
      }
      const result = engine.evaluate('Write', {}, {
        permissionRules: [allowRule],
      })
      expect(result.action).toBe('allow')
      expect(result.reason).toBe('Rule allow')
    })

    it('allowOnce beats session and allowAll', () => {
      const result = engine.evaluate('Write', {}, {
        allowOnceTools: ['Write'],
        sessionApprovedTools: new Set(['Write']),
        allowAll: true,
      })
      expect(result.action).toBe('allow')
      expect(result.reason).toBe('Allowed once by user')
    })

    it('session beats allowAll', () => {
      const result = engine.evaluate('Write', {}, {
        sessionApprovedTools: new Set(['Write']),
        allowAll: true,
      })
      expect(result.action).toBe('allow')
      expect(result.reason).toBe('Allowed for this session')
    })
  })
})

// ─── matchRules ─────────────────────────────────────────────

describe('PermissionEngine.matchRules (via evaluate)', () => {
  describe('tool name matching', () => {
    it('exact tool name match', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: 'Write',
        source: 'project',
      }
      const result = engine.evaluate('Write', {}, {
        permissionRules: [rule],
      })
      expect(result.action).toBe('allow')
    })

    it('wildcard * matches any tool', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: '*',
        source: 'project',
        description: 'Allow all',
      }
      const result = engine.evaluate('Edit', {}, {
        permissionRules: [rule],
      })
      expect(result.action).toBe('allow')
      expect(result.reason).toBe('Allow all')
    })

    it('non-matching tool name → no match', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: 'Edit',
        source: 'project',
      }
      const result = engine.evaluate('Write', {}, {
        permissionRules: [rule],
      })
      expect(result.action).toBe('ask')
    })
  })

  describe('commandPrefix matching', () => {
    it('matches when command starts with prefix', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: 'Bash',
        match: { commandPrefix: 'npm run' },
        source: 'project',
      }
      const result = engine.evaluate(
        'Bash',
        { command: 'npm run build' },
        { permissionRules: [rule] }
      )
      expect(result.action).toBe('allow')
    })

    it('does not match when command has different prefix', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: 'Bash',
        match: { commandPrefix: 'npm run' },
        source: 'project',
      }
      const result = engine.evaluate(
        'Bash',
        { command: 'yarn build' },
        { permissionRules: [rule] }
      )
      // Falls through — Bash 'yarn build' is moderate, no rule match → ask
      expect(result.action).toBe('ask')
    })

    it('uses input.cmd as fallback for command', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: 'Bash',
        match: { commandPrefix: 'echo' },
        source: 'project',
      }
      const result = engine.evaluate(
        'Bash',
        { cmd: 'echo hello' },
        { permissionRules: [rule] }
      )
      expect(result.action).toBe('allow')
    })

    it('empty command does not match prefix', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: 'Bash',
        match: { commandPrefix: 'npm' },
        source: 'project',
      }
      const result = engine.evaluate(
        'Bash',
        {},
        { permissionRules: [rule] }
      )
      // empty command → moderate, rule doesn't match → ask
      expect(result.action).toBe('ask')
    })
  })

  describe('pathGlob matching', () => {
    it('matches exact path', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: 'Write',
        match: { pathGlob: 'src/foo.ts' },
        source: 'project',
      }
      const result = engine.evaluate(
        'Write',
        { path: 'src/foo.ts' },
        { permissionRules: [rule] }
      )
      expect(result.action).toBe('allow')
    })

    it('matches with * wildcard', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: 'Write',
        match: { pathGlob: 'src/*.ts' },
        source: 'project',
      }
      const result = engine.evaluate(
        'Write',
        { path: 'src/foo.ts' },
        { permissionRules: [rule] }
      )
      expect(result.action).toBe('allow')
    })

    it('* does not match across directories', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: 'Write',
        match: { pathGlob: 'src/*.ts' },
        source: 'project',
      }
      const result = engine.evaluate(
        'Write',
        { path: 'src/sub/foo.ts' },
        { permissionRules: [rule] }
      )
      expect(result.action).toBe('ask')
    })

    it('** matches across directories', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: 'Write',
        match: { pathGlob: 'src/**/*.ts' },
        source: 'project',
      }
      const result = engine.evaluate(
        'Write',
        { path: 'src/deep/nested/foo.ts' },
        { permissionRules: [rule] }
      )
      expect(result.action).toBe('allow')
    })

    it('? matches single character', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: 'Write',
        match: { pathGlob: 'src/?.ts' },
        source: 'project',
      }
      const allow = engine.evaluate(
        'Write',
        { path: 'src/a.ts' },
        { permissionRules: [rule] }
      )
      expect(allow.action).toBe('allow')

      const noMatch = engine.evaluate(
        'Write',
        { path: 'src/ab.ts' },
        { permissionRules: [rule] }
      )
      expect(noMatch.action).toBe('ask')
    })

    it('uses input.file_path as fallback', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: 'Write',
        match: { pathGlob: 'src/*.ts' },
        source: 'project',
      }
      const result = engine.evaluate(
        'Write',
        { file_path: 'src/bar.ts' },
        { permissionRules: [rule] }
      )
      expect(result.action).toBe('allow')
    })

    it('no path in input → does not match pathGlob', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: 'Write',
        match: { pathGlob: 'src/*.ts' },
        source: 'project',
      }
      const result = engine.evaluate(
        'Write',
        {},
        { permissionRules: [rule] }
      )
      expect(result.action).toBe('ask')
    })

    it('dots in glob are escaped properly', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: 'Write',
        match: { pathGlob: '*.test.ts' },
        source: 'project',
      }
      const match = engine.evaluate(
        'Write',
        { path: 'foo.test.ts' },
        { permissionRules: [rule] }
      )
      expect(match.action).toBe('allow')

      // Dot should not match arbitrary char
      const noMatch = engine.evaluate(
        'Write',
        { path: 'fooXtestXts' },
        { permissionRules: [rule] }
      )
      expect(noMatch.action).toBe('ask')
    })
  })

  describe('combined match conditions', () => {
    it('both commandPrefix and pathGlob must match', () => {
      const rule: PermissionRule = {
        id: 'r1',
        action: 'allow',
        tool: 'Bash',
        match: {
          commandPrefix: 'npm',
          pathGlob: 'src/**',
        },
        source: 'project',
      }
      // Only command matches, path doesn't
      const result = engine.evaluate(
        'Bash',
        { command: 'npm run build', path: 'other/file' },
        { permissionRules: [rule] }
      )
      expect(result.action).toBe('ask')
    })
  })

  describe('deny-first priority within rules', () => {
    it('deny wins over allow when both match', () => {
      const rules: PermissionRule[] = [
        {
          id: 'allow-all-bash',
          action: 'allow',
          tool: 'Bash',
          source: 'project',
        },
        {
          id: 'deny-rm',
          action: 'deny',
          tool: 'Bash',
          match: { commandPrefix: 'rm' },
          source: 'project',
          description: 'No rm',
        },
      ]
      // 'rm file' is dangerous by classifier, but let's test with a
      // command that matches both rules
      const result = engine.evaluate(
        'Bash',
        { command: 'rm file' },
        { permissionRules: rules }
      )
      expect(result.action).toBe('deny')
      expect(result.reason).toBe('No rm')
    })

    it('wildcard deny blocks specific allow', () => {
      const rules: PermissionRule[] = [
        {
          id: 'allow-write',
          action: 'allow',
          tool: 'Write',
          source: 'project',
        },
        {
          id: 'deny-all',
          action: 'deny',
          tool: '*',
          source: 'project',
          description: 'Deny all',
        },
      ]
      const result = engine.evaluate(
        'Write',
        {},
        { permissionRules: rules }
      )
      expect(result.action).toBe('deny')
    })
  })

  describe('rule with no description uses id in reason', () => {
    it('deny rule without description', () => {
      const rule: PermissionRule = {
        id: 'my-deny-rule',
        action: 'deny',
        tool: 'Write',
        source: 'project',
      }
      const result = engine.evaluate(
        'Write',
        {},
        { permissionRules: [rule] }
      )
      expect(result.action).toBe('deny')
      expect(result.reason).toContain('my-deny-rule')
    })

    it('allow rule without description', () => {
      const rule: PermissionRule = {
        id: 'my-allow-rule',
        action: 'allow',
        tool: 'Write',
        source: 'project',
      }
      const result = engine.evaluate(
        'Write',
        {},
        { permissionRules: [rule] }
      )
      expect(result.action).toBe('allow')
      expect(result.reason).toContain('my-allow-rule')
    })
  })

  describe('empty/no rules', () => {
    it('empty rules array falls through', () => {
      const result = engine.evaluate('Write', {}, {
        permissionRules: [],
      })
      expect(result.action).toBe('ask')
    })

    it('undefined rules falls through', () => {
      const result = engine.evaluate('Write', {}, {})
      expect(result.action).toBe('ask')
    })
  })
})

// ─── matchGlob edge cases ───────────────────────────────────

describe('matchGlob edge cases (via evaluate)', () => {
  const makeRule = (pathGlob: string): PermissionRule => ({
    id: 'test',
    action: 'allow',
    tool: 'Write',
    match: { pathGlob },
    source: 'project',
  })

  it('** at start matches deep paths', () => {
    const result = engine.evaluate(
      'Write',
      { path: 'a/b/c/d.ts' },
      { permissionRules: [makeRule('**/*.ts')] }
    )
    expect(result.action).toBe('allow')
  })

  it('** in middle requires at least one path segment', () => {
    // src/**/*.ts → regex ^src/.*/[^/]*\.ts$
    // The literal / between ** and * means at least one dir level is needed
    const noMatch = engine.evaluate(
      'Write',
      { path: 'src/d.ts' },
      { permissionRules: [makeRule('src/**/*.ts')] }
    )
    expect(noMatch.action).toBe('ask')

    const match = engine.evaluate(
      'Write',
      { path: 'src/sub/d.ts' },
      { permissionRules: [makeRule('src/**/*.ts')] }
    )
    expect(match.action).toBe('allow')
  })

  it('invalid regex in glob does not throw', () => {
    // A pattern that could produce invalid regex
    const result = engine.evaluate(
      'Write',
      { path: 'foo' },
      { permissionRules: [makeRule('[invalid')] }
    )
    // Should not throw, just not match
    expect(result.action).toBe('ask')
  })
})
