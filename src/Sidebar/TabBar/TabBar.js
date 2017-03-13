import { h, render, Component } from 'preact';
import './tabBar.css'
import Tab from './tab/tab';

/**
 * List to iterate over and generate tab commponents with.
 */
const tabs = [
  {name: "Home", id: "home", icon: "fa fa-home"},
  {name: "Add A Story", id: "story", icon: "fa fa-commenting-o"},
  {name: "Filters", id: "filters", icon: "fa fa-map-marker"},
  {name: "Read Stories", id: "read_stories", icon: "fa fa-eye"},
  {name: "Selected Stories", id: "selected_stories", icon: "fa fa-commenting"},
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
