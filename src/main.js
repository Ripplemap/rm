/**
 *
 * The Entry point to all of Ripplemap. (RM)
 * Creates the sidebar for controlling the RM. (built with Preact, see src/Sidebar)
 */

import { h, render, Component } from 'preact'
import Sidebar from './Sidebar/Sidebar'
import './styles/main.css'
import {do_the_glue, init as rm_init, render_all as rm_render_all} from 'Ripplemap/main'


init()

function init() {
  rm_init()
  window.do_the_glue = do_the_glue
  window.rm_render_all = rm_render_all
  render(<Sidebar />, document.getElementById('sidebar'))
}
