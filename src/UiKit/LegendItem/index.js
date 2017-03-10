import { h, render } from 'preact';
import './styles.css'

const LegendItem = (props) => {
  let filter_is_on = props.currentFilters.indexOf(props.filter_key)

  const containerStyles = {
    display: 'flex',
    alignItems: 'center',
    margin: '1rem 0',
    cursor: 'pointer',
  }

  const circleStyles = { 
    display: 'inline-block',
    width: props.size || '0px',
    height: props.size ||'0px',
    background: filter_is_on !== -1 ? props.selected : props.color,
    borderRadius: '50%',
    marginRight: '1rem',
    borderBottom: filter_is_on !== -1 ? '1px solid black' : '0',
  }

  const textStyles = {
    borderBottom: filter_is_on !== -1 ? '1px solid black' : '0',
  }

  return (
    <div style={containerStyles}>
      <div style={circleStyles}/>
      <span onClick={() => props.toggleFilter(props.filter_key)} style={textStyles}>{props.children}</span>
    </div>
  );
}

export default LegendItem;