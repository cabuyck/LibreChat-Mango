# Contextual Awareness Roadmap

## Vision

Build agents with deep contextual awareness across multiple dimensions:
- **Where** the user is (location-aware)
- **What** they've been doing (activity summaries)
- **What** they've been looking at (browsing history)
- **What** they've seen (photos with AI descriptions)
- **Where** they've been (travel history)

The goal is to create a **relational dynamic** where the agent understands not just literal facts, but the *meaning* and *context* of the user's experience.

---

## Phase 1: Location Awareness 📍

### 1.1 Basic GPS + City Detection (2-3 hours)

**What it does:**
- Browser prompts: "Allow LibreChat to access your location?"
- Captures GPS coordinates: `{ latitude, longitude, accuracy }`
- Reverse geocodes to city/region
- Injects: `"GPS Location: 41.881°N, 87.629°W (Chicago, IL, USA)"`

**Implementation:**
- **Frontend:**
  - Geolocation API: `navigator.geolocation.getCurrentPosition()`
  - Send coordinates with each message
  - User setting: "Share location with agents"
  - Per-agent override: Some agents get location, others don't

- **Backend:**
  - New injector: `gps_location`
  - Reverse geocoding API (OpenStreetMap/Nominatim or Mapbox)
  - Store in injector context: `{ lat, lng, city, region, country }`

**Challenges:**
- Browser won't share location over non-HTTPS
- Privacy: Users may not want to share location
- Rate limiting on free geocoding APIs

---

### 1.2 Named Locations System (4-6 hours)

**What it does:**
- User defines named locations with meaning: "Work", "Home", "Coffee Shop"
- Each location has: coordinates, radius, and optional context
- Agent knows: "You're at Work (conference room)"
- Enables location-specific behaviors and prompts

**Database Schema:**
```typescript
interface UserLocation {
  id: string;
  userId: string;
  name: string;              // "Work", "Home", "Gym"
  address?: string;          // Optional: "123 Main St"
  latitude: number;
  longitude: number;
  radius: number;            // In meters (default: 100)
  context?: string;          // Location-specific prompt
  agentId?: string;          // Optional: per-agent locations
  createdAt: Date;
  updatedAt: Date;
}
```

**Frontend UI:**
- Map interface to drop pins (Leaflet or Google Maps)
- List of saved locations with edit/delete
- Radius slider (50m - 500m)
- Context textarea for location-specific prompts
- Toggle: "Share this location with Agent X"

**Matching Logic:**
```typescript
// Calculate distance using Haversine formula
const distance = calculateDistance(
  { lat: currentLat, lng: currentLng },
  { lat: savedLoc.lat, lng: savedLoc.lng }
);

// Find if we're within radius of any named location
const matchedLocation = savedLocations.find(loc => distance <= loc.radius);
```

**Injector Output:**
```
Location: Work (Main Office - 3rd Floor)
You last sent a message 4 hours ago from this location.
Location Context: User is at work. Professional tone. Focus on productivity.
```

---

### 1.3 Location-Aware Context (3-4 hours)

**What it does:**
- Associate different prompts/behaviors with locations
- Agent changes tone, focus, or priorities based on where user is
- Enables the relational dynamic you described

**Examples:**

| Location | Context Prompt | Agent Behavior |
|----------|---------------|----------------|
| **Work** | "User is at work. Be concise and professional. Focus on productivity." | Efficient, task-oriented |
| **Home - Living Room** | "User is relaxed at home. Casual tone. They might be watching TV." | Conversational, relaxed |
| **Home - Office** | "User is working from home. Professional but casual." | Business-casual |
| **Gym** | "User is exercising. Brief responses. Motivational tone." | Short, encouraging |
| **Coffee Shop** | "User is working remotely. Might be on WiFi. Casual work mode." | Flexible, adaptive |

**Injector Configuration:**
```typescript
{
  named_location: {
    enabled: true,
    config: {
      includeContext: true,
      includeTimeSince: true,
      fallbackToCity: true  // If no named location, use city name
    }
  }
}
```

**Advanced Features:**
- **Time-based overrides**: "Work (before 9am)" vs "Work (after 5pm)"
- **Day-of-week**: Different context for weekdays vs weekends
- **Duration awareness**: "You've been at work for 6 hours"

