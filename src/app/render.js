import {G} from 'graph'
import {eq, prop, clone, truncate, push_it, pipe} from 'fun'
import * as dom from 'dom'
import * as highlight from 'highlight'
import {convo} from 'convo'
import {cats} from 'model'
import state from 'state'

export {init, force_rerender, add_renderer, get_sentence_html, get_viz_html, get_convo_html, get_tag_html, showtags, whatsnext, get_active_sentence_html}

const renderers = []
function add_renderer(f) {
  renderers.push(f)
}

let render_requested = false

function force_rerender() {
  if(render_requested) return undefined
  render_requested = true

  window.requestAnimationFrame(() => {
    render_requested = false
    renderers.forEach(f => f(state))
  })
}



// function render_all() {
//   render()
//   render_conversation(conversation)
//   showtags()
// }


// TODO: break this up more, make canvas and svg renderers into imported modules (w/ dom ctx as input to canvas one)

const ctx = dom.el('ripples').getContext('2d')

var viz_pipe, word_pipe, wyrd_pipe


// RENDER PIPELINE

function init() {
  // TODO: consider a workflow for managing this tripartite pipeline, so we can auto-cache etc
  viz_pipe = pipe( mod('data', sg_compact)
                 , mod('data', likenamed)
                 , mod('data', cluster)
                 , mod('data', Dagoba.cloneflat)
                   // layout:
                 , set_year
                 , data_to_graph
                 , add_fakes
                 , set_coords
                 , set_score
                 , minimize_edge_length
                 , remove_fakes
                 , unique_y_pos
                 , filter_by_year
                 , filter_nodes
                   // shapes:
                 , add_rings
                 , add_ring_labels
                 , copy_edges
                 , copy_nodes
                 , add_node_labels
                 , add_edge_labels
                   // rendering:
                 , clear_it_svg
                 , draw_it_svg
                 , draw_metadata
                 )

  word_pipe = pipe( get_actions
                  , filter_actions
                  , make_sentences
                  , write_sentences
                  )

  wyrd_pipe = pipe( get_actions
                  , filter_actions
                  , make_sentences
                  , filter_active
                  , write_sentences
                  )
}

function render_pipe(pipe) {
  // TODO: cloning is inefficient: make lazy subgraphs
  var env = { data: Dagoba.clone(G)
            , svg: {head: '', body: '', tail: ''}
            , params: { my_maxyear: state.my_maxyear
                      , my_minyear: state.my_minyear
                      , filters: window.filter_poo
                      }
            , shapes: []
            , ctx: ctx
            }

  return pipe(env)

  // viz_pipe(env)
  // word_pipe(env)

  // if(n === undefined)
  //   state.pipelines.forEach(function(pipeline) { pipeline(env) })
  // else
  //   state.pipelines[n](env)
}

function get_sentence_html() {
  let env = render_pipe(word_pipe)
  return env.output_html
}

function get_active_sentence_html() {
  let env = render_pipe(wyrd_pipe)
  return env.output_html
}

function get_viz_html() {
  // THINK: viz_pipe should be initialized with a dom context or something...
  let env = render_pipe(viz_pipe)
  return env.output_html
}

function get_convo_html() {
  return render_conversation(convo)
}


// COMPACTIONS

function sg_compact(g) {
  // so... this is pretty silly i guess or something. use subgraphs instead.
  var newg = Dagoba.graph()
  var edges = []

  g.v().run().forEach(function(node) {
    if(node.time)
      return undefined

    var others = g.v(node._id).both().run()
    others.forEach(function(other) {
      if(other.time)
        node.time = Math.min(node.time||Infinity, other.time)

      var oo = g.v(other._id).both().run()
      if(oo.length < 2)
        return undefined

      var edge = {_in: oo[0]._id, _out: oo[1]._id, label: other.name || ""}

      if(!edges.some(x => x._in === edge._in && x._out === edge._out))
        edges.push(edge)

      newg.addVertex(node)
    })
  })

  edges.forEach(function(edge) {
    newg.addEdge(edge)
  })

  return newg
}

function likenamed(g) {
  var namemap = {}

  g.v().run().forEach(function(node) {
    if(!node.name)
      return undefined

    if(!namemap[node.name]) {
      namemap[node.name] = [node]
    }
    else {
      namemap[node.name].push(node)
    }
  })

  Object.keys(namemap).forEach(function(name) {
    if(namemap[name].length > 1)
      g.mergeVertices(namemap[name])
  })

  return g
}


/// modularize this:

