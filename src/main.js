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

import {update_conversation as yuck} from 'convo'
import {force_rerender as f_r} from 'render'
window.yuck = yuck
window.f_r = f_r


init() // engage the application

let root
let renderer = () => root = render(h(Sidebar, null), document.getElementById('sidebar'), root)

on_render(renderer) // connect the preact renderer
