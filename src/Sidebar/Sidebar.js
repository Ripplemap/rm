import { h, render, Component } from 'preact';
import './sidebar.css'
import TabBar from './tabBar/tabBar';
import Home from './views/home/index';
import About from './views/about/index';
import YourSelection from './views/yourSelection/index';
import Current from './views/current/index';
import Legend from './views/legend/index';
import Story from './views/story/index';

/**
 * Sidebar layout and state
 */
class Sidebar extends Component {
  state = {
    currentView: 'story'
  }

  componentDidMount() {
    window.do_the_glue()
  }

  componentDidUpdate() {
    window.render_all()
    // window.do_the_glue()
  }

  changeView = (view_id) => {
    this.setState({
      currentView: view_id
    })
    // on transitioning to different component sub views... run glue?
    window.do_the_glue()
  }

  renderSelectedView = () => {
    switch(this.state.currentView){

      case 'home':
        return (<Home changeView={this.changeView} />)

      case 'story':
        return <Story />

      case 'legend':
        return <Legend />

      case 'currently_showing':
        return (<Current />)

      case 'your_selection':
        return (<YourSelection changeView={this.changeView}/>)

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