let clusters = [ ['AMC', 'amc', 'Allied Media Conference', 'allied media conference', 'Allied media Conference']
              , ['AMP', 'amp', 'Allied Media Projects', 'allied media projects']
              , ['AMC2016 Coordinators Weekend', 'AMC 2016 Coordinators Meeting']
              , ['jayy dodd', 'jayy']
              ]

function cluster(g) {
  clusters.map(function(names) {
    return names.reduce(function(acc, name) {
      return acc.concat(g.v({name: name}).run())
    }, [])
  }).forEach(g.mergeVertices.bind(g))

  return g
}

// LAYOUT

function mod(prop, fun) {
  return function(env) {
    env[prop] = fun(env[prop])
    return env
  }
}

function set_year(env) {
  var minyear = Infinity
  var maxyear = 0
  var list = env.params.years = {}

  env.data.V = env.data.V.map(function(node) {

    if(node.time < 1199161600000) return node // HACK: remove me!!!

    var year = (new Date(node.time+100000000)).getFullYear()
    if(year < minyear) minyear = year // effectful :(
    if(year > maxyear) maxyear = year // effectful :(

    node.year = year // mutation :(
    push_it(list, node.year, node) //, G.vertexIndex[node._id])

    return node
  })

  // env.params.minyear = minyear
  // env.params.maxyear = maxyear
  env.params.minyear = state.my_minyear
  env.params.maxyear = state.my_maxyear

  return env
}

function data_to_graph(env) {
  // THINK: this is kind of weird... we could probably get more leverage by just using G itself
  env.params.graph = Dagoba.graph(env.data.V, env.data.E)
  env.data.V = env.params.graph.vertices
  env.data.E = env.params.graph.edges
  return env
}

function add_fakes(env) {
  var years = env.params.years

  Object.keys(years).forEach(function(yearstr) {
    var year = years[yearstr]
    var fake = {type: 'fake', year: yearstr, name: 'fake', _in: [], _out: []}
    // var copies = 3 + Math.ceil(year.length / 5)
    var copies = 10 - year.length < 0 ? 2 : 10 - year.length
    // var fakes = [clone(fake), clone(fake), clone(fake), clone(fake), clone(fake), clone(fake), clone(fake), clone(fake)]
    var fakes = []
    for(var i = 0; i < copies; i++) {
      fakes.push(clone(fake))
    }

    Array.prototype.push.apply(year, fakes)
    Array.prototype.push.apply(env.data.V, fakes)
  })

  return env
}

function set_coords(env) {
  var years = env.params.years

  env.data.V.forEach(function(node) {
    if(node.x) return node

    var offset = node.year - env.params.my_minyear + 1
    var radius = offset * state.ring_radius // HACK: remove this!

    var nabes = years[node.year]
    // var gnode = G.vertexIndex[node._id]

    if(!nabes) return false

    var index = nabes.indexOf(node)
    var arc = 2 * Math.PI / nabes.length

    var deg = offset + index * arc
    var cx  = radius * Math.cos(deg)
    var cy  = radius * Math.sin(deg)
    var edge_count = node._in.length + node._out.length

    node.shape = 'circle'
    node.x = cx
    node.y = cy
    node.r = 4 + 2*Math.min(5, edge_count / 2) //Math.floor(node.name.charCodeAt(0)/20)

    return node
  })

  return env
}

function set_score(env) {
  env.data.V = env.data.V.map(function(node) { node.score = score(node); return node })
  return env
}

function minimize_edge_length(env) {
  var years = env.params.years

  Object.keys(years).sort().forEach(function(key) {
    var peers = years[key]
    peers.sort(score_sort)
    peers.forEach(function(node) {
      peers.forEach(function(peer) {
        swap(node, peer)
        var new_node_score = score(node)
        var new_peer_score = score(peer)
        if(node.score + peer.score < new_node_score + new_peer_score) {
          swap(node, peer)
        } else {
          node.score = new_node_score
          peer.score = new_peer_score
        }
      })
    })
  })

  return env

  function swap(n1, n2) {
    var x = n1.x, y = n1.y
    n1.x = n2.x; n1.y = n2.y
    n2.x = x;    n2.y = y
  }

  function score_sort(n1, n2) {
    return n1.score - n2.score
  }
}

function score(node) {
  return [].concat(node._in||[], node._out||[]).reduce(function(acc, edge) {return acc + score_edge(edge, node)}, 0)

  function score_edge(edge, self) {
    //// TODO: if other end is "older" than this end, don't count it...
    if(edge._in  === node && edge._out.year > node.year) return 0
    if(edge._out === node && edge._in. year > node.year) return 0

    // return edge._in.x + edge._out.x

    var dx = Math.abs(edge._in.x - edge._out.x)
    var dy = Math.abs(edge._in.y - edge._out.y)

    return Math.sqrt(dx*dx + dy*dy)
  }
}

