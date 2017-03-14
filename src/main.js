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

on_render(renderer) // connect the preact renderer
