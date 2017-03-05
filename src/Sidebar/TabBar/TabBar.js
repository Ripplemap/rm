import { h, render, Component } from 'preact';
import './TabBar.css'
import Tab from './Tab/Tab';

/**
 * List to iterate over and generate tab commponents with.
 */
const tabs = [
  {name: "Home", id: "home", icon: "fa fa-home"},
  {name: "Add A Story", id: "story", icon: "fa fa-commenting-o"},
  {name: "Filters / Legend", id: "legend", icon: "fa fa-map-marker"},
  {name: "Currently Showing", id: "currently_showing", icon: "fa fa-eye"},
  {name: "Your Selection", id: "your_selection", icon: "fa fa-commenting"},
  {name: "About", id:"about", icon: "fa fa-clone"},
]


/**
 * Constructs the menu tabs that are clickable. 
 */
const TabBar = props => {
  const renderTabs = () => {
    return tabs.map(tab => {
      return <Tab {...tab} currentView={props.currentView} changeView={props.changeView} />
    })
  }

  return (
    <div class="Tabbar">
      {renderTabs()}
      <div class="Tabbar__fillspace"></div>
    </div>

  );
};

export default TabBar;