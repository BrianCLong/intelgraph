import $ from 'jquery'
import React from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  React.useEffect(() => {
    $(document).on('socket:ontology', (_, msg) => {
      console.log('event', msg)
    })
  }, [])
  return <div>IntelGraph Web</div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
