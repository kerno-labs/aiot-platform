import { useState } from 'react'
import {
  AssistantChatTransport,
  useChatRuntime,
} from '@assistant-ui/react-ai-sdk'
import { getAuthToken } from '@/api/clients'

function createTransport() {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL || ''
  const apiEndpoint = gatewayUrl
    ? `${gatewayUrl.replace(/\/$/, '')}/v1/ai/chat`
    : '/v1/ai/chat'

  return new AssistantChatTransport({
    api: apiEndpoint,
    headers: () => {
      const token = getAuthToken()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      return headers
    },
  })
}

export function useCopilotRuntime() {
  const [session, setSession] = useState(() => ({
    key: 0,
    transport: createTransport(),
  }))

  const runtime = useChatRuntime({
    transport: session.transport,
  })

  const resetSession = () => {
    // Reset the transport and session identity together without a synthetic memo dependency.
    setSession((current) => ({
      key: current.key + 1,
      transport: createTransport(),
    }))
  }

  return {
    runtime,
    resetSession,
    sessionKey: session.key,
  }
}
