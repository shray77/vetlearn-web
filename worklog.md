---
Task ID: 1
Agent: Main Agent
Task: Clone and audit vetlearn-web repository for memory leaks, bugs, and anti-patterns

Work Log:
- Cloned gitlab.com/shray77/vetlearn-web to /home/z/my-project/download/vetlearn-web
- Identified project as Next.js 16 + TypeScript + Zustand + Tailwind + shadcn/ui
- Read all source files: page.tsx, store.ts, types.ts, all components, all API routes
- Identified 4 memory leaks, 6 bugs, 7 anti-patterns (17 issues total)

Stage Summary:
- Critical memory leaks found in VoiceTutorTab (Object URL, MediaRecorder, Audio objects) and store (unbounded tutorMessages)
- System prompt bug in all API routes (sent as 'assistant' instead of 'system')
- Timezone bug in streak calculation
- Race condition in ClinicalCasesTab handleSubmitCase
- Full audit report delivered in chat