---

## Phase 2: Activity Summaries 📊

### 2.1 Cross-Chat Activity Tracking (4-6 hours)

**What it does:**
- When returning to a daily chat, agent knows what other conversations happened
- Summarizes: "Since your last message, you chatted with Agent B about X and Agent C about Y"
- Provides continuity across multiple agent interactions

**Use Case:**
- User has "Daily Chat with Agent A" set up for each day
- User has conversations with Agents B, C, D throughout the day
- User returns to Agent A and it should know: "You've been discussing project deadlines with Agent B and had a brainstorming session with Agent C"

**Implementation:**

**Database Schema:**
```typescript
interface ConversationActivity {
  id: string;
  userId: string;
  conversationId: string;
  agentId: string;
  agentName: string;
  messageCount: number;
  firstMessageAt: Date;
  lastMessageAt: Date;
  topics?: string[];        // Extracted from chat (Phase 2.2)
  summary?: string;         // Generated summary (Phase 2.3)
}
```

**Query Logic:**
```typescript
// When sending message in daily chat:
const lastMessageTime = await getLastMessageTime(conversationId, userId);

// Get all other conversations since then:
const recentActivity = await ConversationActivity.find({
  userId: userId,
  conversationId: { $ne: currentConversationId },
  lastMessageAt: { $gte: lastMessageTime }
}).sort({ lastMessageAt: -1 });
```

**Injector Output:**
```
Activity Since Last Message (4 hours ago):
- Chatted with "Code Assistant" about React hooks (23 messages)
- Chatted with "Writing Coach" about blog outline (8 messages)
- Chatted with "Math Tutor" about calculus (15 messages)
```

**Challenges:**
- Identifying which chats are "daily chats" vs other conversations
- Performance: querying all conversations could be slow
- Privacy: user may not want cross-chat leakage

---

### 2.2 Topic Extraction (3-4 hours)

**What it does:**
- Automatically extracts topics/themes from conversations
- Provides quick summary: "You discussed X, Y, Z"
- Better than just message counts

**Implementation:**
- Use existing LLM to generate 3-5 bullet points per conversation
- Store with conversation metadata
- Update when conversation ends

**Prompt:**
```
Summarize the main topics discussed in this conversation in 3-5 bullet points.
Each bullet should be under 10 words.
Focus on subjects, not emotions or actions.

Example:
- React hooks and state management
- Debugging useEffect dependency issues
- Comparing useState vs useReducer
```

**Injector Output:**
```
Activity Since Last Message:
- Code Assistant: React hooks, state management, debugging (23 messages)
- Writing Coach: Blog post structure, SEO optimization (8 messages)
```

---

### 2.3 Cross-Chat Summaries (4-5 hours)

**What it does:**
- Generates narrative summaries of activity across conversations
- Provides richer context than just topics
- "You've been working on your React course all afternoon"

**Implementation:**
- Periodic job generates summaries of recent activity
- Uses LLM to synthesize multiple conversation summaries
- Stored as "ActivitySession" records

**Database Schema:**
```typescript
interface ActivitySession {
  id: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  conversationCount: number;
  totalMessages: number;
  summary: string;          // "Spent afternoon working on React course"
  primaryTopics: string[];
}
```

**Injector Output:**
```
Recent Activity Summary:
Since your last message 4 hours ago, you've been primarily focused on:
- Learning React hooks and state management (Code Assistant)
- Planning your next blog post about web development (Writing Coach)

Total activity: 3 conversations, 46 messages
```

---

### 2.4 Daily Chat Detection (2-3 hours)

**What it does:**
- Automatically identifies "daily chats" vs other conversations
- Could be based on: naming pattern, user tagging, or explicit setting
- Ensures daily chats get the activity summary treatment

**Detection Methods:**
1. **Naming pattern**: Conversations named "Daily Chat - [Date]" or similar
2. **User tagging**: User marks specific conversations as "daily"
3. **Agent setting**: Per-agent setting to treat all chats as "daily"
4. **Time-based**: Chats created within a specific time window

