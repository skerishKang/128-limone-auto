import ChatContainer from './components/chat/ChatContainer'

function App() {
  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      <div className="flex-1 max-w-4xl w-full mx-auto my-4 bg-white rounded-lg shadow-lg overflow-hidden">
        <ChatContainer />
      </div>
    </div>
  )
}

export default App
