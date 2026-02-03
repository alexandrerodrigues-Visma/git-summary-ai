# Token Tracking Feature Implementation Plan

## 📊 Overview

Track token usage for all AI providers to help users monitor their API consumption. This feature will store usage history and provide insights into token consumption patterns across different providers and models.

**Status**: 🔵 Planned  
**Priority**: Medium  
**Estimated Effort**: 1-2 days  
**Version Target**: 0.3.0

---

## 🎯 Goals

### Primary Goals
- Track input/output tokens for every AI request
- Store usage history locally
- Display token usage summaries
- Export usage data for analysis

### Non-Goals (Simplified Approach)
- ❌ Cost calculations (pricing data changes frequently)
- ❌ Budget limits or spending alerts
- ❌ Currency conversions
- ❌ Real-time cost estimation

**Rationale**: Users can calculate costs themselves using provider pricing pages. Token counts are objective and stable.

---

## 🏗️ Architecture

### Data Flow
```
AI Request → Provider API → Response with Usage → Token Tracker → Storage
                                                       ↓
                                              Display to User
                                                       ↓
                                              Commands (tokens)
```

### Storage
- **Location**: `~/.git-summary-ai/token-usage.json`
- **Format**: JSON append-only log
- **Retention**: Last 10,000 records or 1 year (automatic rotation)
- **Size**: ~1MB per 10,000 records (negligible)

---

## 📋 Implementation Phases

### **Phase 1: Core Infrastructure**

#### 1.1 Update AI Interface
**File**: `src/services/ai/ai.interface.ts`

**Changes:**
```typescript
export interface AISummaryResponse {
  title?: string;
  summary: string;
  commitMessage: string;
  usage?: {              // NEW - Optional for backward compatibility
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}
```

**Why optional?**: 
- Graceful degradation if provider doesn't return usage
- Backward compatibility
- Easier testing

---

#### 1.2 Create Token Tracker Service
**File**: `src/services/token-tracker.service.ts`

**Interface:**
```typescript
interface UsageRecord {
  id: string;                    // UUID for unique identification
  timestamp: Date;               // When the request was made
  provider: Provider;            // 'claude' | 'openai' | 'copilot' | 'gemini'
  model: string;                 // Exact model name used
  inputTokens: number;           // Tokens sent to API
  outputTokens: number;          // Tokens received from API
  totalTokens: number;           // Sum of input + output
  operation: 'summarize' | 'analyze' | 'regenerate';  // Command type
}

interface TokenSummary {
  totalTokens: number;
  totalInput: number;
  totalOutput: number;
  requestCount: number;
  byProvider: Record<Provider, {
    tokens: number;
    requests: number;
    inputTokens: number;
    outputTokens: number;
  }>;
  byModel: Record<string, {
    tokens: number;
    requests: number;
  }>;
  periodStart: Date;
  periodEnd: Date;
}
```

**Methods:**
```typescript
class TokenTracker {
  // Record a new usage event
  async recordUsage(record: Omit<UsageRecord, 'id' | 'timestamp'>): Promise<void>
  
  // Get summary for date range
  async getSummary(startDate?: Date, endDate?: Date): Promise<TokenSummary>
  
  // Get all records (for export)
  async getAllRecords(): Promise<UsageRecord[]>
  
  // Clear old records (maintenance)
  async pruneOldRecords(olderThan: Date): Promise<number>
  
  // Export to JSON
  async exportToJSON(filePath: string): Promise<void>
}
```

**Singleton Pattern:**
```typescript
let instance: TokenTracker | null = null;

export function getTokenTracker(): TokenTracker {
  if (!instance) {
    instance = new TokenTracker();
  }
  return instance;
}
```

---

#### 1.3 Create Usage Storage Service
**File**: `src/services/usage-storage.service.ts`

**Responsibilities:**
- Read/write to `~/.git-summary-ai/token-usage.json`
- Append new records efficiently
- Query by date range
- Handle file corruption gracefully

