import { h, render } from 'preact';
import './styles.css'

const Header = props => {
  const genClassName = () => {
    switch(props.type){
      case 'large':
        return 'Header large'
      default: 
        return 'Header'
    }
  }


  return (
    <div class={genClassName()} style={props.style}>
     {props.children} 
    </div>
  );
};

export default Header;