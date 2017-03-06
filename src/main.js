/**
 *
 * The Entry point to all of Ripplemap. (RM)
 * Creates the sidebar for controlling the RM. (built with Preact, see src/Sidebar)
 */

import { h, render, Component } from 'preact'
import Sidebar from './Sidebar/Sidebar'
import './styles/main.css'
import {do_the_glue, init as rm_init} from 'Ripplemap/main'


init()

function init() {
  window.do_the_glue = do_the_glue
  render(<Sidebar />, document.getElementById('sidebar'))
  rm_init()
}