function remove_fakes(env) {
  env.data.V = env.data.V.filter(function(node) {
    return node.type !== 'fake'
  })
  return env
}

function unique_y_pos(env) {
  var threshold = 6
  // var node_radius = 5
  var arc = Math.PI / 100
  var years = env.params.years
  var ys = []

  Object.keys(years).sort().forEach(function(key) {
    var peers = years[key]
    peers.forEach(function(node) {
      var coords, closest

      if(node.type === 'fake') // le sigh
        return

      // A) do a binary search on an array of midpoints to find the closest one
      // B) if it's within threshold walk around the circle in both directions until you find an opening
      // C) if you reach the antipode give up

      for(var da = arc; da < Math.PI; da = -1*(da + arc*(da/Math.abs(da)))) {
        coords = modify_coords(node, da)
        closest = find_closest(coords.y, ys)
        if(!closest || Math.abs(closest - coords.y) > threshold)
          break
      }

      // console.log(da, closest, coords.y, Math.abs(closest - coords.y))

      node.x = coords.x
      node.y = coords.y
      ys.push(coords.y)

      ys.sort(function(a, b) {return a - b}) // OPT: just insert coords.y in place
    })
  })

  return env

  function modify_coords(node, da) {
    return { x: node.x * Math.cos(da) - node.y * Math.sin(da)
           , y: node.x * Math.sin(da) + node.y * Math.cos(da)
           }
  }

  function find_closest(n, ns) { // binary search
    var closest
    var index = Math.floor(ns.length / 2)
    var item = ns[index]

    if(ns.length < 5) {
      for(var i = 0; i < ns.length; i++) {
        if(closest === undefined || Math.abs(ns[i] - n) < Math.abs(closest - n))
          closest = ns[i]
      }
      return closest
    }

    if(item === n)
      return item

    if(item > n)
      return find_closest(n, ns.slice(0, index))

    return find_closest(n, ns.slice(index + 1))
  }
}

function filter_by_year(env) {
  var max = env.params.my_maxyear
  var min = env.params.my_minyear

  // hack hack hack
  if(state.current_year < max)
    max = state.current_year

  // TODO: do this in Dagoba so we can erase edges automatically
  env.data.V = env.data.V.filter(function(node) {
    // yuckyuckyuck
    if(node.year > max || node.year < min) {
      env.params.graph.removeVertex(node)
      return false
    }
    return true
  })

  return env
}

function filter_nodes(env) {
  let filters = env.params.filters

  if(!filters) return env

  // TODO: do this in Dagoba so we can erase edges automatically
  env.data.V = env.data.V.filter(function(node) {
    // yuckyuckyuck
    if(filters.includes(node.type)) {
      env.params.graph.removeVertex(node)
      return false
    }
    return true
  })

  return env
}


// SHAPES

function add_rings(env) {
  for(var i = env.params.minyear; i <= env.params.maxyear; i++) {
    var color = i === state.current_year ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.3)'
    var radius = state.ring_radius * (i - env.params.my_minyear + 1)
    env.shapes.unshift({shape: 'circle', x: 0, y: 0, r: radius, stroke: color, fill: 'rgba(0, 0, 0, 0)', line: 1, type: 'ring', year: i})
  }
  return env
}

function add_ring_labels(env) {
  var labels = []

  env.shapes.filter(eq('type', 'ring')).forEach(function(shape) {
    var fill = shape.year == state.current_year ? '#ccc' : '#999'
    var label = {shape: 'text', str: shape.year, x: -15, y: -shape.r - 5, fill: fill} //, font: "18px Raleway" }
    labels.push(label)
  })

  env.shapes = env.shapes.concat(labels)
  return env
}

