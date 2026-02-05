// components/MainWorkspace.tsx
'use client'

import { TamboProvider } from '@tambo-ai/react'
import { useState } from 'react'
import { NavigationBar } from './layout/NavigationBar'
import { MessageThreadFull } from '@/components/tambo/message-thread-full'
import { useMcpServers } from '@/components/tambo/mcp-config-modal'
import { components, tools } from '@/lib/tambo'
import type { User } from '@supabase/supabase-js'

// Import interactable components
import { InteractableCollections } from './interactable/Collections'
import { InteractableCalendar } from './interactable/Calendar'
import { InteractableNotes } from './interactable/Notes'
import { InteractableImageStudio } from './interactable/ImageStudio'

type WorkspaceView = 'search' | 'collections' | 'calendar' | 'notes' | 'studio'

interface MainWorkspaceProps {
  user: User
}

export function MainWorkspace({ user }: MainWorkspaceProps) {
  const [activeView, setActiveView] = useState<WorkspaceView>('search')
  const mcpServers = useMcpServers()

  return (
    <TamboProvider
      apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
      components={components}
      tools={tools}
      tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
      mcpServers={mcpServers}
    >
      <div className="flex flex-col h-screen bg-gray-50">
        <NavigationBar
          activeView={activeView}
          onViewChange={setActiveView}
          userEmail={user.email!}
        />

        <div className="flex-1 overflow-hidden">
          {activeView === 'search' && (
            <MessageThreadFull />
          )}

          {activeView === 'collections' && (
            <InteractableCollections collections={[]} />
          )}

          {activeView === 'calendar' && (
            <InteractableCalendar events={[]} />
          )}

          {activeView === 'notes' && (
            <InteractableNotes notes={[]} />
          )}

          {activeView === 'studio' && (
            <InteractableImageStudio 
              variations={[]}
              currentPrompt=""
            />
          )}
        </div>
      </div>
    </TamboProvider>
  )
}