**Storage Format:**
```json
{
  "version": "1.0",
  "records": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2026-02-03T08:30:15.123Z",
      "provider": "claude",
      "model": "claude-sonnet-4-20250514",
      "inputTokens": 1250,
      "outputTokens": 380,
      "totalTokens": 1630,
      "operation": "summarize"
    },
    {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "timestamp": "2026-02-03T09:15:42.456Z",
      "provider": "openai",
      "model": "gpt-4o",
      "inputTokens": 980,
      "outputTokens": 420,
      "totalTokens": 1400,
      "operation": "regenerate"
    }
  ]
}
```

**Error Handling:**
- Corrupted file → Create new file, backup old
- Missing file → Create with empty records array
- Permission errors → Log error, continue without tracking

---

### **Phase 2: Provider Integration**

#### 2.1 Update Claude Service
**File**: `src/services/ai/claude.service.ts`

**Current Response:**
```typescript
const message = await client.messages.create({ ... });
```

**Extract Usage:**
```typescript
const usage = {
  inputTokens: message.usage.input_tokens,
  outputTokens: message.usage.output_tokens,
  totalTokens: message.usage.input_tokens + message.usage.output_tokens,
};

return {
  ...parseAIResponse(responseText),
  usage,  // Add usage data
};
```

---

#### 2.2 Update OpenAI Service
**File**: `src/services/ai/openai.service.ts`

**Extract Usage:**
```typescript
const usage = response.usage ? {
  inputTokens: response.usage.prompt_tokens,
  outputTokens: response.usage.completion_tokens,
  totalTokens: response.usage.total_tokens,
} : undefined;

return {
  ...parseAIResponse(responseText),
  usage,
};
```

---

#### 2.3 Update Copilot Service
**File**: `src/services/ai/copilot.service.ts`

**Same as OpenAI** (uses OpenAI SDK):
```typescript
const usage = response.usage ? {
  inputTokens: response.usage.prompt_tokens,
  outputTokens: response.usage.completion_tokens,
  totalTokens: response.usage.total_tokens,
} : undefined;
```

---

#### 2.4 Update Gemini Service
**File**: `src/services/ai/gemini.service.ts`

**Extract Usage:**
```typescript
const usage = response.usageMetadata ? {
  inputTokens: response.usageMetadata.promptTokenCount,
  outputTokens: response.usageMetadata.candidatesTokenCount,
  totalTokens: response.usageMetadata.totalTokenCount,
} : undefined;

return {
  ...parseAIResponse(responseText),
  usage,
};
```

---

### **Phase 3: Command Integration**

#### 3.1 Update Summarize Command
**File**: `src/commands/summarize.ts`

**After AI Response:**
```typescript
const result = await aiService.generateSummary(request);

// Track token usage
if (result.usage) {
  const tracker = getTokenTracker();
  await tracker.recordUsage({
    provider: config.provider,
    model: aiService.getModelName(), // Add getModelName() method to AIService
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    totalTokens: result.usage.totalTokens,
    operation: 'summarize',
  });
  
  // Optionally display inline
  if (config.showTokens) {
    logger.detail('Tokens', `${result.usage.totalTokens.toLocaleString()} (↑${result.usage.inputTokens.toLocaleString()} ↓${result.usage.outputTokens.toLocaleString()})`);
  }
}
```

---

#### 3.2 Update Run Command
**File**: `src/commands/run.ts`

**Same pattern** - track tokens after summarize step.

---

#### 3.3 Add getModelName() to AI Services

**All AI service classes need:**
```typescript
getModelName(): string {
  return this.model;
}
```

**Update interface:**
```typescript
export interface AIService {
  generateSummary(request: AISummaryRequest): Promise<AISummaryResponse>;
  getProviderName(): string;
  getModelName(): string;  // NEW
}
```

---

### **Phase 4: Tokens Command**

#### 4.1 Create Tokens Command
**File**: `src/commands/tokens.ts`

**Subcommands:**
```bash
gitai tokens              # Show summary (today + week + month)
gitai tokens today        # Today's usage only
gitai tokens week         # This week
gitai tokens month        # This month
gitai tokens year         # This year
gitai tokens all          # All time
gitai tokens export       # Export to JSON
gitai tokens clear        # Clear history (with confirmation)
```