function copy_edges(env) {
  var hues = { "participate in": "rgba(52, 73, 94, 0.7)"
             , "inspire": "rgba(241, 196, 15, 0.7)"
             , "organize": "rgba(141, 196, 215, 0.7)"
             , "lead": "rgba(231, 76, 60, 0.7)"
             , "met": "rgba(102, 39, 239, 0.7)"
             }

  env.data.E.forEach(function(edge) {
    if(!state.all_edges && !(edge._out.year === state.current_year || edge._in.year === state.current_year)) // HACK: remove this
      return undefined

    var color = hues[edge.label]
    var label = edge.label || "#777"
    var id    = edge._in._id + '-' + edge._out._id

    // TODO: is this needed with hard baked colours?
    /* var color = str_to_color(label)*/
    /* function str_to_color(str) { return 'hsl' + (state.show_labels?'a':'') + '(' + str_to_num(str) + ',100%,40%' + (state.show_labels?',0.3':'') + ')';}*/
    /* function str_to_color(str) { return 'hsla' + '(' + str_to_num(str) + ',30%,40%,0.' + (state.show_labels?'3':'7') + ')' }*/
    /* function str_to_num(str) { return char_to_num(str, 0) + char_to_num(str, 1) + char_to_num(str, 2) }*/
    /* function char_to_num(char, index) { return (char.charCodeAt(index) % 20) * 20 }*/

    var line = {shape: 'line', _id: id, x1: edge._in.x, y1: edge._in.y, x2: edge._out.x, y2: edge._out.y, stroke: color, type: 'edge', label: label}
    env.shapes.push(line)
  })
  return env
}

function copy_nodes(env) {
  env.shapes = env.shapes.concat.apply(env.shapes, env.data.V.map(function(node) {
    // HACK: move this elsewhere
    if(!state.all_edges) {
      var ghost = !node._in.concat(node._out)
                           .map(e => [e._in.year, e._out.year])
                           .reduce((acc, t) => acc.concat(t), [])
                           .filter(y => y === state.current_year).length
      if(ghost)
        return []
    }

    // var this_year = state.all_edges || node.year === state.current_year
    // var color =  'hsla(0,0%,20%,0.' + (this_year ? '99' : '3') + ')'

    var hues = { outcome: "#ffd600"    // yellow
               , person:  "#009edb"    // blue (aka, Individual)
               , event:   "#f32938"    // red
               , org:     "#00af4c"    // green (aka, "Group")
               }

    var color = hues[node.type]

    var shape = { shape: 'circle'
                , _id: node._id
                , x: node.x
                , y: node.y
                , r: node.r * 0.8     // node is 20% smaller
                , name: node.name
                , fill: color
                }

    if(!node.highlight && !node.active)
      return shape

    let colour = node.active ? 'rgba(255, 214, 0, 0.98)'
                             : 'rgba(255, 214, 0, 0.8)'

    var highlight = { shape: 'circle'
                    , _id: node._id + '-highlight'
                    , x: node.x
                    , y: node.y
                    , r: node.r + 10
                    , line: 0.01
                    , fill: colour
                    , type: 'highlight'
                    }

    return [highlight, shape]
  }))
  return env
}

function add_node_labels(env) {
  var labels = []

  env.shapes.forEach(function(shape) {
    if(!shape.name) return undefined
    var str = truncate(shape.name, 50)
    var label = {shape: 'text', str: str, x: shape.x + 15, y: shape.y + 5}
    labels.push(label)
  })

  env.shapes = env.shapes.concat(labels)
  return env
}

function add_edge_labels(env) {
  if(!state.show_labels)
    return env

  var labels = []

  env.shapes.forEach(function(shape) {
    if(shape.type !== 'edge') return undefined
    var label = {shape: 'angle_text', x1: shape.x1, y1: shape.y1, x2: shape.x2, y2: shape.y2, fill: shape.stroke, str: shape.label}
    labels.push(label)
  })

  env.shapes = env.shapes.concat(labels)
  return env
}

// RENDERING

// experimental svg mode functions...
function clear_it_svg(env) {
  env.svg.head = `<svg viewBox="0 0 900 900" style="height:900px" xmlns="http://www.w3.org/2000/svg">`
  env.svg.tail = `</svg>`
  return env
}

