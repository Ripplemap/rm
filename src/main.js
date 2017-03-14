/**
 *
 * The entry point to the Ripple Map app (RM)
 * Binds the RM app to the Preact renderer
 *
 */

import './styles/main.css'

// TODO: do we need h, Component below?

import {render, h} from 'preact'
import Sidebar from './Sidebar/Sidebar'

import {init, on_render} from 'app/main'


init() // engage the application

let root
let renderer = () => root = render(h(Sidebar, null), document.getElementById('sidebar'), root)

// on_render(x => render(<Sidebar />, document.getElementById('sidebar'))) // connect the preact renderer
// on_render((state) => co._component.render(state)) // connect the preact renderer
on_render(renderer) // connect the preact renderer