**Main Command:**
```typescript
export function createTokensCommand(): Command {
  const command = new Command('tokens')
    .description('View token usage statistics')
    .action(async () => {
      await showTokenSummary();
    });

  command
    .command('today')
    .description('Show today\'s token usage')
    .action(async () => {
      await showTokensForPeriod('today');
    });

  command
    .command('week')
    .description('Show this week\'s token usage')
    .action(async () => {
      await showTokensForPeriod('week');
    });

  command
    .command('month')
    .description('Show this month\'s token usage')
    .action(async () => {
      await showTokensForPeriod('month');
    });

  command
    .command('export')
    .description('Export token usage to JSON')
    .argument('[file]', 'Output file path', 'token-usage-export.json')
    .action(async (file: string) => {
      await exportTokenUsage(file);
    });

  command
    .command('clear')
    .description('Clear token usage history')
    .action(async () => {
      await clearTokenHistory();
    });

  return command;
}
```

---

#### 4.2 Example Output

**Summary View (`gitai tokens`):**
```
🔢 Token Usage Summary

Today (Feb 3, 2026):
  Requests: 12
  Tokens:   18,450
    ↑ Input:   12,300 (67%)
    ↓ Output:   6,150 (33%)

This Week:
  Requests: 87
  Tokens:   142,300
    ↑ Input:   94,800 (67%)
    ↓ Output:  47,500 (33%)

This Month:
  Requests: 324
  Tokens:   512,800
    ↑ Input:   341,200 (67%)
    ↓ Output:  171,600 (33%)

By Provider:
  Claude:  312,400 (61%)  ████████████████████
  OpenAI:  142,300 (28%)  █████████
  Gemini:   58,100 (11%)  ████

Top Models:
  1. claude-sonnet-4-20250514    204,300 tokens  (156 requests)
  2. gpt-4o                       98,200 tokens  ( 89 requests)
  3. gemini-1.5-pro               58,100 tokens  ( 79 requests)

💡 Tip: Run 'gitai tokens export' to analyze your usage in detail
```

**Detailed View (`gitai tokens week`):**
```
📊 Token Usage - This Week

Feb 2-8, 2026

Daily Breakdown:
  Mon Feb 2:  23,400 tokens  (18 requests)
  Tue Feb 3:  18,450 tokens  (12 requests)  ← Today
  Wed Feb 4:      0 tokens  ( 0 requests)
  Thu Feb 5:      0 tokens  ( 0 requests)
  Fri Feb 6:      0 tokens  ( 0 requests)
  Sat Feb 7:      0 tokens  ( 0 requests)
  Sun Feb 8:      0 tokens  ( 0 requests)

By Operation:
  Summarize:     38,200 tokens  (26 requests)
  Regenerate:     3,650 tokens  ( 4 requests)

Average per request: 1,395 tokens
```

---

### **Phase 5: Configuration**

#### 5.1 Update Config Schema
**File**: `src/config/schema.ts`

```typescript
export const configSchema = z.object({
  provider: z.enum(['claude', 'openai', 'copilot', 'gemini']).default('claude'),
  model: z.string().optional(),
  models: z.object({
    claude: z.string().optional(),
    openai: z.string().optional(),
    copilot: z.string().optional(),
    gemini: z.string().optional(),
  }).optional(),
  maxTokens: z.number().positive().default(1024),
  targetBranch: z.string().default('main'),
  excludePatterns: z.array(z.string()).default([]),
  commitPrefix: z.string().optional(),
  language: z.string().default('en'),
  promptTemplate: z.string().optional(),
  
  // NEW: Token tracking options
  showTokens: z.boolean().default(false),  // Show tokens after each operation
  tokenTracking: z.object({
    enabled: z.boolean().default(true),    // Enable/disable tracking
    retentionDays: z.number().default(365), // How long to keep history
  }).optional(),
});
```

---

#### 5.2 Update Setup Wizard
**File**: `src/commands/setup.ts`

**Add token tracking preference:**
```typescript
// After provider setup...

const tokenPrefs = await inquirer.prompt([
  {
    type: 'confirm',
    name: 'showTokens',
    message: 'Show token usage after each operation?',
    default: false,
  },
]);

config.showTokens = tokenPrefs.showTokens;
```

---

### **Phase 6: Testing**

#### 6.1 Unit Tests
**File**: `tests/token-tracker.test.ts`