**UI Addition:**
- Checkbox on conversation: "Treat as daily chat"
- Agent setting: "This is a daily chat agent"
- Auto-group daily chats in UI

---

## Phase 3: Enhanced Activity Tracking 🌐

### 3.1 Browsing History Integration (5-7 hours)

**What it does:**
- Agent knows what websites user visited since last message
- "Since we last spoke, you visited 12 React documentation pages"
- Enables: "I see you've been researching Redux - want to discuss it?"

**Privacy-First Approach:**
- **Opt-in only**: Explicit user permission required
- **Domain-level only**: Not full URLs, just "react.dev", "github.com"
- **Time-limited**: Only last N hours of history
- **User control**: Exclude specific domains, clear history
- **Local-only**: Data never leaves user's device

**Implementation Options:**

**Option A: Browser Extension** (Recommended)
- Chrome/Firefox extension captures browsing history
- Sends domain list to LibreChat API
- Stored with user activity data
- Easy to disable/enable

**Option B: Native Integration**
- Use browser history API (limited)
- Requires user to be on LibreChat tab
- Less comprehensive

**Option C: Manual Input**
- User pastes browsing history or domains
- Simple but higher friction

**Data Schema:**
```typescript
interface BrowsingActivity {
  id: string;
  userId: string;
  domain: string;           // "react.dev", "github.com"
  visitCount: number;       // Number of visits
  lastVisited: Date;
  category?: string;        // "Documentation", "Social Media", "News"
}
```

**Injector Output:**
```
Browsing Activity (Last 4 hours):
- Documentation: react.dev, vue.js.org (12 visits)
- Development: github.com (8 visits)
- Reference: mdn.io (5 visits)
```

**Privacy Controls:**
- Incognito mode for specific sessions
- Domain blacklist (exclude social media, banking, etc.)
- Auto-delete after N hours
- Per-agent permissions

---

### 3.2 Photo & Media Descriptions (6-8 hours)

**What it does:**
- Agent knows what photos user took or viewed
- Vision AI describes photos: "Screenshot of React code with error"
- Enables: "I see you took a screenshot of that error - want help debugging?"

**Implementation:**

**Photo Capture Methods:**
1. **Camera API**: Photos taken directly in LibreChat
2. **Upload detection**: When user uploads photos to chat
3. **Gallery integration** (future): OS-level photo gallery access

**Workflow:**
1. User takes/uploads photo during conversation
2. Vision AI (GPT-4V, Claude 3.5 Vision) describes it
3. Description stored with media metadata
4. Agent can reference it in future messages

**Data Schema:**
```typescript
interface MediaActivity {
  id: string;
  userId: string;
  conversationId?: string;
  type: 'photo' | 'screenshot' | 'video';
  description: string;       // AI-generated description
  confidence: number;        // How confident AI is in description
  capturedAt: Date;
  url: string;              // Encrypted URL
  tags?: string[];          // "code", "error", "ui"
}
```

**Injector Output:**
```
Recent Media (Last 4 hours):
- Screenshot of VS Code showing React error (2 hours ago)
- Photo of whiteboard with architecture diagram (3 hours ago)
```

**Privacy & Storage:**
- Encrypted storage
- Auto-delete after N days
- User can delete individual media
- Opt-in per agent

---

### 3.3 Travel History (4-6 hours)

**What it does:**
- Agent knows if user has traveled since last message
- "You've moved 15 miles since your last message"
- Combines with location: "You traveled from Work to Home"

**Implementation:**
- Compare current GPS with last message GPS
- Calculate distance using Haversine formula
- Reverse geocode both locations
- Detect significant movement (> 1 mile)

**Data Schema:**
```typescript
interface TravelEvent {
  id: string;
  userId: string;
  fromLocation: {
    lat: number;
    lng: number;
    name?: string;         // Named location if available
    city: string;
  };
  toLocation: {
    lat: number;
    lng: number;
    name?: string;
    city: string;
  };
  distance: number;        // In miles
  duration?: number;       // Time elapsed (estimated)
  timestamp: Date;
}
```

**Injector Output:**
```
Travel Since Last Message:
You traveled 15.2 miles from Work (Chicago) to Home (Suburbs) over 4 hours.
```

