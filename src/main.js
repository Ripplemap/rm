/**
 * 
 * The Entry point to all of Ripplemap. (RM)
 * Creates the sidebar for controlling the RM. (built with Preact, see src/Sidebar)
 */

import { h, render, Component } from 'preact';
import Sidebar from './Sidebar/Sidebar'
import './styles/main.css'
import './Ripplemap/main'


render(<Sidebar />, document.getElementById('sidebar'));