import ChatInterface from '@/components/chat/ChatInterface'
export default function ChatPage() {
  return (
    <div className="h-screen flex flex-col">
      <div className="px-8 py-5 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-semibold text-gray-900">AI Chat</h1>
        <p className="text-sm text-gray-400 mt-0.5">Ask anything about your network</p>
      </div>
      <ChatInterface />
    </div>
  )
}
