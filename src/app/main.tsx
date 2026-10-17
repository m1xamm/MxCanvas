import { render } from 'preact'
import { App } from './App'
import '../ui/theme/theme.css'
import '../ui/theme/base.css'
import '../ui/ui.css'

const rootElement = document.getElementById('app')
if (!rootElement) throw new Error('Root element #app is missing')

render(<App />, rootElement)
