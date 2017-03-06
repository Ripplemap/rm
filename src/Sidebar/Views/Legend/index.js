import { h, render } from 'preact';
import Header from '../../../UiKit/Header'
import './styles.css'
import LegendItem from '../../../UiKit/LegendItem/index';

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
      <LegendItem color={node.color} size="15px">
        {node.name}
      </LegendItem>)) 
  }

  const renderEdges = () => {
    return LegendEdges.map(node => (
      <LegendItem>/ {node}</LegendItem>)) 
  }

  return (
    <div class="Legend">

    <section class="Legend__columns">
      <section class="Legend__column">
        <Header>Nodes</Header>
        {renderNodes()}
      </section>

      <section class="Legend__column">
        <Header>Edges</Header>
        {renderEdges()}
      </section>
    </section>

    </div>
  );
};

export default Legend;