function draw_it_svg(env) {
  // tees: create an array of element id's to loop over and add mouse over events too.
  let nodes = []
  let edges = []

  env.shapes.forEach(function(node) {
    env.svg.body += draw_shape(node)
  })

  // inject the svg node
  document.getElementById('ripplemap-mount').innerHTML = env.svg.head + env.svg.body + env.svg.tail

  highlight.add_svg_listeners(edges, nodes)

  return env // <----- hey look, the function ends here!




  function draw_shape(node) {
    var cx = 450
    var cy = 450

    if(node.shape === 'circle')
      return draw_circle(node, cx + node.x, cy + node.y, node.r, node.stroke, node.fill, node.line)

    if(node.shape === 'line')
      return draw_line(node, cx + node.x1, cy + node.y1
                           , cx + node.x2, cy + node.y2, node.stroke, node.line)

    if(node.shape === 'text')
      return draw_text(node, cx + node.x, cy + node.y, node.str, node.font, node.fill)

    if(node.shape === 'angle_text')
      return draw_angle_text( node, cx + node.x1, cy + node.y1
                                  , cx + node.x2, cy + node.y2
                                  , node.str, node.font, node.fill
                            )
  }

  function draw_circle(node, x, y, radius, stroke_color, fill_color, line_width) {
    if(!x || !y || !radius) return undefined

    // console.log(stroke_color)
    fill_color = fill_color || '#444444'
    line_width = line_width || 2
    stroke_color = stroke_color || '#eef'

    let u_id = `${node._id}`
    nodes.push(u_id)

    return `<circle id="${u_id}" class="${node.type || 'node'}" cx="${x}" cy="${y}" r="${radius}" fill="${fill_color}" stroke-width="${line_width}" stroke="${stroke_color}"/>`
  }

  function draw_line(node, fromx, fromy, tox, toy, stroke_color, line_width) {
    /* stroke_color = stroke_color || '#eef' // override until highlighting is figured out*/
    stroke_color = 'rgba(255, 255, 255, 0.4)'
    // console.log(stroke_color)
    line_width = line_width || 0.5


    if(fromx * fromy * tox * toy * 0 !== 0)
      return ''

    let u_id = `${node._id}`
    edges.push(u_id)

    // TODO: highlight edge
    return `
      <g>
        <line class= "${node.type}" x1="${fromx}" y1="${fromy}" x2="${tox}" y2="${toy}" stroke-width="2" stroke="${stroke_color}"/>
        <line id="${u_id}" class= "${node.type}" x1="${fromx}" y1="${fromy}" x2="${tox}" y2="${toy}" stroke-width="15" stroke="rgba(0, 0, 0, 0)"/>
      </g>`
  }

  function draw_text(node, x, y, str, font, fill_color, font_size) {
    fill_color = fill_color || '#fff'
    font_size  =  font_size || '14.5px'
    font       =       font || "Archivo  Narrow"

    if(isNaN(x)) return ''

    x = x || 0
    y = y || 0

    return `<text x="${x}" y="${y}" font-family="${font}" fill="${fill_color}" letter-spacing="1px" font-size="${font_size}">${str}</text>`
  }

  function draw_angle_text(node, x1, y1, x2, y2, str, font, fill_color) {
    return ''

    // TODO: write this function

    ctx.fillstyle = fill_color || '337'
    ctx.font = font || "14px sans-serif"

    // modified from http://phrogz.net/tmp/canvas_rotated_text.html

    var padding = 5
    var dx = x2 - x1
    var dy = y2 - y1
    var len = math.sqrt(dx*dx+dy*dy)
    var avail = len - 2*padding
    var pad = 1/2
    var x = x1
    var y = y1

    var texttodraw = str
    if (env.measuretext && ctx.measuretext(texttodraw).width > avail){
      while (texttodraw && ctx.measuretext(texttodraw+"…").width > avail) texttodraw = texttodraw.slice(0, -1)
      texttodraw += "…"
    }

    // keep text upright
    var angle = math.atan2(dy, dx)
    if (angle < -math.pi/2 || angle > math.pi/2){
      x = x2
      y = y2
      dx *= -1
      dy *= -1
      angle -= math.pi
    }

    ctx.save()
    ctx.textalign = 'center'
    ctx.translate(x+dx*pad, y+dy*pad)
    ctx.rotate(angle)
    ctx.filltext(texttodraw, 0, -3)
    ctx.restore()
  }

}


/////////////////////////////////

function clear_it(env) {
  env.ctx.clearRect(0, 0, 1000, 1000)
  return env
}

function draw_it(env) {
  env.shapes.forEach(function(node) {
    draw_shape(env.ctx, node)
  })
  return env
}

function draw_metadata(env) {
  // el('minyear').textContent = 1900 + env.params.minyear
  // el('maxyear').textContent = 1900 + state.current_year
  return env
}


// CANVAS FUNCTIONS

function draw_shape(ctx, node) {
  var cx = 450
  var cy = 450

  if(node.shape === 'circle')
    draw_circle(ctx, cx + node.x, cy + node.y, node.r, node.stroke, node.fill, node.line)

  if(node.shape === 'line')
    draw_line(ctx, cx + node.x1, cy + node.y1, cx + node.x2, cy + node.y2, node.stroke, node.line)

  if(node.shape === 'text')
    draw_text(ctx, cx + node.x, cy + node.y, node.str, node.font, node.fill)

  if(node.shape === 'angle_text')
    draw_angle_text(ctx, cx + node.x1, cy + node.y1, cx + node.x2, cy + node.y2, node.str, node.font, node.fill)
}

