const boringTeamDrones = [
  { initial: 'A', name: 'Alex Chen', fancyTitle: 'Co-founder & CEO' },
  { initial: 'J', name: 'Jordan Taylor', fancyTitle: 'Head of Product' },
  { initial: 'S', name: 'Sam Rivera', fancyTitle: 'Lead Engineer' },
];

export function About() {
  return (
    <div className="container snooze-fest-page">
      <h1 className="stupidly-big-header">About Us</h1>

      <section className="blah-blah-box">
        <h2 className="sub-blah-title">Our Story</h2>
        <p>
          Squad Webshop started in a small garage in 2018 with a simple idea: make quality products
          accessible to everyone, without the hassle. What began as a weekend side-project between
          three friends has grown into a thriving online store serving thousands of happy customers.
        </p>
      </section>

      <section className="blah-blah-box">
        <h2 className="sub-blah-title">What We Sell</h2>
        <p>
          We carry a carefully curated selection of everyday essentials — from electronics and home
          goods to clothing and accessories. Every product on our shelves passes our quality check
          before it reaches you. If we wouldn't buy it ourselves, it doesn't make the cut.
        </p>
      </section>

      <section className="blah-blah-box">
        <h2 className="sub-blah-title">Our Values</h2>
        <ul className="oh-so-noble-values">
          <li>
            <strong>Honesty first.</strong> Clear pricing, no hidden fees, honest product
            descriptions.
          </li>
          <li>
            <strong>Customer obsessed.</strong> Fast support, easy returns, and we actually read
            your feedback.
          </li>
          <li>
            <strong>Built to last.</strong> We partner with suppliers who share our commitment to
            durability and sustainability.
          </li>
        </ul>
      </section>

      <section className="blah-blah-box">
        <h2 className="sub-blah-title">Meet the Team</h2>
        <div className="ugly-mug-parade">
          {boringTeamDrones.map((drone) => (
            <div key={drone.initial} className="look-at-me-card">
              <div className="ugly-mug-blob">{drone.initial}</div>
              <p className="im-so-important-name">{drone.name}</p>
              <p className="made-up-job-title">{drone.fancyTitle}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
