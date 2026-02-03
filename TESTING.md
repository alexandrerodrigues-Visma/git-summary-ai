# Testing Guide

This document describes the testing infrastructure and practices for git-summary-ai.

## Test Structure

Tests are located in the `tests/` directory at the root of the project, separate from the source code for better organization.

```
tests/
├── config-schema.test.ts    # Configuration validation tests
├── git-service.test.ts      # Git operations tests (mocked)
└── summary-prompt.test.ts   # Prompt template generation tests
```

## Running Tests

```bash
# Run tests in watch mode (for development)
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Framework

We use [Vitest](https://vitest.dev/) - a fast, modern test framework with:
- Native ESM support
- TypeScript support out of the box
- Compatible with Jest API
- Fast execution with smart watch mode
- Built-in code coverage

## Test Coverage

Current coverage: ~31% overall

| Module | Coverage | Status |
|--------|----------|--------|
| Config Schema | 100% | ✅ Complete |
| Git Service | 34% | ⚠️ Partial |
| Prompts | 30% | ⚠️ Partial |
| Security Scanner | 4% | ❌ Needs work |

## Writing Tests

### Basic Structure

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('FeatureName', () => {
  it('should do something specific', () => {
    const result = doSomething();
    expect(result).toBe(expected);
  });
});
```

### Mocking Dependencies

```typescript
import { vi } from 'vitest';

// Mock a module
vi.mock('simple-git');

// Mock a function
const mockFn = vi.fn().mockResolvedValue('result');
```

### Async Tests

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

## CI Integration

Tests are automatically run as part of the build validation:

```bash
npm run validate  # Runs: typecheck → lint → test → build
```

This ensures:
- All tests pass before building
- No TypeScript errors
- No linting issues
- Code quality is maintained

## Test Files

### config-schema.test.ts (8 tests)
Tests for Zod schema validation:
- Valid config parsing
- Default values
- Provider validation
- Model configurations
- Error handling for invalid inputs

### git-service.test.ts (20 tests)
Tests for Git operations:
- Repository detection
- Branch information retrieval
- Diff operations
- Commit and push operations
- Remote URL parsing
- GitHub repository info extraction

### summary-prompt.test.ts (9 tests)
Tests for AI prompt generation:
- Default template rendering
- Custom template support
- Custom instructions injection
- Placeholder replacement
- Edge cases (empty diff, large diff)

## Best Practices

1. **Test file naming**: Use `*.test.ts` or `*.spec.ts` suffix
2. **One describe per module**: Group related tests
3. **Descriptive test names**: Use "should..." pattern
4. **Arrange-Act-Assert**: Structure tests clearly
5. **Mock external dependencies**: Keep tests isolated and fast
6. **Test edge cases**: Empty inputs, large inputs, errors

## Adding New Tests

1. Create test file in `tests/` directory
2. Follow naming convention: `feature-name.test.ts`
3. Import test utilities from Vitest
4. Write descriptive test cases
5. Run tests locally before committing
6. Ensure coverage doesn't decrease

## Future Improvements

- [ ] Add integration tests for AI service providers
- [ ] Add tests for CLI commands (using test fixtures)
- [ ] Increase coverage for credential management
- [ ] Add E2E tests for the full workflow
- [ ] Add tests for GitHub API interactions
- [ ] Add snapshot testing for prompt outputs
- [ ] Add performance benchmarks

## Troubleshooting

### Tests not running
```bash
# Clear Vitest cache
npx vitest --clearCache

# Reinstall dependencies
npm ci
```

### Coverage not generating
```bash
# Ensure coverage provider is installed
npm install -D @vitest/coverage-v8
```

### Import errors
Check that:
- Imports use `.js` extension (ESM requirement)
- Paths are correct relative to test location
- TypeScript configuration includes test files

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vitest API Reference](https://vitest.dev/api/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
