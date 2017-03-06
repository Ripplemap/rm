import { h, render } from 'preact';
import './styles.css'
import Header from '../../../UiKit/Header/index';
import Button from '../../../UiKit/Button/index';

const Home = () => {
  return (
    <div>

      {/* General Welcome Message  */}
      <section class="Home__welcome">
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Veniam quidem voluptatem laudantium fuga iste nulla eligendi mollitia velit amet laborum, quia blanditiis rerum, eius nobis quod ipsam sit recusandae ratione!
      </section>

      {/* Add a story CTA */}
      <section class="Home__cta-addstory">
        <p>We'd love to hear your stories!</p>
        <Button>Add a story ▶</Button>
      </section>

      {/* Recently Added Stories */}
      <section class="Home__recent">
        {/* TODO: create a h3 with underline component */}
        <Header>Recently Added Stories</Header>



        <div id="signup">
          <form id="login">
            <p>
              We'd love to hear your stories! Let's start with your contact info:
            </p>
            <input name="email" id="email" type="text" placeholder="email" class="typeahead" />
          </form>
        </div>

        <div id="storytime" class="hide">
          <h3>Want to add something to the map?</h3>
          <form id="the-conversation"></form>
          <p><em>Use <em>Tab</em> to autocomplete and <em>Return</em> to proceed. Reload the page to fix a mistake.</em></p>
        </div>

        <hr style="clear:both" />

        <div id="controls">
          <p>
            Currently viewing tags: <span id="tagnames"></span>
          </p>
          <p>
            Add a tag:
            <form id="addtag" action="">
              <select id="othertags" id="" name=""></select>
              <input name="" type="submit" value="Go!" />
            </form>
          </p>
        </div>

        <hr style="clear:both" />

        <h3>Click any story to edit</h3>

        <div id="sentences"> </div>





      </section>

    </div>
  );
};

export default Home;
