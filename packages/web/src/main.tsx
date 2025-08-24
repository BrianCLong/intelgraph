import React from 'react'
import ReactDOM from 'react-dom/client'
import $ from 'jquery'

function App() {
  return <div id="app">GA-Ontology Console</div>
}

$(document).on('socket:ontology', (_e, data) => {
  console.log('event', data)
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