function draw_circle(ctx, x, y, radius, stroke_color, fill_color, line_width) {
  ctx.beginpath()
  ctx.arc(x, y, radius, 0, math.pi*2, false)
  ctx.fillstyle = fill_color || '#444444'
  ctx.fill()
  ctx.linewidth = line_width || 2
  ctx.strokestyle = stroke_color || '#eef'
  ctx.stroke()
}

function draw_line(ctx, fromx, fromy, tox, toy, stroke_color, line_width) {
  var path=new path2d()
  path.moveto(fromx, fromy)
  path.lineto(tox, toy)
  ctx.strokestyle = stroke_color || '#eef'
  ctx.linewidth = line_width || 0.5
  ctx.stroke(path)
}

function draw_text(ctx, x, y, str, font, fill_color) {
  ctx.fillstyle = fill_color || '#000'
  ctx.font = font || "14px raleway"
  if(isNaN(x)) return undefined
  x = x || 0
  y = y || 0
  ctx.filltext(str, x, y)
}

function draw_angle_text(ctx, x1, y1, x2, y2, str, font, fill_color) {
  ctx.fillstyle = fill_color || '337'
  ctx.font = font || "14px sans-serif"

  // modified from http://phrogz.net/tmp/canvas_rotated_text.html

  var padding = 5
  var dx = x2 - x1
  var dy = y2 - y1
  var len = math.sqrt(dx*dx+dy*dy)
  var avail = len - 2*padding
  var pad = 1/2
  var x = x1
  var y = y1

  var texttodraw = str
  if (ctx.measuretext && ctx.measuretext(texttodraw).width > avail){
    while (texttodraw && ctx.measuretext(texttodraw+"…").width > avail) texttodraw = texttodraw.slice(0, -1)
    texttodraw += "…"
  }

  // keep text upright
  var angle = math.atan2(dy, dx)
  if (angle < -math.pi/2 || angle > math.pi/2){
    x = x2
    y = y2
    dx *= -1
    dy *= -1
    angle -= math.pi
  }

  ctx.save()
  ctx.textalign = 'center'
  ctx.translate(x+dx*pad, y+dy*pad)
  ctx.rotate(angle)
  ctx.filltext(texttodraw, 0, -3)
  ctx.restore()
}



// SENTENCE STRUCTURES

function get_actions(env) {
  var actions = G.v({cat: 'action'}).run() // FIXME: use env.data, not G
  env.params.actions = actions
  return env
}

function filter_actions(env) {
  env.params.actions = env.params.actions.map(function(action) {
    action.year = new Date(action.time+100000000).getFullYear()
    return action
  })

  if(!state.filter_sentences) return env

  env.params.actions = env.params.actions.filter(function(action) {
    return action.year === state.current_year
  })

  return env
}

function make_sentences(env) {
  var sentences = env.params.actions.map(construct).filter(Boolean)
  env.params.sentences = sentences
  return env
}

function construct(action) {
  var list = []
  var edges = action._out.concat(action._in)
  if(!edges[1]) return false
  if(edges[0].label === 'the')
    edges = [edges[1], edges[0]]
  function notme(id, edge) { return edge._in._id === id ? edge._out : edge._in }
  // list.push(notme(action._id, edges[0]), edges[0], action, edges[1], notme(action._id, edges[1]))
  list.push(notme(action._id, edges[0]), action, notme(action._id, edges[1])) // TODO: change this for did/the
  list.year = action.year
  return list
}

function filter_active(env) {
  env.params.sentences = env.params.sentences.filter(list => {
    // return list[0].active && list[4].active
    return list[0].active && list[2].active
  })

  return env
}

