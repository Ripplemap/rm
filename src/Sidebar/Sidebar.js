import { h, render, Component } from 'preact';
import './Sidebar.css'
import TabBar from './TabBar/TabBar';
import Home from './Views/Home/index';
import About from './Views/About/index';
import YourSelection from './Views/YourSelection/index';
import Current from './Views/Current/index';
import Legend from './Views/Legend/index';
import Story from './Views/Story/index';

/**
 * Sidebar layout and state
 */
class Sidebar extends Component {
  state = {
    currentView: 'home'
  }

  componentDidMount() {
    window.do_the_glue()
  }

  componentDidUpdate() {
    window.do_the_glue()
  }

  changeView = (view_id) => {
    this.setState({
      currentView: view_id
    })
  }

  renderSelectedView = () => {
    switch(this.state.currentView){
      case 'home':
        return <Home />
      case 'story':
        return <Story />
      case 'legend':
        return <Legend />
      case 'currently_showing':
        return <Current />
      case 'your_selection':
        return <YourSelection />
      case 'about':
        return <About />
      default:
        return <Home />
    }
  }

  render() {
    return (
      <aside class="Sidebar">

        {/* Render different views based on which section is selected*/}
        <section class="Sidebar__container">
          <h3 class="Sidebar__header">AMC Ripple Map</h3>
          {this.renderSelectedView()}
        </section>

        <TabBar currentView={this.state.currentView} changeView={this.changeView} />

      </aside>
    );
  }
}

export default Sidebar;