**Test Cases:**
```typescript
describe('TokenTracker', () => {
  describe('recordUsage', () => {
    it('should record usage with all fields');
    it('should generate unique IDs');
    it('should handle missing storage gracefully');
  });

  describe('getSummary', () => {
    it('should calculate correct totals');
    it('should group by provider correctly');
    it('should group by model correctly');
    it('should filter by date range');
    it('should handle empty records');
  });

  describe('exportToJSON', () => {
    it('should export all records');
    it('should create valid JSON');
    it('should handle export errors');
  });

  describe('pruneOldRecords', () => {
    it('should remove old records');
    it('should keep recent records');
    it('should return count of removed records');
  });
});
```

---

#### 6.2 Integration Tests
**File**: `tests/integration/token-tracking.test.ts`

**Test Scenarios:**
- Full workflow: summarize → tokens recorded → query works
- Multiple providers: switch providers, all tracked correctly
- Export functionality: export → verify JSON format
- Clear functionality: clear → verify empty storage

---

#### 6.3 Manual Testing Checklist

```
□ Run gitai summarize → check tokens displayed (if enabled)
□ Run gitai tokens → verify summary shows
□ Run gitai tokens today → verify data
□ Run gitai tokens export → verify JSON file
□ Switch providers → verify all tracked
□ Multiple requests → verify accumulation
□ Clear history → verify cleared
□ Restart tool → verify persistence
```

---

## 📁 Files to Create

1. ✅ `src/services/token-tracker.service.ts` - Main tracking logic (200 lines)
2. ✅ `src/services/usage-storage.service.ts` - Storage layer (150 lines)
3. ✅ `src/commands/tokens.ts` - CLI commands (300 lines)
4. ✅ `tests/token-tracker.test.ts` - Unit tests (200 lines)
5. ✅ `tests/integration/token-tracking.test.ts` - Integration tests (100 lines)

**Total**: ~950 lines of code

---

## 📝 Files to Modify

1. ✅ `src/services/ai/ai.interface.ts` - Add usage field
2. ✅ `src/services/ai/claude.service.ts` - Extract & return usage
3. ✅ `src/services/ai/openai.service.ts` - Extract & return usage
4. ✅ `src/services/ai/copilot.service.ts` - Extract & return usage
5. ✅ `src/services/ai/gemini.service.ts` - Extract & return usage
6. ✅ `src/commands/summarize.ts` - Record usage
7. ✅ `src/commands/run.ts` - Record usage
8. ✅ `src/commands/setup.ts` - Add token preferences
9. ✅ `src/config/schema.ts` - Add showTokens config
10. ✅ `src/index.ts` - Register tokens command

**Total**: 10 files modified

---

## 🚀 Implementation Schedule

### **Day 1: Core Infrastructure**
- [ ] Update AI interface with usage field
- [ ] Update all 4 AI services to return usage
- [ ] Create token-tracker service
- [ ] Create usage-storage service
- [ ] Write unit tests for tracker & storage

**Deliverable**: Token tracking working, not yet integrated

---

### **Day 2: Integration & CLI**
- [ ] Integrate tracking into summarize command
- [ ] Integrate tracking into run command
- [ ] Create tokens command with all subcommands
- [ ] Update config schema
- [ ] Update setup wizard
- [ ] Write integration tests
- [ ] Manual testing

**Deliverable**: Full feature working end-to-end

---

## 📊 Success Metrics

### Functionality
- ✅ All AI requests automatically tracked
- ✅ Token counts accurate (±5% tolerance)
- ✅ Historical data persists across restarts
- ✅ Export produces valid JSON
- ✅ Summary calculations correct

### Performance
- ✅ <10ms overhead per request
- ✅ Storage file <5MB after 10,000 records
- ✅ Query performance <100ms for 10,000 records

### Quality
- ✅ 90%+ test coverage
- ✅ Zero linting errors
- ✅ All tests passing
- ✅ No breaking changes to existing features

---

## 🔄 Future Enhancements (Not in v0.3.0)

### v0.4.0 Potential Features
- 📊 **Visual charts** - ASCII bar charts in terminal
- 📈 **Trend analysis** - Compare week-over-week, month-over-month
- 🎯 **Token budgets** - Set limits, get warnings
- 💰 **Cost estimation** - Optional cost calculations with user-provided pricing
- 📱 **Web dashboard** - Browser-based visualization
- 🔔 **Slack/Teams notifications** - Usage reports to team channels

