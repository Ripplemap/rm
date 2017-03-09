import {G} from 'graph'
import {eq, prop, clone, truncate, push_it, pipe} from 'fun'
import * as dom from 'dom'
import {convo as conversation} from 'convo'
import {cats} from 'model'
import state from 'state'

export {init, render, render_all, whatsnext}


const ctx = dom.el('ripples').getContext('2d')

var viz_pipe, word_pipe


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
                   // shapes:
                 , add_rings
                 , add_ring_labels
                 , copy_edges
                 , copy_nodes
                 , add_node_labels
                 , add_edge_labels
                   // rendering:
                 , clear_it
                 , draw_it
                 , draw_metadata
                 )

  word_pipe = pipe( get_actions
                  , filter_actions
                  , make_sentences
                  , write_sentences
                  )
}

function render() {
  // TODO: cloning is inefficient: make lazy subgraphs
  var env = {data: Dagoba.clone(G), params: {my_maxyear: state.my_maxyear, my_minyear: state.my_minyear}, shapes: [], ctx: ctx}

  viz_pipe(env)
  word_pipe(env)

  // if(n === undefined)
  //   state.pipelines.forEach(function(pipeline) { pipeline(env) })
  // else
  //   state.pipelines[n](env)
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


// SHAPES

function add_rings(env) {
  for(var i = env.params.minyear; i <= env.params.maxyear; i++) {
    var color = i === state.current_year ? '#999' : '#ccc'
    var radius = state.ring_radius * (i - env.params.my_minyear + 1)
    env.shapes.unshift({shape: 'circle', x: 0, y: 0, r: radius, stroke: color, fill: 'rgba(0, 0, 0, 0)', line: 1, type: 'ring', year: i})
  }
  return env
}

function add_ring_labels(env) {
  var labels = []

  env.shapes.filter(eq('type', 'ring')).forEach(function(shape) {
    var fill = shape.year === state.current_year ? '#999' : '#ccc'
    var label = {shape: 'text', str: shape.year, x: -15, y: -shape.r - 5, fill: fill, font: "18px Raleway" }
    labels.push(label)
  })

  env.shapes = env.shapes.concat(labels)
  return env
}

function copy_edges(env) {
  env.data.E.forEach(function(edge) {
    if(!state.all_edges && !(edge._out.year === state.current_year || edge._in.year === state.current_year)) // HACK: remove this
      return undefined

    var label = edge.label || "777"
    var color = str_to_color(label)

    // function str_to_color(str) { return 'hsl' + (state.show_labels?'a':'') + '(' + str_to_num(str) + ',100%,40%' + (state.show_labels?',0.3':'') + ')';}
    function str_to_color(str) { return 'hsla' + '(' + str_to_num(str) + ',30%,40%,0.' + (state.show_labels?'3':'7') + ')' }
    function str_to_num(str) { return char_to_num(str, 0) + char_to_num(str, 1) + char_to_num(str, 2) }
    function char_to_num(char, index) { return (char.charCodeAt(index) % 20) * 20 }

    var line = {shape: 'line', x1: edge._in.x, y1: edge._in.y, x2: edge._out.x, y2: edge._out.y, stroke: color, type: 'edge', label: label}
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

    // Person: Blue
    // Org: Green
    // Event: Magenta
    // Outcome: Orange
    // Concept: Purple
    // Labels should be black
    // Connections should be grey
    var hues = { outcome: '40'
               // , action '20'
               , person: '240'
               , event: '320'
               , org: '100'
               }

    var color = 'hsla(' + hues[node.type] + ',80%,50%,0.99)'

    var shape = { shape: 'circle'
                , x: node.x
                , y: node.y
                , r: node.r
                , name: node.name
                , fill: color
                }

    if(!node.highlight)
      return shape

    var highlight = { shape: 'circle'
                    , x: node.x
                    , y: node.y
                    , r: node.r + 12
                    , line: 0.01
                    , fill: 'hsla(0, 80%, 50%, 0.20)'
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
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI*2, false)
  ctx.fillStyle = fill_color || '#444444'
  ctx.fill()
  ctx.lineWidth = line_width || 2
  ctx.strokeStyle = stroke_color || '#eef'
  ctx.stroke()
}

function draw_line(ctx, fromx, fromy, tox, toy, stroke_color, line_width) {
  var path=new Path2D()
  path.moveTo(fromx, fromy)
  path.lineTo(tox, toy)
  ctx.strokeStyle = stroke_color || '#eef'
  ctx.lineWidth = line_width || 0.5
  ctx.stroke(path)
}

function draw_text(ctx, x, y, str, font, fill_color) {
  ctx.fillStyle = fill_color || '#000'
  ctx.font = font || "14px Raleway"
  if(isNaN(x)) return undefined
  x = x || 0
  y = y || 0
  ctx.fillText(str, x, y)
}

function draw_angle_text(ctx, x1, y1, x2, y2, str, font, fill_color) {
  ctx.fillStyle = fill_color || '337'
  ctx.font = font || "14px sans-serif"

  // modified from http://phrogz.net/tmp/canvas_rotated_text.html

  var padding = 5
  var dx = x2 - x1
  var dy = y2 - y1
  var len = Math.sqrt(dx*dx+dy*dy)
  var avail = len - 2*padding
  var pad = 1/2
  var x = x1
  var y = y1

  var textToDraw = str
  if (ctx.measureText && ctx.measureText(textToDraw).width > avail){
    while (textToDraw && ctx.measureText(textToDraw+"…").width > avail) textToDraw = textToDraw.slice(0, -1)
    textToDraw += "…"
  }

  // Keep text upright
  var angle = Math.atan2(dy, dx)
  if (angle < -Math.PI/2 || angle > Math.PI/2){
    x = x2
    y = y2
    dx *= -1
    dy *= -1
    angle -= Math.PI
  }

  ctx.save()
  ctx.textAlign = 'center'
  ctx.translate(x+dx*pad, y+dy*pad)
  ctx.rotate(angle)
  ctx.fillText(textToDraw, 0, -3)
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
  list.push(notme(action._id, edges[0]), edges[0], action, edges[1], notme(action._id, edges[1]))
  list.year = action.year
  return list
}

function write_sentences(env) {
  dom.set_el('sentences', '')
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

      if(thing.highlight)
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
    sentence_classes += highlight_count === 3 ? ' highlight' : ''
    sentence += '<p class="' + sentence_classes + '">' + innerwords + '.</p>'

    dom.append_el('sentences', sentence)
  })

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

  return env
}




// FORM BUILDER & FRIENDS

function whatsnext(graph, conversation) {
  // TODO: incorporate graph knowledge (graph is the whole world, or the relevant subgraph)
  // THINK: what is a conversation?
  // are we currently in a sentence? then find the highest weighted unfilled 'port'

  render_conversation(conversation)
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
  var typeahead_params = {hint: true, highlight: true, minLength: 1}
  function typeahead_source(cat) {return {name: 'states', source: function(q, cb) {cb(get_cat_dat(cat, q))}}}

  var inputs = ''
  var prelude = ''
  var submit_button = '<input type="submit" style="position: absolute; left: -9999px">'

  // special case the first step
  var sentence = conversation.current

  sentence.filled.forEach(function(slot, i) {
    prelude += inject_value(slot, slot.value, i) + ' '
  })

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
  dom.set_el('the-conversation', prelude + inputs + submit_button)

  // wiring... /sigh
  var catnames = Object.keys(cats)
  catnames.forEach(function(cat) {
    $('.'+cat+'-input').typeahead(typeahead_params, typeahead_source(cat))
  })

  if(sentence.filled.length)
    $('#' + slot.key).focus()

  return false

  // helper functions

  function make_word_input(cat, key) {
    var text = ''

    if(cat === 'thing')
      return '<input class="typeahead ' +cat+ '-input" type="text" placeholder="A' +mayben(cat)+ ' ' +cat+ '" id="' +key+ '">'
    if(cat === 'action') {
      text += '<select id="verb" name="verb">'
      var options = ['participate in', 'lead', 'fund', 'organize', 'inspire', 'invite']
      // var options = ['facilitate', 'coordinate', 'contribute', 'create', 'attend', 'manage', 'assist', 'present', 'join', 'leave']
      options.forEach(function(option) {
        text += '<option>' + option + '</option>'
      })
      text += '</select>'
      return text
    }
  }

  function make_type_input(cat, key) {
    // TODO: this assumes cat is always 'thing'
    var str = '<select id="'+key+'">'
    str += '<option value="person">person</option>'
    str += '<option value="org">org</option>'
    str += '<option value="event">event</option>'
    str += '<option value="outcome">outcome</option>'
    str += '</select>'
    return str
  }

  function make_date_input(key) {
    var str = '<input id="' +key+ '" type="date" name="' +key+ '" value="2016-01-01" />'
    return str
  }

  function inject_value(slot, value, index) { // HACK: index is a huge hack, remove it.
    var text = ''

    if(slot.key === 'subject') {
      if(slot.value) {
        text += '<p><b>' + slot.value + '</b></p>'
      } else {
        text += "Okay, let's fill in the blanks. Tell us about "
        text += value + ' '
      }
    }
    else if(slot.key === 'verb') {
      text += ' did '
      text += value
      text += ' the '
    }
    else if(slot.key === 'object') {
      text += value + ' '
    }
    else if(slot.type === 'gettype') {
      if(index === 1) {
        text += ' is a'
        text += mayben(value) + ' '
        text += value + ' '
        if(slot.value)
          text += slot.value === 'person' ? 'who ' : 'which '
      } else {
        text += ' (a'
        text += mayben(value) + ' '
        text += value + ') '
      }
    }
    else if(slot.type === 'date') {
      text += ' in/on '
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













function showtags() {
  // generate current tags
  // hoverable span for highlight, plus clickable for remove
  var tagwrapper = ['<span class="tag">', '</span>']
  var tagstr = state.tags.map(function(tag) { return tagwrapper[0] + tag + tagwrapper[1] }).join(', ')
  dom.set_el('tagnames', tagstr)

  // generate select box
  var unused = set_minus(Object.keys(state.tagkeys), state.tags).sort()
  var optionstr = '<option>' + unused.join('</option><option>') + '</option>'
  dom.set_el('othertags', optionstr)
}


function render_all() {
  render()
  render_conversation(conversation)
  showtags()
}