**Advanced Features:**
- **Trip detection**: "You drove to the suburbs and back"
- **Commute pattern**: "This looks like your regular commute"
- **Speed detection**: "You were traveling ~60 mph (likely driving)"

---

## Phase 4: Synthesis & Intelligence 🧠

### 4.1 Cross-Modal Context Synthesis (5-7 hours)

**What it does:**
- Combines all data sources into coherent narrative
- "You've been at work all afternoon, researching React, and took an error screenshot"
- Agent builds mental model of user's day

**Implementation:**
- LLM synthesizes location + activity + browsing + media
- Generates holistic summary
- Detects patterns and themes

**Injector Output:**
```
Context Since Last Message (4 hours ago):

You've been at Work (Main Office) all afternoon, focused on learning React.
You visited documentation sites 12 times and took a screenshot of an error.
You also chatted with the Writing Coach about blogging.

Likely activity: Deep work session on React development.
Suggested agent mode: Technical, supportive, problem-solving.
```

---

### 4.2 Predictive Context (4-5 hours)

**What it does:**
- Agent predicts what user might need based on patterns
- "You usually ask for code review at this time of day"
- Pre-loads relevant context or tools

**Implementation:**
- Analyze patterns in user behavior
- Time-of-day, day-of-week, location correlations
- Suggest next actions or topics

**Example:**
```
Pattern detected: You frequently brainstorm blog ideas at the Coffee Shop on Saturday mornings.

Agent suggestion: "Want to work on your blog outline today? I noticed you usually
do that on weekend mornings when you're here."
```

---

### 4.3 Memory & Recall System (6-8 hours)

**What it does:**
- Agent remembers important context across sessions
- "Last time you were at this coffee shop, we discussed your novel outline"
- Long-term relational memory

**Implementation:**
- Store significant conversations/insights
- Tag with location, time, topics
- Retrieve relevant memories when context matches

**Data Schema:**
```typescript
interface AgentMemory {
  id: string;
  userId: string;
  agentId: string;
  conversationId: string;
  type: 'insight' | 'preference' | 'event' | 'decision';
  content: string;
  importance: number;       // 1-10
  context?: {
    location?: string;
    timeOfDay?: string;
    topics?: string[];
  };
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}
```

**Injector Output:**
```
Related Memories:
- Last time you were here (Coffee Shop), we discussed your novel outline (3 weeks ago)
- You mentioned preferring to write in the mornings (5 instances)
```

---

## Architecture & Infrastructure

### Data Flow

```
User Action (Send Message)
    ↓
[Frontend] Capture GPS coordinates
    ↓
[Middleware] applyPromptInjection()
    ↓
[Injector 1] gps_location → Get coordinates → Reverse geocode
    ↓
[Injector 2] named_location → Match to saved locations → Get context
    ↓
[Injector 3] activity_summary → Query recent conversations → Summarize
    ↓
[Injector 4] travel_history → Compare GPS → Calculate distance
    ↓
[Injector 5] browsing_activity → Get recent domains → Categorize
    ↓
[Injector 6] media_descriptions → Get recent photos → Summarize
    ↓
[Injector 7] context_synthesis → Combine all → Generate narrative
    ↓
[Controller] Send message with full context to LLM
```

### Database Collections

1. **user_locations** - Named locations with context
2. **conversation_activity** - Cross-chat activity tracking
3. **activity_sessions** - Aggregated activity summaries
4. **browsing_activity** - Domain-level browsing history
5. **media_activity** - Photo/video descriptions
6. **travel_events** - Location changes
7. **agent_memories** - Long-term context storage

### API Endpoints

```
POST   /api/user/locations           - Create/update location
GET    /api/user/locations           - List all locations
DELETE /api/user/locations/:id       - Delete location
POST   /api/browsing/activity        - Log browsing history
GET    /api/activity/recent          - Get activity summary
POST   /api/media/describe           - Describe media with AI
GET    /api/memories                 - Retrieve agent memories
```

---

## Privacy & Security Considerations

### Core Principles

1. **Explicit Opt-In** - All features require user consent
2. **Granular Control** - Per-feature, per-agent, per-conversation
3. **Data Minimization** - Only store what's necessary
4. **Transparency** - User can see exactly what's stored
5. **Right to Deletion** - Easy bulk delete functionality
6. **Encryption** - Sensitive data encrypted at rest

