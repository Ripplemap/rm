import { h, render } from 'preact';
import './styles.css'

const LegendItem = (props) => {
  const containerStyles = {
    display: 'flex',
    alignItems: 'center',
    margin: '1rem 0',
  }

  const circleStyles = { 
    display: 'inline-block',
    width: props.size || '0px',
    height: props.size ||'0px',
    background: props.color || 'green',
    borderRadius: '50%',
    marginRight: '1rem'
  }

  return (
    <div style={containerStyles}>
      <div style={circleStyles}/>
      <span>{props.children}</span>
    </div>
  );
}

export default LegendItem;