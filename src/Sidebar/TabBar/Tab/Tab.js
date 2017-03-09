import { h, render, Component } from 'preact';
import './Tab.css'
import {classMaker} from '../../../utils';

const Tab = ({id, name, currentView, icon, changeView}) => {

  const tabClasses = classMaker(currentView, id, 'Tab selected', 'Tab')
  const iconClasses = classMaker(currentView, id, `${icon} tab-icon selected`, `${icon} tab-icon`)

  return (
    <button class={tabClasses} onClick={() => changeView(id)}>
      <icon class={iconClasses} />
      {name}
    </button>
  );
};

export default Tab;