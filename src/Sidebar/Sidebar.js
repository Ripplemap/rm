import { h, render, Component } from 'preact';
import './sidebar.css'
import TabBar from './tabBar/tabBar';
import Home from './views/home/index';
import About from './views/about/index';
import YourSelection from './views/yourSelection/index';
import Current from './views/current/index';
import Filters from './views/filters/index';
import Story from './views/story/index';

/**
 * Sidebar layout and state
 */
class Sidebar extends Component {
  state = {
    currentView: 'home'
  }

  componentDidMount() {
    // window.do_the_glue()

    // FIXME: this is a huge horrid hacky hack
    window.changeView = this.changeView.bind(this)

  }

  componentDidUpdate() {
    // window.render_all()
    // window.do_the_glue()
  }

  changeView = (view_id) => {
    this.setState({
      currentView: view_id
    })
    // on transitioning to different component sub views... run glue?
    // window.do_the_glue()
  }

  renderSelectedView = () => {
    switch(this.state.currentView){

      case 'home':
        return (<Home changeView={this.changeView} />)

      case 'story':
        return <Story />

      case 'filters':
        return <Filters />

      case 'read_stories':
        return (<Current />)

      case 'selected_stories':
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
          <h3 class="Sidebar__header">AMC: Ripple Effect</h3>
          <div class="Sidebar__subheading">A collaborative laboratory of media-based organizing strategies</div>
          {this.renderSelectedView()}
        </section>

        <TabBar currentView={this.state.currentView} changeView={this.changeView} />

      </aside>
    );
  }
}

export default Sidebar;
