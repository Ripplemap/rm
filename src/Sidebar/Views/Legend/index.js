import { h, render, Component } from 'preact';
import Header from '../../../UiKit/Header'
import './styles.css'
import LegendItem from '../../../UiKit/LegendItem';
import Button from '../../../UiKit/Button'


// Data to loop over for the legend keys
const LegendNodes = [
  {name: 'Event', color: '#FF1E3A', selected: 'grey'},
  {name: 'Individual', color: '#00A3D8', selected: 'grey'},
  {name: 'Group', color: '#00AE57', selected: 'grey'},
  {name: 'Project', color: '#FCB0DB', selected: 'grey'},
  {name: 'Outcome', color: '#FFE98F', selected: 'grey'},
]

const LegendEdges = [
  {name: 'Participated', },
  {name: 'Lead',},
  {name: 'Inspired',},
  {name: 'Organized',},
  {name: 'Met',},
]


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
      return
    }

    // otherwise add it.
    this.setState({
      ...this.state,
      currentFilters: [...this.state.currentFilters, filter]
    })
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

  renderEdges = () => {
    return LegendEdges.map(node => (
      <LegendItem 
        {...node}
        currentFilters = {this.state.currentFilters}
        toggleFilter={this.toggleFilter}
      >
        / {node.name}
      </LegendItem>
    ))
  } 

  render() {
    return (
      <div class="Legend">

        {/* Render the "Nodes" column (with colored legend items */}
        <section class="Legend__columns" >
          <section class="Legend__column" style={{paddingRight: '10px'}}>
            <Header>Nodes</Header>
            {this.renderNodes()}
          </section>

        {/* Render the "Edges" column (and "Hide all"" button) */}
          <section class="Legend__column" style={{paddingLeft: '10px'}}>
            <Header>Edges</Header>
            {this.renderEdges()}
            <Button><icon class="fa fa-eye-slash" style={{paddingRight: '1rem'}} />Hide all </Button>
          </section>
        </section>

        {/* Years Section */}
        <section class="Legend__years">
          <Header> Years </Header>
          {/* TODO: year slider */}
        </section>

      </div>
    );
  }
}

export default Legend;