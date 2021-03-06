import { h, render } from 'preact';
import './styles.css'

const Button = props => {
  const genClassName = () => {
    switch(props.buttonStyle){
      case 'large':
        return 'Button large'
      case 'next':
        return 'Button next'
      default:
        return 'Button'
    }
  }


  return (
    <button
      type={props.type}
      onClick={props.onClick}
      class={genClassName()}
      style={props.style}>
     {props.children}
    </button>
  );
};

export default Button;
