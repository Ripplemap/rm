/**
 * 
 * The Entry point to all of Ripplemap. (RM)
 * Creates the sidebar for controlling the RM. (built with Preact, see src/Sidebar)
 * Mounts RM to the dom using `createRippleMap()` 
 */

import { h, render, Component } from 'preact';
import Sidebar from './Sidebar/Sidebar'
import './main.css'
import {createRippleMap} from './Ripplemap/Ripplemap';
import '../js/main'


render(<Sidebar />, document.getElementById('sidebar'));
// createRippleMap()