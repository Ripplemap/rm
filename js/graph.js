/*global Dagoba */

export const G = Dagoba.graph()
export {addtag, removetag}


function addtag(tag) {
  RM.tags.push(tag)
  RM.G = Dagoba.graph()
  fact_to_graph(RM.facts)
  render_all()
}

function removetag(tag) {
  var index = RM.tags.indexOf(tag)
  if(index === -1)
    return undefined

  RM.tags.splice(index, 1)
  RM.G = Dagoba.graph()
  fact_to_graph(RM.facts)
  render_all()
}

// function reset_graph() {
//   RM.G = Dagoba.graph()
// }
