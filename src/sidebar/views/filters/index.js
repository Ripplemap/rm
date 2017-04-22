import { h, render, Component } from 'preact';
import Header from 'UiKit/Header'
import './styles.css'
import LegendItem from 'UiKit/LegendItem';
import Button from 'UiKit/Button'

import {force_rerender} from 'render'

// TODO: find out if EDGES need to be filterable (like NODES are clickable to toggle)
const LegendNodes = [{
        name: 'Event',
        color: '#f32938',
        selected: 'grey',
        filter_key: 'event',
    },
    {
        name: 'Individual',
        color: '#009edb',
        selected: 'grey',
        filter_key: 'person',
    },
    {
        name: 'Group',
        color: '#00af4c',
        selected: 'grey',
        filter_key: 'org',
    },
    {
        name: 'Outcome',
        color: '#ffd600',
        selected: 'grey',
        filter_key: 'outcome',
    },
    {
        name: 'Program',
        color: '#af00d6',
        selected: 'grey',
        filter_key: 'program',
    },
    {
        name: 'Job/contract',
        color: '#d6af00',
        selected: 'grey',
        filter_key: 'job',
    },
]

const LegendEdges = [{
        name: 'Participated',
        filter_key: 'participated',
        color: 'rgba(52, 73, 94, 0.7)'
    },
    {
        name: 'Lead',
        filter_key: 'lead',
        color: 'rgba(231, 76, 60, 0.7)'
    },
    {
        name: 'Inspired',
        filter_key: 'inspired',
        color: 'rgba(241, 196, 15, 0.7)'
    },
    {
        name: 'Organized',
        filter_key: 'organized',
        color: "rgba(141, 196, 215, 0.7)"
    },
    {
        name: 'Met',
        filter_key: 'met',
        color: 'rgba(102, 39, 239, 0.7)'
    },
]


/* ----- Preact Jams ----- */

class Legend extends Component {
  state = {
    currentFilters: [],
  }


  toggleFilter = (filter) => {
    let cur_filters = this.state.currentFilters
    let filter_exists = cur_filters.indexOf(filter)

    // if filter already exists, remove it
    if (filter_exists !== -1) {
      cur_filters.splice(filter_exists, 1)
      this.setState({currentFilters: cur_filters})
    }
    else {
      this.setState({
        ...this.state,
        currentFilters: [...this.state.currentFilters, filter]
      })
    }

    // FIXME: this is leaking into the global space
    window.filter_poo = this.state.currentFilters

    // window.rm_render()
    force_rerender()
  }

  renderNodes = () => {
    return LegendNodes.map(node => (
      <LegendItem
        {...node}
        size="15px"
        toggleFilter={this.toggleFilter}
        currentFilters = {this.state.currentFilters}
      >
        {node.name}
      </LegendItem>)
  )}

  renderActions = () => {
    return LegendEdges.map(node => (
      <LegendItem
        {...node}
        size="15px"
        currentFilters = {this.state.currentFilters}
        toggleFilter={this.toggleFilter}
      >
        {node.name}
      </LegendItem>
    ))
  }

  render() {
    return (
      <div class="Legend">

        {/* Render the "Nodes" column (with colored legend items */}
        <section class="Legend__columns" >
          <section class="Legend__column" style={{paddingRight: '10px'}}>
           <Header>People & things</Header>
            {this.renderNodes()}
          </section>

        {/* Render the "Actions" column (and "Hide all"" button) */}
          <section class="Legend__column" style={{paddingLeft: '10px'}}>
            <Header>Actions</Header>
            {this.renderActions()}
            {/* <Button><icon class="fa fa-eye-slash" style={{paddingRight: '1rem'}} />Hide all </Button> */}
          </section>
        </section>

        {/* Years Section */}
        <section class="Legend__years">
          <Header> Years </Header>
          {/* TODO: year slider */}
        </section>

        {/* Keys Section */}
        <section class="Legend__keys">
          <Header> Keys </Header>
          <p>'←' for previous year</p>
          <p>'→' for next year</p>
          <p>'e' toggles recent connections</p>
          <p>'f' toggles filter stories by year</p>
          <p>'l' for legend edges</p>
        </section>

      </div>
    );
  }
}

export default Legend;