function write_sentences(env) {
  // dom.set_el('sentences', '')
  let str = ''

  var oldyear = 1

  env.params.sentences.sort(function(a, b) {
    return a.year - b.year
  })

  env.params.sentences.forEach(function(list) {
    var sentence = ''
    var innerwords = ''
    var highlight_count = 0

    if(list.year !== oldyear) {
      sentence = '<h2>' + list.year + '</h2>'
      oldyear = list.year
    }

    list.forEach(function(thing) {
      var data
      var word = thing.name || thing.label
      var cat = thing.cat
      var type = cat ? thing.type : 'edge'

      var classes = [type]
      if(cat) {
        classes.push(cat)
        classes.push('node-' + thing._id)
      }
      else {
        classes.push('node-' +  thing._in._id + '-' + thing._out._id)
      }

      // TODO: change this vis-a-vis new highlighting -- it currently only highlights a sentence if *all* of the elements are lit, but we could instead highlight individual elements.
      // THINK: this fix probably makes more sense as part of lifting the html renderer into preact, through keeping the active/highlight info in the new intermediate data structure
      if(thing.highlight || thing.active)
        highlight_count++

      if(type !== 'edge')
        data = {id: thing._id||''}
      else
        data = {id1: thing._in._id, id2: thing._out._id}

      if(!state.admin_mode)
        innerwords += template(classes, data, word)
      else
        innerwords += admin_template(thing, type, cat, word)
    })

    var sentence_classes = 'sentence'
    sentence_classes += highlight_count >= 2 ? ' highlight' : ''
    sentence += '<p class="' + sentence_classes + '">' + innerwords + '.</p>'

    // dom.append_el('sentences', sentence)
    str += sentence
  })

  env.output_html = str

  return env

  // helpers:

  function template(classes, data, text) {
    classes.unshift('word')
    var classtext = classes.join(' ')

    var datatext = Object.keys(data).map(function(key) {return 'data-' + key + '="' + data[key] + '"'}).join(' ')

    return ' <span class="' + classtext + '"'
         + datatext
         + ' contentEditable="true">'
         + text + '</span>'
  }

  function admin_template(thing, type, cat, text) {
    var button = ''
    var notes = ''

    if(cat === 'action') {
      button = '<button class="delete" data-id="'+thing._id+'">delete just this sentence</button>'
    }
    else if(type !== 'edge') {
      notes = ' (' + type + ')'
      button = '<button class="delete" data-id="'+thing._id+'">delete this thing and all its sentences entirely</button>'
    }

    return ' ' + text + notes + button
  }
}




// FORM BUILDER & FRIENDS

function whatsnext(graph = G, conversation = convo) {
  // this function decides what to ask the user next, based on their conversation and the world
  // call it for rendering so it can decide what to do


  // TODO: incorporate graph knowledge (graph is the whole world, or the relevant subgraph)
  // THINK: what is a conversation?
  // are we currently in a sentence? then find the highest weighted unfilled 'port'

  return render_conversation(conversation)

  // force_rerender()
}

function get_cat_dat(cat, q) {
  var substrRegex = new RegExp(q, 'i')
  var frontRegex = new RegExp('^' + q, 'i')
  var nodes = G.vertices.filter(function(node) {return node.cat === cat}).map(prop('name'))
        .filter(function(name) {return substrRegex.test(name)})

  nodes.sort(function(a, b) {
    return frontRegex.test(b) - frontRegex.test(a) || a.charCodeAt() - b.charCodeAt()
  })

  return nodes
}

