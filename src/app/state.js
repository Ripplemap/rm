const state = {}
export default state

state.org = 2 // this changes per branch...

state.tags = [] // THINK: default to ['plain']?
state.facts = []
state.tagkeys = {}
state.query = {}

state.safe_mode = false

state.all_edges        = true  // awkward... :(
state.admin_mode       = false // yep another hack w00t
state.my_maxyear       = 2017  // total hackery...
state.my_minyear       = 2010  // hack hack hack
state.show_labels      = false // yup
state.current_year     = 2017  // more hacks
state.filter_sentences = false // awkward... :(
state.ring_radius      = 45    // lalala
