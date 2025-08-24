import React from 'react'
import ReactDOM from 'react-dom/client'
import Button from '@mui/material/Button'
import $ from 'jquery'

$(document).on('socket:forensics', (_e, msg) => console.log(msg))

const App = () => <Button id="hello">Hello</Button>

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