### v0.5.0 Potential Features
- 🤖 **Auto-optimization** - Suggest cheaper models based on usage
- 📊 **Team analytics** - Aggregate usage across team members
- 🔄 **Cloud sync** - Sync usage across devices
- 📈 **Predictions** - Forecast monthly usage

---

## 🎯 Why This Approach?

### ✅ Advantages
- **Simple**: Just count tokens, no complex calculations
- **Fast**: Minimal performance impact
- **Reliable**: Token counts from providers are accurate
- **Future-proof**: Can add cost calculations later if needed
- **Privacy**: All data stored locally
- **Useful**: Helps users understand API consumption

### ❌ What We're NOT Doing (And Why)
- **Cost calculations**: Pricing changes frequently, adds complexity
- **Real-time budgets**: Token counts are enough for awareness
- **Cloud storage**: Keep it simple, local-first
- **Advanced analytics**: Can be added later based on feedback

---

## 📚 Documentation Updates

### README.md
Add section:
```markdown
## Token Tracking

git-summary-ai tracks your AI token usage to help you monitor API consumption.

View your usage:
```bash
gitai tokens              # Summary view
gitai tokens week         # This week's usage
gitai tokens export       # Export for analysis
```

Enable inline display:
```bash
gitai config set showTokens true
```

Token usage is stored locally in `~/.git-summary-ai/token-usage.json`.
```

### USAGE.md
Add new section with detailed `tokens` command documentation.

### CHANGELOG.md
```markdown
## [0.3.0] - 2026-02-XX

### Added
- **Token Usage Tracking**: Automatic tracking of AI token consumption
  - View usage summaries with `gitai tokens`
  - Track by provider, model, and time period
  - Export usage data to JSON
  - Optional inline token display after operations
  - Local storage in `~/.git-summary-ai/token-usage.json`
```

---

## 🔧 Technical Decisions

### Why JSON Storage?
- **Pros**: Human-readable, easy to debug, portable
- **Cons**: Slower than binary (but not noticeable at our scale)
- **Alternative considered**: SQLite - rejected as overkill for simple append-only log

### Why Local Storage?
- **Pros**: Privacy, no server costs, works offline, fast
- **Cons**: Not synced across devices
- **Decision**: Start local, add cloud sync later if requested

### Why Singleton Pattern?
- **Reason**: Single instance ensures consistent state
- **Alternative**: Dependency injection - adds complexity without benefit

### Why Append-Only Log?
- **Reason**: Simple, reliable, easy to debug
- **Alternative**: Aggregated stats only - rejected because loses granularity

---

## 🐛 Known Limitations

1. **No token estimation for errors**: If AI request fails, no tokens tracked
   - **Impact**: Low - errors are rare
   - **Fix**: Could estimate input tokens, but not worth complexity

2. **Clock skew**: Timestamps depend on system clock
   - **Impact**: Low - only affects sorting
   - **Fix**: Use UTC consistently

3. **No data validation**: Old records not validated on read
   - **Impact**: Low - corruption unlikely with JSON
   - **Fix**: Add schema validation if issues arise

---

## ✅ Definition of Done

- [ ] All files created and modified
- [ ] All tests passing (unit + integration)
- [ ] Test coverage >90% for new code
- [ ] No linting errors
- [ ] Documentation updated (README, USAGE, CHANGELOG)
- [ ] Manual testing completed
- [ ] Code reviewed
- [ ] Merged to main branch
- [ ] Version bumped to 0.3.0
- [ ] Release notes published

---

## 📞 Questions & Decisions

### Open Questions
1. Should we track failed requests? **Decision: No, only successful requests**
2. Maximum retention period? **Decision: 1 year (configurable)**
3. Export format? **Decision: JSON (can add CSV later)**

### Design Decisions
- Token display format: `18,450 (↑12,300 ↓6,150)` ✅
- Default showTokens: `false` (opt-in) ✅
- Storage location: `~/.git-summary-ai/` ✅
- Singleton pattern for tracker ✅

---

**End of Implementation Plan**

Last Updated: February 3, 2026  
Document Version: 1.0  
Feature Version Target: 0.3.0
