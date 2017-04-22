import { h, render } from 'preact';
import Header from 'UiKit/Header/index';

const About = () => {
  return (
    <div>
      <Header>What it is</Header>

      <p>The Ripple Mapping Tool is an interactive data visualization platform for social movements and community organizers. It allows community members to tell stories about how events and programs impacted their lives, and generates “ripple maps” that show the long term outcomes of interconnected organizing efforts.</p>

      <Header>Origins and inspiration</Header>

      <p>The tool began as a static infographic poster design that demonstrated the many outcomes from the Difference Engine Initiative, a women-in-games program in Toronto. As the poster evolved into this app, we drew inspiration from philosopher and activist Grace Lee Boggs, who wrote, “We never know how our small activities will affect others through the invisible fabric of our connectedness. In this exquisitely connected world, it’s never a question of ‘critical mass.’ It’s always about critical connections.” The Ripple Map demonstrates that it is strong relationships that move progress forward.</p>

      <Header>Nuts & Bolts</Header>

      <p>The Ripple Mapping Tool is a web-based platform, with most of the logic happening in the browser aided by a tiny NodeJS server for persistence. It uses an in-memory graph database for the semantic graph (individual words are vertices, connections are edges), a configurable rendering pipeline for the story visualization (previously canvas-based, now svg), a similar pipeline for textual rendering (stories are rendered into sentences from the raw graph data), and has a custom layout algorithm for building the story visualization. The UI wrapper is Preact, a minimalistic version of React.</p>

      <Header>Credits</Header>

      <p>Lead designer: Una Lee</p>
      <p>Lead developer: Dann Toliver</p>
      <p>Interactive designer: Lupe Pérez</p>
      <p>Front end developer: Tyler Sloane</p>
    </div>
  );
};

export default About;
