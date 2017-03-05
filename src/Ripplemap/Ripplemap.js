import './Ripplemap.css'

/**
 * I made this file so that all Ripple map could be developed in here, outside tf the build/index.html.
 * The ripplemap gets mounted similar to how react mounts on a html node.
 */

export function createRippleMap() {
  let rm = document.getElementById('ripplemap-mount');
  rm.innerHTML = `<div class="Ripplemap" />` 
}