### Privacy Controls

**User Settings:**
```
📍 Location Sharing
  ☑️ Share GPS with agents
  ☑️ Use named locations
  ☐ Share travel history
  🗑️ [Clear All Location Data]

📊 Activity Tracking
  ☑️ Cross-chat activity summaries
  ☐ Track browsing history
  ☐ Describe photos with AI
  🗑️ [Clear All Activity Data]

🧠 Agent Memory
  ☑️ Enable long-term memory
  ☐ Include location context
  ☐ Include activity context
  🗑️ [Clear All Memories]
```

**Per-Agent Permissions:**
```
Agent: Code Assistant
☑️ Can see your location
☑️ Can see your activity summary
☐ Can see your browsing history
☐ Can access your photos
☑️ Can remember things for you
```

**Incognito Mode:**
- Temporary disable all tracking
- "Don't remember this conversation"
- "Don't include in activity summaries"

---

## Implementation Priority

### Sprint 1: Foundation (12-15 hours)
1. ✅ Basic GPS capture + city detection
2. ✅ Named locations system
3. ✅ Location-aware context

### Sprint 2: Activity Tracking (10-14 hours)
4. ✅ Cross-chat activity summaries
5. ✅ Topic extraction
6. ✅ Daily chat detection

### Sprint 3: Enhanced Tracking (15-20 hours)
7. ✅ Browsing history integration
8. ✅ Photo/media descriptions
9. ✅ Travel history

### Sprint 4: Intelligence (12-15 hours)
10. ✅ Cross-modal synthesis
11. ✅ Predictive context
12. ✅ Memory & recall system

**Total Estimated Time**: 49-64 hours

---

## Future Enhancements

### Beyond Initial Roadmap

1. **Calendar Integration**
   - Agent knows your schedule
   - "You have a meeting in 30 minutes"
   - Context-aware responses based on upcoming events

2. **Health & Fitness Data**
   - With permission: steps, sleep, heart rate
   - "You've only slept 5 hours, might want to rest"

3. **Communication Patterns**
   - Email, Slack, Discord integration
   - "You haven't replied to Sarah's email yet"

4. **Collaborative Context**
   - Multi-user environments
   - "Your team member also asked about this"

5. **Emotion Detection**
   - Sentiment analysis of user messages
   - Context-aware emotional support

6. **Voice & Audio**
   - Voice messages, transcription
   - Detect tone, mood from voice

7. **Environmental Context**
   - Weather, time of year
   - "It's raining in Chicago - staying in today?"

8. **Project & Task Integration**
   - Jira, Trello, Notion
   - Agent knows your current tasks and priorities

---

## Open Questions

1. **Storage Limits**: How long do we keep activity data?
   - Option: User-configurable retention (7 days, 30 days, forever)

2. **Performance**: At what scale does querying all activity get slow?
   - Solution: Caching, pagination, background jobs

3. **Cost**: Vision AI, geocoding APIs have costs
   - Option: Tiered pricing, free tier with limits

4. **Accuracy**: GPS drift, wrong locations, bad descriptions
   - Solution: Confidence scores, user correction

5. **User Complexity**: Too many settings might overwhelm users
   - Solution: Smart defaults, preset profiles

---

## Success Metrics

- **User Engagement**: Daily chat usage increases by X%
- **Agent Quality**: User satisfaction scores improve
- **Privacy**: <1% of users opt-out after trying
- **Performance**: Context injection adds <500ms latency
- **Accuracy**: Location matching >95% correct
- **Reliability**: >99.9% uptime for all tracking systems

---

## Notes

- **Iterate Fast**: Start with GPS + named locations, get user feedback
- **Privacy First**: Be transparent, give control, expect abuse
- **Fail Gracefully**: If location fails, still work without it
- **User Education**: Explain value, not just features
- **Opt-Out Easy**: Make it trivial to disable any tracking

**Last Updated**: 2026-03-27
**Status**: Planning Phase
**Next Steps**: Begin Phase 1.1 (Basic GPS + City Detection)