function render_conversation(conversation) {
  let str = ''

  // var typeahead_params = {hint: true, highlight: true, minLength: 1}
  // function typeahead_source(cat) {return {name: 'states', source: function(q, cb) {cb(get_cat_dat(cat, q))}}}
  function make_datalist(cat) {
    let nodes = G.vertices.filter(function(node) {return node.cat === cat}).map(prop('name'))
    let options = nodes.reduce((acc, v) => acc + `<option value="${v}">`, '')
    return `<datalist id="${cat}-list">${options}</datalist>`
  }

  var inputs = ''
  var prelude = ''
  // var submit_button = '<input type="submit" style="position: absolute; left: -9999px">'

  // account for existing sentences
  if(conversation.sentences.length) {
    conversation.sentences.forEach(
      s => {
        prelude += '<p>'
        s.filled.forEach((slot, i) => prelude += inject_value(slot, slot.value, i) + ' ')
        prelude += '</p>'
      })
  }

  // special case the first step
  var sentence = conversation.current

  sentence.filled.forEach(function(slot, i) {
    prelude += inject_value(slot, slot.value, i) + ' '
  })

  if(!prelude) {
    prelude = `<p>Okay, let’s fill in the blanks.</p>
              `
  }

  // display the unfilled slot
  var slot = sentence.slots[0]
  var input = ''
  if(slot.type === 'word') {
    input = inject_value(slot, make_word_input(slot.cat, slot.key))
  }
  else if(slot.type === 'gettype') {
    input = inject_value(slot, make_type_input(slot.cat, slot.key))
  }
  else if(slot.type === 'date') {
    input = inject_value(slot, make_date_input(slot.key))
  }

  prelude += input


  // do the DOM
  // dom.set_el('the-conversation', prelude + inputs + submit_button)
  str = prelude + inputs // + submit_button

  // wiring... /sigh
  var catnames = Object.keys(cats)
  catnames.forEach(function(cat) {
    // $('.'+cat+'-input').typeahead(typeahead_params, typeahead_source(cat))
  })

  // if(sentence.filled.length)
  //   dom.el(slot.key).focus()    // TODO: this probably doesn't work

  // TODO: use the autofocus attr directly on the input

  return str

  // helper functions

  function make_word_input(cat, key) {
    // var text = ''

    let datalist = make_datalist(cat, key)

    if(cat === 'thing') {
      return `<input autofocus list="${cat}-list" id="${key}" type="text" size="50"
                     placeholder="name of a person or thing">` + datalist
                     // placeholder="A${mayben(cat)} ${cat}">` + datalist
    }

    if(cat === 'action') {
      // var options = ['participate in', 'fund', 'organize', 'inspire', 'invite', 'meet', 'create', 'present']
      // var options = ['participated in', 'funded', 'organized', 'inspired', 'invited', 'met', 'created', 'presented']
      var options = ['attended', 'wrangled at', 'presented at']
      return make_select_list('verb', options)

      // text += '<select id="verb" name="verb">'
      // // var options = ['facilitate', 'coordinate', 'contribute', 'create', 'attend', 'manage', 'assist', 'present', 'join', 'leave']
      // options.forEach(function(option) {
      //   text += '<option>' + option + '</option>'
      // })
      // text += '</select>'
      // return text
    }
  }

  function make_type_input(cat, key) {
    // TODO: this assumes cat is always 'thing'
    var options = ['person', 'org', 'event', 'outcome', 'program', 'job']
    return make_select_list(key, options)
  }

  function make_select_box(id, xs) {  // takes a list of strings
    let options = xs.reduce((acc, x) => acc + `<option value="${x}">${x}</option>`, '')
    return `<select id="${id}" name="${id}"> ${options} </select>`
  }

  function make_select_list(id, xs) { // a newfangled select box
    /// TODO: this is sooooooper stooooopid
    ///       just return a data structure, bind it into the state as part of the convo,
    ///       and have preact render it. no sense mucking with dom weirdness here, just handle the logic
    return xs.reduce((acc, x) => acc + `<p class="choice ${x}" onclick="f__r(yuck({${id}:'${x}'}))">${x}</p>`, '')
  }


  function make_date_input(key) {
    var str = '<input id="' +key+ '" type="date" name="' +key+ '" value="2017-10-26" />'
    return str
  }

  function inject_value(slot, value, index) { // HACK: index is a huge hack, remove it.
    var text = ''

    if(slot.key === 'subject') {
      if(slot.value && Number.isInteger(index)) {
        // text += '<p><b>' + slot.value + '</b></p>'
        text += '<b>' + slot.value + '</b>'
      } else {
        text += value + ' '
      }
    }
    else if(slot.key === 'verb') {
      // text += ' did '
      text += value
      // text += ' the '
    }
    else if(slot.key === 'object') {
      text += value + ' '
    }
    else if(slot.type === 'gettype') {
      if(!Number.isInteger(index)) {
        // hack hack hack
        text += 'is a'
        text += value
      }
      // else if(index === 1) {
      //   text += ' is a'
      //   text += mayben(value) + ' '
      //   text += value + ' '
      //   if(slot.value)
      //     text += slot.value === 'person' ? 'who ' : 'which '
      // } else {
      //   text += ' (a'
      //   text += mayben(value) + ' '
      //   text += value + ') '
      // }
    }
    else if(slot.type === 'date') {
      text += ' on around '
      text += value + ' '
    }
    else {
      text = ' ' + value + ' '
    }

    return text
  }
}

function mayben(val) {
  return /^[aeiou]/.test(val) ? 'n' : ''
}


function set_minus(xs, ys) {
  return xs.filter(function(x) {
    return ys.indexOf(x) === -1
  })
}




// function get_tag_html() {
function showtags() {
  // generate current tags
  // hoverable span for highlight, plus clickable for remove
  var tagstr = state.tags.map(function(tag) {
    return (
      `<span class="tag">
        <i class="tag_icon fa fa-times-circle pr_1" aria-hidden="true"></i>${tag}
      </span>`
    )
  }).join('');

  dom.set_el('tagnames', tagstr)

  // generate select box
  var unused = set_minus(Object.keys(state.tagkeys), state.tags).sort()
  var optionstr = '<option>' + unused.join('</option><option>') + '</option>'
  dom.set_el('othertags', optionstr)

  // return {tagnames: tagstr, othertags: optionstr}
}
