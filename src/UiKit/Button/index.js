import { h, render } from 'preact';
import './styles.css'

const Button = props => {
  const genClassName = () => {
    switch(props.type){
      case 'large':
        return 'Button large'
      default: 
        return 'Button'
    }
  }


  return (
    <button 
      onClick={props.onClick}
      class={genClassName()} 
      style={props.style}>
     {props.children} 
    </button>
  );
};

export default Button;