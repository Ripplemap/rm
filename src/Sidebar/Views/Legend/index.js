import { h, render } from 'preact';
import Header from '../../../UiKit/Header'
import './styles.css'
import LegendItem from '../../../UiKit/LegendItem';
import Button from '../../../UiKit/Button'


// Data to loop over for the legend keys
const LegendNodes = [
  {name: 'Event', color: '#FF1E3A'},
  {name: 'Individual', color: '#00A3D8'},
  {name: 'Group', color: '#00AE57'},
  {name: 'Project', color: '#FCB0DB'},
  {name: 'Outcome', color: '#FFE98F'},
]

const LegendEdges = ['Participated', 'Lead', 'Inspired','Organized','Met']


const Legend = () => {

  const renderNodes = () => {
    return LegendNodes.map(node => (
      <LegendItem color={node.color} size="15px">{node.name}</LegendItem>)
    )}

  const renderEdges = () => {
    return LegendEdges.map(node => <LegendItem>/ {node}</LegendItem>)
  } 

  return (
    <div class="Legend">

      {/* Render the "Nodes" column (with colored legend items */}
      <section class="Legend__columns" >
        <section class="Legend__column" style={{paddingRight: '10px'}}>
          <Header>Nodes</Header>
          {renderNodes()}
        </section>

      {/* Render the "Edges" column (and "Hide all"" button) */}
        <section class="Legend__column" style={{paddingLeft: '10px'}}>
          <Header>Edges</Header>
          {renderEdges()}
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
};

export default Legend;